import test from 'node:test';
import assert from 'node:assert/strict';
import { getLunarDate } from './lunarUtils';

test('getLunarDate converts 2026-10-29 correctly', () => {
  // 2026-10-12 is 1st of 9th lunar month.
  // 2026-10-29 is 17 days after Oct 12 -> 18th day (or 18/19th lunar day).
  const lunar = getLunarDate('2026-10-29');
  assert.equal(lunar.month, 9);
  assert.equal(lunar.day, 18);
});

test('getLunarDate identifies Mùng 1 and Rằm', () => {
  const mung1 = getLunarDate('2026-10-12'); // 1st day of month 9
  assert.equal(mung1.day, 1);
  assert.equal(mung1.isSpecialDay, true);

  const ram = getLunarDate('2026-10-26'); // 15th day of month 9
  assert.equal(ram.day, 15);
  assert.equal(ram.isSpecialDay, true);
});

test('getLunarDate identifies Mid-Autumn Festival (Tết Trung Thu 15/8 âm)', () => {
  // Month 8 started 2026-09-12. Day 15 is 2026-09-26.
  const trungThu = getLunarDate('2026-09-26');
  assert.equal(trungThu.month, 8);
  assert.equal(trungThu.day, 15);
  assert.equal(trungThu.festivalName, 'Tết Trung Thu');
});
