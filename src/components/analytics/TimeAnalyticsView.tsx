import React, { useState, useMemo } from 'react';
import { CalendarEvent, CalendarCategory } from '../../types/calendar';
import { computeAnalyticsMetrics } from '../../utils/analyticsUtils';
import { formatDateString, getWeekDates } from '../../utils/calendarUtils';
import { formatLiveDuration } from '../../utils/dndUtils';
import { CategoryDoughnut } from './CategoryDoughnut';
import { BurnoutAlert } from './BurnoutAlert';
import { GoalsTracker } from './GoalsTracker';
import {
  Clock,
  Calendar as CalIcon,
  Zap,
  Video,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Activity,
} from 'lucide-react';

interface TimeAnalyticsViewProps {
  events: CalendarEvent[];
  categories: CalendarCategory[];
  currentDate: Date;
  onClose?: () => void;
  lang: 'vi' | 'en';
}

export const TimeAnalyticsView: React.FC<TimeAnalyticsViewProps> = ({
  events,
  categories,
  currentDate,
  onClose,
  lang,
}) => {
  const [filterMode, setFilterMode] = useState<'today' | 'week' | 'month'>('week');
  const [offset, setOffset] = useState(0);

  // Calculate start & end date based on filterMode & offset
  const { startDateStr, endDateStr, titleLabel } = useMemo(() => {
    const base = new Date(currentDate);

    if (filterMode === 'today') {
      base.setDate(base.getDate() + offset);
      const str = formatDateString(base);
      return {
        startDateStr: str,
        endDateStr: str,
        titleLabel: str,
      };
    } else if (filterMode === 'month') {
      base.setMonth(base.getMonth() + offset);
      const y = base.getFullYear();
      const m = base.getMonth();
      const start = formatDateString(new Date(y, m, 1));
      const end = formatDateString(new Date(y, m + 1, 0));
      return {
        startDateStr: start,
        endDateStr: end,
        titleLabel:
          lang === 'vi'
            ? `Tháng ${m + 1}, ${y}`
            : `${base.toLocaleString('en-US', { month: 'long' })} ${y}`,
      };
    } else {
      // Default: week
      base.setDate(base.getDate() + offset * 7);
      const weekDates = getWeekDates(base, false);
      const start = formatDateString(weekDates[0]);
      const end = formatDateString(weekDates[6]);
      return {
        startDateStr: start,
        endDateStr: end,
        titleLabel: `${start} – ${end}`,
      };
    }
  }, [currentDate, filterMode, offset, lang]);

  // Compute metrics
  const metrics = useMemo(() => {
    return computeAnalyticsMetrics(events, categories, startDateStr, endDateStr, lang);
  }, [events, categories, startDateStr, endDateStr, lang]);

  const deepWorkPercent =
    metrics.totalMinutes > 0
      ? Math.round((metrics.deepWorkMinutes / metrics.totalMinutes) * 100)
      : 0;

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-gray-50/50 dark:bg-gray-900 select-none p-4 md:p-6 lg:p-8">
      {/* Top Bar with Filter Selector & Date Navigator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">
              {lang === 'vi' ? 'Bảng Phân Tích Năng Suất' : 'Productivity & Time Analytics'}
            </h1>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {lang === 'vi'
              ? 'Theo dõi phân bổ thời gian, tỷ lệ tập trung sâu và cân bằng cuộc sống.'
              : 'Track your time allocation, deep work ratio, and workload balance.'}
          </p>
        </div>

        {/* Filter controls */}
        <div className="flex items-center gap-2">
          {/* Mode Tabs */}
          <div className="bg-gray-200/80 dark:bg-gray-800 p-1 rounded-xl flex text-xs font-semibold">
            <button
              onClick={() => {
                setFilterMode('today');
                setOffset(0);
              }}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filterMode === 'today'
                  ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
              }`}
            >
              {lang === 'vi' ? 'Hôm nay' : 'Today'}
            </button>
            <button
              onClick={() => {
                setFilterMode('week');
                setOffset(0);
              }}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filterMode === 'week'
                  ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
              }`}
            >
              {lang === 'vi' ? 'Tuần này' : 'Week'}
            </button>
            <button
              onClick={() => {
                setFilterMode('month');
                setOffset(0);
              }}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filterMode === 'month'
                  ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
              }`}
            >
              {lang === 'vi' ? 'Tháng này' : 'Month'}
            </button>
          </div>

          {/* Date Offset Navigator */}
          <div className="flex items-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-2 py-1 shadow-xs">
            <button
              onClick={() => setOffset((prev) => prev - 1)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500"
              title="Previous"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 px-2 min-w-28 text-center truncate">
              {titleLabel}
            </span>
            <button
              onClick={() => setOffset((prev) => prev + 1)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500"
              title="Next"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Total Time */}
        <div className="bg-white dark:bg-[#1a1e24] p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
              {lang === 'vi' ? 'Tổng Thời Gian' : 'Total Time'}
            </div>
            <div className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-0.5">
              {formatLiveDuration(metrics.totalMinutes, lang)}
            </div>
          </div>
        </div>

        {/* Total Events */}
        <div className="bg-white dark:bg-[#1a1e24] p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <CalIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
              {lang === 'vi' ? 'Số Sự Kiện' : 'Total Events'}
            </div>
            <div className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-0.5">
              {metrics.totalEvents}
            </div>
          </div>
        </div>

        {/* Deep Work */}
        <div className="bg-white dark:bg-[#1a1e24] p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
              {lang === 'vi' ? 'Tập Trung Sâu' : 'Deep Work'}
            </div>
            <div className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-0.5">
              {formatLiveDuration(metrics.deepWorkMinutes, lang)}{' '}
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-normal">
                ({deepWorkPercent}%)
              </span>
            </div>
          </div>
        </div>

        {/* Meetings */}
        <div className="bg-white dark:bg-[#1a1e24] p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Video className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
              {lang === 'vi' ? 'Họp & Hội Thảo' : 'Meetings & Calls'}
            </div>
            <div className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-0.5">
              {formatLiveDuration(metrics.meetingMinutes, lang)}
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Doughnut Chart / Right Burnout & Goals */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Category Breakdown Chart Card */}
        <div className="lg:col-span-7 bg-white dark:bg-[#1a1e24] p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
                {lang === 'vi' ? 'Phân Bổ Thời Gian Theo Danh Mục' : 'Time Breakdown by Category'}
              </h2>
            </div>
            <span className="text-xs text-gray-400 font-mono">
              {titleLabel}
            </span>
          </div>

          <div className="flex-1 flex items-center justify-center">
            <CategoryDoughnut
              data={metrics.categoryBreakdown}
              totalMinutes={metrics.totalMinutes}
              lang={lang}
            />
          </div>
        </div>

        {/* Right Column: Burnout Warning + Weekly Goals */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <BurnoutAlert overloadedDays={metrics.overloadedDays} lang={lang} />
          <GoalsTracker categoryBreakdown={metrics.categoryBreakdown} lang={lang} />
        </div>
      </div>
    </div>
  );
};

