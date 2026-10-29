import React, { useEffect, useRef, useState, useCallback } from 'react';
import { CalendarEvent, DnDState } from '../types/calendar';
import {
  formatDateString,
  getWeekDates,
  getFourDayDates,
  doesEventOccurOnDate,
  computeEventLayout,
} from '../utils/calendarUtils';
import { timeStringToMinutes, formatLiveDuration } from '../utils/dndUtils';
import { Video, MapPin, Check, Clock } from 'lucide-react';

interface TimeGridViewProps {
  currentDate: Date;
  viewType: 'week' | 'day' | 'fourDay';
  events: CalendarEvent[];
  visibleCategoryIds: Set<string>;
  onSelectEvent: (event: CalendarEvent, targetElement: HTMLElement) => void;
  onSlotClick: (dateStr: string, timeStr: string) => void;
  lang: 'vi' | 'en';
  // DnD & Resize Props
  dndState?: DnDState;
  onStartDrag?: (event: CalendarEvent, clientX: number, clientY: number) => void;
  onStartResize?: (event: CalendarEvent, clientY: number) => void;
  onPointerMove?: (clientY: number, targetDate?: string) => void;
  onFinishDnD?: () => void;
  onCancelDnD?: () => void;
}

export const TimeGridView: React.FC<TimeGridViewProps> = ({
  currentDate,
  viewType,
  events,
  visibleCategoryIds,
  onSelectEvent,
  onSlotClick,
  lang,
  dndState,
  onStartDrag,
  onStartResize,
  onPointerMove,
  onFinishDnD,
  onCancelDnD,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);

  // Compute the columns of dates
  let days: Date[] = [];
  if (viewType === 'day') {
    days = [currentDate];
  } else if (viewType === 'fourDay') {
    days = getFourDayDates(currentDate);
  } else {
    days = getWeekDates(currentDate, false);
  }

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const todayStr = formatDateString(new Date());

  // Auto-scroll to 8:00 AM on initial mount
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 420;
    }
  }, []);

  // Filter active events
  const activeEvents = events.filter((e) => visibleCategoryIds.has(e.calendarId));

  // Current time position (for red horizontal bar)
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const currentTimeTopPercent = (currentMinutes / (24 * 60)) * 100;

  const weekdayNamesVi = ['CN', 'THỨ 2', 'THỨ 3', 'THỨ 4', 'THỨ 5', 'THỨ 6', 'THỨ 7'];
  const weekdayNamesEn = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  // Global Pointer Events for Drag & Resize
  const isInteracting = Boolean(dndState?.isDragging || dndState?.isResizing);

  const handleGlobalPointerMove = useCallback(
    (e: PointerEvent) => {
      if (!isInteracting || !onPointerMove || !gridContainerRef.current) return;

      const rect = gridContainerRef.current.getBoundingClientRect();
      const relativeX = e.clientX - rect.left;

      // Determine column based on relativeX
      const colWidth = rect.width / days.length;
      const colIndex = Math.max(0, Math.min(days.length - 1, Math.floor(relativeX / colWidth)));
      const targetDate = formatDateString(days[colIndex]);

      onPointerMove(e.clientY, targetDate);

      // Auto-scroll if near top or bottom edges of scrollContainer
      if (scrollContainerRef.current) {
        const scrollRect = scrollContainerRef.current.getBoundingClientRect();
        const topThreshold = scrollRect.top + 50;
        const bottomThreshold = scrollRect.bottom - 50;

        if (e.clientY < topThreshold) {
          scrollContainerRef.current.scrollTop -= 10;
        } else if (e.clientY > bottomThreshold) {
          scrollContainerRef.current.scrollTop += 10;
        }
      }
    },
    [isInteracting, onPointerMove, days]
  );

  const handleGlobalPointerUp = useCallback(() => {
    if (isInteracting && onFinishDnD) {
      onFinishDnD();
    }
  }, [isInteracting, onFinishDnD]);

  useEffect(() => {
    if (isInteracting) {
      window.addEventListener('pointermove', handleGlobalPointerMove);
      window.addEventListener('pointerup', handleGlobalPointerUp);
      return () => {
        window.removeEventListener('pointermove', handleGlobalPointerMove);
        window.removeEventListener('pointerup', handleGlobalPointerUp);
      };
    }
  }, [isInteracting, handleGlobalPointerMove, handleGlobalPointerUp]);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-white dark:bg-gray-900 select-none">
      <div className="flex-1 flex flex-col min-w-full overflow-x-auto">
        <div className={viewType === 'week' ? 'min-w-[680px] flex flex-col h-full' : 'w-full flex flex-col h-full'}>
          {/* Top Header Row with Days */}
          <div className="flex border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0">
            <div className="w-16 sm:w-20 border-r border-gray-200 dark:border-gray-800 p-2 text-right text-[11px] font-medium text-gray-400">
              GMT+7
            </div>
            <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
              {days.map((d, idx) => {
                const dateStr = formatDateString(d);
                const isToday = dateStr === todayStr;
                const dayOfWeek = d.getDay();
                const label = lang === 'vi' ? weekdayNamesVi[dayOfWeek] : weekdayNamesEn[dayOfWeek];

                return (
                  <div
                    key={idx}
                    className="py-2.5 px-1 text-center border-r border-gray-200 dark:border-gray-800 flex flex-col items-center justify-center transition-colors hover:bg-gray-50/50 dark:hover:bg-gray-800/30"
                  >
                    <span
                      className={`text-[11px] font-semibold tracking-wider ${
                        isToday ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      {label}
                    </span>
                    <span
                      className={`text-xl font-medium w-9 h-9 flex items-center justify-center rounded-full mt-0.5 transition-all ${
                        isToday
                          ? 'bg-blue-600 text-white font-bold shadow-md'
                          : 'text-gray-800 dark:text-gray-100'
                      }`}
                    >
                      {d.getDate()}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* All Day Events Section */}
          <div className="flex border-b border-gray-200 dark:border-gray-800 bg-gray-50/40 dark:bg-gray-850/40 shrink-0 max-h-28 overflow-y-auto">
            <div className="w-16 sm:w-20 border-r border-gray-200 dark:border-gray-800 p-2 text-[10px] font-medium text-gray-400 text-center flex items-center justify-center">
              {lang === 'vi' ? 'Cả ngày' : 'All day'}
            </div>
            <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
              {days.map((d, idx) => {
                const dateStr = formatDateString(d);
                const allDayEvents = activeEvents.filter(
                  (e) => (e.allDay || e.startDate !== e.endDate) && doesEventOccurOnDate(e, dateStr)
                );

                return (
                  <div
                    key={idx}
                    onClick={() => onSlotClick(dateStr, '09:00')}
                    className="p-1 border-r border-gray-200 dark:border-gray-800 min-h-[36px] flex flex-col gap-1 cursor-pointer"
                  >
                    {allDayEvents.map((ev) => (
                      <div
                        key={ev.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectEvent(ev, e.currentTarget);
                        }}
                        style={{ backgroundColor: ev.color }}
                        className="px-2 py-0.5 rounded text-[11px] font-medium text-white truncate shadow-xs cursor-pointer hover:brightness-95 flex items-center gap-1"
                      >
                        {ev.meetUrl && <Video className="w-2.5 h-2.5 shrink-0" />}
                        <span className="truncate">{ev.title}</span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 24-Hour Scrollable Grid */}
          <div ref={scrollContainerRef} className="flex-1 overflow-y-auto relative flex">
            {/* Time Labels Column */}
            <div className="w-16 sm:w-20 shrink-0 select-none border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
              {hours.map((hour) => (
                <div
                  key={hour}
                  className="h-14 relative -top-2.5 text-right pr-2 text-xs text-gray-400 dark:text-gray-500 font-mono"
                >
                  {hour === 0 ? '' : `${String(hour).padStart(2, '0')}:00`}
                </div>
              ))}
            </div>

            {/* Day Columns */}
            <div
              ref={gridContainerRef}
              className="flex-1 grid relative"
              style={{
                gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` ,
                height: `${24 * 56}px`, // 24 hours * 56px per hour
              }}
            >
              {days.map((d, colIdx) => {
                const dateStr = formatDateString(d);
                const isToday = dateStr === todayStr;
                const layoutMap = computeEventLayout(activeEvents, dateStr);

                // Check if ghost preview belongs to this day column
                const showGhostHere =
                  isInteracting &&
                  dndState?.currentPreview &&
                  dndState.currentPreview.date === dateStr &&
                  dndState.initialEvent;

                const ghostStartMins = showGhostHere
                  ? timeStringToMinutes(dndState.currentPreview!.startTime)
                  : 0;
                const ghostEndMins = showGhostHere
                  ? timeStringToMinutes(dndState.currentPreview!.endTime)
                  : 0;
                const ghostTopPercent = (ghostStartMins / (24 * 60)) * 100;
                const ghostHeightPercent = Math.max(
                  ((ghostEndMins - ghostStartMins) / (24 * 60)) * 100,
                  1.5
                );

                return (
                  <div
                    key={colIdx}
                    className="border-r border-gray-200 dark:border-gray-800 relative h-full group"
                  >
                    {/* 24 Hour slot grid lines */}
                    {hours.map((hour) => {
                      const timeFormatted = `${String(hour).padStart(2, '0')}:00`;
                      return (
                        <div
                          key={hour}
                          onClick={() => onSlotClick(dateStr, timeFormatted)}
                          className="h-14 border-b border-gray-100 dark:border-gray-800/80 hover:bg-blue-50/20 dark:hover:bg-blue-900/10 cursor-pointer relative"
                        >
                          {/* Half-hour subtle dashed line */}
                          <div className="absolute inset-x-0 top-1/2 border-b border-dashed border-gray-100 dark:border-gray-850/60 pointer-events-none" />
                        </div>
                      );
                    })}

                    {/* Real-time Current Time Line (Red) */}
                    {isToday && (
                      <div
                        style={{ top: `${currentTimeTopPercent}%` }}
                        className="absolute inset-x-0 z-20 pointer-events-none flex items-center"
                      >
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500 -ml-1.5 shadow-sm" />
                        <div className="flex-1 h-0.5 bg-red-500 shadow-sm" />
                      </div>
                    )}

                    {/* Ghost Preview Card when Dragging or Resizing */}
                    {showGhostHere && dndState?.initialEvent && (
                      <div
                        style={{
                          top: `${ghostTopPercent}%`,
                          height: `${ghostHeightPercent}%`,
                          left: '4px',
                          right: '4px',
                          backgroundColor: `${dndState.initialEvent.color}33`,
                          borderColor: dndState.initialEvent.color,
                        }}
                        className="absolute z-30 rounded-md p-1.5 border-2 border-dashed shadow-lg pointer-events-none flex flex-col justify-between transition-all"
                      >
                        {/* Live Floating Tooltip Badge */}
                        <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-gray-900/95 text-white text-[11px] px-2.5 py-0.5 rounded-md shadow-xl whitespace-nowrap z-40 font-medium flex items-center gap-1.5 border border-white/10 backdrop-blur-xs">
                          <Clock className="w-3 h-3 text-blue-400 shrink-0" />
                          <span className="font-mono">
                            {dndState.currentPreview!.startTime} – {dndState.currentPreview!.endTime}
                          </span>
                          <span className="text-gray-300 font-sans">
                            ({formatLiveDuration(dndState.currentPreview!.durationMinutes, lang)})
                          </span>
                        </div>

                        <div>
                          <div className="flex items-center gap-1 font-semibold text-xs truncate" style={{ color: dndState.initialEvent.color }}>
                            <span>{dndState.initialEvent.title}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Timed Events */}
                    {Array.from(layoutMap.entries()).map(([eventId, layout]) => {
                      const ev = activeEvents.find((e) => e.id === eventId);
                      if (!ev) return null;

                      const isCurrentlyActive = isInteracting && dndState?.eventId === ev.id;

                      return (
                        <div
                          key={ev.id}
                          onPointerDown={(e) => {
                            // Don't trigger drag if clicking links or details
                            if (e.button !== 0) return; // Only left-click
                            onStartDrag?.(ev, e.clientX, e.clientY);
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!isInteracting) {
                              onSelectEvent(ev, e.currentTarget);
                            }
                          }}
                          style={{
                            top: `${layout.topPercent}%`,
                            height: `${Math.max(layout.heightPercent, 2.2)}%`,
                            left: `${layout.leftPercent}%`,
                            width: `${layout.widthPercent}%`,
                            backgroundColor: ev.color,
                            opacity: isCurrentlyActive ? 0.35 : 1,
                          }}
                          className={`absolute z-10 rounded-md p-1.5 text-white shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing overflow-hidden transition-all hover:brightness-105 border border-white/20 flex flex-col justify-between group/card ${
                            isCurrentlyActive ? 'ring-2 ring-blue-400' : ''
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-1 font-semibold text-xs truncate">
                              {ev.meetUrl && <Video className="w-3 h-3 shrink-0" />}
                              {ev.type === 'task' && <Check className="w-3 h-3 shrink-0 stroke-[3]" />}
                              <span className={`truncate ${ev.isCompleted ? 'line-through' : ''}`}>
                                {ev.title}
                              </span>
                            </div>
                            <div className="text-[10px] text-white/90 font-mono mt-0.5 truncate">
                              {ev.startTime} – {ev.endTime}
                            </div>
                          </div>

                          {ev.location && (
                            <div className="flex items-center gap-0.5 text-[9px] text-white/80 truncate mt-0.5">
                              <MapPin className="w-2.5 h-2.5 shrink-0" />
                              <span className="truncate">{ev.location}</span>
                            </div>
                          )}

                          {/* Resize Handle at Bottom Edge */}
                          <div
                            onPointerDown={(e) => {
                              e.stopPropagation();
                              onStartResize?.(ev, e.clientY);
                            }}
                            className="absolute inset-x-0 bottom-0 h-2 cursor-ns-resize hover:bg-white/40 transition-colors flex items-center justify-center group/resize"
                            title={lang === 'vi' ? 'Kéo để co giãn thời lượng' : 'Drag to resize duration'}
                          >
                            <div className="w-5 h-0.5 bg-white/70 rounded-full group-hover/resize:bg-white shadow-xs" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
