import { TradeRecord, UserSettings } from '../types';
import { DEMO_TRADES } from '../data/demoTrades';

const TRADES_STORAGE_KEY = 'supplyflow_trades_v1';
const SETTINGS_STORAGE_KEY = 'supplyflow_settings_v1';
const HAS_USER_TRADES_KEY = 'supplyflow_has_user_trades_v1';

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

type ChangeListener = () => void;
const listeners: Set<ChangeListener> = new Set();

function notifyListeners() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (e) {
      console.error('Error notifying trade listener:', e);
    }
  });
}

export const tradeRepository = {
  subscribe(listener: ChangeListener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  getAllTrades(): TradeRecord[] {
    try {
      const data = localStorage.getItem(TRADES_STORAGE_KEY);
      if (!data) {
        // First launch: initialize with sample demo trades
        localStorage.setItem(TRADES_STORAGE_KEY, JSON.stringify(DEMO_TRADES));
        return DEMO_TRADES;
      }
      return JSON.parse(data) as TradeRecord[];
    } catch (e) {
      console.error('Failed to load trades from storage:', e);
      return DEMO_TRADES;
    }
  },

  getTradeById(id: string): TradeRecord | undefined {
    const trades = this.getAllTrades();
    return trades.find((t) => t.id === id);
  },

  saveTrade(trade: Partial<TradeRecord> | TradeRecord): void {
    const trades = this.getAllTrades();
    const tradeId = trade.id || 'trade-' + Date.now();
    const existingIndex = trades.findIndex((t) => t.id === tradeId);

    // If it's a new user-recorded trade, mark that the user has entered real data
    if (!trade.isDemo) {
      localStorage.setItem(HAS_USER_TRADES_KEY, 'true');
    }

    const fullTrade: TradeRecord = {
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

    let updated: TradeRecord[];
    if (existingIndex >= 0) {
      updated = [...trades];
      updated[existingIndex] = fullTrade;
    } else {
      updated = [fullTrade, ...trades];
    }

    localStorage.setItem(TRADES_STORAGE_KEY, JSON.stringify(updated));
    notifyListeners();
  },

  updateTrade(id: string, updates: Partial<TradeRecord>): void {
    const trades = this.getAllTrades();
    const existingIndex = trades.findIndex((t) => t.id === id);
    if (existingIndex >= 0) {
      const resolvedMistakes = updates.mistakes !== undefined ? updates.mistakes : trades[existingIndex].mistakes;
      const resolvedFollowedPlan = (resolvedMistakes && resolvedMistakes.length > 0)
        ? false
        : (updates.followedPlan !== undefined ? updates.followedPlan : trades[existingIndex].followedPlan);

      const updatedTrade = {
        ...trades[existingIndex],
        ...updates,
        followedPlan: resolvedFollowedPlan,
        mistakes: resolvedMistakes,
        updatedAt: new Date().toISOString(),
      };
      trades[existingIndex] = updatedTrade;
      localStorage.setItem(TRADES_STORAGE_KEY, JSON.stringify(trades));
      notifyListeners();
    }
  },

  deleteTrade(id: string): void {
    const trades = this.getAllTrades();
    const filtered = trades.filter((t) => t.id !== id);
    localStorage.setItem(TRADES_STORAGE_KEY, JSON.stringify(filtered));
    notifyListeners();
  },

  duplicateTrade(id: string): TradeRecord | null {
    const target = this.getTradeById(id);
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

    this.saveTrade(duplicated);
    return duplicated;
  },

  clearDemoData(): void {
    const trades = this.getAllTrades();
    const realOnly = trades.filter((t) => !t.isDemo);
    localStorage.setItem(TRADES_STORAGE_KEY, JSON.stringify(realOnly));
    notifyListeners();
  },

  resetToDemoData(): void {
    localStorage.setItem(TRADES_STORAGE_KEY, JSON.stringify(DEMO_TRADES));
    notifyListeners();
  },

  deleteAllTrades(): void {
    localStorage.setItem(TRADES_STORAGE_KEY, JSON.stringify([]));
    notifyListeners();
  },

  hasOnlyDemoData(): boolean {
    const trades = this.getAllTrades();
    if (trades.length === 0) return false;
    return trades.every((t) => t.isDemo);
  },

  hasAnyDemoData(): boolean {
    const trades = this.getAllTrades();
    return trades.some((t) => t.isDemo);
  },

  hasRealTrades(): boolean {
    const trades = this.getAllTrades();
    return trades.some((t) => !t.isDemo);
  },

  getUserSettings(): UserSettings {
    try {
      const data = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (!data) return DEFAULT_USER_SETTINGS;
      return { ...DEFAULT_USER_SETTINGS, ...JSON.parse(data) };
    } catch {
      return DEFAULT_USER_SETTINGS;
    }
  },

  saveUserSettings(settings: UserSettings): void {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    notifyListeners();
  },

  getSettings(): UserSettings {
    return this.getUserSettings();
  },

  saveSettings(settings: UserSettings): void {
    this.saveUserSettings(settings);
  },

  exportBackupJSON(): string {
    const backup = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      trades: this.getAllTrades(),
      settings: this.getUserSettings(),
    };
    return JSON.stringify(backup, null, 2);
  },

  importBackupJSON(jsonStr: string): number {
    const data = JSON.parse(jsonStr);
    if (!data.trades || !Array.isArray(data.trades)) {
      throw new Error('Invalid backup file: missing trades array.');
    }
    localStorage.setItem(TRADES_STORAGE_KEY, JSON.stringify(data.trades));
    if (data.settings) {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(data.settings));
    }
    notifyListeners();
    return data.trades.length;
  },

  resetAllData(): void {
    localStorage.setItem(TRADES_STORAGE_KEY, JSON.stringify([]));
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(DEFAULT_USER_SETTINGS));
    localStorage.removeItem(HAS_USER_TRADES_KEY);
    notifyListeners();
  },

  exportToCSV(): void {
    const trades = this.getAllTrades();
    if (trades.length === 0) {
      alert('No trades available to export.');
      return;
    }

    const headers = [
      'ID',
      'Date',
      'Time',
      'Pair',
      'Direction',
      'Session',
      'Source',
      'HTF Bias',
      'Zone Quality',
      'Prev Day HOD',
      'Prev Day LOD',
      'Two Day HOD',
      'Two Day LOD',
      'BOS',
      'CHoCH',
      'Entry Price',
      'Stop Loss',
      'Take Profit',
      'Exit Price',
      'Planned R:R',
      'Meets 1:2 R:R',
      'Actual R',
      'P&L',
      'Currency',
      'Result',
      'Followed Plan',
      'Mistakes',
      'Confluence Score',
      'Setup Grade',
      'Lesson',
      'Is Demo',
    ];

    const rows = trades.map((t) => [
      t.id,
      t.tradeDate,
      t.tradeTime,
      t.pair,
      t.direction,
      t.session,
      t.source,
      t.htfBias,
      t.zoneQuality,
      t.previousDayHOD ? 'YES' : 'NO',
      t.previousDayLOD ? 'YES' : 'NO',
      t.twoDayHOD ? 'YES' : 'NO',
      t.twoDayLOD ? 'YES' : 'NO',
      t.bos ? 'YES' : 'NO',
      t.choch ? 'YES' : 'NO',
      t.entryPrice,
      t.stopLoss,
      t.takeProfit,
      t.exitPrice ?? '',
      t.plannedRR,
      t.meetsStandardRR ? 'YES' : 'NO',
      t.actualR,
      t.pnl ?? '',
      t.currency,
      t.result,
      t.followedPlan ? 'YES' : 'NO',
      `"${t.mistakes.join('; ')}"`,
      t.confluenceScore,
      t.setupGrade,
      `"${(t.lesson || '').replace(/"/g, '""')}"`,
      t.isDemo ? 'YES' : 'NO',
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `supplyflow_trades_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },
};
