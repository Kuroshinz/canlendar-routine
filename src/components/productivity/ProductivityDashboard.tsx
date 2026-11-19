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
  ArrowUpRight,
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
import { formatDateString } from '../../utils/calendarUtils';
import { calculateDailyHealthScore } from '../../utils/fitnessMetrics';

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

  // Active Category Filter
  const [activeTab, setActiveTab] = useState<'all' | 'activity' | 'nutrition' | 'sleep' | 'habits'>('all');
  const [copiedCode, setCopiedCode] = useState(false);
  const [activeWorkoutType, setActiveWorkoutType] = useState<'cardio' | 'strength' | 'muscle' | 'nutrition'>('strength');

  // Today's log & health score
  const todayLog = useMemo(() => healthLogs.find((l) => l.date === today), [healthLogs, today]);
  const fallbackLog: HealthDayLog = useMemo(
    () => todayLog || { date: today, steps: 7200, waterMl: 2000, caloriesIn: 1850, protein: 140 },
    [todayLog, today]
  );
  const todayHealthScore = useMemo(
    () => calculateDailyHealthScore(fallbackLog, healthProfile?.dailySteps || 8000, healthProfile?.dailyWaterMl || 2500),
    [fallbackLog, healthProfile]
  );

  // Today's schedule events
  const todayEvents = useMemo(() => {
    return [...events]
      .filter((e) => e.startDate === today || (e.startDate <= today && e.endDate >= today))
      .sort((a, b) => (a.startTime || '00:00').localeCompare(b.startTime || '00:00'));
  }, [events, today]);

  // Fallback routine events if today has few events
  const timelineItems = useMemo(() => {
    if (todayEvents.length > 0) {
      return todayEvents.map((ev, idx) => ({
        id: ev.id,
        time: ev.allDay ? 'Cả ngày' : `${ev.startTime} - ${ev.endTime}`,
        title: ev.title,
        color: ev.color || (idx % 2 === 0 ? '#10b981' : '#f43f5e'),
        tag: ev.allDay ? 'Toàn thời gian' : 'Sự kiện lịch',
        rawEvent: ev as CalendarEvent | undefined,
      }));
    }
    return [
      {
        id: 't-1',
        time: '07:00 - 08:00 AM',
        title: lang === 'vi' ? 'Thức dậy & Thiền Định Năng Lượng' : 'Morning Meditation & Hydration',
        color: '#10b981',
        tag: lang === 'vi' ? 'Sức khỏe' : 'Wellness',
        rawEvent: undefined as CalendarEvent | undefined,
      },
      {
        id: 't-2',
        time: '08:30 - 11:30 AM',
        title: lang === 'vi' ? 'Deep Work: Phát triển Hệ Thống VortexCal' : 'Deep Work: VortexCal Core Focus',
        color: '#f43f5e',
        tag: lang === 'vi' ? 'Năng suất' : 'Productivity',
        rawEvent: undefined as CalendarEvent | undefined,
      },
      {
        id: 't-3',
        time: '12:00 - 01:00 PM',
        title: lang === 'vi' ? 'Bữa Trưa Dinh Dưỡng Giàu Protein' : 'High Protein Nutrition Lunch',
        color: '#f59e0b',
        tag: lang === 'vi' ? 'Dinh dưỡng' : 'Nutrition',
        rawEvent: undefined as CalendarEvent | undefined,
      },
      {
        id: 't-4',
        time: '05:30 - 06:45 PM',
        title: lang === 'vi' ? 'Buổi Tập Gym Kháng Lực & Giãn Cơ' : 'Resistance Training & Stretching',
        color: '#ec4899',
        tag: lang === 'vi' ? 'Luyện tập' : 'Workout',
        rawEvent: undefined as CalendarEvent | undefined,
      },
      {
        id: 't-5',
        time: '10:00 - 10:30 PM',
        title: lang === 'vi' ? 'Đọc Sách & Chuẩn Bị Giấc Ngủ Sâu' : 'Reading & Sleep Wind-Down',
        color: '#06b6d4',
        tag: lang === 'vi' ? 'Hồi phục' : 'Recovery',
        rawEvent: undefined as CalendarEvent | undefined,
      },
    ];
  }, [todayEvents, lang]);

  // Calorie & Macro calculations
  const consumedCalories = todayLog?.caloriesIn || 1850;
  const targetCalories = 2200;
  const calPercent = Math.min(100, Math.round((consumedCalories / targetCalories) * 100));

  const proteinG = todayLog?.protein || 145;
  const carbsG = todayLog?.carbs || 190;
  const fatG = todayLog?.fat || 52;

  // Sleep hours
  const sleepHours = todayLog?.sleepHours || 7.8;

  const handleCopyCode = () => {
    navigator.clipboard?.writeText('VORTEX-30DAY-STREAK');
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  // Day indicators for mini calendar
  const weekDays = [
    { dayName: 'CN', num: 15, isToday: false, hasDot: false },
    { dayName: 'T2', num: 16, isToday: false, hasDot: true, dotColor: '#f59e0b' },
    { dayName: 'T3', num: 17, isToday: false, hasDot: true, dotColor: '#10b981' },
    { dayName: 'T4', num: 18, isToday: false, hasDot: true, dotColor: '#f43f5e' },
    { dayName: 'T5', num: 19, isToday: true, hasDot: true, dotColor: '#f43f5e' },
    { dayName: 'T6', num: 20, isToday: false, hasDot: true, dotColor: '#06b6d4' },
    { dayName: 'T7', num: 21, isToday: false, hasDot: false },
  ];

  return (
    <div className="relative select-none font-sans max-w-7xl mx-auto space-y-8 pb-16">
      {/* =========================================================================
          BACKGROUND WATERMARK: VORTEX (As in ZENOX image background)
          ========================================================================= */}
      <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-center pointer-events-none select-none z-0 overflow-hidden w-full max-w-6xl">
        <span className="text-[110px] sm:text-[180px] lg:text-[240px] font-black tracking-[0.22em] text-white/[0.035] uppercase block leading-none">
          VORTEX
        </span>
      </div>

      {/* =========================================================================
          1. THE ICONIC ZENOX HERO SHOWCASE (Direct 1:1 Composition of User's Image)
          ========================================================================= */}
      <div className="relative z-10 pt-4 pb-6 px-2 sm:px-4">
        {/* Top Header Pill Nav within the Hero (matching ZENOX top bar) */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <span className="text-xl sm:text-2xl font-black tracking-widest text-white uppercase">
              VORTEX<span className="text-rose-500">CAL</span>
            </span>
          </div>

          <div className="hidden md:flex items-center gap-1.5 p-1 rounded-full bg-white/[0.05] border border-white/[0.12] backdrop-blur-xl">
            {[
              { id: 'all', labelVi: 'Tổng quan', labelEn: 'Overview' },
              { id: 'activity', labelVi: 'Hoạt động', labelEn: 'Activity' },
              { id: 'nutrition', labelVi: 'Dinh dưỡng', labelEn: 'Nutrition' },
              { id: 'sleep', labelVi: 'Giấc ngủ', labelEn: 'Sleep' },
              { id: 'habits', labelVi: 'Thói quen', labelEn: 'Habits' },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'glass-pill-primary text-slate-950 shadow-md'
                      : 'text-slate-300 hover:text-white hover:bg-white/[0.06]'
                  }`}
                >
                  {lang === 'vi' ? tab.labelVi : tab.labelEn}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenLifeCopilot}
              className="glass-pill-crimson text-xs cursor-pointer shadow-md"
            >
              <Sparkles className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
              <span>{lang === 'vi' ? 'Trợ lý AI' : 'AI Copilot'}</span>
            </button>
          </div>
        </div>

        {/* Central Display: 3D Emblem Centerpiece with Surrounding Floating HUD Cards */}
        <div className="relative min-h-[380px] sm:min-h-[440px] flex items-center justify-center my-4">
          {/* Ambient Crimson Halo Glow */}
          <div className="absolute w-72 sm:w-96 h-72 sm:h-96 rounded-full bg-gradient-to-tr from-rose-600/40 via-rose-500/25 to-transparent blur-3xl pointer-events-none" />

          {/* Center 3D Vortex Emblem */}
          <div className="relative z-10 flex flex-col items-center justify-center group cursor-pointer">
            <div className="relative w-48 h-48 sm:w-64 sm:h-64 flex items-center justify-center transition-transform duration-700 group-hover:scale-105">
              <img
                src="/logo-icon.png"
                alt="VortexCal 3D Emblem"
                className="w-full h-full object-contain filter drop-shadow-[0_12px_45px_rgba(225,29,72,0.65)]"
              />
            </div>
          </div>

          {/* FLOATING HUD CARD: LEFT (Matching ZENOX Left Glass Callout) */}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 hidden lg:flex flex-col max-w-xs p-4 sm:p-5 rounded-3xl bg-white/[0.04] backdrop-blur-2xl border border-white/[0.12] shadow-2xl z-20 transition-transform hover:-translate-y-[52%]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                INNOVATION • ROUTINE • BIOMETRICS
              </span>
              <button
                onClick={() => onNavigate('health')}
                className="w-6 h-6 rounded-full bg-rose-500/30 border border-rose-500/50 flex items-center justify-center text-rose-300 hover:text-white transition-colors"
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wide text-white leading-snug">
              ENGINEERED FOR THOSE WHO DEMAND PEAK ROUTINE PERFORMANCE IN EVERY MOMENT.
            </h3>

            <div className="mt-4 pt-3 border-t border-white/[0.08] flex items-center gap-3">
              <div className="flex -space-x-2">
                <div className="w-6 h-6 rounded-full bg-rose-600 border border-slate-900 flex items-center justify-center text-[10px] text-white font-bold">
                  A
                </div>
                <div className="w-6 h-6 rounded-full bg-amber-500 border border-slate-900 flex items-center justify-center text-[10px] text-white font-bold">
                  N
                </div>
                <div className="w-6 h-6 rounded-full bg-emerald-500 border border-slate-900 flex items-center justify-center text-[10px] text-white font-bold">
                  K
                </div>
              </div>
              <span className="text-[11px] font-semibold text-slate-300">
                10k+ Thành viên Kỷ Luật
              </span>
            </div>
          </div>

          {/* FLOATING HUD CARD: BOTTOM-CENTER DIAL (Matching ZENOX '80+ Hours EXTENDED BATTERY LIFE') */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 hidden sm:flex items-center gap-4 px-6 py-3 rounded-full bg-black/40 backdrop-blur-xl border border-white/[0.1] shadow-2xl z-20">
            {/* Radial Ticks Dial */}
            <div className="relative w-12 h-12 rounded-full border border-rose-500/40 flex items-center justify-center shadow-lg">
              <div className="absolute inset-0 rounded-full dial-ticks-ring opacity-60" />
              <div className="flex flex-col items-center">
                <span className="text-xs font-black text-white font-mono leading-none">98%</span>
                <span className="text-[8px] text-rose-400 font-bold uppercase">Vital</span>
              </div>
            </div>

            <div className="flex flex-col">
              <span className="text-xs font-black tracking-wider uppercase text-white">
                VORTEX VITALITY & BIO-RHYTHM
              </span>
              <span className="text-[10px] text-slate-400">
                Hệ thống nhịp sinh học duy trì năng lượng & kỷ luật cao độ suốt 24h
              </span>
            </div>
          </div>

          {/* FLOATING HUD CARD: RIGHT UPPER (Matching ZENOX 'ADVANCED AUDIO TECHNOLOGY') */}
          <div className="absolute right-0 top-6 hidden lg:flex flex-col max-w-[240px] p-4 rounded-3xl bg-gradient-to-br from-rose-950/40 to-black/60 backdrop-blur-2xl border border-rose-500/25 shadow-2xl z-20">
            <div className="flex items-center justify-between gap-3 mb-2">
              <div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-rose-400 block">
                  VORTEX BIOMETRICS
                </span>
                <span className="text-xs font-extrabold text-white uppercase">
                  ADVANCED AI & BIO-SYNC ENGINE
                </span>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-rose-600/20 border border-rose-500/40 flex items-center justify-center shrink-0">
                <Activity className="w-5 h-5 text-rose-400" />
              </div>
            </div>
            {/* Red progress line indicator */}
            <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden mt-1">
              <div className="w-3/4 h-full bg-gradient-to-r from-rose-500 to-rose-400 rounded-full" />
            </div>
          </div>

          {/* FLOATING HUD CARD: RIGHT LOWER (Matching ZENOX 'Designed for immersive sound...' + 'Pre-Order Now') */}
          <div className="absolute right-0 bottom-4 hidden lg:flex flex-col items-end text-right max-w-xs z-20">
            <p className="text-xs text-slate-300 font-medium leading-relaxed mb-3">
              {lang === 'vi'
                ? 'Thiết kế cho năng suất tối đa, kiểm soát dinh dưỡng chuẩn xác và kỷ luật bền bỉ mỗi ngày.'
                : 'Designed for peak productivity, macro precision, and lasting vitality wherever you go.'}
            </p>
            <button
              onClick={() => onNavigate('month')}
              className="glass-pill-primary text-xs font-extrabold px-6 py-2.5 shadow-2xl hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center gap-2"
            >
              <span>{lang === 'vi' ? 'Bắt Đầu Lịch Trình' : 'Start Routine Now'}</span>
              <ArrowUpRight className="w-4 h-4 text-slate-950" />
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          2. THE WELLNESS HUB MATRIX (Image 3 Left Grid + Image 3 Right Timeline)
          ========================================================================= */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* -----------------------------------------------------------------------
            LEFT COLUMN: 7 COLUMNS (Wellness Hub Cards in Frosted Crimson Glass)
            ----------------------------------------------------------------------- */}
        <div className="lg:col-span-7 space-y-6">
          {/* TOP ROW: 3 HERO CARDS (Health Gauge, Sleep Curve, 30-Day Routine) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* CARD 1: DAILY HEALTH SCORE GAUGE */}
            <div className="glass-panel p-5 flex flex-col justify-between relative overflow-hidden group">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-300">
                  {lang === 'vi' ? 'Điểm Sức Khỏe' : 'Daily Health'}
                </span>
                <button
                  onClick={() => onNavigate('health')}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>

              {/* Arc Meter Gauge */}
              <div className="relative flex flex-col items-center justify-center my-1">
                <div className="text-2xl font-black tracking-tight text-white">
                  {todayHealthScore.score}
                  <span className="text-xs font-normal text-slate-400">/100</span>
                </div>

                {/* Half Circle SVG Gauge */}
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
                      className="transition-all duration-1000 ease-out"
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

              <div className="mt-2 pt-2 border-t border-white/[0.08] flex items-center justify-center">
                <button
                  onClick={() => onNavigate('health')}
                  className="glass-pill text-[11px] py-1 px-3 text-slate-200 hover:text-white"
                >
                  {lang === 'vi' ? 'Xem chi tiết' : 'View Today'}
                </button>
              </div>
            </div>

            {/* CARD 2: SLEEP TRACKING SPLINE CURVE */}
            <div className="glass-panel p-5 flex flex-col justify-between relative overflow-hidden">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-300">
                  {lang === 'vi' ? 'Giấc Ngủ' : 'Sleep Tracking'}
                </span>
                <span className="text-xs font-black text-rose-400 font-mono">
                  {sleepHours} <span className="text-[10px] font-normal text-slate-400">hrs</span>
                </span>
              </div>

              {/* Smooth Spline SVG Chart */}
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

              {/* Mon - Sun Labels */}
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold px-1">
                <span>T2</span>
                <span>T3</span>
                <span>T4</span>
                <span className="text-rose-400 font-bold">T5</span>
                <span>T6</span>
                <span>T7</span>
                <span>CN</span>
              </div>
            </div>

            {/* CARD 3: 30-DAY ROUTINE CHALLENGE */}
            <div className="glass-panel p-5 flex flex-col justify-between relative overflow-hidden bg-gradient-to-br from-white/[0.04] to-rose-950/20 border-rose-500/20">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                  <span className="text-xs font-bold text-white">
                    {lang === 'vi' ? 'Thử Thách 30 Ngày' : '30-Day Challenge'}
                  </span>
                </div>
              </div>

              <div className="my-2">
                <div className="text-lg font-black text-white">
                  18 <span className="text-xs font-normal text-slate-400">/ 30 ngày 🔥</span>
                </div>
                <p className="text-[10px] text-slate-300 mt-0.5 line-clamp-1">
                  {lang === 'vi' ? 'Chuỗi hoàn thành thói quen' : 'Active routine streak'}
                </p>
              </div>

              <button
                onClick={handleCopyCode}
                className="glass-pill text-[10px] py-1 px-2.5 w-full flex items-center justify-center gap-1.5 text-rose-200 hover:text-white border-rose-500/30"
              >
                {copiedCode ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>{lang === 'vi' ? 'Đã sao chép!' : 'Copied!'}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>{lang === 'vi' ? 'Mã Thử Thách' : 'COPY CODE'}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* BOTTOM ROW: WORKOUT PLAN & NUTRITION LOG */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* WORKOUT PLAN CARD */}
            <div className="glass-panel p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {lang === 'vi' ? 'Kế Hoạch Luyện Tập' : 'Workout Plan'}
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    {lang === 'vi' ? 'Giáo án Thể Hình & Cardio' : 'Cardio & Strength Split'}
                  </span>
                </div>
                <button
                  onClick={() => onNavigate('health')}
                  className="text-slate-400 hover:text-white"
                >
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>

              {/* 4 Category Icon Pills */}
              <div className="flex items-center gap-2 pt-1">
                {[
                  { id: 'cardio', icon: Footprints, label: 'Cardio' },
                  { id: 'strength', icon: Dumbbell, label: 'Tạ' },
                  { id: 'muscle', icon: Zap, label: 'Cơ' },
                  { id: 'nutrition', icon: Utensils, label: 'Macro' },
                ].map((item) => {
                  const isSelected = activeWorkoutType === item.id;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveWorkoutType(item.id as any)}
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                        isSelected
                          ? 'glass-pill-primary text-slate-950 scale-105 shadow-md'
                          : 'glass-pill text-slate-300 hover:text-white'
                      }`}
                      title={item.label}
                    >
                      <Icon className="w-4 h-4" />
                    </button>
                  );
                })}
              </div>

              {/* Workout Details Preview */}
              <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between">
                <div className="text-xs">
                  <span className="font-semibold text-white">
                    {activeWorkoutType === 'strength'
                      ? 'Upper Body Hypertrophy'
                      : activeWorkoutType === 'cardio'
                      ? 'Zone 2 Cardio 35p'
                      : activeWorkoutType === 'muscle'
                      ? 'Core & Abs Burner'
                      : 'High Protein Recovery'}
                  </span>
                  <p className="text-[10px] text-slate-400">45 phút • 350 kcal đốt cháy</p>
                </div>
                <button
                  onClick={() => onNavigate('health')}
                  className="glass-pill-crimson text-xs py-1 px-3"
                >
                  {lang === 'vi' ? 'Bắt đầu ↗' : 'Start ↗'}
                </button>
              </div>
            </div>

            {/* NUTRITION LOG CARD */}
            <div className="glass-panel p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {lang === 'vi' ? 'Nhật Ký Dinh Dưỡng' : 'Nutrition Log'}
                  </h3>
                  <div className="text-xs font-black text-white mt-0.5 font-mono">
                    {consumedCalories} <span className="font-normal text-slate-400">/ {targetCalories} kcal</span>
                  </div>
                </div>
                <button
                  onClick={onOpenMacroModal}
                  className="glass-pill text-xs py-1 px-2.5 text-rose-300 hover:text-white border-rose-500/30"
                  title="Nhập Prompt Macro Bữa Ăn"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{lang === 'vi' ? 'Nhập ăn' : 'Add'}</span>
                </button>
              </div>

              {/* Glowing Progress Bar */}
              <div className="space-y-1.5 pt-1">
                <div className="w-full h-2 rounded-full bg-white/[0.08] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-rose-500 to-rose-600 transition-all duration-700"
                    style={{ width: `${calPercent}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>Tiến độ calo: {calPercent}%</span>
                  <span>Còn lại: {Math.max(0, targetCalories - consumedCalories)} kcal</span>
                </div>
              </div>

              {/* Macro Pills Breakdown */}
              <div className="pt-2 border-t border-white/[0.08] grid grid-cols-3 gap-2 text-center">
                <div className="p-1.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <span className="text-[10px] text-slate-400 block">Đạm</span>
                  <span className="text-xs font-bold text-rose-400 font-mono">{proteinG}g</span>
                </div>
                <div className="p-1.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <span className="text-[10px] text-slate-400 block">Tinh bột</span>
                  <span className="text-xs font-bold text-amber-400 font-mono">{carbsG}g</span>
                </div>
                <div className="p-1.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <span className="text-[10px] text-slate-400 block">Chất béo</span>
                  <span className="text-xs font-bold text-sky-400 font-mono">{fatG}g</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* -----------------------------------------------------------------------
            RIGHT COLUMN: 5 COLUMNS (Connected Vertical Timeline Schedule)
            ----------------------------------------------------------------------- */}
        <div className="lg:col-span-5 glass-panel p-6 space-y-6">
          {/* Header & Date Selector */}
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
            <div>
              <div className="text-base sm:text-lg font-black text-white">
                {lang === 'vi' ? 'Thứ Năm, 19 Tháng 11' : 'Thursday, Nov 19'}
              </div>
              <span className="text-xs text-slate-400">
                {lang === 'vi' ? 'Lịch trình & Thói quen hôm nay' : "Today's Schedule & Routine"}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button className="p-1.5 rounded-full glass-pill hover:scale-105">
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button className="p-1.5 rounded-full glass-pill hover:scale-105">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Mini Calendar Week Selector with Status Dots */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {weekDays.map((d, i) => (
              <div
                key={i}
                className={`flex flex-col items-center py-2 px-1 rounded-2xl transition-all cursor-pointer ${
                  d.isToday
                    ? 'glass-pill-primary text-slate-950 font-bold shadow-md'
                    : 'hover:bg-white/[0.06] text-slate-300'
                }`}
              >
                <span className="text-[10px] uppercase font-semibold">{d.dayName}</span>
                <span className="text-xs font-bold mt-0.5">{d.num}</span>
                {d.hasDot && !d.isToday && (
                  <span
                    className="w-1.5 h-1.5 rounded-full mt-1"
                    style={{ backgroundColor: d.dotColor }}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Connected Vertical Timeline */}
          <div className="relative pt-2">
            {/* Vertical Connecting Line */}
            <div className="absolute top-4 bottom-4 left-4 w-0.5 bg-gradient-to-b from-rose-500/80 via-white/20 to-transparent" />

            <div className="space-y-4">
              {timelineItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    if (item.rawEvent) {
                      onOpenEvent(item.rawEvent);
                    }
                  }}
                  className="relative pl-10 group cursor-pointer"
                >
                  {/* Glowing Node Dot */}
                  <div
                    className="absolute left-2.5 top-3.5 -translate-x-1/2 w-3 h-3 rounded-full border-2 border-[#090406] shadow-sm transition-transform group-hover:scale-125"
                    style={{ backgroundColor: item.color }}
                  />

                  {/* Glass Event Card */}
                  <div className="p-3.5 rounded-2xl bg-white/[0.035] hover:bg-white/[0.07] border border-white/[0.08] hover:border-white/[0.2] backdrop-blur-md transition-all shadow-sm">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                      <span className="font-mono flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {item.time}
                      </span>
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                        style={{
                          borderColor: `${item.color}50`,
                          color: item.color,
                          backgroundColor: `${item.color}15`,
                        }}
                      >
                        {item.tag}
                      </span>
                    </div>

                    <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-rose-300 transition-colors">
                      {item.title}
                    </h4>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
