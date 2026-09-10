import React, { useState, useMemo, useRef } from 'react';
import { EquityPoint } from '../../utils/calculations';
import { CurrencyCode } from '../../types';

interface EquityChartProps {
  data: EquityPoint[];
  currency?: CurrencyCode;
  height?: number;
  initialMode?: 'R' | 'PNL' | 'PERCENT';
  showControls?: boolean;
}

export const EquityChart: React.FC<EquityChartProps> = ({
  data,
  currency = 'USD',
  height = 240,
  initialMode = 'R',
  showControls = true,
}) => {
  const [metricMode, setMetricMode] = useState<'R' | 'PNL' | 'PERCENT'>(initialMode);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const values = useMemo(() => {
    return data.map((d) => {
      if (metricMode === 'R') return d.cumulativeR;
      if (metricMode === 'PNL') return d.cumulativePnl;
      return d.cumulativePercent;
    });
  }, [data, metricMode]);

  const maxVal = useMemo(() => Math.max(...values, 0), [values]);
  const minVal = useMemo(() => Math.min(...values, 0), [values]);
  const range = maxVal - minVal || 1;

  // Chart coordinates calculation
  const paddingX = 36;
  const paddingY = 24;
  const chartWidth = 700;
  const chartHeight = height;

  const points = useMemo(() => {
    if (data.length <= 1) return [];
    const stepX = (chartWidth - paddingX * 2) / (data.length - 1);
    return values.map((val, i) => {
      const x = paddingX + i * stepX;
      // y inverted: top is maxVal, bottom is minVal
      const y = paddingY + ((maxVal - val) / range) * (chartHeight - paddingY * 2);
      return { x, y, val, pointData: data[i] };
    });
  }, [data, values, maxVal, range, chartHeight]);

  const zeroY = useMemo(() => {
    return paddingY + ((maxVal - 0) / range) * (chartHeight - paddingY * 2);
  }, [maxVal, range, chartHeight]);

  // Smooth SVG Path string
  const pathD = useMemo(() => {
    if (points.length === 0) return '';
    return points.reduce((acc, p, i, arr) => {
      if (i === 0) return `M ${p.x},${p.y}`;
      // Smooth cubic bezier curve
      const prev = arr[i - 1];
      const cx1 = prev.x + (p.x - prev.x) / 2;
      const cy1 = prev.y;
      const cx2 = prev.x + (p.x - prev.x) / 2;
      const cy2 = p.y;
      return `${acc} C ${cx1},${cy1} ${cx2},${cy2} ${p.x},${p.y}`;
    }, '');
  }, [points]);

  // Area under curve fill
  const areaD = useMemo(() => {
    if (points.length === 0) return '';
    const last = points[points.length - 1];
    const first = points[0];
    return `${pathD} L ${last.x},${zeroY} L ${first.x},${zeroY} Z`;
  }, [pathD, points, zeroY]);

  const activePoint = hoverIndex !== null && points[hoverIndex] ? points[hoverIndex] : points[points.length - 1];

  const formatValue = (val: number) => {
    if (metricMode === 'R') return `${val >= 0 ? '+' : ''}${val.toFixed(2)}R`;
    if (metricMode === 'PNL') {
      const sym = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '₹';
      return `${val >= 0 ? '+' : '-'}${sym}${Math.abs(val).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    }
    return `${val >= 0 ? '+' : ''}${val.toFixed(1)}%`;
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!containerRef.current || points.length <= 1) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, (clientX - paddingX) / (chartWidth - paddingX * 2)));
    const closestIdx = Math.round(ratio * (points.length - 1));
    if (closestIdx >= 0 && closestIdx < points.length) {
      setHoverIndex(closestIdx);
    }
  };

  if (data.length <= 1) {
    return (
      <div className="flex h-48 w-full flex-col items-center justify-center rounded-2xl border border-[#181920] bg-[#0A0B0E] text-center p-6">
        <p className="text-sm text-[#8E95A2]">Record more trades to plot the equity curve</p>
      </div>
    );
  }

  const latestVal = values[values.length - 1] || 0;
  const isPositive = latestVal >= 0;

  return (
    <div className="w-full flex flex-col rounded-2xl border border-[#181920] bg-[#0A0B0E] p-4.5 shadow-sm">
      {/* Chart Header with Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#8E95A2]">
              Equity Curve
            </span>
            <span
              className={`font-mono-num text-xs font-semibold px-2 py-0.5 rounded-md ${
                isPositive
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
              }`}
            >
              {formatValue(latestVal)}
            </span>
          </div>
          {activePoint && (
            <p className="text-xs text-[#8E95A2] mt-0.5 font-mono-num">
              Trade #{activePoint.pointData.index} • {activePoint.pointData.pair} ({activePoint.pointData.date})
            </p>
          )}
        </div>

        {showControls && (
          <div className="flex items-center bg-[#0E0F14] border border-[#181920] p-0.5 rounded-lg text-xs font-medium">
            <button
              onClick={() => setMetricMode('R')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                metricMode === 'R'
                  ? 'bg-[#8B5CF6]/20 text-[#A78BFA] font-semibold border border-[#8B5CF6]/30 shadow-xs'
                  : 'text-[#8E95A2] hover:text-white'
              }`}
            >
              R-Multiple
            </button>
            <button
              onClick={() => setMetricMode('PNL')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                metricMode === 'PNL'
                  ? 'bg-[#8B5CF6]/20 text-[#A78BFA] font-semibold border border-[#8B5CF6]/30 shadow-xs'
                  : 'text-[#8E95A2] hover:text-white'
              }`}
            >
              P&amp;L ({currency})
            </button>
            <button
              onClick={() => setMetricMode('PERCENT')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                metricMode === 'PERCENT'
                  ? 'bg-[#8B5CF6]/20 text-[#A78BFA] font-semibold border border-[#8B5CF6]/30 shadow-xs'
                  : 'text-[#8E95A2] hover:text-white'
              }`}
            >
              Gain %
            </button>
          </div>
        )}
      </div>

      {/* SVG Canvas Area */}
      <div ref={containerRef} className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full h-auto select-none cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4EFA8A" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#4EFA8A" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="equityStroke" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#22C55E" />
              <stop offset="100%" stopColor="#4EFA8A" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line
            x1={paddingX}
            y1={paddingY}
            x2={chartWidth - paddingX}
            y2={paddingY}
            stroke="#152018"
            strokeDasharray="3 3"
          />
          <line
            x1={paddingX}
            y1={chartHeight - paddingY}
            x2={chartWidth - paddingX}
            y2={chartHeight - paddingY}
            stroke="#152018"
            strokeDasharray="3 3"
          />

          {/* Zero baseline */}
          <line
            x1={paddingX}
            y1={zeroY}
            x2={chartWidth - paddingX}
            y2={zeroY}
            stroke="#1C281F"
            strokeWidth="1.2"
            strokeDasharray="4 4"
          />
          <text
            x={paddingX - 6}
            y={zeroY + 3}
            textAnchor="end"
            fill="#8E9AA8"
            fontSize="10"
            fontFamily="monospace"
          >
            0
          </text>

          {/* Max value label */}
          <text
            x={paddingX - 6}
            y={paddingY + 3}
            textAnchor="end"
            fill="#8E9AA8"
            fontSize="10"
            fontFamily="monospace"
          >
            {formatValue(maxVal)}
          </text>

          {/* Min value label */}
          <text
            x={paddingX - 6}
            y={chartHeight - paddingY + 3}
            textAnchor="end"
            fill="#8E9AA8"
            fontSize="10"
            fontFamily="monospace"
          >
            {formatValue(minVal)}
          </text>

          {/* Area fill */}
          <path d={areaD} fill="url(#equityGradient)" />

          {/* Curve stroke */}
          <path
            d={pathD}
            fill="none"
            stroke="url(#equityStroke)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Scrubber vertical line on hover */}
          {activePoint && (
            <>
              <line
                x1={activePoint.x}
                y1={paddingY}
                x2={activePoint.x}
                y2={chartHeight - paddingY}
                stroke="#38BDF8"
                strokeWidth="1"
                strokeDasharray="2 2"
                opacity="0.75"
              />
              <circle
                cx={activePoint.x}
                cy={activePoint.y}
                r="5"
                fill="#06B6D4"
                stroke="#0B0D10"
                strokeWidth="2.5"
              />
            </>
          )}
        </svg>

        {/* Hover info tooltip badge */}
        {activePoint && hoverIndex !== null && (
          <div
            className="absolute top-2 pointer-events-none rounded-xl bg-[#0E0F14] border border-[#181920] px-3 py-2 shadow-xl text-xs font-mono-num z-10"
            style={{
              left: `${Math.min(Math.max(activePoint.x / (chartWidth / 100), 12), 85)}%`,
              transform: 'translateX(-50%)',
            }}
          >
            <div className="flex items-center gap-2">
              <span className="font-bold text-white">{activePoint.pointData.pair}</span>
              <span
                className={`font-semibold ${
                  activePoint.pointData.tradeR > 0
                    ? 'text-emerald-400'
                    : activePoint.pointData.tradeR < 0
                    ? 'text-rose-400'
                    : 'text-gray-400'
                }`}
              >
                {activePoint.pointData.tradeR > 0 ? '+' : ''}
                {activePoint.pointData.tradeR.toFixed(2)}R
              </span>
            </div>
            <div className="text-[10px] text-[#8E9AA8] mt-0.5">
              Cumul: {formatValue(activePoint.val)} • {activePoint.pointData.date}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
