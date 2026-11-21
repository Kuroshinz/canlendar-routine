import React, { useMemo, useState } from 'react';
import {
  Calendar,
  ListChecks,
  Timer,
  Wallet,
  HeartPulse,
  TrendingUp,
  TrendingDown,
  Search,
  MoreHorizontal,
  Plus,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Clock,
  Sparkles,
  ExternalLink,
  Dumbbell,
  Utensils,
  Flame,
  Droplets,
  Footprints,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Activity,
  CalendarDays,
  Target,
  Sun,
  Moon,
  Coffee,
  Copy,
  Zap,
  ShieldCheck,
  Award,
} from 'lucide-react';
import { CalendarEvent, CalendarViewType } from '../../types/calendar';
import {
  BudgetSettings,
  FocusSession,
  GoalItem,
  GoalProgress,
  HabitItem,
  HealthDayLog,
  HealthProfile,
  TaskItem,
  Transaction,
} from '../../types/productivity';
import {
  computeBudgetStatus,
  formatMoney,
  formatMoneyCompact,
  monthPrefixOf,
  sortTasks,
  summarizeFinance,
  tasksDueOn,
  totalFocusMinutes,
} from '../../utils/productivityUtils';
import { formatDateString, doesEventOccurOnDate } from '../../utils/calendarUtils';
import { calculateDailyHealthScore } from '../../utils/fitnessMetrics';
import { notifySuccess } from '../../utils/notify';

export interface ProductivityDashboardProps {
  events: CalendarEvent[];
  tasks: TaskItem[];
  goals: GoalItem[];
  goalProgress: GoalProgress[];
  sessions: FocusSession[];
  transactions: Transaction[];
  budget: BudgetSettings;
  healthLogs: HealthDayLog[];
  healthProfile: HealthProfile;
  habits?: HabitItem[];
  lang: 'vi' | 'en';
  onNavigate: (view: CalendarViewType) => void;
  onSetTaskStatus: (id: string, status: TaskItem['status']) => void;
  onOpenEvent: (event: CalendarEvent) => void;
  onAddTask?: (title: string) => void;
  onToggleHabit?: (id: string, dateStr: string) => void;
  onScheduleTask?: (taskId: string, dateStr: string, startTime: string, endTime: string) => void;
  currentUser?: { displayName?: string | null; email?: string | null; photoURL?: string | null } | null;
  onOpenLifeCopilot?: () => void;
  onQuickAddWater?: (ml: number) => void;
  onOpenMacroModal?: () => void;
}

