import React, { useState } from 'react';
import {
  Layers,
  Clock,
  Target,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Compass,
  FileText,
  Copy,
  Check,
  Award,
  Zap,
  ChevronRight,
  Sparkles,
  Calculator,
  Lock,
  ArrowDown,
  Activity,
  Bookmark,
} from 'lucide-react';
import { Timeframe, TradeDirection } from '../../types';

interface SupplyDemandFrameworkViewProps {
  onNewTradeWithFramework?: (presetData?: any) => void;
  onBackToOverview?: () => void;
}

type TabType = 'timeframes' | 'zones' | 'setups' | 'confluence' | 'risk' | 'evaluator';

export const SupplyDemandFrameworkView: React.FC<SupplyDemandFrameworkViewProps> = ({
  onNewTradeWithFramework,
  onBackToOverview,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('timeframes');
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>('4H');
  const [copied, setCopied] = useState(false);

  // Evaluator state
  const [evalDirection, setEvalDirection] = useState<TradeDirection>('LONG');
  const [evalWeeklyDailyAligned, setEvalWeeklyDailyAligned] = useState(true);
  const [evalFreshHTFZone, setEvalFreshHTFZone] = useState(true);
  const [evalLiquiditySweep, setEvalLiquiditySweep] = useState(true);
  const [evalStructureShift, setEvalStructureShift] = useState(true);
  const [evalKillzoneTiming, setEvalKillzoneTiming] = useState(true);
  const [evalMin2R, setEvalMin2R] = useState(true);
  const [evalImbalanceFVG, setEvalImbalanceFVG] = useState(true);

  // Calculate live evaluator score
  const evaluatorScore =
    (evalWeeklyDailyAligned ? 2 : 0) +
    (evalFreshHTFZone ? 2 : 0) +
    (evalLiquiditySweep ? 2 : 0) +
    (evalStructureShift ? 1 : 0) +
    (evalKillzoneTiming ? 1 : 0) +
    (evalMin2R ? 1 : 0) +
    (evalImbalanceFVG ? 1 : 0);

  const getGrade = (score: number) => {
    if (score >= 9) return { grade: 'A+', label: 'Prime Institutional Setup', color: 'text-[#10B981]', bg: 'bg-[#10B981]/15', border: 'border-[#10B981]/30', risk: '1.5% - 2.0%' };
    if (score >= 7) return { grade: 'A', label: 'High Probability Setup', color: 'text-[#A78BFA]', bg: 'bg-[#8B5CF6]/15', border: 'border-[#8B5CF6]/30', risk: '1.0%' };
    if (score >= 5) return { grade: 'B', label: 'Secondary / Conservative', color: 'text-[#F59E0B]', bg: 'bg-[#F59E0B]/15', border: 'border-[#F59E0B]/30', risk: '0.5% max' };
    return { grade: 'DISQUALIFIED', label: 'Below Edge Threshold (No Trade)', color: 'text-[#EF4444]', bg: 'bg-[#EF4444]/15', border: 'border-[#EF4444]/30', risk: '0.0% (Stand Down)' };
  };

  const currentGrade = getGrade(evaluatorScore);

  const handleCopyCheatSheet = () => {
    const text = `SUPPLY & DEMAND FRAMEWORK - 5-YEAR SPECIFICATION CHEAT SHEET
-------------------------------------------------------------
1. TIMEFRAME HIERARCHY:
   - Weekly & Daily: Directional Bias & Narrative (Macro)
   - 4H & 1H: Key Supply/Demand POIs & Structural Base
   - 15M: Liquidity Sweeps (PDH, PDL, Asian High/Low)
   - 5M: Market Structure Shift (CHoCH / BOS) & Imbalance
   - 1M: Precision Entry, Invalidation Behind Distal Line

2. CONFLUENCE SCORING (Max 10 pts):
   - +2: Weekly/Daily Trend Alignment
   - +2: Fresh Unmitigated HTF (4H/1H) Zone
   - +2: Key Liquidity Sweep (PDH/PDL/Asian Range)
   - +1: Clean BOS/CHoCH with Displacement
   - +1: Active Killzone (London 07-10 UTC, NY 12-15 UTC)
   - +1: Minimum 2.5R to nearest trouble zone
   - +1: Fair Value Gap / Order Block Imbalance

3. EXECUTION PROTOCOL:
   - Grade A+ (9-10 pts): Full 1-2% risk
   - Grade A (7-8 pts): 1% risk
   - Grade B (5-6 pts): 0.5% risk
   - < 5 pts: NO TRADE
   - Take 50% partial at 2.0R; move SL to BE after 1.5R / BOS.
   - Max 2 losses/day -> shutdown terminal.`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner & Header */}
      <div className="relative overflow-hidden rounded-2xl border border-[#181920] bg-[#0A0B0E] p-6 md:p-8">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#8B5CF6]/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 text-[#A78BFA] text-xs font-semibold">
              <Sparkles className="h-3.5 w-3.5" />
              <span>5-Year Institutional Methodology Specification</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Supply &amp; Demand Framework
            </h1>
            <p className="text-sm text-[#8E95A2] leading-relaxed">
              The standardized multi-timeframe system engineering institutional order flow, liquidity mechanics, structural displacement, and rigorous risk mathematical expectancy.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleCopyCheatSheet}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#181920] bg-[#0E0F14] hover:bg-[#151720] hover:border-[#272932] text-xs font-semibold text-[#E1E4EA] transition-all cursor-pointer shadow-xs"
            >
              {copied ? <Check className="h-4 w-4 text-[#10B981]" /> : <Copy className="h-4 w-4 text-[#8E95A2]" />}
              <span>{copied ? 'Copied to Clipboard' : 'Copy Cheat Sheet'}</span>
            </button>

            {onNewTradeWithFramework && (
              <button
                onClick={() => onNewTradeWithFramework()}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] text-xs font-bold text-white transition-all cursor-pointer shadow-md shadow-[rgba(139,92,246,0.3)]"
              >
                <Zap className="h-4 w-4" />
                <span>Log Trade with Framework</span>
              </button>
            )}
          </div>
        </div>

        {/* 5 Core Pillars Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-6 pt-6 border-t border-[#181920]">
          <div className="p-3 rounded-xl bg-[#0E0F14] border border-[#181920]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#525866] block">Structure</span>
            <span className="text-xs font-bold text-white mt-0.5 block">7-Timeframe Matrix</span>
            <span className="text-[11px] text-[#8E95A2] block mt-0.5">Weekly down to 1M sniper</span>
          </div>

          <div className="p-3 rounded-xl bg-[#0E0F14] border border-[#181920]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#525866] block">Liquidity</span>
            <span className="text-xs font-bold text-white mt-0.5 block">HOD / LOD Sweeps</span>
            <span className="text-[11px] text-[#8E95A2] block mt-0.5">Engineered retail stops</span>
          </div>

          <div className="p-3 rounded-xl bg-[#0E0F14] border border-[#181920]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#525866] block">Zone Quality</span>
            <span className="text-xs font-bold text-white mt-0.5 block">Freshness Validation</span>
            <span className="text-[11px] text-[#8E95A2] block mt-0.5">0-Touch unmitigated POIs</span>
          </div>

          <div className="p-3 rounded-xl bg-[#0E0F14] border border-[#181920]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#525866] block">Confluence</span>
            <span className="text-xs font-bold text-white mt-0.5 block">10-Point Scorecard</span>
            <span className="text-[11px] text-[#8E95A2] block mt-0.5">Min 7/10 for execution</span>
          </div>

          <div className="p-3 rounded-xl bg-[#0E0F14] border border-[#181920] col-span-2 sm:col-span-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#525866] block">Risk Rule</span>
            <span className="text-xs font-bold text-[#10B981] mt-0.5 block">Min 2.0R Expectancy</span>
            <span className="text-[11px] text-[#8E95A2] block mt-0.5">Max 1-2% risk per position</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-[#181920] text-xs font-semibold">
        <button
          onClick={() => setActiveTab('timeframes')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'timeframes'
              ? 'bg-[#8B5CF6]/15 text-[#A78BFA] border border-[#8B5CF6]/30 shadow-xs'
              : 'text-[#8E95A2] hover:text-white hover:bg-[#0E0F14]'
          }`}
        >
          <Clock className="h-4 w-4" />
          <span>7-Timeframe Matrix</span>
        </button>

        <button
          onClick={() => setActiveTab('zones')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'zones'
              ? 'bg-[#8B5CF6]/15 text-[#A78BFA] border border-[#8B5CF6]/30 shadow-xs'
              : 'text-[#8E95A2] hover:text-white hover:bg-[#0E0F14]'
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Zone Anatomy &amp; Freshness</span>
        </button>

        <button
          onClick={() => setActiveTab('setups')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'setups'
              ? 'bg-[#8B5CF6]/15 text-[#A78BFA] border border-[#8B5CF6]/30 shadow-xs'
              : 'text-[#8E95A2] hover:text-white hover:bg-[#0E0F14]'
          }`}
        >
          <Compass className="h-4 w-4" />
          <span>The 5 Core Setups</span>
        </button>

        <button
          onClick={() => setActiveTab('confluence')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'confluence'
              ? 'bg-[#8B5CF6]/15 text-[#A78BFA] border border-[#8B5CF6]/30 shadow-xs'
              : 'text-[#8E95A2] hover:text-white hover:bg-[#0E0F14]'
          }`}
        >
          <Award className="h-4 w-4" />
          <span>10-Point Confluence Rubric</span>
        </button>

        <button
          onClick={() => setActiveTab('risk')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'risk'
              ? 'bg-[#8B5CF6]/15 text-[#A78BFA] border border-[#8B5CF6]/30 shadow-xs'
              : 'text-[#8E95A2] hover:text-white hover:bg-[#0E0F14]'
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          <span>Risk &amp; Execution Laws</span>
        </button>

        <button
          onClick={() => setActiveTab('evaluator')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'evaluator'
              ? 'bg-[#8B5CF6]/15 text-[#A78BFA] border border-[#8B5CF6]/30 shadow-xs'
              : 'text-[#8E95A2] hover:text-white hover:bg-[#0E0F14]'
          }`}
        >
          <Calculator className="h-4 w-4" />
          <span>Live Setup Evaluator</span>
        </button>
      </div>

      {/* TAB 1: 7-TIMEFRAME MATRIX */}
      {activeTab === 'timeframes' && (
        <div className="space-y-6">
          {/* Top Overview card */}
          <div className="p-6 rounded-2xl bg-[#0A0B0E] border border-[#181920] space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#A78BFA] block">Top-Down Architecture</span>
                <h2 className="text-xl font-bold text-white mt-1">The 7-Timeframe Top-Down Waterfall</h2>
              </div>
              <p className="text-xs text-[#8E95A2] md:max-w-md">
                Institutional order flow flows from macro timeframes to micro execution. We never take a lower-timeframe trade without explicit higher-timeframe authorization.
              </p>
            </div>

            {/* Visual Waterfall Flow Diagram */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 pt-3">
              {[
                { tf: 'Weekly', role: 'Macro Bias', tier: 'High Tier', color: 'border-blue-500/40 text-blue-400 bg-blue-500/10' },
                { tf: 'Daily', role: 'Order Flow & FVG', tier: 'High Tier', color: 'border-indigo-500/40 text-indigo-400 bg-indigo-500/10' },
                { tf: '4H', role: 'Structural POI', tier: 'Mid Tier', color: 'border-purple-500/40 text-purple-400 bg-purple-500/10' },
                { tf: '1H', role: 'Sub-Structure', tier: 'Mid Tier', color: 'border-violet-500/40 text-violet-400 bg-violet-500/10' },
                { tf: '15M', role: 'Liquidity Sweep', tier: 'Execution', color: 'border-amber-500/40 text-amber-400 bg-amber-500/10' },
                { tf: '5M', role: 'CHoCH & Imbalance', tier: 'Execution', color: 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10' },
                { tf: '1M', role: 'Sniper Trigger', tier: 'Precision', color: 'border-rose-500/40 text-rose-400 bg-rose-500/10' },
              ].map((item, idx) => (
                <button
                  key={item.tf}
                  onClick={() => setSelectedTimeframe(item.tf as Timeframe)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    selectedTimeframe === item.tf
                      ? 'ring-2 ring-[#8B5CF6] ' + item.color
                      : 'bg-[#0E0F14] border-[#181920] hover:border-[#272932] text-[#8E95A2]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{item.tf}</span>
                    <span className="text-[9px] font-mono-num px-1 py-0.5 rounded bg-black/40 text-[#8E95A2]">
                      Step {idx + 1}
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold block mt-1 text-white/90">{item.role}</span>
                  <span className="text-[10px] text-[#8E95A2] block mt-0.5">{item.tier}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Deep-Dive on Selected Timeframe */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Detailed Spec */}
            <div className="lg:col-span-2 p-6 rounded-2xl bg-[#0A0B0E] border border-[#181920] space-y-6">
              <div className="flex items-center justify-between border-b border-[#181920] pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-[#8B5CF6]/20 border border-[#8B5CF6]/40 flex items-center justify-center font-bold text-base text-[#A78BFA]">
                    {selectedTimeframe}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      {selectedTimeframe === 'Weekly' && 'Weekly Timeframe: Macro Narrative & Cyclical Bias'}
                      {selectedTimeframe === 'Daily' && 'Daily Timeframe: Institutional Order Flow & Daily Ranges'}
                      {selectedTimeframe === '4H' && '4-Hour Timeframe: Structural Points of Interest (POIs)'}
                      {selectedTimeframe === '1H' && '1-Hour Timeframe: Intermediate Trend & Zone Refinement'}
                      {selectedTimeframe === '15M' && '15-Minute Timeframe: Liquidity Sweeps & Session Extremes'}
                      {selectedTimeframe === '5M' && '5-Minute Timeframe: Market Structure Shift (BOS/CHoCH)'}
                      {selectedTimeframe === '1M' && '1-Minute Timeframe: Invalidation Tightening & Sniper Fill'}
                    </h3>
                    <span className="text-xs text-[#8E95A2]">
                      Role in the 5-Year Supply &amp; Demand Strategy
                    </span>
                  </div>
                </div>
              </div>

              {/* Responsibilities & Criteria */}
              <div className="space-y-4 text-xs text-[#E1E4EA]">
                {selectedTimeframe === 'Weekly' && (
                  <>
                    <div className="p-4 rounded-xl bg-[#0E0F14] border border-[#181920] space-y-2">
                      <span className="font-bold text-white text-sm block">Core Purpose: Macro Roadmap</span>
                      <p className="text-[#8E95A2] leading-relaxed">
                        The Weekly chart dictates the supreme directional current. We never fight a multi-week expansion or attempt counter-trend shorts into a fresh unmitigated Weekly Demand base.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-4 rounded-xl bg-[#0E0F14] border border-[#181920] space-y-2">
                        <span className="font-bold text-[#10B981] flex items-center gap-1.5">
                          <CheckCircle2 className="h-4 w-4" /> Checklist for Weekly
                        </span>
                        <ul className="space-y-1.5 text-[#8E95A2] list-disc list-inside">
                          <li>Identify major multi-month swing high &amp; swing low.</li>
                          <li>Mark major unmitigated Weekly Supply &amp; Demand blocks.</li>
                          <li>Note if previous weekly candle closed as an expansion or pinbar rejection.</li>
                          <li>Determine quarterly liquidity draw (where are buy/sell stops resting?).</li>
                        </ul>
                      </div>

                      <div className="p-4 rounded-xl bg-[#0E0F14] border border-[#181920] space-y-2">
                        <span className="font-bold text-[#EF4444] flex items-center gap-1.5">
                          <XCircle className="h-4 w-4" /> Hard Invalidation Rules
                        </span>
                        <ul className="space-y-1.5 text-[#8E95A2] list-disc list-inside">
                          <li>Do not execute long trades inside an unmitigated Weekly Supply zone.</li>
                          <li>Do not trade counter to a clear Weekly Break of Structure without Daily CHoCH.</li>
                        </ul>
                      </div>
                    </div>
                  </>
                )}

                {selectedTimeframe === 'Daily' && (
                  <>
                    <div className="p-4 rounded-xl bg-[#0E0F14] border border-[#181920] space-y-2">
                      <span className="font-bold text-white text-sm block">Core Purpose: Daily Bias &amp; Liquidity Draw</span>
                      <p className="text-[#8E95A2] leading-relaxed">
                        The Daily timeframe anchors intra-week directional bias. We mark Previous Day High (PDH/HOD), Previous Day Low (PDL/LOD), and Daily Fair Value Gaps (FVG) that act as institutional magnets.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-4 rounded-xl bg-[#0E0F14] border border-[#181920] space-y-2">
                        <span className="font-bold text-[#10B981] flex items-center gap-1.5">
                          <CheckCircle2 className="h-4 w-4" /> Checklist for Daily
                        </span>
                        <ul className="space-y-1.5 text-[#8E95A2] list-disc list-inside">
                          <li>Mark Yesterday's High (PDH) and Yesterday's Low (PDL).</li>
                          <li>Locate 2-Day High and Low for liquidity sweeps.</li>
                          <li>Confirm if price is in Premium (&gt;50% Fibonacci) or Discount (&lt;50%).</li>
                          <li>Identify Daily imbalances (FVG) waiting to be rebalanced.</li>
                        </ul>
                      </div>

                      <div className="p-4 rounded-xl bg-[#0E0F14] border border-[#181920] space-y-2">
                        <span className="font-bold text-[#EF4444] flex items-center gap-1.5">
                          <XCircle className="h-4 w-4" /> Hard Invalidation Rules
                        </span>
                        <ul className="space-y-1.5 text-[#8E95A2] list-disc list-inside">
                          <li>Never buy at premium when Daily candle is testing Daily Supply.</li>
                          <li>Never hold swing positions over weekends without Daily structural protection.</li>
                        </ul>
                      </div>
                    </div>
                  </>
                )}

                {selectedTimeframe === '4H' && (
                  <>
                    <div className="p-4 rounded-xl bg-[#0E0F14] border border-[#181920] space-y-2">
                      <span className="font-bold text-white text-sm block">Core Purpose: Structural Supply &amp; Demand POIs</span>
                      <p className="text-[#8E95A2] leading-relaxed">
                        The 4-Hour chart is the backbone of our institutional zones. Every high-conviction trade idea originates from an unmitigated, fresh 4H Supply or Demand zone that created rapid displacement.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-4 rounded-xl bg-[#0E0F14] border border-[#181920] space-y-2">
                        <span className="font-bold text-[#10B981] flex items-center gap-1.5">
                          <CheckCircle2 className="h-4 w-4" /> Checklist for 4H Zones
                        </span>
                        <ul className="space-y-1.5 text-[#8E95A2] list-disc list-inside">
                          <li>Zone must be FRESH (0 prior touches).</li>
                          <li>Must have produced energetic displacement breaking previous structure.</li>
                          <li>Must leave behind a clear Fair Value Gap / Imbalance.</li>
                          <li>Must have originated from a prior liquidity grab (inducement sweep).</li>
                        </ul>
                      </div>

                      <div className="p-4 rounded-xl bg-[#0E0F14] border border-[#181920] space-y-2">
                        <span className="font-bold text-[#EF4444] flex items-center gap-1.5">
                          <XCircle className="h-4 w-4" /> Depletion Warning
                        </span>
                        <ul className="space-y-1.5 text-[#8E95A2] list-disc list-inside">
                          <li>Zones with 2 or more touches are deemed DEPLETED.</li>
                          <li>Depleted zones become liquidity targets for breakouts rather than reversal points.</li>
                        </ul>
                      </div>
                    </div>
                  </>
                )}

                {selectedTimeframe === '1H' && (
                  <>
                    <div className="p-4 rounded-xl bg-[#0E0F14] border border-[#181920] space-y-2">
                      <span className="font-bold text-white text-sm block">Core Purpose: Trend Confirmation &amp; Zone Refinement</span>
                      <p className="text-[#8E95A2] leading-relaxed">
                        The 1-Hour chart refines the broad 4H zone into a tighter order block or breaker block. It serves as our bridge between HTF macro context and intra-session timing.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-4 rounded-xl bg-[#0E0F14] border border-[#181920] space-y-2">
                        <span className="font-bold text-[#10B981] flex items-center gap-1.5">
                          <CheckCircle2 className="h-4 w-4" /> Checklist for 1H
                        </span>
                        <ul className="space-y-1.5 text-[#8E95A2] list-disc list-inside">
                          <li>Refine 4H zone to the exact 1H base candle before the run.</li>
                          <li>Verify 1H swing highs/lows for intra-day trend direction.</li>
                          <li>Identify intermediate resistance/support trouble zones.</li>
                        </ul>
                      </div>

                      <div className="p-4 rounded-xl bg-[#0E0F14] border border-[#181920] space-y-2">
                        <span className="font-bold text-[#EF4444] flex items-center gap-1.5">
                          <XCircle className="h-4 w-4" /> Caution Rule
                        </span>
                        <ul className="space-y-1.5 text-[#8E95A2] list-disc list-inside">
                          <li>Do not refine a 4H zone so tightly on 1H that you miss front-running institutional limit orders.</li>
                        </ul>
                      </div>
                    </div>
                  </>
                )}

                {selectedTimeframe === '15M' && (
                  <>
                    <div className="p-4 rounded-xl bg-[#0E0F14] border border-[#181920] space-y-2">
                      <span className="font-bold text-white text-sm block">Core Purpose: Liquidity Sweeps &amp; Session Range Traps</span>
                      <p className="text-[#8E95A2] leading-relaxed">
                        The 15-Minute chart reveals institutional manipulation. We look for sweeps of the Asian Session Range, Previous Day HOD/LOD, or equal swing highs/lows during London or New York Open.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-4 rounded-xl bg-[#0E0F14] border border-[#181920] space-y-2">
                        <span className="font-bold text-[#10B981] flex items-center gap-1.5">
                          <CheckCircle2 className="h-4 w-4" /> 15M Sweep Signatures
                        </span>
                        <ul className="space-y-1.5 text-[#8E95A2] list-disc list-inside">
                          <li>Long wick penetrating previous high/low followed by closing back inside.</li>
                          <li>Judas Swing during London Open (07:00-08:30 UTC).</li>
                          <li>Immediate energetic displacement in the opposite direction.</li>
                        </ul>
                      </div>

                      <div className="p-4 rounded-xl bg-[#0E0F14] border border-[#181920] space-y-2">
                        <span className="font-bold text-[#EF4444] flex items-center gap-1.5">
                          <XCircle className="h-4 w-4" /> False Signal Check
                        </span>
                        <ul className="space-y-1.5 text-[#8E95A2] list-disc list-inside">
                          <li>If a 15M candle closes with a full body beyond the high/low with strong volume, it is an expansion, NOT a sweep. Do not fade!</li>
                        </ul>
                      </div>
                    </div>
                  </>
                )}

                {selectedTimeframe === '5M' && (
                  <>
                    <div className="p-4 rounded-xl bg-[#0E0F14] border border-[#181920] space-y-2">
                      <span className="font-bold text-white text-sm block">Core Purpose: Change of Character (CHoCH) &amp; Entry POI</span>
                      <p className="text-[#8E95A2] leading-relaxed">
                        The 5-Minute timeframe provides the definitive structural shift. Following a 15M liquidity sweep inside our 4H/1H zone, the 5M chart must print an impulsive Break of Structure (BOS/CHoCH).
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-4 rounded-xl bg-[#0E0F14] border border-[#181920] space-y-2">
                        <span className="font-bold text-[#10B981] flex items-center gap-1.5">
                          <CheckCircle2 className="h-4 w-4" /> 5M Entry Criteria
                        </span>
                        <ul className="space-y-1.5 text-[#8E95A2] list-disc list-inside">
                          <li>First Higher High (for Long) or Lower Low (for Short) printed after sweep.</li>
                          <li>Displacement candle must be decisively larger than preceding candles.</li>
                          <li>Locate 5M Fair Value Gap / Order Block formed during the shift.</li>
                        </ul>
                      </div>

                      <div className="p-4 rounded-xl bg-[#0E0F14] border border-[#181920] space-y-2">
                        <span className="font-bold text-[#EF4444] flex items-center gap-1.5">
                          <XCircle className="h-4 w-4" /> Execution Discipline
                        </span>
                        <ul className="space-y-1.5 text-[#8E95A2] list-disc list-inside">
                          <li>Never enter market on the displacement candle. Wait for the retracement return to base!</li>
                        </ul>
                      </div>
                    </div>
                  </>
                )}

                {selectedTimeframe === '1M' && (
                  <>
                    <div className="p-4 rounded-xl bg-[#0E0F14] border border-[#181920] space-y-2">
                      <span className="font-bold text-white text-sm block">Core Purpose: Sniper Precision &amp; Risk Compacting</span>
                      <p className="text-[#8E95A2] leading-relaxed">
                        The 1-Minute chart is exclusively used for trade entry. By waiting for a micro retest and rejection inside the 5M POI, we compact the stop loss to just 4-10 pips/points, unlocking 3R to 10R+ profit factors.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-4 rounded-xl bg-[#0E0F14] border border-[#181920] space-y-2">
                        <span className="font-bold text-[#10B981] flex items-center gap-1.5">
                          <CheckCircle2 className="h-4 w-4" /> 1M Execution Rules
                        </span>
                        <ul className="space-y-1.5 text-[#8E95A2] list-disc list-inside">
                          <li>Price returns into 5M FVG or 1M Order Block.</li>
                          <li>1M rejection wick or micro CHoCH confirms buyer/seller response.</li>
                          <li>Stop loss placed 1-2 points behind the absolute distal swing extreme.</li>
                        </ul>
                      </div>

                      <div className="p-4 rounded-xl bg-[#0E0F14] border border-[#181920] space-y-2">
                        <span className="font-bold text-[#EF4444] flex items-center gap-1.5">
                          <XCircle className="h-4 w-4" /> The 1M Golden Rule
                        </span>
                        <ul className="space-y-1.5 text-[#8E95A2] list-disc list-inside">
                          <li>NEVER look at 1M in isolation! 1M without 4H/Daily alignment is pure noise and account destruction.</li>
                        </ul>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Right 1 Col: Schematic Diagram & Quick Specs */}
            <div className="p-6 rounded-2xl bg-[#0A0B0E] border border-[#181920] space-y-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-[#A78BFA] uppercase tracking-wider mb-2">
                  <Activity className="h-4 w-4" />
                  <span>Execution Schematic</span>
                </div>
                <h4 className="text-sm font-bold text-white mb-3">Top-Down Order Flow Funnel</h4>

                {/* ASCII / Graphical Flow */}
                <div className="p-4 rounded-xl bg-[#0E0F14] border border-[#181920] font-mono text-[11px] text-[#A78BFA] space-y-2 leading-tight">
                  <div className="text-blue-400">1. WEEKLY BIAS  ───► Macro Trend (BULL/BEAR)</div>
                  <div className="text-indigo-400">2. DAILY BIAS    ───► Daily Range &amp; FVG Imbalance</div>
                  <div className="text-purple-400">3. 4H ZONE       ───► Fresh Unmitigated POI</div>
                  <div className="text-violet-400">4. 1H REFINEMENT ───► Base Candle &amp; Breaker Block</div>
                  <div className="text-amber-400">5. 15M SWEEP     ───► PDH/PDL or Asian High Sweep</div>
                  <div className="text-emerald-400">6. 5M CHoCH      ───► Displacement Break of Structure</div>
                  <div className="text-rose-400">7. 1M ENTRY      ───► Precision Invalidation (3R-10R)</div>
                </div>

                <div className="mt-4 p-3 rounded-xl bg-[#8B5CF6]/10 border border-[#8B5CF6]/20 text-xs text-[#A78BFA] space-y-1">
                  <span className="font-bold block">The Institutional Principle:</span>
                  <p className="text-[11px] text-[#8E95A2]">
                    Retail traders look at 1M/5M charts looking for double bottoms. Institutional traders engineer liquidity on 15M to fill orders waiting at 4H &amp; Daily supply/demand zones.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActiveTab('evaluator')}
                className="w-full py-2.5 rounded-xl bg-[#8B5CF6]/20 hover:bg-[#8B5CF6]/30 text-xs font-bold text-[#A78BFA] border border-[#8B5CF6]/40 transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <Calculator className="h-4 w-4" />
                <span>Test Live Setup in Evaluator</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ZONE ANATOMY & FRESHNESS */}
      {activeTab === 'zones' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-[#0A0B0E] border border-[#181920] space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-[#A78BFA]">Institutional Zone Engine</span>
            <h2 className="text-xl font-bold text-white">Anatomy of an Institutional Supply &amp; Demand Zone</h2>
            <p className="text-xs text-[#8E95A2] max-w-3xl leading-relaxed">
              A valid Supply or Demand zone is NOT a random line drawn through past candle wicks. It is the footprint of massive bank and algorithm limit order accumulation that displaced price violently enough to leave unfilled orders.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Fresh Zone */}
            <div className="p-6 rounded-2xl bg-[#0A0B0E] border border-[#10B981]/30 space-y-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#10B981]/10 rounded-full blur-xl pointer-events-none" />
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-full bg-[#10B981]/20 border border-[#10B981]/40 text-[#10B981] text-[11px] font-bold">
                  GRADE A+ (FRESH)
                </span>
                <span className="text-xs font-mono-num text-[#10B981]">0 Touches</span>
              </div>
              <h3 className="text-base font-bold text-white">Unmitigated Fresh Zone</h3>
              <p className="text-xs text-[#8E95A2] leading-relaxed">
                The zone was formed by a violent displacement move and price has NEVER returned to test it. All original institutional limit orders remain active and unfilled.
              </p>
              <div className="p-3 rounded-xl bg-[#0E0F14] border border-[#181920] space-y-1 text-xs">
                <span className="font-bold text-[#10B981]">Expected Reaction:</span>
                <p className="text-[#8E95A2] text-[11px]">
                  Immediate, aggressive rejection. Highest win-rate (72-80%) and lowest risk of deep slippage.
                </p>
              </div>
            </div>

            {/* Tested Zone */}
            <div className="p-6 rounded-2xl bg-[#0A0B0E] border border-[#F59E0B]/30 space-y-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#F59E0B]/10 rounded-full blur-xl pointer-events-none" />
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-full bg-[#F59E0B]/20 border border-[#F59E0B]/40 text-[#F59E0B] text-[11px] font-bold">
                  GRADE B (TESTED)
                </span>
                <span className="text-xs font-mono-num text-[#F59E0B]">1 Prior Touch</span>
              </div>
              <h3 className="text-base font-bold text-white">Once-Mitigated Zone</h3>
              <p className="text-xs text-[#8E95A2] leading-relaxed">
                Price previously tapped into the proximal line and reacted away. A portion of the unfilled orders were filled, leaving weaker residual demand or supply.
              </p>
              <div className="p-3 rounded-xl bg-[#0E0F14] border border-[#181920] space-y-1 text-xs">
                <span className="font-bold text-[#F59E0B]">Required Condition:</span>
                <p className="text-[#8E95A2] text-[11px]">
                  Requires aggressive 5M CHoCH confirmation. Position sizing must be reduced to half risk (0.5%).
                </p>
              </div>
            </div>

            {/* Depleted Zone */}
            <div className="p-6 rounded-2xl bg-[#0A0B0E] border border-[#EF4444]/30 space-y-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#EF4444]/10 rounded-full blur-xl pointer-events-none" />
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-full bg-[#EF4444]/20 border border-[#EF4444]/40 text-[#EF4444] text-[11px] font-bold">
                  INVALID (DEPLETED)
                </span>
                <span className="text-xs font-mono-num text-[#EF4444]">2+ Touches</span>
              </div>
              <h3 className="text-base font-bold text-white">Depleted Liquidity Pool</h3>
              <p className="text-xs text-[#8E95A2] leading-relaxed">
                Multiple touches have exhausted all institutional orders. The zone is now visible to retail traders as "support/resistance", accumulating dense stop-loss liquidity.
              </p>
              <div className="p-3 rounded-xl bg-[#0E0F14] border border-[#181920] space-y-1 text-xs">
                <span className="font-bold text-[#EF4444]">Trading Rule:</span>
                <p className="text-[#8E95A2] text-[11px]">
                  STRICTLY FORBIDDEN to take reversals here. Expect a violent breakout that sweeps the stops.
                </p>
              </div>
            </div>
          </div>

          {/* Detailed Zone Structural Spec */}
          <div className="p-6 rounded-2xl bg-[#0A0B0E] border border-[#181920] space-y-5">
            <h3 className="text-base font-bold text-white">The 3 Structural Boundaries of a Valid Zone</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-[#0E0F14] border border-[#181920] space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-purple-500" />
                  <span className="font-bold text-white">1. Proximal Line (Entry Boundary)</span>
                </div>
                <p className="text-[#8E95A2] leading-relaxed text-[11px]">
                  For a Demand zone: The highest body/wick of the base candle.
                  For a Supply zone: The lowest body/wick of the base candle.
                  This marks the boundary where price first engages the zone.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#0E0F14] border border-[#181920] space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-rose-500" />
                  <span className="font-bold text-white">2. Distal Line (Invalidation Point)</span>
                </div>
                <p className="text-[#8E95A2] leading-relaxed text-[11px]">
                  The absolute extreme swing low (demand) or extreme swing high (supply).
                  If price closes beyond the distal line, the institutional premise is 100% invalidated. Stop loss is always placed here.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#0E0F14] border border-[#181920] space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="font-bold text-white">3. Fair Value Gap (Imbalance)</span>
                </div>
                <p className="text-[#8E95A2] leading-relaxed text-[11px]">
                  The displacement candle leaving the zone must create a 3-candle imbalance (gap between Candle 1 extreme and Candle 3 extreme), proving aggressive one-sided institutional buying/selling.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: THE 5 CORE PLAYBOOK SETUPS */}
      {activeTab === 'setups' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-[#0A0B0E] border border-[#181920] space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#A78BFA]">Institutional Playbook</span>
            <h2 className="text-xl font-bold text-white">The 5 Battle-Tested Supply &amp; Demand Setups</h2>
            <p className="text-xs text-[#8E95A2]">
              Over 5 years of live market execution, these five high-expectancy setups have generated superior risk-adjusted returns while filtering out 90% of low-probability chop.
            </p>
          </div>

          <div className="space-y-4">
            {[
              {
                id: '1',
                name: 'HTF Supply & Demand Zone Reversal',
                category: 'Zone Reaction',
                winRate: '71.4%',
                avgR: '3.8R',
                bias: 'Direction of HTF Zone',
                summary: 'Price taps into an unmitigated 4H/1H fresh zone, sweeps intermediate liquidity on 15M, prints a 5M CHoCH displacement, and provides a 1M sniper entry on return to the origin.',
                criteria: [
                  'Fresh 4H or 1H unmitigated supply/demand zone',
                  '15M liquidity sweep inside or at the edge of the zone',
                  '5M energetic Change of Character (CHoCH)',
                  '1M confirmation retest into 5M Fair Value Gap',
                ],
                invalidation: '1M/5M close beyond the zone distal extreme line',
                targets: 'Opposing 1H/4H structural trouble zone or liquidity pool',
              },
              {
                id: '2',
                name: 'Previous Day HOD/LOD Liquidity Sweep',
                category: 'Liquidity Grab',
                winRate: '68.2%',
                avgR: '4.2R',
                bias: 'Reversal into Prior Day Value',
                summary: 'Price runs above Yesterday’s High (HOD) or below Yesterday’s Low (LOD) during London or NY Open to trigger retail breakout stops, then swiftly rejects back inside the range.',
                criteria: [
                  'Price crosses PDH or PDL during active Killzone session',
                  'Immediate rejection wick closing back inside previous day range on 15M',
                  'Aggressive 5M displacement breaking micro structure',
                  'Entry on 5M retest with stop loss above the sweep high/low',
                ],
                invalidation: 'A 15M candle body closes firmly outside the PDH/PDL range',
                targets: 'Daily 50% equilibrium or opposite session low/high',
              },
              {
                id: '3',
                name: 'Session Range Sweep & Expansion',
                category: 'Session Momentum',
                winRate: '66.8%',
                avgR: '3.2R',
                bias: 'Expansion into Macro Trend',
                summary: 'The Asian session builds a narrow liquidity range. London Open sweeps the Asian high or low (Judas Swing) directly into a HTF POI, sparking the real day’s trend.',
                criteria: [
                  'Asian Session range between 15-40 pips/points',
                  'London Open (07:00-08:30 UTC) sweeps either Asian High or Low',
                  'Sweep contacts an unmitigated 1H/4H institutional zone',
                  '5M structure shift confirms the Judas reversal',
                ],
                invalidation: 'Price continues expanding past the sweep without structure shift',
                targets: 'Opposite Asian session boundary then expansion target',
              },
              {
                id: '4',
                name: 'Multi-Timeframe Trend Continuation',
                category: 'Trend Following',
                winRate: '74.5%',
                avgR: '2.8R',
                bias: 'Aligned with Weekly & Daily',
                summary: 'Weekly, Daily, and 4H are in strong structural trend alignment. Price retraces into a 1H discount/premium mitigation block during killzone, and expands into new trend extremes.',
                criteria: [
                  'Weekly and Daily biases are strictly identical (Bullish or Bearish)',
                  '4H printing successive Higher Highs / Higher Lows (or LL/LH)',
                  '1H retracement to 50%-79% Fibonacci discount/premium',
                  '15M/5M Break of Structure (BOS) confirms resumption',
                ],
                invalidation: '1H close breaking the key higher low / lower high',
                targets: 'New swing high/low extension (min 2.0R to 3.0R)',
              },
              {
                id: '5',
                name: '15M/5M Liquidity Sweep & Displacement',
                category: 'Confirmation',
                winRate: '64.9%',
                avgR: '3.5R',
                bias: 'Intra-Session Reversal',
                summary: 'Equal highs or equal lows (retail double top/bottom) are purged by institutional participants, followed by an explosive displacement candle creating an unmitigated FVG.',
                criteria: [
                  'Clear relative equal highs (EQH) or equal lows (EQL) identified',
                  'Aggressive sweep wick taking out the accumulated stops',
                  'Violent displacement candle with high relative volume',
                  'Limit order entry placed at 50% of the newly formed FVG',
                ],
                invalidation: 'Price returns and breaches the origin of the displacement candle',
                targets: 'Next significant structural liquidity pool',
              },
            ].map((setup) => (
              <div key={setup.id} className="p-6 rounded-2xl bg-[#0A0B0E] border border-[#181920] space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#181920] pb-3">
                  <div className="flex items-center gap-3">
                    <span className="h-7 w-7 rounded-lg bg-[#8B5CF6]/20 border border-[#8B5CF6]/40 flex items-center justify-center font-bold text-xs text-[#A78BFA]">
                      #{setup.id}
                    </span>
                    <div>
                      <h3 className="text-base font-bold text-white">{setup.name}</h3>
                      <span className="text-[11px] text-[#A78BFA]">{setup.category}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-mono-num">
                    <div>
                      <span className="text-[10px] text-[#525866] block">Historical Win Rate</span>
                      <span className="font-bold text-[#10B981]">{setup.winRate}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#525866] block">Average Reward</span>
                      <span className="font-bold text-white">{setup.avgR}</span>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-[#E1E4EA] leading-relaxed">{setup.summary}</p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs pt-1">
                  <div className="p-3 rounded-xl bg-[#0E0F14] border border-[#181920] space-y-1.5">
                    <span className="font-bold text-[#10B981] flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Required Checklist
                    </span>
                    <ul className="space-y-1 text-[#8E95A2] text-[11px]">
                      {setup.criteria.map((c, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-[#A78BFA]">•</span>
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-3 rounded-xl bg-[#0E0F14] border border-[#181920] space-y-1.5">
                    <span className="font-bold text-[#EF4444] flex items-center gap-1">
                      <XCircle className="h-3.5 w-3.5" /> Invalidation Rule
                    </span>
                    <p className="text-[#8E95A2] text-[11px] leading-relaxed">{setup.invalidation}</p>
                  </div>

                  <div className="p-3 rounded-xl bg-[#0E0F14] border border-[#181920] space-y-1.5">
                    <span className="font-bold text-[#A78BFA] flex items-center gap-1">
                      <Target className="h-3.5 w-3.5" /> Target Expectancy
                    </span>
                    <p className="text-[#8E95A2] text-[11px] leading-relaxed">{setup.targets}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: 10-POINT CONFLUENCE RUBRIC */}
      {activeTab === 'confluence' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-[#0A0B0E] border border-[#181920] space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#A78BFA]">Scientific Edge</span>
            <h2 className="text-xl font-bold text-white">The 10-Point Confluence Scoring Rubric</h2>
            <p className="text-xs text-[#8E95A2]">
              Every trade logged in the SupplyFlow journal is audited against this exact mathematical rubric. No subjective guessing or emotional gut-feelings are permitted.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Criteria Breakdown (2 cols) */}
            <div className="lg:col-span-2 space-y-3">
              {[
                {
                  points: '+2 pts',
                  title: 'Weekly & Daily Macro Bias Alignment',
                  desc: 'Trade direction matches both the Weekly order flow and Daily candle bias. Trading with the macro flow eliminates 70% of fakeouts.',
                  category: 'Macro Alignment',
                },
                {
                  points: '+2 pts',
                  title: 'Fresh Unmitigated 4H or 1H Institutional Zone',
                  desc: 'Price is reacting to a virgin Supply or Demand base that has 0 prior mitigations and created aggressive displacement.',
                  category: 'Structural Location',
                },
                {
                  points: '+2 pts',
                  title: 'Significant Liquidity Sweep (PDH/PDL, Asian Range, or Equal Highs/Lows)',
                  desc: 'Stop orders were violently purged before the entry opportunity presented itself, fueling the institutional reversal.',
                  category: 'Liquidity Mechanics',
                },
                {
                  points: '+1 pt',
                  title: 'Displacement Market Structure Shift (CHoCH / BOS)',
                  desc: 'Energetic break of structure on 5M or 15M with candle bodies closing beyond the swing pivot with high volume.',
                  category: 'Structure Confirmation',
                },
                {
                  points: '+1 pt',
                  title: 'Active Session Killzone Timing',
                  desc: 'Execution takes place during peak institutional volatility: London Open (07:00-10:00 UTC) or NY Open (12:00-15:00 UTC).',
                  category: 'Session Timing',
                },
                {
                  points: '+1 pt',
                  title: 'Minimum 2.5R Risk-to-Reward Ratio',
                  desc: 'Distance to the first opposing structural trouble zone offers at least 2.5 times the stop-loss risk distance.',
                  category: 'Expectancy Math',
                },
                {
                  points: '+1 pt',
                  title: 'Fair Value Gap (FVG) / Order Block Imbalance',
                  desc: 'Clear 3-candle imbalance exists at the entry trigger, providing a magnet for the retest mitigation.',
                  category: 'Imbalance Confirmation',
                },
              ].map((item, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-[#0A0B0E] border border-[#181920] flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#A78BFA] px-1.5 py-0.5 rounded bg-[#8B5CF6]/15 border border-[#8B5CF6]/30">
                        {item.category}
                      </span>
                      <h4 className="text-xs font-bold text-white">{item.title}</h4>
                    </div>
                    <p className="text-[11px] text-[#8E95A2] leading-relaxed">{item.desc}</p>
                  </div>
                  <span className="font-mono-num font-extrabold text-sm text-[#10B981] px-2.5 py-1 rounded-lg bg-[#10B981]/15 border border-[#10B981]/30 shrink-0">
                    {item.points}
                  </span>
                </div>
              ))}
            </div>

            {/* Quality Grade Card (1 col) */}
            <div className="p-6 rounded-2xl bg-[#0A0B0E] border border-[#181920] space-y-5">
              <div className="border-b border-[#181920] pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-[#A78BFA] block">Grade Scale</span>
                <h3 className="text-base font-bold text-white mt-1">Confluence Tier System</h3>
              </div>

              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-[#10B981]/10 border border-[#10B981]/30 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-[#10B981]">GRADE A+ (9 - 10 PTS)</span>
                    <span className="text-xs font-bold text-white">Full Risk (1.5 - 2.0%)</span>
                  </div>
                  <p className="text-[11px] text-[#8E95A2]">
                    Flawless institutional alignment. Highest historical win-rate (~75%). Maximum position sizing allowed.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#8B5CF6]/10 border border-[#8B5CF6]/30 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-[#A78BFA]">GRADE A (7 - 8 PTS)</span>
                    <span className="text-xs font-bold text-white">Standard Risk (1.0%)</span>
                  </div>
                  <p className="text-[11px] text-[#8E95A2]">
                    High conviction setup with minor non-critical concession. Standard trading size.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/30 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-[#F59E0B]">GRADE B (5 - 6 PTS)</span>
                    <span className="text-xs font-bold text-white">Half Risk (0.5% max)</span>
                  </div>
                  <p className="text-[11px] text-[#8E95A2]">
                    Sub-optimal setup with missing confluence. Strict risk cap or wait for additional lower-timeframe confirmation.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/30 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-[#EF4444]">DISQUALIFIED (&lt; 5 PTS)</span>
                    <span className="text-xs font-bold text-[#EF4444]">0.0% (NO TRADE)</span>
                  </div>
                  <p className="text-[11px] text-[#8E95A2]">
                    Negative mathematical expectancy. Taking this trade is considered a catastrophic discipline violation.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActiveTab('evaluator')}
                className="w-full py-2.5 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] text-xs font-bold text-white transition-all cursor-pointer shadow-md shadow-[rgba(139,92,246,0.25)] flex items-center justify-center gap-2"
              >
                <Calculator className="h-4 w-4" />
                <span>Open Live Setup Evaluator</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: RISK & TRADE MANAGEMENT PROTOCOLS */}
      {activeTab === 'risk' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-[#0A0B0E] border border-[#181920] space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#A78BFA]">Mathematical Armor</span>
            <h2 className="text-xl font-bold text-white">The 5 Non-Negotiable Risk &amp; Execution Laws</h2>
            <p className="text-xs text-[#8E95A2]">
              Strategy without risk management is gambling. These five quantitative laws protect trading capital and ensure positive asymptotic expectancy over 1,000+ trade samples.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-[#0A0B0E] border border-[#181920] space-y-4">
              <div className="flex items-center gap-3">
                <span className="h-8 w-8 rounded-xl bg-[#10B981]/20 border border-[#10B981]/40 flex items-center justify-center font-bold text-sm text-[#10B981]">
                  1
                </span>
                <div>
                  <h3 className="text-sm font-bold text-white">The 1-2% Capital Allocation Rule</h3>
                  <span className="text-[11px] text-[#8E95A2]">Never compromise account survival</span>
                </div>
              </div>
              <p className="text-xs text-[#8E95A2] leading-relaxed">
                Risk per trade is strictly capped at 1.0% of total equity (2.0% maximum only on Grade A+ with full 7-timeframe alignment). If an account experiences a 5% peak-to-trough drawdown, risk is automatically halved to 0.5% until a new equity high is made.
              </p>
              <div className="p-3 rounded-xl bg-[#0E0F14] border border-[#181920] text-xs font-mono-num text-[#10B981]">
                Formula: Position Size = (Account Balance × Risk %) ÷ |Entry Price - Invalidation Price|
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-[#0A0B0E] border border-[#181920] space-y-4">
              <div className="flex items-center gap-3">
                <span className="h-8 w-8 rounded-xl bg-[#8B5CF6]/20 border border-[#8B5CF6]/40 flex items-center justify-center font-bold text-sm text-[#A78BFA]">
                  2
                </span>
                <div>
                  <h3 className="text-sm font-bold text-white">The 2.0R Minimum Asymmetry Hurdle</h3>
                  <span className="text-[11px] text-[#8E95A2]">Positive mathematical expectancy</span>
                </div>
              </div>
              <p className="text-xs text-[#8E95A2] leading-relaxed">
                No trade may be executed unless the distance from entry to the first major opposing structural trouble zone provides at least 2.0 times the dollar risk. A 45% win rate with a 2.5R average win produces an overwhelming edge.
              </p>
              <div className="p-3 rounded-xl bg-[#0E0F14] border border-[#181920] text-xs font-mono-num text-[#A78BFA]">
                Rule: Target Distance &gt;= 2.0 × Stop Loss Distance
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-[#0A0B0E] border border-[#181920] space-y-4">
              <div className="flex items-center gap-3">
                <span className="h-8 w-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center font-bold text-sm text-amber-400">
                  3
                </span>
                <div>
                  <h3 className="text-sm font-bold text-white">Structural Stop Loss (Zero Arbitrary Pips)</h3>
                  <span className="text-[11px] text-[#8E95A2]">Respecting market invalidation</span>
                </div>
              </div>
              <p className="text-xs text-[#8E95A2] leading-relaxed">
                Stop loss is never set to an arbitrary number of pips (e.g. 10 pips, 20 pips). It is placed strictly behind the structural distal line or the swing high/low that caused the displacement, plus a 1-2 pip spread buffer. If price hits this level, the trade idea was wrong.
              </p>
              <div className="p-3 rounded-xl bg-[#0E0F14] border border-[#181920] text-xs text-amber-400">
                Rule: SL = Distal Zone Line + Spread Buffer
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-[#0A0B0E] border border-[#181920] space-y-4">
              <div className="flex items-center gap-3">
                <span className="h-8 w-8 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center font-bold text-sm text-blue-400">
                  4
                </span>
                <div>
                  <h3 className="text-sm font-bold text-white">Breakeven &amp; Partial Scale-Out Protocol</h3>
                  <span className="text-[11px] text-[#8E95A2]">De-risking active exposure</span>
                </div>
              </div>
              <p className="text-xs text-[#8E95A2] leading-relaxed">
                Move stop loss to breakeven + commission ONLY after price achieves a 15M Break of Structure in trade direction or hits 1.5R. Never move to breakeven prematurely. Take 50% profits off the table at 2.0R to guarantee a winning trade, leaving a runner for 4R+.
              </p>
              <div className="p-3 rounded-xl bg-[#0E0F14] border border-[#181920] text-xs text-blue-400">
                Rule: 50% Partial at 2.0R • SL to BE after 1.5R / BOS
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-[#0A0B0E] border border-[#EF4444]/30 space-y-4 md:col-span-2">
              <div className="flex items-center gap-3">
                <span className="h-8 w-8 rounded-xl bg-[#EF4444]/20 border border-[#EF4444]/40 flex items-center justify-center font-bold text-sm text-[#EF4444]">
                  5
                </span>
                <div>
                  <h3 className="text-sm font-bold text-[#EF4444]">The 2-Loss Daily Circuit Breaker</h3>
                  <span className="text-[11px] text-[#8E95A2]">Psychological tilt and revenge trading defense</span>
                </div>
              </div>
              <p className="text-xs text-[#8E95A2] leading-relaxed">
                If the trader experiences 2 consecutive full losses in a single trading day, all open charts must be closed immediately and terminal shut down for the remainder of the session. Revenge trading after 2 losses account for 85% of catastrophic account drawdowns.
              </p>
              <div className="p-3 rounded-xl bg-[#0E0F14] border border-[#EF4444]/30 text-xs font-bold text-[#EF4444] flex items-center gap-2">
                <Lock className="h-4 w-4" />
                <span>Mandatory Action: Close platforms, review journal tomorrow morning.</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: LIVE SETUP EVALUATOR */}
      {activeTab === 'evaluator' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-[#0A0B0E] border border-[#181920] space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#A78BFA]">Real-Time Pre-Flight Check</span>
            <h2 className="text-xl font-bold text-white">Interactive Setup Confluence Evaluator</h2>
            <p className="text-xs text-[#8E95A2]">
              Audit any potential trade setup live against the 5-year methodology before risking a single cent of capital.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Checklist items (2 cols) */}
            <div className="lg:col-span-2 p-6 rounded-2xl bg-[#0A0B0E] border border-[#181920] space-y-5">
              <div className="flex items-center justify-between border-b border-[#181920] pb-4">
                <h3 className="text-sm font-bold text-white">Pre-Trade Confluence Checklist</h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#8E95A2]">Direction:</span>
                  <button
                    onClick={() => setEvalDirection(evalDirection === 'LONG' ? 'SHORT' : 'LONG')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                      evalDirection === 'LONG'
                        ? 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40'
                        : 'bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/40'
                    }`}
                  >
                    {evalDirection === 'LONG' ? 'LONG (BUY)' : 'SHORT (SELL)'}
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {[
                  {
                    state: evalWeeklyDailyAligned,
                    setState: setEvalWeeklyDailyAligned,
                    points: 2,
                    label: 'Weekly & Daily Macro Alignment',
                    desc: 'Weekly order flow and Daily candle bias authorize trading in this direction.',
                  },
                  {
                    state: evalFreshHTFZone,
                    setState: setEvalFreshHTFZone,
                    points: 2,
                    label: 'Fresh 4H or 1H Unmitigated Zone',
                    desc: 'Zone has 0 prior touches and originated from an energetic displacement.',
                  },
                  {
                    state: evalLiquiditySweep,
                    setState: setEvalLiquiditySweep,
                    points: 2,
                    label: 'Key Liquidity Sweep (PDH, PDL, Asian Range, or Equal Highs/Lows)',
                    desc: 'Retail stops were swept prior to the setup forming.',
                  },
                  {
                    state: evalStructureShift,
                    setState: setEvalStructureShift,
                    points: 1,
                    label: 'Market Structure Shift (CHoCH / BOS) with Displacement',
                    desc: 'Clear 5M/15M body close breaking prior swing pivot with momentum.',
                  },
                  {
                    state: evalKillzoneTiming,
                    setState: setEvalKillzoneTiming,
                    points: 1,
                    label: 'Active Killzone Timing (London / New York)',
                    desc: 'Trade is executed inside prime volatility hours (07-10 UTC or 12-15 UTC).',
                  },
                  {
                    state: evalMin2R,
                    setState: setEvalMin2R,
                    points: 1,
                    label: 'Minimum 2.5R Risk-to-Reward Achievable',
                    desc: 'Distance to opposing trouble zone provides >= 2.5 times the stop loss.',
                  },
                  {
                    state: evalImbalanceFVG,
                    setState: setEvalImbalanceFVG,
                    points: 1,
                    label: 'Fair Value Gap (FVG) / Imbalance Retest Confirmation',
                    desc: 'Unfilled institutional imbalance waiting at the entry point.',
                  },
                ].map((item, i) => (
                  <label
                    key={i}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                      item.state
                        ? 'bg-[#8B5CF6]/10 border-[#8B5CF6]/30'
                        : 'bg-[#0E0F14] border-[#181920] opacity-75 hover:opacity-100'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={item.state}
                      onChange={(e) => item.setState(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-[#272932] bg-[#0A0B0E] text-[#8B5CF6] focus:ring-0 cursor-pointer"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold ${item.state ? 'text-white' : 'text-[#8E95A2]'}`}>
                          {item.label}
                        </span>
                        <span className="text-xs font-mono-num font-bold text-[#A78BFA]">
                          +{item.points} pt{item.points > 1 ? 's' : ''}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#8E95A2] mt-0.5">{item.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Live Verdict Card (1 col) */}
            <div className="p-6 rounded-2xl bg-[#0A0B0E] border border-[#181920] space-y-6 flex flex-col justify-between">
              <div className="space-y-5">
                <div className="border-b border-[#181920] pb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#A78BFA] block">Real-Time Evaluation</span>
                  <h3 className="text-base font-bold text-white mt-1">Confluence Verdict</h3>
                </div>

                {/* Big Score Display */}
                <div className={`p-6 rounded-2xl border text-center space-y-2 ${currentGrade.bg} ${currentGrade.border}`}>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#8E95A2] block">Total Confluence Score</span>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-extrabold font-mono-num text-white">{evaluatorScore}</span>
                    <span className="text-sm font-mono-num text-[#8E95A2]">/ 10</span>
                  </div>
                  <div className={`text-lg font-extrabold ${currentGrade.color}`}>
                    GRADE {currentGrade.grade}
                  </div>
                  <span className="text-xs text-white/90 block font-medium">
                    {currentGrade.label}
                  </span>
                </div>

                {/* Risk Guidelines */}
                <div className="space-y-3 text-xs">
                  <div className="p-3 rounded-xl bg-[#0E0F14] border border-[#181920] flex items-center justify-between">
                    <span className="text-[#8E95A2]">Recommended Risk:</span>
                    <span className="font-bold text-white font-mono-num">{currentGrade.risk}</span>
                  </div>

                  <div className="p-3 rounded-xl bg-[#0E0F14] border border-[#181920] flex items-center justify-between">
                    <span className="text-[#8E95A2]">Target Expectancy:</span>
                    <span className="font-bold text-[#10B981] font-mono-num">2.5R to 5.0R</span>
                  </div>

                  <div className="p-3 rounded-xl bg-[#0E0F14] border border-[#181920] flex items-center justify-between">
                    <span className="text-[#8E95A2]">Breakeven Trigger:</span>
                    <span className="font-bold text-[#A78BFA]">1.5R or 15M BOS</span>
                  </div>
                </div>
              </div>

              {/* Action */}
              <div className="space-y-2 pt-4 border-t border-[#181920]">
                {onNewTradeWithFramework && evaluatorScore >= 5 ? (
                  <button
                    onClick={() =>
                      onNewTradeWithFramework({
                        direction: evalDirection,
                        confluenceScore: evaluatorScore,
                        tradeGrade: currentGrade.grade,
                        ruleChecklistCount: evaluatorScore,
                        riskRewardRatio: 2.5,
                        zoneQuality: evalFreshHTFZone ? 'FRESH' : 'TESTED',
                        bos: evalStructureShift,
                        choch: evalStructureShift,
                        previousDayHOD: evalDirection === 'SHORT' && evalLiquiditySweep,
                        previousDayLOD: evalDirection === 'LONG' && evalLiquiditySweep,
                        structureConfirmation: true,
                      })
                    }
                    className="w-full py-3 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] text-xs font-bold text-white transition-all cursor-pointer shadow-md shadow-[rgba(139,92,246,0.3)] flex items-center justify-center gap-2"
                  >
                    <Zap className="h-4 w-4" />
                    <span>Log Trade with This Confluence</span>
                  </button>
                ) : (
                  <div className="p-3 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/30 text-center text-xs font-bold text-[#EF4444]">
                    Setup Disqualified - Protect Capital (No Execution)
                  </div>
                )}

                {onBackToOverview && (
                  <button
                    onClick={onBackToOverview}
                    className="w-full py-2.5 rounded-xl border border-[#181920] bg-[#0E0F14] hover:bg-[#151720] text-xs font-semibold text-[#8E95A2] hover:text-white transition-colors cursor-pointer"
                  >
                    Return to Journal Dashboard
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
