import { CalendarEvent, RecurrenceType } from '../types/calendar';

/**
 * Format Date to YYYY-MM-DD
 */
export function formatDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Parse YYYY-MM-DD safely in local time
 */
export function parseDateString(str: string): Date {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

/**
 * Format time to HH:mm
 */
export function formatTimeString(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

/**
 * Generate 35 or 42 grid cells for Month View
 */
export interface MonthGridDay {
  date: Date;
  dateString: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  dayNumber: number;
}

export function getMonthDays(year: number, month: number, weekStartsOnMonday = false): MonthGridDay[] {
  const todayStr = formatDateString(new Date());
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  // Day of week for 1st of month: 0 (Sun) to 6 (Sat)
  let firstDayIndex = firstDayOfMonth.getDay();
  if (weekStartsOnMonday) {
    firstDayIndex = (firstDayIndex + 6) % 7;
  }

  const days: MonthGridDay[] = [];

  // Previous month trailing days
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const dayNum = prevMonthLastDay - i;
    const d = new Date(year, month - 1, dayNum);
    const dateStr = formatDateString(d);
    days.push({
      date: d,
      dateString: dateStr,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      dayNumber: dayNum,
    });
  }

  // Current month days
  const totalDaysCurrentMonth = lastDayOfMonth.getDate();
  for (let i = 1; i <= totalDaysCurrentMonth; i++) {
    const d = new Date(year, month, i);
    const dateStr = formatDateString(d);
    days.push({
      date: d,
      dateString: dateStr,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
      dayNumber: i,
    });
  }

  // Next month leading days (fill up to multiple of 7, 35 or 42)
  const remainingCells = (7 - (days.length % 7)) % 7;
  const targetTotal = days.length + remainingCells < 35 ? 35 : days.length + remainingCells;
  let nextMonthDay = 1;
  while (days.length < targetTotal) {
    const d = new Date(year, month + 1, nextMonthDay);
    const dateStr = formatDateString(d);
    days.push({
      date: d,
      dateString: dateStr,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      dayNumber: nextMonthDay,
    });
    nextMonthDay++;
  }

  return days;
}

/**
 * Returns 7 days for the week containing `targetDate`
 */
export function getWeekDates(targetDate: Date, weekStartsOnMonday = false): Date[] {
  const date = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
  let day = date.getDay(); // 0 is Sunday
  if (weekStartsOnMonday) {
    day = (day + 6) % 7;
  }

  const startOfWeek = new Date(date);
  startOfWeek.setDate(date.getDate() - day);

  const week: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    week.push(d);
  }
  return week;
}

/**
 * Returns 4 consecutive days starting from targetDate
 */
export function getFourDayDates(targetDate: Date): Date[] {
  const dates: Date[] = [];
  for (let i = 0; i < 4; i++) {
    const d = new Date(targetDate);
    d.setDate(targetDate.getDate() + i);
    dates.push(d);
  }
  return dates;
}

/**
 * Checks if an event occurs on a specific target date string (handles recurring)
 */
export function doesEventOccurOnDate(event: CalendarEvent, targetDateStr: string): boolean {
  if (event.startDate === targetDateStr) return true;
  if (!event.recurrence || event.recurrence === 'none') {
    // Multi-day non-recurring event check
    if (event.endDate && event.startDate <= targetDateStr && targetDateStr <= event.endDate) {
      return true;
    }
    return false;
  }

  // If target date is before event start, it cannot occur
  if (targetDateStr < event.startDate) return false;

  const targetDate = parseDateString(targetDateStr);
  const startDate = parseDateString(event.startDate);

  switch (event.recurrence) {
    case 'daily':
      return true;
    case 'weekly':
      return targetDate.getDay() === startDate.getDay();
    case 'monthly':
      return targetDate.getDate() === startDate.getDate();
    case 'yearly':
      return targetDate.getMonth() === startDate.getMonth() && targetDate.getDate() === startDate.getDate();
    default:
      return false;
  }
}

/**
 * Calculate overlapping layout for Week/Day view columns
 */
