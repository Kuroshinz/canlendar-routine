import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatDateString,
  parseDateString,
  getMonthDays,
  getWeekDates,
  getFourDayDates,
  doesEventOccurOnDate,
  computeEventLayout,
  parseNaturalLanguageInput,
  exportToIcs,
  parseIcsContent,
} from './calendarUtils';
import { CalendarEvent } from '../types/calendar';

test('formatDateString and parseDateString work round-trip', () => {
  const d = new Date(2026, 9, 29); // October 29, 2026
  const str = formatDateString(d);
  assert.equal(str, '2026-10-29');

  const parsed = parseDateString('2026-10-29');
  assert.equal(parsed.getFullYear(), 2026);
  assert.equal(parsed.getMonth(), 9);
  assert.equal(parsed.getDate(), 29);
});

test('getMonthDays returns 35 or 42 grid cells and flags today and month boundaries', () => {
  const days = getMonthDays(2026, 9, false); // October 2026
  assert.ok(days.length === 35 || days.length === 42);
  const currentMonthDays = days.filter((d) => d.isCurrentMonth);
  assert.equal(currentMonthDays.length, 31); // October has 31 days
});

test('getWeekDates returns 7 consecutive dates', () => {
  const ref = new Date(2026, 9, 29);
  const week = getWeekDates(ref, false);
  assert.equal(week.length, 7);
  // Sunday to Saturday consecutive
  for (let i = 0; i < 6; i++) {
    const diff = week[i + 1].getTime() - week[i].getTime();
    assert.equal(diff, 24 * 60 * 60 * 1000);
  }
});

test('getFourDayDates returns 4 dates starting from target', () => {
  const ref = new Date(2026, 9, 29);
  const fourDays = getFourDayDates(ref);
  assert.equal(fourDays.length, 4);
  assert.equal(formatDateString(fourDays[0]), '2026-10-29');
  assert.equal(formatDateString(fourDays[3]), '2026-11-01');
});

test('doesEventOccurOnDate correctly evaluates non-recurring and recurring events', () => {
  const singleEvent: CalendarEvent = {
    id: 'ev1',
    title: 'Review',
    startDate: '2026-10-29',
    startTime: '10:00',
    endDate: '2026-10-29',
    endTime: '11:00',
    allDay: false,
    calendarId: 'work',
    color: '#039BE5',
    type: 'event',
    createdAt: Date.now(),
  };

  assert.equal(doesEventOccurOnDate(singleEvent, '2026-10-29'), true);
  assert.equal(doesEventOccurOnDate(singleEvent, '2026-10-30'), false);

  const weeklyEvent: CalendarEvent = {
    ...singleEvent,
    id: 'ev2',
    recurrence: 'weekly',
  };

  // 2026-10-29 is Thursday. 2026-11-05 is also Thursday.
  assert.equal(doesEventOccurOnDate(weeklyEvent, '2026-11-05'), true);
  // 2026-11-06 is Friday -> false
  assert.equal(doesEventOccurOnDate(weeklyEvent, '2026-11-06'), false);
  // Date before recurrence started -> false
  assert.equal(doesEventOccurOnDate(weeklyEvent, '2026-10-22'), false);
});

test('computeEventLayout correctly splits overlapping simultaneous events into columns', () => {
  const ev1: CalendarEvent = {
    id: 'ev1',
    title: 'Meeting 1',
    startDate: '2026-10-29',
    startTime: '10:00',
    endDate: '2026-10-29',
    endTime: '11:00',
    allDay: false,
    calendarId: 'work',
    color: '#039BE5',
    type: 'event',
    createdAt: Date.now(),
  };

  const ev2: CalendarEvent = {
    id: 'ev2',
    title: 'Meeting 2',
    startDate: '2026-10-29',
    startTime: '10:30',
    endDate: '2026-10-29',
    endTime: '11:30',
    allDay: false,
    calendarId: 'work',
    color: '#E67C73',
    type: 'event',
    createdAt: Date.now(),
  };

  const layout = computeEventLayout([ev1, ev2], '2026-10-29');
  assert.equal(layout.size, 2);

  const pos1 = layout.get('ev1')!;
  const pos2 = layout.get('ev2')!;
  // Both occupy 50% width since they overlap
  assert.equal(pos1.widthPercent, 50);
  assert.equal(pos2.widthPercent, 50);
  // First is left 0%, second is left 50%
  assert.equal(pos1.leftPercent, 0);
  assert.equal(pos2.leftPercent, 50);
});

test('parseNaturalLanguageInput parses Vietnamese and English quick add text', () => {
  const refDate = new Date(2026, 9, 29, 8, 0); // Oct 29, 2026 8:00 AM

  const resVi = parseNaturalLanguageInput('Họp báo cáo 14h ngày mai', refDate);
  assert.equal(resVi.title, 'Họp báo cáo');
  assert.equal(resVi.date, '2026-10-30');
  assert.equal(resVi.startTime, '14:00');

  const resEn = parseNaturalLanguageInput('Team lunch at 12pm tomorrow', refDate);
  assert.equal(resEn.title, 'Team lunch');
  assert.equal(resEn.date, '2026-10-30');
  assert.equal(resEn.startTime, '12:00');
});

test('exportToIcs and parseIcsContent roundtrip basic event data', () => {
  const ev: CalendarEvent = {
    id: 'test-event-1',
    title: 'Tech Conference 2026',
    description: 'Annual engineering sync',
    location: 'Hanoi Convention Center',
    startDate: '2026-11-10',
    startTime: '09:00',
    endDate: '2026-11-10',
    endTime: '17:00',
    allDay: false,
    calendarId: 'work',
    color: '#039BE5',
    type: 'event',
    createdAt: Date.now(),
  };

  const ics = exportToIcs([ev]);
  assert.ok(ics.includes('BEGIN:VCALENDAR'));
  assert.ok(ics.includes('SUMMARY:Tech Conference 2026'));
  assert.ok(ics.includes('LOCATION:Hanoi Convention Center'));

  const parsed = parseIcsContent(ics);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].title, 'Tech Conference 2026');
  assert.equal(parsed[0].startDate, '2026-11-10');
  assert.equal(parsed[0].startTime, '09:00');
});
