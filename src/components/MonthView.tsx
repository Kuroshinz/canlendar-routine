import React, { useState } from 'react';
import { CalendarEvent } from '../types/calendar';
import { formatDateString, getMonthDays, doesEventOccurOnDate } from '../utils/calendarUtils';
import { getLunarDate } from '../utils/lunarUtils';
import { playNotificationSound } from '../utils/sound';
import { Check, Video, Plus, Calendar as CalIcon, Clock } from 'lucide-react';

interface MonthViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  visibleCategoryIds: Set<string>;
  onSelectEvent: (event: CalendarEvent, targetElement: HTMLElement) => void;
  onCellClick: (dateStr: string, clientX?: number, clientY?: number) => void;
  onOpenDayPlanner?: (dateStr: string) => void;
  onMoveEvent?: (eventId: string, newDateStr: string) => void;
  lang: 'vi' | 'en';
}

export const MonthView: React.FC<MonthViewProps> = ({
  currentDate,
  events,
  visibleCategoryIds,
  onSelectEvent,
  onCellClick,
  onOpenDayPlanner,
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
      left: Math.min(rect.left + window.scrollX, window.innerWidth - 280),
    });
    setOverflowDate(dateStr);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-white dark:bg-gray-900 select-none">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-800 text-center py-2 bg-gray-50/70 dark:bg-gray-850/70 shrink-0">
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
              onClick={(e) => {
                // If clicked on cell background, open inline quick popover
                onCellClick(dateStr, e.clientX, e.clientY);
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                onOpenDayPlanner?.(dateStr);
              }}
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
                  playNotificationSound();
                }
              }}
              className={`min-h-[105px] border-r border-b border-gray-200 dark:border-gray-800 p-1.5 flex flex-col transition-colors cursor-pointer group relative ${
                isDragTarget
                  ? 'bg-blue-100/60 dark:bg-blue-900/40 ring-2 ring-blue-500 ring-inset'
                  : !dayItem.isCurrentMonth
                  ? 'bg-gray-50/50 dark:bg-gray-900/50 text-gray-400 dark:text-gray-600'
                  : 'bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 hover:bg-blue-50/20 dark:hover:bg-blue-900/10'
              }`}
            >
              {/* Day Header with Solar Number, Lunar Date, and Day Planner trigger */}
              <div className="flex items-center justify-between px-1 mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full transition-transform group-hover:scale-110 ${
                      dayItem.isToday
                        ? 'bg-blue-600 text-white font-bold shadow-xs'
                        : dayItem.isCurrentMonth
                        ? 'text-gray-700 dark:text-gray-200'
                        : 'text-gray-400 dark:text-gray-600'
                    }`}
                  >
                    {dayItem.dayNumber}
                  </span>

                  {/* Day Planner Quick Icon Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenDayPlanner?.(dateStr);
                    }}
                    title={lang === 'vi' ? 'Mở lịch chi tiết ngày' : 'Open day planner'}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-blue-600 transition-all"
                  >
                    <Clock className="w-3.5 h-3.5" />
                  </button>
                </div>

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
                  const isAllDayOrMultiDay = ev.allDay || (ev.startDate !== ev.endDate);

                  if (isAllDayOrMultiDay) {
                    // Solid filled chip for All-Day / Multi-Day
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
                        style={{ backgroundColor: ev.color }}
                        className="px-2 py-0.5 rounded text-[11px] font-medium text-white truncate flex items-center gap-1.5 shadow-2xs hover:brightness-105 cursor-grab active:cursor-grabbing transition-all"
                      >
                        {ev.meetUrl && <Video className="w-2.5 h-2.5 shrink-0 opacity-90" />}
                        {ev.type === 'task' && <Check className="w-2.5 h-2.5 shrink-0 stroke-[3]" />}
                        <span className={`truncate ${ev.isCompleted ? 'line-through opacity-75' : ''}`}>
                          {ev.title}
                        </span>
                      </div>
                    );
                  }

                  // Soft Tinted Chip for Timed Events (No weird parenthesis border)
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
                        backgroundColor: `${ev.color}15`, // 10% soft tinted background
                      }}
                      className="px-1.5 py-0.5 rounded text-[11px] truncate flex items-center gap-1.5 transition-all hover:brightness-95 hover:shadow-2xs cursor-grab active:cursor-grabbing border border-transparent hover:border-black/10 dark:hover:border-white/10"
                    >
                      {/* Color dot */}
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0 shadow-2xs"
                        style={{ backgroundColor: ev.color }}
                      />

                      {/* Start time */}
                      {ev.startTime && (
                        <span className="text-[10px] font-mono font-semibold text-gray-500 dark:text-gray-300 shrink-0">
                          {ev.startTime}
                        </span>
                      )}

                      {ev.meetUrl && <Video className="w-2.5 h-2.5 shrink-0 text-blue-500 opacity-90" />}

                      {ev.type === 'task' && (
                        <Check className="w-2.5 h-2.5 shrink-0 stroke-[3] text-purple-500" />
                      )}

                      <span
                        className={`truncate font-medium text-gray-800 dark:text-gray-200 ${
                          ev.isCompleted ? 'line-through opacity-70' : ''
                        }`}
                      >
                        {ev.title}
                      </span>
                    </div>
                  );
                })}

                {/* +N More Events Button */}
                {hiddenCount > 0 && (
                  <button
                    onClick={(e) => handleOverflowClick(e, dateStr)}
                    className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 px-1.5 py-0.5 rounded-md text-left transition-colors w-fit"
                  >
                    +{hiddenCount} {lang === 'vi' ? 'sự kiện nữa' : 'more'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Overflow Popup Modal */}
      {overflowDate && overflowAnchor && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setOverflowDate(null);
            setOverflowAnchor(null);
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              top: `${Math.min(overflowAnchor.top, window.innerHeight - 300)}px`,
              left: `${overflowAnchor.left}px`,
            }}
            className="absolute z-50 w-72 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-3.5 max-h-80 overflow-y-auto animate-in fade-in zoom-in-95 duration-100"
          >
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-2 mb-2">
              <span className="text-xs font-bold text-gray-800 dark:text-gray-100">
                {overflowDate}
              </span>
              <button
                onClick={() => setOverflowDate(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-sm font-bold px-1"
              >
                &times;
              </button>
            </div>
            <div className="flex flex-col gap-1.5">
              {activeEvents
                .filter((ev) => doesEventOccurOnDate(ev, overflowDate))
                .map((ev) => (
                  <div
                    key={ev.id}
                    onClick={(e) => {
                      setOverflowDate(null);
                      onSelectEvent(ev, e.currentTarget);
                    }}
                    style={{ backgroundColor: `${ev.color}20` }}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer hover:brightness-95 flex items-center gap-2 truncate text-gray-800 dark:text-gray-100 border border-transparent hover:border-black/10"
                  >
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: ev.color }} />
                    <span className="font-mono text-[10px] text-gray-500 shrink-0">{ev.startTime}</span>
                    <span className="truncate">{ev.title}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Hover preview tooltip */}
      {hoveredEvent && (
        <div
          style={{ top: `${hoveredEvent.top}px`, left: `${hoveredEvent.left}px` }}
          className="fixed z-50 bg-gray-900/95 text-white text-xs px-3 py-2 rounded-xl shadow-2xl border border-white/10 backdrop-blur-xs pointer-events-none max-w-xs animate-in fade-in duration-100"
        >
          <div className="font-semibold">{hoveredEvent.event.title}</div>
          <div className="text-[11px] text-gray-300 font-mono mt-0.5">
            {hoveredEvent.event.startTime} – {hoveredEvent.event.endTime}
          </div>
          {hoveredEvent.event.location && (
            <div className="text-[10px] text-gray-400 mt-0.5 truncate">
              📍 {hoveredEvent.event.location}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
