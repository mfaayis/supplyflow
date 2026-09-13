/**
 * SUPPLYFLOW — Open New Trade Form
 *
 * A focused, single-step form for opening a new ACTIVE trade that will be
 * automatically monitored for SL/TP hits.
 *
 * Intentionally minimal — you only need to enter what matters:
 *   Symbol, Direction, Entry, SL, TP, Position Size, Timeframe
 *
 * Auto-calculates:
 *   Risk (pips & amount), Reward (pips & amount), R:R, Position Size
 *
 * After submit:
 *   1. Saves trade to Supabase with status=ACTIVE
 *   2. Calls backend /api/trades/activate for immediate monitoring
 */
import React, { useState, useMemo, useEffect } from 'react';
import { TradeRecord, TradeDirection, Timeframe, UserSettings, TradeStatus } from '../../types';
import { tradeRepository } from '../../services/tradeRepository';
import { supabase } from '../../lib/supabase';
import { activateTradeOnServer } from '../../services/marketDataService';
import {
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  Activity,
  X,
  Loader2,
  Info,
} from 'lucide-react';

interface OpenTradeFormProps {
  userSettings: UserSettings;
  onClose: () => void;
  onSaved: (trade: TradeRecord) => void;
}

const TIMEFRAMES: Timeframe[] = ['1M', '5M', '15M', '1H', '4H', 'Daily', 'Weekly'];
const FOREX_PAIRS = ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'NZDUSD', 'USDCHF', 'EURGBP'];
const COMMODITY_PAIRS = ['XAUUSD', 'XAGUSD', 'USOIL'];
const CRYPTO_PAIRS = ['BTCUSD', 'ETHUSD'];
const INDEX_PAIRS = ['US30', 'NAS100', 'SPX500'];

function isJpyPair(symbol: string): boolean { return symbol.includes('JPY'); }
function getDecimalPlaces(symbol: string): number {
  if (isJpyPair(symbol)) return 3;
  if (['XAUUSD', 'US30', 'NAS100', 'SPX500'].includes(symbol)) return 2;
  return 5;
}
function getPipSize(symbol: string): number {
  if (isJpyPair(symbol)) return 0.01;
  if (['XAUUSD'].includes(symbol)) return 0.1;
  if (['US30', 'NAS100', 'SPX500'].includes(symbol)) return 1;
  return 0.0001;
}
function toPips(diff: number, symbol: string): number {
  return diff / getPipSize(symbol);
}
function formatPips(pips: number): string {
  return pips.toFixed(1) + ' pips';
}

