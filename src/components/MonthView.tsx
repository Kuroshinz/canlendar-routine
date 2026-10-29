import React, { useState } from 'react';
import { CalendarEvent } from '../types/calendar';
import { formatDateString, getMonthDays, doesEventOccurOnDate } from '../utils/calendarUtils';
import { getLunarDate } from '../utils/lunarUtils';
import { Check, Video } from 'lucide-react';

interface MonthViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  visibleCategoryIds: Set<string>;
  onSelectEvent: (event: CalendarEvent, targetElement: HTMLElement) => void;
  onCellClick: (dateStr: string) => void;
  onMoveEvent?: (eventId: string, newDateStr: string) => void;
  lang: 'vi' | 'en';
}

export const MonthView: React.FC<MonthViewProps> = ({
  currentDate,
  events,
  visibleCategoryIds,
  onSelectEvent,
  onCellClick,
  onMoveEvent,
  lang,
}) => {
  const [overflowDate, setOverflowDate] = useState<string | null>(null);
  const [overflowAnchor, setOverflowAnchor] = useState<{ top: number; left: number } | null>(null);
  const [hoveredEvent, setHoveredEvent] = useState<{ event: CalendarEvent; top: number; left: number } | null>(null);
  const [draggedOverDate, setDraggedOverDate] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const days = getMonthDays(year, month, false);

  const weekdayLabelsVi = ['CN', 'THỨ 2', 'THỨ 3', 'THỨ 4', 'THỨ 5', 'THỨ 6', 'THỨ 7'];
  const weekdayLabelsEn = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const weekdays = lang === 'vi' ? weekdayLabelsVi : weekdayLabelsEn;

  // Filter events by visible categories
  const activeEvents = events.filter((e) => visibleCategoryIds.has(e.calendarId));

  const handleOverflowClick = (e: React.MouseEvent, dateStr: string) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setOverflowAnchor({
      top: rect.bottom + window.scrollY,
      left: Math.min(rect.left + window.scrollX, window.innerWidth - 260),
    });
    setOverflowDate(dateStr);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-white dark:bg-gray-900 select-none">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-800 text-center py-2 bg-gray-50/50 dark:bg-gray-850/50 shrink-0">
        {weekdays.map((day, idx) => (
          <div key={idx} className="text-xs font-semibold tracking-wider text-gray-500 dark:text-gray-400">
            {day}
          </div>
        ))}
      </div>

      {/* Month Days Grid */}
      <div className="flex-1 grid grid-cols-7 grid-rows-5 md:grid-rows-5 lg:grid-rows-6 border-l border-t border-gray-200 dark:border-gray-800 overflow-y-auto">
        {days.map((dayItem, index) => {
          const dateStr = dayItem.dateString;
          const dayEvents = activeEvents.filter((ev) => doesEventOccurOnDate(ev, dateStr));

          // Max visible events in cell before +N more
          const MAX_VISIBLE = 3;
          const visibleList = dayEvents.slice(0, MAX_VISIBLE);
          const hiddenCount = dayEvents.length - MAX_VISIBLE;
          const lunar = getLunarDate(dateStr);
          const isDragTarget = draggedOverDate === dateStr;

          return (
            <div
              key={index}
              onClick={() => onCellClick(dateStr)}
              onDragOver={(e) => {
                e.preventDefault();
                setDraggedOverDate(dateStr);
              }}
              onDragLeave={() => {
                if (draggedOverDate === dateStr) setDraggedOverDate(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setDraggedOverDate(null);
                const eventId = e.dataTransfer.getData('text/plain');
                if (eventId && onMoveEvent) {
                  onMoveEvent(eventId, dateStr);
                }
              }}
              className={`min-h-[95px] border-r border-b border-gray-200 dark:border-gray-800 p-1 flex flex-col transition-colors cursor-pointer group ${
                isDragTarget
                  ? 'bg-blue-100/60 dark:bg-blue-900/40 ring-2 ring-blue-500 ring-inset'
                  : !dayItem.isCurrentMonth
                  ? 'bg-gray-50/50 dark:bg-gray-900/50 text-gray-400 dark:text-gray-600'
                  : 'bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 hover:bg-blue-50/20 dark:hover:bg-blue-900/10'
              }`}
            >
              {/* Day Header with Solar Number and Lunar Date */}
              <div className="flex items-center justify-between px-1 mb-1">
                <span
                  className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full transition-transform group-hover:scale-110 ${
                    dayItem.isToday
                      ? 'bg-blue-600 text-white font-bold shadow-xs'
                      : dayItem.isCurrentMonth
                      ? 'text-gray-700 dark:text-gray-200'
                      : 'text-gray-400 dark:text-gray-600'
                  }`}
                >
                  {dayItem.dayNumber}
                </span>

                {/* Lunar Date (Lịch Âm) */}
                {lang === 'vi' && (
                  <span
                    title={lunar.festivalName || `Ngày ${lunar.day} tháng ${lunar.month} âm lịch`}
                    className={`text-[10px] font-medium leading-none ${
                      lunar.festivalName
                        ? 'text-red-500 dark:text-red-400 font-bold'
                        : lunar.isSpecialDay
                        ? 'text-amber-600 dark:text-amber-400 font-semibold'
                        : 'text-gray-400 dark:text-gray-500'
                    }`}
                  >
                    {lunar.festivalName
                      ? lunar.festivalName
                      : lunar.day === 1
                      ? `${lunar.day}/${lunar.month}`
                      : lunar.day}
                  </span>
                )}
              </div>

              {/* Event items container */}
              <div className="flex-1 flex flex-col gap-1 overflow-hidden">
                {visibleList.map((ev) => {
                  const isMultiDayOrAllDay = ev.allDay || (ev.startDate !== ev.endDate);

                  return (
                    <div
                      key={ev.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', ev.id);
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setHoveredEvent(null);
                        onSelectEvent(ev, e.currentTarget);
                      }}
                      onMouseEnter={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setHoveredEvent({
                          event: ev,
                          top: rect.bottom + window.scrollY + 6,
                          left: Math.min(rect.left + window.scrollX, window.innerWidth - 240),
                        });
                      }}
                      onMouseLeave={() => setHoveredEvent(null)}
                      style={{
                        backgroundColor: isMultiDayOrAllDay ? ev.color : 'transparent',
                        borderColor: ev.color,
                      }}
                      className={`px-2 py-0.5 rounded-md text-[11px] truncate flex items-center gap-1.5 transition-all hover:brightness-95 cursor-pointer ${
                        isMultiDayOrAllDay
                          ? 'text-white font-medium shadow-2xs hover:shadow-xs'
                          : 'hover:bg-blue-50/50 dark:hover:bg-blue-900/30 border-l-3'
                      }`}
                    >
                      {!isMultiDayOrAllDay && (
                        <div
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: ev.color }}
                        />
                      )}

                      {!isMultiDayOrAllDay && ev.startTime && (
                        <span className="text-gray-500 dark:text-gray-400 font-mono text-[10px] font-medium shrink-0">
                          {ev.startTime}
                        </span>
                      )}

                      {ev.meetUrl && <Video className="w-2.5 h-2.5 shrink-0 opacity-80" />}

                      {ev.type === 'task' && (
                        <Check className="w-2.5 h-2.5 shrink-0 text-emerald-500 stroke-[3]" />
                      )}

                      <span
                        className={`truncate ${
                          ev.isCompleted ? 'line-through opacity-70 text-gray-500' : ''
                        }`}
                      >
                        {ev.title}
                      </span>
                    </div>
                  );
                })}

                {/* +N more button */}
                {hiddenCount > 0 && (
                  <button
                    onClick={(e) => handleOverflowClick(e, dateStr)}
                    className="text-[10px] font-semibold text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 text-left px-1.5 py-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                  >
                    +{hiddenCount} {lang === 'vi' ? 'sự kiện khác' : 'more'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Overflow popover */}
      {overflowDate && overflowAnchor && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => {
              setOverflowDate(null);
              setOverflowAnchor(null);
            }}
          />
          <div
            style={{ top: overflowAnchor.top, left: overflowAnchor.left }}
            className="fixed z-50 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-3 max-h-72 overflow-y-auto animate-in fade-in zoom-in-95"
          >
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-700 mb-2">
              <span className="text-xs font-bold text-gray-700 dark:text-gray-200">
                {overflowDate}
              </span>
              <button
                onClick={() => {
                  setOverflowDate(null);
                  setOverflowAnchor(null);
                }}
                className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>
            <div className="space-y-1.5">
              {activeEvents
                .filter((ev) => doesEventOccurOnDate(ev, overflowDate))
                .map((ev) => (
                  <div
                    key={ev.id}
                    onClick={(e) => {
                      onSelectEvent(ev, e.currentTarget);
                      setOverflowDate(null);
                    }}
                    style={{ backgroundColor: ev.color }}
                    className="p-1.5 rounded text-white text-xs font-medium cursor-pointer shadow-xs hover:brightness-95 transition-all truncate"
                  >
                    {!ev.allDay && ev.startTime ? `${ev.startTime} ` : ''}
                    {ev.title}
                  </div>
                ))}
            </div>
          </div>
        </>
      )}

      {/* Lightweight Hover Preview Tooltip */}
      {hoveredEvent && (
        <div
          style={{ top: hoveredEvent.top, left: hoveredEvent.left }}
          className="fixed z-40 w-56 p-2.5 bg-gray-900/95 dark:bg-gray-800/95 backdrop-blur-md text-white rounded-xl shadow-xl pointer-events-none animate-in fade-in duration-100 text-xs space-y-1 border border-white/10"
        >
          <div className="flex items-center gap-2">
            <div
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: hoveredEvent.event.color }}
            />
            <p className="font-semibold truncate">{hoveredEvent.event.title}</p>
          </div>
          <p className="text-[11px] text-gray-300 font-mono">
            {hoveredEvent.event.allDay
              ? (lang === 'vi' ? 'Cả ngày' : 'All day')
              : `${hoveredEvent.event.startTime} – ${hoveredEvent.event.endTime}`}
          </p>
          {hoveredEvent.event.location && (
            <p className="text-[10px] text-gray-400 truncate">
              📍 {hoveredEvent.event.location}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
