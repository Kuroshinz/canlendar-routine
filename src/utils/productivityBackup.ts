import {
  BudgetSettings,
  FocusSession,
  GoalItem,
  HealthDayLog,
  HealthProfile,
  TaskItem,
  Transaction,
  WellnessCheck,
  WorkoutLog,
} from '../types/productivity';

/** Everything the productivity store owns, without the backup envelope. */
export interface ProductivitySnapshotData {
  tasks: TaskItem[];
  goals: GoalItem[];
  sessions: FocusSession[];
  transactions: Transaction[];
  budget: BudgetSettings;
  healthLogs: HealthDayLog[];
  workouts: WorkoutLog[];
  wellness: WellnessCheck[];
  healthProfile: HealthProfile;
}

export interface ProductivityBackup extends ProductivitySnapshotData {
  app: 'google-calendar-pro';
  kind: 'productivity-backup';
  version: 1;
  exportedAt: string;
}

const isArray = (value: unknown): value is unknown[] => Array.isArray(value);

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export function buildProductivityBackup(data: ProductivitySnapshotData): ProductivityBackup {
  return {
    app: 'google-calendar-pro',
    kind: 'productivity-backup',
    version: 1,
    exportedAt: new Date().toISOString(),
    ...data,
  };
}

/**
 * Validates a parsed backup file before it is allowed to replace live data.
 *
 * Only the container shape is checked: the item shapes are already enforced by
 * the store's TypeScript types, and refusing a whole file because one entry is
 * odd would make restores look broken. A file missing any collection, or one
 * that is not a productivity backup at all, is rejected so it cannot wipe data.
 */
export function parseProductivityBackup(raw: unknown): ProductivityBackup | null {
  if (!isObject(raw) || raw.kind !== 'productivity-backup') return null;

  const listKeys: (keyof ProductivitySnapshotData)[] = [
    'tasks',
    'goals',
    'sessions',
    'transactions',
    'healthLogs',
    'workouts',
    'wellness',
  ];
  for (const key of listKeys) {
    if (!isArray(raw[key])) return null;
  }
  if (!isObject(raw.budget) || !isObject(raw.healthProfile)) return null;

  return {
    app: 'google-calendar-pro',
    kind: 'productivity-backup',
    version: 1,
    exportedAt: typeof raw.exportedAt === 'string' ? raw.exportedAt : new Date().toISOString(),
    tasks: raw.tasks as TaskItem[],
    goals: raw.goals as GoalItem[],
    sessions: raw.sessions as FocusSession[],
    transactions: raw.transactions as Transaction[],
    budget: raw.budget as unknown as BudgetSettings,
    healthLogs: raw.healthLogs as HealthDayLog[],
    workouts: raw.workouts as WorkoutLog[],
    wellness: raw.wellness as WellnessCheck[],
    healthProfile: raw.healthProfile as unknown as HealthProfile,
  };
}