export interface LayoutPosition {
  topPercent: number;
  heightPercent: number;
  leftPercent: number;
  widthPercent: number;
}

export function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function computeEventLayout(
  events: CalendarEvent[],
  targetDateStr: string
): Map<string, LayoutPosition> {
  const layoutMap = new Map<string, LayoutPosition>();
  const dayEvents = events.filter((e) => !e.allDay && doesEventOccurOnDate(e, targetDateStr));

  // Sort by start time then by duration
  const sorted = [...dayEvents].sort((a, b) => {
    const aStart = timeToMinutes(a.startTime);
    const bStart = timeToMinutes(b.startTime);
    if (aStart !== bStart) return aStart - bStart;
    const aDur = timeToMinutes(a.endTime) - aStart;
    const bDur = timeToMinutes(b.endTime) - bStart;
    return bDur - aDur;
  });

  // Cluster overlapping events
  const clusters: CalendarEvent[][] = [];
  let currentCluster: CalendarEvent[] = [];
  let clusterEnd = -1;

  for (const ev of sorted) {
    const start = timeToMinutes(ev.startTime);
    const end = Math.max(timeToMinutes(ev.endTime), start + 30); // minimum 30 min duration for visibility

    if (currentCluster.length === 0) {
      currentCluster.push(ev);
      clusterEnd = end;
    } else if (start < clusterEnd) {
      // Overlaps
      currentCluster.push(ev);
      clusterEnd = Math.max(clusterEnd, end);
    } else {
      clusters.push(currentCluster);
      currentCluster = [ev];
      clusterEnd = end;
    }
  }
  if (currentCluster.length > 0) {
    clusters.push(currentCluster);
  }

  // Layout each cluster
  for (const cluster of clusters) {
    // Assign columns within cluster
    const columns: CalendarEvent[][] = [];
    for (const ev of cluster) {
      const start = timeToMinutes(ev.startTime);
      let placed = false;
      for (let colIdx = 0; colIdx < columns.length; colIdx++) {
        const lastInCol = columns[colIdx][columns[colIdx].length - 1];
        const lastEnd = Math.max(timeToMinutes(lastInCol.endTime), timeToMinutes(lastInCol.startTime) + 30);
        if (start >= lastEnd) {
          columns[colIdx].push(ev);
          placed = true;
          break;
        }
      }
      if (!placed) {
        columns.push([ev]);
      }
    }

    const numCols = columns.length;
    columns.forEach((col, colIdx) => {
      col.forEach((ev) => {
        const start = timeToMinutes(ev.startTime);
        const end = Math.max(timeToMinutes(ev.endTime), start + 30);
        const topPercent = (start / (24 * 60)) * 100;
        const heightPercent = ((end - start) / (24 * 60)) * 100;
        const widthPercent = (1 / numCols) * 100;
        const leftPercent = (colIdx / numCols) * 100;

        layoutMap.set(ev.id, {
          topPercent,
          heightPercent,
          leftPercent,
          widthPercent,
        });
      });
    });
  }

  return layoutMap;
}

/**
 * Generate realistic Google Meet URL
 */
export function generateGoogleMeetUrl(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  const rand = (n: number) => Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `https://meet.google.com/${rand(3)}-${rand(4)}-${rand(3)}`;
}

/**
 * Natural language parser for Quick Add (supports both Tiếng Việt and English)
 * e.g. "Họp nhóm 10h sáng mai", "Meeting at 3pm tomorrow", "Lunch on Friday at 12:30"
 */
