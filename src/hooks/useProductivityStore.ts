import { useCallback, useMemo } from 'react';
import {
  BodyCheckPhoto,
  BodyPoint,
  BudgetSettings,
  CtgPeriodizedRoadmap,
  CtgProfile,
  CtgRoadmapPhase,
  DEFAULT_BUDGET,
  DEFAULT_HEALTH_PROFILE,
  Exercise,
  FinanceCategoryId,
  FinanceSummary,
  FocusSession,
  GoalItem,
  GoalProgress,
  HabitItem,
  HealthDayLog,
  HealthProfile,
  MealLog,
  NutritionSettings,
  PlannedSession,
  RoutineSplitTemplate,
  SavedRoadmap,
  SportSession,
  TaskItem,
  TaskStatus,
  Transaction,
  TransactionType,
  WellnessCheck,
  WorkoutLog,
  WorkoutSession,
} from '../types/productivity';
import {
  DEFAULT_NUTRITION_SETTINGS,
  SEED_BODY_POINTS,
  SEED_CTG_PERIODIZED_ROADMAP,
  SEED_CTG_PROFILE,
  SEED_FOCUS_SESSIONS,
  SEED_GOALS,
  SEED_HABITS,
  SEED_HEALTH_LOGS,
  SEED_MEALS,
  SEED_PLANNED_SESSIONS,
  SEED_SPORTS,
  SEED_TASKS,
  SEED_TRANSACTIONS,
  SEED_WELLNESS,
  SEED_WORKOUT_SESSIONS,
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
import { generateSplitSessions } from '../utils/fitnessMetrics';

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
  habits: 'gcal_prod_habits',
  ctgProfile: 'gcal_ctg_profile',
  bodyPoints: 'gcal_ctg_body_points',
  plannedSessions: 'gcal_ctg_planned_sessions',
  workoutSessions: 'gcal_ctg_workout_sessions',
  sportSessions: 'gcal_ctg_sports',
  meals: 'gcal_ctg_meals',
  nutritionSettings: 'gcal_ctg_nutrition_settings',
  bodyPhotos: 'gcal_prod_body_photos',
  savedRoadmaps: 'gcal_prod_saved_roadmaps',
  ctgPeriodizedRoadmap: 'gcal_ctg_periodized_roadmap',
  customExercises: 'gcal_prod_custom_exercises',
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

  // Habits & Routines
  habits: HabitItem[];
  addHabit: (habit: Omit<HabitItem, 'id' | 'createdAt' | 'completedDates'>) => HabitItem;
  toggleHabitDate: (id: string, dateStr: string) => void;
  deleteHabit: (id: string) => void;

  // Focus
  sessions: FocusSession[];
  addSession: (session: FocusSession) => void;
  deleteSession: (id: string) => void;

  // Finance
  transactions: Transaction[];
  addTransaction: (tx: Omit<Transaction, 'id' | 'createdAt'>) => void;
  updateTransaction: (id: string, patch: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  clearAllTransactions: () => void;
  setRealStartingBalance: (realBalance: number, clearOldTransactions?: boolean) => void;
  adjustBalanceWithTransaction: (targetBalance: number, note?: string) => void;
  resetFinance: (startingBalance?: number) => void;
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

  // CTG Fitness & Multitasking
  ctgProfile: CtgProfile;
  updateCtgProfile: (patch: Partial<CtgProfile>) => void;
  bodyPoints: BodyPoint[];
  addBodyPoint: (point: Omit<BodyPoint, 'id' | 'createdAt'>) => BodyPoint;
  updateBodyPoint: (id: string, patch: Partial<BodyPoint>) => void;
  deleteBodyPoint: (id: string) => void;
  bodyPhotos: BodyCheckPhoto[];
  addBodyPhoto: (photo: Omit<BodyCheckPhoto, 'id' | 'createdAt'>) => BodyCheckPhoto;
  deleteBodyPhoto: (id: string) => void;
  savedRoadmaps: SavedRoadmap[];
  addSavedRoadmap: (roadmap: Omit<SavedRoadmap, 'id' | 'createdAt'>) => SavedRoadmap;
  deleteSavedRoadmap: (id: string) => void;
  ctgPeriodizedRoadmap: CtgPeriodizedRoadmap;
  updateCtgPeriodizedRoadmap: (roadmap: CtgPeriodizedRoadmap) => void;
  setActiveRoadmapPhase: (phaseId: string) => void;
  customExercises: Exercise[];
  addCustomExercise: (exercise: Omit<Exercise, 'id'>) => Exercise;
  deleteCustomExercise: (id: string) => void;
  applySplitTemplate: (template: RoutineSplitTemplate) => void;
  plannedSessions: PlannedSession[];
  addPlannedSession: (session: PlannedSession) => void;
  updatePlannedSession: (session: PlannedSession) => void;
  deletePlannedSession: (id: string) => void;
  workoutSessions: WorkoutSession[];
  logWorkoutSession: (session: Omit<WorkoutSession, 'id'>) => WorkoutSession;
  updateWorkoutSession: (session: WorkoutSession) => void;
  deleteWorkoutSession: (id: string) => void;
  sportSessions: SportSession[];
  addSportSession: (sport: Omit<SportSession, 'id' | 'createdAt'>) => SportSession;
  deleteSportSession: (id: string) => void;
  meals: MealLog[];
  addMealLog: (meal: Omit<MealLog, 'id' | 'createdAt'>) => MealLog;
  updateMealLog: (id: string, patch: Partial<MealLog>) => void;
  deleteMealLog: (id: string) => void;
  nutritionSettings: NutritionSettings;
  updateNutritionSettings: (patch: Partial<NutritionSettings>) => void;

  /** Current data of every module, for a JSON backup. */
  snapshot: () => ProductivitySnapshotData;
  /** Replace every module with the contents of a validated backup. */
  restore: (data: ProductivitySnapshotData) => void;
  /** Restore every module back to its seed data (used by "Đặt lại"). */
  resetAll: () => void;
  /** Clear all user data to start 100% fresh for a new user account. */
  clearAll: (name?: string, email?: string) => void;
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
  const [habits, setHabits] = usePersistentState<HabitItem[]>(KEYS.habits, SEED_HABITS);

  // CTG Fitness States
  const [ctgProfile, setCtgProfile] = usePersistentState<CtgProfile>(KEYS.ctgProfile, SEED_CTG_PROFILE);
  const [bodyPoints, setBodyPoints] = usePersistentState<BodyPoint[]>(KEYS.bodyPoints, SEED_BODY_POINTS);
  const [plannedSessions, setPlannedSessions] = usePersistentState<PlannedSession[]>(
    KEYS.plannedSessions,
    SEED_PLANNED_SESSIONS
  );
  const [workoutSessions, setWorkoutSessions] = usePersistentState<WorkoutSession[]>(
    KEYS.workoutSessions,
    SEED_WORKOUT_SESSIONS
  );
  const [sportSessions, setSportSessions] = usePersistentState<SportSession[]>(
    KEYS.sportSessions,
    SEED_SPORTS
  );
  const [meals, setMeals] = usePersistentState<MealLog[]>(KEYS.meals, SEED_MEALS);
  const [nutritionSettings, setNutritionSettings] = usePersistentState<NutritionSettings>(
    KEYS.nutritionSettings,
    DEFAULT_NUTRITION_SETTINGS
  );
  const [bodyPhotos, setBodyPhotos] = usePersistentState<BodyCheckPhoto[]>(KEYS.bodyPhotos, []);
  const [savedRoadmaps, setSavedRoadmaps] = usePersistentState<SavedRoadmap[]>(KEYS.savedRoadmaps, []);
  const [ctgPeriodizedRoadmap, setCtgPeriodizedRoadmap] = usePersistentState<CtgPeriodizedRoadmap>(
    KEYS.ctgPeriodizedRoadmap,
    SEED_CTG_PERIODIZED_ROADMAP
  );
  const [customExercises, setCustomExercises] = usePersistentState<Exercise[]>(KEYS.customExercises, []);

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

  // --- Habits & Routines ----------------------------------------------------

  const addHabit = useCallback(
    (input: Omit<HabitItem, 'id' | 'createdAt' | 'completedDates'>) => {
      const habit: HabitItem = {
        ...input,
        id: uid('habit'),
        completedDates: [],
        createdAt: Date.now(),
      };
      setHabits((prev) => [habit, ...prev]);
      return habit;
    },
    [setHabits]
  );

  const toggleHabitDate = useCallback(
    (id: string, dateStr: string) => {
      setHabits((prev) =>
        prev.map((h) => {
          if (h.id !== id) return h;
          const has = h.completedDates.includes(dateStr);
          return {
            ...h,
            completedDates: has
              ? h.completedDates.filter((d) => d !== dateStr)
              : [...h.completedDates, dateStr],
          };
        })
      );
    },
    [setHabits]
  );

  const deleteHabit = useCallback(
    (id: string) => {
      setHabits((prev) => prev.filter((h) => h.id !== id));
    },
    [setHabits]
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

  const updateTransaction = useCallback(
    (id: string, patch: Partial<Transaction>) => {
      setTransactions((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...patch } : t))
      );
    },
    [setTransactions]
  );

  const deleteTransaction = useCallback(
    (id: string) => {
      setTransactions((prev) => prev.filter((t) => t.id !== id));
    },
    [setTransactions]
  );

  const clearAllTransactions = useCallback(() => {
    setTransactions([]);
  }, [setTransactions]);

  const updateBudget = useCallback(
    (patch: Partial<BudgetSettings>) => {
      setBudget((prev) => ({ ...prev, ...patch }));
    },
    [setBudget]
  );

  const setRealStartingBalance = useCallback(
    (realBalance: number, clearOldTransactions: boolean = false) => {
      if (clearOldTransactions) {
        setTransactions([]);
        setBudget((prev) => ({
          ...prev,
          initialBalance: realBalance,
        }));
      } else {
        const netTx = transactions.reduce(
          (acc, t) => acc + (t.type === 'income' ? t.amount : -t.amount),
          0
        );
        setBudget((prev) => ({
          ...prev,
          initialBalance: realBalance - netTx,
        }));
      }
    },
    [transactions, setBudget, setTransactions]
  );

  const adjustBalanceWithTransaction = useCallback(
    (targetBalance: number, note: string = 'Điều chỉnh số dư thực tế') => {
      const currentNet = transactions.reduce(
        (acc, t) => acc + (t.type === 'income' ? t.amount : -t.amount),
        0
      );
      const currentTotal = (budget.initialBalance || 0) + currentNet;
      const diff = targetBalance - currentTotal;
      if (diff === 0) return;

      const type: TransactionType = diff > 0 ? 'income' : 'expense';
      const amount = Math.abs(diff);
      const today = formatDateString(new Date());

      setTransactions((prev) => [
        {
          id: uid('tx'),
          title: note,
          amount,
          type,
          category: 'other',
          date: today,
          note: `Cân đối số dư lúc ${new Date().toLocaleTimeString('vi-VN')}`,
          createdAt: Date.now(),
        },
        ...prev,
      ]);
    },
    [budget.initialBalance, transactions, setTransactions]
  );

  const resetFinance = useCallback(
    (startingBalance: number = 0) => {
      setTransactions([]);
      setBudget((prev) => ({
        ...prev,
        initialBalance: startingBalance,
      }));
    },
    [setTransactions, setBudget]
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

  // --- CTG Fitness Handlers ------------------------------------------------

  const updateCtgProfile = useCallback(
    (patch: Partial<CtgProfile>) => {
      setCtgProfile((prev) => ({ ...prev, ...patch }));
    },
    [setCtgProfile]
  );

  const addBodyPoint = useCallback(
    (input: Omit<BodyPoint, 'id' | 'createdAt'>) => {
      const point: BodyPoint = {
        ...input,
        id: uid('point'),
        createdAt: Date.now(),
      };
      setBodyPoints((prev) => [...prev, point].sort((a, b) => a.date.localeCompare(b.date)));
      return point;
    },
    [setBodyPoints]
  );

  const deleteBodyPoint = useCallback(
    (id: string) => {
      setBodyPoints((prev) => prev.filter((p) => p.id !== id));
    },
    [setBodyPoints]
  );

  const updateBodyPoint = useCallback(
    (id: string, patch: Partial<BodyPoint>) => {
      setBodyPoints((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...patch } : p)).sort((a, b) => a.date.localeCompare(b.date))
      );
    },
    [setBodyPoints]
  );

  const addBodyPhoto = useCallback(
    (input: Omit<BodyCheckPhoto, 'id' | 'createdAt'>) => {
      const photo: BodyCheckPhoto = {
        ...input,
        id: uid('photo'),
        createdAt: Date.now(),
      };
      setBodyPhotos((prev) => [photo, ...prev]);
      return photo;
    },
    [setBodyPhotos]
  );

  const deleteBodyPhoto = useCallback(
    (id: string) => {
      setBodyPhotos((prev) => prev.filter((p) => p.id !== id));
    },
    [setBodyPhotos]
  );

  const addSavedRoadmap = useCallback(
    (input: Omit<SavedRoadmap, 'id' | 'createdAt'>) => {
      const rm: SavedRoadmap = {
        ...input,
        id: uid('rm'),
        createdAt: Date.now(),
      };
      setSavedRoadmaps((prev) => [rm, ...prev]);
      return rm;
    },
    [setSavedRoadmaps]
  );

  const deleteSavedRoadmap = useCallback(
    (id: string) => {
      setSavedRoadmaps((prev) => prev.filter((r) => r.id !== id));
    },
    [setSavedRoadmaps]
  );

  const updateCtgPeriodizedRoadmap = useCallback(
    (roadmap: CtgPeriodizedRoadmap) => {
      setCtgPeriodizedRoadmap(roadmap);
    },
    [setCtgPeriodizedRoadmap]
  );

  const setActiveRoadmapPhase = useCallback(
    (phaseId: string) => {
      setCtgPeriodizedRoadmap((prev) => ({
        ...prev,
        activePhaseId: phaseId,
        phases: prev.phases.map((p) => ({
          ...p,
          isCurrent: p.id === phaseId,
        })),
      }));
    },
    [setCtgPeriodizedRoadmap]
  );

  const addCustomExercise = useCallback(
    (input: Omit<Exercise, 'id'>) => {
      const ex: Exercise = {
        ...input,
        id: uid('custom-ex'),
        isCustom: true,
      };
      setCustomExercises((prev) => [...prev, ex]);
      return ex;
    },
    [setCustomExercises]
  );

  const deleteCustomExercise = useCallback(
    (id: string) => {
      setCustomExercises((prev) => prev.filter((e) => e.id !== id));
    },
    [setCustomExercises]
  );

  const applySplitTemplate = useCallback(
    (template: RoutineSplitTemplate) => {
      const sessions = generateSplitSessions(template);
      setPlannedSessions(sessions);
    },
    [setPlannedSessions]
  );

  const addPlannedSession = useCallback(
    (session: PlannedSession) => {
      setPlannedSessions((prev) => [...prev, session]);
    },
    [setPlannedSessions]
  );

  const updatePlannedSession = useCallback(
    (session: PlannedSession) => {
      setPlannedSessions((prev) => prev.map((s) => (s.id === session.id ? session : s)));
    },
    [setPlannedSessions]
  );

  const deletePlannedSession = useCallback(
    (id: string) => {
      setPlannedSessions((prev) => prev.filter((s) => s.id !== id));
    },
    [setPlannedSessions]
  );

  const logWorkoutSession = useCallback(
    (input: Omit<WorkoutSession, 'id'>) => {
      const session: WorkoutSession = {
        ...input,
        id: uid('ws'),
      };
      setWorkoutSessions((prev) => [session, ...prev]);
      return session;
    },
    [setWorkoutSessions]
  );

  const deleteWorkoutSession = useCallback(
    (id: string) => {
      setWorkoutSessions((prev) => prev.filter((s) => s.id !== id));
    },
    [setWorkoutSessions]
  );

  const updateWorkoutSession = useCallback(
    (session: WorkoutSession) => {
      setWorkoutSessions((prev) => prev.map((s) => (s.id === session.id ? session : s)));
    },
    [setWorkoutSessions]
  );

  const addSportSession = useCallback(
    (input: Omit<SportSession, 'id' | 'createdAt'>) => {
      const sport: SportSession = {
        ...input,
        id: uid('sport'),
        createdAt: Date.now(),
      };
      setSportSessions((prev) => [sport, ...prev]);
      return sport;
    },
    [setSportSessions]
  );

  const deleteSportSession = useCallback(
    (id: string) => {
      setSportSessions((prev) => prev.filter((s) => s.id !== id));
    },
    [setSportSessions]
  );

  const addMealLog = useCallback(
    (input: Omit<MealLog, 'id' | 'createdAt'>) => {
      const meal: MealLog = {
        ...input,
        id: uid('meal'),
        createdAt: Date.now(),
      };
      setMeals((prev) => [meal, ...prev]);
      return meal;
    },
    [setMeals]
  );

  const deleteMealLog = useCallback(
    (id: string) => {
      setMeals((prev) => prev.filter((m) => m.id !== id));
    },
    [setMeals]
  );

  const updateMealLog = useCallback(
    (id: string, patch: Partial<MealLog>) => {
      setMeals((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
    },
    [setMeals]
  );

  const updateNutritionSettings = useCallback(
    (patch: Partial<NutritionSettings>) => {
      setNutritionSettings((prev) => ({ ...prev, ...patch }));
    },
    [setNutritionSettings]
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
      habits,
      ctgProfile,
      bodyPoints,
      plannedSessions,
      workoutSessions,
      sportSessions,
      meals,
      nutritionSettings,
    }),
    [
      tasks,
      goals,
      sessions,
      transactions,
      budget,
      healthLogs,
      workouts,
      wellness,
      healthProfile,
      habits,
      ctgProfile,
      bodyPoints,
      plannedSessions,
      workoutSessions,
      sportSessions,
      meals,
      nutritionSettings,
    ]
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
      if (data.habits) setHabits(data.habits);
      if (data.ctgProfile) setCtgProfile(data.ctgProfile);
      if (data.bodyPoints) setBodyPoints(data.bodyPoints);
      if (data.plannedSessions) setPlannedSessions(data.plannedSessions);
      if (data.workoutSessions) setWorkoutSessions(data.workoutSessions);
      if (data.sportSessions) setSportSessions(data.sportSessions);
      if (data.meals) setMeals(data.meals);
      if (data.nutritionSettings) setNutritionSettings(data.nutritionSettings);
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
      setHabits,
      setCtgProfile,
      setBodyPoints,
      setPlannedSessions,
      setWorkoutSessions,
      setSportSessions,
      setMeals,
      setNutritionSettings,
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
    setHabits(SEED_HABITS);
    setCtgProfile(SEED_CTG_PROFILE);
    setBodyPoints(SEED_BODY_POINTS);
    setPlannedSessions(SEED_PLANNED_SESSIONS);
    setWorkoutSessions(SEED_WORKOUT_SESSIONS);
    setSportSessions(SEED_SPORTS);
    setMeals(SEED_MEALS);
    setNutritionSettings(DEFAULT_NUTRITION_SETTINGS);
    setBodyPhotos([]);
    setSavedRoadmaps([]);
    setCtgPeriodizedRoadmap(SEED_CTG_PERIODIZED_ROADMAP);
    setCustomExercises([]);
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
    setHabits,
    setCtgProfile,
    setBodyPoints,
    setPlannedSessions,
    setWorkoutSessions,
    setSportSessions,
    setMeals,
    setNutritionSettings,
    setBodyPhotos,
    setSavedRoadmaps,
    setCtgPeriodizedRoadmap,
    setCustomExercises,
  ]);

  const clearAll = useCallback(
    (name?: string, email?: string) => {
      setTasks([]);
      setGoals([]);
      setSessions([]);
      setTransactions([]);
      setBudget(DEFAULT_BUDGET);
      setHealthLogs([]);
      setWorkouts([]);
      setWellness([]);
      setHealthProfile(DEFAULT_HEALTH_PROFILE);
      setHabits([]);
      setCtgProfile({
        ...SEED_CTG_PROFILE,
        name: name?.trim() || 'Người dùng mới',
        email: email?.trim() || undefined,
      });
      setBodyPoints([]);
      setPlannedSessions([]);
      setWorkoutSessions([]);
      setSportSessions([]);
      setMeals([]);
      setNutritionSettings(DEFAULT_NUTRITION_SETTINGS);
      setBodyPhotos([]);
      setSavedRoadmaps([]);
      setCtgPeriodizedRoadmap(SEED_CTG_PERIODIZED_ROADMAP);
      setCustomExercises([]);
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
      setHabits,
      setCtgProfile,
      setBodyPoints,
      setPlannedSessions,
      setWorkoutSessions,
      setSportSessions,
      setMeals,
      setNutritionSettings,
      setBodyPhotos,
      setSavedRoadmaps,
      setCtgPeriodizedRoadmap,
      setCustomExercises,
    ]
  );

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
    habits,
    addHabit,
    toggleHabitDate,
    deleteHabit,
    sessions,
    addSession,
    deleteSession,
    transactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    clearAllTransactions,
    setRealStartingBalance,
    adjustBalanceWithTransaction,
    resetFinance,
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
    // CTG Fitness
    ctgProfile,
    updateCtgProfile,
    bodyPoints,
    addBodyPoint,
    updateBodyPoint,
    deleteBodyPoint,
    bodyPhotos,
    addBodyPhoto,
    deleteBodyPhoto,
    savedRoadmaps,
    addSavedRoadmap,
    deleteSavedRoadmap,
    ctgPeriodizedRoadmap,
    updateCtgPeriodizedRoadmap,
    setActiveRoadmapPhase,
    customExercises,
    addCustomExercise,
    deleteCustomExercise,
    applySplitTemplate,
    plannedSessions,
    addPlannedSession,
    updatePlannedSession,
    deletePlannedSession,
    workoutSessions,
    logWorkoutSession,
    updateWorkoutSession,
    deleteWorkoutSession,
    sportSessions,
    addSportSession,
    deleteSportSession,
    meals,
    addMealLog,
    updateMealLog,
    deleteMealLog,
    nutritionSettings,
    updateNutritionSettings,
    snapshot,
    restore,
    resetAll,
    clearAll,
  };
}

/** Today's date as YYYY-MM-DD, exposed so views share one definition. */
export const todayString = () => formatDateString(new Date());

export type { FinanceCategoryId };
