/**
 * Productivity domain types — shared by the Tasks & Goals, Focus, Finance and
 * Health modules. These sit next to `calendar.ts` / `multiHub.ts` and reuse the
 * same Vietnamese-first copy conventions.
 */

// ---------------------------------------------------------------------------
// Tasks & Goals
// ---------------------------------------------------------------------------

export type TaskStatus = 'todo' | 'in_progress' | 'completed';
export type TaskPriority = 'high' | 'medium' | 'low';

export interface SubTask {
  id: string;
  title: string;
  done: boolean;
}

export interface TaskItem {
  id: string;
  title: string;
  notes?: string;
  status: TaskStatus;
  priority: TaskPriority;
  /** Deadline date (YYYY-MM-DD). Required for calendar linkage. */
  dueDate?: string;
  /** When startTime is present the task is mirrored onto the calendar. */
  startTime?: string;
  endTime?: string;
  /** Links to a CalendarCategory id so the chip uses the same colour. */
  categoryId: string;
  goalId?: string;
  subtasks: SubTask[];
  createdAt: number;
  updatedAt?: number;
  completedAt?: number;
}

export interface GoalItem {
  id: string;
  title: string;
  description?: string;
  categoryId: string;
  color: string;
  targetDate?: string;
  createdAt: number;
}

export interface GoalProgress {
  goalId: string;
  totalTasks: number;
  completedTasks: number;
  percent: number;
}

// ---------------------------------------------------------------------------
// Focus sessions
// ---------------------------------------------------------------------------

export type FocusMode = 'pomodoro' | 'stopwatch' | 'countdown';
export type PomodoroPhase = 'focus' | 'shortBreak' | 'longBreak';

export interface FocusSession {
  id: string;
  mode: FocusMode;
  phase?: PomodoroPhase;
  taskId?: string;
  goalId?: string;
  /** Human readable label captured when the session started. */
  label: string;
  startedAt: number;
  endedAt: number;
  durationSeconds: number;
  /** False when the user stopped the timer before it elapsed. */
  completed: boolean;
}

// ---------------------------------------------------------------------------
// Finance
// ---------------------------------------------------------------------------

export type TransactionType = 'income' | 'expense';

export type FinanceCategoryId =
  | 'food'
  | 'transport'
  | 'study'
  | 'work'
  | 'health'
  | 'shopping'
  | 'entertainment'
  | 'bills'
  | 'salary'
  | 'other';

export interface FinanceCategoryMeta {
  id: FinanceCategoryId;
  name: string;
  nameVi: string;
  color: string;
  type: TransactionType | 'both';
}

export interface Transaction {
  id: string;
  title: string;
  /** Always stored as a positive number; `type` carries the sign. */
  amount: number;
  type: TransactionType;
  category: FinanceCategoryId;
  date: string; // YYYY-MM-DD
  note?: string;
  createdAt: number;
}

export interface BudgetSettings {
  monthlyLimit: number;
  categoryLimits: Partial<Record<FinanceCategoryId, number>>;
  currency: 'VND' | 'USD';
}

export interface FinanceSummary {
  income: number;
  expense: number;
  balance: number;
  transactionCount: number;
}

export type BudgetLevel = 'ok' | 'warning' | 'over';

export interface BudgetStatus {
  limit: number;
  spent: number;
  remaining: number;
  percent: number;
  level: BudgetLevel;
}

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------

export type HealthSource = 'manual' | 'google-fit' | 'mock';

export interface HealthDayLog {
  date: string; // YYYY-MM-DD
  weightKg?: number;
  caloriesIn?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  caloriesBurned?: number;
  waterMl?: number;
  sleepHours?: number;
  steps?: number;
  source?: HealthSource;
  updatedAt?: number;
}

export interface HealthProfile {
  heightCm: number;
  targetWeightKg?: number;
  dailyWaterMl: number;
  dailySteps: number;
  dailySleepHours: number;
}

export type WorkoutType = 'strength' | 'cardio' | 'flexibility' | 'sport';

export interface WorkoutLog {
  id: string;
  date: string;
  name: string;
  type: WorkoutType;
  durationMin: number;
  sets?: number;
  reps?: number;
  caloriesBurned?: number;
  note?: string;
  createdAt: number;
}

export interface WellnessCheck {
  date: string;
  stressLevel: number; // 1..5
  energyLevel: number; // 1..5
  sleepHours: number;
  note?: string;
}

// ---------------------------------------------------------------------------
// Shared metadata
// ---------------------------------------------------------------------------

export const FINANCE_CATEGORIES: FinanceCategoryMeta[] = [
  { id: 'food', name: 'Food & Drink', nameVi: 'Ăn uống', color: '#F4511E', type: 'expense' },
  { id: 'transport', name: 'Transport', nameVi: 'Di chuyển', color: '#039BE5', type: 'expense' },
  { id: 'study', name: 'Study', nameVi: 'Học tập', color: '#8E24AA', type: 'expense' },
  { id: 'work', name: 'Work', nameVi: 'Công việc', color: '#3F51B5', type: 'both' },
  { id: 'health', name: 'Health', nameVi: 'Sức khỏe', color: '#33B679', type: 'expense' },
  { id: 'shopping', name: 'Shopping', nameVi: 'Mua sắm', color: '#E67C73', type: 'expense' },
  { id: 'entertainment', name: 'Entertainment', nameVi: 'Giải trí', color: '#F6BF26', type: 'expense' },
  { id: 'bills', name: 'Bills', nameVi: 'Hóa đơn', color: '#616161', type: 'expense' },
  { id: 'salary', name: 'Salary', nameVi: 'Lương', color: '#0B8043', type: 'income' },
  { id: 'other', name: 'Other', nameVi: 'Khác', color: '#7986CB', type: 'both' },
];

export const TASK_PRIORITY_META: Record<
  TaskPriority,
  { label: string; labelVi: string; color: string; badgeClass: string }
> = {
  high: {
    label: 'High',
    labelVi: 'Cao',
    color: '#D50000',
    badgeClass:
      'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900',
  },
  medium: {
    label: 'Medium',
    labelVi: 'Trung bình',
    color: '#F4511E',
    badgeClass:
      'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900',
  },
  low: {
    label: 'Low',
    labelVi: 'Thấp',
    color: '#33B679',
    badgeClass:
      'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900',
  },
};

export const TASK_STATUS_META: Record<
  TaskStatus,
  { label: string; labelVi: string; color: string }
> = {
  todo: { label: 'To do', labelVi: 'Cần làm', color: '#7986CB' },
  in_progress: { label: 'In progress', labelVi: 'Đang làm', color: '#F6BF26' },
  completed: { label: 'Completed', labelVi: 'Hoàn thành', color: '#33B679' },
};

export const DEFAULT_BUDGET: BudgetSettings = {
  monthlyLimit: 15000000,
  categoryLimits: {},
  currency: 'VND',
};

export const DEFAULT_HEALTH_PROFILE: HealthProfile = {
  heightCm: 172,
  targetWeightKg: 65,
  dailyWaterMl: 2500,
  dailySteps: 8000,
  dailySleepHours: 8,
};

