import {
  ACTIVITY_FACTOR,
  BodyPoint,
  CtgProfile,
  Exercise,
  FoodItem,
  Goal,
  HealthDayLog,
  MealLog,
  MealSlot,
  MuscleGroup,
  NutritionSettings,
  PlannedSession,
  RoutineSplitTemplate,
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
  { id: 'hip-thrust', name: 'Barbell Hip Thrust', muscle: 'legs', equipment: 'Barbell', cue: 'Tựa lưng ghế, siết đỉnh mông 1 giây, cằm gập nhẹ' },
  { id: 'bulgarian-split-squat', name: 'Bulgarian Split Squat', muscle: 'legs', equipment: 'Dumbbell', cue: 'Chân sau kê ghế, dồn trọng tâm chân trước' },
  { id: 'incline-barbell-press', name: 'Incline Barbell Press', muscle: 'chest', equipment: 'Barbell', cue: 'Ghế nghiêng 30-45 độ, hạ tạ chạm ngực trên' },
  { id: 'chest-dips', name: 'Chest Dips', muscle: 'chest', equipment: 'Bodyweight', cue: 'Hơi đổ người ra trước 15 độ, mở rộng cùi chỏ nhẹ' },
  { id: 'cable-lateral-raise', name: 'Cable Lateral Raise', muscle: 'shoulders', equipment: 'Cable', cue: 'Kéo dây ngang vai, duy trì kháng lực liên tục' },
  { id: 'rear-delt-fly', name: 'Rear Delt Fly', muscle: 'shoulders', equipment: 'Dumbbell', cue: 'Cúi người gập hông, mở rộng hai cánh tay ép vai sau' },
  { id: 'incline-db-curl', name: 'Incline Dumbbell Curl', muscle: 'arms', equipment: 'Dumbbell', cue: 'Ghế 45 độ, căng dãn tối đa bắp tay trước' },
  { id: 'skull-crusher', name: 'Skull Crusher', muscle: 'arms', equipment: 'Barbell', cue: 'Hạ tạ về đỉnh đầu, cố định cùi chỏ vuông góc' },
  { id: 'straight-arm-pulldown', name: 'Straight Arm Pulldown', muscle: 'back', equipment: 'Cable', cue: 'Tay thẳng khóa nhẹ khớp, kéo ép cơ xô sát người' },
];

export const exerciseById = (id: string, customList: Exercise[] = []): Exercise | undefined =>
  [...EXERCISES, ...customList].find((e) => e.id === id);

