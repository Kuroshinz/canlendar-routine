import React, { useState, useMemo } from 'react';
import { CalendarEvent, CalendarCategory } from '../types/calendar';
import { formatDateString, doesEventOccurOnDate } from '../utils/calendarUtils';
import { getLunarDate } from '../utils/lunarUtils';
import { timeStringToMinutes, minutesToTimeString, formatLiveDuration } from '../utils/dndUtils';
import {
  X,
  Calendar as CalIcon,
  Clock,
  Plus,
  Video,
  MapPin,
  Check,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Trash2,
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

  // Navigate prev / next day
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

  // Filter events on this date and sort chronologically
  const dayEvents = useMemo(() => {
    return events
      .filter((ev) => doesEventOccurOnDate(ev, selectedDateStr))
      .sort((a, b) => {
        if (a.allDay && !b.allDay) return -1;
        if (!a.allDay && b.allDay) return 1;
        return (a.startTime || '00:00').localeCompare(b.startTime || '00:00');
      });
  }, [events, selectedDateStr]);

  // Total scheduled duration
  const totalMinutes = useMemo(() => {
    return dayEvents.reduce((acc, ev) => {
      if (ev.allDay) return acc + 8 * 60;
      const s = timeStringToMinutes(ev.startTime);
      const e = timeStringToMinutes(ev.endTime);
      return acc + Math.max(15, e - s);
    }, 0);
  }, [dayEvents]);

  // Hours range to display (06:00 to 23:00)
  const displayHours = Array.from({ length: 18 }, (_, i) => i + 6);

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-full sm:w-[420px] bg-white dark:bg-gray-850 shadow-2xl border-l border-gray-200 dark:border-gray-700 flex flex-col animate-in slide-in-from-right duration-200 select-none">
      {/* Drawer Header */}
      <div className="p-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/40 shrink-0">
        <div className="flex items-center justify-between">
          {/* Day Navigation */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={handlePrevDay}
              className="p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500"
              title="Previous day"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
              {lang === 'vi' ? weekdayVi : weekdayEn}
            </span>
            <button
              onClick={handleNextDay}
              className="p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500"
              title="Next day"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Date Display */}
        <div className="flex items-baseline justify-between mt-2">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 font-sans">
              {dateObj.getDate()} {lang === 'vi' ? `Tháng ${dateObj.getMonth() + 1}, ${dateObj.getFullYear()}` : dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h2>
            {lang === 'vi' && (
              <div className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-0.5">
                🌙 Lịch Âm: Ngày {lunar.day} tháng {lunar.month} {lunar.festivalName ? `(${lunar.festivalName})` : ''}
              </div>
            )}
          </div>

          <div className="text-right">
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 rounded-full border border-blue-200 dark:border-blue-900/40">
              {dayEvents.length} {lang === 'vi' ? 'sự kiện' : 'events'} • {formatLiveDuration(totalMinutes, lang)}
            </span>
          </div>
        </div>

        {/* Quick add slot button */}
        <button
          onClick={() => onAddEventClick(selectedDateStr, '09:00')}
          className="w-full mt-3.5 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{lang === 'vi' ? '+ Thêm lịch hẹn mới vào ngày này' : '+ Add event to this day'}</span>
        </button>
      </div>

      {/* Hourly Timeline */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {displayHours.map((hour) => {
          const hourStr = `${String(hour).padStart(2, '0')}:00`;
          const nextHourStr = `${String(hour + 1).padStart(2, '0')}:00`;

          // Events in this hour slot
          const slotEvents = dayEvents.filter((ev) => {
            if (ev.allDay) return false;
            const s = ev.startTime || '00:00';
            return s >= hourStr && s < nextHourStr;
          });

          return (
            <div
              key={hour}
              className="flex items-start gap-3 group/slot min-h-12 border-b border-gray-100 dark:border-gray-800/60 pb-2"
            >
              {/* Hour Label */}
              <div className="w-12 text-right text-xs font-mono font-medium text-gray-400 pt-1 shrink-0">
                {hourStr}
              </div>

              {/* Slot Area */}
              <div className="flex-1 flex flex-col gap-1.5">
                {slotEvents.length === 0 ? (
                  <div
                    onClick={() => onAddEventClick(selectedDateStr, hourStr)}
                    className="h-8 rounded-lg border border-dashed border-transparent group-hover/slot:border-gray-300 dark:group-hover/slot:border-gray-700 group-hover/slot:bg-blue-50/20 dark:group-hover/slot:bg-blue-900/10 transition-all flex items-center px-2 cursor-pointer text-[11px] text-gray-400 opacity-0 group-hover/slot:opacity-100"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1 text-blue-500" />
                    <span>{lang === 'vi' ? 'Nhấp để xếp lịch vào ' + hourStr : 'Click to schedule at ' + hourStr}</span>
                  </div>
                ) : (
                  slotEvents.map((ev) => (
                    <div
                      key={ev.id}
                      onClick={(e) => onSelectEvent(ev, e.currentTarget)}
                      style={{ backgroundColor: `${ev.color}18`, borderColor: ev.color }}
                      className="p-2.5 rounded-xl border-l-4 shadow-2xs hover:shadow-sm cursor-pointer transition-all hover:scale-101 flex flex-col gap-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-gray-900 dark:text-gray-100 truncate">
                          {ev.title}
                        </span>
                        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md text-white" style={{ backgroundColor: ev.color }}>
                          {ev.startTime} – {ev.endTime}
                        </span>
                      </div>

                      {ev.location && (
                        <div className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400 truncate">
                          <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                          <span className="truncate">{ev.location}</span>
                        </div>
                      )}

                      {ev.meetUrl && (
                        <div className="flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                          <Video className="w-3 h-3 text-blue-500 shrink-0" />
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
  );
};
