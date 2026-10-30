import {
  BudgetLevel,
  BudgetSettings,
  BudgetStatus,
  FinanceCategoryId,
  FinanceSummary,
  FocusSession,
  GoalItem,
  GoalProgress,
  HealthDayLog,
  TaskItem,
  Transaction,
  WorkoutLog,
} from '../types/productivity';
import { CalendarEvent } from '../types/calendar';
import { formatDateString } from './calendarUtils';
import { timeStringToMinutes } from './dndUtils';

// ---------------------------------------------------------------------------
// Tasks & Goals
// ---------------------------------------------------------------------------

/**
 * A task's progress counts its own status plus any completed sub-tasks, so the
 * goal progress bar moves as the user ticks sub-tasks off.
 */
export function computeTaskCompletionRatio(task: TaskItem): number {
  if (task.subtasks.length === 0) {
    return task.status === 'completed' ? 1 : 0;
  }
  const done = task.subtasks.filter((s) => s.done).length;
  const own = task.status === 'completed' ? 1 : 0;
  return Math.min(1, (done + own) / (task.subtasks.length + 1));
}

/**
 * Goal progress is derived entirely from the tasks linked through `goalId`.
 * A goal with no tasks reports 0 % (explicit unknown, not "complete").
 */
export function computeGoalProgress(goal: GoalItem, tasks: TaskItem[]): GoalProgress {
  const linked = tasks.filter((t) => t.goalId === goal.id);
  const totalTasks = linked.length;
  if (totalTasks === 0) {
    return { goalId: goal.id, totalTasks: 0, completedTasks: 0, percent: 0 };
  }
  const ratioSum = linked.reduce((sum, t) => sum + computeTaskCompletionRatio(t), 0);
  const completedTasks = linked.filter((t) => t.status === 'completed').length;
  return {
    goalId: goal.id,
    totalTasks,
    completedTasks,
    percent: Math.round((ratioSum / totalTasks) * 100),
  };
}

const PRIORITY_ORDER: Record<TaskItem['priority'], number> = { high: 0, medium: 1, low: 2 };
const STATUS_ORDER: Record<TaskItem['status'], number> = {
  in_progress: 0,
  todo: 1,
  completed: 2,
};

/**
 * Sorts by urgency: unfinished first, then priority, then earliest deadline.
 * Tasks without a deadline sort after dated ones inside the same bucket.
 */
export function sortTasks(tasks: TaskItem[]): TaskItem[] {
  return [...tasks].sort((a, b) => {
    const statusDiff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    if (statusDiff !== 0) return statusDiff;

    const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (priorityDiff !== 0) return priorityDiff;

    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return b.createdAt - a.createdAt;
  });
}

export function isTaskOverdue(task: TaskItem, todayStr: string = formatDateString(new Date())): boolean {
  if (task.status === 'completed' || !task.dueDate) return false;
  return task.dueDate < todayStr;
}

export function tasksDueOn(tasks: TaskItem[], dateStr: string): TaskItem[] {
  return tasks.filter((t) => t.dueDate === dateStr);
}

/**
 * Mirrors tasks that carry both a deadline and a start time onto the calendar.
 * The generated event keeps `id: task-<taskId>` so it never collides with a
 * real event and can be filtered back out.
 */
export function taskToCalendarEvent(
  task: TaskItem,
  categoryColor: string
): CalendarEvent | null {
  if (!task.dueDate || !task.startTime) return null;

  const startM = timeStringToMinutes(task.startTime);
  const endM = task.endTime ? timeStringToMinutes(task.endTime) : startM + 60;

  return {
    id: `task-${task.id}`,
    title: task.title,
    description: task.notes,
    startDate: task.dueDate,
    startTime: task.startTime,
    endDate: task.dueDate,
    endTime: endM <= startM ? task.startTime : task.endTime || '10:00',
    allDay: false,
    calendarId: task.categoryId || 'tasks',
    color: categoryColor,
    type: 'task',
    isCompleted: task.status === 'completed',
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };
}