export const generateSplitSessions = (template: RoutineSplitTemplate): PlannedSession[] => {
  switch (template) {
    case 'ppl':
      return [
        {
          id: 'ppl-push',
          weekIndex: 0,
          dayIndex: 0,
          title: 'Push (Đẩy: Ngực, Vai & Tay sau)',
          dayOfWeek: 'Thứ 2',
          prescriptions: [
            { exerciseId: 'bench-press', sets: 4, reps: '6-8', rpe: 8, restSeconds: 120 },
            { exerciseId: 'incline-db-press', sets: 3, reps: '8-10', rpe: 8, restSeconds: 90 },
            { exerciseId: 'ohp', sets: 3, reps: '8-10', rpe: 8, restSeconds: 90 },
            { exerciseId: 'lateral-raise', sets: 4, reps: '12-15', rpe: 9, restSeconds: 60 },
            { exerciseId: 'triceps-pushdown', sets: 3, reps: '10-12', rpe: 9, restSeconds: 60 },
          ],
        },
        {
          id: 'ppl-pull',
          weekIndex: 0,
          dayIndex: 1,
          title: 'Pull (Kéo: Lưng & Tay trước)',
          dayOfWeek: 'Thứ 3',
          prescriptions: [
            { exerciseId: 'lat-pulldown', sets: 4, reps: '8-10', rpe: 8, restSeconds: 90 },
            { exerciseId: 'barbell-row', sets: 4, reps: '6-8', rpe: 8, restSeconds: 120 },
            { exerciseId: 'face-pull', sets: 4, reps: '12-15', rpe: 9, restSeconds: 60 },
            { exerciseId: 'barbell-curl', sets: 3, reps: '10-12', rpe: 8, restSeconds: 60 },
            { exerciseId: 'hammer-curl', sets: 3, reps: '10-12', rpe: 8, restSeconds: 60 },
          ],
        },
        {
          id: 'ppl-legs',
          weekIndex: 0,
          dayIndex: 2,
          title: 'Legs & Core (Chân & Bụng)',
          dayOfWeek: 'Thứ 4',
          prescriptions: [
            { exerciseId: 'back-squat', sets: 4, reps: '6-8', rpe: 8, restSeconds: 120 },
            { exerciseId: 'romanian-deadlift', sets: 3, reps: '8-10', rpe: 8, restSeconds: 90 },
            { exerciseId: 'leg-press', sets: 3, reps: '10-12', rpe: 8, restSeconds: 90 },
            { exerciseId: 'leg-curl', sets: 3, reps: '10-12', rpe: 9, restSeconds: 60 },
            { exerciseId: 'calf-raise', sets: 4, reps: '12-15', rpe: 9, restSeconds: 60 },
            { exerciseId: 'hanging-leg-raise', sets: 3, reps: '12-15', rpe: 8, restSeconds: 60 },
          ],
        },
        {
          id: 'ppl-push-2',
          weekIndex: 0,
          dayIndex: 3,
          title: 'Push Hypertrophy (Đẩy Phì Đại)',
          dayOfWeek: 'Thứ 5',
          prescriptions: [
            { exerciseId: 'incline-db-press', sets: 4, reps: '8-10', rpe: 8, restSeconds: 90 },
            { exerciseId: 'cable-fly', sets: 3, reps: '12-15', rpe: 9, restSeconds: 60 },
            { exerciseId: 'lateral-raise', sets: 4, reps: '12-15', rpe: 9, restSeconds: 60 },
            { exerciseId: 'triceps-pushdown', sets: 4, reps: '10-12', rpe: 9, restSeconds: 60 },
          ],
        },
        {
          id: 'ppl-pull-2',
          weekIndex: 0,
          dayIndex: 4,
          title: 'Pull Hypertrophy (Kéo Phì Đại)',
          dayOfWeek: 'Thứ 6',
          prescriptions: [
            { exerciseId: 'pull-up', sets: 4, reps: '8-10', rpe: 8, restSeconds: 90 },
            { exerciseId: 'seated-cable-row', sets: 4, reps: '10-12', rpe: 8, restSeconds: 90 },
            { exerciseId: 'face-pull', sets: 3, reps: '12-15', rpe: 9, restSeconds: 60 },
            { exerciseId: 'hammer-curl', sets: 3, reps: '10-12', rpe: 8, restSeconds: 60 },
          ],
        },
      ];
    case 'upper_lower':
      return [
        {
          id: 'ul-upper-1',
          weekIndex: 0,
          dayIndex: 0,
          title: 'Upper Power (Thân Trên Sức Mạnh)',
          dayOfWeek: 'Thứ 2',
          prescriptions: [
            { exerciseId: 'bench-press', sets: 4, reps: '5-6', rpe: 8, restSeconds: 120 },
            { exerciseId: 'barbell-row', sets: 4, reps: '6-8', rpe: 8, restSeconds: 120 },
            { exerciseId: 'ohp', sets: 3, reps: '6-8', rpe: 8, restSeconds: 90 },
            { exerciseId: 'lat-pulldown', sets: 3, reps: '8-10', rpe: 8, restSeconds: 90 },
            { exerciseId: 'barbell-curl', sets: 3, reps: '8-10', rpe: 8, restSeconds: 60 },
          ],
        },
        {
          id: 'ul-lower-1',
          weekIndex: 0,
          dayIndex: 1,
          title: 'Lower Power (Thân Dưới Sức Mạnh)',
          dayOfWeek: 'Thứ 3',
          prescriptions: [
            { exerciseId: 'back-squat', sets: 4, reps: '5-6', rpe: 8, restSeconds: 150 },
            { exerciseId: 'romanian-deadlift', sets: 3, reps: '6-8', rpe: 8, restSeconds: 120 },
            { exerciseId: 'leg-press', sets: 3, reps: '8-10', rpe: 8, restSeconds: 90 },
            { exerciseId: 'calf-raise', sets: 4, reps: '10-12', rpe: 9, restSeconds: 60 },
            { exerciseId: 'cable-crunch', sets: 3, reps: '12-15', rpe: 8, restSeconds: 60 },
          ],
        },
        {
          id: 'ul-upper-2',
          weekIndex: 0,
          dayIndex: 3,
          title: 'Upper Hypertrophy (Thân Trên Phì Đại)',
          dayOfWeek: 'Thứ 5',
          prescriptions: [
            { exerciseId: 'incline-db-press', sets: 4, reps: '8-10', rpe: 8, restSeconds: 90 },
            { exerciseId: 'seated-cable-row', sets: 4, reps: '10-12', rpe: 8, restSeconds: 90 },
            { exerciseId: 'lateral-raise', sets: 4, reps: '12-15', rpe: 9, restSeconds: 60 },
            { exerciseId: 'cable-fly', sets: 3, reps: '12-15', rpe: 9, restSeconds: 60 },
            { exerciseId: 'triceps-pushdown', sets: 3, reps: '10-12', rpe: 9, restSeconds: 60 },
          ],
        },
        {
          id: 'ul-lower-2',
          weekIndex: 0,
          dayIndex: 4,
          title: 'Lower Hypertrophy (Thân Dưới Phì Đại)',
          dayOfWeek: 'Thứ 6',
          prescriptions: [
            { exerciseId: 'leg-press', sets: 4, reps: '10-12', rpe: 8, restSeconds: 90 },
            { exerciseId: 'leg-curl', sets: 4, reps: '10-12', rpe: 9, restSeconds: 60 },
            { exerciseId: 'calf-raise', sets: 4, reps: '12-15', rpe: 9, restSeconds: 60 },
            { exerciseId: 'hanging-leg-raise', sets: 3, reps: '12-15', rpe: 8, restSeconds: 60 },
            { exerciseId: 'plank', sets: 3, reps: '45-60s', rpe: 8, restSeconds: 60 },
          ],
        },
      ];
    case 'arnold':
      return [
        {
          id: 'arn-cb-1',
          weekIndex: 0,
          dayIndex: 0,
          title: 'Chest & Back (Ngực & Lưng Xô)',
          dayOfWeek: 'Thứ 2',
          prescriptions: [
            { exerciseId: 'bench-press', sets: 4, reps: '8-10', rpe: 8, restSeconds: 90 },
            { exerciseId: 'barbell-row', sets: 4, reps: '8-10', rpe: 8, restSeconds: 90 },
            { exerciseId: 'incline-db-press', sets: 3, reps: '10-12', rpe: 8, restSeconds: 90 },
            { exerciseId: 'lat-pulldown', sets: 3, reps: '10-12', rpe: 8, restSeconds: 90 },
            { exerciseId: 'cable-fly', sets: 3, reps: '12-15', rpe: 9, restSeconds: 60 },
          ],
        },
        {
          id: 'arn-sa-1',
          weekIndex: 0,
          dayIndex: 1,
          title: 'Shoulders & Arms (Vai & Tay)',
          dayOfWeek: 'Thứ 3',
          prescriptions: [
            { exerciseId: 'ohp', sets: 4, reps: '8-10', rpe: 8, restSeconds: 90 },
            { exerciseId: 'lateral-raise', sets: 4, reps: '12-15', rpe: 9, restSeconds: 60 },
            { exerciseId: 'face-pull', sets: 3, reps: '12-15', rpe: 9, restSeconds: 60 },
            { exerciseId: 'barbell-curl', sets: 3, reps: '10-12', rpe: 8, restSeconds: 60 },
            { exerciseId: 'triceps-pushdown', sets: 3, reps: '10-12', rpe: 9, restSeconds: 60 },
            { exerciseId: 'hammer-curl', sets: 3, reps: '10-12', rpe: 8, restSeconds: 60 },
          ],
        },
        {
          id: 'arn-legs-1',
          weekIndex: 0,
          dayIndex: 2,
          title: 'Legs & Core (Chân & Bụng)',
          dayOfWeek: 'Thứ 4',
          prescriptions: [
            { exerciseId: 'back-squat', sets: 4, reps: '8-10', rpe: 8, restSeconds: 120 },
            { exerciseId: 'romanian-deadlift', sets: 3, reps: '10-12', rpe: 8, restSeconds: 90 },
            { exerciseId: 'leg-press', sets: 3, reps: '10-12', rpe: 8, restSeconds: 90 },
            { exerciseId: 'leg-curl', sets: 3, reps: '12-15', rpe: 9, restSeconds: 60 },
            { exerciseId: 'hanging-leg-raise', sets: 3, reps: '12-15', rpe: 8, restSeconds: 60 },
          ],
        },
      ];
    case 'fullbody':
    default:
      return [
        {
          id: 'fb-day-1',
          weekIndex: 0,
          dayIndex: 0,
          title: 'Full Body A (Toàn Thân - Squat & Push)',
          dayOfWeek: 'Thứ 2',
          prescriptions: [
            { exerciseId: 'back-squat', sets: 3, reps: '8-10', rpe: 8, restSeconds: 90 },
            { exerciseId: 'bench-press', sets: 3, reps: '8-10', rpe: 8, restSeconds: 90 },
            { exerciseId: 'lat-pulldown', sets: 3, reps: '10-12', rpe: 8, restSeconds: 90 },
            { exerciseId: 'lateral-raise', sets: 3, reps: '12-15', rpe: 9, restSeconds: 60 },
            { exerciseId: 'hanging-leg-raise', sets: 3, reps: '12-15', rpe: 8, restSeconds: 60 },
          ],
        },
        {
          id: 'fb-day-2',
          weekIndex: 0,
          dayIndex: 2,
          title: 'Full Body B (Toàn Thân - Hinge & OHP)',
          dayOfWeek: 'Thứ 4',
          prescriptions: [
            { exerciseId: 'romanian-deadlift', sets: 3, reps: '8-10', rpe: 8, restSeconds: 90 },
            { exerciseId: 'ohp', sets: 3, reps: '8-10', rpe: 8, restSeconds: 90 },
            { exerciseId: 'barbell-row', sets: 3, reps: '8-10', rpe: 8, restSeconds: 90 },
            { exerciseId: 'leg-curl', sets: 3, reps: '10-12', rpe: 9, restSeconds: 60 },
            { exerciseId: 'triceps-pushdown', sets: 3, reps: '10-12', rpe: 9, restSeconds: 60 },
          ],
        },
        {
          id: 'fb-day-3',
          weekIndex: 0,
          dayIndex: 4,
          title: 'Full Body C (Toàn Thân - Hypertrophy)',
          dayOfWeek: 'Thứ 6',
          prescriptions: [
            { exerciseId: 'leg-press', sets: 3, reps: '10-12', rpe: 8, restSeconds: 90 },
            { exerciseId: 'incline-db-press', sets: 3, reps: '8-10', rpe: 8, restSeconds: 90 },
            { exerciseId: 'pull-up', sets: 3, reps: '8-10', rpe: 8, restSeconds: 90 },
            { exerciseId: 'barbell-curl', sets: 3, reps: '10-12', rpe: 8, restSeconds: 60 },
            { exerciseId: 'plank', sets: 3, reps: '45-60s', rpe: 8, restSeconds: 60 },
          ],
        },
      ];
    case 'glute_lower':
      return [
        {
          id: 'gl-day-1',
          weekIndex: 0,
          dayIndex: 0,
          title: 'Glute Power & Hinge (Mông Cực Đại & Đùi Sau)',
          dayOfWeek: 'Thứ 2',
          prescriptions: [
            { exerciseId: 'hip-thrust', sets: 4, reps: '8-10', rpe: 8, restSeconds: 120 },
            { exerciseId: 'romanian-deadlift', sets: 4, reps: '8-10', rpe: 8, restSeconds: 90 },
            { exerciseId: 'bulgarian-split-squat', sets: 3, reps: '10-12', rpe: 8, restSeconds: 90 },
            { exerciseId: 'leg-curl', sets: 3, reps: '12-15', rpe: 9, restSeconds: 60 },
            { exerciseId: 'cable-crunch', sets: 3, reps: '12-15', rpe: 8, restSeconds: 60 },
          ],
        },
        {
          id: 'gl-day-2',
          weekIndex: 0,
          dayIndex: 1,
          title: 'Upper Body Toning (Thân Trên Thon Gọn & Vai Săn)',
          dayOfWeek: 'Thứ 3',
          prescriptions: [
            { exerciseId: 'lat-pulldown', sets: 4, reps: '10-12', rpe: 8, restSeconds: 75 },
            { exerciseId: 'incline-db-press', sets: 3, reps: '10-12', rpe: 8, restSeconds: 75 },
            { exerciseId: 'cable-lateral-raise', sets: 4, reps: '12-15', rpe: 9, restSeconds: 60 },
            { exerciseId: 'straight-arm-pulldown', sets: 3, reps: '12-15', rpe: 8, restSeconds: 60 },
            { exerciseId: 'triceps-pushdown', sets: 3, reps: '12-15', rpe: 9, restSeconds: 60 },
          ],
        },
        {
          id: 'gl-day-3',
          weekIndex: 0,
          dayIndex: 3,
          title: 'Quad & Glute Hypertrophy (Đùi Trước & Mông)',
          dayOfWeek: 'Thứ 5',
          prescriptions: [
            { exerciseId: 'back-squat', sets: 4, reps: '8-10', rpe: 8, restSeconds: 120 },
            { exerciseId: 'leg-press', sets: 4, reps: '10-12', rpe: 8, restSeconds: 90 },
            { exerciseId: 'hip-thrust', sets: 3, reps: '10-12', rpe: 9, restSeconds: 90 },
            { exerciseId: 'calf-raise', sets: 4, reps: '12-15', rpe: 9, restSeconds: 60 },
            { exerciseId: 'hanging-leg-raise', sets: 3, reps: '12-15', rpe: 8, restSeconds: 60 },
          ],
        },
        {
          id: 'gl-day-4',
          weekIndex: 0,
          dayIndex: 4,
          title: 'Full Body Circuit & Core (Toàn Thân & Vòng Eo)',
          dayOfWeek: 'Thứ 6',
          prescriptions: [
            { exerciseId: 'bulgarian-split-squat', sets: 3, reps: '12-15', rpe: 8, restSeconds: 75 },
            { exerciseId: 'seated-cable-row', sets: 3, reps: '10-12', rpe: 8, restSeconds: 75 },
            { exerciseId: 'face-pull', sets: 3, reps: '12-15', rpe: 9, restSeconds: 60 },
            { exerciseId: 'plank', sets: 3, reps: '45-60s', rpe: 8, restSeconds: 60 },
            { exerciseId: 'treadmill', sets: 1, reps: '20 min', rpe: 7, restSeconds: 60 },
          ],
        },
      ];
  }
};

