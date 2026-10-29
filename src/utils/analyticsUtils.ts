import { CalendarEvent, CalendarCategory } from '../types/calendar';
import { AnalyticsMetrics, CategoryBreakdownItem, OverloadDayItem } from '../types/multiHub';
import { timeStringToMinutes } from './dndUtils';

/**
 * Checks if a date YYYY-MM-DD falls within [startDate, endDate] inclusive.
 */
export function isDateInRange(dateStr: string, startDate: string, endDate: string): boolean {
  return dateStr >= startDate && dateStr <= endDate;
}

/**
 * Determines whether an event counts as a Meeting / Call.
 */
export function isMeetingEvent(event: CalendarEvent): boolean {
  if (event.meetUrl) return true;
  const lowerTitle = (event.title || '').toLowerCase();
  const lowerDesc = (event.description || '').toLowerCase();
  const keywords = ['họp', 'meet', 'zoom', 'call', 'phỏng vấn', 'trao đổi', 'sync', 'standup', 'retrospective'];
  return keywords.some((kw) => lowerTitle.includes(kw) || lowerDesc.includes(kw));
}

/**
 * Calculates analytics metrics from events within a date range.
 */
export function computeAnalyticsMetrics(
  events: CalendarEvent[],
  categories: CalendarCategory[],
  startDate: string,
  endDate: string,
  lang: 'vi' | 'en' = 'vi'
): AnalyticsMetrics {
  // Filter events occurring within the date range
  const filteredEvents = events.filter((e) => {
    return isDateInRange(e.startDate, startDate, endDate);
  });

  let totalMinutes = 0;
  let meetingMinutes = 0;
  let deepWorkMinutes = 0;

  // Minutes map by categoryId
  const categoryMinutesMap = new Map<string, number>();

  // Daily map for burnout detection: date -> list of events
  const dayEventsMap = new Map<string, CalendarEvent[]>();

  for (const ev of filteredEvents) {
    let duration = 0;
    if (ev.allDay) {
      duration = 8 * 60; // Count all-day as 8 hours
    } else {
      const startM = timeStringToMinutes(ev.startTime);
      const endM = timeStringToMinutes(ev.endTime);
      duration = Math.max(15, endM - startM);
    }

    totalMinutes += duration;

    // Check meeting vs deep work
    const isMeeting = isMeetingEvent(ev);
    if (isMeeting) {
      meetingMinutes += duration;
    } else {
      deepWorkMinutes += duration;
    }

    // Accumulate by category
    const catId = ev.calendarId || 'personal';
    categoryMinutesMap.set(catId, (categoryMinutesMap.get(catId) || 0) + duration);

    // Group by day for burnout detection
    if (!dayEventsMap.has(ev.startDate)) {
      dayEventsMap.set(ev.startDate, []);
    }
    dayEventsMap.get(ev.startDate)!.push(ev);
  }

  // Build category breakdown
  const categoryBreakdown: CategoryBreakdownItem[] = [];
  const catLookup = new Map(categories.map((c) => [c.id, c]));

  categoryMinutesMap.forEach((minutes, catId) => {
    const cat = catLookup.get(catId);
    const categoryName = cat ? (lang === 'vi' ? cat.nameVi : cat.name) : catId;
    const color = cat?.color || '#039BE5';
    const percentage = totalMinutes > 0 ? Math.round((minutes / totalMinutes) * 100) : 0;

    categoryBreakdown.push({
      categoryId: catId,
      categoryName,
      color,
      minutes,
      percentage,
    });
  });

  // Sort by highest minutes
  categoryBreakdown.sort((a, b) => b.minutes - a.minutes);

  // Detect burnout days (> 8 hours or continuous meetings without break)
  const overloadedDays: OverloadDayItem[] = [];

  dayEventsMap.forEach((dayEvs, date) => {
    let dayTotalMins = 0;
    for (const ev of dayEvs) {
      if (ev.allDay) {
        dayTotalMins += 8 * 60;
      } else {
        const s = timeStringToMinutes(ev.startTime);
        const e = timeStringToMinutes(ev.endTime);
        dayTotalMins += Math.max(15, e - s);
      }
    }

    const dayHours = Math.round((dayTotalMins / 60) * 10) / 10;
    if (dayHours >= 8.5) {
      overloadedDays.push({
        date,
        totalHours: dayHours,
        reason:
          lang === 'vi'
            ? `Thời gian làm việc/họp đạt ${dayHours}h (vượt ngưỡng 8h khuyến nghị).`
            : `Scheduled time is ${dayHours}h (exceeds recommended 8h limit).`,
      });
    }
  });

  // Sort overloaded days by date
  overloadedDays.sort((a, b) => a.date.localeCompare(b.date));

  return {
    totalMinutes,
    totalEvents: filteredEvents.length,
    deepWorkMinutes,
    meetingMinutes,
    categoryBreakdown,
    isOverloaded: overloadedDays.length > 0,
    overloadedDays,
  };
}
