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
      )}&timeMax=${encodeURIComponent(timeMax)}&maxResults=100`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error('Google Calendar fetch error:', err);
      throw new Error(`Google Calendar API Error: ${res.status}`);
    }

    const data = await res.json();
    const items: GoogleCalendarApiItem[] = data.items || [];

    return items.map((item) => {
      const isAllDay = Boolean(item.start?.date && !item.start?.dateTime);
      let startDate = item.start?.date || '';
      let startTime = '09:00';
      if (item.start?.dateTime) {
        const dt = new Date(item.start.dateTime);
        startDate = dt.toISOString().split('T')[0];
        startTime = `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
      }

      let endDate = item.end?.date || startDate;
      let endTime = '10:00';
      if (item.end?.dateTime) {
        const dt = new Date(item.end.dateTime);
        endDate = dt.toISOString().split('T')[0];
        endTime = `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
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