// ---------------------------------------------------------------------------
// Adaptive Mesocycle Periodization Models
// ---------------------------------------------------------------------------

export interface MesocyclePhaseInfo {
  phase: number;
  nameVi: string;
  nameEn: string;
  durationWeeks: string;
  intensityRpe: string;
  volumeTarget: string;
  repsRange: string;
  color: string;
  descriptionVi: string;
  nutritionTipVi: string;
}

export const MESOCYCLE_PHASES: MesocyclePhaseInfo[] = [
  {
    phase: 1,
    nameVi: 'Giai Đoạn 1: Tích Lũy Dung Tích (Accumulation)',
    nameEn: 'Phase 1: Volume Accumulation',
    durationWeeks: 'Tuần 1 - 4',
    intensityRpe: 'RPE 7 - 8',
    volumeTarget: '12 - 16 hiệp / nhóm cơ / tuần',
    repsRange: '10 - 15 reps',
    color: '#0ea5e9',
    descriptionVi: 'Xây dựng nền tảng kích thước cơ bắp, rèn luyện kỹ thuật cơ bản và chuẩn bị sức bền cho các đợt tăng tải kế tiếp.',
    nutritionTipVi: 'Duy trì lượng đạm cao (2.0g/kg), nạp đủ carb trước và sau tập để tối ưu glycogen cơ bắp.',
  },
  {
    phase: 2,
    nameVi: 'Giai Đoạn 2: Quá Tải Lũy Tiến (Progressive Overload)',
    nameEn: 'Phase 2: Intensification',
    durationWeeks: 'Tuần 5 - 8',
    intensityRpe: 'RPE 8 - 9',
    volumeTarget: '14 - 18 hiệp / nhóm cơ / tuần',
    repsRange: '6 - 10 reps',
    color: '#f59e0b',
    descriptionVi: 'Tăng trọng lượng tạ thêm 2.5 - 5% hoặc cố gắng thêm 1-2 reps mỗi buổi. Kích thích tối đa các sợi cơ co giật nhanh.',
    nutritionTipVi: 'Nếu bulking hãy giữ thặng dư nhẹ +200-300 kcal. Nếu cutting hãy giữ protein 2.2-2.4g/kg để chống mất cơ.',
  },
  {
    phase: 3,
    nameVi: 'Giai Đoạn 3: Đỉnh Cao Kích Thích (Peak & Definition)',
    nameEn: 'Phase 3: Peak Hypertrophy',
    durationWeeks: 'Tuần 9 - 11',
    intensityRpe: 'RPE 9 - 10',
    volumeTarget: '16 - 20 hiệp / nhóm cơ / tuần',
    repsRange: '8 - 12 reps (áp dụng Drop-set)',
    color: '#ff6025',
    descriptionVi: 'Đạt ngưỡng kích hoạt cơ tối đa, sử dụng drop-set và superset ở hiệp cuối để vắt kiệt sợi cơ và gia tăng độ dày thớ cơ.',
    nutritionTipVi: 'Uống đủ 2.5 - 3 lít nước hàng ngày và bổ sung điện giải trong suốt các buổi tập cường độ cao.',
  },
  {
    phase: 4,
    nameVi: 'Giai Đoạn 4: Xả Tải Chủ Động (Deload Recovery)',
    nameEn: 'Phase 4: Active Deload',
    durationWeeks: 'Tuần 12',
    intensityRpe: 'RPE 6 - 7',
    volumeTarget: '6 - 8 hiệp / nhóm cơ / tuần (giảm 50%)',
    repsRange: '8 - 10 reps (tạ nhẹ hơn 30%)',
    color: '#10b981',
    descriptionVi: 'Hạ tải trọng để phục hồi thần kinh trung ương (CNS), khớp và gân cơ. Ngăn ngừa hội chứng quá tải (Overtraining).',
    nutritionTipVi: 'Đưa calo về mức cân bằng duy trì (Maintenance), ngủ đủ 8 tiếng để cơ thể tái tạo mô cơ hoàn chỉnh.',
  },
];

