import React, { useState } from 'react';
import { TradeFilterCriteria, PairSymbol, SessionType, MarketBias, ZoneQuality } from '../../types';
import { Filter, RotateCcw, ChevronDown, ChevronUp, CheckCircle2, SlidersHorizontal } from 'lucide-react';

interface AnalyticsFilterBarProps {
  criteria: TradeFilterCriteria;
  onChange: (criteria: TradeFilterCriteria) => void;
  onReset: () => void;
  availablePairs: string[];
  totalTradesCount: number;
  filteredTradesCount: number;
}

export const AnalyticsFilterBar: React.FC<AnalyticsFilterBarProps> = ({
  criteria,
  onChange,
  onReset,
  availablePairs,
  totalTradesCount,
  filteredTradesCount,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Count active filters
  const activeFilterCount = Object.entries(criteria).filter(([key, val]) => {
    if (val === undefined || val === null || val === 'ALL' || val === 'ANY') return false;
    if (key === 'dateRangePreset' && val === 'ALL') return false;
    return true;
  }).length;

  const updateField = <K extends keyof TradeFilterCriteria>(key: K, value: TradeFilterCriteria[K]) => {
    onChange({
      ...criteria,
      [key]: value,
    });
  };

  return (
    <div className="rounded-2xl border border-[#181920] bg-[#0A0B0E] p-4 sm:p-5 shadow-sm space-y-4">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-[#8B5CF6]/10 text-[#A78BFA] border border-[#8B5CF6]/20">
            <SlidersHorizontal className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                Filters
              </h3>
              {activeFilterCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#8B5CF6] text-white">
                  {activeFilterCount} Active
                </span>
              )}
            </div>
            <p className="text-xs text-[#8E95A2] mt-0.5">
              Showing <span className="font-mono font-semibold text-white">{filteredTradesCount}</span> of{' '}
              <span className="font-mono font-semibold text-[#8E95A2]">{totalTradesCount}</span> trades
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeFilterCount > 0 && (
            <button
              onClick={onReset}
              className="px-3 py-1.5 rounded-xl border border-[#272A34] bg-[#0E0F14] hover:bg-[#181920] text-xs font-semibold text-[#F87171] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Clear
            </button>
          )}

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-3 py-1.5 rounded-xl border border-[#272A34] bg-[#0E0F14] hover:bg-[#181920] text-xs font-semibold text-white flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Filter className="h-3.5 w-3.5 text-[#A78BFA]" />
            {isExpanded ? 'Fewer Filters' : 'More Filters'}
            {isExpanded ? <ChevronUp className="h-3.5 w-3.5 ml-0.5" /> : <ChevronDown className="h-3.5 w-3.5 ml-0.5" />}
          </button>
        </div>
      </div>

      {/* Primary Quick Filters (Always Visible) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-1">
        {/* Pair */}
        <div>
          <label className="text-[10px] uppercase font-bold text-[#656B77] block mb-1">Pair</label>
          <select
            value={criteria.pair || 'ALL'}
            onChange={(e) => updateField('pair', e.target.value as PairSymbol | 'ALL')}
            className="w-full h-9 rounded-xl border border-[#1E2028] bg-[#0E0F14] px-2.5 text-xs text-white font-medium focus:border-[#8B5CF6] focus:outline-none"
          >
            <option value="ALL">All Pairs</option>
            {availablePairs.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        {/* Direction */}
        <div>
          <label className="text-[10px] uppercase font-bold text-[#656B77] block mb-1">Direction</label>
          <select
            value={criteria.direction || 'ALL'}
            onChange={(e) => updateField('direction', e.target.value as 'ALL' | 'BUY' | 'SELL')}
            className="w-full h-9 rounded-xl border border-[#1E2028] bg-[#0E0F14] px-2.5 text-xs text-white font-medium focus:border-[#8B5CF6] focus:outline-none"
          >
            <option value="ALL">All Directions</option>
            <option value="BUY">Buy / Long</option>
            <option value="SELL">Sell / Short</option>
          </select>
        </div>

        {/* Session */}
        <div>
          <label className="text-[10px] uppercase font-bold text-[#656B77] block mb-1">Session</label>
          <select
            value={criteria.session || 'ALL'}
            onChange={(e) => updateField('session', e.target.value as SessionType | 'ALL')}
            className="w-full h-9 rounded-xl border border-[#1E2028] bg-[#0E0F14] px-2.5 text-xs text-white font-medium focus:border-[#8B5CF6] focus:outline-none"
          >
            <option value="ALL">All Sessions</option>
            <option value="NEW YORK">New York</option>
            <option value="LONDON">London</option>
            <option value="ASIA">Asia</option>
            <option value="OTHER">Other</option>
          </select>
        </div>

        {/* Date Range */}
        <div>
          <label className="text-[10px] uppercase font-bold text-[#656B77] block mb-1">Date Range</label>
          <select
            value={criteria.dateRangePreset || 'ALL'}
            onChange={(e) =>
              updateField(
                'dateRangePreset',
                e.target.value as 'ALL' | 'TODAY' | 'LAST_7D' | 'LAST_30D' | 'LAST_90D' | 'CUSTOM'
              )
            }
            className="w-full h-9 rounded-xl border border-[#1E2028] bg-[#0E0F14] px-2.5 text-xs text-white font-medium focus:border-[#8B5CF6] focus:outline-none"
          >
            <option value="ALL">All Time</option>
            <option value="TODAY">Today</option>
            <option value="LAST_7D">Last 7 Days</option>
            <option value="LAST_30D">Last 30 Days</option>
            <option value="LAST_90D">Last 90 Days</option>
          </select>
        </div>

        {/* Timeframe Alignment */}
        <div>
          <label className="text-[10px] uppercase font-bold text-[#656B77] block mb-1">TF Alignment</label>
          <select
            value={criteria.alignedTimeframes !== undefined ? criteria.alignedTimeframes : 'ALL'}
            onChange={(e) =>
              updateField(
                'alignedTimeframes',
                e.target.value === 'ALL' ? 'ALL' : Number(e.target.value)
              )
            }
            className="w-full h-9 rounded-xl border border-[#1E2028] bg-[#0E0F14] px-2.5 text-xs text-white font-medium focus:border-[#8B5CF6] focus:outline-none"
          >
            <option value="ALL">All Alignments</option>
            <option value="7">7/7 Aligned</option>
            <option value="6">6/7 Aligned</option>
            <option value="5">5/7 Aligned</option>
            <option value="4">&le; 4/7 Aligned</option>
          </select>
        </div>

        {/* Confluence Score */}
        <div>
          <label className="text-[10px] uppercase font-bold text-[#656B77] block mb-1">Confluence</label>
          <select
            value={criteria.confluenceScoreTier || 'ALL'}
            onChange={(e) =>
              updateField('confluenceScoreTier', e.target.value as 'ALL' | '7+' | '5-6' | '3-4' | '0-2')
            }
            className="w-full h-9 rounded-xl border border-[#1E2028] bg-[#0E0F14] px-2.5 text-xs text-white font-medium focus:border-[#8B5CF6] focus:outline-none"
          >
            <option value="ALL">All Confluences</option>
            <option value="7+">7+ Confluences</option>
            <option value="5-6">5–6 Confluences</option>
            <option value="3-4">3–4 Confluences</option>
            <option value="0-2">0–2 Confluences</option>
          </select>
        </div>
      </div>

      {/* Advanced Filter Collapsible Section */}
      {isExpanded && (
        <div className="pt-4 border-t border-[#181920] space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Section 1: Supply & Demand Execution Context */}
          <div>
            <span className="text-[11px] uppercase tracking-wider font-bold text-[#A78BFA] block mb-2">
              Zone &amp; Confluence
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2.5">
              {/* Supply vs Demand */}
              <div>
                <label className="text-[10px] uppercase font-bold text-[#656B77] block mb-1">
                  Zone Type
                </label>
                <select
                  value={criteria.zoneType || 'ALL'}
                  onChange={(e) => updateField('zoneType', e.target.value as 'ALL' | 'SUPPLY' | 'DEMAND')}
                  className="w-full h-9 rounded-xl border border-[#1E2028] bg-[#0E0F14] px-2.5 text-xs text-white focus:border-[#8B5CF6] focus:outline-none"
                >
                  <option value="ALL">All Zones</option>
                  <option value="SUPPLY">Supply Zone</option>
                  <option value="DEMAND">Demand Zone</option>
                </select>
              </div>

              {/* Zone Quality */}
              <div>
                <label className="text-[10px] uppercase font-bold text-[#656B77] block mb-1">
                  Zone Quality
                </label>
                <select
                  value={criteria.zoneQuality || 'ALL'}
                  onChange={(e) => updateField('zoneQuality', e.target.value as ZoneQuality | 'ALL')}
                  className="w-full h-9 rounded-xl border border-[#1E2028] bg-[#0E0F14] px-2.5 text-xs text-white focus:border-[#8B5CF6] focus:outline-none"
                >
                  <option value="ALL">All Qualities</option>
                  <option value="FRESH">Fresh Zone</option>
                  <option value="TESTED ONCE">Tested Once</option>
                  <option value="TESTED MULTIPLE TIMES">Tested Multiple Times</option>
                  <option value="WEAK / UNCLEAR">Weak / Unclear</option>
                </select>
              </div>

              {/* HOD/LOD Confluence */}
              <div>
                <label className="text-[10px] uppercase font-bold text-[#656B77] block mb-1">
                  Liquidity Reference
                </label>
                <select
                  value={criteria.hodLodConfluence || 'ANY'}
                  onChange={(e) =>
                    updateField(
                      'hodLodConfluence',
                      e.target.value as 'ANY' | 'HOD' | 'LOD' | 'TWO_DAY_HOD' | 'TWO_DAY_LOD' | 'KEY_LEVEL' | 'NONE'
                    )
                  }
                  className="w-full h-9 rounded-xl border border-[#1E2028] bg-[#0E0F14] px-2.5 text-xs text-white focus:border-[#8B5CF6] focus:outline-none"
                >
                  <option value="ANY">Any</option>
                  <option value="HOD">Previous Day HOD</option>
                  <option value="LOD">Previous Day LOD</option>
                  <option value="TWO_DAY_HOD">Two-Day HOD</option>
                  <option value="TWO_DAY_LOD">Two-Day LOD</option>
                  <option value="KEY_LEVEL">Key Level</option>
                  <option value="NONE">None</option>
                </select>
              </div>

              {/* Confirmation Type */}
              <div>
                <label className="text-[10px] uppercase font-bold text-[#656B77] block mb-1">
                  Confirmation Type
                </label>
                <select
                  value={criteria.confirmationType || 'ANY'}
                  onChange={(e) =>
                    updateField(
                      'confirmationType',
                      e.target.value as 'ANY' | 'BOS' | 'CHOCH' | 'STRUCTURE' | 'PRICE_ACTION' | 'CANDLE' | 'NONE'
                    )
                  }
                  className="w-full h-9 rounded-xl border border-[#1E2028] bg-[#0E0F14] px-2.5 text-xs text-white focus:border-[#8B5CF6] focus:outline-none"
                >
                  <option value="ANY">Any Confirmation</option>
                  <option value="BOS">BOS (Break of Structure)</option>
                  <option value="CHOCH">CHoCH (Change of Character)</option>
                  <option value="STRUCTURE">Structure Confirmation</option>
                  <option value="PRICE_ACTION">Price Action Rejection</option>
                  <option value="CANDLE">Candle Confirmation</option>
                  <option value="NONE">None</option>
                </select>
              </div>

              {/* Setup Grade */}
              <div>
                <label className="text-[10px] uppercase font-bold text-[#656B77] block mb-1">
                  Setup Grade
                </label>
                <select
                  value={criteria.setupGrade || 'ALL'}
                  onChange={(e) => updateField('setupGrade', e.target.value as 'ALL' | 'A+' | 'A' | 'B' | 'C')}
                  className="w-full h-9 rounded-xl border border-[#1E2028] bg-[#0E0F14] px-2.5 text-xs text-white focus:border-[#8B5CF6] focus:outline-none"
                >
                  <option value="ALL">All Grades</option>
                  <option value="A+">Grade A+</option>
                  <option value="A">Grade A</option>
                  <option value="B">Grade B</option>
                  <option value="C">Grade C</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Timeframe Biases (Weekly down to 1M) */}
          <div>
            <span className="text-[11px] uppercase tracking-wider font-bold text-[#A78BFA] block mb-2">
              Individual Timeframe Biases
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              {(
                [
                  { label: 'Weekly', field: 'weeklyBias' },
                  { label: 'Daily', field: 'dailyBias' },
                  { label: '4-Hour', field: 'h4Bias' },
                  { label: '1-Hour', field: 'h1Bias' },
                  { label: '15-Min', field: 'm15Bias' },
                  { label: '5-Min', field: 'm5Bias' },
                  { label: '1-Min', field: 'm1Bias' },
                ] as const
              ).map(({ label, field }) => (
                <div key={field}>
                  <label className="text-[10px] uppercase font-bold text-[#656B77] block mb-1">
                    {label}
                  </label>
                  <select
                    value={(criteria[field] as string) || 'ALL'}
                    onChange={(e) => updateField(field, e.target.value as MarketBias | 'ALL')}
                    className="w-full h-8 rounded-lg border border-[#1E2028] bg-[#0E0F14] px-2 text-[11px] text-white focus:border-[#8B5CF6] focus:outline-none"
                  >
                    <option value="ALL">Any</option>
                    <option value="BULLISH">Bullish</option>
                    <option value="BEARISH">Bearish</option>
                    <option value="NEUTRAL">Neutral</option>
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Discipline & Rules Tracking */}
          <div>
            <span className="text-[11px] uppercase tracking-wider font-bold text-[#A78BFA] block mb-2">
              Discipline
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {/* Plan Followed */}
              <div>
                <label className="text-[10px] uppercase font-bold text-[#656B77] block mb-1">
                  Plan Followed
                </label>
                <select
                  value={criteria.followedPlan || 'ALL'}
                  onChange={(e) => updateField('followedPlan', e.target.value as 'ALL' | 'YES' | 'NO')}
                  className="w-full h-9 rounded-xl border border-[#1E2028] bg-[#0E0F14] px-2.5 text-xs text-white focus:border-[#8B5CF6] focus:outline-none"
                >
                  <option value="ALL">All Trades</option>
                  <option value="YES">Followed Plan</option>
                  <option value="NO">Broke Rules</option>
                </select>
              </div>

              {/* Mistake Type */}
              <div>
                <label className="text-[10px] uppercase font-bold text-[#656B77] block mb-1">
                  Mistake
                </label>
                <select
                  value={criteria.mistakeType || 'ALL'}
                  onChange={(e) => updateField('mistakeType', e.target.value)}
                  className="w-full h-9 rounded-xl border border-[#1E2028] bg-[#0E0F14] px-2.5 text-xs text-white focus:border-[#8B5CF6] focus:outline-none"
                >
                  <option value="ALL">All Trades</option>
                  <option value="NONE">No Mistakes</option>
                  <option value="FOMO">FOMO Entry</option>
                  <option value="Revenge Trade">Revenge Trade</option>
                  <option value="Moved SL">Moved Stop Loss</option>
                  <option value="Early Exit">Early Exit / Cut Winner</option>
                  <option value="Overtraded">Overtraded</option>
                  <option value="Traded Outside Session">Traded Outside Session</option>
                  <option value="Ignored HTF">Ignored HTF Bias</option>
                </select>
              </div>

              {/* Planned R:R Minimum */}
              <div>
                <label className="text-[10px] uppercase font-bold text-[#656B77] block mb-1">
                  Planned R:R
                </label>
                <select
                  value={criteria.plannedRRMin !== undefined ? criteria.plannedRRMin : 'ALL'}
                  onChange={(e) =>
                    updateField(
                      'plannedRRMin',
                      e.target.value === 'ALL' ? 'ALL' : Number(e.target.value)
                    )
                  }
                  className="w-full h-9 rounded-xl border border-[#1E2028] bg-[#0E0F14] px-2.5 text-xs text-white focus:border-[#8B5CF6] focus:outline-none"
                >
                  <option value="ALL">All R:R</option>
                  <option value="2.0">&ge; 2.0R</option>
                  <option value="3.0">&ge; 3.0R</option>
                  <option value="1.5">&ge; 1.5R</option>
                </select>
              </div>

              {/* Source (Personal vs Livestream) */}
              <div>
                <label className="text-[10px] uppercase font-bold text-[#656B77] block mb-1">
                  Trade Source
                </label>
                <select
                  value={criteria.source || 'ALL'}
                  onChange={(e) => updateField('source', e.target.value as 'ALL' | 'PERSONAL' | 'LIVESTREAM')}
                  className="w-full h-9 rounded-xl border border-[#1E2028] bg-[#0E0F14] px-2.5 text-xs text-white focus:border-[#8B5CF6] focus:outline-none"
                >
                  <option value="ALL">All Sources</option>
                  <option value="PERSONAL">Personal</option>
                  <option value="LIVESTREAM">Livestream</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