export function parseNaturalLanguageInput(
  text: string,
  referenceDate: Date = new Date()
): { title: string; date: string; startTime: string; endTime: string } {
  let cleanText = text.trim();
  const ref = new Date(referenceDate);

  let targetDate = new Date(ref);
  let startHour = 9;
  let startMinute = 0;
  let hasExplicitTime = false;

  // Check tomorrow / ngày mai
  if (/\b(ngày mai|mai|tomorrow)\b/i.test(cleanText)) {
    targetDate.setDate(targetDate.getDate() + 1);
    cleanText = cleanText.replace(/\b(ngày mai|mai|tomorrow)\b/i, '').trim();
  } else if (/\b(hôm nay|today)\b/i.test(cleanText)) {
    cleanText = cleanText.replace(/\b(hôm nay|today)\b/i, '').trim();
  }

  // Check day of week (thứ 2..thứ 7, chủ nhật / monday..sunday)
  const daysVi: { [key: string]: number } = {
    'chủ nhật': 0, 'cn': 0,
    'thứ hai': 1, 'thứ 2': 1, 't2': 1,
    'thứ ba': 2, 'thứ 3': 2, 't3': 2,
    'thứ tư': 3, 'thứ 4': 3, 't4': 3,
    'thứ năm': 4, 'thứ 5': 4, 't5': 4,
    'thứ sáu': 5, 'thứ 6': 5, 't6': 5,
    'thứ bảy': 6, 'thứ 7': 6, 't7': 6,
  };
  const daysEn: { [key: string]: number } = {
    sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6,
  };

  for (const [name, targetDayOfWeek] of Object.entries({ ...daysVi, ...daysEn })) {
    const reg = new RegExp(`\\b${name}\\b`, 'i');
    if (reg.test(cleanText)) {
      const currentDay = ref.getDay();
      let diff = targetDayOfWeek - currentDay;
      if (diff <= 0) diff += 7;
      targetDate.setDate(ref.getDate() + diff);
      cleanText = cleanText.replace(reg, '').trim();
      break;
    }
  }

  // Check Vietnamese hour patterns: "10h", "10h30", "14:00", "8 giờ tối", "9h sáng"
  const viTimeMatch = cleanText.match(/(\d{1,2})(?:h|:)(\d{2})?\s*(sáng|trưa|chiều|tối)?/i);
  if (viTimeMatch) {
    let h = parseInt(viTimeMatch[1], 10);
    const m = viTimeMatch[2] ? parseInt(viTimeMatch[2], 10) : 0;
    const period = viTimeMatch[3]?.toLowerCase();

    if ((period === 'chiều' || period === 'tối') && h < 12) {
      h += 12;
    } else if (period === 'trưa' && h < 11) {
      h += 12;
    }
    startHour = h % 24;
    startMinute = m;
    hasExplicitTime = true;
    cleanText = cleanText.replace(viTimeMatch[0], '').trim();
  } else {
    // English hour patterns: "at 3pm", "10:30am", "5 pm"
    const enTimeMatch = cleanText.match(/\b(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i);
    if (enTimeMatch) {
      let h = parseInt(enTimeMatch[1], 10);
      const m = enTimeMatch[2] ? parseInt(enTimeMatch[2], 10) : 0;
      const ampm = enTimeMatch[3]?.toLowerCase();
      if (ampm === 'pm' && h < 12) h += 12;
      if (ampm === 'am' && h === 12) h = 0;
      startHour = h % 24;
      startMinute = m;
      hasExplicitTime = true;
      cleanText = cleanText.replace(enTimeMatch[0], '').trim();
    }
  }

  // If no explicit time was entered, default to next nearest upcoming full hour
  if (!hasExplicitTime) {
    startHour = (ref.getHours() + 1) % 24;
    startMinute = 0;
  }

  const endHour = (startHour + 1) % 24;
  const startTime = `${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}`;
  const endTime = `${String(endHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}`;

  const title = cleanText.replace(/^(vào lúc|lúc|at|on)\s+/i, '').trim() || 'Sự kiện mới';

  return {
    title,
    date: formatDateString(targetDate),
    startTime,
    endTime,
  };
}

/**
 * Export events to RFC 5545 iCalendar (.ics) format
 */
export function exportToIcs(events: CalendarEvent[]): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Google Calendar Clone//AI Studio//VI',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  for (const event of events) {
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${event.id}@calendar.google.local`);
    lines.push(`SUMMARY:${event.title.replace(/\n/g, ' ')}`);
    if (event.description) {
      lines.push(`DESCRIPTION:${event.description.replace(/\n/g, '\\n')}`);
    }
    if (event.location) {
      lines.push(`LOCATION:${event.location}`);
    }

    // Format start/end date-times: YYYYMMDDTHHmm00
    const startStr = event.startDate.replace(/-/g, '');
    const endStr = event.endDate.replace(/-/g, '');

    if (event.allDay) {
      lines.push(`DTSTART;VALUE=DATE:${startStr}`);
      // In iCalendar all-day ends next day
      const nextDay = parseDateString(event.endDate);
      nextDay.setDate(nextDay.getDate() + 1);
      lines.push(`DTEND;VALUE=DATE:${formatDateString(nextDay).replace(/-/g, '')}`);
    } else {
      const sTime = (event.startTime || '09:00').replace(':', '') + '00';
      const eTime = (event.endTime || '10:00').replace(':', '') + '00';
      lines.push(`DTSTART:${startStr}T${sTime}`);
      lines.push(`DTEND:${endStr}T${eTime}`);
    }

    if (event.recurrence && event.recurrence !== 'none') {
      const rruleMap: Record<string, string> = {
        daily: 'FREQ=DAILY',
        weekly: 'FREQ=WEEKLY',
        monthly: 'FREQ=MONTHLY',
        yearly: 'FREQ=YEARLY',
      };
      if (rruleMap[event.recurrence]) {
        lines.push(`RRULE:${rruleMap[event.recurrence]}`);
      }
    }

    if (event.meetUrl) {
      lines.push(`URL:${event.meetUrl}`);
    }

    lines.push('STATUS:CONFIRMED');
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

/**
 * Parse standard .ics text into CalendarEvent array
 */
export function parseIcsContent(icsContent: string): Partial<CalendarEvent>[] {
  const events: Partial<CalendarEvent>[] = [];
  const lines = icsContent.split(/\r?\n/);
  let currentEvent: Partial<CalendarEvent> | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === 'BEGIN:VEVENT') {
      currentEvent = {
        id: 'imported-' + Math.random().toString(36).substring(2, 9),
        allDay: false,
        calendarId: 'personal',
        color: '#039BE5',
        type: 'event',
        createdAt: Date.now(),
      };
    } else if (line === 'END:VEVENT' && currentEvent) {
      if (currentEvent.title && currentEvent.startDate) {
        if (!currentEvent.endDate) currentEvent.endDate = currentEvent.startDate;
        if (!currentEvent.startTime) currentEvent.startTime = '09:00';
        if (!currentEvent.endTime) currentEvent.endTime = '10:00';
        events.push(currentEvent);
      }
      currentEvent = null;
    } else if (currentEvent) {
      if (line.startsWith('SUMMARY:')) {
        currentEvent.title = line.substring(8);
      } else if (line.startsWith('DESCRIPTION:')) {
        currentEvent.description = line.substring(12).replace(/\\n/g, '\n');
      } else if (line.startsWith('LOCATION:')) {
        currentEvent.location = line.substring(9);
      } else if (line.startsWith('URL:')) {
        currentEvent.meetUrl = line.substring(4);
      } else if (line.startsWith('DTSTART')) {
        const value = line.split(':')[1];
        if (value && value.length >= 8) {
          const y = value.substring(0, 4);
          const m = value.substring(4, 6);
          const d = value.substring(6, 8);
          currentEvent.startDate = `${y}-${m}-${d}`;
          if (value.includes('T')) {
            const timePart = value.split('T')[1];
            currentEvent.startTime = `${timePart.substring(0, 2)}:${timePart.substring(2, 4)}`;
          } else {
            currentEvent.allDay = true;
          }
        }
      } else if (line.startsWith('DTEND')) {
        const value = line.split(':')[1];
        if (value && value.length >= 8) {
          const y = value.substring(0, 4);
          const m = value.substring(4, 6);
          const d = value.substring(6, 8);
          currentEvent.endDate = `${y}-${m}-${d}`;
          if (value.includes('T')) {
            const timePart = value.split('T')[1];
            currentEvent.endTime = `${timePart.substring(0, 2)}:${timePart.substring(2, 4)}`;
          }
        }
      }
    }
  }

  return events;
}
