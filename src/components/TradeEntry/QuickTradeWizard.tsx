import React, { useState, useMemo } from 'react';
import {
  TradeRecord,
  Timeframe,
  MarketBias,
  ZoneType,
  ZoneQuality,
  TradeDirection,
  TradingSession,
  TradeSource,
  TradeResult,
  MistakeType,
  CurrencyCode,
  UserSettings,
} from '../../types';
import { tradeRepository } from '../../services/tradeRepository';
import { calculateConfluence, recommendSetupGrade } from '../../utils/calculations';
import {
  Check,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Upload,
  Camera,
  RotateCcw,
  CheckCircle2,
  X,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface QuickTradeWizardProps {
  onSaved?: (tradeId: string) => void;
  onSave?: (tradeData: Partial<TradeRecord>) => void;
  onCancel: () => void;
  initialTrade?: TradeRecord | null;
  userSettings?: UserSettings;
}

const TIMEFRAMES: Timeframe[] = ['Weekly', 'Daily', '4H', '1H', '15M', '5M', '1M'];
const PAIRS = ['XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'USDCAD', 'OTHER'];
const SESSIONS: TradingSession[] = ['NEW YORK', 'LONDON', 'ASIA', 'OTHER'];
const SOURCES: TradeSource[] = ['PERSONAL', 'LIVESTREAM'];
const BIAS_OPTIONS: MarketBias[] = ['BULLISH', 'BEARISH', 'NEUTRAL', 'UNCLEAR'];
const ZONE_OPTIONS: ZoneType[] = ['SUPPLY', 'DEMAND', 'NONE'];
const ZONE_QUALITIES: ZoneQuality[] = ['FRESH', 'TESTED ONCE', 'TESTED MULTIPLE TIMES', 'WEAK / UNCLEAR'];
const COMMON_MISTAKES: MistakeType[] = [
  'FOMO',
  'Late Entry',
  'Revenge Trade',
  'Moved SL',
  'Closed Early',
  'Overtraded',
  'Ignored HTF',
  'Ignored Zone Rules',
  'Traded Outside Session',
  'Entered Without Confirmation',
  'Other',
];

export const QuickTradeWizard: React.FC<QuickTradeWizardProps> = ({
  onSaved,
  onSave,
  onCancel,
  initialTrade,
  userSettings,
}) => {
  const settings = userSettings || tradeRepository.getUserSettings();

  // Wizard Step (1 through 9)
  const [currentStep, setCurrentStep] = useState<number>(1);
  const totalSteps = 9;

  // Form State
  const now = new Date();
  const [tradeDate, setTradeDate] = useState<string>(initialTrade?.tradeDate || now.toISOString().split('T')[0]);
  const [tradeTime, setTradeTime] = useState<string>(initialTrade?.tradeTime || now.toTimeString().slice(0, 5));
  const [pair, setPair] = useState<string>(initialTrade?.pair || settings.defaultPair);
  const [customPair, setCustomPair] = useState<string>('');
  const [direction, setDirection] = useState<TradeDirection>(initialTrade?.direction || 'SELL');
  const [session, setSession] = useState<TradingSession>(initialTrade?.session || settings.defaultSession);
  const [source, setSource] = useState<TradeSource>(initialTrade?.source || 'PERSONAL');

  // Step 2 & 3: HTF & Multi-Timeframe Matrix
  const [htfBias, setHtfBias] = useState<MarketBias>(initialTrade?.htfBias || (direction === 'BUY' ? 'BULLISH' : 'BEARISH'));
  const [timeframeData, setTimeframeData] = useState<Record<Timeframe, { bias: MarketBias; zone: ZoneType; quality?: ZoneQuality }>>(() => {
    if (initialTrade?.timeframeData) return initialTrade.timeframeData;
    const initialTf: Record<string, { bias: MarketBias; zone: ZoneType }> = {};
    const defaultBias = direction === 'BUY' ? 'BULLISH' : 'BEARISH';
    const defaultZone = direction === 'BUY' ? 'DEMAND' : 'SUPPLY';
    TIMEFRAMES.forEach((tf) => {
      initialTf[tf] = { bias: defaultBias, zone: defaultZone };
    });
    return initialTf as Record<Timeframe, { bias: MarketBias; zone: ZoneType }>;
  });
  const [zoneQuality, setZoneQuality] = useState<ZoneQuality>(initialTrade?.zoneQuality || 'FRESH');

  // Step 4: Liquidity / Reference Levels
  const [previousDayHOD, setPreviousDayHOD] = useState<boolean>(initialTrade?.previousDayHOD || false);
  const [previousDayLOD, setPreviousDayLOD] = useState<boolean>(initialTrade?.previousDayLOD || false);
  const [twoDayHOD, setTwoDayHOD] = useState<boolean>(initialTrade?.twoDayHOD || false);
  const [twoDayLOD, setTwoDayLOD] = useState<boolean>(initialTrade?.twoDayLOD || false);
  const [reactingAroundKeyLevel, setReactingAroundKeyLevel] = useState<boolean>(initialTrade?.reactingAroundKeyLevel ?? true);

  // Step 5: Structure & Confirmation
  const [structureConfirmation, setStructureConfirmation] = useState<boolean>(initialTrade?.structureConfirmation ?? true);
  const [bos, setBos] = useState<boolean>(initialTrade?.bos ?? true);
  const [choch, setChoch] = useState<boolean>(initialTrade?.choch ?? true);
  const [priceActionConfirmation, setPriceActionConfirmation] = useState<boolean>(initialTrade?.priceActionConfirmation ?? true);
  const [candleConfirmation, setCandleConfirmation] = useState<boolean>(initialTrade?.candleConfirmation ?? true);
  const [otherConfirmation, setOtherConfirmation] = useState<string>(initialTrade?.otherConfirmation || '');
  const [setupNotes, setSetupNotes] = useState<string>(initialTrade?.setupNotes || '');

  // Step 6: Entry & Risk
  const [entryPrice, setEntryPrice] = useState<string>(initialTrade ? String(initialTrade.entryPrice) : '');
  const [stopLoss, setStopLoss] = useState<string>(initialTrade ? String(initialTrade.stopLoss) : '');
  const [takeProfit, setTakeProfit] = useState<string>(initialTrade ? String(initialTrade.takeProfit) : '');
  const [currency, setCurrency] = useState<CurrencyCode>(initialTrade?.currency || settings.accountCurrency);

  // Step 7: Screenshots
  const [beforeScreenshot, setBeforeScreenshot] = useState<string>(initialTrade?.beforeScreenshot || '');
  const [afterScreenshot, setAfterScreenshot] = useState<string>(initialTrade?.afterScreenshot || '');

  // Step 8: Execution & Discipline
  const [followedPlan, setFollowedPlan] = useState<boolean>(initialTrade?.followedPlan ?? true);
  const [mistakes, setMistakes] = useState<MistakeType[]>(initialTrade?.mistakes || []);
  const [lesson, setLesson] = useState<string>(initialTrade?.lesson || '');

  // Step 9: Result
  const [result, setResult] = useState<TradeResult>(initialTrade?.result || 'TP HIT');
  const [exitPrice, setExitPrice] = useState<string>(initialTrade?.exitPrice ? String(initialTrade.exitPrice) : '');
  const [manualR, setManualR] = useState<string>(initialTrade ? String(initialTrade.actualR) : '');
  const [manualPnl, setManualPnl] = useState<string>(initialTrade?.pnl ? String(initialTrade.pnl) : '');

  // UI state after saving
  const [savedTradeId, setSavedTradeId] = useState<string | null>(null);

  // Auto Calculations for Risk / Reward
  const numEntry = parseFloat(entryPrice) || 0;
  const numSL = parseFloat(stopLoss) || 0;
  const numTP = parseFloat(takeProfit) || 0;
  const numExit = parseFloat(exitPrice) || 0;

  const riskDistance = useMemo(() => {
    if (!numEntry || !numSL) return 0;
    return Math.abs(numEntry - numSL);
  }, [numEntry, numSL]);

  const rewardDistance = useMemo(() => {
    if (!numEntry || !numTP) return 0;
    return Math.abs(numTP - numEntry);
  }, [numEntry, numTP]);

  const plannedRR = useMemo(() => {
    if (!riskDistance || !rewardDistance) return 0;
    return Number((rewardDistance / riskDistance).toFixed(2));
  }, [riskDistance, rewardDistance]);

  const meetsStandardRR = plannedRR >= 2.0;

  // Auto Calculation for Actual R
  const calculatedActualR = useMemo(() => {
    if (manualR !== '') {
      return parseFloat(manualR) || 0;
    }
    if (result === 'TP HIT') return plannedRR || 2.0;
    if (result === 'SL HIT') return -1.0;
    if (result === 'BREAKEVEN') return 0.0;
    if (numExit && numEntry && riskDistance > 0) {
      const exitDist = direction === 'BUY' ? numExit - numEntry : numEntry - numExit;
      return Number((exitDist / riskDistance).toFixed(2));
    }
    return 0;
  }, [manualR, result, plannedRR, numExit, numEntry, riskDistance, direction]);

  // Confluence & Setup Rating
  const confluence = useMemo(() => {
    return calculateConfluence({
      direction,
      session,
      timeframeData,
      zoneQuality,
      previousDayHOD,
      previousDayLOD,
      twoDayHOD,
      twoDayLOD,
      reactingAroundKeyLevel,
      structureConfirmation,
      bos,
      choch,
      candleConfirmation,
      plannedRR,
    });
  }, [
    direction,
    session,
    timeframeData,
    zoneQuality,
    previousDayHOD,
    previousDayLOD,
    twoDayHOD,
    twoDayLOD,
    reactingAroundKeyLevel,
    structureConfirmation,
    bos,
    choch,
    candleConfirmation,
    plannedRR,
  ]);

  const setupGrade = useMemo(() => {
    return recommendSetupGrade({
      direction,
      session,
      timeframeData,
      zoneQuality,
      previousDayHOD,
      previousDayLOD,
      twoDayHOD,
      twoDayLOD,
      reactingAroundKeyLevel,
      structureConfirmation,
      bos,
      choch,
      candleConfirmation,
      plannedRR,
    });
  }, [
    direction,
    session,
    timeframeData,
    zoneQuality,
    previousDayHOD,
    previousDayLOD,
    twoDayHOD,
    twoDayLOD,
    reactingAroundKeyLevel,
    structureConfirmation,
    bos,
    choch,
    candleConfirmation,
    plannedRR,
  ]);

  // Handle Quick Direction Shift helper
  const handleDirectionChange = (newDir: TradeDirection) => {
    setDirection(newDir);
    const newBias: MarketBias = newDir === 'BUY' ? 'BULLISH' : 'BEARISH';
    const newZone: ZoneType = newDir === 'BUY' ? 'DEMAND' : 'SUPPLY';
    setHtfBias(newBias);
    setTimeframeData((prev) => {
      const updated = { ...prev };
      TIMEFRAMES.forEach((tf) => {
        updated[tf] = { bias: newBias, zone: newZone };
      });
      return updated;
    });
  };

  // Image Upload handler (File -> DataURL)
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'before' | 'after') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Image size exceeds 5MB. Please choose a smaller image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        if (target === 'before') setBeforeScreenshot(reader.result);
        else setAfterScreenshot(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Currency symbol helper
  const currencySymbol = (c: CurrencyCode) => {
    const map: Record<CurrencyCode, string> = {
      USD: '$', EUR: '€', GBP: '£', INR: '₹', CAD: 'C$', AUD: 'A$', JPY: '¥',
    };
    return map[c] || c;
  };

  // Risk amount (respects both riskPercentage and defaultRiskPercent fields)
  const riskPercent = settings.riskPercentage ?? settings.defaultRiskPercent ?? 1.0;
  const riskAmount = settings.accountBalance * (riskPercent / 100);

  // Toggle Mistake — auto-sets followedPlan based on mistakes
  const toggleMistake = (m: MistakeType) => {
    const newMistakes = mistakes.includes(m)
      ? mistakes.filter((x) => x !== m)
      : [...mistakes, m];
    setMistakes(newMistakes);
    // Auto-flag as rule break when any mistake is logged
    if (newMistakes.length > 0) setFollowedPlan(false);
  };

  // Final Save Handler
  const handleSaveTrade = () => {
    const finalPair = pair === 'OTHER' && customPair ? customPair.toUpperCase().trim() : pair;
    const finalActualR = calculatedActualR;
    const finalPnl = manualPnl !== '' ? parseFloat(manualPnl) : Number((finalActualR * riskAmount).toFixed(2));
    const finalPositionSize = riskDistance > 0 ? Number((riskAmount / riskDistance).toFixed(4)) : undefined;

    const newTrade: TradeRecord = {
      id: initialTrade?.id || 'trade-' + Date.now(),
      createdAt: initialTrade?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tradeDate,
      tradeTime,
      pair: finalPair,
      direction,
      session,
      source,
      htfBias,
      timeframeData,
      zoneQuality,
      previousDayHOD,
      previousDayLOD,
      twoDayHOD,
      twoDayLOD,
      reactingAroundKeyLevel,
      structureConfirmation,
      bos,
      choch,
      priceActionConfirmation,
      candleConfirmation,
      otherConfirmation: otherConfirmation.trim() || undefined,
      setupNotes: setupNotes.trim() || undefined,
      entryPrice: numEntry,
      stopLoss: numSL,
      takeProfit: numTP,
      exitPrice: numExit || undefined,
      riskDistance,
      rewardDistance,
      plannedRR,
      meetsStandardRR,
      accountSize: settings.accountBalance,
      riskPercent,
      positionSize: finalPositionSize,
      currency,
      beforeScreenshot: beforeScreenshot || undefined,
      afterScreenshot: afterScreenshot || undefined,
      // Auto-correct followedPlan: if ANY mistake is logged, it's a rule break
      followedPlan: mistakes.length > 0 ? false : followedPlan,
      mistakes,
      lesson: lesson.trim() || undefined,
      result,
      actualR: finalActualR,
      pnl: finalPnl,
      setupGrade,
      confluenceScore: confluence.score,
      isDemo: false,
    };

    if (onSave) {
      onSave(newTrade);
    } else {
      tradeRepository.saveTrade(newTrade);
    }
    setSavedTradeId(newTrade.id);
    if (onSaved) {
      onSaved(newTrade.id);
    }

    // Subtle celebration for logging trade
    try {
      confetti({
        particleCount: 35,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#8B5CF6', '#34D399', '#A78BFA', '#F87171'],
      });
    } catch {
      // Ignored if canvas-confetti unavailable
    }
  };

  // Post-Save Screen
  if (savedTradeId) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
        <div className="relative w-full max-w-xl rounded-2xl border border-[#181920] bg-[#0A0B0E] p-8 text-center shadow-2xl">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <CheckCircle2 className="h-9 w-9" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Trade Saved</h2>
          <p className="mt-2 text-sm text-[#8E95A2]">
            Your trade on <span className="text-[#A78BFA] font-semibold">{pair}</span> has been saved to your journal.
          </p>

          <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
            <button
              onClick={() => {
                if (onSaved) onSaved(savedTradeId);
                else onCancel();
              }}
              className="flex items-center justify-center gap-2 rounded-xl bg-[#0E0F14] hover:bg-[#15161E] border border-[#181920] px-5 py-3 text-sm font-semibold text-white transition-all shadow-xs cursor-pointer"
            >
              View Trade
            </button>
            <button
              onClick={() => {
                setSavedTradeId(null);
                setCurrentStep(1);
              }}
              className="flex items-center justify-center gap-2 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] px-5 py-3 text-sm font-semibold text-white transition-all shadow-[0_0_15px_rgba(139,92,246,0.35)] cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" />
              Log Another Trade
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl max-h-[92vh] flex flex-col rounded-2xl border border-[#181920] bg-[#0A0B0E] shadow-2xl overflow-hidden my-auto">
        {/* Wizard Header Bar */}
        <div className="border-b border-[#181920] bg-[#0D0E12] px-5 py-4 sm:px-7 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 text-[#A78BFA] font-bold text-xs">
              {currentStep}/{totalSteps}
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">
                {initialTrade ? 'Edit Trade' : 'Log Trade'}
              </h1>
              <p className="text-xs text-[#8E95A2]">
                Step {currentStep} of {totalSteps}:{' '}
                {currentStep === 1 && 'Pair & Session'}
                {currentStep === 2 && 'HTF Bias'}
                {currentStep === 3 && 'Supply & Demand'}
                {currentStep === 4 && 'Liquidity Levels'}
                {currentStep === 5 && 'Structure & Confirmation'}
                {currentStep === 6 && 'Entry, Stop & Target'}
                {currentStep === 7 && 'Screenshots'}
                {currentStep === 8 && 'Discipline & Rules'}
                {currentStep === 9 && 'Outcome & Return'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onCancel}
              className="p-1.5 rounded-lg text-[#8E95A2] hover:text-white hover:bg-[#15161E] transition-colors cursor-pointer"
              title="Cancel"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Step Progress Pills */}
        <div className="grid grid-cols-9 bg-[#07080A] border-b border-[#181920] p-1 gap-1 text-center">
          {Array.from({ length: totalSteps }).map((_, idx) => {
            const stepNum = idx + 1;
            const isActive = currentStep === stepNum;
            const isDone = currentStep > stepNum;
            return (
              <button
                key={stepNum}
                onClick={() => setCurrentStep(stepNum)}
                className={`py-1.5 text-[11px] font-mono-num font-semibold rounded transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#8B5CF6] text-white shadow-[0_0_12px_rgba(139,92,246,0.35)]'
                    : isDone
                    ? 'bg-[#8B5CF6]/15 text-[#A78BFA] border border-[#8B5CF6]/30'
                    : 'bg-[#0E0F14] text-[#525866] hover:text-[#8E95A2]'
                }`}
              >
                0{stepNum}
              </button>
            );
          })}
        </div>

        {/* Card Body with Progressive Disclosure */}
        <div className="p-5 sm:p-7 min-h-[400px] overflow-y-auto flex-1 flex flex-col justify-between">
          {/* STEP 1: BASIC TRADE */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Date & Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#8E95A2] mb-1.5">
                    Date
                  </label>
                  <input
                    type="date"
                    value={tradeDate}
                    onChange={(e) => setTradeDate(e.target.value)}
                    className="w-full rounded-xl border border-[#181920] bg-[#0E0F14] px-3.5 py-2.5 text-sm text-white focus:border-[#8B5CF6] focus:outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#8E95A2] mb-1.5">
                    Execution Time
                  </label>
                  <input
                    type="time"
                    value={tradeTime}
                    onChange={(e) => setTradeTime(e.target.value)}
                    className="w-full rounded-xl border border-[#181920] bg-[#0E0F14] px-3.5 py-2.5 text-sm text-white focus:border-[#8B5CF6] focus:outline-none transition-all"
                  />
                </div>
              </div>

              {/* Direction Large Toggle */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#8E95A2] mb-2">
                  Side
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleDirectionChange('BUY')}
                    className={`flex items-center justify-center gap-2 rounded-xl py-3.5 text-base font-bold transition-all border cursor-pointer ${
                      direction === 'BUY'
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500 shadow-md shadow-emerald-500/10'
                        : 'bg-[#0E0F14] text-[#8E95A2] border-[#181920] hover:border-emerald-500/40 hover:text-white'
                    }`}
                  >
                    BUY
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDirectionChange('SELL')}
                    className={`flex items-center justify-center gap-2 rounded-xl py-3.5 text-base font-bold transition-all border cursor-pointer ${
                      direction === 'SELL'
                        ? 'bg-rose-500/20 text-rose-400 border-rose-500 shadow-md shadow-rose-500/10'
                        : 'bg-[#0E0F14] text-[#8E95A2] border-[#181920] hover:border-rose-500/40 hover:text-white'
                    }`}
                  >
                    SELL
                  </button>
                </div>
              </div>

              {/* Pair Quick Select Chips */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#8E95A2] mb-2">
                  Pair
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {PAIRS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPair(p)}
                      className={`py-2.5 px-3 rounded-xl text-xs font-bold tracking-wide border transition-all cursor-pointer ${
                        pair === p
                          ? 'bg-[#8B5CF6] text-white border-[#8B5CF6] shadow-[0_0_12px_rgba(139,92,246,0.3)]'
                          : 'bg-[#0E0F14] text-[#CBD5E1] border-[#181920] hover:bg-[#15161E] hover:text-white'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                {pair === 'OTHER' && (
                  <input
                    type="text"
                    placeholder="Enter pair symbol (e.g. NAS100, US30)"
                    value={customPair}
                    onChange={(e) => setCustomPair(e.target.value)}
                    className="mt-3 w-full rounded-xl border border-[#181920] bg-[#0E0F14] px-3.5 py-2.5 text-sm text-white focus:border-[#8B5CF6] focus:outline-none uppercase"
                  />
                )}
              </div>

              {/* Session Quick Chips */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#8E95A2] mb-2">
                  Session
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {SESSIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSession(s)}
                      className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        session === s
                          ? 'bg-[#8B5CF6]/20 text-[#A78BFA] border-[#8B5CF6]'
                          : 'bg-[#0E0F14] text-[#8E95A2] border-[#181920] hover:bg-[#15161E] hover:text-white'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Trade Source */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#8E95A2] mb-2">
                  Source
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {SOURCES.map((src) => (
                    <button
                      key={src}
                      type="button"
                      onClick={() => setSource(src)}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        source === src
                          ? 'bg-[#8B5CF6]/20 text-[#A78BFA] border-[#8B5CF6]'
                          : 'bg-[#0E0F14] text-[#8E95A2] border-[#181920] hover:bg-[#15161E] hover:text-white'
                      }`}
                    >
                      {src}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: HTF BIAS */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#A78BFA] mb-2">
                  Higher-Timeframe Bias
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {BIAS_OPTIONS.map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setHtfBias(b)}
                      className={`py-3 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        htfBias === b
                          ? b === 'BULLISH'
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500'
                            : b === 'BEARISH'
                            ? 'bg-rose-500/20 text-rose-400 border-rose-500'
                            : 'bg-[#8B5CF6]/20 text-[#A78BFA] border-[#8B5CF6]'
                          : 'bg-[#0E0F14] text-[#8E95A2] border-[#181920] hover:bg-[#15161E] hover:text-white'
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>

              {/* Compact Timeframe Direction Matrix */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#8E95A2]">
                    Timeframe Direction
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const target = direction === 'BUY' ? 'BULLISH' : 'BEARISH';
                      setTimeframeData((prev) => {
                        const next = { ...prev };
                        TIMEFRAMES.forEach((tf) => {
                          next[tf] = { ...next[tf], bias: target };
                        });
                        return next;
                      });
                    }}
                    className="text-[11px] text-[#A78BFA] hover:text-[#C4B5FD] hover:underline font-semibold cursor-pointer"
                  >
                    Set all to {direction === 'BUY' ? 'Bullish' : 'Bearish'}
                  </button>
                </div>

                <div className="rounded-xl border border-[#181920] bg-[#0E0F14] overflow-hidden divide-y divide-[#181920]">
                  {TIMEFRAMES.map((tf) => {
                    const currentBias = timeframeData[tf]?.bias || 'NEUTRAL';
                    return (
                      <div key={tf} className="flex items-center justify-between px-3.5 py-2.5">
                        <span className="font-mono-num font-bold text-xs text-white w-16">{tf}</span>
                        <div className="flex items-center gap-1.5">
                          {(['BULLISH', 'BEARISH', 'NEUTRAL'] as MarketBias[]).map((biasOpt) => {
                            const isSel = currentBias === biasOpt;
                            return (
                              <button
                                key={biasOpt}
                                type="button"
                                onClick={() => {
                                  setTimeframeData((prev) => ({
                                    ...prev,
                                    [tf]: { ...prev[tf], bias: biasOpt },
                                  }));
                                }}
                                className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                                  isSel
                                    ? biasOpt === 'BULLISH'
                                      ? 'bg-emerald-500 text-black font-bold'
                                      : biasOpt === 'BEARISH'
                                      ? 'bg-rose-500 text-white font-bold'
                                      : 'bg-[#181920] text-gray-200 font-bold border border-[#272932]'
                                    : 'bg-[#15161E] text-[#8E95A2] hover:text-white'
                                }`}
                              >
                                {biasOpt}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: SUPPLY / DEMAND */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#A78BFA] mb-2">
                  Zone Quality
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {ZONE_QUALITIES.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setZoneQuality(q)}
                      className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${
                        zoneQuality === q
                          ? 'bg-[#8B5CF6]/20 text-[#A78BFA] border-[#8B5CF6]'
                          : 'bg-[#0E0F14] text-[#8E95A2] border-[#181920] hover:bg-[#15161E] hover:text-white'
                      }`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#8E95A2]">
                    Timeframe Zones
                  </label>
                  <span className="text-[11px] text-[#8E95A2]">
                    Demand: last down candle before push • Supply: last up candle before drop
                  </span>
                </div>

                <div className="rounded-xl border border-[#181920] bg-[#0E0F14] overflow-hidden divide-y divide-[#181920]">
                  {TIMEFRAMES.map((tf) => {
                    const currentZone = timeframeData[tf]?.zone || 'NONE';
                    return (
                      <div key={tf} className="flex items-center justify-between px-3.5 py-2.5">
                        <span className="font-mono-num font-bold text-xs text-white w-16">{tf}</span>
                        <div className="flex items-center gap-1.5">
                          {ZONE_OPTIONS.map((z) => {
                            const isSel = currentZone === z;
                            return (
                              <button
                                key={z}
                                type="button"
                                onClick={() => {
                                  setTimeframeData((prev) => ({
                                    ...prev,
                                    [tf]: { ...prev[tf], zone: z },
                                  }));
                                }}
                                className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                                  isSel
                                    ? z === 'DEMAND'
                                      ? 'bg-emerald-500 text-black font-bold'
                                      : z === 'SUPPLY'
                                      ? 'bg-rose-500 text-white font-bold'
                                      : 'bg-[#181920] text-gray-200 font-bold border border-[#272932]'
                                    : 'bg-[#15161E] text-[#8E95A2] hover:text-white'
                                }`}
                              >
                                {z}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: HOD / LOD CONFLUENCE */}
          {currentStep === 4 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#A78BFA] mb-1">
                  Liquidity Levels
                </h3>
                <p className="text-xs text-[#8E95A2] mb-4">
                  Did price react to any key levels?
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex items-center gap-3 p-3.5 rounded-xl border border-[#181920] bg-[#0E0F14] cursor-pointer hover:border-[#8B5CF6]/50 transition-colors">
                    <input
                      type="checkbox"
                      checked={previousDayHOD}
                      onChange={(e) => setPreviousDayHOD(e.target.checked)}
                      className="h-4 w-4 rounded border-[#272932] bg-[#15161E] text-[#8B5CF6] accent-[#8B5CF6] focus:ring-0"
                    />
                    <div className="text-sm font-semibold text-white">Previous Day HOD</div>
                  </label>

                  <label className="flex items-center gap-3 p-3.5 rounded-xl border border-[#181920] bg-[#0E0F14] cursor-pointer hover:border-[#8B5CF6]/50 transition-colors">
                    <input
                      type="checkbox"
                      checked={previousDayLOD}
                      onChange={(e) => setPreviousDayLOD(e.target.checked)}
                      className="h-4 w-4 rounded border-[#272932] bg-[#15161E] text-[#8B5CF6] accent-[#8B5CF6] focus:ring-0"
                    />
                    <div className="text-sm font-semibold text-white">Previous Day LOD</div>
                  </label>

                  <label className="flex items-center gap-3 p-3.5 rounded-xl border border-[#181920] bg-[#0E0F14] cursor-pointer hover:border-[#8B5CF6]/50 transition-colors">
                    <input
                      type="checkbox"
                      checked={twoDayHOD}
                      onChange={(e) => setTwoDayHOD(e.target.checked)}
                      className="h-4 w-4 rounded border-[#272932] bg-[#15161E] text-[#8B5CF6] accent-[#8B5CF6] focus:ring-0"
                    />
                    <div className="text-sm font-semibold text-white">Two-Day HOD</div>
                  </label>

                  <label className="flex items-center gap-3 p-3.5 rounded-xl border border-[#181920] bg-[#0E0F14] cursor-pointer hover:border-[#8B5CF6]/50 transition-colors">
                    <input
                      type="checkbox"
                      checked={twoDayLOD}
                      onChange={(e) => setTwoDayLOD(e.target.checked)}
                      className="h-4 w-4 rounded border-[#272932] bg-[#15161E] text-[#8B5CF6] accent-[#8B5CF6] focus:ring-0"
                    />
                    <div className="text-sm font-semibold text-white">Two-Day LOD</div>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#8E95A2] mb-2">
                  Reacting at level?
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setReactingAroundKeyLevel(true)}
                    className={`py-3 rounded-xl text-sm font-bold border transition-all cursor-pointer ${
                      reactingAroundKeyLevel
                        ? 'bg-[#8B5CF6]/20 text-[#A78BFA] border-[#8B5CF6] shadow-xs'
                        : 'bg-[#0E0F14] text-[#8E95A2] border-[#181920] hover:bg-[#15161E]'
                    }`}
                  >
                    YES
                  </button>
                  <button
                    type="button"
                    onClick={() => setReactingAroundKeyLevel(false)}
                    className={`py-3 rounded-xl text-sm font-bold border transition-all cursor-pointer ${
                      !reactingAroundKeyLevel
                        ? 'bg-[#181920] text-white border-[#272932]'
                        : 'bg-[#0E0F14] text-[#8E95A2] border-[#181920] hover:bg-[#15161E]'
                    }`}
                  >
                    NO
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: MARKET STRUCTURE / CONFIRMATION */}
          {currentStep === 5 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#A78BFA] mb-1">
                  Structure & Confirmation
                </h3>
                <p className="text-xs text-[#8E95A2] mb-4">
                  What confirmed the entry?
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex items-center gap-3 p-3.5 rounded-xl border border-[#181920] bg-[#0E0F14] cursor-pointer hover:border-[#8B5CF6]/50 transition-colors">
                    <input
                      type="checkbox"
                      checked={structureConfirmation}
                      onChange={(e) => setStructureConfirmation(e.target.checked)}
                      className="h-4 w-4 rounded border-[#272932] bg-[#15161E] text-[#8B5CF6] accent-[#8B5CF6]"
                    />
                    <span className="text-sm font-semibold text-white">Structure Confirmation</span>
                  </label>

                  <label className="flex items-center gap-3 p-3.5 rounded-xl border border-[#181920] bg-[#0E0F14] cursor-pointer hover:border-[#8B5CF6]/50 transition-colors">
                    <input
                      type="checkbox"
                      checked={bos}
                      onChange={(e) => setBos(e.target.checked)}
                      className="h-4 w-4 rounded border-[#272932] bg-[#15161E] text-[#8B5CF6] accent-[#8B5CF6]"
                    />
                    <span className="text-sm font-semibold text-white">BOS (Break of Structure)</span>
                  </label>

                  <label className="flex items-center gap-3 p-3.5 rounded-xl border border-[#181920] bg-[#0E0F14] cursor-pointer hover:border-[#8B5CF6]/50 transition-colors">
                    <input
                      type="checkbox"
                      checked={choch}
                      onChange={(e) => setChoch(e.target.checked)}
                      className="h-4 w-4 rounded border-[#272932] bg-[#15161E] text-[#8B5CF6] accent-[#8B5CF6]"
                    />
                    <span className="text-sm font-semibold text-white">CHoCH (Change of Character)</span>
                  </label>

                  <label className="flex items-center gap-3 p-3.5 rounded-xl border border-[#181920] bg-[#0E0F14] cursor-pointer hover:border-[#8B5CF6]/50 transition-colors">
                    <input
                      type="checkbox"
                      checked={priceActionConfirmation}
                      onChange={(e) => setPriceActionConfirmation(e.target.checked)}
                      className="h-4 w-4 rounded border-[#272932] bg-[#15161E] text-[#8B5CF6] accent-[#8B5CF6]"
                    />
                    <span className="text-sm font-semibold text-white">Price Action Confirmation</span>
                  </label>

                  <label className="flex items-center gap-3 p-3.5 rounded-xl border border-[#181920] bg-[#0E0F14] cursor-pointer hover:border-[#8B5CF6]/50 transition-colors">
                    <input
                      type="checkbox"
                      checked={candleConfirmation}
                      onChange={(e) => setCandleConfirmation(e.target.checked)}
                      className="h-4 w-4 rounded border-[#272932] bg-[#15161E] text-[#8B5CF6] accent-[#8B5CF6]"
                    />
                    <span className="text-sm font-semibold text-white">Candle Confirmation</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#8E95A2] mb-1.5">
                  Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 1m CHoCH after sweep of London high into 15m supply..."
                  value={setupNotes}
                  onChange={(e) => setSetupNotes(e.target.value)}
                  className="w-full rounded-xl border border-[#181920] bg-[#0E0F14] px-3.5 py-2.5 text-sm text-white focus:border-[#8B5CF6] focus:outline-none placeholder-[#525866]"
                />
              </div>
            </div>
          )}

          {/* STEP 6: ENTRY / RISK */}
          {currentStep === 6 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#8E95A2] mb-1.5">
                    Entry Price
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 2518.50"
                    value={entryPrice}
                    onChange={(e) => setEntryPrice(e.target.value)}
                    className="w-full rounded-xl border border-[#181920] bg-[#0E0F14] px-3.5 py-2.5 text-base font-mono-num font-semibold text-white focus:border-[#8B5CF6] focus:outline-none placeholder-[#525866]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-rose-400 mb-1.5">
                    Stop Loss (SL)
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 2523.50"
                    value={stopLoss}
                    onChange={(e) => setStopLoss(e.target.value)}
                    className="w-full rounded-xl border border-[#181920] bg-[#0E0F14] px-3.5 py-2.5 text-base font-mono-num font-semibold text-rose-300 focus:border-rose-500 focus:outline-none placeholder-[#525866]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-1.5">
                    Take Profit (TP)
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 2508.50"
                    value={takeProfit}
                    onChange={(e) => setTakeProfit(e.target.value)}
                    className="w-full rounded-xl border border-[#181920] bg-[#0E0F14] px-3.5 py-2.5 text-base font-mono-num font-semibold text-emerald-300 focus:border-emerald-500 focus:outline-none placeholder-[#525866]"
                  />
                </div>
              </div>

              {/* Auto Calculated Risk / Reward Card */}
              <div className="rounded-xl border border-[#181920] bg-[#0E0F14] p-4.5">
                <div className="grid grid-cols-3 gap-4 text-center divide-x divide-[#181920]">
                  <div>
                    <span className="text-[11px] uppercase tracking-wider text-[#8E95A2] font-medium">Risk</span>
                    <div className="text-base font-bold font-mono-num text-white mt-1">
                      {riskDistance ? riskDistance.toFixed(4).replace(/\.?0+$/, '') : '—'}
                    </div>
                  </div>
                  <div>
                    <span className="text-[11px] uppercase tracking-wider text-[#8E95A2] font-medium">Reward</span>
                    <div className="text-base font-bold font-mono-num text-white mt-1">
                      {rewardDistance ? rewardDistance.toFixed(4).replace(/\.?0+$/, '') : '—'}
                    </div>
                  </div>
                  <div>
                    <span className="text-[11px] uppercase tracking-wider text-[#8E95A2] font-medium">Planned R:R</span>
                    <div className="text-base font-bold font-mono-num text-[#A78BFA] mt-1">
                      {plannedRR ? `1:${plannedRR.toFixed(2)}` : '—'}
                    </div>
                  </div>
                </div>

                {/* R:R Standard Status Feedback */}
                {plannedRR > 0 && (
                  <div className="mt-4 pt-3 border-t border-[#181920] flex items-center justify-between">
                    {meetsStandardRR ? (
                      <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                        <Check className="h-4 w-4" />
                        <span>✓ Meets 1:2 standard</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
                        <AlertTriangle className="h-4 w-4" />
                        <span>⚠ Below 1:2 standard</span>
                      </div>
                    )}
                    <span className="text-[11px] text-[#8E95A2]">Target: min 1:2</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 7: SCREENSHOT */}
          {currentStep === 7 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <p className="text-xs text-[#8E95A2]">
                Upload chart screenshots before and after execution.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Before Trade Screenshot */}
                <div className="rounded-xl border border-[#181920] bg-[#0E0F14] p-4 flex flex-col items-center justify-center text-center relative overflow-hidden">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#A78BFA] mb-2">
                    Before Execution
                  </span>

                  {beforeScreenshot ? (
                    <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-[#181920]">
                      <img src={beforeScreenshot} alt="Before trade" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setBeforeScreenshot('')}
                        className="absolute top-1.5 right-1.5 bg-black/70 hover:bg-black p-1 rounded-full text-white cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full aspect-video border-2 border-dashed border-[#181920] hover:border-[#8B5CF6]/50 rounded-lg cursor-pointer bg-[#15161E]/40 transition-colors p-4">
                      <Camera className="h-7 w-7 text-[#A78BFA] mb-2" />
                      <span className="text-xs font-medium text-white">Upload setup chart</span>
                      <span className="text-[10px] text-[#8E95A2] mt-1">PNG, JPG, or WEBP</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={(e) => handleImageUpload(e, 'before')}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                {/* After Trade Screenshot */}
                <div className="rounded-xl border border-[#181920] bg-[#0E0F14] p-4 flex flex-col items-center justify-center text-center relative overflow-hidden">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#8E95A2] mb-2">
                    After Execution
                  </span>

                  {afterScreenshot ? (
                    <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-[#181920]">
                      <img src={afterScreenshot} alt="After trade" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setAfterScreenshot('')}
                        className="absolute top-1.5 right-1.5 bg-black/70 hover:bg-black p-1 rounded-full text-white cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full aspect-video border-2 border-dashed border-[#181920] hover:border-[#8B5CF6]/50 rounded-lg cursor-pointer bg-[#15161E]/40 transition-colors p-4">
                      <Upload className="h-7 w-7 text-[#8E95A2] mb-2" />
                      <span className="text-xs font-medium text-white">Upload outcome chart</span>
                      <span className="text-[10px] text-[#8E95A2] mt-1">Optional for open trades</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={(e) => handleImageUpload(e, 'after')}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 8: EXECUTION / DISCIPLINE */}
          {currentStep === 8 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#A78BFA] mb-2">
                  Did you follow your plan?
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFollowedPlan(true)}
                    className={`py-3.5 rounded-xl text-sm font-bold border transition-all cursor-pointer ${
                      followedPlan
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500 shadow-md shadow-emerald-500/10'
                        : 'bg-[#0E0F14] text-[#8E95A2] border-[#181920] hover:bg-[#15161E]'
                    }`}
                  >
                    Followed Plan
                  </button>
                  <button
                    type="button"
                    onClick={() => setFollowedPlan(false)}
                    className={`py-3.5 rounded-xl text-sm font-bold border transition-all cursor-pointer ${
                      !followedPlan
                        ? 'bg-rose-500/20 text-rose-400 border-rose-500 shadow-md shadow-rose-500/10'
                        : 'bg-[#0E0F14] text-[#8E95A2] border-[#181920] hover:bg-[#15161E]'
                    }`}
                  >
                    Broke Rules
                  </button>
                </div>
              </div>

              {/* Quick Select Mistakes Chips */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#8E95A2] mb-2">
                  Rule Breaks &amp; Mistakes
                </label>
                <div className="flex flex-wrap gap-2">
                  {COMMON_MISTAKES.map((m) => {
                    const isSelected = mistakes.includes(m);
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => toggleMistake(m)}
                        className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500'
                            : 'bg-[#0E0F14] text-[#8E95A2] border-[#181920] hover:bg-[#15161E] hover:text-white'
                        }`}
                      >
                        {isSelected ? '✕ ' : '+ '}
                        {m}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#8E95A2] mb-1.5">
                  Notes / Lessons (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Waited for 1m confirmation, held to target."
                  value={lesson}
                  onChange={(e) => setLesson(e.target.value)}
                  className="w-full rounded-xl border border-[#181920] bg-[#0E0F14] px-3.5 py-2.5 text-sm text-white focus:border-[#8B5CF6] focus:outline-none placeholder-[#525866]"
                />
              </div>
            </div>
          )}

          {/* STEP 9: RESULT & FINAL REVIEW */}
          {currentStep === 9 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#8E95A2] mb-2">
                  Outcome
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['TP HIT', 'SL HIT', 'BREAKEVEN', 'MANUAL CLOSE'] as TradeResult[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setResult(r)}
                      className={`py-3 px-3 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${
                        result === r
                          ? r === 'TP HIT'
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500'
                            : r === 'SL HIT'
                            ? 'bg-rose-500/20 text-rose-400 border-rose-500'
                            : 'bg-[#8B5CF6]/20 text-[#A78BFA] border-[#8B5CF6]'
                          : 'bg-[#0E0F14] text-[#8E95A2] border-[#181920] hover:bg-[#15161E] hover:text-white'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#8E95A2] mb-1.5">
                    Exit Price (Optional)
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="Auto-calculates R"
                    value={exitPrice}
                    onChange={(e) => setExitPrice(e.target.value)}
                    className="w-full rounded-xl border border-[#181920] bg-[#0E0F14] px-3.5 py-2.5 text-sm font-mono-num text-white focus:border-[#8B5CF6] focus:outline-none placeholder-[#525866]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#A78BFA] mb-1.5">
                    Actual Return (R)
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder={calculatedActualR.toFixed(2)}
                    value={manualR}
                    onChange={(e) => setManualR(e.target.value)}
                    className="w-full rounded-xl border border-[#181920] bg-[#0E0F14] px-3.5 py-2.5 text-sm font-mono-num font-bold text-white focus:border-[#8B5CF6] focus:outline-none placeholder-[#525866]"
                  />
                  <span className="text-[10px] text-[#8E95A2] mt-1 block">
                    Calculated: {calculatedActualR > 0 ? '+' : ''}{calculatedActualR.toFixed(2)}R
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#8E95A2] mb-1.5">
                    Currency &amp; P&amp;L
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                      className="rounded-xl border border-[#181920] bg-[#0E0F14] px-2.5 py-2 text-xs font-semibold text-white focus:border-[#8B5CF6]"
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                      <option value="INR">INR</option>
                      <option value="CAD">CAD</option>
                      <option value="AUD">AUD</option>
                      <option value="JPY">JPY</option>
                    </select>
                    <input
                      type="number"
                      step="any"
                      placeholder="P&L"
                      value={manualPnl}
                      onChange={(e) => setManualPnl(e.target.value)}
                      className="w-full rounded-xl border border-[#181920] bg-[#0E0F14] px-3 py-2 text-sm font-mono-num text-white focus:border-[#8B5CF6] placeholder-[#525866]"
                    />
                  </div>
                </div>
              </div>

              {/* Compact Summary Card before saving */}
              <div className="rounded-xl border border-[#181920] bg-[#0E0F14] p-4 text-xs space-y-3">
                <div className="flex items-center justify-between border-b border-[#181920] pb-2">
                  <span className="font-semibold text-[#8E95A2] uppercase">Summary</span>
                  <span className="px-2 py-0.5 rounded font-mono-num font-bold bg-[#8B5CF6]/20 text-[#A78BFA] border border-[#8B5CF6]/30">
                    Grade {setupGrade}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[#CBD5E1]">
                  <div>
                    <span className="text-[#8E95A2] block text-[10px]">Trade</span>
                    <span className="font-bold text-white">{pair}</span> •{' '}
                    <span className={direction === 'BUY' ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                      {direction}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#8E95A2] block text-[10px]">Session / Source</span>
                    <span>{session}</span> ({source})
                  </div>
                  <div>
                    <span className="text-[#8E95A2] block text-[10px]">Confluence Factors</span>
                    <span className="font-bold text-[#A78BFA]">{confluence.score} factors</span>
                  </div>
                  <div>
                    <span className="text-[#8E95A2] block text-[10px]">Planned R:R</span>
                    <span className="font-mono-num font-bold text-white">1:{plannedRR.toFixed(2) || '2.0'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-[#181920] text-[#CBD5E1]">
                  <div>
                    <span className="text-[#8E95A2] block text-[10px]">Entry Price</span>
                    <span className="font-mono-num text-white">{entryPrice || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[#8E95A2] block text-[10px]">Stop Loss</span>
                    <span className="font-mono-num text-rose-300">{stopLoss || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[#8E95A2] block text-[10px]">Take Profit</span>
                    <span className="font-mono-num text-emerald-300">{takeProfit || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[#8E95A2] block text-[10px]">Plan Discipline</span>
                    <span className={mistakes.length > 0 || !followedPlan ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                      {mistakes.length > 0 || !followedPlan ? 'Broken ✕' : 'Followed ✓'}
                    </span>
                  </div>
                </div>

                {/* Outcome preview row */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-[#181920]">
                  <div>
                    <span className="text-[#8E95A2] block text-[10px]">Outcome</span>
                    <span className={`font-bold text-xs ${result === 'TP HIT' ? 'text-emerald-400' : result === 'SL HIT' ? 'text-rose-400' : 'text-[#A78BFA]'}`}>
                      {result}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#8E95A2] block text-[10px]">Actual R</span>
                    <span className={`font-mono-num font-bold text-xs ${calculatedActualR > 0 ? 'text-emerald-400' : calculatedActualR < 0 ? 'text-rose-400' : 'text-gray-400'}`}>
                      {calculatedActualR > 0 ? '+' : ''}{calculatedActualR.toFixed(2)}R
                    </span>
                  </div>
                  <div>
                    <span className="text-[#8E95A2] block text-[10px]">Est. P&amp;L ({currency})</span>
                    <span className={`font-mono-num font-bold text-xs ${calculatedActualR > 0 ? 'text-emerald-400' : calculatedActualR < 0 ? 'text-rose-400' : 'text-gray-400'}`}>
                      {manualPnl !== ''
                        ? `${parseFloat(manualPnl) >= 0 ? '+' : ''}${parseFloat(manualPnl).toFixed(2)}`
                        : `${calculatedActualR >= 0 ? '+' : ''}${(calculatedActualR * riskAmount).toFixed(2)}`}
                      {' '}{currencySymbol(currency)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Wizard Navigation Footer Bar */}
          <div className="mt-8 pt-5 border-t border-[#181920] flex items-center justify-between gap-3">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={() => setCurrentStep(currentStep - 1)}
                className="flex items-center gap-2 rounded-xl bg-[#0E0F14] hover:bg-[#15161E] border border-[#181920] px-4 py-2.5 text-xs font-semibold text-[#8E95A2] hover:text-white transition-all cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
            ) : (
              <button
                type="button"
                onClick={onCancel}
                className="rounded-xl bg-[#0E0F14] hover:bg-[#15161E] border border-[#181920] px-4 py-2.5 text-xs font-semibold text-[#8E95A2] hover:text-white transition-all cursor-pointer"
              >
                Cancel
              </button>
            )}

            {currentStep < totalSteps ? (
              <button
                type="button"
                onClick={() => setCurrentStep(currentStep + 1)}
                className="flex items-center gap-2 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] px-5 py-2.5 text-xs font-bold text-white transition-all shadow-[0_0_15px_rgba(139,92,246,0.35)] ml-auto cursor-pointer"
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSaveTrade}
                className="flex items-center gap-2 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] px-6 py-2.5 text-sm font-bold text-white transition-all shadow-[0_0_20px_rgba(139,92,246,0.45)] ml-auto cursor-pointer"
              >
                <Check className="h-4 w-4" />
                Save Trade
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

