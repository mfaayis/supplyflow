import React, { useState, useMemo } from 'react';
import { TradeRecord, UserSettings, TradeFilterCriteria } from '../../types';
import {
  calculatePerformanceStats,
  filterTradesByCriteria,
  getSampleSizeInfo,
} from '../../utils/calculations';
import { AnalyticsFilterBar } from './AnalyticsFilterBar';
import { RollingWinRateChart } from './RollingWinRateChart';
import { PeriodicWinRateChart } from './PeriodicWinRateChart';
import { StrategyResearchView } from './StrategyResearchView';
import {
  TrendingUp,
  BarChart3,
  Layers,
  PieChart,
  Target,
  Sparkles,
  Info,
  Calendar,
  Activity,
  CheckCircle2,
  XCircle,
  MinusCircle,
  HelpCircle,
  Scale,
  ShieldCheck,
} from 'lucide-react';

interface AnalyticsViewProps {
  trades: TradeRecord[];
  userSettings: UserSettings;
}

const initialFilterCriteria: TradeFilterCriteria = {
  pair: 'ALL',
  direction: 'ALL',
  session: 'ALL',
  dateRangePreset: 'ALL',
  zoneType: 'ALL',
  zoneQuality: 'ALL',
  weeklyBias: 'ALL',
  dailyBias: 'ALL',
  h4Bias: 'ALL',
  h1Bias: 'ALL',
  m15Bias: 'ALL',
  m5Bias: 'ALL',
  m1Bias: 'ALL',
  alignedTimeframes: 'ALL',
  hodLodConfluence: 'ANY',
  confirmationType: 'ANY',
  confluenceScoreTier: 'ALL',
  plannedRRMin: 'ALL',
  followedPlan: 'ALL',
  mistakeType: 'ALL',
  setupGrade: 'ALL',
  source: 'ALL',
};

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ trades, userSettings }) => {
  const [filterCriteria, setFilterCriteria] = useState<TradeFilterCriteria>(initialFilterCriteria);
  const [activeMainTab, setActiveMainTab] = useState<'OVERVIEW' | 'ROLLING' | 'PERIODIC' | 'RESEARCH'>(
    'OVERVIEW'
  );

  // Closed trades only
  const allClosedTrades = useMemo(() => trades.filter((t) => t.result !== 'OPEN'), [trades]);

  // Dynamically filtered trades
  const filteredTrades = useMemo(() => {
    return filterTradesByCriteria(allClosedTrades, filterCriteria);
  }, [allClosedTrades, filterCriteria]);

  // Overall performance stats (unfiltered)
  const overallStats = useMemo(
    () => calculatePerformanceStats(allClosedTrades, userSettings.accountCurrency),
    [allClosedTrades, userSettings.accountCurrency]
  );

  // Filtered performance stats
  const activeStats = useMemo(
    () => calculatePerformanceStats(filteredTrades, userSettings.accountCurrency),
    [filteredTrades, userSettings.accountCurrency]
  );

  // Extract unique available pairs
  const availablePairs = useMemo(() => {
    const pairs = new Set<string>();
    trades.forEach((t) => {
      if (t.pair) pairs.add(t.pair);
    });
    return Array.from(pairs).sort();
  }, [trades]);

  // Sample size status info
  const sampleInfo = useMemo(() => {
    return getSampleSizeInfo(activeStats.totalTrades);
  }, [activeStats.totalTrades]);

  const handleResetFilters = () => {
    setFilterCriteria(initialFilterCriteria);
  };

  // R Distribution Histogram Bars for filtered set
  const rDistribution = useMemo(() => {
    const buckets = [
      { label: '≤ -1.0R (Full SL)', count: 0, color: '#EF4444' },
      { label: '-0.9 to -0.1R (Loss)', count: 0, color: '#F87171' },
      { label: '0.0R (Breakeven)', count: 0, color: '#94A3B8' },
      { label: '+0.1 to +1.4R (Partial)', count: 0, color: '#34D399' },
      { label: '+1.5 to +2.0R (Target)', count: 0, color: '#10B981' },
      { label: '> +2.0R (Runner)', count: 0, color: '#A78BFA' },
    ];

    filteredTrades.forEach((t) => {
      const r = t.actualR || 0;
      if (r <= -1.0) buckets[0].count++;
      else if (r < -0.05) buckets[1].count++;
      else if (r <= 0.05) buckets[2].count++;
      else if (r < 1.5) buckets[3].count++;
      else if (r <= 2.05) buckets[4].count++;
      else buckets[5].count++;
    });

    const maxCount = Math.max(...buckets.map((b) => b.count), 1);
    return { buckets, maxCount };
  }, [filteredTrades]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Analytics
          </h1>
          <p className="text-xs sm:text-sm text-[#8E9AA8] mt-0.5">
            Performance breakdown and edge statistics based on your closed trades.
          </p>
        </div>

        {/* Sample Size Badge */}
        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${sampleInfo.reliabilityColor}`}
          >
            <span className="h-2 w-2 rounded-full bg-current"></span>
            {sampleInfo.reliabilityBadge} ({activeStats.totalTrades} trades)
          </span>
        </div>
      </div>

      {/* Sample Size & Statistical Guardrail Banner */}
      <div className="rounded-2xl border border-[#272A34] bg-[#0E0F14] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-start gap-2.5">
          <Info className="h-4 w-4 text-[#A78BFA] shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold text-white">Sample Size:</span>
            <p className="text-[#8E95A2]">
              {sampleInfo.message}
            </p>
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-3 font-mono text-[11px] text-[#656B77]">
          <span>All Trades: <strong className="text-white">{overallStats.winRate}% Win Rate</strong> ({overallStats.totalTrades} trades)</span>
        </div>
      </div>

      {/* Dynamic Cohort & Variable Filters Bar */}
      <AnalyticsFilterBar
        criteria={filterCriteria}
        onChange={setFilterCriteria}
        onReset={handleResetFilters}
        availablePairs={availablePairs}
        totalTradesCount={allClosedTrades.length}
        filteredTradesCount={filteredTrades.length}
      />

      {/* Main KPI Overview Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* 1. Win Rate */}
        <div className="rounded-2xl border border-[#181920] bg-[#0A0B0E] p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#656B77]">
              Win Rate
            </span>
            <CheckCircle2 className="h-3.5 w-3.5 text-[#34D399]" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-mono-num font-bold text-white">
            {activeStats.totalTrades > 0 ? `${activeStats.winRate}%` : '—'}
          </div>
          <span className="text-[10px] text-[#34D399] mt-1 block font-mono">
            {activeStats.winningTrades} profitable {activeStats.winningTrades === 1 ? 'trade' : 'trades'}
          </span>
        </div>

        {/* 2. Loss Rate */}
        <div className="rounded-2xl border border-[#181920] bg-[#0A0B0E] p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#656B77]">
              Loss Rate
            </span>
            <XCircle className="h-3.5 w-3.5 text-[#F87171]" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-mono-num font-bold text-[#F87171]">
            {activeStats.totalTrades > 0 ? `${activeStats.lossRate}%` : '—'}
          </div>
          <span className="text-[10px] text-[#8E95A2] mt-1 block font-mono">
            {activeStats.losingTrades} losing {activeStats.losingTrades === 1 ? 'trade' : 'trades'}
          </span>
        </div>

        {/* 3. Breakevens */}
        <div className="rounded-2xl border border-[#181920] bg-[#0A0B0E] p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#656B77]">
              Breakevens
            </span>
            <MinusCircle className="h-3.5 w-3.5 text-[#94A3B8]" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-mono-num font-bold text-[#94A3B8]">
            {activeStats.breakevenTrades}
          </div>
          <span className="text-[10px] text-[#8E95A2] mt-1 block font-mono">
            {activeStats.totalTrades > 0 ? `${activeStats.breakevenRate}% of sample` : '—'}
          </span>
        </div>

        {/* 4. Expectancy */}
        <div className="rounded-2xl border border-[#181920] bg-[#0A0B0E] p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#656B77]">
              Expectancy
            </span>
            <Scale className="h-3.5 w-3.5 text-[#A78BFA]" />
          </div>
          <div
            className={`mt-2 text-2xl sm:text-3xl font-mono-num font-bold ${
              activeStats.expectancy >= 0 ? 'text-[#A78BFA]' : 'text-[#F87171]'
            }`}
          >
            {activeStats.totalTrades > 0
              ? `${activeStats.expectancy >= 0 ? '+' : ''}${activeStats.expectancy.toFixed(2)}R`
              : '—'}
          </div>
          <span className="text-[10px] text-[#525866] mt-1 block">
            Avg R / trade
          </span>
        </div>

        {/* 5. Profit Factor */}
        <div className="rounded-2xl border border-[#181920] bg-[#0A0B0E] p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#656B77]">
              Profit Factor
            </span>
            <TrendingUp className="h-3.5 w-3.5 text-[#34D399]" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-mono-num font-bold text-white">
            {activeStats.totalTrades > 0 ? activeStats.profitFactor.toFixed(2) : '—'}
          </div>
          <span className="text-[10px] text-[#525866] mt-1 block">
            Gross gains / losses
          </span>
        </div>

        {/* 6. Total Return */}
        <div className="rounded-2xl border border-[#181920] bg-[#0A0B0E] p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#656B77]">
              Total Return
            </span>
            <Target className="h-3.5 w-3.5 text-[#A78BFA]" />
          </div>
          <div
            className={`mt-2 text-2xl sm:text-3xl font-mono-num font-bold ${
              activeStats.totalR >= 0 ? 'text-[#34D399]' : 'text-[#F87171]'
            }`}
          >
            {activeStats.totalTrades > 0
              ? `${activeStats.totalR >= 0 ? '+' : ''}${activeStats.totalR.toFixed(2)}R`
              : '—'}
          </div>
          <span className="text-[10px] text-[#525866] mt-1 block">
            Max Drawdown: -{activeStats.maxDrawdownR.toFixed(2)}R
          </span>
        </div>
      </div>

      {/* Outcome Ratio Bar (Wins vs Losses vs Breakevens) */}
      {activeStats.totalTrades > 0 && (
        <div className="rounded-2xl border border-[#181920] bg-[#0A0B0E] p-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-white">
              Outcome Breakdown ({activeStats.totalTrades} Trades)
            </span>
            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="flex items-center gap-1 text-[#34D399]">
                <span className="h-2 w-2 rounded-full bg-[#34D399]"></span>
                {activeStats.winningTrades} Wins ({activeStats.winRate}%)
              </span>
              <span className="flex items-center gap-1 text-[#F87171]">
                <span className="h-2 w-2 rounded-full bg-[#F87171]"></span>
                {activeStats.losingTrades} Losses ({activeStats.lossRate}%)
              </span>
              <span className="flex items-center gap-1 text-[#94A3B8]">
                <span className="h-2 w-2 rounded-full bg-[#94A3B8]"></span>
                {activeStats.breakevenTrades} Breakevens ({activeStats.breakevenRate}%)
              </span>
            </div>
          </div>

          <div className="h-3 w-full bg-[#0E0F14] rounded-full overflow-hidden flex border border-[#181920]">
            <div
              className="h-full bg-[#34D399] transition-all duration-300"
              style={{ width: `${activeStats.winRate}%` }}
              title={`Wins: ${activeStats.winRate}%`}
            />
            <div
              className="h-full bg-[#F87171] transition-all duration-300"
              style={{ width: `${activeStats.lossRate}%` }}
              title={`Losses: ${activeStats.lossRate}%`}
            />
            <div
              className="h-full bg-[#94A3B8] transition-all duration-300"
              style={{ width: `${activeStats.breakevenRate}%` }}
              title={`Breakevens: ${activeStats.breakevenRate}%`}
            />
          </div>
        </div>
      )}

      {/* Main View Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[#181920] pb-2 text-xs">
        <button
          onClick={() => setActiveMainTab('OVERVIEW')}
          className={`px-4 py-2 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeMainTab === 'OVERVIEW'
              ? 'bg-[#8B5CF6] text-white shadow-[0_0_15px_rgba(139,92,246,0.35)]'
              : 'text-[#8E95A2] hover:text-white bg-[#0A0B0E] border border-[#181920]'
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          R Distribution
        </button>

        <button
          onClick={() => setActiveMainTab('ROLLING')}
          className={`px-4 py-2 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeMainTab === 'ROLLING'
              ? 'bg-[#8B5CF6] text-white shadow-[0_0_15px_rgba(139,92,246,0.35)]'
              : 'text-[#8E95A2] hover:text-white bg-[#0A0B0E] border border-[#181920]'
          }`}
        >
          <Activity className="h-4 w-4" />
          Rolling Win Rate
        </button>

        <button
          onClick={() => setActiveMainTab('PERIODIC')}
          className={`px-4 py-2 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeMainTab === 'PERIODIC'
              ? 'bg-[#8B5CF6] text-white shadow-[0_0_15px_rgba(139,92,246,0.35)]'
              : 'text-[#8E95A2] hover:text-white bg-[#0A0B0E] border border-[#181920]'
          }`}
        >
          <Calendar className="h-4 w-4" />
          Win Rate by Period
        </button>

        <button
          onClick={() => setActiveMainTab('RESEARCH')}
          className={`px-4 py-2 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeMainTab === 'RESEARCH'
              ? 'bg-[#8B5CF6] text-white shadow-[0_0_15px_rgba(139,92,246,0.35)]'
              : 'text-[#8E95A2] hover:text-white bg-[#0A0B0E] border border-[#181920]'
          }`}
        >
          <Sparkles className="h-4 w-4" />
          Setup Analysis
        </button>
      </div>

      {/* Tab Content Display */}
      {activeMainTab === 'OVERVIEW' && (
        <div className="space-y-6">
          {/* Payoff Ratio & Win Rate Expectancy Integration Card */}
          <div className="rounded-2xl border border-[#181920] bg-[#0A0B0E] p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                  Expectancy Breakdown
                </h3>
                <p className="text-xs text-[#8E95A2]">
                  How your win rate and average win/loss determine overall edge.
                </p>
              </div>
              <span className="text-xs font-mono text-[#A78BFA] bg-[#8B5CF6]/10 px-2.5 py-1 rounded-lg border border-[#8B5CF6]/20">
                Formula: (Win% &times; Avg Win) &minus; (Loss% &times; Avg Loss)
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <div className="rounded-xl border border-[#181920] bg-[#0E0F14] p-3.5">
                <span className="text-[10px] uppercase font-bold text-[#656B77] block">
                  Average Winner
                </span>
                <div className="text-xl font-mono-num font-bold text-[#34D399] mt-1">
                  +{activeStats.averageWinnerR.toFixed(2)}R
                </div>
                <span className="text-[10px] text-[#525866] mt-0.5 block">
                  Mean gain on winning trades
                </span>
              </div>

              <div className="rounded-xl border border-[#181920] bg-[#0E0F14] p-3.5">
                <span className="text-[10px] uppercase font-bold text-[#656B77] block">
                  Average Loser
                </span>
                <div className="text-xl font-mono-num font-bold text-[#F87171] mt-1">
                  -{activeStats.averageLoserR.toFixed(2)}R
                </div>
                <span className="text-[10px] text-[#525866] mt-0.5 block">
                  Mean loss on losing trades
                </span>
              </div>

              <div className="rounded-xl border border-[#181920] bg-[#0E0F14] p-3.5">
                <span className="text-[10px] uppercase font-bold text-[#656B77] block">
                  Payoff Ratio
                </span>
                <div className="text-xl font-mono-num font-bold text-white mt-1">
                  {(activeStats.averageWinnerR / (activeStats.averageLoserR || 1)).toFixed(2)}x
                </div>
                <span className="text-[10px] text-[#525866] mt-0.5 block">
                  Avg Win &divide; Avg Loss
                </span>
              </div>

              <div className="rounded-xl border border-[#181920] bg-[#0E0F14] p-3.5">
                <span className="text-[10px] uppercase font-bold text-[#656B77] block">
                  Plan Adherence
                </span>
                <div className="text-xl font-mono-num font-bold text-[#A78BFA] mt-1">
                  {activeStats.rulesFollowedPercent}%
                </div>
                <span className="text-[10px] text-[#525866] mt-0.5 block">
                  Followed trading plan
                </span>
              </div>
            </div>
          </div>

          {/* R Distribution */}
          <div className="rounded-2xl border border-[#181920] bg-[#0A0B0E] p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                  R Distribution
                </h3>
                <p className="text-xs text-[#8E95A2]">
                  Breakdown of closed trades by R multiple.
                </p>
              </div>
              <span className="text-xs font-mono-num text-[#525866]">
                {filteredTrades.length} trades
              </span>
            </div>

            <div className="space-y-2.5">
              {rDistribution.buckets.map((b) => {
                const pct = (b.count / (filteredTrades.length || 1)) * 100;
                const barWidth = (b.count / rDistribution.maxCount) * 100;
                return (
                  <div key={b.label} className="flex items-center gap-3 text-xs">
                    <span className="w-36 text-[#8E95A2] font-mono-num font-medium shrink-0">
                      {b.label}
                    </span>
                    <div className="flex-1 h-6 bg-[#0E0F14] rounded-md overflow-hidden p-0.5 border border-[#181920] relative flex items-center">
                      <div
                        className="h-full rounded transition-all duration-300"
                        style={{
                          width: `${Math.max(barWidth, b.count > 0 ? 3 : 0)}%`,
                          backgroundColor: b.color,
                          opacity: 0.85,
                        }}
                      />
                      {b.count > 0 && (
                        <span className="absolute right-2 font-mono-num text-[11px] font-bold text-white">
                          {b.count} ({pct.toFixed(0)}%)
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {activeMainTab === 'ROLLING' && <RollingWinRateChart trades={filteredTrades} />}

      {activeMainTab === 'PERIODIC' && (
        <PeriodicWinRateChart trades={filteredTrades} currency={userSettings.accountCurrency} />
      )}

      {activeMainTab === 'RESEARCH' && (
        <StrategyResearchView trades={filteredTrades} currency={userSettings.accountCurrency} />
      )}
    </div>
  );
};
