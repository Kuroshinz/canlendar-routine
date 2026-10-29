import {
  timeStringToMinutes,
  minutesToTimeString,
  snapMinutesToStep,
  yCoordToTimeString,
  calculateNewTime,
  computeResizedEndTime,
  formatLiveDuration,
} from './dndUtils';

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`Assertion failed: ${msg}`);
}

console.log('Running dndUtils tests...');

// 1. timeStringToMinutes & minutesToTimeString
assert(timeStringToMinutes('00:00') === 0, '00:00 should be 0');
assert(timeStringToMinutes('01:30') === 90, '01:30 should be 90');
assert(timeStringToMinutes('14:45') === 14 * 60 + 45, '14:45 should be 885');
assert(minutesToTimeString(90) === '01:30', '90 min should be 01:30');
assert(minutesToTimeString(885) === '14:45', '885 min should be 14:45');

// 2. snapMinutesToStep
assert(snapMinutesToStep(12, 15) === 15, '12 snapped to 15 step is 15');
assert(snapMinutesToStep(7, 15) === 0, '7 snapped to 15 step is 0');
assert(snapMinutesToStep(23, 15) === 30, '23 snapped to 15 step is 30');

// 3. yCoordToTimeString
// 56px = 60m => 28px = 30m
assert(yCoordToTimeString(28, 56, 15) === '00:30', '28px on 56px/h is 00:30');
assert(yCoordToTimeString(56, 56, 15) === '01:00', '56px on 56px/h is 01:00');

// 4. calculateNewTime
const movedTime = calculateNewTime('10:00', 56, 56, 15);
assert(movedTime === '11:00', `10:00 + 56px should be 11:00, got ${movedTime}`);

// 5. computeResizedEndTime
const resized = computeResizedEndTime('09:00', '10:00', 28, 56, 15, 15);
assert(resized.endTime === '10:30', `Expected 10:30, got ${resized.endTime}`);
assert(resized.durationMinutes === 90, `Expected 90m duration, got ${resized.durationMinutes}`);

// Min duration enforcement
const shrunk = computeResizedEndTime('09:00', '10:00', -120, 56, 15, 15);
assert(shrunk.endTime === '09:15', `Expected min duration 09:15, got ${shrunk.endTime}`);
assert(shrunk.durationMinutes === 15, `Expected 15m duration, got ${shrunk.durationMinutes}`);

// 6. formatLiveDuration
assert(formatLiveDuration(45, 'vi') === '45p', 'vi 45p');
assert(formatLiveDuration(90, 'vi') === '1h 30p', 'vi 1h 30p');
assert(formatLiveDuration(120, 'vi') === '2h', 'vi 2h');
assert(formatLiveDuration(90, 'en') === '1h 30m', 'en 1h 30m');

console.log('All dndUtils tests passed successfully!');