export const ProductivityDashboard: React.FC<ProductivityDashboardProps> = ({
  events,
  tasks,
  goals,
  goalProgress,
  sessions,
  transactions,
  budget,
  healthLogs,
  healthProfile,
  habits = [],
  lang,
  onNavigate,
  onSetTaskStatus,
  onOpenEvent,
  onAddTask,
  onToggleHabit,
  onScheduleTask,
  currentUser,
  onOpenLifeCopilot,
  onQuickAddWater,
  onOpenMacroModal,
}) => {
  const today = formatDateString(new Date());

  // Active Category Filter with animation key
  const [activeTab, setActiveTab] = useState<'all' | 'activity' | 'nutrition' | 'sleep' | 'habits'>('all');
  const [activeWorkoutType, setActiveWorkoutType] = useState<'cardio' | 'strength' | 'muscle' | 'nutrition'>('strength');
  const [quickEventTitle, setQuickEventTitle] = useState('');

  // 1. REAL HEALTH DATA FROM STORE
  const todayLog = useMemo(() => healthLogs.find((l) => l.date === today), [healthLogs, today]);
  
  // Real consumed metrics
  const waterConsumedMl = todayLog?.waterMl || 0;
  const targetWaterMl = healthProfile?.dailyWaterMl || 2500;
  const waterPct = Math.min(100, Math.round((waterConsumedMl / targetWaterMl) * 100));

  const caloriesConsumed = todayLog?.caloriesIn || 0;
  const targetCalories = 2000;
  const calPercent = Math.min(100, Math.round((caloriesConsumed / targetCalories) * 100));

  const proteinG = todayLog?.protein || 0;
  const carbsG = todayLog?.carbs || 0;
  const fatG = todayLog?.fat || 0;

  const sleepHours = todayLog?.sleepHours || 0;
  const stepsTaken = todayLog?.steps || 0;

  // Real Health Score calculation
  const todayHealthScore = useMemo(() => {
    return calculateDailyHealthScore(
      todayLog || { date: today, source: 'manual' },
      healthProfile?.dailySteps || 8000,
      healthProfile?.dailyWaterMl || 2500,
      targetCalories,
      140
    );
  }, [todayLog, healthProfile, targetCalories, today]);

  // 2. REAL EVENTS FROM USER'S CALENDAR
  const todayEvents = useMemo(() => {
    return events
      .filter((e) => doesEventOccurOnDate(e, today))
      .sort((a, b) => (a.startTime || '00:00').localeCompare(b.startTime || '00:00'));
  }, [events, today]);

  // Upcoming real events if today is empty
  const displayTimelineEvents = useMemo(() => {
    if (todayEvents.length > 0) return todayEvents;
    // Fallback to real upcoming events in the calendar
    const upcoming = events
      .filter((e) => e.startDate >= today)
      .sort((a, b) => `${a.startDate} ${a.startTime || '00:00'}`.localeCompare(`${b.startDate} ${b.startTime || '00:00'}`))
      .slice(0, 5);
    return upcoming.length > 0 ? upcoming : events.slice(0, 5);
  }, [todayEvents, events, today]);

  // 3. REAL HABITS FROM STORE
  const activeHabitsList = useMemo(() => {
    return habits.slice(0, 6);
  }, [habits]);

  const completedHabitsCount = useMemo(() => {
    return activeHabitsList.filter((h) => h.completedDates.includes(today)).length;
  }, [activeHabitsList, today]);

  // 4. REAL TASKS FROM STORE
  const todaysTasks = useMemo(() => sortTasks(tasksDueOn(tasks, today)), [tasks, today]);
  const completedTasksToday = useMemo(
    () => todaysTasks.filter((t) => t.status === 'completed'),
    [todaysTasks]
  );

  // 5. REAL FOCUS SESSIONS
  const todayFocusMinutes = useMemo(() => totalFocusMinutes(sessions, today), [sessions, today]);

  // Greeting
  const hour = new Date().getHours();
  const greeting =
    hour < 12
      ? (lang === 'vi' ? 'Chào buổi sáng' : 'Good morning')
      : hour < 18
      ? (lang === 'vi' ? 'Chào buổi chiều' : 'Good afternoon')
      : (lang === 'vi' ? 'Chào buổi tối' : 'Good evening');

  const displayName = currentUser?.displayName || (currentUser?.email ? currentUser.email.split('@')[0] : 'Thiện Nhân');

  return (
    <div className="relative select-none font-sans max-w-7xl mx-auto space-y-6 pb-12">
      {/* =========================================================================
          1. EXECUTIVE COMMAND HEADER (Live Real-Time Data)
          ========================================================================= */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-rose-950/40 via-black/60 to-rose-950/30 border border-white/[0.09] p-5 sm:p-6 backdrop-blur-2xl shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-rose-600/15 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
              <span className="text-[11px] font-extrabold tracking-wider uppercase text-rose-300">
                Hệ Thống Chỉ Huy & Năng Suất ZENOX
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {greeting}, <span className="text-rose-400 capitalize">{displayName}</span>!
            </h1>

            <p className="text-xs text-slate-300 leading-relaxed">
              Hôm nay bạn có <strong className="text-white font-mono">{todayEvents.length} sự kiện</strong>,{' '}
              đã hoàn thành <strong className="text-rose-400 font-mono">{completedHabitsCount}/{activeHabitsList.length} thói quen</strong>,{' '}
              và điểm sinh học đạt <strong className="text-emerald-400 font-mono">{todayHealthScore.score}/100</strong>.
            </p>
          </div>

          {/* Quick 1-Click Interactive Action Pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                onQuickAddWater?.(250);
                notifySuccess('Đã uống thêm nước!', '+250ml nước đã được cộng vào nhật ký.');
              }}
              className="glass-pill text-xs py-2 px-3 text-sky-300 hover:text-white border-sky-500/30 cursor-pointer transition-transform hover:bg-white/[0.06] active:scale-98"
              title="Ghi nhận uống thêm 250ml nước"
            >
              <Droplets className="w-3.5 h-3.5 text-sky-400" />
              <span>+250ml Nước</span>
            </button>

            <button
              onClick={onOpenMacroModal}
              className="glass-pill text-xs py-2 px-3 text-amber-300 hover:text-white border-amber-500/30 cursor-pointer transition-transform hover:bg-white/[0.06] active:scale-98"
              title="Nhập Prompt Macro bữa ăn"
            >
              <Utensils className="w-3.5 h-3.5 text-amber-400" />
              <span>Nhập Bữa Ăn</span>
            </button>

            <button
              onClick={() => onNavigate('focus')}
              className="glass-pill text-xs py-2 px-3 text-rose-300 hover:text-white border-rose-500/30 cursor-pointer transition-transform hover:bg-white/[0.06] active:scale-98"
              title="Mở đồng hồ Pomodoro"
            >
              <Timer className="w-3.5 h-3.5 text-rose-400" />
              <span>Pomodoro</span>
            </button>

            <button
              onClick={onOpenLifeCopilot}
              className="glass-pill-crimson text-xs py-2 px-3.5 cursor-pointer shadow-md transition-transform hover:bg-white/[0.06] active:scale-98"
            >
              <Sparkles className="w-3.5 h-3.5 text-rose-300 animate-pulse" />
              <span>Hỏi AI Copilot</span>
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          2. LUMINOUS TRANSPARENT GLASS CAPSULE TOOLBAR (Smooth Downward Reveal)
          "các thanh công cụ làm bo tròn và làm sáng vào một khối glass trong suốt"
          ========================================================================= */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="p-1.5 rounded-full bg-white/[0.04] dark:bg-white/[0.04] backdrop-blur-2xl border border-white/[0.12] shadow-[0_8px_32px_rgba(0,0,0,0.36),0_0_20px_rgba(255,255,255,0.03)] inline-flex items-center gap-1.5 overflow-x-auto max-w-full scrollbar-none">
          {[
            { id: 'all', labelVi: 'Tổng quan', labelEn: 'Overview', target: 'dashboard' },
            { id: 'activity', labelVi: 'Hoạt động & Gym', labelEn: 'Activity', target: 'health', subtab: 'training' },
            { id: 'nutrition', labelVi: 'Dinh dưỡng & Macro', labelEn: 'Nutrition', target: 'health', subtab: 'nutrition' },
            { id: 'sleep', labelVi: 'Giấc ngủ & Hồi phục', labelEn: 'Sleep', target: 'health', subtab: 'inbody' },
            { id: 'habits', labelVi: 'Thói quen kỷ luật', labelEn: 'Habits', target: 'tasks' },
          ].map((tab) => {
            const isActive = tab.target === 'dashboard';
            return (
              <button
                key={tab.id}
                onClick={() => {
                  if (tab.target === 'dashboard') {
                    setActiveTab('all');
                  } else {
                    if (tab.subtab) {
                      localStorage.setItem('vortex_health_subtab', tab.subtab);
                    }
                    onNavigate(tab.target as CalendarViewType);
                  }
                }}
                className={`px-4 sm:px-5 py-2 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-rose-500/20 text-white border border-rose-500/35 font-semibold shadow-[0_2px_10px_rgba(225,29,72,0.18)]'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.05] border border-transparent'
                }`}
              >
                {lang === 'vi' ? tab.labelVi : tab.labelEn}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => onNavigate('month')}
          className="p-2 px-4.5 rounded-full bg-white/[0.04] dark:bg-white/[0.04] backdrop-blur-2xl border border-white/[0.12] hover:border-white/30 text-xs font-semibold text-rose-300 hover:text-white shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:bg-white/[0.08] transition-all duration-200 cursor-pointer hidden sm:inline-flex items-center gap-2 shrink-0"
        >
          <Calendar className="w-3.5 h-3.5 text-rose-400" />
          <span>{lang === 'vi' ? 'Mở Lịch Biểu' : 'Calendar'}</span>
        </button>
      </div>

      {/* =========================================================================
          3. TAB CONTENT WRAPPER WITH FLUID ENTRANCE ANIMATION
          ========================================================================= */}
      <div key={activeTab} className="tab-enter-active">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ---------------------------------------------------------------------
              LEFT COLUMN: 7 COLUMNS (Real Metric Cards Based on Active Filter)
              --------------------------------------------------------------------- */}
          <div className="lg:col-span-7 space-y-6">
            {/* ROW 1: 3 STAT CARDS (Health Score, Sleep, Habits) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* CARD 1: REAL DAILY HEALTH SCORE */}
              <div
                onClick={() => onNavigate('health')}
                className="glass-panel p-5 flex flex-col justify-between relative overflow-hidden group cursor-pointer hover:border-rose-500/40"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-300">
                    {lang === 'vi' ? 'Điểm Thể Lực' : 'Health Score'}
                  </span>
                  
                </div>

                <div className="relative flex flex-col items-center justify-center my-2">
                  <div className="text-2xl font-black tracking-tight text-white font-mono">
                    {todayHealthScore.score}
                    <span className="text-xs font-normal text-slate-400">/100</span>
                  </div>

                  <div className="w-28 h-14 overflow-hidden relative mt-1">
                    <svg viewBox="0 0 100 50" className="w-full h-full">
                      <path
                        d="M 10 50 A 40 40 0 0 1 90 50"
                        fill="none"
                        stroke="rgba(255,255,255,0.08)"
                        strokeWidth="10"
                        strokeLinecap="round"
                      />
                      <path
                        d="M 10 50 A 40 40 0 0 1 90 50"
                        fill="none"
                        stroke="url(#crimson-gauge-grad)"
                        strokeWidth="10"
                        strokeLinecap="round"
                        strokeDasharray="126"
                        strokeDashoffset={126 - (126 * todayHealthScore.score) / 100}
                        className="transition-all duration-700 ease-out"
                      />
                      <defs>
                        <linearGradient id="crimson-gauge-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#10b981" />
                          <stop offset="50%" stopColor="#f59e0b" />
                          <stop offset="100%" stopColor="#f43f5e" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between text-[10px] text-slate-400">
                  <span>Nước: {waterConsumedMl}ml</span>
                  <span>{todayLog ? 'Đã có nhật ký' : 'Chưa ghi nhật ký'}</span>
                </div>
              </div>

              {/* CARD 2: REAL SLEEP TRACKING */}
              <div
                onClick={() => onNavigate('health')}
                className="glass-panel p-5 flex flex-col justify-between relative overflow-hidden group cursor-pointer hover:border-rose-500/40"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-300">
                    {lang === 'vi' ? 'Giấc Ngủ' : 'Sleep Tracking'}
                  </span>
                  <span className="text-xs font-black text-rose-400 font-mono">
                    {sleepHours > 0 ? `${sleepHours} hrs` : 'Chưa nhập'}
                  </span>
                </div>

                <div className="h-16 w-full relative my-2">
                  <svg viewBox="0 0 140 50" className="w-full h-full overflow-visible">
                    <defs>
                      <linearGradient id="sleep-curve-glow" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M 10 38 Q 30 42, 50 25 T 90 20 T 130 15 L 130 50 L 10 50 Z"
                      fill="url(#sleep-curve-glow)"
                    />
                    <path
                      d="M 10 38 Q 30 42, 50 25 T 90 20 T 130 15"
                      fill="none"
                      stroke="#f43f5e"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                    <circle cx="90" cy="20" r="3.5" fill="#ffffff" stroke="#f43f5e" strokeWidth="2" />
                  </svg>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold px-1">
                  <span>Mục tiêu: {healthProfile?.dailySleepHours || 8}h</span>
                  <span className="text-rose-400 font-bold">Hôm nay</span>
                </div>
              </div>

              {/* CARD 3: REAL HABIT COMPLETION STREAK */}
              <div
                onClick={() => onNavigate('tasks')}
                className="glass-panel p-5 flex flex-col justify-between relative overflow-hidden group cursor-pointer hover:border-rose-500/40 bg-gradient-to-br from-white/[0.04] to-rose-950/20 border-rose-500/25"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-rose-500 animate-pulse" />
                    <span className="text-xs font-bold text-white">
                      {lang === 'vi' ? 'Kỷ Luật Thói Quen' : 'Habit Streak'}
                    </span>
                  </div>
                  
                </div>

                <div className="my-2">
                  <div className="text-lg font-black text-white font-mono">
                    {completedHabitsCount} <span className="text-xs font-normal text-slate-400">/ {activeHabitsList.length} Hoàn thành</span>
                  </div>
                  <p className="text-[10px] text-slate-300 mt-0.5 line-clamp-1">
                    {completedHabitsCount === activeHabitsList.length && activeHabitsList.length > 0
                      ? 'Đã hoàn tất 100% thói quen hôm nay! 🔥'
                      : 'Bấm để tích hoàn thành các thói quen'}
                  </p>
                </div>

                <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-rose-500 to-rose-400 rounded-full transition-all duration-500"
                    style={{ width: activeHabitsList.length > 0 ? `${(completedHabitsCount / activeHabitsList.length) * 100}%` : '0%' }}
                  />
                </div>
              </div>
            </div>

            {/* ROW 2: REAL WORKOUT SPLIT & REAL NUTRITION LOG */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* WORKOUT PLAN CARD */}
              <div className="glass-panel p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      {lang === 'vi' ? 'Kế Hoạch Luyện Tập' : 'Workout Routine'}
                    </h3>
                    <span className="text-[11px] text-slate-400">
                      Giáo án thể lực & phân bổ bài tập
                    </span>
                  </div>
                  <button
                    onClick={() => onNavigate('health')}
                    className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    
                  </button>
                </div>

                {/* Workout Type Segmented Tabs */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                  {[
                    { id: 'strength', icon: Dumbbell, labelVi: 'Kháng lực', labelEn: 'Strength' },
                    { id: 'cardio', icon: Footprints, labelVi: 'Cardio', labelEn: 'Cardio' },
                    { id: 'muscle', icon: Zap, labelVi: 'Vùng Core', labelEn: 'Core' },
                    { id: 'nutrition', icon: Utensils, labelVi: 'Dinh dưỡng', labelEn: 'Nutrition' },
                  ].map((item) => {
                    const isSelected = activeWorkoutType === item.id;
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setActiveWorkoutType(item.id as any)}
                        className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer ${
                          isSelected
                            ? 'bg-rose-500/20 text-rose-200 border border-rose-500/35 font-semibold shadow-[0_2px_8px_rgba(225,29,72,0.2)]'
                            : 'text-slate-400 hover:text-white hover:bg-white/[0.04] border border-transparent'
                        }`}
                      >
                        <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-rose-400' : 'text-slate-400'}`} />
                        <span className="truncate">{lang === 'vi' ? item.labelVi : item.labelEn}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between">
                  <div className="text-xs">
                    <span className="font-semibold text-white">
                      {activeWorkoutType === 'strength'
                        ? 'Kháng lực Hypertrophy'
                        : activeWorkoutType === 'cardio'
                        ? 'Cardio Zone 2 Hiếu Khí'
                        : activeWorkoutType === 'muscle'
                        ? 'Core & Vùng Bụng'
                        : 'Dinh dưỡng phục hồi cơ'}
                    </span>
                    <p className="text-[10px] text-slate-400">45-60 phút • Đốt cháy ~350 kcal</p>
                  </div>
                  <button
                    onClick={() => {
                      localStorage.setItem('vortex_health_subtab', 'training');
                      onNavigate('health');
                    }}
                    className="glass-pill-crimson text-xs py-1 px-3 cursor-pointer hover:bg-white/[0.06] active:scale-98 transition-transform"
                  >
                    {lang === 'vi' ? 'Xem giáo án' : 'View Plan'}
                  </button>
                </div>
              </div>

              {/* REAL NUTRITION LOG CARD */}
              <div className="glass-panel p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      {lang === 'vi' ? 'Nhật Ký Dinh Dưỡng' : 'Nutrition Log'}
                    </h3>
                    <div className="text-xs font-black text-white mt-0.5 font-mono">
                      {caloriesConsumed > 0 ? (
                        <>{caloriesConsumed} <span className="font-normal text-slate-400">/ {targetCalories} kcal</span></>
                      ) : (
                        <span className="text-slate-400 font-normal">Chưa ghi nhận calo hôm nay</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={onOpenMacroModal}
                    className="glass-pill text-xs py-1 px-2.5 text-rose-300 hover:text-white border-rose-500/30 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ghi nhận</span>
                  </button>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5 pt-1">
                  <div className="w-full h-2 rounded-full bg-white/[0.08] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-rose-500 to-rose-600 transition-all duration-700"
                      style={{ width: `${calPercent}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>Đạt: {calPercent}% mục tiêu</span>
                    <span>Còn lại: {Math.max(0, targetCalories - caloriesConsumed)} kcal</span>
                  </div>
                </div>

                {/* Macro Distribution Pills */}
                <div className="pt-2 border-t border-white/[0.08] grid grid-cols-3 gap-2 text-center">
                  <div className="p-1.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <span className="text-[10px] text-slate-400 block">Đạm</span>
                    <span className="text-xs font-bold text-rose-400 font-mono">{proteinG}g</span>
                  </div>
                  <div className="p-1.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <span className="text-[10px] text-slate-400 block">Carbs</span>
                    <span className="text-xs font-bold text-amber-400 font-mono">{carbsG}g</span>
                  </div>
                  <div className="p-1.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <span className="text-[10px] text-slate-400 block">Béo</span>
                    <span className="text-xs font-bold text-sky-400 font-mono">{fatG}g</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ROW 3: REAL USER HABIT CHECKLIST (Directly toggles real store habits!) */}
            <div className="glass-panel p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ListChecks className="w-4 h-4 text-rose-400" />
                  <h3 className="text-sm font-bold text-white">
                    {lang === 'vi' ? 'Thói Quen Kỷ Luật (Tích vào ô để hoàn thành)' : 'Active Habits (Tap checkbox to complete)'}
                  </h3>
                </div>
                <span className="text-[11px] font-bold text-rose-400 font-mono">
                  {completedHabitsCount} / {activeHabitsList.length} Đã xong
                </span>
              </div>

              {activeHabitsList.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  {activeHabitsList.map((habit) => {
                    const isDone = habit.completedDates.includes(today);
                    return (
                      <div
                        key={habit.id}
                        onClick={() => {
                          onToggleHabit?.(habit.id, today);
                        }}
                        className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${
                          isDone
                            ? 'bg-rose-500/10 border-rose-500/40 text-white'
                            : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/[0.08] text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 overflow-hidden pr-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: habit.color || '#e11d48' }}
                          />
                          <span className={`text-xs font-semibold truncate ${isDone ? 'line-through text-slate-400' : 'text-white'}`}>
                            {habit.title}
                          </span>
                        </div>

                        <div
                          className={`w-5 h-5 rounded-lg border shrink-0 flex items-center justify-center transition-colors ${
                            isDone
                              ? 'bg-rose-600 border-rose-500 text-white shadow-xs'
                              : 'border-white/20 bg-white/5'
                          }`}
                        >
                          {isDone && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 text-center text-xs text-slate-400 border border-dashed border-white/10 rounded-2xl">
                  Chưa có thói quen nào. Bấm vào Quản lý Công việc để tạo thói quen đầu tiên!
                </div>
              )}
            </div>
          </div>

          {/* ---------------------------------------------------------------------
              RIGHT COLUMN: 5 COLUMNS (Real Calendar Events Timeline!)
              --------------------------------------------------------------------- */}
          <div className="lg:col-span-5 glass-panel p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div>
                <div className="text-base sm:text-lg font-black text-white">
                  Lịch Trình Routine Hôm Nay
                </div>
                <span className="text-xs text-slate-400">
                  {todayEvents.length > 0 ? `${todayEvents.length} sự kiện theo kế hoạch` : 'Sự kiện sắp tới từ lịch của bạn'}
                </span>
              </div>

              <button
                onClick={() => onNavigate('month')}
                className="glass-pill text-xs py-1 px-3 text-rose-300 hover:text-white border-rose-500/30"
              >
                <span>Xem Tất Cả</span>
                
              </button>
            </div>

            {/* Connected Vertical Timeline of Real Events */}
            <div className="relative pt-1">
              <div className="absolute top-4 bottom-4 left-4 w-0.5 bg-gradient-to-b from-rose-500/80 via-white/20 to-transparent" />

              <div className="space-y-3.5">
                {displayTimelineEvents.length > 0 ? (
                  displayTimelineEvents.map((ev) => {
                    const timeLabel = ev.allDay ? 'Cả ngày' : `${ev.startTime || '00:00'} - ${ev.endTime || '23:59'}`;
                    const chipColor = ev.color || '#e11d48';
                    return (
                      <div
                        key={ev.id}
                        onClick={() => onOpenEvent(ev)}
                        className="relative pl-10 group cursor-pointer"
                      >
                        <div
                          className="absolute left-2.5 top-3.5 -translate-x-1/2 w-3 h-3 rounded-full border-2 border-[#090406] shadow-sm transition-transform group-hover:scale-125"
                          style={{ backgroundColor: chipColor }}
                        />

                        <div className="p-3.5 rounded-2xl bg-white/[0.035] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.22] backdrop-blur-md transition-all shadow-sm">
                          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                            <span className="font-mono flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {timeLabel}
                            </span>
                            <span
                              className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                              style={{
                                borderColor: `${chipColor}40`,
                                color: chipColor,
                                backgroundColor: `${chipColor}15`,
                              }}
                            >
                              {ev.startDate}
                            </span>
                          </div>

                          <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-rose-300 transition-colors">
                            {ev.title}
                          </h4>

                          {ev.description && (
                            <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                              {ev.description}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-6 text-xs text-slate-400">
                    Không có sự kiện nào trong lịch biểu.
                  </div>
                )}
              </div>
            </div>

            {/* Quick Add Form */}
            <div className="pt-3 border-t border-white/[0.08]">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!quickEventTitle.trim()) return;
                  if (onAddTask) {
                    onAddTask(quickEventTitle.trim());
                    notifySuccess('Đã thêm việc cần làm!', quickEventTitle.trim());
                    setQuickEventTitle('');
                  }
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={quickEventTitle}
                  onChange={(e) => setQuickEventTitle(e.target.value)}
                  placeholder="Thêm nhanh việc cần làm vào hôm nay..."
                  className="flex-1 glass-input px-3.5 py-2 text-xs text-white placeholder-slate-400"
                />
                <button
                  type="submit"
                  className="glass-pill-primary text-xs py-2 px-3.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
