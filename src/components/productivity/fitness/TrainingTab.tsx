import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Dumbbell,
  Calendar,
  Flame,
  CheckCircle2,
  Clock,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Plus,
  Trash2,
  Sparkles,
  Award,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  X,
  Check,
  Zap,
  History,
  Minus,
  Calculator,
  Compass,
  Target,
} from 'lucide-react';
import {
  CtgPeriodizedRoadmap,
  CtgRoadmapPhase,
  Exercise,
  HealthDayLog,
  MUSCLE_COLOR,
  MUSCLE_LABEL,
  MuscleGroup,
  PlannedSession,
  RoutineSplitTemplate,
  SPORT_LABEL,
  SportSession,
  SportType,
  WorkoutSession,
} from '../../../types/productivity';
import {
  EXERCISES,
  calculate1RM,
  calculateBarbellPlates,
  calculateProgressiveOverload,
  exerciseById,
  gymCalories,
  personalRecords,
  setVolume,
  setsByMuscle,
  sportCalories,
  todayString,
  weeklyVolume,
} from '../../../utils/fitnessMetrics';
import { notifySuccess } from '../../../utils/notify';
import { BarChart, ProgressBar } from '../../charts/SimpleCharts';

interface TrainingTabProps {
  plannedSessions: PlannedSession[];
  workoutSessions: WorkoutSession[];
  sportSessions: SportSession[];
  userWeightKg: number;
  customExercises?: Exercise[];
  onAddCustomExercise?: (exercise: Omit<Exercise, 'id'>) => Exercise;
  onDeleteCustomExercise?: (id: string) => void;
  onApplySplitTemplate?: (template: RoutineSplitTemplate) => void;
  lang: 'vi' | 'en';
  onLogWorkoutSession: (w: Omit<WorkoutSession, 'id'>) => WorkoutSession;
  onUpdateWorkoutSession?: (session: WorkoutSession) => void;
  onDeleteWorkoutSession: (id: string) => void;
  onAddSportSession: (s: Omit<SportSession, 'id' | 'createdAt'>) => SportSession;
  onDeleteSportSession: (id: string) => void;
  onAddPlannedSession?: (session: PlannedSession) => void;
  onUpdatePlannedSession?: (session: PlannedSession) => void;
  onDeletePlannedSession?: (id: string) => void;
  onScheduleSessionToCalendar?: (title: string, date: string, color: string) => void;
  onUpsertHealthLog?: (log: HealthDayLog) => void;
  healthLogs?: HealthDayLog[];
  ctgPeriodizedRoadmap?: CtgPeriodizedRoadmap | null;
}

const SPORT_OPTIONS: SportType[] = [
  'running',
  'cycling',
  'swimming',
  'football',
  'badminton',
  'basketball',
  'tennis',
  'other',
];