/**
 * Recommends intelligent progressive overload based on previous performance
 */
export function calculateProgressiveOverload(
  lastWeightKg: number,
  lastReps: number,
  targetRepsRange: string = '8-10'
): { nextWeightKg: number; nextReps: number; tipVi: string; type: 'weight' | 'reps' } {
  const parts = targetRepsRange.split('-').map((s) => parseInt(s.trim()));
  const maxRepTarget = parts.length > 1 ? parts[1] : 10;
  const minRepTarget = parts[0] || 8;

  if (lastReps >= maxRepTarget) {
    // Reached top of rep range -> Add weight
    const increment = lastWeightKg >= 60 ? 2.5 : 1.25;
    const nextWeight = lastWeightKg + increment;
    return {
      nextWeightKg: nextWeight,
      nextReps: minRepTarget,
      tipVi: `Đã hoàn thành mốc ${lastReps} reps! Tăng +${increment}kg lên ${nextWeight}kg với mục tiêu ${minRepTarget} reps.`,
      type: 'weight',
    };
  } else {
    // Add 1 rep at current weight (Double Progression)
    return {
      nextWeightKg: lastWeightKg,
      nextReps: lastReps + 1,
      tipVi: `Giữ mức tạ ${lastWeightKg}kg và cố gắng đạt ${lastReps + 1} reps (+1 rep overload).`,
      type: 'reps',
    };
  }
}

// ---------------------------------------------------------------------------
// 7. US Navy Body Fat Calculator (Thước Dây Hải Quân Mỹ)
// ---------------------------------------------------------------------------

/**
 * Calculates Body Fat Percentage using the US Navy Circumference Method.
 * Men: %BF = 495 / (1.0324 - 0.19077 * log10(waist - neck) + 0.15456 * log10(height)) - 450
 * Women: %BF = 495 / (1.29579 - 0.35004 * log10(waist + hip - neck) + 0.22100 * log10(height)) - 450
 * Measurements in cm.
 */
export function calculateNavyBodyFat(
  sex: Sex,
  heightCm: number,
  waistCm: number,
  neckCm: number,
  hipCm?: number
): number {
  if (heightCm <= 0 || waistCm <= 0 || neckCm <= 0) return 0;

  if (sex === 'male') {
    const diff = waistCm - neckCm;
    if (diff <= 0) return 0;
    const logDiff = Math.log10(diff);
    const logHeight = Math.log10(heightCm);
    const denominator = 1.0324 - 0.19077 * logDiff + 0.15456 * logHeight;
    if (denominator <= 0) return 0;
    const bf = 495 / denominator - 450;
    return Math.max(3, Math.min(50, Math.round(bf * 10) / 10));
  } else {
    const hip = hipCm || waistCm * 1.15; // default fallback if hip not specified
    const sum = waistCm + hip - neckCm;
    if (sum <= 0) return 0;
    const logSum = Math.log10(sum);
    const logHeight = Math.log10(heightCm);
    const denominator = 1.29579 - 0.35004 * logSum + 0.221 * logHeight;
    if (denominator <= 0) return 0;
    const bf = 495 / denominator - 450;
    return Math.max(8, Math.min(60, Math.round(bf * 10) / 10));
  }
}

// ---------------------------------------------------------------------------
// 8. One Rep Max (1RM) & Barbell Plate Calculator
// ---------------------------------------------------------------------------

export interface OneRepMaxResult {
  oneRepMax: number;
  epley: number;
  brzycki: number;
  percentages: {
    pct: number;
    weight: number;
    targetReps: string;
    description: string;
  }[];
}

/**
 * Calculates 1RM from submaximal weight and reps using standard Epley & Brzycki models.
 */
export function calculate1RM(weightKg: number, reps: number): OneRepMaxResult {
  if (weightKg <= 0 || reps <= 0) {
    return {
      oneRepMax: 0,
      epley: 0,
      brzycki: 0,
      percentages: [],
    };
  }

  if (reps === 1) {
    const val = Math.round(weightKg * 10) / 10;
    return {
      oneRepMax: val,
      epley: val,
      brzycki: val,
      percentages: buildPercentages(val),
    };
  }

  // Epley: weight * (1 + reps / 30)
  const epley = Math.round(weightKg * (1 + reps / 30) * 10) / 10;
  // Brzycki: weight * (36 / (37 - reps))
  const brzycki = reps < 37 ? Math.round(weightKg * (36 / (37 - reps)) * 10) / 10 : epley;

  // Average of both
  const oneRepMax = Math.round(((epley + brzycki) / 2) * 10) / 10;

  return {
    oneRepMax,
    epley,
    brzycki,
    percentages: buildPercentages(oneRepMax),
  };
}

