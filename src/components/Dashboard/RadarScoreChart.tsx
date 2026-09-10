import React from 'react';

interface RadarScoreChartProps {
  score: number; // 0 - 100
  metrics: {
    winRate: number; // 0 - 100
    profitFactor: number; // 0 - 100 (normalized)
    avgWinLoss: number; // 0 - 100 (normalized)
    recoveryFactor: number; // 0 - 100 (normalized)
    drawdownControl: number; // 0 - 100 (normalized)
    consistency: number; // 0 - 100 (rules followed)
  };
}

export const RadarScoreChart: React.FC<RadarScoreChartProps> = ({ score, metrics }) => {
  const size = 260;
  const center = size / 2;
  const radius = 80;

  // 6 axes: Win %, Profit Factor, Avg win/loss, Recovery factor, Max drawdown, Consistency
  const axes = [
    { label: 'Win %', value: Math.min(Math.max(metrics.winRate, 10), 100), angle: -Math.PI / 2 },
    { label: 'Profit Factor', value: Math.min(Math.max(metrics.profitFactor, 10), 100), angle: -Math.PI / 6 },
    { label: 'Avg Win/Loss', value: Math.min(Math.max(metrics.avgWinLoss, 10), 100), angle: Math.PI / 6 },
    { label: 'Recovery', value: Math.min(Math.max(metrics.recoveryFactor, 10), 100), angle: Math.PI / 2 },
    { label: 'Drawdown', value: Math.min(Math.max(metrics.drawdownControl, 10), 100), angle: (5 * Math.PI) / 6 },
    { label: 'Plan Adherence', value: Math.min(Math.max(metrics.consistency, 10), 100), angle: (-5 * Math.PI) / 6 },
  ];

  // Helper to get coordinates
  const getPoint = (angle: number, distance: number) => {
    return {
      x: center + distance * Math.cos(angle),
      y: center + distance * Math.sin(angle),
    };
  };

  // Concentric polygon grids (20%, 40%, 60%, 80%, 100%)
  const gridLevels = [0.2, 0.4, 0.6, 0.8, 1.0];
  const gridPolygons = gridLevels.map((level) => {
    const points = axes.map((axis) => {
      const pt = getPoint(axis.angle, radius * level);
      return `${pt.x},${pt.y}`;
    }).join(' ');
    return points;
  });

  // Data polygon points
  const dataPoints = axes.map((axis) => {
    const distance = (radius * axis.value) / 100;
    const pt = getPoint(axis.angle, distance);
    return `${pt.x},${pt.y}`;
  }).join(' ');

  return (
    <div className="flex flex-col h-full justify-between">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#8E9AA8]">
            Trader Score
          </span>
        </div>
        <span className="text-[10px] font-mono-num text-[#8E95A2] bg-[#121318] px-2 py-0.5 rounded-full border border-[#1E2028]">
          Score
        </span>
      </div>

      {/* SVG Spider / Radar Chart */}
      <div className="relative flex items-center justify-center my-1">
        <svg width={size} height={size} className="overflow-visible">
          {/* Background grid polygons */}
          {gridPolygons.map((pointsStr, idx) => (
            <polygon
              key={idx}
              points={pointsStr}
              fill="none"
              stroke="#1E2028"
              strokeWidth={idx === gridPolygons.length - 1 ? 1.5 : 1}
              strokeDasharray={idx === gridPolygons.length - 1 ? 'none' : '2,2'}
            />
          ))}

          {/* Axis radiating lines */}
          {axes.map((axis, idx) => {
            const edgePoint = getPoint(axis.angle, radius);
            return (
              <line
                key={idx}
                x1={center}
                y1={center}
                x2={edgePoint.x}
                y2={edgePoint.y}
                stroke="#1E2028"
                strokeWidth="1"
              />
            );
          })}

          {/* Value filled polygon with glow */}
          <polygon
            points={dataPoints}
            fill="url(#radarGradient)"
            stroke="#8B5CF6"
            strokeWidth="2"
            className="filter drop-shadow-[0_0_12px_rgba(139,92,246,0.35)]"
          />

          {/* Vertices points */}
          {axes.map((axis, idx) => {
            const distance = (radius * axis.value) / 100;
            const pt = getPoint(axis.angle, distance);
            return (
              <circle
                key={idx}
                cx={pt.x}
                cy={pt.y}
                r="3"
                fill="#C4B5FD"
                stroke="#8B5CF6"
                strokeWidth="1.5"
              />
            );
          })}

          {/* Axis Labels */}
          {axes.map((axis, idx) => {
            const labelPt = getPoint(axis.angle, radius + 22);
            let textAnchor = 'middle';
            if (axis.angle > -Math.PI / 3 && axis.angle < Math.PI / 3) textAnchor = 'start';
            else if (axis.angle > (2 * Math.PI) / 3 || axis.angle < (-2 * Math.PI) / 3) textAnchor = 'end';

            return (
              <text
                key={idx}
                x={labelPt.x}
                y={labelPt.y + (axis.angle === -Math.PI / 2 ? -4 : axis.angle === Math.PI / 2 ? 10 : 3)}
                textAnchor={textAnchor}
                className="fill-[#8E95A2] text-[9.5px] font-medium tracking-tight"
              >
                {axis.label}
              </text>
            );
          })}

          {/* Gradient definitions */}
          <defs>
            <radialGradient id="radarGradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.12" />
            </radialGradient>
          </defs>
        </svg>
      </div>

      {/* Score Summary Footer */}
      <div className="mt-2 pt-3 border-t border-[#181920]">
        <div className="flex items-baseline justify-between mb-1.5">
          <span className="text-[11px] text-[#8E9AA8] font-medium">Your Score</span>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold font-mono-num text-white tracking-tight">
              {score.toFixed(1)}
            </span>
            <span className="text-[10px] text-[#6E7B8B] font-mono-num">/ 100</span>
          </div>
        </div>

        {/* Progress Bar (0 to 100) */}
        <div className="w-full bg-[#121318] h-2 rounded-full overflow-hidden border border-[#1E2028] p-[1px]">
          <div
            className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-[#6D28D9] via-[#8B5CF6] to-[#A78BFA]"
            style={{ width: `${Math.min(Math.max(score, 5), 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-[9px] font-mono-num text-[#6E7B8B] mt-1">
          <span>0</span>
          <span>20</span>
          <span>40</span>
          <span>60</span>
          <span>80</span>
          <span>100</span>
        </div>
      </div>
    </div>
  );
};
