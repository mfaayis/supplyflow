import { TradeRecord, UserSettings } from '../types';
import { DEMO_TRADES } from '../data/demoTrades';
import { supabase } from '../lib/supabase';

// ─── Local storage keys (used as offline cache / fallback) ───────────────────
const TRADES_STORAGE_KEY = 'supplyflow_trades_v1';
const SETTINGS_STORAGE_KEY = 'supplyflow_settings_v1';

export const DEFAULT_USER_SETTINGS: UserSettings = {
  userName: 'Trader',
  accountCurrency: 'USD',
  accountBalance: 25000,
  defaultRiskPercent: 1.0,
  riskPercentage: 1.0,
  defaultPair: 'XAUUSD',
  defaultSession: 'NEW YORK',
  defaultRRTarget: 2.0,
  defaultTargetRR: 2.0,
  customPairs: ['XAUUSD', 'EURUSD', 'GBPUSD', 'US30', 'NAS100', 'BTCUSD'],
  theme: 'dark',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getCurrentUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

function isSupabaseConfigured(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL as string;
  return !!url && url !== 'https://placeholder.supabase.co';
}

// ─── Change listeners (for internal reactivity) ───────────────────────────────
type ChangeListener = () => void;
const listeners: Set<ChangeListener> = new Set();

function notifyListeners() {
  listeners.forEach((listener) => {
    try { listener(); } catch (e) { console.error('Listener error:', e); }
  });
}

// ─── Repository ───────────────────────────────────────────────────────────────

export const tradeRepository = {
  subscribe(listener: ChangeListener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  // ── Trades ──────────────────────────────────────────────────────────────────

  async getAllTrades(knownUserId?: string | null): Promise<TradeRecord[]> {
    if (!isSupabaseConfigured()) return this._getLocalTrades();

    const userId = knownUserId ?? await getCurrentUserId();
    if (!userId) return this._getLocalTrades();

    const { data, error } = await supabase
      .from('trades')
      .select('data')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to load trades from Supabase:', error);
      return this._getLocalTrades();
    }

    const trades = (data ?? []).map((row: any) => row.data as TradeRecord);
    
    // Update local cache
    localStorage.setItem(TRADES_STORAGE_KEY, JSON.stringify(trades));
    return trades;
  },

  async getTradeById(id: string): Promise<TradeRecord | undefined> {
    const trades = await this.getAllTrades();
    return trades.find((t) => t.id === id);
  },

  async saveTrade(trade: Partial<TradeRecord> | TradeRecord, knownUserId?: string | null): Promise<void> {
    const tradeId = trade.id || 'trade-' + Date.now();
    const fullTrade: TradeRecord = this._buildFullTrade(trade, tradeId);

    // ── Write to local cache immediately (optimistic) ──────────────────────
    const local = this._getLocalTrades();
    const idx = local.findIndex((t) => t.id === tradeId);
    const updated = idx >= 0 ? [...local] : [fullTrade, ...local];
    if (idx >= 0) updated[idx] = fullTrade;
    localStorage.setItem(TRADES_STORAGE_KEY, JSON.stringify(updated));
    notifyListeners();

    // ── Sync to Supabase in the background (non-blocking) ─────────────────
    if (isSupabaseConfigured()) {
      const userId = knownUserId ?? await getCurrentUserId();
      if (userId) {
        supabase.from('trades').upsert(
          { id: tradeId, user_id: userId, data: fullTrade, updated_at: new Date().toISOString() },
          { onConflict: 'id' }
        ).then(({ error }) => {
          if (error) console.error('Failed to sync trade to Supabase:', error);
        });
      }
    }
  },

  async updateTrade(id: string, updates: Partial<TradeRecord>, knownUserId?: string | null): Promise<void> {
    // ── Read from local cache instantly (no network call) ─────────────────
    const trades = this._getLocalTrades();
    const idx = trades.findIndex((t) => t.id === id);
    if (idx < 0) return;

    const resolvedMistakes = updates.mistakes !== undefined ? updates.mistakes : trades[idx].mistakes;
    const resolvedFollowedPlan = (resolvedMistakes && resolvedMistakes.length > 0)
      ? false
      : (updates.followedPlan !== undefined ? updates.followedPlan : trades[idx].followedPlan);

    const updatedTrade: TradeRecord = {
      ...trades[idx],
      ...updates,
      followedPlan: resolvedFollowedPlan,
      mistakes: resolvedMistakes,
      updatedAt: new Date().toISOString(),
    };

    // ── Write to local cache immediately (optimistic) ──────────────────────
    trades[idx] = updatedTrade;
    localStorage.setItem(TRADES_STORAGE_KEY, JSON.stringify(trades));
    notifyListeners();

    // ── Sync to Supabase in the background (non-blocking) ─────────────────
    if (isSupabaseConfigured()) {
      const userId = knownUserId ?? await getCurrentUserId();
      if (userId) {
        supabase.from('trades').upsert(
          { id, user_id: userId, data: updatedTrade, updated_at: new Date().toISOString() },
          { onConflict: 'id' }
        ).then(({ error }) => {
          if (error) console.error('Failed to sync updated trade to Supabase:', error);
        });
      }
    }
  },

  async deleteTrade(id: string, knownUserId?: string | null): Promise<void> {
    // ── Remove from local cache immediately ────────────────────────────────
    const local = this._getLocalTrades().filter((t) => t.id !== id);
    localStorage.setItem(TRADES_STORAGE_KEY, JSON.stringify(local));
    notifyListeners();

    // ── Sync delete to Supabase in the background ──────────────────────────
    if (isSupabaseConfigured()) {
      const userId = knownUserId ?? await getCurrentUserId();
      if (userId) {
        supabase.from('trades')
          .delete()
          .eq('id', id)
          .eq('user_id', userId)
          .then(({ error }) => {
            if (error) console.error('Failed to delete trade from Supabase:', error);
          });
      }
    }
  },

  async duplicateTrade(id: string): Promise<TradeRecord | null> {
    const target = await this.getTradeById(id);
    if (!target) return null;

    const newId = 'trade-' + Date.now();
    const duplicated: TradeRecord = {
      ...target,
      id: newId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tradeDate: new Date().toISOString().split('T')[0],
      tradeTime: new Date().toTimeString().slice(0, 5),
      result: 'OPEN',
      actualR: 0,
      pnl: 0,
      isDemo: false,
    };

    await this.saveTrade(duplicated);
    return duplicated;
  },

  async clearDemoData(): Promise<void> {
    if (isSupabaseConfigured()) {
      const userId = await getCurrentUserId();
      if (userId) {
        // Delete all demo trades from cloud
        const trades = await this.getAllTrades();
        const demoIds = trades.filter((t) => t.isDemo || String(t.id).startsWith('demo-')).map((t) => t.id);
        if (demoIds.length > 0) {
          const { error } = await supabase.from('trades').delete().in('id', demoIds).eq('user_id', userId);
          if (error) {
            console.error('Failed to delete demo trades from Supabase:', error);
            alert('Failed to delete cloud data: ' + error.message);
          }
        }
      }
    }
    const realOnly = this._getLocalTrades().filter((t) => !t.isDemo && !String(t.id).startsWith('demo-'));
    localStorage.setItem(TRADES_STORAGE_KEY, JSON.stringify(realOnly));
    localStorage.setItem('supplyflow_demo_cleared', 'true');
    notifyListeners();
  },

  async deleteAllTrades(): Promise<void> {
    if (isSupabaseConfigured()) {
      const userId = await getCurrentUserId();
      if (userId) {
        await supabase.from('trades').delete().eq('user_id', userId);
      }
    }
    localStorage.setItem(TRADES_STORAGE_KEY, JSON.stringify([]));
    localStorage.setItem('supplyflow_demo_cleared', 'true');
    notifyListeners();
  },

  hasOnlyDemoData(): boolean {
    const trades = this._getLocalTrades();
    if (trades.length === 0) return false;
    return trades.every((t) => t.isDemo);
  },

  hasAnyDemoData(): boolean {
    return this._getLocalTrades().some((t) => t.isDemo);
  },

  hasRealTrades(): boolean {
    return this._getLocalTrades().some((t) => !t.isDemo);
  },

  // ── Settings ─────────────────────────────────────────────────────────────────

  async getSettings(knownUserId?: string | null): Promise<UserSettings> {
    if (!isSupabaseConfigured()) return this._getLocalSettings();

    const userId = knownUserId ?? await getCurrentUserId();
    if (!userId) return this._getLocalSettings();

    const { data, error } = await supabase
      .from('user_settings')
      .select('data')
      .eq('user_id', userId)
      .single();

    if (error || !data) return this._getLocalSettings();
    const merged = { ...DEFAULT_USER_SETTINGS, ...(data.data as UserSettings) };
    // Update local cache
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(merged));
    return merged;
  },

  async saveSettings(settings: UserSettings): Promise<void> {
    if (isSupabaseConfigured()) {
      const userId = await getCurrentUserId();
      if (userId) {
        const { error } = await supabase.from('user_settings').upsert(
          { user_id: userId, data: settings, updated_at: new Date().toISOString() },
          { onConflict: 'user_id' }
        );
        if (error) console.error('Failed to save settings to Supabase:', error);
      }
    }
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    notifyListeners();
  },

  // Keep sync alias for backward compatibility (reads local cache)
  getUserSettings(): UserSettings {
    return this._getLocalSettings();
  },

  // ── Backup / Export ──────────────────────────────────────────────────────────

  exportBackupJSON(): string {
    const backup = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      trades: this._getLocalTrades(),
      settings: this._getLocalSettings(),
    };
    return JSON.stringify(backup, null, 2);
  },

  async importBackupJSON(jsonStr: string): Promise<number> {
    const data = JSON.parse(jsonStr);
    if (!data.trades || !Array.isArray(data.trades)) {
      throw new Error('Invalid backup file: missing trades array.');
    }

    if (isSupabaseConfigured()) {
      const userId = await getCurrentUserId();
      if (userId) {
        // Delete existing and re-upload all
        await supabase.from('trades').delete().eq('user_id', userId);
        const rows = (data.trades as TradeRecord[]).map((t) => ({
          id: t.id,
          user_id: userId,
          data: t,
          updated_at: new Date().toISOString(),
        }));
        if (rows.length > 0) {
          await supabase.from('trades').insert(rows);
        }
        if (data.settings) {
          await this.saveSettings(data.settings);
        }
      }
    }

    localStorage.setItem(TRADES_STORAGE_KEY, JSON.stringify(data.trades));
    if (data.settings) {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(data.settings));
    }
    notifyListeners();
    return data.trades.length;
  },

  async resetAllData(): Promise<void> {
    await this.deleteAllTrades();
    await this.saveSettings(DEFAULT_USER_SETTINGS);
    notifyListeners();
  },

  exportToCSV(): void {
    const trades = this._getLocalTrades();
    if (trades.length === 0) { alert('No trades to export.'); return; }

    const headers = [
      'ID','Date','Time','Pair','Direction','Session','Source','HTF Bias',
      'Zone Quality','Prev Day HOD','Prev Day LOD','Two Day HOD','Two Day LOD',
      'BOS','CHoCH','Entry Price','Stop Loss','Take Profit','Exit Price',
      'Planned R:R','Meets 1:2 R:R','Actual R','P&L','Currency','Result',
      'Followed Plan','Mistakes','Confluence Score','Setup Grade','Lesson','Is Demo',
    ];

    const rows = trades.map((t) => [
      t.id, t.tradeDate, t.tradeTime, t.pair, t.direction, t.session, t.source,
      t.htfBias, t.zoneQuality,
      t.previousDayHOD?'YES':'NO', t.previousDayLOD?'YES':'NO',
      t.twoDayHOD?'YES':'NO', t.twoDayLOD?'YES':'NO',
      t.bos?'YES':'NO', t.choch?'YES':'NO',
      t.entryPrice, t.stopLoss, t.takeProfit, t.exitPrice??'',
      t.plannedRR, t.meetsStandardRR?'YES':'NO',
      t.actualR, t.pnl??'', t.currency, t.result,
      t.followedPlan?'YES':'NO',
      `"${t.mistakes.join('; ')}"`,
      t.confluenceScore, t.setupGrade,
      `"${(t.lesson||'').replace(/"/g,'""')}"`,
      t.isDemo?'YES':'NO',
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `supplyflow_trades_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  },

  // ── Private helpers ──────────────────────────────────────────────────────────  // --- INTERNAL HELPER METHODS ---

  _getLocalTrades(): TradeRecord[] {
    try {
      const raw = localStorage.getItem(TRADES_STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw) as TradeRecord[];
    } catch {
      return [];
    }
  },

  _getLocalSettings(): UserSettings {
    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (!raw) return DEFAULT_USER_SETTINGS;
      return { ...DEFAULT_USER_SETTINGS, ...JSON.parse(raw) };
    } catch {
      return DEFAULT_USER_SETTINGS;
    }
  },

  _buildFullTrade(trade: Partial<TradeRecord>, tradeId: string): TradeRecord {
    return {
      id: tradeId,
      createdAt: trade.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tradeDate: trade.tradeDate || new Date().toISOString().split('T')[0],
      tradeTime: trade.tradeTime || new Date().toTimeString().slice(0, 5),
      pair: trade.pair || 'XAUUSD',
      direction: trade.direction || 'BUY',
      session: trade.session || 'NEW YORK',
      source: trade.source || 'PERSONAL',
      htfBias: trade.htfBias || 'BULLISH',
      timeframeData: trade.timeframeData || ({} as any),
      zoneQuality: trade.zoneQuality || 'FRESH',
      previousDayHOD: !!trade.previousDayHOD,
      previousDayLOD: !!trade.previousDayLOD,
      twoDayHOD: !!trade.twoDayHOD,
      twoDayLOD: !!trade.twoDayLOD,
      reactingAroundKeyLevel: !!trade.reactingAroundKeyLevel,
      structureConfirmation: !!trade.structureConfirmation,
      bos: !!trade.bos,
      choch: !!trade.choch,
      priceActionConfirmation: !!trade.priceActionConfirmation,
      candleConfirmation: !!trade.candleConfirmation,
      otherConfirmation: trade.otherConfirmation || '',
      setupNotes: trade.setupNotes || '',
      entryPrice: trade.entryPrice ?? 0,
      stopLoss: trade.stopLoss ?? 0,
      takeProfit: trade.takeProfit ?? 0,
      exitPrice: trade.exitPrice,
      riskDistance: trade.riskDistance ?? 0,
      rewardDistance: trade.rewardDistance ?? 0,
      plannedRR: trade.plannedRR ?? 2.0,
      meetsStandardRR: trade.meetsStandardRR ?? true,
      accountSize: trade.accountSize,
      riskPercent: trade.riskPercent,
      positionSize: trade.positionSize,
      currency: trade.currency || 'USD',
      beforeScreenshot: trade.beforeScreenshot,
      afterScreenshot: trade.afterScreenshot,
      followedPlan: (trade.mistakes && trade.mistakes.length > 0) ? false : (trade.followedPlan ?? true),
      mistakes: trade.mistakes || [],
      lesson: trade.lesson || '',
      result: trade.result || 'TP HIT',
      actualR: trade.actualR ?? 2.0,
      pnl: trade.pnl ?? 0,
      setupGrade: trade.setupGrade || 'A',
      confluenceScore: trade.confluenceScore ?? 5,
      isDemo: !!trade.isDemo,
    };
  },
};
