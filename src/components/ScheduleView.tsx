import React from 'react';
import { CalendarEvent } from '../types/calendar';
import { formatDateString, parseDateString, doesEventOccurOnDate } from '../utils/calendarUtils';
import { Video, MapPin, CheckCircle, Clock, Calendar as CalIcon } from 'lucide-react';

interface ScheduleViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  visibleCategoryIds: Set<string>;
  searchQuery: string;
  onSelectEvent: (event: CalendarEvent, targetElement: HTMLElement) => void;
  onToggleCompleteTask?: (eventId: string) => void;
  onJoinMeet?: (event: CalendarEvent) => void;
  lang: 'vi' | 'en';
}

export const ScheduleView: React.FC<ScheduleViewProps> = ({
  currentDate,
  events,
  visibleCategoryIds,
  searchQuery,
  onSelectEvent,
  onToggleCompleteTask,
  onJoinMeet,
  lang,
}) => {
  const activeEvents = events.filter((e) => visibleCategoryIds.has(e.calendarId));

  // If search query is present, filter by title/location/description
  const filteredEvents = activeEvents.filter((e) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      e.title.toLowerCase().includes(q) ||
      (e.location && e.location.toLowerCase().includes(q)) ||
      (e.description && e.description.toLowerCase().includes(q))
    );
  });

  // Generate date entries starting from currentDate for 60 days
  const dateGroups: { dateStr: string; date: Date; events: CalendarEvent[] }[] = [];
  const start = new Date(currentDate);

  for (let i = 0; i < 45; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const dateStr = formatDateString(d);

    const matches = filteredEvents.filter((e) => doesEventOccurOnDate(e, dateStr));
    if (matches.length > 0) {
      // Sort: all day first, then by startTime
      matches.sort((a, b) => {
        if (a.allDay && !b.allDay) return -1;
        if (!a.allDay && b.allDay) return 1;
        return (a.startTime || '').localeCompare(b.startTime || '');
      });

      dateGroups.push({
        dateStr,
        date: d,
        events: matches,
      });
    }
  }

  const todayStr = formatDateString(new Date());

  const getDayLabel = (d: Date, dateStr: string) => {
    if (dateStr === todayStr) {
      return lang === 'vi' ? 'Hôm nay' : 'Today';
    }
    const daysVi = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    const daysEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return lang === 'vi' ? daysVi[d.getDay()] : daysEn[d.getDay()];
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-gray-50/50 dark:bg-gray-900 select-none">
      <div className="max-w-3xl mx-auto space-y-6">
        {dateGroups.length === 0 ? (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">
            <CalIcon className="w-12 h-12 mx-auto mb-3 opacity-40 text-gray-400" />
            <p className="text-base font-medium">
              {lang === 'vi'
                ? 'Không tìm thấy sự kiện nào trong khoảng thời gian này.'
                : 'No events found for this timeframe.'}
            </p>
          </div>
        ) : (
          dateGroups.map((group) => {
            const isToday = group.dateStr === todayStr;

            return (
              <div key={group.dateStr} className="flex flex-col sm:flex-row gap-2 sm:gap-6 items-start">
                {/* Date column */}
                <div className="w-32 shrink-0 pt-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-2xl font-bold w-10 h-10 rounded-full flex items-center justify-center ${
                        isToday
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-gray-800 dark:text-gray-100'
                      }`}
                    >
                      {group.date.getDate()}
                    </span>
                    <div>
                      <span className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                        {getDayLabel(group.date, group.dateStr)}
                      </span>
                      <span className="text-[11px] text-gray-400">
                        {group.date.toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US', {
                          month: 'short',
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Events list cards */}
                <div className="flex-1 space-y-2.5 w-full">
                  {group.events.map((ev) => (
                    <div
                      key={ev.id}
                      onClick={(e) => onSelectEvent(ev, e.currentTarget)}
                      className="bg-white dark:bg-gray-800 p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all cursor-pointer relative overflow-hidden group"
                    >
                      {/* Left accent color strip */}
                      <div
                        className="absolute left-0 top-0 bottom-0 w-1.5"
                        style={{ backgroundColor: ev.color }}
                      />

                      <div className="flex items-start justify-between gap-3 pl-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {ev.type === 'task' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onToggleCompleteTask?.(ev.id);
                                }}
                                className="text-gray-400 hover:text-emerald-500 cursor-pointer"
                              >
                                <CheckCircle
                                  className={`w-4 h-4 ${
                                    ev.isCompleted ? 'text-emerald-500 fill-emerald-100' : ''
                                  }`}
                                />
                              </button>
                            )}

                            <h3
                              className={`text-sm font-semibold text-gray-800 dark:text-gray-100 truncate ${
                                ev.isCompleted ? 'line-through text-gray-400 dark:text-gray-500' : ''
                              }`}
                            >
                              {ev.title}
                            </h3>

                            <span
                              style={{ color: ev.color, borderColor: ev.color }}
                              className="text-[10px] font-medium px-2 py-0.5 rounded-full border bg-opacity-10 shrink-0"
                            >
                              {ev.type === 'event'
                                ? lang === 'vi' ? 'Sự kiện' : 'Event'
                                : ev.type === 'task'
                                ? lang === 'vi' ? 'Tác vụ' : 'Task'
                                : lang === 'vi' ? 'Nhắc nhở' : 'Reminder'}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-gray-500 dark:text-gray-400">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              {ev.allDay
                                ? lang === 'vi' ? 'Cả ngày' : 'All day'
                                : `${ev.startTime} – ${ev.endTime}`}
                            </span>

                            {ev.location && (
                              <span className="flex items-center gap-1 truncate">
                                <MapPin className="w-3.5 h-3.5 text-gray-400" />
                                <span className="truncate">{ev.location}</span>
                              </span>
                            )}
                          </div>

                          {ev.description && (
                            <p className="mt-1.5 text-xs text-gray-600 dark:text-gray-300 line-clamp-2">
                              {ev.description}
                            </p>
                          )}
                        </div>

                        {/* Google Meet Direct Join Button */}
                        {ev.meetUrl && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onJoinMeet) onJoinMeet(ev);
                              else window.open(ev.meetUrl, '_blank');
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium shadow-xs transition-colors shrink-0 cursor-pointer"
                          >
                            <Video className="w-3.5 h-3.5" />
                            <span>{lang === 'vi' ? 'Tham gia' : 'Join'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