export const OpenTradeForm: React.FC<OpenTradeFormProps> = ({
  userSettings,
  onClose,
  onSaved,
}) => {
  const allPairs = [
    ...(userSettings.customPairs || []),
    ...FOREX_PAIRS,
    ...COMMODITY_PAIRS,
    ...CRYPTO_PAIRS,
    ...INDEX_PAIRS,
  ].filter((v, i, a) => a.indexOf(v) === i);

  const [symbol, setSymbol] = useState(userSettings.defaultPair || 'XAUUSD');
  const [customSymbol, setCustomSymbol] = useState('');
  const [direction, setDirection] = useState<TradeDirection>('BUY');
  const [entryStr, setEntryStr] = useState('');
  const [slStr, setSlStr] = useState('');
  const [tpStr, setTpStr] = useState('');
  const [positionSizeStr, setPositionSizeStr] = useState('');
  const [timeframe, setTimeframe] = useState<Timeframe>('15M');
  const [notes, setNotes] = useState('');
  const [screenshot, setScreenshot] = useState('');
  const [zoneHigh, setZoneHigh] = useState('');
  const [zoneLow, setZoneLow] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [savedTrade, setSavedTrade] = useState<TradeRecord | null>(null);

  const finalSymbol = symbol === 'CUSTOM' ? customSymbol.toUpperCase().trim() : symbol;
  const entry = parseFloat(entryStr) || 0;
  const sl = parseFloat(slStr) || 0;
  const tp = parseFloat(tpStr) || 0;
  const positionSize = parseFloat(positionSizeStr) || 0;
  const dp = getDecimalPlaces(finalSymbol);

  const riskDistance = useMemo(() => Math.abs(entry - sl), [entry, sl]);
  const rewardDistance = useMemo(() => Math.abs(tp - entry), [tp, entry]);
  const riskPips = useMemo(() => riskDistance > 0 ? toPips(riskDistance, finalSymbol) : 0, [riskDistance, finalSymbol]);
  const rewardPips = useMemo(() => rewardDistance > 0 ? toPips(rewardDistance, finalSymbol) : 0, [rewardDistance, finalSymbol]);
  const plannedRR = useMemo(() => riskDistance > 0 ? rewardDistance / riskDistance : 0, [riskDistance, rewardDistance]);
  const riskAmount = useMemo(() => {
    const riskPct = userSettings.riskPercentage ?? userSettings.defaultRiskPercent ?? 1;
    return userSettings.accountBalance * (riskPct / 100);
  }, [userSettings]);
  const rewardAmount = useMemo(() => plannedRR > 0 ? riskAmount * plannedRR : 0, [riskAmount, plannedRR]);

  // Auto-compute position size from risk if not manually entered
  const autoPositionSize = useMemo(() => {
    if (positionSizeStr) return positionSize;
    if (riskDistance > 0) return Math.round((riskAmount / riskDistance) * 100) / 100;
    return 0;
  }, [positionSizeStr, positionSize, riskAmount, riskDistance]);

  // Validation
  const validationError = useMemo(() => {
    if (!finalSymbol) return 'Symbol is required.';
    if (!entry || entry <= 0) return 'Entry price is required.';
    if (!sl || sl <= 0) return 'Stop Loss is required.';
    if (!tp || tp <= 0) return 'Take Profit is required.';
    if (direction === 'BUY') {
      if (sl >= entry) return 'For BUY: SL must be below Entry.';
      if (tp <= entry) return 'For BUY: TP must be above Entry.';
    } else {
      if (sl <= entry) return 'For SELL: SL must be above Entry.';
      if (tp >= entry) return 'For SELL: TP must be below Entry.';
    }
    return null;
  }, [finalSymbol, entry, sl, tp, direction]);

  const handleScreenshotUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert('Image too large (max 5MB)'); return; }
    const reader = new FileReader();
    reader.onload = () => { if (typeof reader.result === 'string') setScreenshot(reader.result); };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (validationError) { setError(validationError); return; }
    setError(null);
    setSaving(true);

    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) throw new Error('Not authenticated');

      const now = new Date().toISOString();
      const tradeId = 'trade-' + Date.now();
      const finalPosSize = positionSizeStr ? positionSize : autoPositionSize;

      const trade: TradeRecord = {
        id: tradeId,
        createdAt: now,
        updatedAt: now,
        tradeDate: now.split('T')[0],
        tradeTime: new Date().toTimeString().slice(0, 5),
        pair: finalSymbol,
        direction,
        session: userSettings.defaultSession,
        source: 'PERSONAL',
        htfBias: direction === 'BUY' ? 'BULLISH' : 'BEARISH',
        timeframeData: {} as Record<Timeframe, { bias: 'BULLISH'; zone: 'DEMAND' }>,
        zoneQuality: 'FRESH',
        previousDayHOD: false,
        previousDayLOD: false,
        twoDayHOD: false,
        twoDayLOD: false,
        reactingAroundKeyLevel: false,
        structureConfirmation: false,
        bos: false,
        choch: false,
        priceActionConfirmation: false,
        candleConfirmation: false,
        entryPrice: entry,
        stopLoss: sl,
        takeProfit: tp,
        riskDistance,
        rewardDistance,
        plannedRR,
        meetsStandardRR: plannedRR >= 2.0,
        accountSize: userSettings.accountBalance,
        riskPercent: userSettings.riskPercentage ?? userSettings.defaultRiskPercent,
        positionSize: finalPosSize,
        currency: userSettings.accountCurrency,
        beforeScreenshot: screenshot || undefined,
        followedPlan: true,
        mistakes: [],
        result: 'OPEN',
        actualR: 0,
        pnl: 0,
        setupGrade: 'A',
        confluenceScore: 0,
        isDemo: false,
        // ── Monitoring fields ──
        status: 'ACTIVE',
        openedAt: now,
        riskAmount,
        rewardAmount,
        executionTimeframe: timeframe,
        setupNotes: notes.trim() || undefined,
        zoneHigh: zoneHigh ? parseFloat(zoneHigh) : undefined,
        zoneLow: zoneLow ? parseFloat(zoneLow) : undefined,
      };

      // 1. Save to repository (Supabase + local)
      await tradeRepository.saveTrade(trade);

      // 2. Update Supabase monitoring columns directly
      await supabase.from('trades').update({
        status: 'ACTIVE',
        opened_at: now,
      }).eq('id', tradeId);

      // 3. Tell backend to immediately start monitoring
      await activateTradeOnServer({
        tradeId,
        userId,
        symbol: finalSymbol,
        direction,
        entryPrice: entry,
        stopLoss: sl,
        takeProfit: tp,
        positionSize: finalPosSize,
        data: trade as unknown as Record<string, unknown>,
      });

      setSavedTrade(trade);
      setSaved(true);
    } catch (err) {
      setError((err as Error).message ?? 'Failed to save trade');
    } finally {
      setSaving(false);
    }
  };

  if (saved && savedTrade) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
        <div className="w-full max-w-md rounded-2xl border border-[#181920] bg-[#0A0B0E] p-8 text-center shadow-2xl">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#F59E0B]/10 border border-[#F59E0B]/30">
            <Activity className="h-8 w-8 text-[#F59E0B]" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">Trade Active</h2>
          <p className="mt-2 text-xs text-[#8E95A2]">
            <span className="text-[#A78BFA] font-semibold">{savedTrade.pair}</span>{' '}
            {savedTrade.direction} is now being monitored.
            <br />SL/TP will be detected automatically.
          </p>
          <div className="mt-4 p-3 rounded-lg border border-[#181920] bg-[#0E0F14] space-y-1 text-left">
            <div className="flex justify-between text-xs">
              <span className="text-[#525866]">Entry</span>
              <span className="font-mono-num text-white">{entry.toFixed(dp)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-[#F87171]">SL</span>
              <span className="font-mono-num text-[#F87171]">{sl.toFixed(dp)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-[#34D399]">TP</span>
              <span className="font-mono-num text-[#34D399]">{tp.toFixed(dp)}</span>
            </div>
            <div className="flex justify-between text-xs border-t border-[#181920] pt-1 mt-1">
              <span className="text-[#525866]">R:R</span>
              <span className="font-mono-num text-white">1:{plannedRR.toFixed(1)}</span>
            </div>
          </div>
          <div className="mt-6 flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold text-[#8E95A2] border border-[#181920] hover:text-white hover:bg-[#0E0F14] transition-colors cursor-pointer"
            >
              Back to Dashboard
            </button>
            <button
              onClick={() => { setSaved(false); setSavedTrade(null); setEntryStr(''); setSlStr(''); setTpStr(''); setNotes(''); setScreenshot(''); }}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-[#8B5CF6] hover:bg-[#7C3AED] transition-colors cursor-pointer"
            >
              Open Another
            </button>
          </div>
          <button onClick={() => onSaved(savedTrade)} className="mt-2 text-[10px] text-[#525866] hover:text-white transition-colors cursor-pointer">
            View in Active Trades →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-2xl border border-[#181920] bg-[#0A0B0E] shadow-2xl my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#181920]">
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <Activity className="h-4 w-4 text-[#F59E0B]" />
              Open New Trade
            </h2>
            <p className="text-[10px] text-[#525866] mt-0.5">
              Automatically monitored — SL/TP detected by the server
            </p>
          </div>
          <button onClick={onClose} className="text-[#525866] hover:text-white transition-colors cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Symbol + Direction */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#525866] mb-1.5">Symbol</label>
              <select
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                className="w-full bg-[#0E0F14] border border-[#272932] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#8B5CF6] cursor-pointer"
              >
                {allPairs.map((p) => <option key={p} value={p}>{p}</option>)}
                <option value="CUSTOM">Custom…</option>
              </select>
              {symbol === 'CUSTOM' && (
                <input
                  type="text"
                  value={customSymbol}
                  onChange={(e) => setCustomSymbol(e.target.value.toUpperCase())}
                  placeholder="e.g. GBPJPY"
                  className="mt-1.5 w-full bg-[#0E0F14] border border-[#272932] rounded-lg px-3 py-2 text-xs text-white placeholder-[#525866] focus:outline-none focus:border-[#8B5CF6]"
                />
              )}
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#525866] mb-1.5">Direction</label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => setDirection('BUY')}
                  className={`py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                    direction === 'BUY'
                      ? 'bg-[#10B981]/15 text-[#34D399] border border-[#10B981]/30'
                      : 'bg-[#0E0F14] text-[#525866] border border-[#272932] hover:text-white'
                  }`}
                >
                  <TrendingUp className="h-3.5 w-3.5 mx-auto mb-0.5" />
                  BUY
                </button>
                <button
                  onClick={() => setDirection('SELL')}
                  className={`py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                    direction === 'SELL'
                      ? 'bg-[#EF4444]/10 text-[#F87171] border border-[#EF4444]/20'
                      : 'bg-[#0E0F14] text-[#525866] border border-[#272932] hover:text-white'
                  }`}
                >
                  <TrendingDown className="h-3.5 w-3.5 mx-auto mb-0.5" />
                  SELL
                </button>
              </div>
            </div>
          </div>

          {/* Price levels */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#525866] mb-1.5">Entry</label>
              <input
                type="number"
                value={entryStr}
                onChange={(e) => setEntryStr(e.target.value)}
                step="any"
                placeholder={finalSymbol === 'XAUUSD' ? '2650.00' : '1.17000'}
                className="w-full bg-[#0E0F14] border border-[#272932] rounded-lg px-3 py-2 text-xs font-mono-num text-white placeholder-[#525866] focus:outline-none focus:border-[#8B5CF6]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#F87171] mb-1.5">Stop Loss</label>
              <input
                type="number"
                value={slStr}
                onChange={(e) => setSlStr(e.target.value)}
                step="any"
                placeholder={direction === 'BUY' ? '< Entry' : '> Entry'}
                className="w-full bg-[#EF4444]/5 border border-[#EF4444]/20 rounded-lg px-3 py-2 text-xs font-mono-num text-[#F87171] placeholder-[#F87171]/30 focus:outline-none focus:border-[#EF4444]/50"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#34D399] mb-1.5">Take Profit</label>
              <input
                type="number"
                value={tpStr}
                onChange={(e) => setTpStr(e.target.value)}
                step="any"
                placeholder={direction === 'BUY' ? '> Entry' : '< Entry'}
                className="w-full bg-[#10B981]/5 border border-[#10B981]/20 rounded-lg px-3 py-2 text-xs font-mono-num text-[#34D399] placeholder-[#34D399]/30 focus:outline-none focus:border-[#10B981]/50"
              />
            </div>
          </div>

          {/* Auto-calculated risk summary */}
          {entry > 0 && sl > 0 && tp > 0 && !validationError && (
            <div className="grid grid-cols-3 gap-2 p-3 rounded-lg bg-[#0E0F14] border border-[#181920]">
              <div className="text-center">
                <p className="text-[9px] uppercase tracking-wider text-[#525866] mb-0.5">Risk</p>
                <p className="text-xs font-mono-num font-bold text-[#F87171]">{formatPips(riskPips)}</p>
                <p className="text-[9px] font-mono-num text-[#525866]">≈ ${riskAmount.toFixed(0)}</p>
              </div>
              <div className="text-center border-x border-[#181920]">
                <p className="text-[9px] uppercase tracking-wider text-[#525866] mb-0.5">R:R</p>
                <p className={`text-xs font-mono-num font-bold ${plannedRR >= 2 ? 'text-[#34D399]' : plannedRR >= 1 ? 'text-[#F59E0B]' : 'text-[#F87171]'}`}>
                  1:{plannedRR.toFixed(1)}
                </p>
                {plannedRR < 2 && <p className="text-[9px] text-[#F59E0B]">Below 1:2</p>}
              </div>
              <div className="text-center">
                <p className="text-[9px] uppercase tracking-wider text-[#525866] mb-0.5">Reward</p>
                <p className="text-xs font-mono-num font-bold text-[#34D399]">{formatPips(rewardPips)}</p>
                <p className="text-[9px] font-mono-num text-[#525866]">≈ ${rewardAmount.toFixed(0)}</p>
              </div>
            </div>
          )}

          {/* Timeframe + Position Size row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#525866] mb-1.5">Timeframe</label>
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value as Timeframe)}
                className="w-full bg-[#0E0F14] border border-[#272932] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#8B5CF6] cursor-pointer"
              >
                {TIMEFRAMES.map((tf) => <option key={tf} value={tf}>{tf}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#525866] mb-1.5">
                Position Size
                {!positionSizeStr && autoPositionSize > 0 && (
                  <span className="ml-1 text-[#525866] font-normal">auto</span>
                )}
              </label>
              <input
                type="number"
                value={positionSizeStr}
                onChange={(e) => setPositionSizeStr(e.target.value)}
                placeholder={autoPositionSize > 0 ? String(autoPositionSize) : 'lots/units'}
                step="any"
                className="w-full bg-[#0E0F14] border border-[#272932] rounded-lg px-3 py-2 text-xs font-mono-num text-white placeholder-[#525866] focus:outline-none focus:border-[#8B5CF6]"
              />
            </div>
          </div>

          {/* Optional: Zone levels */}
          <details className="group">
            <summary className="text-[10px] font-bold uppercase tracking-wider text-[#525866] cursor-pointer hover:text-white transition-colors list-none flex items-center gap-1">
              <span className="group-open:rotate-90 transition-transform inline-block">›</span>
              Supply/Demand Zone (optional)
            </summary>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div>
                <label className="block text-[9px] uppercase tracking-wider text-[#525866] mb-1">Zone High</label>
                <input
                  type="number"
                  value={zoneHigh}
                  onChange={(e) => setZoneHigh(e.target.value)}
                  step="any"
                  className="w-full bg-[#0E0F14] border border-[#272932] rounded-lg px-3 py-1.5 text-xs font-mono-num text-white placeholder-[#525866] focus:outline-none focus:border-[#8B5CF6]"
                />
              </div>
              <div>
                <label className="block text-[9px] uppercase tracking-wider text-[#525866] mb-1">Zone Low</label>
                <input
                  type="number"
                  value={zoneLow}
                  onChange={(e) => setZoneLow(e.target.value)}
                  step="any"
                  className="w-full bg-[#0E0F14] border border-[#272932] rounded-lg px-3 py-1.5 text-xs font-mono-num text-white placeholder-[#525866] focus:outline-none focus:border-[#8B5CF6]"
                />
              </div>
            </div>
          </details>

          {/* Notes */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[#525866] mb-1.5">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Setup notes, confluence, reason for entry…"
              className="w-full bg-[#0E0F14] border border-[#272932] rounded-lg px-3 py-2 text-xs text-white placeholder-[#525866] focus:outline-none focus:border-[#8B5CF6] resize-none"
            />
          </div>

          {/* Screenshot */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[#525866] mb-1.5">Screenshot (optional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleScreenshotUpload}
              className="hidden"
              id="open-trade-screenshot"
            />
            <label
              htmlFor="open-trade-screenshot"
              className="flex items-center gap-2 px-3 py-2 border border-dashed border-[#272932] rounded-lg text-xs text-[#525866] hover:text-white hover:border-[#525866] transition-colors cursor-pointer"
            >
              {screenshot ? (
                <span className="text-[#34D399]">✓ Screenshot attached</span>
              ) : (
                <span>Click to attach a chart screenshot</span>
              )}
            </label>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/20">
              <AlertCircle className="h-3.5 w-3.5 text-[#F87171] shrink-0" />
              <p className="text-xs text-[#F87171]">{error}</p>
            </div>
          )}

          {/* Info banner */}
          <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-[#8B5CF6]/5 border border-[#8B5CF6]/15">
            <Info className="h-3.5 w-3.5 text-[#A78BFA] shrink-0 mt-0.5" />
            <p className="text-[10px] text-[#8E95A2] leading-relaxed">
              The backend monitoring server will automatically close this trade when SL or TP is reached.
              You do not need to keep the browser open.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold text-[#8E95A2] border border-[#181920] hover:text-white hover:bg-[#0E0F14] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving || !!validationError}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-[#F59E0B] hover:bg-[#D97706] disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              {saving ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Activating…</>
              ) : (
                <><Activity className="h-3.5 w-3.5" /> Open Trade</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
