import { computeAnalyticsMetrics, isMeetingEvent } from './analyticsUtils';
import { CalendarEvent, DEFAULT_CALENDARS } from '../types/calendar';

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`Assertion failed: ${msg}`);
}

console.log('Running analyticsUtils tests...');

// 1. isMeetingEvent check
const meetingEv: CalendarEvent = {
  id: 'ev-1',
  title: 'Họp chiến lược tuần',
  startDate: '2026-10-29',
  startTime: '09:00',
  endDate: '2026-10-29',
  endTime: '10:00',
  allDay: false,
  calendarId: 'work',
  color: '#039BE5',
  type: 'event',
  createdAt: Date.now(),
};
assert(isMeetingEvent(meetingEv) === true, 'Họp title should be recognized as meeting');

const deepWorkEv: CalendarEvent = {
  id: 'ev-2',
  title: 'Tự học React 19',
  startDate: '2026-10-29',
  startTime: '14:00',
  endDate: '2026-10-29',
  endTime: '17:00',
  allDay: false,
  calendarId: 'work',
  color: '#039BE5',
  type: 'event',
  createdAt: Date.now(),
};
assert(isMeetingEvent(deepWorkEv) === false, 'Tự học should be deep work');

// 2. computeAnalyticsMetrics
const metrics = computeAnalyticsMetrics(
  [meetingEv, deepWorkEv],
  DEFAULT_CALENDARS,
  '2026-10-29',
  '2026-10-29',
  'vi'
);

assert(metrics.totalEvents === 2, 'Total events should be 2');
assert(metrics.meetingMinutes === 60, 'Meeting minutes should be 60');
assert(metrics.deepWorkMinutes === 180, 'Deep work minutes should be 180');
assert(metrics.totalMinutes === 240, 'Total minutes should be 240');
assert(metrics.isOverloaded === false, '4 hours should not trigger overload');

// 3. Overload detection
const heavyDayEvs: CalendarEvent[] = [
  { ...deepWorkEv, id: 'h-1', startTime: '08:00', endTime: '12:00' }, // 4h
  { ...deepWorkEv, id: 'h-2', startTime: '13:00', endTime: '18:00' }, // 5h -> total 9h
];
const heavyMetrics = computeAnalyticsMetrics(
  heavyDayEvs,
  DEFAULT_CALENDARS,
  '2026-10-29',
  '2026-10-29',
  'vi'
);
assert(heavyMetrics.isOverloaded === true, '9 hours should trigger burnout warning');
assert(heavyMetrics.overloadedDays.length === 1, 'Should have 1 overloaded day');

console.log('All analyticsUtils tests passed successfully!');
