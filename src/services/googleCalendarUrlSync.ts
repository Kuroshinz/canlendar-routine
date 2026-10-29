import { CalendarEvent } from '../types/calendar';
import { parseICalToEvents } from './icalService';

export async function fetchCalendarFromICalUrl(url: string): Promise<CalendarEvent[]> {
  const trimmed = url.trim();
  if (!trimmed) throw new Error('Vui lòng nhập đường dẫn URL');

  // Normalize webcal:// to https://
  let fetchUrl = trimmed.replace(/^webcal:\/\//i, 'https://');

  let icsText = '';

  // 1. Try direct fetch
  try {
    const res = await fetch(fetchUrl, { headers: { Accept: 'text/calendar, text/plain, */*' } });
    if (res.ok) {
      icsText = await res.text();
    }
  } catch (err) {
    // CORS error expected in browser for calendar.google.com
  }

  // 2. Fallback to CORS proxy if direct fetch failed
  if (!icsText || !icsText.includes('BEGIN:VCALENDAR')) {
    try {
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(fetchUrl)}`;
      const res = await fetch(proxyUrl);
      if (res.ok) {
        icsText = await res.text();
      }
    } catch (proxyErr) {
      try {
        const secondaryProxy = `https://corsproxy.io/?url=${encodeURIComponent(fetchUrl)}`;
        const res2 = await fetch(secondaryProxy);
        if (res2.ok) {
          icsText = await res2.text();
        }
      } catch (e) {
        throw new Error('Không thể tải tệp iCal từ URL này. Vui lòng kiểm tra lại URL hoặc tải tệp .ics về máy và nhập trực tiếp.');
      }
    }
  }

  if (!icsText || !icsText.includes('BEGIN:VCALENDAR')) {
    throw new Error('Dữ liệu tải về không phải định dạng lịch chuẩn iCalendar (.ics).');
  }

  const parsed = parseICalToEvents(icsText);
  if (parsed.length === 0) {
    throw new Error('Không tìm thấy sự kiện nào trong liên kết lịch này.');
  }

  return parsed.map((p, idx) => ({
    id: p.id || `gcal-url-${Date.now()}-${idx}`,
    title: p.title || '(Không có tiêu đề)',
    description: p.description,
    location: p.location,
    startDate: p.startDate || new Date().toISOString().split('T')[0],
    startTime: p.startTime || '09:00',
    endDate: p.endDate || p.startDate || new Date().toISOString().split('T')[0],
    endTime: p.endTime || '10:00',
    allDay: Boolean(p.allDay),
    calendarId: 'work',
    color: p.color || '#039BE5',
    meetUrl: p.meetUrl,
    type: 'event',
    createdAt: Date.now(),
  }));
}
