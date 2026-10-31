import { useCallback, useMemo } from 'react';
import {
  BudgetSettings,
  DEFAULT_BUDGET,
  DEFAULT_HEALTH_PROFILE,
  FinanceCategoryId,
  FinanceSummary,
  FocusSession,
  GoalItem,
  GoalProgress,
  HealthDayLog,
  HealthProfile,
  TaskItem,
  TaskStatus,
  Transaction,
  WellnessCheck,
  WorkoutLog,
} from '../types/productivity';
import {
  SEED_FOCUS_SESSIONS,
  SEED_GOALS,
  SEED_HEALTH_LOGS,
  SEED_TASKS,
  SEED_TRANSACTIONS,
  SEED_WELLNESS,
  SEED_WORKOUTS,
} from '../data/productivitySeed';
import { usePersistentState } from './usePersistentState';
import { formatDateString } from '../utils/calendarUtils';
import {
  computeGoalProgress,
  monthPrefixOf,
  summarizeFinance,
} from '../utils/productivityUtils';
import type { ProductivitySnapshotData } from '../utils/productivityBackup';

const KEYS = {
  tasks: 'gcal_prod_tasks',
  goals: 'gcal_prod_goals',
  focus: 'gcal_prod_focus_sessions',
  transactions: 'gcal_prod_transactions',
  budget: 'gcal_prod_budget',
  health: 'gcal_prod_health_logs',
  workouts: 'gcal_prod_workouts',
  wellness: 'gcal_prod_wellness',
  profile: 'gcal_prod_health_profile',
} as const;

export interface ProductivityStore {
  // Tasks
  tasks: TaskItem[];
  addTask: (task: Omit<TaskItem, 'id' | 'createdAt' | 'subtasks'> & { subtasks?: TaskItem['subtasks'] }) => TaskItem;
  updateTask: (id: string, patch: Partial<TaskItem>) => void;
  deleteTask: (id: string) => void;
  setTaskStatus: (id: string, status: TaskStatus) => void;
  toggleSubtask: (taskId: string, subtaskId: string) => void;
  addSubtask: (taskId: string, title: string) => void;
  removeSubtask: (taskId: string, subtaskId: string) => void;

  // Goals
  goals: GoalItem[];
  addGoal: (goal: Omit<GoalItem, 'id' | 'createdAt'>) => GoalItem;
  updateGoal: (id: string, patch: Partial<GoalItem>) => void;
  deleteGoal: (id: string) => void;
  goalProgress: GoalProgress[];

  // Focus
  sessions: FocusSession[];
  addSession: (session: FocusSession) => void;
  deleteSession: (id: string) => void;

  // Finance
  transactions: Transaction[];
  addTransaction: (tx: Omit<Transaction, 'id' | 'createdAt'>) => void;
  deleteTransaction: (id: string) => void;
  budget: BudgetSettings;
  updateBudget: (patch: Partial<BudgetSettings>) => void;
  monthSummary: (monthPrefix?: string) => FinanceSummary;

  // Health
  healthLogs: HealthDayLog[];
  upsertHealthLog: (log: HealthDayLog) => void;
  healthProfile: HealthProfile;
  updateHealthProfile: (patch: Partial<HealthProfile>) => void;
  workouts: WorkoutLog[];
  addWorkout: (w: Omit<WorkoutLog, 'id' | 'createdAt'>) => void;
  deleteWorkout: (id: string) => void;
  wellness: WellnessCheck[];
  upsertWellness: (check: WellnessCheck) => void;

  /** Current data of every module, for a JSON backup. */
  snapshot: () => ProductivitySnapshotData;
  /** Replace every module with the contents of a validated backup. */
  restore: (data: ProductivitySnapshotData) => void;
  /** Restore every module back to its seed data (used by "Đặt lại"). */
  resetAll: () => void;
}

const uid = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

/**
 * Single owner for all productivity data. Every module reads and writes through
 * this hook so tasks, goals, focus sessions, money and health stay in sync
 * without duplicating state in individual views.
 */
