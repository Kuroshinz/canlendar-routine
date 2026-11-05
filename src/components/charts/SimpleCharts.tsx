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

export interface DonutSegment {
  value: number;
  color: string;
  label: string;
}

export const Donut: React.FC<{
  segments: DonutSegment[];
  size?: number;
  centerLabel: string;
  centerValue: string;
}> = ({ segments, size = 132, centerLabel, centerValue }) => {
  const total = segments.reduce((sum, s) => sum + Math.max(0, s.value), 0);
  const radius = size / 2 - 12;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="relative shrink-0 flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} role="img" aria-label={centerLabel} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={11}
          className="text-gray-200 dark:text-gray-800"
        />
        {total > 0 &&
          segments.map((s) => {
            const length = (Math.max(0, s.value) / total) * circumference;
            const dash = `${length} ${circumference - length}`;
            const el = (
              <circle
                key={s.label}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={s.color}
                strokeWidth={11}
                strokeDasharray={dash}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
              />
            );
            offset += length;
            return el;
          })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-2">
        <span className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-tight truncate max-w-full">
          {centerValue}
        </span>
        <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium truncate max-w-full">
          {centerLabel}
        </span>
      </div>
    </div>
  );
};

export interface ChartSeries {
  key: string;
  label: string;
  color: string;
  unit?: string;
  values: { x: string; y: number }[];
}

export const MultiSeriesLineChart: React.FC<{
  series: ChartSeries[];
  height?: number;
  emptyLabel: string;
  formatY?: (v: number) => string;
}> = ({ series, height = 180, emptyLabel, formatY }) => {
  const [activeIdx, setActiveIdx] = React.useState<number | null>(null);

  const nonEmpty = series.filter((s) => s.values.length > 0);
  if (nonEmpty.length === 0) {
    return (
      <div className="h-40 flex items-center justify-center text-xs text-gray-400">{emptyLabel}</div>
    );
  }

  const xs = nonEmpty[0].values.map((v) => v.x);
  const allY = nonEmpty.flatMap((s) => s.values.map((v) => v.y));
  const max = Math.max(...allY);
  const min = Math.min(...allY);
  const span = max - min || 1;
  const padY = 12;
  const width = 320;
  const plotH = height - padY * 2;

  const xAt = (i: number) => (xs.length === 1 ? width / 2 : (i / (xs.length - 1)) * width);
  const yAt = (v: number) => padY + (1 - (v - min) / span) * plotH;
  const fmt = formatY || ((v: number) => String(Math.round(v * 10) / 10));

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="w-full"
        style={{ height }}
        role="img"
      >
        {[0, 0.5, 1].map((t) => (
          <line
            key={t}
            x1={0}
            x2={width}
            y1={padY + plotH * t}
            y2={padY + plotH * t}
            stroke="currentColor"
            strokeWidth={0.5}
            strokeDasharray="3 4"
            className="text-gray-200 dark:text-gray-800"
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {nonEmpty.map((s) => {
          const d = s.values.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xAt(i)} ${yAt(v.y)}`).join(' ');
          return (
            <g key={s.key}>
              <path
                d={d}
                fill="none"
                stroke={s.color}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
              {s.values.map((v, i) => (
                <circle
                  key={`${s.key}-${v.x}`}
                  cx={xAt(i)}
                  cy={yAt(v.y)}
                  r={activeIdx === i ? 4 : 2.5}
                  fill={s.color}
                  stroke="#ffffff"
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </g>
          );
        })}

        {/* Tap/click interaction zones */}
        {xs.map((x, i) => (
          <rect
            key={x}
            x={xAt(i) - width / (xs.length * 2)}
            y={0}
            width={width / xs.length}
            height={height}
            fill="transparent"
            className="cursor-pointer"
            onClick={() => setActiveIdx(activeIdx === i ? null : i)}
          />
        ))}
      </svg>

      {activeIdx !== null && (
        <div className="mt-2 p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/80 text-xs">
          <div className="font-bold text-gray-900 dark:text-gray-100">{xs[activeIdx]}</div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
            {nonEmpty.map((s) => (
              <span key={s.key} className="text-gray-600 dark:text-gray-300 flex items-center gap-1 font-mono">
                <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: s.color }} />
                {s.label}: {fmt(s.values[activeIdx]?.y ?? 0)}
                {s.unit ? ` ${s.unit}` : ''}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
        {nonEmpty.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400">
            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
};


