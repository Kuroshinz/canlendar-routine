import React from 'react';

/**
 * Lightweight SVG charts in the same hand-rolled style as
 * `analytics/CategoryDoughnut` — the project deliberately has no chart
 * dependency, so these stay dependency-free and theme-aware.
 */

export interface ChartDatum {
  label: string;
  value: number;
  color?: string;
}

interface BarChartProps {
  data: ChartDatum[];
  height?: number;
  color?: string;
  formatValue?: (value: number) => string;
  emptyLabel: string;
  /** Highlight the last N bars (used for "today"). */
  highlightLast?: number;
}

export const BarChart: React.FC<BarChartProps> = ({
  data,
  height = 140,
  color = '#039BE5',
  formatValue,
  emptyLabel,
  highlightLast = 0,
}) => {
  if (data.length === 0) {
    return (
      <div className="h-32 flex items-center justify-center text-xs text-gray-400">{emptyLabel}</div>
    );
  }

  const max = Math.max(...data.map((d) => d.value), 1);
  const barWidth = 100 / data.length;

  return (
    <div className="w-full">
      <div className="relative w-full" style={{ height }}>
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="border-t border-dashed border-gray-100 dark:border-gray-800" />
          ))}
        </div>
        <div className="absolute inset-0 flex items-end gap-1">
          {data.map((d, i) => {
            const pct = (d.value / max) * 100;
            const isHighlight = highlightLast > 0 && i >= data.length - highlightLast;
            return (
              <div
                key={`${d.label}-${i}`}
                className="flex-1 h-full flex items-end justify-center group relative"
                style={{ maxWidth: `${barWidth}%` }}
              >
                <div
                  className="w-full max-w-6 rounded-t-sm transition-all duration-300 group-hover:opacity-80"
                  style={{
                    height: `${Math.max(pct, d.value > 0 ? 3 : 0)}%`,
                    backgroundColor: d.color || color,
                    opacity: isHighlight ? 1 : 0.72,
                  }}
                />
                <div className="absolute -top-6 hidden group-hover:flex px-1.5 py-0.5 rounded bg-gray-900 text-white text-[10px] font-mono whitespace-nowrap z-10">
                  {formatValue ? formatValue(d.value) : d.value}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex gap-1 mt-1.5">
        {data.map((d, i) => (
          <span
            key={`${d.label}-label-${i}`}
            className="flex-1 text-center text-[9px] text-gray-400 truncate"
            style={{ maxWidth: `${barWidth}%` }}
          >
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
};

interface LineChartProps {
  data: ChartDatum[];
  height?: number;
  color?: string;
  formatValue?: (value: number) => string;
  emptyLabel: string;
}

export const LineChart: React.FC<LineChartProps> = ({
  data,
  height = 160,
  color = '#33B679',
  formatValue,
  emptyLabel,
}) => {
  if (data.length === 0) {
    return (
      <div className="h-32 flex items-center justify-center text-xs text-gray-400">{emptyLabel}</div>
    );
  }

  const width = 100;
  const padY = 8;
  const values = data.map((d) => d.value);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;

  const points = data.map((d, i) => {
    const x = data.length === 1 ? width / 2 : (i / (data.length - 1)) * width;
    const y = padY + (1 - (d.value - min) / span) * (height - padY * 2);
    return { x, y, ...d };
  });

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const area = `${path} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="w-full"
        style={{ height }}
      >
        <defs>
          <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#grad-${color.replace('#', '')})`} />
        <path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        {points.map((p, i) => (
          <circle
            key={`${p.label}-${i}`}
            cx={p.x}
            cy={p.y}
            r="1.6"
            fill={color}
            stroke="white"
            strokeWidth="0.8"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
      <div className="flex justify-between mt-1">
        <span className="text-[9px] text-gray-400">
          {formatValue ? formatValue(data[0].value) : data[0].value} · {data[0].label}
        </span>
        <span className="text-[9px] text-gray-400">
          {data[data.length - 1].label} ·{' '}
          {formatValue ? formatValue(data[data.length - 1].value) : data[data.length - 1].value}
        </span>
      </div>
    </div>
  );
};

interface ProgressBarProps {
  percent: number;
  color?: string;
  height?: number;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  percent,
  color = '#3F51B5',
  height = 8,
  className = '',
}) => (
  <div
    className={`w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden ${className}`}
    style={{ height }}
  >
    <div
      className="h-full rounded-full transition-all duration-500"
      style={{ width: `${Math.min(100, Math.max(0, percent))}%`, backgroundColor: color }}
    />
  </div>
);

interface StackedBarProps {
  segments: { value: number; color: string; label: string }[];
  height?: number;
}

export const StackedBar: React.FC<StackedBarProps> = ({ segments, height = 10 }) => {
  const total = segments.reduce((s, x) => s + x.value, 0);
  if (total <= 0) {
    return <div className="w-full rounded-full bg-gray-200 dark:bg-gray-700" style={{ height }} />;
  }
  return (
    <div
      className="w-full rounded-full overflow-hidden flex bg-gray-200 dark:bg-gray-700"
      style={{ height }}
    >
      {segments.map((seg) => (
        <div
          key={seg.label}
          title={`${seg.label}: ${Math.round((seg.value / total) * 100)}%`}
          style={{ width: `${(seg.value / total) * 100}%`, backgroundColor: seg.color }}
        />
      ))}
    </div>
  );
};

