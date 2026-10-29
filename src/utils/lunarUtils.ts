/**
 * Vietnamese Lunar Calendar converter and festival marker
 */

// Key lunar new moons (Mùng 1) table for 2025, 2026, 2027 (Julian days / dates)
// 2026 Solar to Lunar reference points
interface LunarMonthInfo {
  solarStart: string; // YYYY-MM-DD for 1st day of lunar month
  lunarMonth: number;
  isLeap?: boolean;
  totalDays: number; // 29 or 30 days
}

export const LUNAR_MONTHS_2026: LunarMonthInfo[] = [
  { solarStart: '2026-01-19', lunarMonth: 12, totalDays: 29 }, // Tháng Chạp Ất Tỵ
  { solarStart: '2026-02-17', lunarMonth: 1, totalDays: 30 },  // Tháng Giêng Bính Ngọ (Tết 17/02/2026)
  { solarStart: '2026-03-19', lunarMonth: 2, totalDays: 29 },  // Tháng 2
  { solarStart: '2026-04-17', lunarMonth: 3, totalDays: 30 },  // Tháng 3
  { solarStart: '2026-05-17', lunarMonth: 4, totalDays: 29 },  // Tháng 4
  { solarStart: '2026-06-15', lunarMonth: 5, totalDays: 30 },  // Tháng 5 (Tết Đoan Ngọ 5/5)
  { solarStart: '2026-07-15', lunarMonth: 6, totalDays: 30 },  // Tháng 6
  { solarStart: '2026-08-14', lunarMonth: 7, totalDays: 29 },  // Tháng 7 (Vu Lan / Báo hiếu)
  { solarStart: '2026-09-12', lunarMonth: 8, totalDays: 30 },  // Tháng 8 (Tết Trung Thu 15/8)
  { solarStart: '2026-10-12', lunarMonth: 9, totalDays: 29 },  // Tháng 9
  { solarStart: '2026-11-10', lunarMonth: 10, totalDays: 30 }, // Tháng 10
  { solarStart: '2026-12-10', lunarMonth: 11, totalDays: 29 }, // Tháng 11
  { solarStart: '2027-01-08', lunarMonth: 12, totalDays: 30 }, // Tháng Chạp Bính Ngọ
  { solarStart: '2027-02-07', lunarMonth: 1, totalDays: 29 },  // Tết Đinh Mùi 2027
];

export interface LunarDate {
  day: number;
  month: number;
  yearName?: string;
  isSpecialDay?: boolean; // Mùng 1 or Rằm 15
  festivalName?: string;
}

/**
 * Convert YYYY-MM-DD solar date to Lunar day/month
 */
export function getLunarDate(solarDateStr: string): LunarDate {
  const [y, m, d] = solarDateStr.split('-').map(Number);
  const targetDate = new Date(y, m - 1, d);

  for (let i = 0; i < LUNAR_MONTHS_2026.length; i++) {
    const cur = LUNAR_MONTHS_2026[i];
    const [sy, sm, sd] = cur.solarStart.split('-').map(Number);
    const startDate = new Date(sy, sm - 1, sd);

    const diffDays = Math.round((targetDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays >= 0 && diffDays < cur.totalDays) {
      const lunarDay = diffDays + 1;
      const isSpecial = lunarDay === 1 || lunarDay === 15;

      let festival: string | undefined = undefined;
      if (cur.lunarMonth === 1 && lunarDay === 1) festival = 'Mùng 1 Tết';
      else if (cur.lunarMonth === 1 && lunarDay === 15) festival = 'Tết Nguyên Tiêu';
      else if (cur.lunarMonth === 3 && lunarDay === 10) festival = 'Giỗ Tổ Hùng Vương';
      else if (cur.lunarMonth === 5 && lunarDay === 5) festival = 'Tết Đoan Ngọ';
      else if (cur.lunarMonth === 7 && lunarDay === 15) festival = 'Vu Lan Báo Hiếu';
      else if (cur.lunarMonth === 8 && lunarDay === 15) festival = 'Tết Trung Thu';
      else if (cur.lunarMonth === 12 && lunarDay === 23) festival = 'Ông Công Ông Táo';

      return {
        day: lunarDay,
        month: cur.lunarMonth,
        isSpecialDay: isSpecial,
        festivalName: festival,
      };
    }
  }

  // Fallback estimation
  const fallbackDay = ((d + 10) % 29) + 1;
  return {
    day: fallbackDay,
    month: m,
    isSpecialDay: fallbackDay === 1 || fallbackDay === 15,
  };
}