export const TrainingTab: React.FC<TrainingTabProps> = ({
  plannedSessions,
  workoutSessions,
  sportSessions,
  userWeightKg,
  customExercises = [],
  onAddCustomExercise,
  onDeleteCustomExercise,
  onApplySplitTemplate,
  lang,
  onLogWorkoutSession,
  onUpdateWorkoutSession,
  onDeleteWorkoutSession,
  onAddSportSession,
  onDeleteSportSession,
  onAddPlannedSession,
  onUpdatePlannedSession,
  onDeletePlannedSession,
  onScheduleSessionToCalendar,
  onUpsertHealthLog,
  healthLogs,
  ctgPeriodizedRoadmap,
}) => {
  const [scheduledBanner, setScheduledBanner] = useState<string | null>(null);
  const [showSportModal, setShowSportModal] = useState(false);
  const [showLibraryModal, setShowLibraryModal] = useState(false);
  const [exerciseSearch, setExerciseSearch] = useState('');

  // 1RM & Barbell Plate Calculator states
  const [showCalculatorModal, setShowCalculatorModal] = useState(false);
  const [calcTab, setCalcTab] = useState<'1rm' | 'plates'>('1rm');
  const [oneRmWeight, setOneRmWeight] = useState('80');
  const [oneRmReps, setOneRmReps] = useState('6');
  const [plateTargetTotal, setPlateTargetTotal] = useState('90');
  const [plateBarWeight, setPlateBarWeight] = useState('20');

  const oneRmResult = useMemo(() => {
    return calculate1RM(Number(oneRmWeight) || 0, Number(oneRmReps) || 0);
  }, [oneRmWeight, oneRmReps]);

  const plateResult = useMemo(() => {
    return calculateBarbellPlates(Number(plateTargetTotal) || 0, Number(plateBarWeight) || 20);
  }, [plateTargetTotal, plateBarWeight]);

  // Sport form state
  const [sportType, setSportType] = useState<SportType>('running');
  const [sportDuration, setSportDuration] = useState('30');
  const [sportDate, setSportDate] = useState(() => todayString());
  const [sportNote, setSportNote] = useState('');

  // Workout Days Calendar & Manual Logger State
  const [calendarMonth, setCalendarMonth] = useState(() => todayString().slice(0, 7)); // YYYY-MM
  const [selectedDayFilter, setSelectedDayFilter] = useState<string | null>(null);
  const [showLogPastWorkoutModal, setShowLogPastWorkoutModal] = useState(false);
  const [pastDate, setPastDate] = useState(() => todayString());
  const [pastTitle, setPastTitle] = useState('Buổi tập thể hình');
  const [pastDuration, setPastDuration] = useState('50');
  const [pastBurnedKcal, setPastBurnedKcal] = useState('260');
  const [pastNotes, setPastNotes] = useState('');

  // Active workout session tracker
  interface ActiveSessionState {
    planned: PlannedSession;
    startedAt: number;
    prescriptions: PlannedSession['prescriptions'];
    sets: Record<string, { weightKg: number; reps: number; completed: boolean }>;
  }
  const [activeSession, setActiveSession] = useState<ActiveSessionState | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [restSecondsLeft, setRestSecondsLeft] = useState<number | null>(null);
  const [restTotal, setRestTotal] = useState(90);
  const [autoScheduleOnFinish, setAutoScheduleOnFinish] = useState(true);
  const [extraExerciseId, setExtraExerciseId] = useState('');

  // CTG Active Phase
  const ctgActivePhase = useMemo(() => {
    if (!ctgPeriodizedRoadmap || !ctgPeriodizedRoadmap.phases?.length) return null;
    if (ctgPeriodizedRoadmap.activePhaseId && ctgPeriodizedRoadmap.activePhaseId !== 'none') {
      const found = ctgPeriodizedRoadmap.phases.find((p) => p.id === ctgPeriodizedRoadmap.activePhaseId);
      if (found) return found;
    }
    const current = ctgPeriodizedRoadmap.phases.find((p) => p.isCurrent);
    return current || ctgPeriodizedRoadmap.phases[0] || null;
  }, [ctgPeriodizedRoadmap]);

  // Combined Exercises & Lookup
  const allExercises = useMemo(() => [...EXERCISES, ...customExercises], [customExercises]);
  const getExercise = useCallback((id: string) => exerciseById(id, customExercises), [customExercises]);

  // Custom Exercise Modal state
  const [showAddExerciseModal, setShowAddExerciseModal] = useState(false);
  const [newExName, setNewExName] = useState('');
  const [newExMuscle, setNewExMuscle] = useState<MuscleGroup>('chest');
  const [newExEquipment, setNewExEquipment] = useState('Dumbbell');
  const [newExCue, setNewExCue] = useState('');

  // Active Split Template
  const [currentSplit, setCurrentSplit] = useState<RoutineSplitTemplate>('upper_lower');

  // Workout History details state
  const [expandedWorkoutId, setExpandedWorkoutId] = useState<string | null>(null);

  // Custom Plan Creation Modal state
  const [showAddPlanModal, setShowAddPlanModal] = useState(false);
  const [planTitle, setPlanTitle] = useState('');
  const [planDayOfWeek, setPlanDayOfWeek] = useState('Thứ 2');
  const [planPrescriptions, setPlanPrescriptions] = useState<
    Array<{ exerciseId: string; sets: number; reps: string; rpe: number; restSeconds: number }>
  >([
    { exerciseId: 'bench-press', sets: 4, reps: '8-10', rpe: 8, restSeconds: 90 },
    { exerciseId: 'incline-dumbbell-press', sets: 3, reps: '10-12', rpe: 8, restSeconds: 75 },
  ]);

  const prs = personalRecords(workoutSessions);

  // Web Audio chime for rest timer completion
  const playBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {}
  };

  // Active session timers
  useEffect(() => {
    if (!activeSession) {
      setElapsedSeconds(0);
      return;
    }
    const interval = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [activeSession]);

  useEffect(() => {
    if (restSecondsLeft === null || restSecondsLeft <= 0) return;
    const interval = setInterval(() => {
      setRestSecondsLeft((prev) => {
        if (prev === null || prev <= 1) {
          playBeep();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [restSecondsLeft]);

  const handleStartActiveSession = (session: PlannedSession) => {
    const initialSets: Record<string, { weightKg: number; reps: number; completed: boolean }> = {};
    session.prescriptions.forEach((p) => {
      const lastPr = prs[p.exerciseId]?.weightKg || 40;
      const defaultReps = parseInt(p.reps) || 10;
      for (let i = 0; i < p.sets; i++) {
        initialSets[`${p.exerciseId}-${i}`] = {
          weightKg: lastPr,
          reps: defaultReps,
          completed: false,
        };
      }
    });
    setActiveSession({
      planned: session,
      prescriptions: [...session.prescriptions],
      startedAt: Date.now(),
      sets: initialSets,
    });
    setElapsedSeconds(0);
    setRestSecondsLeft(null);
  };

  const handleAddSetToExercise = (exerciseId: string) => {
    if (!activeSession) return;
    const existingKeys = Object.keys(activeSession.sets).filter((k) => k.startsWith(`${exerciseId}-`));
    const newIndex = existingKeys.length;
    const lastKey = `${exerciseId}-${newIndex - 1}`;
    const fallbackWeight = prs[exerciseId]?.weightKg || 40;
    const weightKg = activeSession.sets[lastKey]?.weightKg ?? fallbackWeight;
    const reps = activeSession.sets[lastKey]?.reps ?? 10;

    const nextPrescriptions = activeSession.prescriptions.map((p) =>
      p.exerciseId === exerciseId ? { ...p, sets: p.sets + 1 } : p
    );

    setActiveSession({
      ...activeSession,
      prescriptions: nextPrescriptions,
      sets: {
        ...activeSession.sets,
        [`${exerciseId}-${newIndex}`]: {
          weightKg,
          reps,
          completed: false,
        },
      },
    });
  };

  const handleRemoveSetFromExercise = (exerciseId: string, setIndex: number) => {
    if (!activeSession) return;
    const keyToRemove = `${exerciseId}-${setIndex}`;
    const nextSets = { ...activeSession.sets };
    delete nextSets[keyToRemove];

    const nextPrescriptions = activeSession.prescriptions.map((p) =>
      p.exerciseId === exerciseId ? { ...p, sets: Math.max(1, p.sets - 1) } : p
    );

    setActiveSession({
      ...activeSession,
      prescriptions: nextPrescriptions,
      sets: nextSets,
    });
  };

  const handleAddExerciseToActiveSession = (exerciseId: string) => {
    if (!activeSession || !exerciseId) return;
    if (activeSession.prescriptions.some((p) => p.exerciseId === exerciseId)) return;
    const defaultSets = 3;
    const defaultReps = 10;
    const lastPr = prs[exerciseId]?.weightKg || 40;
    const newSets: Record<string, { weightKg: number; reps: number; completed: boolean }> = { ...activeSession.sets };
    for (let i = 0; i < defaultSets; i++) {
      newSets[`${exerciseId}-${i}`] = {
        weightKg: lastPr,
        reps: defaultReps,
        completed: false,
      };
    }
    setActiveSession({
      ...activeSession,
      prescriptions: [
        ...activeSession.prescriptions,
        { exerciseId, sets: defaultSets, reps: '10', rpe: 8, restSeconds: 90 },
      ],
      sets: newSets,
    });
    setExtraExerciseId('');
  };

  const handleUpdateSet = (exerciseId: string, setIndex: number, weightKg: number, reps: number) => {
    if (!activeSession) return;
    const key = `${exerciseId}-${setIndex}`;
    setActiveSession({
      ...activeSession,
      sets: {
        ...activeSession.sets,
        [key]: {
          ...(activeSession.sets[key] || { completed: false }),
          weightKg,
          reps,
        },
      },
    });
  };

  const handleToggleSet = (exerciseId: string, setIndex: number, restSeconds: number) => {
    if (!activeSession) return;
    const key = `${exerciseId}-${setIndex}`;
    const cur = activeSession.sets[key];
    const willBeCompleted = !cur?.completed;

    setActiveSession({
      ...activeSession,
      sets: {
        ...activeSession.sets,
        [key]: {
          ...cur,
          completed: willBeCompleted,
        },
      },
    });

    if (willBeCompleted) {
      setRestTotal(restSeconds || 90);
      setRestSecondsLeft(restSeconds || 90);
    }
  };

  const handleCopyPrevSet = (exerciseId: string, setIndex: number) => {
    if (!activeSession || setIndex <= 0) return;
    const prevKey = `${exerciseId}-${setIndex - 1}`;
    const prev = activeSession.sets[prevKey];
    if (prev) {
      handleUpdateSet(exerciseId, setIndex, prev.weightKg, prev.reps);
    }
  };

  const handleApplyQuickScale = (exerciseId: string, setIndex: number, factor: number) => {
    if (!activeSession) return;
    const key = `${exerciseId}-${setIndex}`;
    const cur = activeSession.sets[key];
    const baseWeight = cur?.weightKg || 40;
    const newWeight = Math.max(2.5, Math.round((baseWeight * factor) * 2) / 2);
    handleUpdateSet(exerciseId, setIndex, newWeight, cur?.reps || 10);
  };

  const handleFinishActiveSession = () => {
    if (!activeSession) return;
    const today = todayString();
    const sets = Object.entries(activeSession.sets)
      .filter(([_, s]) => s.completed)
      .map(([key, s], idx) => {
        const [exerciseId, setIdx] = key.split('-');
        return {
          id: `s-${Date.now()}-${idx}`,
          exerciseId,
          setIndex: parseInt(setIdx) || 0,
          weightKg: s.weightKg,
          reps: s.reps,
          rpe: 8,
        };
      });

    const burnedKcal = activeWorkoutStats.kcal || 250;

    onLogWorkoutSession({
      date: today,
      sessionId: activeSession.planned.id,
      title: activeSession.planned.title,
      startedAt: activeSession.startedAt,
      finishedAt: Date.now(),
      sets: sets.length > 0 ? sets : activeSession.prescriptions.flatMap((p, pIdx) =>
        Array.from({ length: p.sets }, (_, sIdx) => ({
          id: `s-${Date.now()}-${pIdx}-${sIdx}`,
          exerciseId: p.exerciseId,
          setIndex: sIdx,
          weightKg: 40,
          reps: 10,
          rpe: p.rpe,
        }))
      ),
      note: `Tập trực tiếp với đồng hồ nghỉ: ${Math.round(elapsedSeconds / 60)} phút, hoàn thành ${sets.length} hiệp, đốt ~${burnedKcal} kcal.`,
    });

    // Auto-sync burned calories to Health Day Log
    if (onUpsertHealthLog) {
      const existing = (healthLogs || []).find((l) => l.date === today);
      const prevBurn = existing?.caloriesBurned || 0;
      onUpsertHealthLog({
        ...(existing || { date: today, source: 'manual' }),
        caloriesBurned: prevBurn + burnedKcal,
        date: today,
        source: 'manual',
      });
    }

    if (autoScheduleOnFinish && onScheduleSessionToCalendar) {
      onScheduleSessionToCalendar(activeSession.planned.title, today, '#2563EB');
    }

    setActiveSession(null);
    setRestSecondsLeft(null);
    setScheduledBanner(`Xuất sắc! Đã hoàn thành buổi tập "${activeSession.planned.title}" (+${burnedKcal} kcal tiêu hao)!`);
    setTimeout(() => setScheduledBanner(null), 4000);
    notifySuccess('Xuất sắc! Hoàn thành buổi tập!', `Đã hoàn thành "${activeSession.planned.title}" (+${burnedKcal} kcal tiêu hao)!`);
  };

  const activeWorkoutStats = useMemo(() => {
    if (!activeSession) return { volumeKg: 0, kcal: 0, completedCount: 0, totalCount: 0 };
    const completedSets = Object.values(activeSession.sets).filter((s) => s.completed);
    const volumeKg = completedSets.reduce((sum, s) => sum + s.weightKg * s.reps, 0);
    const setLogs = completedSets.map((s, idx) => ({
      id: `s-${idx}`,
      exerciseId: 'bench-press',
      setIndex: idx,
      weightKg: s.weightKg,
      reps: s.reps,
    }));
    const kcal = gymCalories(setLogs, userWeightKg);
    return {
      volumeKg,
      kcal,
      completedCount: completedSets.length,
      totalCount: Object.keys(activeSession.sets).length,
    };
  }, [activeSession, userWeightKg]);

  const volumeData = useMemo(() => {
    const raw = weeklyVolume(workoutSessions, 4, todayString());
    return raw.map((r, i) => ({
      label: `T${i + 1} (${r.weekStart.slice(5)})`,
      value: r.volume,
      color: i === raw.length - 1 ? '#2563EB' : '#2f86e8',
    }));
  }, [workoutSessions]);

  const muscleSets = useMemo(() => {
    return setsByMuscle(workoutSessions, allExercises);
  }, [workoutSessions, allExercises]);

  const monthCalendarData = useMemo(() => {
    const [yStr, mStr] = calendarMonth.split('-');
    const year = Number(yStr);
    const month = Number(mStr);
    const firstDayOfWeek = new Date(year, month - 1, 1).getDay(); // 0 is Sunday
    const daysInMonth = new Date(year, month, 0).getDate();

    const workoutByDate = new Map<string, WorkoutSession[]>();
    workoutSessions.forEach((w) => {
      const arr = workoutByDate.get(w.date) || [];
      arr.push(w);
      workoutByDate.set(w.date, arr);
    });

    const sportByDate = new Map<string, SportSession[]>();
    sportSessions.forEach((s) => {
      const arr = sportByDate.get(s.date) || [];
      arr.push(s);
      sportByDate.set(s.date, arr);
    });

    const days = [];
    const startOffset = (firstDayOfWeek + 6) % 7; // Monday as 0
    for (let i = 0; i < startOffset; i++) {
      days.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dStr = `${calendarMonth}-${String(d).padStart(2, '0')}`;
      const ws = workoutByDate.get(dStr) || [];
      const ss = sportByDate.get(dStr) || [];
      days.push({
        dayNumber: d,
        dateStr: dStr,
        hasWorkout: ws.length > 0,
        hasSport: ss.length > 0,
        workouts: ws,
        sports: ss,
        isToday: dStr === todayString(),
      });
    }

    const totalTrainedDaysInMonth = days.filter((d) => d && (d.hasWorkout || d.hasSport)).length;

    return {
      year,
      month,
      days,
      daysInMonth,
      totalTrainedDaysInMonth,
      monthLabel: `Tháng ${month}/${year}`,
    };
  }, [calendarMonth, workoutSessions, sportSessions]);

  const workoutStreak = useMemo(() => {
    const dateSet = new Set([
      ...workoutSessions.map((w) => w.date),
      ...sportSessions.map((s) => s.date),
    ]);
    let streak = 0;
    const d = new Date();
    const today = todayString();
    if (!dateSet.has(today)) {
      d.setDate(d.getDate() - 1);
    }
    while (dateSet.has(d.toISOString().slice(0, 10))) {
      streak++;
      d.setDate(d.getDate() - 1);
    }
    return streak;
  }, [workoutSessions, sportSessions]);

  const handleShiftCalendarMonth = (delta: number) => {
    const [yStr, mStr] = calendarMonth.split('-');
    const d = new Date(Number(yStr), Number(mStr) - 1 + delta, 1);
    const newMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    setCalendarMonth(newMonth);
  };

  const handleSavePastWorkout = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pastTitle.trim() || !pastDate) return;

    const burnedKcal = Number(pastBurnedKcal) || 220;
    const sets = [
      {
        id: `s-${Date.now()}-1`,
        exerciseId: 'bench-press',
        setIndex: 0,
        weightKg: 50,
        reps: 10,
      },
    ];

    onLogWorkoutSession({
      date: pastDate,
      title: pastTitle.trim(),
      startedAt: Date.now() - (Number(pastDuration) || 50) * 60_000,
      finishedAt: Date.now(),
      sets,
      note: pastNotes.trim() || `Tập ${pastDuration} phút, đốt ~${burnedKcal} kcal.`,
    });

    if (onUpsertHealthLog) {
      const existing = (healthLogs || []).find((l) => l.date === pastDate);
      const prevBurn = existing?.caloriesBurned || 0;
      onUpsertHealthLog({
        ...(existing || { date: pastDate, source: 'manual' }),
        caloriesBurned: prevBurn + burnedKcal,
        date: pastDate,
        source: 'manual',
      });
    }

    setShowLogPastWorkoutModal(false);
    setScheduledBanner(`Đã ghi nhận buổi tập "${pastTitle.trim()}" cho ngày ${pastDate} (+${burnedKcal} kcal)!`);
    setTimeout(() => setScheduledBanner(null), 4000);
    notifySuccess('Đã lưu buổi tập!', `Đã ghi nhận "${pastTitle.trim()}" cho ngày ${pastDate} (+${burnedKcal} kcal)!`);
  };

  const handleSchedule = (session: PlannedSession) => {
    const today = todayString();
    if (onScheduleSessionToCalendar) {
      onScheduleSessionToCalendar(session.title, today, '#2563EB');
    }
    setScheduledBanner(`Đã lên lịch "${session.title}" vào Google Calendar hôm nay (${today})!`);
    setTimeout(() => setScheduledBanner(null), 4000);
    notifySuccess('Đã lên lịch Google Calendar!', `Đã lên lịch "${session.title}" vào ngày ${today}.`);
  };

  const handleScheduleFullWeek = () => {
    if (!onScheduleSessionToCalendar || plannedSessions.length === 0) return;
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));

    plannedSessions.forEach((session, idx) => {
      const sessionDate = new Date(monday);
      const dayOffset = session.dayIndex !== undefined ? session.dayIndex : idx;
      sessionDate.setDate(monday.getDate() + dayOffset);
      const dateStr = sessionDate.toISOString().slice(0, 10);
      onScheduleSessionToCalendar(session.title, dateStr, '#2563EB');
    });

    setScheduledBanner(`Đã đồng bộ toàn bộ ${plannedSessions.length} buổi tập tuần này lên Lịch tuần!`);
    setTimeout(() => setScheduledBanner(null), 5000);
  };

  const handleSaveCustomExercise = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExName.trim()) return;
    onAddCustomExercise?.({
      name: newExName.trim(),
      muscle: newExMuscle,
      equipment: newExEquipment.trim() || 'Tự do',
      cue: newExCue.trim() || 'Tập trung cảm nhận cơ bắp',
      isCustom: true,
    });
    setScheduledBanner(`Đã thêm bài tập ngoài "${newExName.trim()}" vào thư viện!`);
    setTimeout(() => setScheduledBanner(null), 4000);
    setShowAddExerciseModal(false);
    setNewExName('');
    setNewExCue('');
  };

  const handleQuickLog = (session: PlannedSession) => {
    const today = todayString();
    const sets = session.prescriptions.flatMap((p, pIdx) =>
      Array.from({ length: p.sets }, (_, sIdx) => ({
        id: `s-${Date.now()}-${pIdx}-${sIdx}`,
        exerciseId: p.exerciseId,
        setIndex: sIdx,
        weightKg: 50,
        reps: 10,
        rpe: p.rpe,
      }))
    );

    const burnedKcal = gymCalories(sets, userWeightKg) || 220;

    onLogWorkoutSession({
      date: today,
      sessionId: session.id,
      title: session.title,
      startedAt: Date.now() - 60 * 60_000,
      finishedAt: Date.now(),
      sets,
      note: 'Hoàn thành theo giáo án thể hình cá nhân.',
    });

    if (onUpsertHealthLog) {
      const existing = (healthLogs || []).find((l) => l.date === today);
      const prevBurn = existing?.caloriesBurned || 0;
      onUpsertHealthLog({
        ...(existing || { date: today, source: 'manual' }),
        caloriesBurned: prevBurn + burnedKcal,
        date: today,
        source: 'manual',
      });
    }

    setScheduledBanner(`Đã ghi nhận hoàn thành buổi tập "${session.title}" (+${burnedKcal} kcal tiêu hao)!`);
    setTimeout(() => setScheduledBanner(null), 4000);
    notifySuccess('Hoàn thành buổi tập!', `Đã ghi nhận "${session.title}" (+${burnedKcal} kcal tiêu hao)!`);
  };

  const handleAddSport = (e: React.FormEvent) => {
    e.preventDefault();
    const dur = Number(sportDuration);
    if (!dur || dur <= 0) return;

    const burnedKcal = sportCalories({ type: sportType, durationMin: dur } as SportSession, userWeightKg) || 160;

    onAddSportSession({
      date: sportDate,
      type: sportType,
      durationMin: dur,
      note: sportNote.trim() || undefined,
    });

    if (onUpsertHealthLog) {
      const existing = (healthLogs || []).find((l) => l.date === sportDate);
      const prevBurn = existing?.caloriesBurned || 0;
      onUpsertHealthLog({
        ...(existing || { date: sportDate, source: 'manual' }),
        caloriesBurned: prevBurn + burnedKcal,
        date: sportDate,
        source: 'manual',
      });
    }

    setShowSportModal(false);
    setSportNote('');
    setScheduledBanner(`Đã thêm buổi "${SPORT_LABEL[sportType]}" (${dur} phút, +${burnedKcal} kcal)!`);
    setTimeout(() => setScheduledBanner(null), 4000);
    notifySuccess('Đã lưu tập luyện thể thao!', `Buổi tập "${SPORT_LABEL[sportType]}" (${dur} phút, +${burnedKcal} kcal) đã được lưu.`);
  };

  const filteredExercises = allExercises.filter(
    (e) =>
      e.name.toLowerCase().includes(exerciseSearch.toLowerCase()) ||
      MUSCLE_LABEL[e.muscle]?.toLowerCase().includes(exerciseSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* CTG Active Phase Training Guidance Card */}
      {ctgActivePhase && (
        <div className="bg-gradient-to-r from-blue-900/40 via-indigo-950/30 to-[#0b101b] border border-blue-500/40 rounded-2xl p-4 md:p-5 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 text-white">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-500/30 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Giai Đoạn CTG Hiện Tại
                </span>
                <span className="text-xs text-white/50 font-mono">
                  {ctgActivePhase.startDate} – {ctgActivePhase.endDate}
                </span>
                <span className="text-xs font-bold text-white">
                  · {ctgActivePhase.name} ({ctgActivePhase.phaseType === 'bulk' ? 'Tăng cơ' : ctgActivePhase.phaseType === 'minicut' ? 'Mini-cut' : 'Giảm mỡ'})
                </span>
              </div>
              <p className="text-xs text-blue-100/80 mt-1 leading-relaxed">
                {ctgActivePhase.phaseType === 'bulk' ? (
                  <span>
                    🏋️ <strong>Chiến lược Tăng cơ (Hypertrophy Wave):</strong> Tận dụng thặng dư calo để tối ưu hóa phì đại cơ bắp. Ưu tiên Progressive Overload (tăng tạ/reps mỗi tuần), giữ RPE 7-9 (1-3 reps dự trữ), ngủ đủ 7-8h mỗi đêm.
                  </span>
                ) : (
                  <span>
                    🔥 <strong>Chiến lược Giữ cơ trong Thâm hụt (Preserve Lean Mass):</strong> Duy trì cường độ tạ nặng (Heavy Lifting) để gửi tín hiệu bảo toàn cơ nạc, kiểm soát volume hợp lý (8-14 sets/nhóm cơ/tuần), tránh tập đến kiệt quệ hoàn toàn (RPE 8-8.5).
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
            {onApplySplitTemplate && (
              <button
                type="button"
                onClick={() => {
                  const suggested = ctgActivePhase.phaseType === 'bulk' ? 'ppl' : 'upper_lower';
                  onApplySplitTemplate(suggested);
                  setScheduledBanner(`Đã áp dụng giáo án tối ưu cho giai đoạn (${suggested.toUpperCase()})!`);
                  setTimeout(() => setScheduledBanner(null), 4000);
                }}
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs cursor-pointer shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Nạp Giáo Án Tối Ưu ({ctgActivePhase.phaseType === 'bulk' ? 'PPL' : 'Upper/Lower'})</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Top Banner */}
      <div className="bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-transparent dark:from-blue-950/30 dark:via-indigo-950/20 rounded-2xl border border-blue-200 dark:border-blue-900/50 p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-600 text-white">
              Giáo Án Kháng Lực Cá Nhân
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Phân chia Upper / Lower · 4 buổi/tuần
            </span>
          </div>
          <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-gray-100 mt-1">
            Lịch Tập &amp; Giáo Án Kháng Lực
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Tích hợp trực tiếp với Google Calendar: Lên lịch buổi tập chỉ với 1 click.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowCalculatorModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-orange-300 dark:border-orange-800/60 bg-orange-50/70 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300 text-xs font-semibold hover:bg-orange-100 dark:hover:bg-orange-900/40 cursor-pointer transition-colors shadow-2xs"
            title="Tính 1RM tối đa & Máy tính xếp bánh tạ đòn Olympic"
          >
            <Calculator className="w-4 h-4 text-orange-500" />
            <span>1RM &amp; Đĩa Tạ</span>
          </button>
          <button
            onClick={() => setShowLibraryModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-xs font-semibold hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
          >
            <BookOpen className="w-4 h-4 text-blue-500" />
            <span>Thư viện bài tập</span>
          </button>
          <button
            onClick={() => setShowSportModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm thể thao (MET)</span>
          </button>
        </div>
      </div>

      {/* Notification banner */}
      {scheduledBanner && (
        <div className="rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 p-3 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{scheduledBanner}</span>
        </div>
      )}

      {/* Routine Split Selector & Week Synchronizer */}
      <div className="bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-gray-100 dark:border-slate-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-orange-500" />
              <h3 className="text-xs font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                Chọn Lịch Tập &amp; Phân Chia Nhóm Cơ (Splits)
              </h3>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
              Chuyển đổi tức thì giữa các phân chia giáo án thể hình kinh điển hoặc tự tạo buổi tập riêng
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {onScheduleSessionToCalendar && (
              <button
                type="button"
                onClick={handleScheduleFullWeek}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs cursor-pointer transition-colors"
                title="Đồng bộ lịch các buổi tập tuần này vào Google Calendar"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Đồng bộ tuần lên Lịch</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowAddExerciseModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm Bài Ngoài</span>
            </button>
          </div>
        </div>

        {/* Preset Split Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          {[
            { id: 'ppl' as const, label: 'PPL (Push - Pull - Legs)', desc: '5 buổi: Đẩy / Kéo / Chân' },
            { id: 'upper_lower' as const, label: 'Upper / Lower (UL)', desc: '4 buổi: Thân Trên / Thân Dưới' },
            { id: 'arnold' as const, label: 'Arnold Split', desc: '6 buổi: Ngực+Lưng / Vai+Tay / Chân' },
            { id: 'fullbody' as const, label: 'Full Body', desc: '3 buổi: Toàn Thân A / B / C' },
            { id: 'glute_lower' as const, label: 'Glute & Lower Focus', desc: '4 buổi: Mông, Đùi Sau, Đùi Trước & Eo' },
          ].map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setCurrentSplit(s.id);
                onApplySplitTemplate?.(s.id);
                setScheduledBanner(`Đã tạo và nạp thành công lịch tập ${s.label}!`);
                setTimeout(() => setScheduledBanner(null), 4000);
              }}
              className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer shrink-0 text-left ${
                currentSplit === s.id
                  ? 'bg-orange-500 text-white border-orange-500 shadow-xs'
                  : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-slate-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700/60'
              }`}
            >
              <div className="font-bold">{s.label}</div>
              <div className="text-[10px] opacity-75">{s.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Mesocycle Planned Sessions Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider flex items-center gap-2">
            <Dumbbell className="w-4 h-4 text-orange-500" />
            Giáo Án Kháng Lực Đang Áp Dụng (Mesocycle)
          </h3>
          <button
            type="button"
            onClick={() => {
              setPlanTitle('');
              setPlanDayOfWeek('Thứ 2');
              setPlanPrescriptions([
                { exerciseId: 'bench-press', sets: 4, reps: '8-10', rpe: 8, restSeconds: 90 },
                { exerciseId: 'incline-dumbbell-press', sets: 3, reps: '10-12', rpe: 8, restSeconds: 75 },
              ]);
              setShowAddPlanModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold shadow-xs cursor-pointer transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tạo Giáo Án Mới</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {plannedSessions.map((session) => (
            <div
              key={session.id}
              className="bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-4 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                    <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                      {session.title}
                    </h4>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {session.dayOfWeek && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300">
                        {session.dayOfWeek}
                      </span>
                    )}
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                      {session.prescriptions.length} bài tập
                    </span>
                    {onDeletePlannedSession && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Bạn có chắc muốn xóa giáo án "${session.title}"?`)) {
                            onDeletePlannedSession(session.id);
                          }
                        }}
                        className="p-1 rounded-lg text-gray-300 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer ml-0.5 transition-colors"
                        title="Xóa giáo án này"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-2 my-3">
                  {session.prescriptions.map((pres, idx) => {
                    const ex = getExercise(pres.exerciseId);
                    const muscleLabel = ex ? MUSCLE_LABEL[ex.muscle as MuscleGroup] : 'Toàn thân';
                    const muscleColor = ex ? MUSCLE_COLOR[ex.muscle as MuscleGroup] : '#2563EB';

                    return (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-slate-800/80 flex items-center justify-between text-xs"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="flex items-center gap-1.5 font-semibold text-gray-800 dark:text-gray-200">
                            <span
                              className="text-[9px] px-1.5 py-0.2 rounded font-bold uppercase"
                              style={{ backgroundColor: `${muscleColor}22`, color: muscleColor }}
                            >
                              {muscleLabel}
                            </span>
                            <span className="truncate">{ex ? ex.name : pres.exerciseId}</span>
                            {pres.supersetId && (
                              <span className="text-[9px] px-1 rounded bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
                                Superset
                              </span>
                            )}
                          </div>
                          {ex && (
                            <div className="text-[10px] text-gray-400 italic truncate mt-0.5">
                              {ex.cue}
                            </div>
                          )}
                        </div>

                        <div className="text-right shrink-0">
                          <div className="font-bold text-gray-900 dark:text-gray-100">
                            {pres.sets} × {pres.reps}
                          </div>
                          <div className="text-[10px] text-gray-400">
                            RPE {pres.rpe} · Nghỉ {pres.restSeconds}s
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 border-t border-gray-100 dark:border-slate-800 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleStartActiveSession(session)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold shadow-xs cursor-pointer transition-colors"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Bắt Đầu Tập Ngay</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSchedule(session)}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-xs font-semibold hover:bg-blue-100 cursor-pointer transition-colors"
                  title="Lên lịch vào Google Calendar"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Lên lịch</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLog(session)}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold cursor-pointer transition-colors"
                  title="Ghi nhận hoàn thành buổi tập này cho ngày hôm nay"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Xong hôm nay</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Weekly Training Volume (Progressive Overload) & Muscle Sets Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Weekly Volume Bar Chart */}
        <div className="bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-xs font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Zap className="w-4 h-4 text-orange-500" />
                Khối Lượng Tập Luyện Tuần (Progressive Overload)
              </h3>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Tổng tải trọng nâng (kg) qua 4 tuần gần nhất
              </p>
            </div>
          </div>

          <BarChart
            data={volumeData}
            height={150}
            color="#2563EB"
            emptyLabel="Chưa có dữ liệu buổi tập nào."
            formatValue={(v) => `${(v / 1000).toFixed(1)} tấn`}
            highlightLast={1}
          />
        </div>

        {/* Muscle Balance Card */}
        <div className="bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Dumbbell className="w-4 h-4 text-indigo-500" />
              Cân Bằng Số Hiệp Theo Nhóm Cơ
            </h3>
            <span className="text-[10px] text-gray-400">
              Tổng {Object.values(muscleSets).reduce((a, b) => a + b, 0)} hiệp
            </span>
          </div>

          <div className="space-y-2.5">
            {[
              { id: 'chest', label: 'Ngực', color: '#2563EB' },
              { id: 'back', label: 'Lưng', color: '#2f86e8' },
              { id: 'legs', label: 'Chân', color: '#10b981' },
              { id: 'shoulders', label: 'Vai', color: '#c084fc' },
              { id: 'arms', label: 'Tay', color: '#f59e0b' },
              { id: 'core', label: 'Bụng', color: '#ec4899' },
            ].map((m) => {
              const setsCount = muscleSets[m.id] || 0;
              const maxSets = Math.max(...Object.values(muscleSets), 12);
              return (
                <div key={m.id} className="text-xs">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: m.color }} />
                      {m.label}
                    </span>
                    <span className="text-[11px] font-mono text-gray-500 dark:text-gray-400">
                      {setsCount} hiệp
                    </span>
                  </div>
                  <ProgressBar
                    percent={Math.round((setsCount / maxSets) * 100)}
                    color={m.color}
                    height={5}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Monthly Workout Calendar Tracker */}
      <div className="bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-500" />
            <div>
              <h3 className="text-xs font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider flex items-center gap-2">
                <span>Nhật Ký Ngày Tập &amp; Chuỗi Tập Luyện</span>
                {workoutStreak > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500 text-white shadow-2xs">
                    🔥 Streak {workoutStreak} ngày
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                Đã tập <strong>{monthCalendarData.totalTrainedDaysInMonth} ngày</strong> trong {monthCalendarData.monthLabel}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-gray-50 dark:bg-gray-800">
              <button
                type="button"
                onClick={() => handleShiftCalendarMonth(-1)}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 cursor-pointer"
                title="Tháng trước"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 text-xs font-bold text-gray-800 dark:text-gray-200 min-w-24 text-center">
                {monthCalendarData.monthLabel}
              </span>
              <button
                type="button"
                onClick={() => handleShiftCalendarMonth(1)}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 cursor-pointer"
                title="Tháng sau"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setPastDate(todayString());
                setShowLogPastWorkoutModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold shadow-xs cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Ghi ngày tập</span>
            </button>
          </div>
        </div>

        {/* Days of week header */}
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">
          <span>T2</span>
          <span>T3</span>
          <span>T4</span>
          <span>T5</span>
          <span>T6</span>
          <span>T7</span>
          <span className="text-orange-500">CN</span>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1.5">
          {monthCalendarData.days.map((day, idx) => {
            if (!day) {
              return <div key={`empty-${idx}`} className="h-14 rounded-xl bg-slate-50/40 dark:bg-slate-900/30" />;
            }
            const isSelected = selectedDayFilter === day.dateStr;
            const hasActivity = day.hasWorkout || day.hasSport;
            return (
              <div
                key={day.dateStr}
                onClick={() => setSelectedDayFilter(isSelected ? null : day.dateStr)}
                className={`h-14 p-1 rounded-xl border flex flex-col justify-between transition-all cursor-pointer ${
                  isSelected
                    ? 'border-blue-500 ring-2 ring-blue-500/30 bg-blue-50/50 dark:bg-blue-950/40'
                    : day.isToday
                    ? 'border-orange-400 bg-orange-50/30 dark:bg-orange-950/20'
                    : hasActivity
                    ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20'
                    : 'border-slate-200/70 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/40 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[11px] font-bold ${
                    day.isToday ? 'text-orange-600 dark:text-orange-400' : 'text-gray-700 dark:text-gray-300'
                  }`}>
                    {day.dayNumber}
                  </span>
                  {day.isToday && (
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {day.hasWorkout && (
                    <span className="px-1 py-0.2 rounded text-[8px] font-bold bg-blue-600 text-white flex items-center gap-0.5 truncate" title={`Gym: ${day.workouts.map(w => w.title).join(', ')}`}>
                      <Dumbbell className="w-2.5 h-2.5 shrink-0" />
                      <span className="truncate">{day.workouts[0]?.title || 'Gym'}</span>
                    </span>
                  )}
                  {day.hasSport && (
                    <span className="px-1 py-0.2 rounded text-[8px] font-bold bg-indigo-600 text-white flex items-center gap-0.5" title={`Thể thao: ${day.sports.map(s => SPORT_LABEL[s.type]).join(', ')}`}>
                      <Flame className="w-2.5 h-2.5 shrink-0" />
                      <span>{day.sports[0]?.durationMin}p</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {selectedDayFilter && (
          <div className="flex items-center justify-between p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs">
            <span className="font-semibold text-blue-800 dark:text-blue-200">
              Đang lọc theo ngày: <strong>{selectedDayFilter}</strong>
            </span>
            <button
              type="button"
              onClick={() => setSelectedDayFilter(null)}
              className="text-[11px] text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer"
            >
              Xem tất cả
            </button>
          </div>
        )}
      </div>

      {/* Workout Sessions History Card */}
      <div className="bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-orange-500" />
            <h3 className="text-xs font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
              Lịch Sử Buổi Tập Kháng Lực ({selectedDayFilter ? workoutSessions.filter(s => s.date === selectedDayFilter).length : workoutSessions.length})
            </h3>
          </div>
          <span className="text-[10px] text-gray-400">
            Chi tiết tải trọng &amp; từng hiệp đã hoàn thành
          </span>
        </div>

        {(selectedDayFilter ? workoutSessions.filter(s => s.date === selectedDayFilter) : workoutSessions).length === 0 ? (
          <div className="text-center py-6 text-gray-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
            <Dumbbell className="w-8 h-8 mx-auto mb-2 opacity-30 text-orange-500" />
            <p className="text-xs">Chưa có buổi tập kháng lực nào{selectedDayFilter ? ` vào ngày ${selectedDayFilter}` : ''}.</p>
            <p className="text-[11px] text-gray-400 mt-1">
              Hãy nhấn "Ghi ngày tập" hoặc "Bắt Đầu Tập Ngay" ở một giáo án bên trên để trải nghiệm tracking!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {(selectedDayFilter ? workoutSessions.filter(s => s.date === selectedDayFilter) : workoutSessions).map((session) => {
              const isExpanded = expandedWorkoutId === session.id;
              const totalSetsCount = session.sets.length;
              const sessionVolume = session.sets.reduce((sum, s) => sum + s.weightKg * s.reps, 0);
              const estKcal = gymCalories(session.sets, userWeightKg);
              const durationMin =
                session.finishedAt && session.startedAt
                  ? Math.round((session.finishedAt - session.startedAt) / 60000)
                  : 45;

              // Group sets by exercise
              const setsByEx: Record<string, typeof session.sets> = {};
              session.sets.forEach((st) => {
                if (!setsByEx[st.exerciseId]) setsByEx[st.exerciseId] = [];
                setsByEx[st.exerciseId].push(st);
              });

              return (
                <div
                  key={session.id}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-gray-50/60 dark:bg-gray-850/60 transition-all overflow-hidden"
                >
                  <div className="p-3.5 flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-orange-500" />
                        <span className="font-bold text-xs sm:text-sm text-gray-900 dark:text-gray-100">
                          {session.title}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                          {session.date}
                        </span>
                        {durationMin > 0 && (
                          <span className="text-[10px] text-gray-400">
                            ⏱ {durationMin} phút
                          </span>
                        )}
                      </div>
                      {session.note && (
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 italic mt-1">
                          {session.note}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 text-right">
                        <div className="px-2 py-1 rounded-lg bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900/40">
                          <div className="text-[9px] uppercase font-bold text-orange-600 dark:text-orange-400">Tải trọng</div>
                          <div className="text-xs font-bold text-gray-800 dark:text-gray-100 font-mono">
                            {sessionVolume.toLocaleString()} kg
                          </div>
                        </div>
                        <div className="px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40">
                          <div className="text-[9px] uppercase font-bold text-emerald-600 dark:text-emerald-400">Tổng hiệp</div>
                          <div className="text-xs font-bold text-gray-800 dark:text-gray-100 font-mono">
                            {totalSetsCount} hiệp
                          </div>
                        </div>
                        <div className="px-2 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40">
                          <div className="text-[9px] uppercase font-bold text-rose-600 dark:text-rose-400">Tiêu thụ</div>
                          <div className="text-xs font-bold text-gray-800 dark:text-gray-100 font-mono">
                            {estKcal} kcal
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setExpandedWorkoutId(isExpanded ? null : session.id)}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer flex items-center gap-1 text-xs"
                          title="Xem chi tiết các hiệp"
                        >
                          <span className="text-[11px] font-semibold hidden sm:inline">
                            {isExpanded ? 'Thu gọn' : 'Chi tiết'}
                          </span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Bạn có chắc muốn xóa buổi tập "${session.title}" ngày ${session.date}?`)) {
                              onDeleteWorkoutSession(session.id);
                            }
                          }}
                          className="p-1.5 rounded-lg text-gray-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer transition-colors"
                          title="Xóa buổi tập này"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Accordion: List of Sets by Exercise */}
                  {isExpanded && (
                    <div className="border-t border-slate-200 dark:border-slate-800 p-3.5 bg-white dark:bg-gray-900/70 space-y-3 animate-fadeIn">
                      <div className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">
                        Danh sách bài tập và thông số các hiệp:
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {Object.entries(setsByEx).map(([exId, setList]) => {
                          const ex = getExercise(exId);
                          const color = ex ? MUSCLE_COLOR[ex.muscle as MuscleGroup] : '#2563EB';
                          return (
                            <div
                              key={exId}
                              className="p-2.5 rounded-xl border border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-gray-800/40"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-1.5 font-bold text-xs text-gray-800 dark:text-gray-200">
                                  <span
                                    className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase"
                                    style={{ backgroundColor: `${color}22`, color }}
                                  >
                                    {ex ? MUSCLE_LABEL[ex.muscle as MuscleGroup] : 'Cơ'}
                                  </span>
                                  <span>{ex ? ex.name : exId}</span>
                                </div>
                                <span className="text-[10px] text-gray-400">
                                  {setList.length} hiệp
                                </span>
                              </div>

                              <div className="space-y-1">
                                {setList.map((st, sIdx) => (
                                  <div
                                    key={st.id || sIdx}
                                    className="flex items-center justify-between text-[11px] px-2 py-1 rounded-lg bg-white dark:bg-gray-800/80 border border-gray-100 dark:border-gray-700/60 font-mono"
                                  >
                                    <span className="text-gray-400">Hiệp {sIdx + 1}</span>
                                    <span className="font-bold text-gray-900 dark:text-gray-100">
                                      {st.weightKg} kg × {st.reps} reps
                                    </span>
                                    <span className="text-[10px] text-gray-400">
                                      Vol: {st.weightKg * st.reps} kg
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Grid: Personal Records + Sports Log */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Personal Records Table */}
        <div className="bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
          <h3 className="text-xs font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-500" />
            Kỷ Lục Cá Nhân (PR - Personal Records)
          </h3>

          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {Object.keys(prs).length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">Chưa có kỷ lục nào.</p>
            ) : (
              Object.entries(prs).map(([exId, record]) => {
                const ex = exerciseById(exId);
                return (
                  <div key={exId} className="py-2 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-gray-800 dark:text-gray-200">
                        {ex ? ex.name : exId}
                      </div>
                      <div className="text-[10px] text-gray-400">
                        {ex ? ex.equipment : 'Free weight'}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                        {record.weightKg} kg
                      </span>
                      <span className="text-[10px] text-gray-400 ml-1">× {record.reps} reps</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Sports Tracker Card */}
        <div className="bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider flex items-center gap-2">
              <Flame className="w-4 h-4 text-rose-500" />
              Thể Thao Ngoài Gym (MET Tracker)
            </h3>
            <button
              onClick={() => setShowSportModal(true)}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              + Thêm buổi tập
            </button>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {sportSessions.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">Chưa có hoạt động thể thao nào.</p>
            ) : (
              sportSessions.slice(0, 5).map((s) => {
                const kcal = sportCalories(s, userWeightKg);
                return (
                  <div key={s.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                        <span>{SPORT_LABEL[s.type]}</span>
                        <span className="text-[10px] text-gray-400 font-mono">({s.date})</span>
                      </div>
                      {s.note && <div className="text-[10px] text-gray-400 italic">{s.note}</div>}
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="font-bold text-rose-600 dark:text-rose-400">{kcal} kcal</div>
                        <div className="text-[10px] text-gray-400">{s.durationMin} phút</div>
                      </div>
                      <button
                        onClick={() => onDeleteSportSession(s.id)}
                        className="p-1 text-gray-300 hover:text-rose-500 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Add Sport Modal */}
      {showSportModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-5 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Flame className="w-4 h-4 text-rose-500" />
              Thêm Buổi Tập Thể Thao (MET)
            </h3>

            <form onSubmit={handleAddSport} className="space-y-3">
              <div>
                <label className="text-[10px] font-semibold uppercase text-gray-400">Bộ môn</label>
                <select
                  value={sportType}
                  onChange={(e) => setSportType(e.target.value as SportType)}
                  className="mt-1 w-full text-xs px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                >
                  {SPORT_OPTIONS.map((st) => (
                    <option key={st} value={st}>
                      {SPORT_LABEL[st]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold uppercase text-gray-400">Thời gian (phút)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={sportDuration}
                    onChange={(e) => setSportDuration(e.target.value)}
                    className="mt-1 w-full text-xs px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase text-gray-400">Ngày</label>
                  <input
                    type="date"
                    required
                    value={sportDate}
                    onChange={(e) => setSportDate(e.target.value)}
                    className="mt-1 w-full text-xs px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-semibold uppercase text-gray-400">Ghi chú</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Chạy 5km công viên, đá bóng sân 7..."
                  value={sportNote}
                  onChange={(e) => setSportNote(e.target.value)}
                  className="mt-1 w-full text-xs px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                />
              </div>

              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-[11px] text-rose-700 dark:text-rose-300">
                Ước tính tiêu thụ:{' '}
                <span className="font-bold">
                  {sportCalories({ id: '', date: '', type: sportType, durationMin: Number(sportDuration) || 0, createdAt: 0 }, userWeightKg)}{' '}
                  kcal
                </span>{' '}
                (theo cân nặng {userWeightKg} kg).
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSportModal(false)}
                  className="px-3.5 py-2 rounded-xl border border-gray-300 dark:border-gray-700 text-xs font-semibold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer"
                >
                  Lưu hoạt động
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Exercise Library Modal */}
      {showLibraryModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-5 space-y-4 shadow-xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-500" />
                <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  Thư Viện Bài Tập ({allExercises.length})
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddExerciseModal(true)}
                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold cursor-pointer transition-colors flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Bài ngoài</span>
                </button>
                <button
                  onClick={() => setShowLibraryModal(false)}
                  className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>

            <input
              type="text"
              placeholder="Tìm kiếm bài tập hoặc nhóm cơ..."
              value={exerciseSearch}
              onChange={(e) => setExerciseSearch(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
            />

            <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800 pr-1">
              {filteredExercises.map((ex) => {
                const color = MUSCLE_COLOR[ex.muscle];
                return (
                  <div key={ex.id} className="py-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-gray-900 dark:text-gray-100">
                          {ex.name}
                        </span>
                        {ex.isCustom && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded font-extrabold uppercase bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                            Bài Ngoài
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span
                          className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase"
                          style={{ backgroundColor: `${color}22`, color }}
                        >
                          {MUSCLE_LABEL[ex.muscle]} · {ex.equipment}
                        </span>
                        {ex.isCustom && onDeleteCustomExercise && (
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Xóa bài tập ngoài "${ex.name}" khỏi thư viện?`)) {
                                onDeleteCustomExercise(ex.id);
                              }
                            }}
                            className="p-1 rounded text-gray-400 hover:text-rose-500 cursor-pointer transition-colors"
                            title="Xóa bài tập ngoài"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 italic flex items-center gap-1">
                      <span className="text-orange-500 font-bold not-italic">Cue:</span> {ex.cue}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Active Workout Player Modal / Sheet */}
      {activeSession && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white dark:bg-[#161a20] rounded-3xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full p-4 sm:p-6 shadow-2xl max-h-[92vh] flex flex-col animate-fadeIn">
            {/* Player Header */}
            <div className="flex items-start justify-between border-b border-gray-100 dark:border-slate-800 pb-3.5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                    Đang tập trực tiếp
                  </span>
                  <span className="text-xs font-mono font-bold text-gray-900 dark:text-gray-100 px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800">
                    {String(Math.floor(elapsedSeconds / 60)).padStart(2, '0')}:
                    {String(elapsedSeconds % 60).padStart(2, '0')}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100 mt-1">
                  {activeSession.planned.title}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (activeWorkoutStats.completedCount > 0) {
                    if (confirm('Bạn có chắc muốn hủy phiên tập đang chạy?')) {
                      setActiveSession(null);
                      setRestSecondsLeft(null);
                    }
                  } else {
                    setActiveSession(null);
                    setRestSecondsLeft(null);
                  }
                }}
                className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                title="Đóng phiên tập"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Live Stats Row */}
            <div className="grid grid-cols-3 gap-2 py-3 border-b border-gray-100 dark:border-slate-800 text-center">
              <div className="p-2 rounded-xl bg-orange-50/60 dark:bg-orange-950/20">
                <div className="text-[10px] text-gray-500 uppercase font-semibold">Tải trọng</div>
                <div className="text-sm sm:text-base font-bold text-orange-600 dark:text-orange-400 font-mono">
                  {activeWorkoutStats.volumeKg.toLocaleString()} kg
                </div>
              </div>
              <div className="p-2 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20">
                <div className="text-[10px] text-gray-500 uppercase font-semibold">Tiến độ hiệp</div>
                <div className="text-sm sm:text-base font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                  {activeWorkoutStats.completedCount} / {activeWorkoutStats.totalCount}
                </div>
              </div>
              <div className="p-2 rounded-xl bg-purple-50/60 dark:bg-purple-950/20">
                <div className="text-[10px] text-gray-500 uppercase font-semibold">Ước tính tiêu thụ</div>
                <div className="text-sm sm:text-base font-bold text-purple-600 dark:text-purple-400 font-mono">
                  {activeWorkoutStats.kcal} kcal
                </div>
              </div>
            </div>

            {/* Rest Timer Bar */}
            <div className="py-2.5 px-3 my-2 rounded-2xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/70 dark:bg-blue-950/30 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <Clock className={`w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 ${restSecondsLeft ? 'animate-spin' : ''}`} />
                <div className="text-xs truncate">
                  {restSecondsLeft !== null ? (
                    <span className="font-bold text-blue-700 dark:text-blue-300 font-mono text-sm">
                      Nghỉ giữa hiệp: {restSecondsLeft}s
                    </span>
                  ) : (
                    <span className="text-gray-600 dark:text-gray-300 font-medium">
                      Đồng hồ nghỉ: Sẵn sàng hiệp tiếp
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {restSecondsLeft !== null ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setRestSecondsLeft((s) => (s ? s + 30 : 30))}
                      className="px-2 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold cursor-pointer"
                    >
                      +30s
                    </button>
                    <button
                      type="button"
                      onClick={() => setRestSecondsLeft(null)}
                      className="px-2 py-1 rounded-lg bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-[10px] font-semibold cursor-pointer"
                    >
                      Bỏ qua
                    </button>
                  </>
                ) : (
                  <>
                    {[60, 90, 120].map((sec) => (
                      <button
                        key={sec}
                        type="button"
                        onClick={() => {
                          setRestTotal(sec);
                          setRestSecondsLeft(sec);
                        }}
                        className="px-2 py-1 rounded-lg bg-white dark:bg-gray-800 border border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-[10px] font-semibold hover:bg-blue-50 cursor-pointer"
                      >
                        {sec}s
                      </button>
                    ))}
                  </>
                )}
              </div>
            </div>

            {/* Exercise Prescriptions & Sets List */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 my-1">
              {activeSession.prescriptions.map((pres) => {
                const ex = getExercise(pres.exerciseId);
                const color = ex ? MUSCLE_COLOR[ex.muscle as MuscleGroup] : '#2563EB';
                const curPr = prs[pres.exerciseId];
                const overloadRec = curPr ? calculateProgressiveOverload(curPr.weightKg, curPr.reps, pres.reps) : null;

                return (
                  <div
                    key={pres.exerciseId}
                    className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-gray-50/50 dark:bg-gray-850 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase"
                            style={{ backgroundColor: `${color}22`, color }}
                          >
                            {ex ? MUSCLE_LABEL[ex.muscle as MuscleGroup] : 'Cơ'} · {ex?.equipment}
                          </span>
                          <span className="font-bold text-xs sm:text-sm text-gray-900 dark:text-gray-100">
                            {ex?.name || pres.exerciseId}
                          </span>
                        </div>
                        {ex?.cue && (
                          <div className="text-[10px] text-gray-400 italic mt-0.5">
                            {ex.cue}
                          </div>
                        )}
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-gray-400 block font-mono">
                          Mục tiêu: {pres.reps} reps · RPE {pres.rpe}
                        </span>
                        {curPr && (
                          <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                            PR: {curPr.weightKg}kg × {curPr.reps}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Progressive Overload Advisor */}
                    {overloadRec && (
                      <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-orange-500/10 border border-orange-500/25 text-[11px] text-orange-700 dark:text-orange-300">
                        <Zap className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                        <span className="font-semibold leading-tight">{overloadRec.tipVi}</span>
                      </div>
                    )}

                    {/* Sets Table */}
                    <div className="space-y-1.5">
                      {Array.from({ length: pres.sets }).map((_, sIdx) => {
                        const setKey = `${pres.exerciseId}-${sIdx}`;
                        const setItem = activeSession.sets[setKey] || {
                          weightKg: curPr?.weightKg || 40,
                          reps: parseInt(pres.reps) || 10,
                          completed: false,
                        };
                        const isPr = curPr ? setItem.weightKg > curPr.weightKg : false;

                        return (
                          <div
                            key={sIdx}
                            className={`p-2 rounded-xl flex items-center justify-between gap-2 border transition-colors ${
                              setItem.completed
                                ? 'bg-emerald-50/90 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'
                                : 'bg-white dark:bg-gray-800 border-slate-200 dark:border-gray-700'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-xs font-bold text-gray-500 w-11">
                                Hiệp {sIdx + 1}
                              </span>
                              {!setItem.completed && (
                                <div className="hidden sm:flex items-center gap-1">
                                  {sIdx > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => handleCopyPrevSet(pres.exerciseId, sIdx)}
                                      className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-650 text-gray-600 dark:text-gray-300 cursor-pointer transition-colors"
                                      title="Lấy số tạ & reps của hiệp trước"
                                    >
                                      📋 Lặp
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleApplyQuickScale(pres.exerciseId, sIdx, 0.8)}
                                    className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-orange-100 dark:bg-orange-950/40 hover:bg-orange-200 text-orange-700 dark:text-orange-300 cursor-pointer transition-colors"
                                    title="Drop-set giảm 20% tạ"
                                  >
                                    🔥 -20%
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleApplyQuickScale(pres.exerciseId, sIdx, 0.6)}
                                    className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-blue-100 dark:bg-blue-950/40 hover:bg-blue-200 text-blue-700 dark:text-blue-300 cursor-pointer transition-colors"
                                    title="Hiệp khởi động giảm 40% tạ"
                                  >
                                    🏋️ Khởi động
                                  </button>
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-2 flex-1 justify-center">
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.5"
                                  value={setItem.weightKg}
                                  onChange={(e) =>
                                    handleUpdateSet(
                                      pres.exerciseId,
                                      sIdx,
                                      Number(e.target.value) || 0,
                                      setItem.reps
                                    )
                                  }
                                  disabled={setItem.completed}
                                  className="w-14 text-center py-1 px-1 rounded-lg border border-gray-300 dark:border-gray-600 text-xs font-bold bg-white dark:bg-gray-900 disabled:opacity-75"
                                />
                                <span className="text-[10px] text-gray-400">kg</span>
                              </div>

                              <span className="text-gray-300 dark:text-gray-600">×</span>

                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min="1"
                                  value={setItem.reps}
                                  onChange={(e) =>
                                    handleUpdateSet(
                                      pres.exerciseId,
                                      sIdx,
                                      setItem.weightKg,
                                      Number(e.target.value) || 1
                                    )
                                  }
                                  disabled={setItem.completed}
                                  className="w-12 text-center py-1 px-1 rounded-lg border border-gray-300 dark:border-gray-600 text-xs font-bold bg-white dark:bg-gray-900 disabled:opacity-75"
                                />
                                <span className="text-[10px] text-gray-400">reps</span>
                              </div>

                              {isPr && !setItem.completed && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold shrink-0">
                                  ⭐ PR
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              {!setItem.completed && pres.sets > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveSetFromExercise(pres.exerciseId, sIdx)}
                                  className="p-1.5 rounded-lg text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                                  title="Xóa hiệp này"
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleToggleSet(pres.exerciseId, sIdx, pres.restSeconds)}
                                className={`p-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                                  setItem.completed
                                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                    : 'bg-gray-100 hover:bg-orange-500 hover:text-white dark:bg-gray-700 text-gray-700 dark:text-gray-200'
                                }`}
                              >
                                <Check className="w-4 h-4" />
                                <span className="text-[11px]">
                                  {setItem.completed ? 'Xong' : 'Ghi'}
                                </span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Add extra set button */}
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => handleAddSetToExercise(pres.exerciseId)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-dashed border-orange-300 dark:border-orange-800 text-orange-600 dark:text-orange-400 text-[10px] font-bold hover:bg-orange-50 dark:hover:bg-orange-950/30 cursor-pointer transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                        <span>+ Thêm hiệp cho bài này</span>
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Add extra exercise dropdown in active workout */}
              <div className="p-3.5 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50/30 dark:bg-gray-800/20 flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex items-center gap-2 flex-1 min-w-[220px]">
                  <Dumbbell className="w-4 h-4 text-orange-500 shrink-0" />
                  <select
                    value={extraExerciseId}
                    onChange={(e) => setExtraExerciseId(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                  >
                    <option value="">-- Thêm bài tập khác vào buổi tập này --</option>
                    {allExercises.map((ex) => (
                      <option key={ex.id} value={ex.id}>
                        {ex.name} ({MUSCLE_LABEL[ex.muscle]} · {ex.equipment}){ex.isCustom ? ' [Bài Ngoài]' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  disabled={!extraExerciseId}
                  onClick={() => handleAddExerciseToActiveSession(extraExerciseId)}
                  className="px-3.5 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white text-xs font-semibold cursor-pointer shrink-0 flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm bài tập</span>
                </button>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-3 border-t border-gray-100 dark:border-slate-800 space-y-2">
              <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoScheduleOnFinish}
                  onChange={(e) => setAutoScheduleOnFinish(e.target.checked)}
                  className="rounded text-orange-600 focus:ring-orange-500"
                />
                <span>Tự động đồng bộ buổi tập này vào Google Calendar hôm nay</span>
              </label>

              <button
                type="button"
                onClick={handleFinishActiveSession}
                className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Hoàn Thành Buổi Tập & Lưu Vào Lịch Sử</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Custom Planned Session Modal */}
      {showAddPlanModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white dark:bg-[#131b2e] rounded-3xl border border-slate-200 dark:border-slate-800 max-w-xl w-full p-5 space-y-4 shadow-2xl max-h-[90vh] flex flex-col animate-fadeIn">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Dumbbell className="w-4 h-4 text-orange-500" />
                Tạo Giáo Án Kháng Lực Mới (Mesocycle Plan)
              </h3>
              <button
                type="button"
                onClick={() => setShowAddPlanModal(false)}
                className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!planTitle.trim()) return;
                const newPlan: PlannedSession = {
                  id: `plan-${Date.now()}`,
                  weekIndex: 0,
                  dayIndex: 0,
                  title: planTitle.trim(),
                  dayOfWeek: planDayOfWeek,
                  prescriptions: planPrescriptions,
                };
                onAddPlannedSession?.(newPlan);
                setShowAddPlanModal(false);
                setScheduledBanner(`Đã thêm giáo án mới "${newPlan.title}" vào mesocycle!`);
                setTimeout(() => setScheduledBanner(null), 4000);
              }}
              className="space-y-4 flex-1 overflow-y-auto pr-1"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-semibold uppercase text-gray-400">Tên Giáo Án / Buổi Tập</label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Leg Day (Đùi Trước & Sau), Pull Day Focus..."
                    value={planTitle}
                    onChange={(e) => setPlanTitle(e.target.value)}
                    className="mt-1 w-full text-xs px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase text-gray-400">Thứ Trong Tuần</label>
                  <select
                    value={planDayOfWeek}
                    onChange={(e) => setPlanDayOfWeek(e.target.value)}
                    className="mt-1 w-full text-xs px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                  >
                    {['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'].map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Prescriptions list */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-semibold uppercase text-gray-400">
                    Danh Sách Bài Tập ({planPrescriptions.length})
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setPlanPrescriptions([
                        ...planPrescriptions,
                        { exerciseId: 'lat-pulldown', sets: 3, reps: '10-12', rpe: 8, restSeconds: 75 },
                      ]);
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-600 dark:text-orange-400 hover:underline cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm bài tập</span>
                  </button>
                </div>

                {planPrescriptions.map((p, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-2xl border border-slate-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/40 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <select
                        value={p.exerciseId}
                        onChange={(e) => {
                          const next = [...planPrescriptions];
                          next[idx].exerciseId = e.target.value;
                          setPlanPrescriptions(next);
                        }}
                        className="flex-1 text-xs px-2.5 py-1.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                      >
                        {allExercises.map((ex) => (
                          <option key={ex.id} value={ex.id}>
                            {ex.name} ({MUSCLE_LABEL[ex.muscle]}){ex.isCustom ? ' [Bài Ngoài]' : ''}
                          </option>
                        ))}
                      </select>

                      {planPrescriptions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            setPlanPrescriptions(planPrescriptions.filter((_, i) => i !== idx));
                          }}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                          title="Xóa bài tập này"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-4 gap-2 text-xs">
                      <div>
                        <span className="text-[9px] text-gray-400 uppercase font-semibold">Số hiệp</span>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={p.sets}
                          onChange={(e) => {
                            const next = [...planPrescriptions];
                            next[idx].sets = Math.max(1, Number(e.target.value) || 1);
                            setPlanPrescriptions(next);
                          }}
                          className="mt-0.5 w-full text-center py-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
                        />
                      </div>
                      <div>
                        <span className="text-[9px] text-gray-400 uppercase font-semibold">Reps</span>
                        <input
                          type="text"
                          value={p.reps}
                          onChange={(e) => {
                            const next = [...planPrescriptions];
                            next[idx].reps = e.target.value;
                            setPlanPrescriptions(next);
                          }}
                          className="mt-0.5 w-full text-center py-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
                        />
                      </div>
                      <div>
                        <span className="text-[9px] text-gray-400 uppercase font-semibold">RPE</span>
                        <input
                          type="number"
                          min="6"
                          max="10"
                          value={p.rpe}
                          onChange={(e) => {
                            const next = [...planPrescriptions];
                            next[idx].rpe = Number(e.target.value) || 8;
                            setPlanPrescriptions(next);
                          }}
                          className="mt-0.5 w-full text-center py-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
                        />
                      </div>
                      <div>
                        <span className="text-[9px] text-gray-400 uppercase font-semibold">Nghỉ (s)</span>
                        <input
                          type="number"
                          min="30"
                          step="15"
                          value={p.restSeconds}
                          onChange={(e) => {
                            const next = [...planPrescriptions];
                            next[idx].restSeconds = Number(e.target.value) || 90;
                            setPlanPrescriptions(next);
                          }}
                          className="mt-0.5 w-full text-center py-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddPlanModal(false)}
                  className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 text-xs font-semibold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold cursor-pointer transition-colors shadow-sm"
                >
                  Lưu Giáo Án
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Custom Exercise Modal ("Thêm Bài Ngoài") */}
      {showAddExerciseModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Dumbbell className="w-5 h-5 text-emerald-500" />
                <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  Thêm Bài Tập Ngoài / Tùy Chỉnh
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddExerciseModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomExercise} className="space-y-3.5">
              <div>
                <label className="block text-[10px] font-semibold uppercase text-gray-400 mb-1">
                  Tên bài tập
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Dumbbell Bulgarian Split Squat, Cable Lateral Raise..."
                  value={newExName}
                  onChange={(e) => setNewExName(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold uppercase text-gray-400 mb-1">
                    Nhóm cơ chính
                  </label>
                  <select
                    value={newExMuscle}
                    onChange={(e) => setNewExMuscle(e.target.value as MuscleGroup)}
                    className="w-full text-xs px-2.5 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 font-semibold"
                  >
                    <option value="chest">Ngực (Chest)</option>
                    <option value="back">Lưng (Back)</option>
                    <option value="legs">Chân &amp; Đùi (Legs)</option>
                    <option value="shoulders">Vai (Shoulders)</option>
                    <option value="arms">Tay (Arms)</option>
                    <option value="core">Bụng (Core)</option>
                    <option value="cardio">Cardio</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold uppercase text-gray-400 mb-1">
                    Thiết bị / Dụng cụ
                  </label>
                  <input
                    type="text"
                    placeholder="Barbell, Dumbbell, Cable..."
                    value={newExEquipment}
                    onChange={(e) => setNewExEquipment(e.target.value)}
                    className="w-full text-xs px-2.5 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold uppercase text-gray-400 mb-1">
                  Hướng dẫn kỹ thuật (Cue / Lưu ý tư thế)
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Giữ lưng thẳng, hạ chậm 2 giây, không khóa khớp gối..."
                  value={newExCue}
                  onChange={(e) => setNewExCue(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddExerciseModal(false)}
                  className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 text-xs font-semibold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer transition-colors shadow-sm"
                >
                  Thêm Vào Thư Viện
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 1RM & Barbell Plate Calculator Modal */}
      {showCalculatorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-[#131b2e] w-full max-w-2xl max-h-[85vh] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-slate-800 bg-linear-to-r from-orange-500/10 to-transparent">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400">
                  <Calculator className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                    Máy Tính 1RM &amp; Xếp Bánh Tạ Đòn (Barbell)
                  </h3>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    Công thức Epley / Brzycki &amp; quy chuẩn xếp đĩa tạ Olympic thi đấu
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCalculatorModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Sub-tabs */}
            <div className="p-3 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-gray-900/30 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCalcTab('1rm')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  calcTab === '1rm'
                    ? 'bg-orange-500 text-white shadow-xs'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 border border-slate-200 dark:border-gray-700'
                }`}
              >
                Tính 1RM &amp; Tải Trọng Tập
              </button>
              <button
                type="button"
                onClick={() => setCalcTab('plates')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  calcTab === 'plates'
                    ? 'bg-orange-500 text-white shadow-xs'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 border border-slate-200 dark:border-gray-700'
                }`}
              >
                Xếp Bánh Tạ (Plate Math)
              </button>
            </div>

            {/* Tab 1: 1RM Content */}
            {calcTab === '1rm' && (
              <div className="p-5 flex-1 overflow-y-auto space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-semibold uppercase text-gray-400">
                      Mức tạ đã đẩy (kg)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min={1}
                      value={oneRmWeight}
                      onChange={(e) => setOneRmWeight(e.target.value)}
                      className="mt-1 w-full text-xs px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold uppercase text-gray-400">
                      Số rep hoàn thành (Reps)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={oneRmReps}
                      onChange={(e) => setOneRmReps(e.target.value)}
                      className="mt-1 w-full text-xs px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 font-bold"
                    />
                  </div>
                </div>

                {/* 1RM Highlight */}
                <div className="bg-linear-to-br from-orange-500 to-amber-600 rounded-2xl p-4 text-white text-center shadow-md">
                  <span className="text-[11px] font-semibold uppercase tracking-wider opacity-90">
                    1RM Ước Tính (One Rep Max)
                  </span>
                  <div className="text-4xl font-extrabold font-mono mt-0.5 tracking-tight">
                    {oneRmResult.oneRepMax} <span className="text-xl">kg</span>
                  </div>
                  <div className="text-[11px] opacity-90 mt-1 flex items-center justify-center gap-3">
                    <span>Epley: {oneRmResult.epley} kg</span>
                    <span>·</span>
                    <span>Brzycki: {oneRmResult.brzycki} kg</span>
                  </div>
                </div>

                {/* Percentages Table */}
                <div className="space-y-1.5">
                  <h4 className="text-[11px] font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider">
                    Bảng Tải Trọng Tập Luyện Theo Mục Tiêu:
                  </h4>
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-gray-100 dark:divide-gray-800">
                    {oneRmResult.percentages.map((row) => (
                      <div
                        key={row.pct}
                        className="px-3.5 py-2 flex items-center justify-between text-xs bg-white dark:bg-gray-900/40 hover:bg-gray-50 dark:hover:bg-gray-800/40"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="w-12 font-mono font-bold text-orange-600 dark:text-orange-400">
                            {row.pct}%
                          </span>
                          <span className="text-gray-700 dark:text-gray-300">{row.description}</span>
                        </div>
                        <div className="flex items-center gap-3 font-mono">
                          <span className="text-[11px] text-gray-400">{row.targetReps}</span>
                          <span className="font-extrabold text-gray-900 dark:text-gray-100 text-sm">
                            {row.weight} kg
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Plates Math Content */}
            {calcTab === 'plates' && (
              <div className="p-5 flex-1 overflow-y-auto space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-semibold uppercase text-gray-400">
                      Tổng Cân Nặng Muốn Nâng (kg)
                    </label>
                    <input
                      type="number"
                      step="2.5"
                      min={plateResult.barWeightKg}
                      value={plateTargetTotal}
                      onChange={(e) => setPlateTargetTotal(e.target.value)}
                      className="mt-1 w-full text-xs px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold uppercase text-gray-400">
                      Loại Thanh Đòn (Barbell)
                    </label>
                    <select
                      value={plateBarWeight}
                      onChange={(e) => setPlateBarWeight(e.target.value)}
                      className="mt-1 w-full text-xs px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 font-bold"
                    >
                      <option value="20">Đòn Olympic Chuẩn Nam (20 kg)</option>
                      <option value="15">Đòn Olympic Chuẩn Nữ (15 kg)</option>
                      <option value="10">Đòn Ngắn / EZ Bar (10 kg)</option>
                      <option value="8">Đòn Thẳng Nhẹ (8 kg)</option>
                    </select>
                  </div>
                </div>

                {/* Visual Barbell Display */}
                <div className="bg-gray-900 text-white rounded-2xl p-5 shadow-inner space-y-4">
                  <div className="flex items-center justify-between text-xs text-gray-400 border-b border-slate-800 pb-2">
                    <span>
                      Đòn: <strong className="text-white">{plateResult.barWeightKg}kg</strong>
                    </span>
                    <span>
                      Mỗi bên cần lắp:{' '}
                      <strong className="text-orange-400 text-sm">{plateResult.loadedPerSideKg}kg</strong>
                    </span>
                  </div>

                  {/* Graphic Barbell */}
                  <div className="flex items-center justify-center py-4 overflow-x-auto">
                    <div className="flex items-center gap-1 bg-gray-800/80 p-3 rounded-2xl border border-gray-700">
                      {/* Left plates (mirrored) */}
                      <div className="flex items-center gap-1 flex-row-reverse">
                        {plateResult.platesPerSide.flatMap((p) =>
                          Array.from({ length: p.count }).map((_, idx) => (
                            <div
                              key={`left-${p.plateKg}-${idx}`}
                              style={{ backgroundColor: p.color }}
                              className="w-4 h-16 rounded-xs flex items-center justify-center text-[9px] font-black font-mono text-white shadow-xs"
                              title={`Bánh ${p.plateKg}kg`}
                            >
                              {p.plateKg}
                            </div>
                          ))
                        )}
                      </div>

                      {/* Bar center */}
                      <div className="w-16 h-3 bg-gray-400 rounded-sm relative flex items-center justify-center">
                        <span className="text-[8px] font-mono text-gray-900 font-bold">
                          {plateResult.barWeightKg}KG
                        </span>
                      </div>

                      {/* Right plates */}
                      <div className="flex items-center gap-1">
                        {plateResult.platesPerSide.flatMap((p) =>
                          Array.from({ length: p.count }).map((_, idx) => (
                            <div
                              key={`right-${p.plateKg}-${idx}`}
                              style={{ backgroundColor: p.color }}
                              className="w-4 h-16 rounded-xs flex items-center justify-center text-[9px] font-black font-mono text-white shadow-xs"
                              title={`Bánh ${p.plateKg}kg`}
                            >
                              {p.plateKg}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Detailed list per side */}
                  <div className="space-y-1 text-xs">
                    <div className="font-semibold text-gray-300">Danh sách bánh tạ cho MỖI BÊN:</div>
                    {plateResult.platesPerSide.length === 0 ? (
                      <p className="text-gray-500 text-[11px]">Chỉ dùng thanh đòn, chưa cần lắp thêm bánh tạ.</p>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                        {plateResult.platesPerSide.map((p) => (
                          <div
                            key={p.plateKg}
                            className="p-2 rounded-xl bg-gray-800 border border-gray-700 flex items-center gap-2"
                          >
                            <span
                              className="w-3 h-3 rounded-full shrink-0"
                              style={{ backgroundColor: p.color }}
                            />
                            <span className="font-bold text-white">{p.count}x bánh {p.plateKg} kg</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {plateResult.remainderKg > 0 && (
                      <p className="text-amber-400 text-[11px] pt-1">
                        Lưu ý: Còn dư {plateResult.remainderKg}kg do không đủ phân số bánh tạ nhỏ hơn 1.25kg.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="p-3 border-t border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-gray-900/50 flex justify-end">
              <button
                type="button"
                onClick={() => setShowCalculatorModal(false)}
                className="px-4 py-1.5 rounded-xl border border-gray-300 dark:border-gray-700 font-semibold text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-100 cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Log Past / Custom Workout Modal */}
      {showLogPastWorkoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-[#131b2e] w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-3 border-b border-gray-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Dumbbell className="w-5 h-5 text-orange-500" />
                <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  Ghi Nhận Buổi Tập Cho Ngày
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowLogPastWorkoutModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePastWorkout} className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                  Ngày tập
                </label>
                <input
                  type="date"
                  value={pastDate}
                  onChange={(e) => setPastDate(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 font-bold"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                  Tên buổi tập / Giáo án
                </label>
                <input
                  type="text"
                  value={pastTitle}
                  onChange={(e) => setPastTitle(e.target.value)}
                  placeholder="VD: Đẩy Ngực &amp; Tay Sau, Chân Mông..."
                  className="w-full text-xs px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                  required
                />
                {/* Quick suggestions from Planned Sessions or standard splits */}
                {plannedSessions.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1 mt-1.5">
                    <span className="text-[10px] text-gray-400 font-medium mr-1">Giáo án hiện tại:</span>
                    {plannedSessions.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setPastTitle(s.title);
                          setPastDuration('60');
                          setPastBurnedKcal('280');
                        }}
                        className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-orange-500/15 border border-orange-500/30 text-orange-600 dark:text-orange-400 hover:bg-orange-500/25 cursor-pointer transition-colors"
                      >
                        📋 {s.title}
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap gap-1 mt-1">
                  {['Đẩy Ngực & Tay Sau', 'Kéo Lưng & Tay Trước', 'Chân & Bụng', 'Vai & Bắp Tay', 'Full Body Toàn Thân'].map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => setPastTitle(sug)}
                      className="px-2 py-0.5 text-[10px] rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-orange-50 hover:text-orange-600 text-gray-600 dark:text-gray-300 cursor-pointer"
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                    Thời lượng (phút)
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={240}
                    value={pastDuration}
                    onChange={(e) => setPastDuration(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 font-mono font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                    Calo tiêu hao ước tính (kcal)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={10}
                    value={pastBurnedKcal}
                    onChange={(e) => setPastBurnedKcal(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 font-mono font-bold text-orange-600"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                  Ghi chú buổi tập (RPE, cảm nhận, tạ chính)
                </label>
                <textarea
                  rows={2}
                  value={pastNotes}
                  onChange={(e) => setPastNotes(e.target.value)}
                  placeholder="VD: Bench Press 70kg x 8 reps, Squat 90kg, cơ bắp căng tốt..."
                  className="w-full text-xs px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowLogPastWorkoutModal(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Lưu Buổi Tập</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

