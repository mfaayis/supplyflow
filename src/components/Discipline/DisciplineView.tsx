import React, { useState, useMemo } from 'react';
import { TradeRecord, UserSettings } from '../../types';
import { calculatePerformanceStats } from '../../utils/calculations';
import { tradeRepository } from '../../services/tradeRepository';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Plus,
  Info,
  AlertTriangle,
} from 'lucide-react';

interface DisciplineViewProps {
  trades: TradeRecord[];
  userSettings: UserSettings;
  onNewTrade?: () => void;
  onNavigateHome?: () => void;
  onRefreshData?: () => void;
}

type TimeRangeFilter = '12m' | '6m' | '30d' | '7d' | '24h';

export const DisciplineView: React.FC<DisciplineViewProps> = ({
  trades,
  userSettings,
  onNewTrade,
  onNavigateHome,
  onRefreshData,
}) => {
  const [timeRange, setTimeRange] = useState<TimeRangeFilter>('12m');
  const [showRealOnly, setShowRealOnly] = useState(false);

  // Check if current dataset has demo trades
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

  // Trades following rules vs trades breaking rules
  const followedTrades = useMemo(
    () => closedTrades.filter((t) => t.followedPlan),
    [closedTrades]
  );
  const brokenTrades = useMemo(
    () => closedTrades.filter((t) => !t.followedPlan),
    [closedTrades]
  );

  const followedStats = useMemo(
    () => calculatePerformanceStats(followedTrades, userSettings.accountCurrency),
    [followedTrades, userSettings.accountCurrency]
  );
  const brokenStats = useMemo(
    () => calculatePerformanceStats(brokenTrades, userSettings.accountCurrency),
    [brokenTrades, userSettings.accountCurrency]
  );

  const totalClosedCount = closedTrades.length;
  const followedPercent =
    totalClosedCount > 0
      ? Number(((followedTrades.length / totalClosedCount) * 100).toFixed(1))
      : 100;
  const brokenPercent =
    totalClosedCount > 0
      ? Number(((brokenTrades.length / totalClosedCount) * 100).toFixed(1))
      : 0;

  const totalNetR = useMemo(() => {
    return filteredTrades.reduce((acc, t) => acc + (t.actualR || 0), 0);
  }, [filteredTrades]);

  // Mistake breakdown counts
  const mistakeCounts = useMemo(() => {
    const counts: Record<string, { count: number; totalR: number }> = {};
    closedTrades.forEach((t) => {
      if (t.mistakes && t.mistakes.length > 0) {
        t.mistakes.forEach((m) => {
          if (!counts[m]) counts[m] = { count: 0, totalR: 0 };
          counts[m].count++;
          counts[m].totalR += t.actualR || 0;
        });
      }
    });

    return Object.entries(counts)
      .map(([mistake, data]) => ({
        mistake,
        count: data.count,
        totalR: data.totalR,
        avgR: data.count > 0 ? data.totalR / data.count : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [closedTrades]);

  const timeRangePills: { id: TimeRangeFilter; label: string }[] = [
    { id: '12m', label: '12 months' },
    { id: '6m', label: '6 months' },
    { id: '30d', label: '30 days' },
    { id: '7d', label: '7 days' },
    { id: '24h', label: '24 hours' },
  ];

  const handleToggleDemoData = () => {
    setShowRealOnly(!showRealOnly);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Demo Data Notification Banner */}
      {hasDemoTrades && !showRealOnly && (
        <div className="rounded-xl border border-[#2D2254] bg-[#0E0F1E] px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-[#C4B5FD]">
            <Info className="h-4 w-4 text-[#A78BFA] shrink-0" />
            <span>
              <strong className="text-white font-bold tracking-wide">DEMO DATA:</strong> You are
              viewing {demoTradesCount} sample Supply &amp; Demand trades (
              {totalNetR >= 0 ? `+${totalNetR.toFixed(1)}R` : `${totalNetR.toFixed(1)}R`}). Real
              performance is never mixed with demo data.
            </span>
          </div>
          <button
            onClick={handleToggleDemoData}
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
              Viewing <strong className="text-white">{filteredTrades.length}</strong> real trade records.
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
        <span className="text-[#8E95A2]">Audit</span>
        <span className="text-[#525866]">&gt;</span>
        <span className="text-white font-medium">Discipline &amp; Cost</span>
      </div>

      {/* Header Bar with Title, Subtitle, Time Filter Pills, and New Trade Button */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Discipline Audit
          </h1>
          <p className="text-xs sm:text-sm text-[#8E95A2] mt-1">
            Measure the direct R-cost of rule violations vs plan adherence.
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

      {/* Hero Section: The Empirical Cost of Discipline */}
      <div className="rounded-2xl border border-[#181920] bg-[#0A0B0E] p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold tracking-wider text-[#A78BFA] uppercase">
            <Shield className="h-3.5 w-3.5 text-[#8B5CF6]" />
            <span>THE EMPIRICAL COST OF DISCIPLINE</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            How much performance is lost to rule violations?
          </h2>

          <p className="text-xs sm:text-sm text-[#8E95A2] max-w-3xl leading-relaxed">
            Trading consistency is rarely a strategy problem — it is an execution audit. This
            calculation measures your exact mathematical profit if you took zero impulsive setups.
          </p>
        </div>

        {/* Two Comparison Sub-Boxes inside Hero */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* Rules Followed Card */}
          <div className="rounded-xl border border-emerald-950/70 bg-[#07130E]/60 p-5 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-400">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>Rules Followed</span>
            </div>

            <div className="text-3xl sm:text-4xl font-bold font-mono tracking-tight text-white">
              {followedStats.totalR >= 0
                ? `+${followedStats.totalR.toFixed(1).replace(/\.0$/, '')}R`
                : `${followedStats.totalR.toFixed(1).replace(/\.0$/, '')}R`}
            </div>

            <div className="text-xs text-[#8E95A2] font-mono-num pt-0.5">
              {followedTrades.length} trades · {followedStats.winRate}% Win Rate ·{' '}
              {followedStats.expectancy >= 0
                ? `+${followedStats.expectancy.toFixed(2)}R`
                : `${followedStats.expectancy.toFixed(2)}R`}{' '}
              Expectancy
            </div>
          </div>

          {/* Rule Violations Card */}
          <div className="rounded-xl border border-rose-950/70 bg-[#16080A]/60 p-5 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-rose-400">
              <XCircle className="h-4 w-4 text-rose-400" />
              <span>Rule Violations</span>
            </div>

            <div className="text-3xl sm:text-4xl font-bold font-mono tracking-tight text-[#F43F5E]">
              {brokenStats.totalR >= 0
                ? `+${brokenStats.totalR.toFixed(1).replace(/\.0$/, '')}R`
                : `${brokenStats.totalR.toFixed(1).replace(/\.0$/, '')}R`}
            </div>

            <div className="text-xs text-[#8E95A2] font-mono-num pt-0.5">
              {brokenTrades.length} trades · {brokenStats.winRate}% Win Rate ·{' '}
              {brokenStats.expectancy >= 0
                ? `+${brokenStats.expectancy.toFixed(2)}R`
                : `${brokenStats.expectancy.toFixed(2)}R`}{' '}
              Expectancy
            </div>
          </div>
        </div>
      </div>

      {/* Side-by-Side Detailed Execution Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* Left: Execution When Following Strategy */}
        <div className="rounded-2xl border border-[#181920] bg-[#0A0B0E] p-6 space-y-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Execution When Following Strategy</span>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-950/50 text-emerald-400 border border-emerald-800/40">
              {followedPercent}% of Trades
            </span>
          </div>

          {/* 3 Metric Boxes */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-[#181920] bg-[#0E0F14] p-3 text-center">
              <span className="text-[10px] uppercase font-semibold text-[#8E95A2] block">
                Trades
              </span>
              <span className="text-lg sm:text-xl font-bold font-mono-num text-white mt-1 block">
                {followedTrades.length}
              </span>
            </div>

            <div className="rounded-xl border border-[#181920] bg-[#0E0F14] p-3 text-center">
              <span className="text-[10px] uppercase font-semibold text-[#8E95A2] block">
                Win Rate
              </span>
              <span className="text-lg sm:text-xl font-bold font-mono-num text-emerald-400 mt-1 block">
                {followedStats.winRate}%
              </span>
            </div>

            <div className="rounded-xl border border-[#181920] bg-[#0E0F14] p-3 text-center">
              <span className="text-[10px] uppercase font-semibold text-[#8E95A2] block">
                Expectancy
              </span>
              <span className="text-lg sm:text-xl font-bold font-mono-num text-emerald-400 mt-1 block">
                {followedStats.expectancy >= 0
                  ? `+${followedStats.expectancy.toFixed(2)}R`
                  : `${followedStats.expectancy.toFixed(2)}R`}
              </span>
            </div>
          </div>

          {/* Descriptive Edge Takeaway Note */}
          <p className="text-xs text-[#8E95A2] leading-relaxed pt-1">
            <span className="text-emerald-400 font-bold mr-1.5">✓</span>
            Clear edge proven when executing 15M/5M/1M supply/demand zones with top-down alignment during the New York session.
          </p>
        </div>

        {/* Right: Execution With Rule Deviations */}
        <div className="rounded-2xl border border-[#181920] bg-[#0A0B0E] p-6 space-y-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <ShieldAlert className="h-4 w-4 text-rose-400 shrink-0" />
              <span>Execution With Rule Deviations</span>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-rose-950/50 text-rose-400 border border-rose-800/40">
              {brokenPercent}% of Trades
            </span>
          </div>

          {/* 3 Metric Boxes */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-[#181920] bg-[#0E0F14] p-3 text-center">
              <span className="text-[10px] uppercase font-semibold text-[#8E95A2] block">
                Trades
              </span>
              <span className="text-lg sm:text-xl font-bold font-mono-num text-white mt-1 block">
                {brokenTrades.length}
              </span>
            </div>

            <div className="rounded-xl border border-[#181920] bg-[#0E0F14] p-3 text-center">
              <span className="text-[10px] uppercase font-semibold text-[#8E95A2] block">
                Win Rate
              </span>
              <span className="text-lg sm:text-xl font-bold font-mono-num text-rose-400 mt-1 block">
                {brokenStats.winRate}%
              </span>
            </div>

            <div className="rounded-xl border border-[#181920] bg-[#0E0F14] p-3 text-center">
              <span className="text-[10px] uppercase font-semibold text-[#8E95A2] block">
                Expectancy
              </span>
              <span className="text-lg sm:text-xl font-bold font-mono-num text-rose-400 mt-1 block">
                {brokenStats.expectancy >= 0
                  ? `+${brokenStats.expectancy.toFixed(2)}R`
                  : `${brokenStats.expectancy.toFixed(2)}R`}
              </span>
            </div>
          </div>

          {/* Descriptive Deviation Takeaway Note */}
          <p className="text-xs text-[#8E95A2] leading-relaxed pt-1">
            <span className="text-rose-400 font-bold mr-1.5">✕</span>
            Every deviation from the checklist (FOMO, widening stops, entering outside session) carries a negative statistical expectancy.
          </p>
        </div>
      </div>

      {/* Mistake Breakdown Table */}
      {mistakeCounts.length > 0 && (
        <div className="rounded-2xl border border-[#181920] bg-[#0A0B0E] p-6 space-y-4 shadow-sm">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">
              Mistake Breakdown
            </h3>
            <p className="text-xs text-[#8E95A2] mt-0.5">
              Logged mistakes and their empirical P&amp;L impact on performance.
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#181920] bg-[#0E0F14]">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#181920] bg-[#0D0E12] text-[10px] uppercase font-bold tracking-wider text-[#656B77]">
                  <th className="py-3 px-4">Mistake</th>
                  <th className="py-3 px-3">Trades</th>
                  <th className="py-3 px-3">Total Return (R)</th>
                  <th className="py-3 px-3">Avg Return / Trade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#181920]">
                {mistakeCounts.map((m) => (
                  <tr key={m.mistake} className="hover:bg-[#111217] transition-colors">
                    <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                      <AlertTriangle className="h-3.5 w-3.5 text-[#F87171] shrink-0" />
                      <span>{m.mistake}</span>
                    </td>
                    <td className="py-3 px-3 font-mono-num text-[#8E95A2]">{m.count}</td>
                    <td
                      className={`py-3 px-3 font-mono-num font-bold ${
                        m.totalR >= 0 ? 'text-[#34D399]' : 'text-[#F87171]'
                      }`}
                    >
                      {m.totalR >= 0 ? `+${m.totalR.toFixed(2)}R` : `${m.totalR.toFixed(2)}R`}
                    </td>
                    <td className="py-3 px-3 font-mono-num text-[#F87171]">
                      {m.avgR >= 0 ? `+${m.avgR.toFixed(2)}R` : `${m.avgR.toFixed(2)}R`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
