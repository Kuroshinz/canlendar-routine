import {
  ACTIVITY_FACTOR,
  BodyPoint,
  CtgProfile,
  Exercise,
  FoodItem,
  Goal,
  MealLog,
  MealSlot,
  MuscleGroup,
  NutritionSettings,
  PlannedSession,
  SPORT_MET,
  SetLog,
  Sex,
  SportSession,
  SportType,
  WorkoutSession,
} from '../types/productivity';

// ---------------------------------------------------------------------------
// Dates & Formatting
// ---------------------------------------------------------------------------

export function formatDateString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

export function todayString(): string {
  return formatDateString(new Date());
}

export function parseDateString(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** `2026-10-30` -> `30/10` */
export function shortDate(s: string): string {
  const [, m, d] = s.split('-');
  return `${d}/${m}`;
}

/** `2026-10-30` -> `30/10/2026` */
export function longDate(s: string): string {
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y}`;
}

const WEEKDAY = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

export function weekdayLabel(s: string): string {
  return WEEKDAY[parseDateString(s).getDay()];
}

/** Monday-based week start for the week containing `s`. */
export function startOfWeek(s: string): string {
  const d = parseDateString(s);
  const shift = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - shift);
  return formatDateString(d);
}

export function addDays(s: string, days: number): string {
  const d = parseDateString(s);
  d.setDate(d.getDate() + days);
  return formatDateString(d);
}

export function daysBetween(from: string, to: string): number {
  const a = parseDateString(from).getTime();
  const b = parseDateString(to).getTime();
  return Math.round((b - a) / 86_400_000);
}

// ---------------------------------------------------------------------------
// Number formatting
// ---------------------------------------------------------------------------

const vi1 = new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const vi0 = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });

export function fmt1(n: number): string {
  return vi1.format(n);
}

export function fmt0(n: number): string {
  return vi0.format(n);
}

/** `1500` -> `1.500`; signed for deltas. */
export function fmtSigned(n: number, digits = 1): string {
  if (Math.abs(n) < 0.05) return '0';
  const body = digits === 0 ? fmt0(Math.abs(n)) : fmt1(Math.abs(n));
  return `${n > 0 ? '+' : '−'}${body}`;
}

/** `value` with a unit, or `—` when the value is unknown. */
export function withUnit(value: number | null | undefined, unit: string, digits = 1): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return `${digits === 0 ? fmt0(value) : fmt1(value)} ${unit}`;
}

export function sexLabel(sex: Sex): string {
  return sex === 'male' ? 'Nam' : 'Nữ';
}

// ---------------------------------------------------------------------------
// Body composition & InBody
// ---------------------------------------------------------------------------

/** Body-fat based BMI-style index: lean mass (kg) / height (m)². */
export function ffmi(weightKg: number, bodyFatPct: number, heightCm: number): number {
  if (weightKg <= 0 || heightCm <= 0) return 0;
  const lean = weightKg * (1 - bodyFatPct / 100);
  const m = heightCm / 100;
  return Math.round((lean / (m * m)) * 10) / 10;
}

export function fatMassKg(weightKg: number, bodyFatPct: number): number {
  return Math.round(weightKg * (bodyFatPct / 100) * 10) / 10;
}

export function leanMassKg(weightKg: number, bodyFatPct: number): number {
  return Math.round((weightKg - fatMassKg(weightKg, bodyFatPct)) * 10) / 10;
}

export function bmi(weightKg: number, heightCm: number): number {
  if (weightKg <= 0 || heightCm <= 0) return 0;
  const m = heightCm / 100;
  return Math.round((weightKg / (m * m)) * 10) / 10;
}

export function bmiLabel(value: number): string {
  if (value <= 0) return 'Chưa có dữ liệu';
  if (value < 18.5) return 'Thiếu cân';
  if (value < 25) return 'Bình thường';
  if (value < 30) return 'Thừa cân';
  return 'Béo phì';
}

export function ffmiCategory(value: number, sex: Sex = 'male'): { label: string; tone: string; desc: string } {
  if (value <= 0) return { label: 'Chưa đủ dữ liệu', tone: 'text-gray-400', desc: 'Cần thêm chỉ số cân nặng và % mỡ.' };
  if (sex === 'male') {
    if (value < 18) return { label: 'Dưới trung bình', tone: 'text-amber-500', desc: 'Cần tăng cường dinh dưỡng và tập khối lượng để dày cơ.' };
    if (value < 20) return { label: 'Trung bình', tone: 'text-blue-500', desc: 'Mức cơ nạc của người bình thường, nền tảng tốt để phát triển.' };
    if (value < 22) return { label: 'Tốt / Đô vừa', tone: 'text-emerald-500', desc: 'Hình thể cân đối, cơ bắp săn chắc rõ nét.' };
    if (value < 25) return { label: 'Rất tốt / Vận động viên', tone: 'text-indigo-500', desc: 'Khối lượng cơ nạc ấn tượng đạt chuẩn fitness thi đấu.' };
    return { label: 'Thượng thừa / Giới hạn tự nhiên', tone: 'text-purple-500', desc: 'Đỉnh cao tiềm năng di truyền cơ nạc tự nhiên.' };
  } else {
    if (value < 14) return { label: 'Dưới trung bình', tone: 'text-amber-500', desc: 'Cần tăng cường dinh dưỡng và khối lượng cơ.' };
    if (value < 16) return { label: 'Trung bình', tone: 'text-blue-500', desc: 'Mức cơ nạc cơ bản khỏe mạnh.' };
    if (value < 18) return { label: 'Tốt / Săn chắc', tone: 'text-emerald-500', desc: 'Cơ bắp thon gọn, săn chắc lý tưởng.' };
    if (value < 21) return { label: 'Rất tốt / Vận động viên', tone: 'text-indigo-500', desc: 'Khối lượng cơ nạc chuẩn vận động viên chuyên nghiệp.' };
    return { label: 'Thượng thừa', tone: 'text-purple-500', desc: 'Mức cơ nạc vượt trội.' };
  }
}

export interface BodyPointDerived extends BodyPoint {
  fatKg: number;
  leanKg: number;
  ffmi: number;
  bmi: number;
}

export function derivePoint(p: BodyPoint, heightCm: number): BodyPointDerived {
  return {
    ...p,
    fatKg: fatMassKg(p.weightKg, p.bodyFatPct),
    leanKg: leanMassKg(p.weightKg, p.bodyFatPct),
    ffmi: ffmi(p.weightKg, p.bodyFatPct, heightCm),
    bmi: bmi(p.weightKg, heightCm),
  };
}

export function sortPoints(points: BodyPoint[]): BodyPoint[] {
  return [...points].sort((a, b) => a.date.localeCompare(b.date));
}

export function latestPoint(points: BodyPoint[]): BodyPoint | null {
  const sorted = sortPoints(points);
  return sorted.length > 0 ? sorted[sorted.length - 1] : null;
}

export interface DeltaSummary {
  weightKg: number;
  fatKg: number;
  leanKg: number;
  bodyFatPct: number;
  ffmi: number;
  weeks: number;
  /** kg per week, negative = losing. */
  weightRate: number;
  fatRate: number;
  leanRate: number;
}

export function deltaSummary(points: BodyPoint[], heightCm: number): DeltaSummary | null {
  const sorted = sortPoints(points);
  if (sorted.length < 2) return null;

  const first = derivePoint(sorted[0], heightCm);
  const last = derivePoint(sorted[sorted.length - 1], heightCm);
  const weeks = Math.max(daysBetween(first.date, last.date) / 7, 1 / 7);

  const round = (n: number) => Math.round(n * 100) / 100;

  return {
    weightKg: round(last.weightKg - first.weightKg),
    fatKg: round(last.fatKg - first.fatKg),
    leanKg: round(last.leanKg - first.leanKg),
    bodyFatPct: round(last.bodyFatPct - first.bodyFatPct),
    ffmi: round(last.ffmi - first.ffmi),
    weeks: Math.round(weeks * 10) / 10,
    weightRate: round((last.weightKg - first.weightKg) / weeks),
    fatRate: round((last.fatKg - first.fatKg) / weeks),
    leanRate: round((last.leanKg - first.leanKg) / weeks),
  };
}

/**
 * Estimated weeks until the target is reached, using the observed rate.
 */
export function etaWeeks(current: number, target: number, ratePerWeek: number): number | null {
  const gap = target - current;
  if (Math.abs(gap) < 0.05) return 0;
  if (ratePerWeek === 0) return null;
  if (Math.sign(gap) !== Math.sign(ratePerWeek)) return null;
  return Math.max(1, Math.round(Math.abs(gap / ratePerWeek)));
}

// ---------------------------------------------------------------------------
// Energy & Metabolism
// ---------------------------------------------------------------------------

/** Mifflin–St Jeor formula */
export function bmr(profile: CtgProfile, weightKg: number): number {
  if (weightKg <= 0 || profile.heightCm <= 0 || profile.age <= 0) return 0;
  const base = 10 * weightKg + 6.25 * profile.heightCm - 5 * profile.age;
  const value = profile.sex === 'male' ? base + 5 : base - 161;
  return Math.round(value);
}

export function tdee(profile: CtgProfile, weightKg: number): number {
  const base = bmr(profile, weightKg);
  if (base === 0) return 0;
  return Math.round(base * ACTIVITY_FACTOR[profile.activity]);
}

/** Goal-driven kcal target: −15% to cut, +10% to bulk, flat to maintain. */
export function calorieTarget(tdeeValue: number, goal: Goal, offset = 0): number {
  if (tdeeValue <= 0) return 0;
  const factor = goal === 'cut' ? 0.85 : goal === 'bulk' ? 1.1 : 1;
  return Math.round(tdeeValue * factor + offset);
}

export interface MacroTargets {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  manual: boolean;
}

/**
 * Protein 1.8-2.0 g/kg, fat 25% of kcal, carbs fill the rest.
 */
export function macroTargets(
  kcal: number,
  weightKg: number,
  goal: Goal,
  settings: NutritionSettings
): MacroTargets {
  const override = settings?.overrides?.[goal];
  if (
    override &&
    ((override.protein ?? 0) > 0 || (override.carbs ?? 0) > 0 || (override.fat ?? 0) > 0 || (override.kcal ?? 0) > 0)
  ) {
    const p = override.protein ?? Math.round(weightKg * (goal === 'cut' ? 2.0 : 1.8));
    const f = override.fat ?? Math.round((kcal * 0.25) / 9);
    const c = override.carbs ?? Math.max(0, Math.round((kcal - p * 4 - f * 9) / 4));
    const totalKcal = override.kcal || Math.round(p * 4 + c * 4 + f * 9);
    return {
      kcal: totalKcal,
      protein: p,
      carbs: c,
      fat: f,
      manual: true,
    };
  }

  if (kcal <= 0 || weightKg <= 0) {
    return { kcal: 0, protein: 0, carbs: 0, fat: 0, manual: false };
  }

  const protein = Math.round(weightKg * (goal === 'cut' ? 2.0 : 1.8));
  const fat = Math.round((kcal * 0.25) / 9);
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));

  return {
    kcal: Math.round(protein * 4 + carbs * 4 + fat * 9),
    protein,
    carbs,
    fat,
    manual: false,
  };
}

/** MET-based estimate for non-gym sports. */
export function sportCalories(session: SportSession, weightKg: number): number {
  if (weightKg <= 0 || session.durationMin <= 0) return 0;
  return Math.round((SPORT_MET[session.type] * 3.5 * weightKg * session.durationMin) / 200);
}

/** Gym energy estimate based on lifted volume and sets. */
export function gymCalories(sets: SetLog[], weightKg: number): number {
  if (weightKg <= 0) return 0;
  const volume = sets.reduce((sum, s) => sum + s.weightKg * s.reps, 0);
  return Math.round(volume * 0.012 + sets.length * 3.5);
}

// ---------------------------------------------------------------------------
// Nutrition logs
// ---------------------------------------------------------------------------

export interface MealTotals {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

const EMPTY_TOTALS: MealTotals = { kcal: 0, protein: 0, carbs: 0, fat: 0 };

export function mealTotals(meal: MealLog): MealTotals {
  return meal.items.reduce<MealTotals>(
    (acc, item) => ({
      kcal: acc.kcal + item.kcal,
      protein: acc.protein + item.protein,
      carbs: acc.carbs + item.carbs,
      fat: acc.fat + item.fat,
    }),
    { ...EMPTY_TOTALS }
  );
}

export function dayTotals(meals: MealLog[], date: string): MealTotals {
  return meals
    .filter((m) => m.date === date)
    .reduce<MealTotals>(
      (acc, meal) => {
        const t = mealTotals(meal);
        return {
          kcal: acc.kcal + t.kcal,
          protein: acc.protein + t.protein,
          carbs: acc.carbs + t.carbs,
          fat: acc.fat + t.fat,
        };
      },
      { ...EMPTY_TOTALS }
    );
}

export function averageIntake(meals: MealLog[], days: number, today: string): number {
  const from = addDays(today, -(days - 1));
  const scoped = meals.filter((m) => m.date >= from && m.date <= today);
  if (scoped.length === 0) return 0;
  const dates = new Set(scoped.map((m) => m.date));
  const total = scoped.reduce((sum, m) => sum + mealTotals(m).kcal, 0);
  return Math.round(total / Math.max(dates.size, 1));
}

export function itemFromTotals(name: string, amount: number, unit: 'g' | 'ml', t: MealTotals): FoodItem {
  return { name, amount, unit, kcal: t.kcal, protein: t.protein, carbs: t.carbs, fat: t.fat };
}

/**
 * Heuristic parser for Vietnamese food description.
 */
export const FOOD_LEXICON: { keys: string[]; per100: MealTotals; unit: 'g' | 'ml' }[] = [
  { keys: ['cơm trắng', 'cơm', 'cơm nguội'], per100: { kcal: 130, protein: 2.7, carbs: 28, fat: 0.3 }, unit: 'g' },
  { keys: ['cơm tấm', 'sườn'], per100: { kcal: 185, protein: 7.5, carbs: 28, fat: 5 }, unit: 'g' },
  { keys: ['ức gà', 'gà'], per100: { kcal: 165, protein: 31, carbs: 0, fat: 3.6 }, unit: 'g' },
  { keys: ['thịt bò', 'bò'], per100: { kcal: 250, protein: 26, carbs: 0, fat: 15 }, unit: 'g' },
  { keys: ['thịt lợn', 'thịt heo', 'heo', 'lợn'], per100: { kcal: 240, protein: 26, carbs: 0, fat: 14 }, unit: 'g' },
  { keys: ['trứng', 'hột gà'], per100: { kcal: 155, protein: 13, carbs: 1.1, fat: 11 }, unit: 'g' },
  { keys: ['cá hồi', 'hồi'], per100: { kcal: 208, protein: 20, carbs: 0, fat: 13 }, unit: 'g' },
  { keys: ['cá ngừ', 'cá'], per100: { kcal: 132, protein: 28, carbs: 0, fat: 1.2 }, unit: 'g' },
  { keys: ['tôm'], per100: { kcal: 99, protein: 24, carbs: 0.2, fat: 0.3 }, unit: 'g' },
  { keys: ['khoai lang'], per100: { kcal: 86, protein: 1.6, carbs: 20, fat: 0.1 }, unit: 'g' },
  { keys: ['yến mạch', 'oats'], per100: { kcal: 389, protein: 16.9, carbs: 66, fat: 6.9 }, unit: 'g' },
  { keys: ['sữa tươi', 'sữa'], per100: { kcal: 42, protein: 3.4, carbs: 5, fat: 1 }, unit: 'ml' },
  { keys: ['sữa chua', 'yogurt'], per100: { kcal: 60, protein: 3.5, carbs: 5, fat: 3 }, unit: 'g' },
  { keys: ['whey', 'protein'], per100: { kcal: 385, protein: 75, carbs: 8, fat: 4 }, unit: 'g' },
  { keys: ['chuối'], per100: { kcal: 89, protein: 1.1, carbs: 23, fat: 0.3 }, unit: 'g' },
  { keys: ['táo'], per100: { kcal: 52, protein: 0.3, carbs: 14, fat: 0.2 }, unit: 'g' },
  { keys: ['bơ', 'avocado'], per100: { kcal: 160, protein: 2, carbs: 9, fat: 15 }, unit: 'g' },
  { keys: ['hạt', 'hạnh nhân', 'hạt điều'], per100: { kcal: 580, protein: 21, carbs: 22, fat: 50 }, unit: 'g' },
  { keys: ['rau', 'salad', 'cải', 'muống'], per100: { kcal: 25, protein: 1.5, carbs: 4, fat: 0.3 }, unit: 'g' },
  { keys: ['phở'], per100: { kcal: 105, protein: 6, carbs: 16, fat: 2 }, unit: 'g' },
  { keys: ['bún bò', 'bún'], per100: { kcal: 115, protein: 6.5, carbs: 17, fat: 2.5 }, unit: 'g' },
  { keys: ['bún chả'], per100: { kcal: 155, protein: 8.5, carbs: 20, fat: 4.5 }, unit: 'g' },
  { keys: ['bánh mì'], per100: { kcal: 265, protein: 9, carbs: 49, fat: 3.2 }, unit: 'g' },
  { keys: ['xôi'], per100: { kcal: 280, protein: 5, carbs: 58, fat: 2.5 }, unit: 'g' },
  { keys: ['đậu hũ', 'đậu phụ'], per100: { kcal: 76, protein: 8, carbs: 1.9, fat: 4.8 }, unit: 'g' },
];

export interface ParsedFood {
  item: FoodItem;
  recognised: boolean;
}

const DEFAULT_AMOUNT = 100;

export function parseFoodText(text: string): ParsedFood[] {
  const segments = text
    .split(/[,;\n+]| và /gi)
    .map((s) => s.trim())
    .filter(Boolean);

  return segments.map((segment) => {
    const lower = segment.toLowerCase();

    // Quantity: "200g", "200 g", "1 bát", "2 quả" -> first number wins
    const numMatch = /(\d+(?:[.,]\d+)?)\s*(g|gram|ml|kg|l)?/.exec(lower);
    let amount = DEFAULT_AMOUNT;
    let unit: 'g' | 'ml' = 'g';

    if (numMatch) {
      const raw = Number(numMatch[1].replace(',', '.'));
      const suffix = numMatch[2];
      if (Number.isFinite(raw) && raw > 0) {
        if (suffix === 'kg' || suffix === 'l') amount = raw * 1000;
        else if (suffix === 'g' || suffix === 'gram' || suffix === 'ml') amount = raw;
        else amount = raw * DEFAULT_AMOUNT; // "2 quả" -> assume 100g portion
      }
      if (suffix === 'ml' || suffix === 'l') unit = 'ml';
    }

    const entry = FOOD_LEXICON.find((f) => f.keys.some((k) => lower.includes(k)));
    if (!entry) {
      // Sensible baseline estimation instead of leaving raw 0 kcal
      const factor = amount / 100;
      return {
        item: {
          name: segment,
          amount,
          unit,
          kcal: Math.round(135 * factor),
          protein: Math.round(6.5 * factor * 10) / 10,
          carbs: Math.round(18 * factor * 10) / 10,
          fat: Math.round(3.5 * factor * 10) / 10,
        },
        recognised: false,
      };
    }

    const factor = amount / 100;
    return {
      item: {
        name: segment,
        amount,
        unit: entry.unit === 'ml' ? 'ml' : unit,
        kcal: Math.round(entry.per100.kcal * factor),
        protein: Math.round(entry.per100.protein * factor * 10) / 10,
        carbs: Math.round(entry.per100.carbs * factor * 10) / 10,
        fat: Math.round(entry.per100.fat * factor * 10) / 10,
      },
      recognised: true,
    };
  });
}

// ---------------------------------------------------------------------------
// Training & Volume
// ---------------------------------------------------------------------------

export function setVolume(sets: SetLog[]): number {
  return Math.round(sets.reduce((sum, s) => sum + s.weightKg * s.reps, 0));
}

export function sessionDurationMin(session: WorkoutSession): number {
  if (!session.finishedAt) return 0;
  return Math.max(1, Math.round((session.finishedAt - session.startedAt) / 60_000));
}

export function weeklyVolume(
  sessions: WorkoutSession[],
  weeks: number,
  today: string
): { weekStart: string; volume: number; sessions: number }[] {
  const rows: { weekStart: string; volume: number; sessions: number }[] = [];
  const currentWeek = startOfWeek(today);

  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = addDays(currentWeek, -7 * i);
    const weekEnd = addDays(weekStart, 6);
    const scoped = sessions.filter((s) => s.date >= weekStart && s.date <= weekEnd);
    rows.push({
      weekStart,
      volume: scoped.reduce((sum, s) => sum + setVolume(s.sets), 0),
      sessions: scoped.length,
    });
  }

  return rows;
}

export function setsByMuscle(
  sessions: WorkoutSession[],
  exercises: { id: string; muscle: string }[]
): Record<string, number> {
  const byId = new Map(exercises.map((e) => [e.id, e.muscle]));
  const out: Record<string, number> = {};
  for (const session of sessions) {
    for (const set of session.sets) {
      const muscle = byId.get(set.exerciseId);
      if (!muscle) continue;
      out[muscle] = (out[muscle] || 0) + 1;
    }
  }
  return out;
}

export function personalRecords(sessions: WorkoutSession[]): Record<string, { weightKg: number; reps: number }> {
  const out: Record<string, { weightKg: number; reps: number }> = {};
  for (const session of sessions) {
    for (const set of session.sets) {
      const current = out[set.exerciseId];
      if (!current || set.weightKg > current.weightKg) {
        out[set.exerciseId] = { weightKg: set.weightKg, reps: set.reps };
      }
    }
  }
  return out;
}

export function buildWorkoutEvents(
  workoutSessions: WorkoutSession[],
  plannedSessions: PlannedSession[],
  currentWeekStart: string
): Array<{
  id: string;
  title: string;
  description?: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  allDay: boolean;
  calendarId: string;
  color: string;
  type: 'event';
  isCompleted?: boolean;
  createdAt: number;
}> {
  const events: Array<{
    id: string;
    title: string;
    description?: string;
    startDate: string;
    startTime: string;
    endDate: string;
    endTime: string;
    allDay: boolean;
    calendarId: string;
    color: string;
    type: 'event';
    isCompleted?: boolean;
    createdAt: number;
  }> = [];

  // Completed workout sessions
  for (const w of workoutSessions) {
    const duration = sessionDurationMin(w) || 60;
    const startHour = new Date(w.startedAt).getHours() || 17;
    const startMin = new Date(w.startedAt).getMinutes() || 30;
    const startTimeStr = `${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}`;
    const endMinutesTotal = startHour * 60 + startMin + duration;
    const endHour = Math.min(23, Math.floor(endMinutesTotal / 60));
    const endMin = endMinutesTotal % 60;
    const endTimeStr = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;

    events.push({
      id: `wo-ev-${w.id}`,
      title: `💪 ${w.title}`,
      description: `Đã hoàn thành ${w.sets.length} hiệp tập. Tổng khối lượng: ${setVolume(w.sets).toLocaleString()} kg.`,
      startDate: w.date,
      startTime: startTimeStr,
      endDate: w.date,
      endTime: endTimeStr,
      allDay: false,
      calendarId: 'health',
      color: '#ff6025',
      type: 'event',
      isCompleted: true,
      createdAt: w.startedAt,
    });
  }

  // Planned sessions for current week
  for (const p of plannedSessions) {
    const sessionDate = addDays(currentWeekStart, p.dayIndex);
    // Don't show planned if already completed on that date
    const alreadyDone = workoutSessions.some((w) => w.date === sessionDate && (w.sessionId === p.id || w.title.includes(p.title)));
    if (!alreadyDone) {
      events.push({
        id: `plan-ev-${p.id}-${sessionDate}`,
        title: `🏋️ Giáo án: ${p.title}`,
        description: `Lịch tập theo kế hoạch (${p.prescriptions.length} bài tập).`,
        startDate: sessionDate,
        startTime: '17:30',
        endDate: sessionDate,
        endTime: '18:45',
        allDay: false,
        calendarId: 'health',
        color: '#2f86e8',
        type: 'event',
        isCompleted: false,
        createdAt: Date.now(),
      });
    }
  }

  return events;
}

// ---------------------------------------------------------------------------
// Standard Exercise Library
// ---------------------------------------------------------------------------

export const EXERCISES: Exercise[] = [
  { id: 'bench-press', name: 'Bench Press', muscle: 'chest', equipment: 'Barbell', cue: 'Siết vai, chạm ngực, đẩy thẳng' },
  { id: 'incline-db-press', name: 'Incline Dumbbell Press', muscle: 'chest', equipment: 'Dumbbell', cue: 'Ghế 30°, cổ tay thẳng' },
  { id: 'cable-fly', name: 'Cable Fly', muscle: 'chest', equipment: 'Cable', cue: 'Khuỷu hơi cong, ép ngực' },
  { id: 'lat-pulldown', name: 'Lat Pulldown', muscle: 'back', equipment: 'Cable', cue: 'Kéo bằng khuỷu, không ngả người' },
  { id: 'barbell-row', name: 'Barbell Row', muscle: 'back', equipment: 'Barbell', cue: 'Lưng trung tính, kéo về rốn' },
  { id: 'seated-cable-row', name: 'Seated Cable Row', muscle: 'back', equipment: 'Cable', cue: 'Ưỡn ngực, siết bả vai' },
  { id: 'pull-up', name: 'Pull Up', muscle: 'back', equipment: 'Bodyweight', cue: 'Vai hạ trước khi kéo' },
  { id: 'back-squat', name: 'Back Squat', muscle: 'legs', equipment: 'Barbell', cue: 'Gối theo mũi chân, thở ra khi lên' },
  { id: 'romanian-deadlift', name: 'Romanian Deadlift', muscle: 'legs', equipment: 'Barbell', cue: 'Đẩy hông ra sau, giữ tạ sát chân' },
  { id: 'leg-press', name: 'Leg Press', muscle: 'legs', equipment: 'Machine', cue: 'Không khoá gối, gối không đổ vào trong' },
  { id: 'leg-curl', name: 'Leg Curl', muscle: 'legs', equipment: 'Machine', cue: 'Siết mông, kéo chậm 2 giây' },
  { id: 'calf-raise', name: 'Calf Raise', muscle: 'legs', equipment: 'Machine', cue: 'Xuống hết biên, giữ 1 giây' },
  { id: 'ohp', name: 'Overhead Press', muscle: 'shoulders', equipment: 'Barbell', cue: 'Siết bụng, không ưỡn lưng' },
  { id: 'lateral-raise', name: 'Lateral Raise', muscle: 'shoulders', equipment: 'Dumbbell', cue: 'Nâng tới ngang vai, khuỷu dẫn' },
  { id: 'face-pull', name: 'Face Pull', muscle: 'shoulders', equipment: 'Cable', cue: 'Kéo về trán, xoay ngoài' },
  { id: 'barbell-curl', name: 'Barbell Curl', muscle: 'arms', equipment: 'Barbell', cue: 'Khuỷu cố định, không đu' },
  { id: 'triceps-pushdown', name: 'Triceps Pushdown', muscle: 'arms', equipment: 'Cable', cue: 'Khuỷu sát thân, duỗi hết' },
  { id: 'hammer-curl', name: 'Hammer Curl', muscle: 'arms', equipment: 'Dumbbell', cue: 'Cổ tay trung tính' },
  { id: 'cable-crunch', name: 'Cable Crunch', muscle: 'core', equipment: 'Cable', cue: 'Gập bụng, không kéo tay' },
  { id: 'hanging-leg-raise', name: 'Hanging Leg Raise', muscle: 'core', equipment: 'Bodyweight', cue: 'Không đung đưa' },
  { id: 'plank', name: 'Plank', muscle: 'core', equipment: 'Bodyweight', cue: 'Siết bụng, mông ngang vai' },
  { id: 'treadmill', name: 'Treadmill', muscle: 'cardio', equipment: 'Machine', cue: 'Nhịp đều, thở mũi' },
];

export const exerciseById = (id: string): Exercise | undefined => EXERCISES.find((e) => e.id === id);