export function buildTaskEvents(tasks: TaskItem[], colorByCategoryId: Map<string, string>): CalendarEvent[] {
  const out: CalendarEvent[] = [];
  for (const task of tasks) {
    const ev = taskToCalendarEvent(task, colorByCategoryId.get(task.categoryId) || '#8E24AA');
    if (ev) out.push(ev);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Focus sessions
// ---------------------------------------------------------------------------

export function formatDuration(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function sessionMinutes(session: FocusSession): number {
  return Math.round(session.durationSeconds / 60);
}

/**
 * Buckets focus minutes per day for the last `days` days, oldest first.
 * Days without sessions are present with 0 minutes so the chart keeps its shape.
 */
export function focusMinutesByDay(
  sessions: FocusSession[],
  days: number,
  today: Date = new Date()
): { date: string; minutes: number }[] {
  const buckets = new Map<string, number>();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    buckets.set(formatDateString(d), 0);
  }

  for (const s of sessions) {
    const key = formatDateString(new Date(s.startedAt));
    if (buckets.has(key)) {
      buckets.set(key, (buckets.get(key) || 0) + sessionMinutes(s));
    }
  }

  return Array.from(buckets.entries()).map(([date, minutes]) => ({ date, minutes }));
}

export function totalFocusMinutes(sessions: FocusSession[], startDate?: string, endDate?: string): number {
  return sessions
    .filter((s) => {
      if (!startDate && !endDate) return true;
      const key = formatDateString(new Date(s.startedAt));
      if (startDate && key < startDate) return false;
      if (endDate && key > endDate) return false;
      return true;
    })
    .reduce((sum, s) => sum + sessionMinutes(s), 0);
}

// ---------------------------------------------------------------------------
// Finance
// ---------------------------------------------------------------------------

export function summarizeFinance(transactions: Transaction[], monthPrefix?: string): FinanceSummary {
  const scoped = monthPrefix
    ? transactions.filter((t) => t.date.startsWith(monthPrefix))
    : transactions;

  let income = 0;
  let expense = 0;
  for (const t of scoped) {
    if (t.type === 'income') income += t.amount;
    else expense += t.amount;
  }

  return {
    income,
    expense,
    balance: income - expense,
    transactionCount: scoped.length,
  };
}

export function computeBudgetStatus(spent: number, limit: number): BudgetStatus {
  if (limit <= 0) {
    return { limit: 0, spent, remaining: 0, percent: 0, level: 'ok' };
  }
  const percent = Math.round((spent / limit) * 100);
  const level: BudgetLevel = percent >= 100 ? 'over' : percent >= 80 ? 'warning' : 'ok';
  return {
    limit,
    spent,
    remaining: limit - spent,
    percent,
    level,
  };
}

export function monthPrefixOf(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/** Expense totals per category for a month, sorted by amount descending. */
export function expenseByCategory(
  transactions: Transaction[],
  monthPrefix: string
): { category: FinanceCategoryId; amount: number }[] {
  const map = new Map<FinanceCategoryId, number>();
  for (const t of transactions) {
    if (t.type !== 'expense') continue;
    if (!t.date.startsWith(monthPrefix)) continue;
    map.set(t.category, (map.get(t.category) || 0) + t.amount);
  }
  return Array.from(map.entries())
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
}

/** Daily net cash flow (income − expense) for the given month. */
export function dailyCashFlow(
  transactions: Transaction[],
  monthPrefix: string
): { date: string; income: number; expense: number }[] {
  const [yearStr, monthStr] = monthPrefix.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const daysInMonth = new Date(year, month, 0).getDate();

  const rows: { date: string; income: number; expense: number }[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${monthPrefix}-${String(day).padStart(2, '0')}`;
    rows.push({ date, income: 0, expense: 0 });
  }

  const index = new Map(rows.map((r, i) => [r.date, i]));
  for (const t of transactions) {
    const i = index.get(t.date);
    if (i === undefined) continue;
    if (t.type === 'income') rows[i].income += t.amount;
    else rows[i].expense += t.amount;
  }
  return rows;
}

export function formatMoney(amount: number, currency: 'VND' | 'USD'): string {
  if (currency === 'USD') {
    return `$${amount.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  }
  return `${amount.toLocaleString('vi-VN')} ₫`;
}

export function formatMoneyCompact(amount: number, currency: 'VND' | 'USD'): string {
  if (currency === 'USD') {
    if (Math.abs(amount) >= 1000) return `$${(amount / 1000).toFixed(1)}k`;
    return `$${amount.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  }
  if (Math.abs(amount) >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}tr ₫`;
  if (Math.abs(amount) >= 1_000) return `${Math.round(amount / 1_000)}k ₫`;
  return `${amount.toLocaleString('vi-VN')} ₫`;
}

export function filterTransactions(
  transactions: Transaction[],
  opts: { monthPrefix?: string; category?: FinanceCategoryId | 'all'; query?: string }
): Transaction[] {
  const query = (opts.query || '').trim().toLowerCase();

  return transactions
    .filter((t) => {
      if (opts.monthPrefix && !t.date.startsWith(opts.monthPrefix)) return false;
      if (opts.category && opts.category !== 'all' && t.category !== opts.category) return false;
      if (query) {
        const haystack = `${t.title} ${t.note || ''}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return b.createdAt - a.createdAt;
    });
}

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------

export function bmi(weightKg: number, heightCm: number): number {
  if (weightKg <= 0 || heightCm <= 0) return 0;
  const m = heightCm / 100;
  return Math.round((weightKg / (m * m)) * 10) / 10;
}

export function bmiLabel(value: number, lang: 'vi' | 'en'): string {
  if (value <= 0) return lang === 'vi' ? 'Chưa có dữ liệu' : 'No data';
  if (value < 18.5) return lang === 'vi' ? 'Thiếu cân' : 'Underweight';
  if (value < 25) return lang === 'vi' ? 'Bình thường' : 'Normal';
  if (value < 30) return lang === 'vi' ? 'Thừa cân' : 'Overweight';
  return lang === 'vi' ? 'Béo phì' : 'Obese';
}

/** Weight trend for the last `days` days, only including days with a value. */
export function weightTrend(
  logs: HealthDayLog[],
  days: number,
  today: Date = new Date()
): { date: string; weightKg: number }[] {
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - (days - 1));
  const cutoffStr = formatDateString(cutoff);

  return logs
    .filter((l) => typeof l.weightKg === 'number' && l.weightKg! > 0 && l.date >= cutoffStr)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((l) => ({ date: l.date, weightKg: l.weightKg! }));
}

export function macroCalories(protein: number, carbs: number, fat: number): number {
  return Math.round(protein * 4 + carbs * 4 + fat * 9);
}

export function macroPercentages(
  protein: number,
  carbs: number,
  fat: number
): { protein: number; carbs: number; fat: number } {
  const total = macroCalories(protein, carbs, fat);
  if (total <= 0) return { protein: 0, carbs: 0, fat: 0 };
  return {
    protein: Math.round(((protein * 4) / total) * 100),
    carbs: Math.round(((carbs * 4) / total) * 100),
    fat: Math.round(((fat * 9) / total) * 100),
  };
}

export function workoutMinutesThisWeek(
  workouts: WorkoutLog[],
  today: Date = new Date()
): number {
  const day = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((day + 6) % 7));
  const startStr = formatDateString(monday);
  const endStr = formatDateString(today);

  return workouts
    .filter((w) => w.date >= startStr && w.date <= endStr)
    .reduce((sum, w) => sum + w.durationMin, 0);
}

/**
 * Simple 7-day rolling averages used by the health dashboard headline cards.
 */
export function healthAverages(
  logs: HealthDayLog[],
  days: number = 7,
  today: Date = new Date()
): { steps: number; waterMl: number; sleepHours: number; caloriesIn: number } {
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - (days - 1));
  const cutoffStr = formatDateString(cutoff);

  const scoped = logs.filter((l) => l.date >= cutoffStr);
  if (scoped.length === 0) {
    return { steps: 0, waterMl: 0, sleepHours: 0, caloriesIn: 0 };
  }

  const sum = (pick: (l: HealthDayLog) => number | undefined) =>
    scoped.reduce((acc, l) => acc + (pick(l) || 0), 0);

  return {
    steps: Math.round(sum((l) => l.steps) / scoped.length),
    waterMl: Math.round(sum((l) => l.waterMl) / scoped.length),
    sleepHours: Math.round((sum((l) => l.sleepHours) / scoped.length) * 10) / 10,
    caloriesIn: Math.round(sum((l) => l.caloriesIn) / scoped.length),
  };
}