function buildPercentages(max: number) {
  const table = [
    { pct: 100, targetReps: '1 rep', description: 'Kỷ lục tối đa (Max Effort)' },
    { pct: 95, targetReps: '2 reps', description: 'Sức mạnh cực đại (Peak Power)' },
    { pct: 90, targetReps: '3-4 reps', description: 'Phát triển sức mạnh (Heavy Strength)' },
    { pct: 85, targetReps: '5-6 reps', description: 'Sức mạnh nền tảng (Strength Core)' },
    { pct: 80, targetReps: '7-8 reps', description: 'Tăng cơ & Sức mạnh (Hypertrophy/Strength)' },
    { pct: 75, targetReps: '9-10 reps', description: 'Tăng cơ tối ưu (Pure Hypertrophy)' },
    { pct: 70, targetReps: '11-12 reps', description: 'Tăng cơ khối lượng cao (Volume Hypertrophy)' },
    { pct: 65, targetReps: '13-15 reps', description: 'Sức bền cơ bắp (Endurance Strength)' },
    { pct: 60, targetReps: '16-20 reps', description: 'Khởi động & Sức bền (Pump / Warmup)' },
  ];

  return table.map((row) => ({
    ...row,
    weight: Math.round((max * (row.pct / 100)) * 2) / 2, // round to nearest 0.5kg
  }));
}

export interface BarbellPlateBreakdown {
  targetTotalKg: number;
  barWeightKg: number;
  loadedPerSideKg: number;
  platesPerSide: {
    plateKg: number;
    count: number;
    color: string;
  }[];
  remainderKg: number;
}

/**
 * Calculates the exact plates required on each side of an Olympic barbell.
 * Standard Olympic plate denominations: 20kg, 15kg, 10kg, 5kg, 2.5kg, 1.25kg.
 */
export function calculateBarbellPlates(
  targetTotalKg: number,
  barWeightKg: number = 20
): BarbellPlateBreakdown {
  const standardPlates = [
    { kg: 20, color: '#2563EB' }, // Blue
    { kg: 15, color: '#EAB308' }, // Yellow
    { kg: 10, color: '#16A34A' }, // Green
    { kg: 5, color: '#DC2626' },  // Red/White
    { kg: 2.5, color: '#4B5563' },// Charcoal
    { kg: 1.25, color: '#9CA3AF' },// Silver
  ];

  if (targetTotalKg <= barWeightKg) {
    return {
      targetTotalKg,
      barWeightKg,
      loadedPerSideKg: 0,
      platesPerSide: [],
      remainderKg: 0,
    };
  }

  const weightNeededTotal = targetTotalKg - barWeightKg;
  let remainingPerSide = weightNeededTotal / 2;
  const platesPerSide: { plateKg: number; count: number; color: string }[] = [];

  for (const p of standardPlates) {
    if (remainingPerSide >= p.kg) {
      const count = Math.floor(remainingPerSide / p.kg);
      remainingPerSide = Math.round((remainingPerSide - count * p.kg) * 100) / 100;
      platesPerSide.push({
        plateKg: p.kg,
        count,
        color: p.color,
      });
    }
  }

  const loadedPerSideKg = (weightNeededTotal / 2) - remainingPerSide;

  return {
    targetTotalKg,
    barWeightKg,
    loadedPerSideKg: Math.round(loadedPerSideKg * 100) / 100,
    platesPerSide,
    remainderKg: Math.round(remainingPerSide * 2 * 100) / 100,
  };
}

// ---------------------------------------------------------------------------
// 9. Comprehensive Vietnamese Food Catalog & Preset Combos
// ---------------------------------------------------------------------------

export type FoodCategory =
  | 'pho_bun'
  | 'rice_dish'
  | 'protein'
  | 'carbs'
  | 'dairy_whey'
  | 'veg_soup'
  | 'drinks_snacks';

export const FOOD_CATEGORY_LABEL: Record<FoodCategory, string> = {
  pho_bun: 'Phở & Bún Mì',
  rice_dish: 'Cơm & Món Chính',
  protein: 'Thịt & Hải Sản',
  carbs: 'Khoai & Tinh Bột',
  dairy_whey: 'Trứng, Sữa & Whey',
  veg_soup: 'Rau Xanh & Canh',
  drinks_snacks: 'Đồ Uống & Ăn Vặt',
};

export interface CatalogFoodItem {
  id: string;
  name: string;
  category: FoodCategory;
  servingLabel: string;
  servingGramsOrMl: number;
  unit: 'g' | 'ml';
  kcalPerServing: number;
  protein: number;
  carbs: number;
  fat: number;
  note?: string;
}

