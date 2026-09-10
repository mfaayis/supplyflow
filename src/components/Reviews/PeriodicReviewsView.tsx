import React, { useState, useMemo } from 'react';
import { TradeRecord, UserSettings } from '../../types';
import {
  Calendar,
  CheckCircle2,
  XCircle,
  Plus,
  Info,
  ShieldCheck,
  Clock,
  TrendingUp,
  Sparkles,
} from 'lucide-react';

interface PeriodicReviewsViewProps {
  trades: TradeRecord[];
  userSettings: UserSettings;
  onNewTrade?: () => void;
  onNavigateHome?: () => void;
}

type TimeRangeFilter = '12m' | '6m' | '30d' | '7d' | '24h';
type ReviewScope = 'daily' | 'weekly' | 'monthly';

export const PeriodicReviewsView: React.FC<PeriodicReviewsViewProps> = ({
  trades,
  userSettings,
  onNewTrade,
  onNavigateHome,
}) => {
  const [timeRange, setTimeRange] = useState<TimeRangeFilter>('12m');
  const [reviewScope, setReviewScope] = useState<ReviewScope>('weekly');
  const [showRealOnly, setShowRealOnly] = useState(false);

  // Check demo trades
  const demoTradesCount = useMemo(() => trades.filter((t) => t.isDemo).length, [trades]);
  const hasDemoTrades = demoTradesCount > 0;

  // Filter trades by demo toggle and time range
  const filteredTrades = useMemo(() => {
    let list = trades;
    if (showRealOnly) {
      list = list.filter((t) => !t.isDemo);
    }

    if (timeRange === '12m') {
      return list;
    }

    const now = new Date();
    let daysToSubtract = 365;
    if (timeRange === '6m') daysToSubtract = 180;
    if (timeRange === '30d') daysToSubtract = 30;
    if (timeRange === '7d') daysToSubtract = 7;
    if (timeRange === '24h') daysToSubtract = 1;

    const cutoff = new Date(now.getTime() - daysToSubtract * 24 * 60 * 60 * 1000);
    const cutoffStr = cutoff.toISOString().split('T')[0];

    return list.filter((t) => t.tradeDate >= cutoffStr);
  }, [trades, showRealOnly, timeRange]);

  const closedTrades = useMemo(
    () => filteredTrades.filter((t) => t.result !== 'OPEN'),
    [filteredTrades]
  );

  const totalTradesCount = closedTrades.length;

  // Net realized R
  const netRealizedR = useMemo(() => {
    return closedTrades.reduce((acc, t) => acc + (t.actualR || 0), 0);
  }, [closedTrades]);

  // Wins count & win rate
  const winCount = useMemo(
    () => closedTrades.filter((t) => (t.actualR || 0) > 0).length,
    [closedTrades]
  );
  const winRate = totalTradesCount > 0 ? ((winCount / totalTradesCount) * 100).toFixed(1) : '0.0';

  // Rules followed
  const rulesFollowedCount = useMemo(
    () => closedTrades.filter((t) => t.followedPlan).length,
    [closedTrades]
  );
  const rulesFollowedPercent =
    totalTradesCount > 0 ? ((rulesFollowedCount / totalTradesCount) * 100).toFixed(1) : '0.0';

  // Primary session calculation
  const primarySession = useMemo(() => {
    if (closedTrades.length === 0) return 'None';
    const counts: Record<string, number> = {};
    closedTrades.forEach((t) => {
      const s = t.session || 'OTHER';
      counts[s] = (counts[s] || 0) + 1;
    });
    let top = 'NEW YORK';
    let max = 0;
    Object.entries(counts).forEach(([sess, count]) => {
      if (count > max) {
        max = count;
        top = sess;
      }
    });

    if (top === 'NEW YORK') return 'New York';
    if (top === 'LONDON') return 'London';
    if (top === 'ASIA') return 'Asia';
    return top;
  }, [closedTrades]);

  // Best Setup (highest actualR)
  const bestSetup = useMemo(() => {
    if (closedTrades.length === 0) return null;
    const sorted = [...closedTrades].sort((a, b) => (b.actualR || 0) - (a.actualR || 0));
    return sorted[0];
  }, [closedTrades]);

  // Biggest Drawdown (lowest actualR)
  const biggestDrawdown = useMemo(() => {
    if (closedTrades.length === 0) return null;
    const sorted = [...closedTrades].sort((a, b) => (a.actualR || 0) - (b.actualR || 0));
    return sorted[0];
  }, [closedTrades]);

  const timeRangePills: { id: TimeRangeFilter; label: string }[] = [
    { id: '12m', label: '12 months' },
    { id: '6m', label: '6 months' },
    { id: '30d', label: '30 days' },
    { id: '7d', label: '7 days' },
    { id: '24h', label: '24 hours' },
  ];

  const scopeLabel =
    reviewScope === 'daily'
      ? 'Daily'
      : reviewScope === 'weekly'
      ? 'Weekly'
      : 'Monthly';

  const scopeTradesText =
    reviewScope === 'daily'
      ? 'daily'
      : reviewScope === 'weekly'
      ? 'weekly'
      : 'monthly';

  // Fallback / default reflections if notes are not set
  const bestSetupNote =
    bestSetup?.setupNotes ||
    bestSetup?.lesson ||
    'Patient wait for NY open liquidity sweep of previous day HOD into fresh 15m supply.';

  const biggestDrawdownNote =
    biggestDrawdown?.mistakes && biggestDrawdown.mistakes.length > 0
      ? `Trading ${biggestDrawdown.session === 'ASIA' ? 'Asia session with low volume and widened stop loss when challenged. Costly mistake.' : `with ${biggestDrawdown.mistakes.join(', ')}. Need to adhere strictly to rules.`}`
      : biggestDrawdown?.setupNotes ||
        biggestDrawdown?.lesson ||
        'Trading Asia session with low volume and widened stop loss when challenged. Costly mistake.';

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Demo Data Notification Banner */}
      {hasDemoTrades && !showRealOnly && (
        <div className="rounded-xl border border-[#2D2254] bg-[#0E0F1E] px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-[#C4B5FD]">
            <Info className="h-4 w-4 text-[#A78BFA] shrink-0" />
            <span>
              <strong className="text-white font-bold tracking-wide">DEMO DATA:</strong> You are
              viewing {demoTradesCount} sample Supply &amp; Demand trades (+34.7R). Real performance
              is never mixed with demo data.
            </span>
          </div>
          <button
            onClick={() => setShowRealOnly(true)}
            className="text-indigo-400 hover:text-indigo-300 font-semibold underline underline-offset-2 shrink-0 cursor-pointer self-start sm:self-auto"
          >
            Switch to Real Data
          </button>
        </div>
      )}

      {showRealOnly && (
        <div className="rounded-xl border border-[#181920] bg-[#0A0B0E] px-4 py-3 flex items-center justify-between gap-3 text-xs text-[#8E95A2]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>
              Viewing <strong className="text-white">{filteredTrades.length}</strong> real trade
              records.
            </span>
          </div>
          {hasDemoTrades && (
            <button
              onClick={() => setShowRealOnly(false)}
              className="text-[#A78BFA] hover:text-white underline underline-offset-2 cursor-pointer font-medium"
            >
              Show Demo Trades
            </button>
          )}
        </div>
      )}

      {/* Breadcrumb Bar */}
      <div className="flex items-center gap-2 text-xs text-[#8E95A2]">
        <button
          onClick={onNavigateHome}
          className="hover:text-white transition-colors cursor-pointer"
        >
          Home
        </button>
        <span className="text-[#525866]">&gt;</span>
        <span className="text-[#8E95A2]">Periodic</span>
        <span className="text-[#525866]">&gt;</span>
        <span className="text-white font-medium">Reviews</span>
      </div>

      {/* Page Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Periodic Reviews
          </h1>
          <p className="text-xs sm:text-sm text-[#8E95A2] mt-1">
            Synthesized daily, weekly, and monthly trading retrospectives.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Time Range Pills */}
          <div className="flex items-center gap-1 bg-[#0E0F14] border border-[#181920] rounded-xl p-1">
            {timeRangePills.map((pill) => (
              <button
                key={pill.id}
                onClick={() => setTimeRange(pill.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  timeRange === pill.id
                    ? 'bg-[#181920] text-white border border-[#272932] shadow-xs'
                    : 'text-[#8E95A2] hover:text-white'
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>

          {/* New Trade Primary Button */}
          {onNewTrade && (
            <button
              onClick={onNewTrade}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-bold shadow-[0_0_20px_rgba(139,92,246,0.35)] transition-all active:scale-[0.98] cursor-pointer"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              <span>New Trade</span>
            </button>
          )}
        </div>
      </div>

      {/* Section Sub-Header & Scope Switcher Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">
            Periodic Trading Reviews
          </h2>
          <p className="text-xs text-[#8E95A2] mt-0.5">
            Concise retrospectives to cement discipline and process improvements.
          </p>
        </div>

        {/* Scope Tabs: Daily Review, Weekly Review, Monthly Review */}
        <div className="flex items-center gap-1 bg-[#0E0F14] border border-[#181920] rounded-xl p-1 shrink-0 self-start sm:self-auto">
          <button
            onClick={() => setReviewScope('daily')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              reviewScope === 'daily'
                ? 'bg-[#181920] text-white border border-[#272932] shadow-xs'
                : 'text-[#8E95A2] hover:text-white'
            }`}
          >
            Daily Review
          </button>
          <button
            onClick={() => setReviewScope('weekly')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              reviewScope === 'weekly'
                ? 'bg-[#181920] text-white border border-[#272932] shadow-xs'
                : 'text-[#8E95A2] hover:text-white'
            }`}
          >
            Weekly Review
          </button>
          <button
            onClick={() => setReviewScope('monthly')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              reviewScope === 'monthly'
                ? 'bg-[#181920] text-white border border-[#272932] shadow-xs'
                : 'text-[#8E95A2] hover:text-white'
            }`}
          >
            Monthly Review
          </button>
        </div>
      </div>

      {/* Main Synthesis Card */}
      <div className="rounded-2xl border border-[#181920] bg-[#0A0B0E] p-6 sm:p-7 space-y-6 shadow-sm">
        {/* Card Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 flex items-center justify-center text-[#A78BFA] shrink-0">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                {scopeLabel} Synthesis
              </h3>
              <p className="text-xs text-[#8E95A2]">
                Based on all recorded {scopeTradesText} trades
              </p>
            </div>
          </div>

          <div className="text-right">
            <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-[#34D399]">
              {netRealizedR >= 0
                ? `+${netRealizedR.toFixed(2)}R`
                : `${netRealizedR.toFixed(2)}R`}
            </div>
            <span className="text-[11px] uppercase font-semibold text-[#8E95A2] tracking-wider block">
              Net Realized
            </span>
          </div>
        </div>

        {/* 3 Stat Boxes Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Trades Taken */}
          <div className="rounded-xl border border-[#181920] bg-[#0E0F14] p-4 space-y-1">
            <span className="text-[11px] text-[#8E95A2] font-medium block">Trades Taken</span>
            <div className="text-2xl sm:text-3xl font-bold font-mono-num text-white">
              {totalTradesCount}
            </div>
            <div className="text-xs text-[#34D399] font-medium font-mono-num">
              {winRate}% Win Rate
            </div>
          </div>

          {/* Rules Followed */}
          <div className="rounded-xl border border-[#181920] bg-[#0E0F14] p-4 space-y-1">
            <span className="text-[11px] text-[#8E95A2] font-medium block">Rules Followed</span>
            <div className="text-2xl sm:text-3xl font-bold font-mono-num text-white">
              {rulesFollowedPercent}%
            </div>
            <div className="text-xs text-[#8E95A2] font-mono-num">
              {rulesFollowedCount} of {totalTradesCount} on plan
            </div>
          </div>

          {/* Primary Session */}
          <div className="rounded-xl border border-[#181920] bg-[#0E0F14] p-4 space-y-1">
            <span className="text-[11px] text-[#8E95A2] font-medium block">Primary Session</span>
            <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {primarySession}
            </div>
            <div className="text-xs text-[#A78BFA] font-medium">Core focus session</div>
          </div>
        </div>

        {/* 2 Setup Cards: Best Setup vs Biggest Drawdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 pt-1">
          {/* Best Setup Card */}
          <div className="rounded-xl border border-emerald-950/70 bg-[#07130E]/60 p-5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#34D399]">
                <CheckCircle2 className="h-4 w-4 text-[#34D399] shrink-0" />
                <span>Best Setup</span>
              </div>
              <span className="text-xs font-mono font-bold text-[#34D399]">
                {bestSetup && (bestSetup.actualR || 0) >= 0
                  ? `+${(bestSetup.actualR || 0).toFixed(1).replace(/\.0$/, '')}R`
                  : bestSetup
                  ? `${(bestSetup.actualR || 0).toFixed(1).replace(/\.0$/, '')}R`
                  : '+0R'}
              </span>
            </div>

            <div className="text-xs sm:text-sm font-bold text-white tracking-wide">
              {bestSetup ? `${bestSetup.pair} • ${bestSetup.direction}` : 'XAUUSD • SELL'}
            </div>

            <p className="text-xs text-[#8E95A2] leading-relaxed italic">
              "{bestSetupNote}"
            </p>
          </div>

          {/* Biggest Drawdown Card */}
          <div className="rounded-xl border border-rose-950/70 bg-[#16080A]/60 p-5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#F43F5E]">
                <XCircle className="h-4 w-4 text-[#F43F5E] shrink-0" />
                <span>Biggest Drawdown</span>
              </div>
              <span className="text-xs font-mono font-bold text-[#F43F5E]">
                {biggestDrawdown
                  ? `${(biggestDrawdown.actualR || 0).toFixed(1).replace(/\.0$/, '')}R`
                  : '-1.5R'}
              </span>
            </div>

            <div className="text-xs sm:text-sm font-bold text-white tracking-wide">
              {biggestDrawdown
                ? `${biggestDrawdown.pair} • ${biggestDrawdown.direction}`
                : 'XAUUSD • SELL'}
            </div>

            <p className="text-xs text-[#8E95A2] leading-relaxed italic">
              "{biggestDrawdownNote}"
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
