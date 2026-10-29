import { exportEventsToICal, parseICalToEvents } from './icalService';
import { CalendarEvent } from '../types/calendar';

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`Assertion failed: ${msg}`);
}

console.log('Running icalService tests...');

const sampleEvents: CalendarEvent[] = [
  {
    id: 'test-ev-1',
    title: 'Họp bàn giao dự án',
    description: 'Bàn giao tài liệu và kế hoạch triển khai.',
    location: 'Phòng họp Tầng 4',
    startDate: '2026-10-30',
    startTime: '10:00',
    endDate: '2026-10-30',
    endTime: '11:30',
    allDay: false,
    calendarId: 'work',
    color: '#039BE5',
    type: 'event',
    meetUrl: 'https://meet.google.com/abc-xyz-123',
    createdAt: Date.now(),
  },
  {
    id: 'test-ev-2',
    title: 'Nghỉ lễ Giỗ Tổ Hùng Vương',
    startDate: '2026-04-26',
    startTime: '00:00',
    endDate: '2026-04-26',
    endTime: '23:59',
    allDay: true,
    calendarId: 'holidays',
    color: '#D50000',
    type: 'event',
    createdAt: Date.now(),
  },
];

// 1. Export to iCal
const icalOutput = exportEventsToICal(sampleEvents, 'Lịch Công Tác');
assert(icalOutput.includes('BEGIN:VCALENDAR'), 'Must start with BEGIN:VCALENDAR');
assert(icalOutput.includes('SUMMARY:Họp bàn giao dự án'), 'Must include event summary');
assert(icalOutput.includes('DTSTART:20261030T100000'), 'Must include start datetime');
assert(icalOutput.includes('DTSTART;VALUE=DATE:20260426'), 'Must include all-day date');
assert(icalOutput.includes('END:VCALENDAR'), 'Must end with END:VCALENDAR');

// 2. Parse back from iCal
const parsed = parseICalToEvents(icalOutput);
assert(parsed.length === 2, `Expected 2 parsed events, got ${parsed.length}`);
assert(parsed[0].title === 'Họp bàn giao dự án', 'Title should match');
assert(parsed[0].startTime === '10:00', 'StartTime should match');
assert(parsed[0].endTime === '11:30', 'EndTime should match');
assert(parsed[0].location === 'Phòng họp Tầng 4', 'Location should match');
assert(parsed[1].allDay === true, 'All-day event should match');

console.log('All icalService tests passed successfully!');