export const VIETNAMESE_FOOD_CATALOG: CatalogFoodItem[] = [
  // Phở & Bún
  {
    id: 'pho-bo-tai',
    name: 'Phở Bò Tái Nạc',
    category: 'pho_bun',
    servingLabel: '1 Tô chuẩn',
    servingGramsOrMl: 550,
    unit: 'g',
    kcalPerServing: 430,
    protein: 34,
    carbs: 58,
    fat: 6,
    note: 'Bánh phở tươi + 150g thăn bò tái, nước dùng thanh ít váng dầu',
  },
  {
    id: 'pho-ga-xe',
    name: 'Phở Gà Xé Nạc',
    category: 'pho_bun',
    servingLabel: '1 Tô chuẩn',
    servingGramsOrMl: 500,
    unit: 'g',
    kcalPerServing: 390,
    protein: 32,
    carbs: 55,
    fat: 4.5,
    note: 'Ức gà xé bỏ da, nhiều rau hành',
  },
  {
    id: 'bun-bo-hue',
    name: 'Bún Bò Huế (Bắp Bò Nạc)',
    category: 'pho_bun',
    servingLabel: '1 Tô chuẩn',
    servingGramsOrMl: 600,
    unit: 'g',
    kcalPerServing: 480,
    protein: 35,
    carbs: 62,
    fat: 9,
    note: 'Thịt bắp bò nạc, bỏ mỡ nổi, kèm nhiều giá rau sống',
  },
  {
    id: 'bun-cha-ha-noi',
    name: 'Bún Chả Hà Nội (Nạc Nướng)',
    category: 'pho_bun',
    servingLabel: '1 Phần suất',
    servingGramsOrMl: 400,
    unit: 'g',
    kcalPerServing: 510,
    protein: 36,
    carbs: 65,
    fat: 11,
    note: 'Thịt nạc nướng than hoa, bún tươi, nước mắm dưa góp',
  },
  {
    id: 'banh-canh-cua',
    name: 'Bánh Canh Cua Thịt Nạc',
    category: 'pho_bun',
    servingLabel: '1 Tô chuẩn',
    servingGramsOrMl: 500,
    unit: 'g',
    kcalPerServing: 420,
    protein: 28,
    carbs: 56,
    fat: 8,
    note: 'Thịt cua, tôm, thịt nạc dăm, bánh canh bột gạo',
  },
  {
    id: 'hu-tieu-nam-vang',
    name: 'Hủ Tiếu Nam Vang Nước',
    category: 'pho_bun',
    servingLabel: '1 Tô chuẩn',
    servingGramsOrMl: 500,
    unit: 'g',
    kcalPerServing: 440,
    protein: 29,
    carbs: 60,
    fat: 8.5,
    note: 'Tôm tươi, thịt nạc, trứng cút, nước hầm xương',
  },

  // Cơm & Món Chính
  {
    id: 'com-tam-suon-cha',
    name: 'Cơm Tấm Sườn Nạc + Trứng Ốp La',
    category: 'rice_dish',
    servingLabel: '1 Dĩa chuẩn',
    servingGramsOrMl: 380,
    unit: 'g',
    kcalPerServing: 560,
    protein: 38,
    carbs: 68,
    fat: 14,
    note: 'Sườn nướng lọc mỡ, 1 trứng ốp la lòng đào, dưa chuột cà chua',
  },
  {
    id: 'com-trang-bat',
    name: 'Cơm Trắng (1 Bát Đầy)',
    category: 'rice_dish',
    servingLabel: '1 Bát đầy (150g)',
    servingGramsOrMl: 150,
    unit: 'g',
    kcalPerServing: 195,
    protein: 4,
    carbs: 42,
    fat: 0.5,
    note: 'Nguồn tinh bột kinh điển, dễ tiêu hóa trước và sau tập',
  },
  {
    id: 'com-ga-xoi-mo',
    name: 'Cơm Gà Luộc Xé Gừng',
    category: 'rice_dish',
    servingLabel: '1 Dĩa chuẩn',
    servingGramsOrMl: 350,
    unit: 'g',
    kcalPerServing: 480,
    protein: 36,
    carbs: 62,
    fat: 8,
    note: 'Gà ta xé bỏ da, cơm nấu nước luộc gà ít mỡ',
  },
  {
    id: 'banh-mi-thit-nuong',
    name: 'Bánh Mì Kẹp Thịt Nạc Nướng',
    category: 'rice_dish',
    servingLabel: '1 Ổ chuẩn',
    servingGramsOrMl: 180,
    unit: 'g',
    kcalPerServing: 410,
    protein: 24,
    carbs: 52,
    fat: 11,
    note: 'Bánh mì giòn, thịt nạc ướp sả, đồ chua, dưa leo, ngò',
  },
  {
    id: 'bo-ne-banh-mi',
    name: 'Bò Né Trứng Ốp La + 1 Bánh Mì',
    category: 'rice_dish',
    servingLabel: '1 Chảo gang',
    servingGramsOrMl: 300,
    unit: 'g',
    kcalPerServing: 540,
    protein: 38,
    carbs: 48,
    fat: 20,
    note: '120g bít tết bò mềm, 1 trứng, patê ít, ăn kèm bánh mì giòn',
  },

  // Protein Nạc
  {
    id: 'uc-ga-ap-chao',
    name: 'Ức Gà Áp Chảo Thảo Mộc (200g)',
    category: 'protein',
    servingLabel: '200g nạc tươi',
    servingGramsOrMl: 200,
    unit: 'g',
    kcalPerServing: 330,
    protein: 62,
    carbs: 0,
    fat: 7,
    note: 'Vua protein thể hình, 0g carb, giàu leucine phục hồi cơ',
  },
  {
    id: 'thit-bo-ap-chao',
    name: 'Thăn Bò Áp Chảo / Xào Cần Tây (150g)',
    category: 'protein',
    servingLabel: '150g thăn nạc',
    servingGramsOrMl: 150,
    unit: 'g',
    kcalPerServing: 310,
    protein: 40,
    carbs: 3,
    fat: 14,
    note: 'Giàu kẽm, sắt và creatine tự nhiên tăng sức mạnh',
  },
  {
    id: 'ca-hoi-nuong',
    name: 'Cá Hồi Na Uy Nướng Muối Tiêu (150g)',
    category: 'protein',
    servingLabel: '150g fillet',
    servingGramsOrMl: 150,
    unit: 'g',
    kcalPerServing: 312,
    protein: 30,
    carbs: 0,
    fat: 19.5,
    note: 'Nguồn Omega-3 EPA/DHA vàng giúp kháng viêm khớp và tim mạch',
  },
  {
    id: 'ca-ngu-ngam-nuoc',
    name: 'Cá Ngừ Ngâm Nước Khoáng (1 Hộp)',
    category: 'protein',
    servingLabel: '1 Hộp (140g)',
    servingGramsOrMl: 140,
    unit: 'g',
    kcalPerServing: 160,
    protein: 36,
    carbs: 0,
    fat: 1.5,
    note: 'Tiện lợi, gần như 100% protein tinh khiết',
  },
  {
    id: 'tom-hap-sa',
    name: 'Tôm Sú Hấp Sả (200g)',
    category: 'protein',
    servingLabel: '200g thịt tôm',
    servingGramsOrMl: 200,
    unit: 'g',
    kcalPerServing: 198,
    protein: 48,
    carbs: 0.5,
    fat: 0.6,
    note: 'Siêu nạc, cực ít chất béo, vị ngọt tự nhiên',
  },
  {
    id: 'dau-hu-trang',
    name: 'Đậu Hũ Trắng Luộc / Sốt Cà (150g)',
    category: 'protein',
    servingLabel: '150g miếng',
    servingGramsOrMl: 150,
    unit: 'g',
    kcalPerServing: 115,
    protein: 12,
    carbs: 3,
    fat: 7,
    note: 'Protein thực vật dồi dào, canxi và isoflavone tốt cho tim mạch',
  },

  // Carbs Tốt
  {
    id: 'khoai-lang-luoc',
    name: 'Khoai Lang Mật Luộc (1 Củ vừa)',
    category: 'carbs',
    servingLabel: '1 Củ (180g)',
    servingGramsOrMl: 180,
    unit: 'g',
    kcalPerServing: 155,
    protein: 2.8,
    carbs: 36,
    fat: 0.2,
    note: 'Chỉ số GI thấp, giải phóng năng lượng bền bỉ suốt buổi tập',
  },
  {
    id: 'yen-mach-nau',
    name: 'Yến Mạch Cán Dẹt Nấu (50g khô)',
    category: 'carbs',
    servingLabel: '1 Bát cháo (50g khô)',
    servingGramsOrMl: 200,
    unit: 'g',
    kcalPerServing: 195,
    protein: 8.5,
    carbs: 33,
    fat: 3.5,
    note: 'Giàu chất xơ beta-glucan giảm cholesterol và no lâu',
  },
  {
    id: 'chuoi-tieu',
    name: 'Chuối Tiêu Chín (1 Quả vừa)',
    category: 'carbs',
    servingLabel: '1 Quả (120g)',
    servingGramsOrMl: 120,
    unit: 'g',
    kcalPerServing: 105,
    protein: 1.3,
    carbs: 27,
    fat: 0.4,
    note: 'Giàu kali chống chuột rút, cung cấp carb nhanh trước tập 30p',
  },
  {
    id: 'bap-ngot-luoc',
    name: 'Bắp Ngọt Luộc (1 Bắp)',
    category: 'carbs',
    servingLabel: '1 Bắp (160g)',
    servingGramsOrMl: 160,
    unit: 'g',
    kcalPerServing: 140,
    protein: 5,
    carbs: 30,
    fat: 2,
    note: 'Chất xơ cao, vị ngọt tự nhiên, tạo cảm giác thỏa mãn khi thèm ngọt',
  },

  // Trứng, Sữa & Whey
  {
    id: 'whey-isolate',
    name: 'Whey Protein Isolate (1 Muỗng)',
    category: 'dairy_whey',
    servingLabel: '1 Muỗng (30g)',
    servingGramsOrMl: 30,
    unit: 'g',
    kcalPerServing: 120,
    protein: 27,
    carbs: 1,
    fat: 0.5,
    note: 'Hấp thu nhanh sau tập, kích hoạt tổng hợp protein cơ bắp (MPS)',
  },
  {
    id: 'trung-ga-luoc',
    name: 'Trứng Gà Luộc (2 Quả)',
    category: 'dairy_whey',
    servingLabel: '2 Quả (110g)',
    servingGramsOrMl: 110,
    unit: 'g',
    kcalPerServing: 155,
    protein: 13,
    carbs: 1,
    fat: 10.5,
    note: 'Nguồn choline nuôi dưỡng não bộ và vitamin A/D/E/K',
  },
  {
    id: 'long-trang-trung',
    name: 'Lòng Trắng Trứng Chiên/Luộc (100g)',
    category: 'dairy_whey',
    servingLabel: '100g (~3 lòng trắng)',
    servingGramsOrMl: 100,
    unit: 'g',
    kcalPerServing: 52,
    protein: 11,
    carbs: 0.7,
    fat: 0.2,
    note: 'Thuần protein, 0g mỡ, lý tưởng cho giai đoạn siết cơ sâu',
  },
  {
    id: 'sua-chua-hy-lap',
    name: 'Sữa Chua Hy Lạp Không Đường',
    category: 'dairy_whey',
    servingLabel: '1 Hộp (120g)',
    servingGramsOrMl: 120,
    unit: 'g',
    kcalPerServing: 90,
    protein: 10,
    carbs: 4.5,
    fat: 3,
    note: 'Gấp đôi protein so với sữa chua thông thường, nhiều lợi khuẩn đường ruột',
  },
  {
    id: 'sua-tuoi-khong-duong',
    name: 'Sữa Tươi Tiệt Trùng Không Đường',
    category: 'dairy_whey',
    servingLabel: '1 Hộp (200ml)',
    servingGramsOrMl: 200,
    unit: 'ml',
    kcalPerServing: 120,
    protein: 7,
    carbs: 10,
    fat: 6,
    note: 'Canxi sinh học cao, tiện mang theo uống kèm bữa phụ',
  },

  // Rau Xanh & Canh
  {
    id: 'rau-muong-luoc',
    name: 'Rau Muống Luộc Nước Chanh (1 Dĩa)',
    category: 'veg_soup',
    servingLabel: '1 Dĩa (200g)',
    servingGramsOrMl: 200,
    unit: 'g',
    kcalPerServing: 45,
    protein: 3.2,
    carbs: 6,
    fat: 0.4,
    note: 'Món quốc dân Việt Nam, thanh nhiệt, dồi dào chất xơ',
  },
  {
    id: 'canh-cai-nau-thit',
    name: 'Canh Cải Xanh Nấu Thịt Bằm (1 Bát)',
    category: 'veg_soup',
    servingLabel: '1 Bát tô',
    servingGramsOrMl: 250,
    unit: 'ml',
    kcalPerServing: 85,
    protein: 8,
    carbs: 3,
    fat: 4,
    note: 'Ấm bụng, bổ sung nước và vi chất cho bữa cơm gia đình',
  },
  {
    id: 'canh-chua-ca-loc',
    name: 'Canh Chua Cá Lóc Nam Bộ',
    category: 'veg_soup',
    servingLabel: '1 Bát tô',
    servingGramsOrMl: 300,
    unit: 'ml',
    kcalPerServing: 160,
    protein: 16,
    carbs: 12,
    fat: 4.5,
    note: 'Cá lóc đồng nạc, đậu bắp, bạc hà, cà chua, me chua thanh mát',
  },
  {
    id: 'bong-cai-xanh-luoc',
    name: 'Bông Cải Xanh (Broccoli) Luộc (150g)',
    category: 'veg_soup',
    servingLabel: '150g',
    servingGramsOrMl: 150,
    unit: 'g',
    kcalPerServing: 52,
    protein: 4.2,
    carbs: 9,
    fat: 0.6,
    note: 'Chống oxy hóa Sulforaphane mạnh mẽ, siêu thực phẩm thể hình',
  },

  // Đồ Uống & Ăn Vặt Lành Mạnh
  {
    id: 'ca-phe-den-khong-duong',
    name: 'Cà Phê Đen Đá Không Đường (Americano)',
    category: 'drinks_snacks',
    servingLabel: '1 Ly (250ml)',
    servingGramsOrMl: 250,
    unit: 'ml',
    kcalPerServing: 5,
    protein: 0.3,
    carbs: 0.5,
    fat: 0.1,
    note: 'Tăng tỉnh táo, kích thích đốt mỡ tự nhiên trước tập 30 phút',
  },
  {
    id: 'tra-xanh-tuoi',
    name: 'Nước Trà Xanh Tươi Hãm Nóng/Đá',
    category: 'drinks_snacks',
    servingLabel: '1 Ly (300ml)',
    servingGramsOrMl: 300,
    unit: 'ml',
    kcalPerServing: 2,
    protein: 0,
    carbs: 0.4,
    fat: 0,
    note: 'EGCG chống lão hóa, thanh lọc độc tố',
  },
  {
    id: 'hat-hanh-nhan',
    name: 'Hạt Hạnh Nhân Sấy Tự Nhiên (30g)',
    category: 'drinks_snacks',
    servingLabel: '1 Nắm nhỏ (30g)',
    servingGramsOrMl: 30,
    unit: 'g',
    kcalPerServing: 175,
    protein: 6.3,
    carbs: 6.5,
    fat: 15,
    note: 'Chất béo đơn bất bão hòa tốt cho tim mạch và Vitamin E',
  },
];

