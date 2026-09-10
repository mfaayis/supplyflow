import React, { useState, useMemo } from 'react';
import { TradeRecord } from '../../types';
import { calculateRollingWinRate } from '../../utils/calculations';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';
import { Activity, TrendingUp, TrendingDown, HelpCircle } from 'lucide-react';

interface RollingWinRateChartProps {
  trades: TradeRecord[];
}

export const RollingWinRateChart: React.FC<RollingWinRateChartProps> = ({ trades }) => {
  const [windowSize, setWindowSize] = useState<number>(20);

  const { points, overallWinRate } = useMemo(() => {
    return calculateRollingWinRate(trades, windowSize);
  }, [trades, windowSize]);

  // Derive stats
  const currentRolling = points.length > 0 ? points[points.length - 1].rollingWinRate : 0;
  const rollingValues = points.map((p) => p.rollingWinRate);
  const maxRolling = rollingValues.length > 0 ? Math.max(...rollingValues) : 0;
  const minRolling = rollingValues.length > 0 ? Math.min(...rollingValues) : 0;

  if (points.length < 3) {
    return (
      <div className="rounded-2xl border border-[#181920] bg-[#0A0B0E] p-6 text-center space-y-2">
        <Activity className="h-8 w-8 text-[#525866] mx-auto opacity-50" />
        <h3 className="text-sm font-bold text-white">Not Enough Trades for Rolling Win Rate</h3>
        <p className="text-xs text-[#8E95A2] max-w-md mx-auto">
          At least 3 closed trades are required to calculate a rolling window.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#181920] bg-[#0A0B0E] p-5 shadow-sm space-y-4">
      {/* Top Header & Window Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">
              Rolling Win Rate
            </h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#8B5CF6]/10 text-[#A78BFA] border border-[#8B5CF6]/20">
              Trailing {windowSize} Trades
            </span>
          </div>
          <p className="text-xs text-[#8E95A2] mt-0.5">
            Win rate over sliding trade windows to track performance trends.
          </p>
        </div>

        {/* Window Size Selector */}
        <div className="flex items-center gap-1.5 p-1 bg-[#0E0F14] rounded-xl border border-[#181920]">
          {[10, 20, 30, 50].map((size) => (
            <button
              key={size}
              onClick={() => setWindowSize(size)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                windowSize === size
                  ? 'bg-[#8B5CF6] text-white shadow-sm'
                  : 'text-[#8E95A2] hover:text-white'
              }`}
            >
              Last {size}
            </button>
          ))}
        </div>
      </div>

      {/* Trailing Metrics Summary Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-[#181920] bg-[#0E0F14] p-3">
          <span className="text-[10px] uppercase font-bold text-[#656B77] block">
            Current Rolling ({windowSize} Tr.)
          </span>
          <div className="text-xl font-mono-num font-bold text-white mt-1">
            {currentRolling.toFixed(1)}%
          </div>
          <span
            className={`text-[10px] font-semibold mt-0.5 flex items-center gap-1 ${
              currentRolling >= overallWinRate ? 'text-[#34D399]' : 'text-[#F87171]'
            }`}
          >
            {currentRolling >= overallWinRate ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {currentRolling >= overallWinRate ? 'Above' : 'Below'} Average ({overallWinRate}%)
          </span>
        </div>

        <div className="rounded-xl border border-[#181920] bg-[#0E0F14] p-3">
          <span className="text-[10px] uppercase font-bold text-[#656B77] block">
            Peak
          </span>
          <div className="text-xl font-mono-num font-bold text-[#34D399] mt-1">
            {maxRolling.toFixed(1)}%
          </div>
          <span className="text-[10px] text-[#525866] mt-0.5 block">
            Best {windowSize}-trade window
          </span>
        </div>

        <div className="rounded-xl border border-[#181920] bg-[#0E0F14] p-3">
          <span className="text-[10px] uppercase font-bold text-[#656B77] block">
            Low
          </span>
          <div className="text-xl font-mono-num font-bold text-[#F87171] mt-1">
            {minRolling.toFixed(1)}%
          </div>
          <span className="text-[10px] text-[#525866] mt-0.5 block">
            Lowest {windowSize}-trade window
          </span>
        </div>

        <div className="rounded-xl border border-[#181920] bg-[#0E0F14] p-3">
          <span className="text-[10px] uppercase font-bold text-[#656B77] block">
            Overall Win Rate
          </span>
          <div className="text-xl font-mono-num font-bold text-[#A78BFA] mt-1">
            {overallWinRate.toFixed(1)}%
          </div>
          <span className="text-[10px] text-[#525866] mt-0.5 block">
            Across all {points.length} trades
          </span>
        </div>
      </div>

      {/* Rolling Win Rate Chart */}
      <div className="h-64 sm:h-72 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#181920" vertical={false} />
            <XAxis
              dataKey="index"
              stroke="#525866"
              tickLine={false}
              tick={{ fontSize: 11, fill: '#8E95A2' }}
              tickFormatter={(val) => `T#${val}`}
            />
            <YAxis
              domain={[0, 100]}
              stroke="#525866"
              tickLine={false}
              tick={{ fontSize: 11, fill: '#8E95A2' }}
              tickFormatter={(val) => `${val}%`}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const data = payload[0].payload;
                const isWin = data.actualR > 0.05;
                const isLoss = data.actualR < -0.05;

                return (
                  <div className="rounded-xl border border-[#272A34] bg-[#0A0B0E]/95 p-3 shadow-xl backdrop-blur text-xs space-y-1.5 min-w-[190px]">
                    <div className="flex items-center justify-between pb-1 border-b border-[#181920]">
                      <span className="font-bold text-white">Trade #{data.index}</span>
                      <span className="font-mono text-[#8E95A2] text-[10px]">{data.date}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#8E95A2]">Pair &amp; Result:</span>
                      <span className="font-semibold text-white">
                        {data.pair}{' '}
                        <span
                          className={`font-mono text-[11px] ${
                            isWin ? 'text-[#34D399]' : isLoss ? 'text-[#F87171]' : 'text-[#94A3B8]'
                          }`}
                        >
                          ({data.result})
                        </span>
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#8E95A2]">Actual Outcome:</span>
                      <span
                        className={`font-mono font-bold ${
                          data.actualR > 0
                            ? 'text-[#34D399]'
                            : data.actualR < 0
                            ? 'text-[#F87171]'
                            : 'text-[#94A3B8]'
                        }`}
                      >
                        {data.actualR > 0 ? '+' : ''}
                        {data.actualR.toFixed(2)}R
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-[#181920]">
                      <span className="text-[#A78BFA] font-medium">Rolling ({data.windowSize} Tr.):</span>
                      <span className="font-mono font-bold text-white text-sm">
                        {data.rollingWinRate.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                );
              }}
            />
            {/* Overall Benchmark Line */}
            <ReferenceLine
              y={overallWinRate}
              stroke="#A78BFA"
              strokeDasharray="4 4"
              label={{
                value: `Avg: ${overallWinRate}%`,
                fill: '#A78BFA',
                fontSize: 10,
                position: 'right',
              }}
            />
            {/* 50% Threshold Line */}
            <ReferenceLine y={50} stroke="#333742" strokeDasharray="2 2" />

            <Line
              type="monotone"
              dataKey="rollingWinRate"
              stroke="#8B5CF6"
              strokeWidth={2.5}
              dot={{ r: 2.5, fill: '#8B5CF6' }}
              activeDot={{ r: 5, fill: '#C4B5FD', stroke: '#8B5CF6', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-between text-[11px] text-[#656B77] pt-1">
        <span>* Horizontal dashed violet line marks your overall baseline win rate ({overallWinRate}%).</span>
        <span>Rolling formula: (Profitable trades in trailing {windowSize} ÷ Completed trades in window) × 100</span>
      </div>
    </div>
  );
};
