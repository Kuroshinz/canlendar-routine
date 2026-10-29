import React from 'react';
import { CalendarEvent } from '../types/calendar';
import { formatDateString, getMonthDays, doesEventOccurOnDate } from '../utils/calendarUtils';

interface YearViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  visibleCategoryIds: Set<string>;
  onSelectDate: (date: Date) => void;
  lang: 'vi' | 'en';
}

export const YearView: React.FC<YearViewProps> = ({
  currentDate,
  events,
  visibleCategoryIds,
  onSelectDate,
  lang,
}) => {
  const year = currentDate.getFullYear();
  const months = Array.from({ length: 12 }, (_, i) => i);
  const todayStr = formatDateString(new Date());

  const monthNamesVi = [
    'ThÃ¡ng 1', 'ThÃ¡ng 2', 'ThÃ¡ng 3', 'ThÃ¡ng 4', 'ThÃ¡ng 5', 'ThÃ¡ng 6',
    'ThÃ¡ng 7', 'ThÃ¡ng 8', 'ThÃ¡ng 9', 'ThÃ¡ng 10', 'ThÃ¡ng 11', 'ThÃ¡ng 12'
  ];
  const monthNamesEn = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const weekdayLetters = lang === 'vi'
    ? ['C', 'H', 'B', 'T', 'N', 'S', 'B']
    : ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const activeEvents = events.filter((e) => visibleCategoryIds.has(e.calendarId));

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-white dark:bg-gray-900 select-none">
      <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {months.map((m) => {
          const days = getMonthDays(year, m, false);

          return (
            <div
              key={m}
              className="bg-gray-50/60 dark:bg-[#1a1e24]/40 rounded-xl p-3 border border-gray-100 dark:border-gray-800"
            >
              <h2 className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-2 px-1">
                {lang === 'vi' ? monthNamesVi[m] : monthNamesEn[m]}
              </h2>

              <div className="grid grid-cols-7 text-center text-[10px] text-gray-400 font-medium mb-1">
                {weekdayLetters.map((w, idx) => (
                  <span key={idx} className="h-5 flex items-center justify-center">
                    {w}
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-7 text-center text-xs gap-y-0.5">
                {days.map((item, dIdx) => {
                  if (!item.isCurrentMonth) {
                    return <div key={dIdx} className="h-7 w-7" />;
                  }

                  const dateEvents = activeEvents.filter((e) => doesEventOccurOnDate(e, item.dateString));
                  const hasEvents = dateEvents.length > 0;

                  return (
                    <button
                      key={dIdx}
                      onClick={() => onSelectDate(item.date)}
                      className={`h-7 w-7 mx-auto rounded-full flex flex-col items-center justify-center relative transition-all cursor-pointer ${
                        item.isToday
                          ? 'bg-blue-600 text-white font-bold shadow-xs'
                          : hasEvents
                          ? 'font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#242931]'
                      }`}
                    >
                      <span className="text-[11px]">{item.dayNumber}</span>
                      {hasEvents && !item.isToday && (
                        <div className="flex gap-0.5 mt-[-2px]">
                          {dateEvents.slice(0, 3).map((e, i) => (
                            <span
                              key={i}
                              style={{ backgroundColor: e.color }}
                              className="w-1 h-1 rounded-full"
                            />
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

