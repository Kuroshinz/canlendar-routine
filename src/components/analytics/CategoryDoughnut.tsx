import React, { useState } from 'react';
import { CategoryBreakdownItem } from '../../types/multiHub';
import { formatLiveDuration } from '../../utils/dndUtils';

interface CategoryDoughnutProps {
  data: CategoryBreakdownItem[];
  totalMinutes: number;
  lang: 'vi' | 'en';
}

export const CategoryDoughnut: React.FC<CategoryDoughnutProps> = ({
  data,
  totalMinutes,
  lang,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (data.length === 0 || totalMinutes === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400 text-sm">
        <span>{lang === 'vi' ? 'Chưa có sự kiện nào trong khoảng thời gian này' : 'No events in this period'}</span>
      </div>
    );
  }

  // SVG parameters
  const size = 200;
  const strokeWidth = 26;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  // Compute strokeDasharray and strokeDashoffset for each segment
  let accumulatedPercent = 0;
  const segments = data.map((item, index) => {
    const fraction = item.minutes / totalMinutes;
    const strokeDasharray = `${fraction * circumference} ${circumference}`;
    const strokeDashoffset = -accumulatedPercent * circumference;
    accumulatedPercent += fraction;

    return {
      ...item,
      strokeDasharray,
      strokeDashoffset,
      index,
    };
  });

  const activeItem = hoveredIndex !== null ? data[hoveredIndex] : null;

  return (
    <div className="flex flex-col md:flex-row items-center justify-center gap-8 p-4">
      {/* Doughnut Chart */}
      <div className="relative w-52 h-52 shrink-0 flex items-center justify-center">
        <svg
          width={size}
          height={size}
          className="transform -rotate-90 drop-shadow-sm overflow-visible"
        >
          {segments.map((seg) => (
            <circle
              key={seg.categoryId}
              cx={center}
              cy={center}
              r={radius}
              fill="transparent"
              stroke={seg.color}
              strokeWidth={hoveredIndex === seg.index ? strokeWidth + 4 : strokeWidth}
              strokeDasharray={seg.strokeDasharray}
              strokeDashoffset={seg.strokeDashoffset}
              strokeLinecap="round"
              onMouseEnter={() => setHoveredIndex(seg.index)}
              onMouseLeave={() => setHoveredIndex(null)}
              className="transition-all duration-200 cursor-pointer hover:opacity-90"
            />
          ))}
        </svg>

        {/* Center Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
          {activeItem ? (
            <>
              <span className="text-[11px] font-medium text-gray-400 truncate max-w-[110px]">
                {activeItem.categoryName}
              </span>
              <span className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {formatLiveDuration(activeItem.minutes, lang)}
              </span>
              <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold">
                {activeItem.percentage}%
              </span>
            </>
          ) : (
            <>
              <span className="text-[11px] text-gray-400 font-medium">
                {lang === 'vi' ? 'Tổng cộng' : 'Total'}
              </span>
              <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {formatLiveDuration(totalMinutes, lang)}
              </span>
              <span className="text-xs text-gray-400">
                {data.length} {lang === 'vi' ? 'danh mục' : 'categories'}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-col gap-2.5 flex-1 max-w-sm w-full">
        {data.map((item, index) => {
          const isHovered = hoveredIndex === index;
          return (
            <div
              key={item.categoryId}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              className={`flex items-center justify-between p-2 rounded-lg transition-all cursor-pointer ${
                isHovered
                  ? 'bg-gray-100/80 dark:bg-gray-800/80 shadow-xs scale-102'
                  : 'hover:bg-gray-50 dark:hover:bg-[#1a1e24]'
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <span
                  className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-xs font-medium text-gray-700 dark:text-gray-200 truncate">
                  {item.categoryName}
                </span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs font-mono font-medium text-gray-500 dark:text-gray-400">
                  {formatLiveDuration(item.minutes, lang)}
                </span>
                <span className="text-xs font-bold text-gray-900 dark:text-gray-100 min-w-9 text-right">
                  {item.percentage}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

