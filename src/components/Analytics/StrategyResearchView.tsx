import React, { useState, useMemo } from 'react';
import { TradeRecord, CurrencyCode } from '../../types';
import {
  calculatePerformanceStats,
  calculateTimeframeAlignment,
  getSampleSizeInfo,
} from '../../utils/calculations';
import {
  CheckCircle2,
  AlertTriangle,
  Info,
  Layers,
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  ArrowRight,
  TrendingUp,
  Scale,
} from 'lucide-react';

interface StrategyResearchViewProps {
  trades: TradeRecord[];
  currency: CurrencyCode;
}

export const StrategyResearchView: React.FC<StrategyResearchViewProps> = ({ trades, currency }) => {
  const [activeResearchTab, setActiveResearchTab] = useState<
    'DISCIPLINE' | 'TIMEFRAME' | 'CONFLUENCE' | 'ZONES' | 'HOD_LOD' | 'CONFIRMATION' | 'SANDBOX'
  >('DISCIPLINE');

  // Closed trades only
  const closedTrades = useMemo(() => trades.filter((t) => t.result !== 'OPEN'), [trades]);

  const getSubStats = (subset: TradeRecord[]) => {
    return calculatePerformanceStats(subset, currency);
  };

  // 1. Discipline Comparison: Rules Followed vs Rules Broken
  const disciplineCohorts = useMemo(() => {
    const followed = closedTrades.filter((t) => t.followedPlan);
    const broken = closedTrades.filter((t) => !t.followedPlan);

    return [
      {
        id: 'FOLLOWED',
        label: 'Followed Plan',
        subtitle: 'Executed according to plan',
        trades: followed,
        stats: getSubStats(followed),
        isPositiveArchetype: true,
      },
      {
        id: 'BROKEN',
        label: 'Broke Rules',
        subtitle: 'Rule breaks, early exits, moved stop losses, or traded outside plan',
        trades: broken,
        stats: getSubStats(broken),
        isPositiveArchetype: false,
      },
    ];
  }, [closedTrades, currency]);

  // 2. Timeframe Alignment Cohorts
  const timeframeCohorts = useMemo(() => {
    const buckets: Record<string, TradeRecord[]> = {
      '7/7 Aligned': [],
      '6/7 Aligned': [],
      '5/7 Aligned': [],
      '4/7 or less': [],
    };

    closedTrades.forEach((t) => {
      const { aligned } = calculateTimeframeAlignment(t);
      if (aligned === 7) buckets['7/7 Aligned'].push(t);
      else if (aligned === 6) buckets['6/7 Aligned'].push(t);
      else if (aligned === 5) buckets['5/7 Aligned'].push(t);
      else buckets['4/7 or less'].push(t);
    });

    return Object.entries(buckets).map(([label, list]) => ({
      label,
      list,
      stats: getSubStats(list),
    }));
  }, [closedTrades, currency]);

  // 3. Confluence Score Cohorts
  const confluenceCohorts = useMemo(() => {
    const buckets: Record<string, TradeRecord[]> = {
      '7+ Confluences (Grade A+)': [],
      '5–6 Confluences (Grade A/B)': [],
      '3–4 Confluences (Grade B)': [],
      '0–2 Confluences (Grade C - Weak)': [],
    };

    closedTrades.forEach((t) => {
      const score = t.confluenceScore || 0;
      if (score >= 7) buckets['7+ Confluences (Grade A+)'].push(t);
      else if (score >= 5) buckets['5–6 Confluences (Grade A/B)'].push(t);
      else if (score >= 3) buckets['3–4 Confluences (Grade B)'].push(t);
      else buckets['0–2 Confluences (Grade C - Weak)'].push(t);
    });

    return Object.entries(buckets).map(([label, list]) => ({
      label,
      list,
      stats: getSubStats(list),
    }));
  }, [closedTrades, currency]);

  // 4. Zone Quality Cohorts
  const zoneCohorts = useMemo(() => {
    const fresh = closedTrades.filter((t) => t.zoneQuality === 'FRESH');
    const testedOnce = closedTrades.filter((t) => t.zoneQuality === 'TESTED ONCE');
    const testedMulti = closedTrades.filter((t) => t.zoneQuality === 'TESTED MULTIPLE TIMES');
    const weak = closedTrades.filter((t) => t.zoneQuality === 'WEAK / UNCLEAR');

    return [
      { label: 'Fresh Zone (Untested)', list: fresh, stats: getSubStats(fresh) },
      { label: 'Tested Once', list: testedOnce, stats: getSubStats(testedOnce) },
      { label: 'Tested Multiple Times', list: testedMulti, stats: getSubStats(testedMulti) },
      { label: 'Weak / Unclear Zone', list: weak, stats: getSubStats(weak) },
    ];
  }, [closedTrades, currency]);

  // 5. HOD / LOD Liquidity Cohorts
  const hodLodCohorts = useMemo(() => {
    const withHODLOD = closedTrades.filter(
      (t) => t.previousDayHOD || t.previousDayLOD || t.twoDayHOD || t.twoDayLOD
    );
    const withoutHODLOD = closedTrades.filter(
      (t) => !t.previousDayHOD && !t.previousDayLOD && !t.twoDayHOD && !t.twoDayLOD
    );
    const keyLevel = closedTrades.filter((t) => t.reactingAroundKeyLevel);
    const noKeyLevel = closedTrades.filter((t) => !t.reactingAroundKeyLevel);

    return [
      { label: 'HOD / LOD Liquidity Present', list: withHODLOD, stats: getSubStats(withHODLOD) },
      { label: 'HOD / LOD Absent', list: withoutHODLOD, stats: getSubStats(withoutHODLOD) },
      { label: 'Key Psychological Level Reaction', list: keyLevel, stats: getSubStats(keyLevel) },
      { label: 'No Key Level Reaction', list: noKeyLevel, stats: getSubStats(noKeyLevel) },
    ];
  }, [closedTrades, currency]);

  // 6. Confirmation Types
  const confirmationCohorts = useMemo(() => {
    const bos = closedTrades.filter((t) => t.bos);
    const choch = closedTrades.filter((t) => t.choch);
    const structure = closedTrades.filter((t) => t.structureConfirmation);
    const priceAction = closedTrades.filter((t) => t.priceActionConfirmation);
    const candle = closedTrades.filter((t) => t.candleConfirmation);

    return [
      { label: 'BOS (Break of Structure)', list: bos, stats: getSubStats(bos) },
      { label: 'CHoCH (Change of Character)', list: choch, stats: getSubStats(choch) },
      { label: 'Structure Confirmation', list: structure, stats: getSubStats(structure) },
      { label: 'Price Action Rejection', list: priceAction, stats: getSubStats(priceAction) },
      { label: 'Candle Confirmation', list: candle, stats: getSubStats(candle) },
    ];
  }, [closedTrades, currency]);

  // 7. Interactive Hypothesis Sandbox: Setup A vs Setup B
  const [sandboxA_TF, setSandboxA_TF] = useState<'7' | '6' | '5' | 'ALL'>('7');
  const [sandboxA_Zone, setSandboxA_Zone] = useState<'FRESH' | 'ALL'>('FRESH');
  const [sandboxB_TF, setSandboxB_TF] = useState<'7' | '6' | '5' | '4' | 'ALL'>('5');
  const [sandboxB_Zone, setSandboxB_Zone] = useState<'TESTED MULTIPLE TIMES' | 'ALL'>('ALL');

  const sandboxCohortA = useMemo(() => {
    const filtered = closedTrades.filter((t) => {
      if (sandboxA_TF !== 'ALL') {
        const { aligned } = calculateTimeframeAlignment(t);
        if (aligned !== Number(sandboxA_TF)) return false;
      }
      if (sandboxA_Zone !== 'ALL' && t.zoneQuality !== sandboxA_Zone) return false;
      return true;
    });
    return {
      trades: filtered,
      stats: getSubStats(filtered),
    };
  }, [closedTrades, sandboxA_TF, sandboxA_Zone, currency]);

  const sandboxCohortB = useMemo(() => {
    const filtered = closedTrades.filter((t) => {
      if (sandboxB_TF !== 'ALL') {
        const { aligned } = calculateTimeframeAlignment(t);
        if (sandboxB_TF === '4') {
          if (aligned > 4) return false;
        } else if (aligned !== Number(sandboxB_TF)) return false;
      }
      if (sandboxB_Zone !== 'ALL' && t.zoneQuality !== sandboxB_Zone) return false;
      return true;
    });
    return {
      trades: filtered,
      stats: getSubStats(filtered),
    };
  }, [closedTrades, sandboxB_TF, sandboxB_Zone, currency]);

  return (
    <div className="rounded-2xl border border-[#181920] bg-[#0A0B0E] p-5 shadow-sm space-y-5">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold uppercase tracking-wider text-white">
            Setup Analysis: What Works
          </h3>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#8B5CF6]/10 text-[#A78BFA] border border-[#8B5CF6]/20">
            EDGE COMPARISON
          </span>
        </div>
        <p className="text-xs text-[#8E95A2] mt-0.5">
          Compare trade performance across different setup variables.
        </p>
      </div>

      {/* Research Tabs */}
      <div className="flex flex-wrap gap-1.5 p-1 bg-[#0E0F14] rounded-xl border border-[#181920] text-xs">
        {[
          { id: 'DISCIPLINE', label: 'Plan vs Rule Breaks' },
          { id: 'TIMEFRAME', label: 'Timeframe Alignment' },
          { id: 'CONFLUENCE', label: 'Confluence Score' },
          { id: 'ZONES', label: 'Zone Quality' },
          { id: 'HOD_LOD', label: 'Liquidity Levels' },
          { id: 'CONFIRMATION', label: 'Confirmation' },
          { id: 'SANDBOX', label: 'A / B Comparison' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveResearchTab(tab.id as any)}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              activeResearchTab === tab.id
                ? 'bg-[#8B5CF6] text-white shadow-[0_0_15px_rgba(139,92,246,0.35)]'
                : 'text-[#8E95A2] hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 1. Discipline & Rule Integrity View */}
      {activeResearchTab === 'DISCIPLINE' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {disciplineCohorts.map((cohort) => {
              const s = cohort.stats;
              const sampleInfo = getSampleSizeInfo(s.totalTrades);

              return (
                <div
                  key={cohort.id}
                  className={`rounded-2xl border p-5 space-y-4 transition-all ${
                    cohort.isPositiveArchetype
                      ? 'border-[#34D399]/30 bg-[#0E1512]/60'
                      : 'border-[#F87171]/30 bg-[#160D10]/60'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {cohort.isPositiveArchetype ? (
                          <ShieldCheck className="h-4 w-4 text-[#34D399]" />
                        ) : (
                          <ShieldAlert className="h-4 w-4 text-[#F87171]" />
                        )}
                        <h4 className="text-sm font-bold text-white">{cohort.label}</h4>
                      </div>
                      <p className="text-xs text-[#8E95A2]">{cohort.subtitle}</p>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        sampleInfo.reliabilityColor
                      }`}
                    >
                      {sampleInfo.reliabilityBadge}
                    </span>
                  </div>

                  {/* Primary Metrics Grid */}
                  <div className="grid grid-cols-3 gap-2 py-2 border-y border-[#272A34] text-center">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#656B77] block">
                        Win Rate
                      </span>
                      <span
                        className={`text-xl font-mono-num font-bold ${
                          s.winRate >= 50 ? 'text-[#34D399]' : 'text-[#F87171]'
                        }`}
                      >
                        {s.totalTrades > 0 ? `${s.winRate}%` : '—'}
                      </span>
                      <span className="text-[10px] text-[#8E95A2] block">
                        {s.winningTrades}W / {s.losingTrades}L / {s.breakevenTrades}BE
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#656B77] block">
                        Expectancy
                      </span>
                      <span
                        className={`text-xl font-mono-num font-bold ${
                          s.expectancy >= 0 ? 'text-[#A78BFA]' : 'text-[#F87171]'
                        }`}
                      >
                        {s.totalTrades > 0
                          ? `${s.expectancy >= 0 ? '+' : ''}${s.expectancy.toFixed(2)}R`
                          : '—'}
                      </span>
                      <span className="text-[10px] text-[#8E95A2] block">per setup</span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#656B77] block">
                        Total Return
                      </span>
                      <span
                        className={`text-xl font-mono-num font-bold ${
                          s.totalR >= 0 ? 'text-[#34D399]' : 'text-[#F87171]'
                        }`}
                      >
                        {s.totalTrades > 0 ? `${s.totalR >= 0 ? '+' : ''}${s.totalR.toFixed(2)}R` : '—'}
                      </span>
                      <span className="text-[10px] text-[#8E95A2] block">
                        {s.totalTrades} trades
                      </span>
                    </div>
                  </div>

                  {/* Secondary Metrics Breakdown */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-[#1E2028]">
                      <span className="text-[#8E95A2]">Loss Rate:</span>
                      <span className="font-mono text-[#F87171] font-semibold">{s.lossRate}%</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#1E2028]">
                      <span className="text-[#8E95A2]">Breakeven Rate:</span>
                      <span className="font-mono text-[#94A3B8] font-semibold">{s.breakevenRate}%</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#1E2028]">
                      <span className="text-[#8E95A2]">Average Winner:</span>
                      <span className="font-mono text-[#34D399] font-semibold">+{s.averageWinnerR.toFixed(2)}R</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#1E2028]">
                      <span className="text-[#8E95A2]">Average Loser:</span>
                      <span className="font-mono text-[#F87171] font-semibold">-{s.averageLoserR.toFixed(2)}R</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#1E2028]">
                      <span className="text-[#8E95A2]">Profit Factor:</span>
                      <span className="font-mono text-white font-semibold">{s.profitFactor.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#1E2028]">
                      <span className="text-[#8E95A2]">Payoff Ratio:</span>
                      <span className="font-mono text-white font-semibold">
                        {(s.averageWinnerR / (s.averageLoserR || 1)).toFixed(2)}x
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-[#8E95A2] italic pt-1">{sampleInfo.message}</p>
                </div>
              );
            })}
          </div>

          {/* Research Insight Callout */}
          <div className="rounded-xl border border-[#272A34] bg-[#0E0F14] p-4 text-xs space-y-1.5">
            <span className="font-bold text-white flex items-center gap-1.5">
              Plan vs Rule Breaks
            </span>
            <p className="text-[#8E95A2]">
              Comparing trades that followed the plan versus trades with rule breaks helps separate strategy edge from execution errors.
            </p>
          </div>
        </div>
      )}

      {/* 2-6. Cohort Table Views for other tabs */}
      {activeResearchTab !== 'DISCIPLINE' && activeResearchTab !== 'SANDBOX' && (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-xl border border-[#181920] bg-[#0E0F14]">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#181920] bg-[#0D0E12] text-[10px] uppercase font-bold tracking-wider text-[#656B77]">
                  <th className="py-3 px-4">Cohort</th>
                  <th className="py-3 px-3">Trades</th>
                  <th className="py-3 px-3">Win Rate</th>
                  <th className="py-3 px-3">Loss Rate</th>
                  <th className="py-3 px-3">Breakevens</th>
                  <th className="py-3 px-3">Avg Win</th>
                  <th className="py-3 px-3">Avg Loss</th>
                  <th className="py-3 px-3">Total R</th>
                  <th className="py-3 px-3">Expectancy</th>
                  <th className="py-3 px-3">Sample Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#181920]">
                {(activeResearchTab === 'TIMEFRAME'
                  ? timeframeCohorts
                  : activeResearchTab === 'CONFLUENCE'
                  ? confluenceCohorts
                  : activeResearchTab === 'ZONES'
                  ? zoneCohorts
                  : activeResearchTab === 'HOD_LOD'
                  ? hodLodCohorts
                  : confirmationCohorts
                ).map((cohort) => {
                  const s = cohort.stats;
                  const sampleInfo = getSampleSizeInfo(s.totalTrades);
                  const isPositiveExp = s.expectancy > 0;

                  return (
                    <tr key={cohort.label} className="hover:bg-[#111217] transition-colors">
                      <td className="py-3 px-4 font-bold text-white">{cohort.label}</td>
                      <td className="py-3 px-3 font-mono-num text-[#8E95A2]">{s.totalTrades}</td>
                      <td
                        className={`py-3 px-3 font-mono-num font-bold ${
                          s.winRate >= 50 ? 'text-[#34D399]' : 'text-[#F87171]'
                        }`}
                      >
                        {s.totalTrades > 0 ? `${s.winRate}%` : '—'}
                      </td>
                      <td className="py-3 px-3 font-mono-num text-[#F87171]">
                        {s.totalTrades > 0 ? `${s.lossRate}%` : '—'}
                      </td>
                      <td className="py-3 px-3 font-mono-num text-[#94A3B8]">
                        {s.totalTrades > 0 ? `${s.breakevenTrades} (${s.breakevenRate}%)` : '—'}
                      </td>
                      <td className="py-3 px-3 font-mono-num text-[#34D399]">
                        {s.totalTrades > 0 ? `+${s.averageWinnerR.toFixed(2)}R` : '—'}
                      </td>
                      <td className="py-3 px-3 font-mono-num text-[#F87171]">
                        {s.totalTrades > 0 ? `-${s.averageLoserR.toFixed(2)}R` : '—'}
                      </td>
                      <td
                        className={`py-3 px-3 font-mono-num font-bold ${
                          s.totalR >= 0 ? 'text-[#34D399]' : 'text-[#F87171]'
                        }`}
                      >
                        {s.totalTrades > 0 ? `${s.totalR >= 0 ? '+' : ''}${s.totalR.toFixed(2)}R` : '—'}
                      </td>
                      <td
                        className={`py-3 px-3 font-mono-num font-bold ${
                          isPositiveExp ? 'text-[#A78BFA]' : 'text-[#F87171]'
                        }`}
                      >
                        {s.totalTrades > 0 ? `${isPositiveExp ? '+' : ''}${s.expectancy.toFixed(2)}R` : '—'}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${sampleInfo.reliabilityColor}`}
                        >
                          {sampleInfo.reliabilityBadge}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-start gap-2 text-xs text-[#8E95A2] bg-[#0E0F14] p-3.5 rounded-xl border border-[#181920]">
            <Info className="h-4 w-4 text-[#A78BFA] shrink-0 mt-0.5" />
            <span>
              <strong>Note:</strong> Breakevens are tracked separately from wins and losses. Expectancy = <code className="font-mono text-white text-[11px]">(Win Rate % &times; Avg Win R) &minus; (Loss Rate % &times; Avg Loss R)</code>.
            </span>
          </div>
        </div>
      )}

      {/* 7. Side-by-Side Hypothesis Testing Sandbox */}
      {activeResearchTab === 'SANDBOX' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-[#272A34] bg-[#0E0F14] p-4 text-xs text-[#8E95A2] flex items-start gap-2">
            <Scale className="h-4 w-4 text-[#A78BFA] shrink-0 mt-0.5" />
            <span>
              Compare two criteria side-by-side to see how setup variables affect performance (e.g. 7/7 Aligned Fresh Zones vs 5/7 Aligned Zones).
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Setup Hypothesis A */}
            <div className="rounded-2xl border border-[#272A34] bg-[#0E0F14] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-bold text-[#A78BFA]">Setup A</span>
                <span className="text-[11px] font-mono text-[#8E95A2]">
                  {sandboxCohortA.trades.length} trades matched
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] uppercase font-bold text-[#656B77] block mb-1">
                    TF Alignment
                  </label>
                  <select
                    value={sandboxA_TF}
                    onChange={(e) => setSandboxA_TF(e.target.value as any)}
                    className="w-full h-8 rounded-lg border border-[#1E2028] bg-[#0A0B0E] px-2 text-xs text-white"
                  >
                    <option value="ALL">All Alignments</option>
                    <option value="7">7/7 Aligned Only</option>
                    <option value="6">6/7 Aligned Only</option>
                    <option value="5">5/7 Aligned Only</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-[#656B77] block mb-1">
                    Zone Quality
                  </label>
                  <select
                    value={sandboxA_Zone}
                    onChange={(e) => setSandboxA_Zone(e.target.value as any)}
                    className="w-full h-8 rounded-lg border border-[#1E2028] bg-[#0A0B0E] px-2 text-xs text-white"
                  >
                    <option value="ALL">All Qualities</option>
                    <option value="FRESH">Fresh Zones Only</option>
                  </select>
                </div>
              </div>

              {/* Profile A Stats */}
              <div className="pt-2 border-t border-[#181920] space-y-2">
                <div className="grid grid-cols-3 gap-2 text-center py-2 bg-[#0A0B0E] rounded-xl border border-[#181920]">
                  <div>
                    <span className="text-[10px] uppercase text-[#656B77] block">Win Rate</span>
                    <span className="font-mono text-lg font-bold text-white">
                      {sandboxCohortA.trades.length > 0 ? `${sandboxCohortA.stats.winRate}%` : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-[#656B77] block">Expectancy</span>
                    <span
                      className={`font-mono text-lg font-bold ${
                        sandboxCohortA.stats.expectancy >= 0 ? 'text-[#A78BFA]' : 'text-[#F87171]'
                      }`}
                    >
                      {sandboxCohortA.trades.length > 0
                        ? `${sandboxCohortA.stats.expectancy >= 0 ? '+' : ''}${sandboxCohortA.stats.expectancy.toFixed(2)}R`
                        : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-[#656B77] block">Total R</span>
                    <span
                      className={`font-mono text-lg font-bold ${
                        sandboxCohortA.stats.totalR >= 0 ? 'text-[#34D399]' : 'text-[#F87171]'
                      }`}
                    >
                      {sandboxCohortA.trades.length > 0
                        ? `${sandboxCohortA.stats.totalR >= 0 ? '+' : ''}${sandboxCohortA.stats.totalR.toFixed(2)}R`
                        : '—'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-[#8E95A2] pt-1">
                  <span>
                    Record: {sandboxCohortA.stats.winningTrades}W / {sandboxCohortA.stats.losingTrades}L /{' '}
                    {sandboxCohortA.stats.breakevenTrades}BE
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      getSampleSizeInfo(sandboxCohortA.trades.length).reliabilityColor
                    }`}
                  >
                    {getSampleSizeInfo(sandboxCohortA.trades.length).reliabilityBadge}
                  </span>
                </div>
              </div>
            </div>

            {/* Setup Hypothesis B */}
            <div className="rounded-2xl border border-[#272A34] bg-[#0E0F14] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-bold text-[#8E95A2]">Setup B</span>
                <span className="text-[11px] font-mono text-[#8E95A2]">
                  {sandboxCohortB.trades.length} trades matched
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] uppercase font-bold text-[#656B77] block mb-1">
                    TF Alignment
                  </label>
                  <select
                    value={sandboxB_TF}
                    onChange={(e) => setSandboxB_TF(e.target.value as any)}
                    className="w-full h-8 rounded-lg border border-[#1E2028] bg-[#0A0B0E] px-2 text-xs text-white"
                  >
                    <option value="ALL">All Alignments</option>
                    <option value="7">7/7 Aligned</option>
                    <option value="6">6/7 Aligned</option>
                    <option value="5">5/7 Aligned</option>
                    <option value="4">&le; 4/7 Aligned</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-[#656B77] block mb-1">
                    Zone Quality
                  </label>
                  <select
                    value={sandboxB_Zone}
                    onChange={(e) => setSandboxB_Zone(e.target.value as any)}
                    className="w-full h-8 rounded-lg border border-[#1E2028] bg-[#0A0B0E] px-2 text-xs text-white"
                  >
                    <option value="ALL">All Qualities</option>
                    <option value="TESTED MULTIPLE TIMES">Tested Multiple Times Only</option>
                  </select>
                </div>
              </div>

              {/* Profile B Stats */}
              <div className="pt-2 border-t border-[#181920] space-y-2">
                <div className="grid grid-cols-3 gap-2 text-center py-2 bg-[#0A0B0E] rounded-xl border border-[#181920]">
                  <div>
                    <span className="text-[10px] uppercase text-[#656B77] block">Win Rate</span>
                    <span className="font-mono text-lg font-bold text-white">
                      {sandboxCohortB.trades.length > 0 ? `${sandboxCohortB.stats.winRate}%` : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-[#656B77] block">Expectancy</span>
                    <span
                      className={`font-mono text-lg font-bold ${
                        sandboxCohortB.stats.expectancy >= 0 ? 'text-[#A78BFA]' : 'text-[#F87171]'
                      }`}
                    >
                      {sandboxCohortB.trades.length > 0
                        ? `${sandboxCohortB.stats.expectancy >= 0 ? '+' : ''}${sandboxCohortB.stats.expectancy.toFixed(2)}R`
                        : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-[#656B77] block">Total R</span>
                    <span
                      className={`font-mono text-lg font-bold ${
                        sandboxCohortB.stats.totalR >= 0 ? 'text-[#34D399]' : 'text-[#F87171]'
                      }`}
                    >
                      {sandboxCohortB.trades.length > 0
                        ? `${sandboxCohortB.stats.totalR >= 0 ? '+' : ''}${sandboxCohortB.stats.totalR.toFixed(2)}R`
                        : '—'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-[#8E95A2] pt-1">
                  <span>
                    Record: {sandboxCohortB.stats.winningTrades}W / {sandboxCohortB.stats.losingTrades}L /{' '}
                    {sandboxCohortB.stats.breakevenTrades}BE
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      getSampleSizeInfo(sandboxCohortB.trades.length).reliabilityColor
                    }`}
                  >
                    {getSampleSizeInfo(sandboxCohortB.trades.length).reliabilityBadge}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
