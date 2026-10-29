import React, { useMemo } from 'react';
import { CalendarEvent, CalendarCategory } from '../types/calendar';
import { formatDateString, doesEventOccurOnDate } from '../utils/calendarUtils';
import { getLunarDate } from '../utils/lunarUtils';
import { timeStringToMinutes, formatLiveDuration } from '../utils/dndUtils';
import {
  X,
  Calendar as CalIcon,
  Clock,
  Plus,
  Video,
  MapPin,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface DayPlannerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDateStr: string;
  onSelectDate: (dateStr: string) => void;
  events: CalendarEvent[];
  categories: CalendarCategory[];
  onSelectEvent: (event: CalendarEvent, targetElement: HTMLElement) => void;
  onAddEventClick: (dateStr: string, timeStr: string) => void;
  lang: 'vi' | 'en';
}

export const DayPlannerDrawer: React.FC<DayPlannerDrawerProps> = ({
  isOpen,
  onClose,
  selectedDateStr,
  onSelectDate,
  events,
  categories,
  onSelectEvent,
  onAddEventClick,
  lang,
}) => {
  if (!isOpen) return null;

  const dateObj = new Date(selectedDateStr + 'T00:00:00');
  const weekdayVi = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'][dateObj.getDay()];
  const weekdayEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dateObj.getDay()];
  const lunar = getLunarDate(selectedDateStr);

  const handlePrevDay = () => {
    const prev = new Date(dateObj);
    prev.setDate(prev.getDate() - 1);
    onSelectDate(formatDateString(prev));
  };

  const handleNextDay = () => {
    const next = new Date(dateObj);
    next.setDate(next.getDate() + 1);
    onSelectDate(formatDateString(next));
  };

  const dayEvents = useMemo(() => {
    return events
      .filter((ev) => doesEventOccurOnDate(ev, selectedDateStr))
      .sort((a, b) => {
        if (a.allDay && !b.allDay) return -1;
        if (!a.allDay && b.allDay) return 1;
        return (a.startTime || '00:00').localeCompare(b.startTime || '00:00');
      });
  }, [events, selectedDateStr]);

  const totalMinutes = useMemo(() => {
    return dayEvents.reduce((acc, ev) => {
      if (ev.allDay) return acc + 8 * 60;
      const s = timeStringToMinutes(ev.startTime);
      const e = timeStringToMinutes(ev.endTime);
      return acc + Math.max(15, e - s);
    }, 0);
  }, [dayEvents]);

  const displayHours = Array.from({ length: 18 }, (_, i) => i + 6); // 06:00 -> 23:00

  return (
    <>
      {/* Dimmed Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[460px] bg-white dark:bg-[#161a1f] shadow-2xl border-l border-gray-200 dark:border-gray-800 flex flex-col animate-in slide-in-from-right duration-200 select-none">
        {/* Drawer Header */}
        <div className="p-5 border-b border-gray-200 dark:border-gray-800 bg-gray-50/90 dark:bg-[#111418] shrink-0">
          <div className="flex items-center justify-between">
            {/* Day Navigator */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={handlePrevDay}
                className="p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
                title="Previous day"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                {lang === 'vi' ? weekdayVi : weekdayEn}
              </span>
              <button
                onClick={handleNextDay}
                className="p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
                title="Next day"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Date Display */}
          <div className="flex items-baseline justify-between mt-3">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 font-sans tracking-tight">
                {dateObj.getDate()} {lang === 'vi' ? `Tháng ${dateObj.getMonth() + 1}, ${dateObj.getFullYear()}` : dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h2>
              {lang === 'vi' && (
                <div className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-0.5">
                  🌙 Lịch Âm: Ngày {lunar.day} tháng {lunar.month} {lunar.festivalName ? `(${lunar.festivalName})` : ''}
                </div>
              )}
            </div>

            <div className="text-right">
              <span className="text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-3 py-1 rounded-full border border-blue-200 dark:border-blue-900/60 shadow-2xs">
                {dayEvents.length} {lang === 'vi' ? 'sự kiện' : 'events'} • {formatLiveDuration(totalMinutes, lang)}
              </span>
            </div>
          </div>

          {/* Quick Add Button */}
          <button
            onClick={() => onAddEventClick(selectedDateStr, '09:00')}
            className="w-full mt-4 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs hover:shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>{lang === 'vi' ? 'Thêm lịch hẹn mới vào ngày này' : 'Add event to this day'}</span>
          </button>
        </div>

        {/* Hourly Timeline */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-white dark:bg-[#161a1f]">
          {displayHours.map((hour) => {
            const hourStr = `${String(hour).padStart(2, '0')}:00`;
            const nextHourStr = `${String(hour + 1).padStart(2, '0')}:00`;

            const slotEvents = dayEvents.filter((ev) => {
              if (ev.allDay) return false;
              const s = ev.startTime || '00:00';
              return s >= hourStr && s < nextHourStr;
            });

            return (
              <div
                key={hour}
                className="flex items-start gap-3 group/slot min-h-12 border-b border-gray-100 dark:border-gray-800/80 pb-2"
              >
                {/* Hour Label */}
                <div className="w-12 text-right text-xs font-mono font-medium text-gray-400 dark:text-gray-500 pt-1 shrink-0">
                  {hourStr}
                </div>

                {/* Slot Area */}
                <div className="flex-1 flex flex-col gap-1.5">
                  {slotEvents.length === 0 ? (
                    <div
                      onClick={() => onAddEventClick(selectedDateStr, hourStr)}
                      className="h-9 rounded-xl border border-dashed border-gray-200 dark:border-gray-800 group-hover/slot:border-blue-400 dark:group-hover/slot:border-blue-500 group-hover/slot:bg-blue-50/40 dark:group-hover/slot:bg-blue-950/20 transition-all flex items-center px-3 cursor-pointer text-xs text-gray-400 group-hover/slot:text-blue-600 dark:group-hover/slot:text-blue-400"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1.5 opacity-60 group-hover/slot:opacity-100" />
                      <span>{lang === 'vi' ? `Trống - Bấm để xếp lịch lúc ${hourStr}` : `Available - Click to schedule at ${hourStr}`}</span>
                    </div>
                  ) : (
                    slotEvents.map((ev) => (
                      <div
                        key={ev.id}
                        onClick={(e) => onSelectEvent(ev, e.currentTarget)}
                        className="p-3 rounded-xl border-l-4 shadow-xs hover:shadow-md cursor-pointer transition-all hover:translate-x-0.5 flex flex-col gap-1.5 bg-gray-50/90 dark:bg-[#1e232b] border border-gray-200/80 dark:border-gray-700/60"
                        style={{ borderLeftColor: ev.color }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-xs text-gray-900 dark:text-gray-100 truncate">
                            {ev.title}
                          </span>
                          <span
                            className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md text-white shrink-0 shadow-2xs"
                            style={{ backgroundColor: ev.color }}
                          >
                            {ev.startTime} – {ev.endTime}
                          </span>
                        </div>

                        {ev.location && (
                          <div className="flex items-center gap-1 text-[11px] text-gray-600 dark:text-gray-400 truncate">
                            <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                            <span className="truncate">{ev.location}</span>
                          </div>
                        )}

                        {ev.meetUrl && (
                          <div className="flex items-center gap-1.5 text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                            <Video className="w-3 h-3 shrink-0" />
                            <span>Google Meet</span>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};
