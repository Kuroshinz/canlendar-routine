import { CalendarEvent } from '../types/calendar';

export interface GoogleCalendarApiItem {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  start?: {
    dateTime?: string;
    date?: string;
  };
  end?: {
    dateTime?: string;
    date?: string;
  };
  hangoutLink?: string;
  recurrence?: string[];
  attendees?: Array<{ email: string; displayName?: string; responseStatus?: string }>;
}

function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatLocalTime(d: Date): string {
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${min}`;
}

/**
 * Fetch events from user's primary Google Calendar
 */
export async function fetchGoogleCalendarEvents(accessToken: string): Promise<CalendarEvent[]> {
  try {
    const timeMin = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const timeMax = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?singleEvents=true&orderBy=startTime&timeMin=${encodeURIComponent(
        timeMin
      )}&timeMax=${encodeURIComponent(timeMax)}&maxResults=150`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      }
    );

    if (!res.ok) {
      let detailMsg = `Google Calendar API Error: ${res.status}`;
      try {
        const errJson = await res.json();
        if (errJson?.error?.message) {
          detailMsg = errJson.error.message;
        }
      } catch {
        const raw = await res.text();
        if (raw) detailMsg = raw;
      }
      console.error('Google Calendar fetch error:', detailMsg);

      if (res.status === 403 && detailMsg.toLowerCase().includes('has not been used')) {
        throw new Error(
          'Dự án Google Cloud của bạn chưa BẬT Google Calendar API. Hãy vào Google Cloud Console > APIs & Services > Library > tìm "Google Calendar API" và bấm ENABLE (BẬT).'
        );
      }
      throw new Error(detailMsg);
    }

    const data = await res.json();
    const items: GoogleCalendarApiItem[] = data.items || [];

    return items.map((item) => {
      const isAllDay = Boolean(item.start?.date && !item.start?.dateTime);
      let startDate = item.start?.date || '';
      let startTime = '09:00';
      
      // CRITICAL FIX: Use local browser date & time instead of UTC toISOString()
      // to prevent early morning events (05:00 - 06:55 AM) from shifting to previous day
      if (item.start?.dateTime) {
        const dt = new Date(item.start.dateTime);
        startDate = formatLocalDate(dt);
        startTime = formatLocalTime(dt);
      }

      let endDate = item.end?.date || startDate;
      let endTime = '10:00';
      if (item.end?.dateTime) {
        const dt = new Date(item.end.dateTime);
        endDate = formatLocalDate(dt);
        endTime = formatLocalTime(dt);
      } else if (isAllDay && item.end?.date && item.start?.date) {
        // Google Calendar end.date for all-day events is exclusive (+1 day).
        // For a 1-day event (start: 2026-10-26, end: 2026-10-27), set endDate = startDate.
        const startParts = item.start.date.split('-').map(Number);
        const endParts = item.end.date.split('-').map(Number);
        const startD = new Date(startParts[0], startParts[1] - 1, startParts[2]);
        const endD = new Date(endParts[0], endParts[1] - 1, endParts[2]);
        const diffDays = Math.round((endD.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays <= 1) {
          endDate = startDate;
        } else {
          endD.setDate(endD.getDate() - 1);
          endDate = formatLocalDate(endD);
        }
      }

      return {
        id: `gcal-${item.id}`,
        title: item.summary || '(Không có tiêu đề)',
        description: item.description,
        location: item.location,
        startDate,
        startTime,
        endDate,
        endTime,
        allDay: isAllDay,
        calendarId: 'personal',
        color: '#039BE5',
        meetUrl: item.hangoutLink,
        type: 'event',
        guests: item.attendees?.map((a) => ({
          email: a.email,
          name: a.displayName,
          status: (a.responseStatus === 'accepted' ? 'accepted' : 'tentative') as 'accepted' | 'tentative',
        })),
        createdAt: Date.now(),
      };
    });
  } catch (error) {
    console.error('Failed to fetch from Google Calendar:', error);
    throw error;
  }
}

/**
 * Push an event to Google Calendar
 */
export async function createGoogleCalendarEvent(
  accessToken: string,
  event: CalendarEvent
): Promise<string | null> {
  try {
    const payload: Record<string, unknown> = {
      summary: event.title,
      description: event.description || '',
      location: event.location || '',
    };

    if (event.allDay) {
      payload.start = { date: event.startDate };
      payload.end = { date: event.endDate || event.startDate };
    } else {
      payload.start = {
        dateTime: `${event.startDate}T${event.startTime || '09:00'}:00+07:00`,
      };
      payload.end = {
        dateTime: `${event.endDate || event.startDate}T${event.endTime || '10:00'}:00+07:00`,
      };
    }

    if (event.guests && event.guests.length > 0) {
      payload.attendees = event.guests.map((g) => ({ email: g.email }));
    }

    const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`Failed to create event on Google Calendar: ${res.status}`);
    }

    const data = await res.json();
    return data.id || null;
  } catch (error) {
    console.error('Failed to create event on Google Calendar:', error);
    return null;
  }
}
