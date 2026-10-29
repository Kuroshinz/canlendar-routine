import { CalendarEvent } from '../types/calendar';

function escapeICal(str: string): string {
  if (!str) return '';
  return str
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

function unescapeICal(str: string): string {
  if (!str) return '';
  return str
    .replace(/\\n/g, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\');
}

function formatICalDate(dateStr: string, timeStr?: string, allDay?: boolean): string {
  const cleanDate = dateStr.replace(/-/g, '');
  if (allDay || !timeStr) {
    return `;VALUE=DATE:${cleanDate}`;
  }
  const cleanTime = timeStr.replace(/:/g, '') + '00';
  return `:${cleanDate}T${cleanTime}`;
}

/**
 * Generates an RFC 5545 compliant .ics string from CalendarEvents.
 */
export function exportEventsToICal(
  events: CalendarEvent[],
  calendarName: string = 'Smart Google Calendar'
): string {
  const now = new Date();
  const dtstamp =
    now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Smart Google Calendar Pro//VI',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeICal(calendarName)}`,
    'X-WR-TIMEZONE:Asia/Ho_Chi_Minh',
  ];

  for (const ev of events) {
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${ev.id.includes('@') ? ev.id : `${ev.id}@smartgcal`}`);
    lines.push(`DTSTAMP:${dtstamp}`);
    lines.push(`SUMMARY:${escapeICal(ev.title || 'Untitled Event')}`);

    if (ev.allDay) {
      lines.push(`DTSTART${formatICalDate(ev.startDate, undefined, true)}`);
      lines.push(`DTEND${formatICalDate(ev.endDate || ev.startDate, undefined, true)}`);
    } else {
      lines.push(`DTSTART${formatICalDate(ev.startDate, ev.startTime || '09:00', false)}`);
      lines.push(`DTEND${formatICalDate(ev.endDate || ev.startDate, ev.endTime || '10:00', false)}`);
    }

    if (ev.description) {
      lines.push(`DESCRIPTION:${escapeICal(ev.description)}`);
    }

    if (ev.location) {
      lines.push(`LOCATION:${escapeICal(ev.location)}`);
    }

    if (ev.meetUrl) {
      lines.push(`URL:${ev.meetUrl}`);
    }

    if (ev.recurrence && ev.recurrence !== 'none') {
      const freq = ev.recurrence.toUpperCase();
      lines.push(`RRULE:FREQ=${freq}`);
    }

    // Alarm reminder
    lines.push('BEGIN:VALARM');
    lines.push('ACTION:DISPLAY');
    lines.push('DESCRIPTION:Reminder');
    lines.push('TRIGGER:-PT15M');
    lines.push('END:VALARM');

    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

/**
 * Triggers browser download of an .ics file.
 */
export function downloadICalFile(
  events: CalendarEvent[],
  filename: string = 'google-calendar.ics'
): void {
  const content = exportEventsToICal(events);
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Parses an iCalendar (.ics) string and extracts partial CalendarEvent objects.
 */
export function parseICalToEvents(icalContent: string): Partial<CalendarEvent>[] {
  const events: Partial<CalendarEvent>[] = [];
  const lines = icalContent.split(/\r\n|\n|\r/);

  let inEvent = false;
  let currentEvent: Partial<CalendarEvent> = {};

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Handle folded lines (lines starting with space or tab)
    while (i + 1 < lines.length && (lines[i + 1].startsWith(' ') || lines[i + 1].startsWith('\t'))) {
      i++;
      line += lines[i].substring(1);
    }

    const trimmed = line.trim();

    if (trimmed === 'BEGIN:VEVENT') {
      inEvent = true;
      currentEvent = {
        id: `ical-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        calendarId: 'personal',
        color: '#039BE5',
        type: 'event',
        createdAt: Date.now(),
      };
      continue;
    }

    if (trimmed === 'END:VEVENT') {
      if (inEvent && currentEvent.title) {
        // Defaults if missing
        if (!currentEvent.startDate) currentEvent.startDate = new Date().toISOString().split('T')[0];
        if (!currentEvent.endDate) currentEvent.endDate = currentEvent.startDate;
        if (!currentEvent.startTime) currentEvent.startTime = '09:00';
        if (!currentEvent.endTime) currentEvent.endTime = '10:00';

        events.push(currentEvent);
      }
      inEvent = false;
      currentEvent = {};
      continue;
    }

    if (!inEvent) continue;

    const colonIndex = trimmed.indexOf(':');
    if (colonIndex === -1) continue;

    const rawKey = trimmed.substring(0, colonIndex);
    const value = trimmed.substring(colonIndex + 1);
    const key = rawKey.split(';')[0].toUpperCase();

    if (key === 'SUMMARY') {
      currentEvent.title = unescapeICal(value);
    } else if (key === 'DESCRIPTION') {
      currentEvent.description = unescapeICal(value);
    } else if (key === 'LOCATION') {
      currentEvent.location = unescapeICal(value);
    } else if (key === 'URL') {
      currentEvent.meetUrl = value;
    } else if (key === 'DTSTART') {
      if (rawKey.includes('VALUE=DATE')) {
        // Date only: YYYYMMDD
        const y = value.substring(0, 4);
        const m = value.substring(4, 6);
        const d = value.substring(6, 8);
        currentEvent.startDate = `${y}-${m}-${d}`;
        currentEvent.allDay = true;
      } else {
        // DateTime: YYYYMMDDTHHMMSS
        const parts = value.split('T');
        if (parts[0] && parts[0].length >= 8) {
          const y = parts[0].substring(0, 4);
          const m = parts[0].substring(4, 6);
          const d = parts[0].substring(6, 8);
          currentEvent.startDate = `${y}-${m}-${d}`;
        }
        if (parts[1] && parts[1].length >= 4) {
          const h = parts[1].substring(0, 2);
          const min = parts[1].substring(2, 4);
          currentEvent.startTime = `${h}:${min}`;
        }
      }
    } else if (key === 'DTEND') {
      if (rawKey.includes('VALUE=DATE')) {
        const y = value.substring(0, 4);
        const m = value.substring(4, 6);
        const d = value.substring(6, 8);
        currentEvent.endDate = `${y}-${m}-${d}`;
      } else {
        const parts = value.split('T');
        if (parts[0] && parts[0].length >= 8) {
          const y = parts[0].substring(0, 4);
          const m = parts[0].substring(4, 6);
          const d = parts[0].substring(6, 8);
          currentEvent.endDate = `${y}-${m}-${d}`;
        }
        if (parts[1] && parts[1].length >= 4) {
          const h = parts[1].substring(0, 2);
          const min = parts[1].substring(2, 4);
          currentEvent.endTime = `${h}:${min}`;
        }
      }
    }
  }

  return events;
}