export interface MealComboPreset {
  id: string;
  name: string;
  goalType: 'cut' | 'maintain' | 'bulk';
  slot: MealSlot;
  totalKcal: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  items: FoodItem[];
  description: string;
}

export const BALANCED_MEAL_COMBOS: MealComboPreset[] = [
  {
    id: 'combo-sang-pho-bo',
    name: 'Bữa Sáng Năng Lượng: Phở Bò Tái Nạc + 1 Trứng Chần',
    goalType: 'maintain',
    slot: 'breakfast',
    totalKcal: 510,
    totalProtein: 40,
    totalCarbs: 58,
    totalFat: 11,
    description: 'Bát phở bò tái chuẩn vị Việt kết hợp trứng chần lòng đào giàu đạm cho cả buổi sáng sung mãn.',
    items: [
      { name: 'Phở Bò Tái Nạc', amount: 550, unit: 'g', kcal: 430, protein: 34, carbs: 58, fat: 6 },
      { name: 'Trứng Chần Lòng Đào', amount: 55, unit: 'g', kcal: 80, protein: 6, carbs: 0, fat: 5 },
    ],
  },
  {
    id: 'combo-trua-com-tam-fitness',
    name: 'Bữa Trưa Siết Mỡ: Cơm Tấm Sườn Nạc + Canh Khổ Qua',
    goalType: 'cut',
    slot: 'lunch',
    totalKcal: 590,
    totalProtein: 42,
    totalCarbs: 68,
    totalFat: 15,
    description: 'Cơm tấm sườn nướng ít mỡ + trứng ốp la, ăn kèm canh khổ qua dồn thịt băm thanh nhiệt giải ngấy.',
    items: [
      { name: 'Cơm Tấm Sườn Nạc + Ốp La', amount: 380, unit: 'g', kcal: 560, protein: 38, carbs: 68, fat: 14 },
      { name: 'Canh Khổ Qua Thịt Băm', amount: 200, unit: 'ml', kcal: 30, protein: 4, carbs: 0, fat: 1 },
    ],
  },
  {
    id: 'combo-pre-workout',
    name: 'Bữa Phụ Trước Tập: 1 Chuối Chín + 1 Scoop Whey Isolate',
    goalType: 'bulk',
    slot: 'snack',
    totalKcal: 225,
    totalProtein: 28.3,
    totalCarbs: 28,
    totalFat: 0.9,
    description: 'Nạp trước tập 30-45 phút: chuối nạp glycogen nhanh kết hợp whey isolate nạp amino acid bảo vệ cơ bắp.',
    items: [
      { name: 'Chuối Tiêu Chín', amount: 120, unit: 'g', kcal: 105, protein: 1.3, carbs: 27, fat: 0.4 },
      { name: 'Whey Protein Isolate', amount: 30, unit: 'g', kcal: 120, protein: 27, carbs: 1, fat: 0.5 },
    ],
  },
  {
    id: 'combo-toi-uc-ga-khoai-lang',
    name: 'Bữa Tối Tăng Cơ: Ức Gà Áp Chảo + Khoai Lang + Rau Luộc',
    goalType: 'cut',
    slot: 'dinner',
    totalKcal: 530,
    totalProtein: 68,
    totalCarbs: 42,
    totalFat: 7.6,
    description: 'Bộ ba dinh dưỡng vàng: 200g ức gà áp chảo thơm lừng, 1 củ khoai lang ngọt bùi và dĩa rau muống luộc.',
    items: [
      { name: 'Ức Gà Áp Chảo (200g)', amount: 200, unit: 'g', kcal: 330, protein: 62, carbs: 0, fat: 7 },
      { name: 'Khoai Lang Mật Luộc', amount: 180, unit: 'g', kcal: 155, protein: 2.8, carbs: 36, fat: 0.2 },
      { name: 'Rau Muống Luộc', amount: 200, unit: 'g', kcal: 45, protein: 3.2, carbs: 6, fat: 0.4 },
    ],
  },
];

