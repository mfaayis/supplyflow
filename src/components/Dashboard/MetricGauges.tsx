import React from 'react';

/**
 * Circular ring gauge for Profit Factor (TradeZella style)
 */
export const CircularRingGauge: React.FC<{ value: number; max?: number }> = ({ value, max = 3.5 }) => {
  const size = 44;
  const strokeWidth = 4.5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  // clamp between 0 and 1
  const percentage = Math.min(Math.max((value - 1) / (max - 1), 0), 1);
  const strokeDashoffset = circumference - percentage * circumference;

  return (
    <div className="relative flex items-center justify-center shrink-0">
      <svg width={size} height={size} className="-rotate-90">
        {/* Background Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#1E2028"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress Fill */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#8B5CF6"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
          className="transition-all duration-700 ease-out"
        />
      </svg>
    </div>
  );
};

/**
 * Semi-circular arc gauge for Win Rate (TradeZella style)
 */
export const SemiCircleGauge: React.FC<{ winRate: number; wins: number; be: number; losses: number }> = ({
  winRate,
  wins,
  be,
  losses,
}) => {
  const width = 64;
  const height = 36;
  const radius = 26;
  const strokeWidth = 4.5;
  const cx = width / 2;
  const cy = height - 4;

  // Arc calculation (from 180 deg to 0 deg)
  const angle = Math.PI * (winRate / 100);
  const winArcEndX = cx - radius * Math.cos(angle);
  const winArcEndY = cy - radius * Math.sin(angle);

  return (
    <div className="flex flex-col items-center shrink-0">
      <svg width={width} height={height} className="overflow-visible">
        {/* Background track arc (loss/gray) */}
        <path
          d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
          fill="none"
          stroke="#341A22"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Win Rate fill arc (emerald) */}
        {winRate > 0 && (
          <path
            d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${winArcEndX} ${winArcEndY}`}
            fill="none"
            stroke="#34D399"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        )}
      </svg>
      {/* Mini win/be/loss indicators */}
      <div className="flex items-center gap-1.5 text-[9px] font-mono-num mt-0.5">
        <span className="text-emerald-400 font-semibold">{wins}</span>
        <span className="text-[#656B77]">{be}</span>
        <span className="text-rose-400 font-semibold">{losses}</span>
      </div>
    </div>
  );
};

/**
 * Split Ratio Bar for Avg Win / Avg Loss (TradeZella style)
 */
export const SplitRatioBar: React.FC<{ avgWin: number; avgLoss: number; currencySymbol?: string }> = ({
  avgWin,
  avgLoss,
  currencySymbol = '$',
}) => {
  const total = Math.max(avgWin + avgLoss, 0.01);
  const winRatio = Math.min(Math.max((avgWin / total) * 100, 15), 85);
  const lossRatio = 100 - winRatio;

  return (
    <div className="w-full mt-2">
      <div className="h-1.5 w-full flex rounded-full overflow-hidden bg-[#181920] gap-0.5">
        <div
          className="bg-[#34D399] h-full rounded-l-full transition-all duration-500"
          style={{ width: `${winRatio}%` }}
        />
        <div
          className="bg-[#F87171] h-full rounded-r-full transition-all duration-500"
          style={{ width: `${lossRatio}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-[10px] font-mono-num mt-1">
        <span className="text-[#34D399] font-semibold">
          +{currencySymbol}{Math.round(avgWin).toLocaleString()}
        </span>
        <span className="text-[#F87171] font-semibold">
          -{currencySymbol}{Math.round(avgLoss).toLocaleString()}
        </span>
      </div>
    </div>
  );
};