export function useProductivityStore(): ProductivityStore {
  const [tasks, setTasks] = usePersistentState<TaskItem[]>(KEYS.tasks, SEED_TASKS);
  const [goals, setGoals] = usePersistentState<GoalItem[]>(KEYS.goals, SEED_GOALS);
  const [sessions, setSessions] = usePersistentState<FocusSession[]>(KEYS.focus, SEED_FOCUS_SESSIONS);
  const [transactions, setTransactions] = usePersistentState<Transaction[]>(
    KEYS.transactions,
    SEED_TRANSACTIONS
  );
  const [budget, setBudget] = usePersistentState<BudgetSettings>(KEYS.budget, DEFAULT_BUDGET);
  const [healthLogs, setHealthLogs] = usePersistentState<HealthDayLog[]>(KEYS.health, SEED_HEALTH_LOGS);
  const [workouts, setWorkouts] = usePersistentState<WorkoutLog[]>(KEYS.workouts, SEED_WORKOUTS);
  const [wellness, setWellness] = usePersistentState<WellnessCheck[]>(KEYS.wellness, SEED_WELLNESS);
  const [healthProfile, setHealthProfile] = usePersistentState<HealthProfile>(
    KEYS.profile,
    DEFAULT_HEALTH_PROFILE
  );

  // --- Tasks ---------------------------------------------------------------

  const addTask = useCallback(
    (input: Omit<TaskItem, 'id' | 'createdAt' | 'subtasks'> & { subtasks?: TaskItem['subtasks'] }) => {
      const task: TaskItem = {
        ...input,
        id: uid('task'),
        subtasks: input.subtasks || [],
        createdAt: Date.now(),
      };
      setTasks((prev) => [task, ...prev]);
      return task;
    },
    [setTasks]
  );

  const updateTask = useCallback(
    (id: string, patch: Partial<TaskItem>) => {
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...patch, updatedAt: Date.now() } : t))
      );
    },
    [setTasks]
  );

  const deleteTask = useCallback(
    (id: string) => {
      setTasks((prev) => prev.filter((t) => t.id !== id));
    },
    [setTasks]
  );

  const setTaskStatus = useCallback(
    (id: string, status: TaskStatus) => {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === id
            ? {
                ...t,
                status,
                updatedAt: Date.now(),
                completedAt: status === 'completed' ? Date.now() : undefined,
              }
            : t
        )
      );
    },
    [setTasks]
  );

  const toggleSubtask = useCallback(
    (taskId: string, subtaskId: string) => {
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id !== taskId) return t;
          const subtasks = t.subtasks.map((s) =>
            s.id === subtaskId ? { ...s, done: !s.done } : s
          );
          // A task whose sub-tasks are all done but that is still open moves to
          // "in progress" so the board reflects reality without a manual click.
          const allDone = subtasks.length > 0 && subtasks.every((s) => s.done);
          const status: TaskStatus =
            allDone && t.status === 'todo' ? 'in_progress' : t.status;
          return { ...t, subtasks, status, updatedAt: Date.now() };
        })
      );
    },
    [setTasks]
  );

  const addSubtask = useCallback(
    (taskId: string, title: string) => {
      const trimmed = title.trim();
      if (!trimmed) return;
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? {
                ...t,
                subtasks: [...t.subtasks, { id: uid('sub'), title: trimmed, done: false }],
                updatedAt: Date.now(),
              }
            : t
        )
      );
    },
    [setTasks]
  );

  const removeSubtask = useCallback(
    (taskId: string, subtaskId: string) => {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? {
                ...t,
                subtasks: t.subtasks.filter((s) => s.id !== subtaskId),
                updatedAt: Date.now(),
              }
            : t
        )
      );
    },
    [setTasks]
  );

  // --- Goals ---------------------------------------------------------------

  const addGoal = useCallback(
    (input: Omit<GoalItem, 'id' | 'createdAt'>) => {
      const goal: GoalItem = { ...input, id: uid('goal'), createdAt: Date.now() };
      setGoals((prev) => [...prev, goal]);
      return goal;
    },
    [setGoals]
  );

  const updateGoal = useCallback(
    (id: string, patch: Partial<GoalItem>) => {
      setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, ...patch } : g)));
    },
    [setGoals]
  );

  const deleteGoal = useCallback(
    (id: string) => {
      setGoals((prev) => prev.filter((g) => g.id !== id));
      // Detach tasks so the goal progress of other goals stays correct and the
      // tasks themselves are preserved.
      setTasks((prev) => prev.map((t) => (t.goalId === id ? { ...t, goalId: undefined } : t)));
    },
    [setGoals, setTasks]
  );

  const goalProgress = useMemo(
    () => goals.map((g) => computeGoalProgress(g, tasks)),
    [goals, tasks]
  );

  // --- Focus ---------------------------------------------------------------

  const addSession = useCallback(
    (session: FocusSession) => {
      setSessions((prev) => [session, ...prev]);
    },
    [setSessions]
  );

  const deleteSession = useCallback(
    (id: string) => {
      setSessions((prev) => prev.filter((s) => s.id !== id));
    },
    [setSessions]
  );

  // --- Finance -------------------------------------------------------------

  const addTransaction = useCallback(
    (input: Omit<Transaction, 'id' | 'createdAt'>) => {
      setTransactions((prev) => [
        { ...input, id: uid('tx'), createdAt: Date.now() },
        ...prev,
      ]);
    },
    [setTransactions]
  );

  const deleteTransaction = useCallback(
    (id: string) => {
      setTransactions((prev) => prev.filter((t) => t.id !== id));
    },
    [setTransactions]
  );

  const updateBudget = useCallback(
    (patch: Partial<BudgetSettings>) => {
      setBudget((prev) => ({ ...prev, ...patch }));
    },
    [setBudget]
  );

  const monthSummary = useCallback(
    (monthPrefix?: string) => summarizeFinance(transactions, monthPrefix ?? monthPrefixOf(new Date())),
    [transactions]
  );

  // --- Health --------------------------------------------------------------

  const upsertHealthLog = useCallback(
    (log: HealthDayLog) => {
      setHealthLogs((prev) => {
        const idx = prev.findIndex((l) => l.date === log.date);
        const merged: HealthDayLog = {
          ...(idx >= 0 ? prev[idx] : {}),
          ...log,
          updatedAt: Date.now(),
        };
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = merged;
          return copy;
        }
        return [...prev, merged].sort((a, b) => a.date.localeCompare(b.date));
      });
    },
    [setHealthLogs]
  );

  const updateHealthProfile = useCallback(
    (patch: Partial<HealthProfile>) => {
      setHealthProfile((prev) => ({ ...prev, ...patch }));
    },
    [setHealthProfile]
  );

  const addWorkout = useCallback(
    (input: Omit<WorkoutLog, 'id' | 'createdAt'>) => {
      setWorkouts((prev) => [
        { ...input, id: uid('wo'), createdAt: Date.now() },
        ...prev,
      ]);
    },
    [setWorkouts]
  );

  const deleteWorkout = useCallback(
    (id: string) => {
      setWorkouts((prev) => prev.filter((w) => w.id !== id));
    },
    [setWorkouts]
  );

  const upsertWellness = useCallback(
    (check: WellnessCheck) => {
      setWellness((prev) => {
        const idx = prev.findIndex((w) => w.date === check.date);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = check;
          return copy;
        }
        return [...prev, check].sort((a, b) => a.date.localeCompare(b.date));
      });
    },
    [setWellness]
  );

  const snapshot = useCallback<() => ProductivitySnapshotData>(
    () => ({
      tasks,
      goals,
      sessions,
      transactions,
      budget,
      healthLogs,
      workouts,
      wellness,
      healthProfile,
    }),
    [tasks, goals, sessions, transactions, budget, healthLogs, workouts, wellness, healthProfile]
  );

  const restore = useCallback(
    (data: ProductivitySnapshotData) => {
      setTasks(data.tasks);
      setGoals(data.goals);
      setSessions(data.sessions);
      setTransactions(data.transactions);
      setBudget(data.budget);
      setHealthLogs(data.healthLogs);
      setWorkouts(data.workouts);
      setWellness(data.wellness);
      setHealthProfile(data.healthProfile);
    },
    [
      setTasks,
      setGoals,
      setSessions,
      setTransactions,
      setBudget,
      setHealthLogs,
      setWorkouts,
      setWellness,
      setHealthProfile,
    ]
  );

  const resetAll = useCallback(() => {
    setTasks(SEED_TASKS);
    setGoals(SEED_GOALS);
    setSessions(SEED_FOCUS_SESSIONS);
    setTransactions(SEED_TRANSACTIONS);
    setBudget(DEFAULT_BUDGET);
    setHealthLogs(SEED_HEALTH_LOGS);
    setWorkouts(SEED_WORKOUTS);
    setWellness(SEED_WELLNESS);
    setHealthProfile(DEFAULT_HEALTH_PROFILE);
  }, [
    setTasks,
    setGoals,
    setSessions,
    setTransactions,
    setBudget,
    setHealthLogs,
    setWorkouts,
    setWellness,
    setHealthProfile,
  ]);

  return {
    tasks,
    addTask,
    updateTask,
    deleteTask,
    setTaskStatus,
    toggleSubtask,
    addSubtask,
    removeSubtask,
    goals,
    addGoal,
    updateGoal,
    deleteGoal,
    goalProgress,
    sessions,
    addSession,
    deleteSession,
    transactions,
    addTransaction,
    deleteTransaction,
    budget,
    updateBudget,
    monthSummary,
    healthLogs,
    upsertHealthLog,
    healthProfile,
    updateHealthProfile,
    workouts,
    addWorkout,
    deleteWorkout,
    wellness,
    upsertWellness,
    snapshot,
    restore,
    resetAll,
  };
}

/** Today's date as YYYY-MM-DD, exposed so views share one definition. */
export const todayString = () => formatDateString(new Date());

export type { FinanceCategoryId };