// ---------------------------------------------------------------------------
// 10. Daily Health Score (Chỉ số Sức Khỏe Toàn Diện 0 - 100)
// ---------------------------------------------------------------------------

export interface HealthScoreResult {
  score: number;
  status: 'excellent' | 'good' | 'moderate' | 'needs_improvement';
  statusLabel: string;
  badgeColor: string;
  breakdown: {
    title: string;
    score: number;
    max: number;
    pct: number;
    detail: string;
    icon: string;
  }[];
}

export function calculateDailyHealthScore(
  log: HealthDayLog,
  targetSteps: number = 8000,
  targetWaterMl: number = 2500,
  targetKcal: number = 2000,
  targetProtein: number = 140
): HealthScoreResult {
  // 1. Steps (max 25)
  const steps = log.steps || 0;
  const stepPct = Math.min(1.2, targetSteps > 0 ? steps / targetSteps : 0);
  const stepScore = Math.min(25, Math.round(stepPct * 25));

  // 2. Hydration (max 25)
  const water = log.waterMl || 0;
  const waterPct = Math.min(1.2, targetWaterMl > 0 ? water / targetWaterMl : 0);
  const waterScore = Math.min(25, Math.round(waterPct * 25));

  // 3. Sleep (max 25): ideal 7-8 hours
  const sleep = log.sleepHours || 0;
  let sleepScore = 0;
  if (sleep >= 7 && sleep <= 9) sleepScore = 25;
  else if (sleep >= 6) sleepScore = 18;
  else if (sleep >= 5) sleepScore = 12;
  else if (sleep > 0) sleepScore = 6;

  // 4. Nutrition / Protein (max 25)
  const protein = log.protein || 0;
  const proteinPct = Math.min(1.2, targetProtein > 0 ? protein / targetProtein : 0);
  const nutritionScore = Math.min(25, Math.round(proteinPct * 25));

  const total = Math.min(100, Math.max(0, stepScore + waterScore + sleepScore + nutritionScore));

  let status: HealthScoreResult['status'] = 'moderate';
  let statusLabel = 'Trung Bình';
  let badgeColor = '#F59E0B';

  if (total >= 85) {
    status = 'excellent';
    statusLabel = 'Xuất Sắc';
    badgeColor = '#10B981';
  } else if (total >= 70) {
    status = 'good';
    statusLabel = 'Tốt';
    badgeColor = '#3B82F6';
  } else if (total >= 50) {
    status = 'moderate';
    statusLabel = 'Khá';
    badgeColor = '#F59E0B';
  } else {
    status = 'needs_improvement';
    statusLabel = 'Cần Cải Thiện';
    badgeColor = '#EF4444';
  }

  return {
    score: total,
    status,
    statusLabel,
    badgeColor,
    breakdown: [
      {
        title: 'Vận Động (Bước Chân)',
        score: stepScore,
        max: 25,
        pct: Math.round((stepScore / 25) * 100),
        detail: `${steps.toLocaleString()} / ${targetSteps.toLocaleString()} bước`,
        icon: 'Footprints',
      },
      {
        title: 'Nước Uống (Hydration)',
        score: waterScore,
        max: 25,
        pct: Math.round((waterScore / 25) * 100),
        detail: `${water} / ${targetWaterMl} ml`,
        icon: 'Droplets',
      },
      {
        title: 'Giấc Ngủ (Phục Hồi)',
        score: sleepScore,
        max: 25,
        pct: Math.round((sleepScore / 25) * 100),
        detail: sleep > 0 ? `${sleep} giờ ngủ` : 'Chưa ghi nhận',
        icon: 'Moon',
      },
      {
        title: 'Dinh Dưỡng (Protein Nạp)',
        score: nutritionScore,
        max: 25,
        pct: Math.round((nutritionScore / 25) * 100),
        detail: `${Math.round(protein)}g / ${targetProtein}g protein`,
        icon: 'Utensils',
      },
    ],
  };
}
