import React, { useState, useMemo } from 'react';
import { TradeRecord, CurrencyCode } from '../../types';
import {
  calculatePeriodicMetrics,
  TimeAggregation,
  AggregationMetric,
} from '../../utils/calculations';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';
import { Calendar, BarChart2 } from 'lucide-react';

interface PeriodicWinRateChartProps {
  trades: TradeRecord[];
  currency: CurrencyCode;
}

export const PeriodicWinRateChart: React.FC<PeriodicWinRateChartProps> = ({ trades, currency }) => {
  const [aggregation, setAggregation] = useState<TimeAggregation>('weekly');
  const [metric, setMetric] = useState<AggregationMetric>('winRate');

  const data = useMemo(() => {
    return calculatePeriodicMetrics(trades, aggregation, metric, currency);
  }, [trades, aggregation, metric, currency]);

  const metricLabel = {
    winRate: 'Win Rate (%)',
    averageR: 'Average R (per trade)',
    totalR: 'Total Return (R)',
    expectancy: 'Expectancy (R/trade)',
  }[metric];

  if (data.length === 0) {
    return (
      <div className="rounded-2xl border border-[#181920] bg-[#0A0B0E] p-6 text-center space-y-2">
        <Calendar className="h-8 w-8 text-[#525866] mx-auto opacity-50" />
        <h3 className="text-sm font-bold text-white">No Trade Data</h3>
        <p className="text-xs text-[#8E95A2]">
          Closed trades will appear here grouped by day, week, or month.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#181920] bg-[#0A0B0E] p-5 shadow-sm space-y-4">
      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">
              Win Rate by Period
            </h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#8B5CF6]/10 text-[#A78BFA] border border-[#8B5CF6]/20 capitalize">
              {aggregation}
            </span>
          </div>
          <p className="text-xs text-[#8E95A2] mt-0.5">
            Performance broken down by day, week, or month.
          </p>
        </div>

        {/* Aggregation & Metric Toggles */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Time Aggregation Toggle */}
          <div className="flex items-center gap-1 p-1 bg-[#0E0F14] rounded-xl border border-[#181920]">
            {(['daily', 'weekly', 'monthly'] as const).map((agg) => (
              <button
                key={agg}
                onClick={() => setAggregation(agg)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg capitalize transition-colors cursor-pointer ${
                  aggregation === agg
                    ? 'bg-[#8B5CF6] text-white shadow-sm'
                    : 'text-[#8E95A2] hover:text-white'
                }`}
              >
                {agg}
              </button>
            ))}
          </div>

          {/* Metric Selector */}
          <div className="flex items-center gap-1 p-1 bg-[#0E0F14] rounded-xl border border-[#181920]">
            {(
              [
                { id: 'winRate', label: 'Win Rate' },
                { id: 'averageR', label: 'Avg R' },
                { id: 'totalR', label: 'Total R' },
                { id: 'expectancy', label: 'Expectancy' },
              ] as const
            ).map((m) => (
              <button
                key={m.id}
                onClick={() => setMetric(m.id)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  metric === m.id
                    ? 'bg-[#272A34] text-white font-bold border border-[#3E4352]'
                    : 'text-[#8E95A2] hover:text-white'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bar Chart */}
      <div className="h-64 sm:h-72 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#181920" vertical={false} />
            <XAxis
              dataKey="label"
              stroke="#525866"
              tickLine={false}
              tick={{ fontSize: 11, fill: '#8E95A2' }}
            />
            <YAxis
              stroke="#525866"
              tickLine={false}
              tick={{ fontSize: 11, fill: '#8E95A2' }}
              tickFormatter={(val) => (metric === 'winRate' ? `${val}%` : `${val}R`)}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const point = payload[0].payload;
                return (
                  <div className="rounded-xl border border-[#272A34] bg-[#0A0B0E]/95 p-3 shadow-xl backdrop-blur text-xs space-y-2 min-w-[210px]">
                    <div className="flex items-center justify-between pb-1 border-b border-[#181920]">
                      <span className="font-bold text-white">{point.label}</span>
                      <span className="font-mono text-[11px] text-[#8E95A2]">
                        {point.totalTrades} {point.totalTrades === 1 ? 'trade' : 'trades'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 py-1 bg-[#0E0F14] p-2 rounded-lg text-center font-mono">
                      <div>
                        <span className="text-[9px] uppercase text-[#656B77] block">Wins</span>
                        <span className="text-[#34D399] font-bold text-xs">{point.wins}</span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase text-[#656B77] block">Losses</span>
                        <span className="text-[#F87171] font-bold text-xs">{point.losses}</span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase text-[#656B77] block">BE</span>
                        <span className="text-[#94A3B8] font-bold text-xs">{point.breakevens}</span>
                      </div>
                    </div>

                    <div className="space-y-1 pt-0.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[#8E95A2]">Win Rate:</span>
                        <span className="font-mono font-bold text-white">{point.winRate}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[#8E95A2]">Loss Rate:</span>
                        <span className="font-mono font-bold text-[#F87171]">{point.lossRate}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[#8E95A2]">Total Return:</span>
                        <span
                          className={`font-mono font-bold ${
                            point.totalR >= 0 ? 'text-[#34D399]' : 'text-[#F87171]'
                          }`}
                        >
                          {point.totalR >= 0 ? '+' : ''}
                          {point.totalR.toFixed(2)}R
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[#8E95A2]">Expectancy:</span>
                        <span
                          className={`font-mono font-bold ${
                            point.expectancy >= 0 ? 'text-[#A78BFA]' : 'text-[#F87171]'
                          }`}
                        >
                          {point.expectancy >= 0 ? '+' : ''}
                          {point.expectancy.toFixed(2)}R
                        </span>
                      </div>
                    </div>
                  </div>
                );
              }}
            />
            <Bar dataKey="value" radius={[6, 6, 0, 0]}>
              {data.map((entry, index) => {
                let fill = '#8B5CF6';
                if (metric === 'winRate') {
                  fill = entry.winRate >= 60 ? '#34D399' : entry.winRate >= 45 ? '#8B5CF6' : '#F87171';
                } else {
                  fill = entry.value >= 0 ? '#34D399' : '#F87171';
                }
                return <Cell key={`cell-${index}`} fill={fill} opacity={0.9} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap items-center justify-between text-[11px] text-[#656B77] pt-1">
        <span>Active display metric: <strong className="text-white">{metricLabel}</strong></span>
        <span>Hover any period column to view full Win / Loss / Breakeven breakdown.</span>
      </div>
    </div>
  );
};
