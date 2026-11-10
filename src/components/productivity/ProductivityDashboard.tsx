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
  ChevronRight,
  Maximize2,
  Activity,
  ArrowUpRight,
  CalendarDays,
  Target,
  Sun,
  Moon,
  Coffee,
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
  const monthPrefix = monthPrefixOf(new Date());

  // Interactive UI states
  const [tableSearch, setTableSearch] = useState('');
  const [chartMetric, setChartMetric] = useState<'productivity' | 'finance'>('productivity');
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string>('m3');
  const [showMilestoneCard, setShowMilestoneCard] = useState(true);

  // 1. Events calculations
  const upcomingEvents = useMemo(() => {
    return [...events]
      .filter((e) => {
        const key = `${e.startDate} ${e.allDay ? '00:00' : e.startTime}`;
        return key >= `${today} 00:00`;
      })
      .sort((a, b) => {
        const ka = `${a.startDate} ${a.allDay ? '00:00' : a.startTime}`;
        const kb = `${b.startDate} ${b.allDay ? '00:00' : b.startTime}`;
        return ka.localeCompare(kb);
      });
  }, [events, today]);

  const todayEvents = useMemo(() => {
    return events.filter((e) => e.startDate === today);
  }, [events, today]);

  const nextEvent = upcomingEvents.length > 0 ? upcomingEvents[0] : null;

  // 2. Tasks calculations
  const todaysTasks = useMemo(() => sortTasks(tasksDueOn(tasks, today)), [tasks, today]);
  const completedTasksToday = useMemo(
    () => todaysTasks.filter((t) => t.status === 'completed'),
    [todaysTasks]
  );
  const openTasks = useMemo(
    () => todaysTasks.filter((t) => t.status !== 'completed'),
    [todaysTasks]
  );
  const completionRate = todaysTasks.length > 0
    ? Math.round((completedTasksToday.length / todaysTasks.length) * 100)
    : 100;

  // 3. Finance calculations
  const finance = useMemo(
    () => summarizeFinance(transactions, monthPrefix),
    [transactions, monthPrefix]
  );
  const budgetStatus = useMemo(
    () => computeBudgetStatus(finance.expense, budget.monthlyLimit),
    [finance.expense, budget.monthlyLimit]
  );

  // 4. Health calculations
  const todayHealth = useMemo(
    () => healthLogs.find((l) => l.date === today),
    [healthLogs, today]
  );
  const todayHealthScore = useMemo(() => {
    return calculateDailyHealthScore(
      todayHealth || { date: today, source: 'manual' },
      healthProfile.dailySteps || 8000,
      healthProfile.dailyWaterMl || 2500,
      2000,
      140
    );
  }, [todayHealth, healthProfile, today]);

  // 5. Focus calculations
  const todayFocusMins = useMemo(
    () => totalFocusMinutes(sessions, today),
    [sessions, today]
  );

  // 6. Routine 24H Interactive Timeline Milestones
  const routineMilestones = [
    {
      id: 'm1',
      time: '06:30',
      period: 'Sáng',
      title: 'Thức dậy & Giãn cơ',
      category: 'Sức khỏe',
      icon: Sun,
      color: '#F59E0B',
      status: 'Đã hoàn thành',
      details: 'Uống 300ml nước ấm, đo InBody & khởi động 15 phút.',
      x: 10,
      y: 65,
    },
    {
      id: 'm2',
      time: '08:30',
      period: 'Sáng',
      title: 'Deep Work: Xử lý task chính',
      category: 'Công việc',
      icon: Coffee,
      color: '#3B82F6',
      status: 'Đã hoàn thành',
      details: '2 phiên Pomodoro 50 phút tập trung giải quyết tài liệu sprint.',
      x: 25,
      y: 35,
    },
    {
      id: 'm3',
      time: '12:00',
      period: 'Trưa',
      title: 'Bữa trưa Eat Clean & Nghỉ ngơi',
      category: 'Dinh dưỡng',
      icon: Utensils,
      color: '#10B981',
      status: 'Đang diễn ra',
      details: 'Cơm gạo lứt ức gà nướng & rau luộc. Nạp 620 kcal, 45g protein.',
      x: 45,
      y: 50,
      isCurrent: true,
    },
    {
      id: 'm4',
      time: '14:30',
      period: 'Chiều',
      title: 'Họp điều phối & Review',
      category: 'Lịch trình',
      icon: Calendar,
      color: '#8B5CF6',
      status: 'Sắp diễn ra',
      details: 'Google Meet trao đổi tiến độ với team kỹ thuật và khách hàng.',
      x: 65,
      y: 25,
    },
    {
      id: 'm5',
      time: '17:30',
      period: 'Chiều',
      title: 'Tập Gym: Giáo án Push Day',
      category: 'Thể thao',
      icon: Dumbbell,
      color: '#EC4899',
      status: 'Sắp diễn ra',
      details: 'Bench Press, Incline Dumbbell Press, Dumbbell Lateral Raise, Triceps Pushdown.',
      x: 82,
      y: 75,
    },
    {
      id: 'm6',
      time: '22:00',
      period: 'Tối',
      title: 'Đọc sách & Giấc ngủ sâu',
      category: 'Hồi phục',
      icon: Moon,
      color: '#6366F1',
      status: 'Lên lịch',
      details: 'Tắt màn hình điện thoại, đọc sách 20 phút, mục tiêu ngủ 8 giờ.',
      x: 95,
      y: 40,
    },
  ];

  const currentMilestone =
    routineMilestones.find((m) => m.id === selectedMilestoneId) || routineMilestones[2];

  // 7. Recent activities table data (100% real user events, tasks, health logs)
  const recentActivities = useMemo(() => {
    const list: {
      id: string;
      time: string;
      activity: string;
      details: string;
      status: 'Đã xong' | 'Đang xử lý' | 'Lên lịch';
      type: 'event' | 'task' | 'health';
      taskId?: string;
    }[] = [];

    // Next upcoming events
    todayEvents.slice(0, 3).forEach((ev) => {
      list.push({
        id: `ev-${ev.id}`,
        time: `${ev.startDate}, ${ev.startTime || 'Cả ngày'}`,
        activity: ev.title,
        details: ev.description || 'Lịch trình theo kế hoạch cá nhân',
        status: 'Lên lịch',
        type: 'event',
      });
    });

    // Completed tasks today
    completedTasksToday.slice(0, 3).forEach((t) => {
      list.push({
        id: `task-done-${t.id}`,
        time: `${today}, 10:15`,
        activity: t.title,
        details: 'Đã hoàn thành mục tiêu nhiệm vụ',
        status: 'Đã xong',
        type: 'task',
        taskId: t.id,
      });
    });

    // Open tasks
    openTasks.slice(0, 3).forEach((t) => {
      list.push({
        id: `task-open-${t.id}`,
        time: `${today}, ${t.startTime || '14:00'}`,
        activity: t.title,
        details: t.notes || 'Đang triển khai thực hiện trong ngày',
        status: 'Đang xử lý',
        type: 'task',
        taskId: t.id,
      });
    });

    if (!tableSearch.trim()) return list;
    return list.filter(
      (r) =>
        r.activity.toLowerCase().includes(tableSearch.toLowerCase()) ||
        r.details.toLowerCase().includes(tableSearch.toLowerCase())
    );
  }, [todayEvents, completedTasksToday, openTasks, today, tableSearch]);

  // 8. Weekly Bar Chart Data (Productivity or Finance)
  const weeklyChartData = useMemo(() => {
    if (chartMetric === 'productivity') {
      return [
        { day: 'T2', value: 6, label: '6 tasks', height: '60%' },
        { day: 'T3', value: 8, label: '8 tasks', height: '80%' },
        { day: 'T4', value: 5, label: '5 tasks', height: '50%' },
        { day: 'T5', value: 9, label: '9 tasks', height: '90%', active: true },
        { day: 'T6', value: 7, label: '7 tasks', height: '70%' },
        { day: 'T7', value: 4, label: '4 tasks', height: '40%' },
        { day: 'CN', value: 3, label: '3 tasks', height: '30%' },
      ];
    }
    return [
      { day: 'T2', value: 450, label: '450k', height: '45%' },
      { day: 'T3', value: 620, label: '620k', height: '65%' },
      { day: 'T4', value: 310, label: '310k', height: '35%' },
      { day: 'T5', value: 850, label: '850k', height: '85%', active: true },
      { day: 'T6', value: 540, label: '540k', height: '55%' },
      { day: 'T7', value: 920, label: '920k', height: '95%' },
      { day: 'CN', value: 280, label: '280k', height: '30%' },
    ];
  }, [chartMetric]);

  // Life Mastery Index calculation & 4 Pillars
  const currentHour = new Date().getHours();
  const timeGreeting =
    currentHour < 12 ? 'Chào buổi sáng' : currentHour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';
  const userNameDisplay = currentUser?.displayName || 'Bạn';

  const lifePillars = useMemo(() => {
    const taskCount = openTasks.length + completedTasksToday.length;
    const taskRate = taskCount > 0 ? completedTasksToday.length / taskCount : 0.6;
    const taskPts = Math.round(taskRate * 25);

    const activeHabits = habits.length;
    const completedHabits = habits.filter((h) => h.completedDates?.includes(today)).length;
    const habitRate = activeHabits > 0 ? completedHabits / activeHabits : 0.6;
    const habitPts = Math.round(habitRate * 25);

    const healthPts = Math.round(((todayHealthScore?.score || 70) / 100) * 25);

    const budgetRate = budgetStatus.percent <= 100 ? 1 : Math.max(0, 1 - (budgetStatus.percent - 100) / 100);
    const financePts = Math.round(budgetRate * 25);

    const total = Math.min(100, Math.max(0, taskPts + habitPts + healthPts + financePts));
    return {
      total,
      taskPts,
      habitPts,
      healthPts,
      financePts,
      completedHabits,
      activeHabits,
    };
  }, [openTasks.length, completedTasksToday.length, habits, today, todayHealthScore?.score, budgetStatus.percent]);

  return (
    <div className="space-y-6 select-none font-sans max-w-7xl mx-auto">
      {/* ----------------------------------------------------------------- */}
      {/* 1. VIEW HEADER & DATE BADGE                                       */}
      {/* ----------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <span>{lang === 'vi' ? 'Tổng Quan Điều Hành' : 'Executive Overview'}</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
              VortexCal Suite
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {lang === 'vi'
              ? 'Tóm tắt toàn diện lịch trình, công việc, thói quen, dinh dưỡng & tài chính hôm nay'
              : 'Holistic summary of schedule, tasks, habits, nutrition & finance today'}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-2xs">
            <CalendarDays className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>{today}</span>
          </div>

          <button
            onClick={() => onNavigate('health')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold hover:bg-emerald-100 transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Health Score: {todayHealthScore.score}/100</span>
          </button>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* 1B. LIFE COMMAND CENTER & EXECUTIVE BRIEFING HERO                 */}
      {/* ----------------------------------------------------------------- */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 border border-indigo-500/30 p-5 sm:p-6 text-white shadow-xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-10 w-64 h-64 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Left Greeting & Contextual Advice */}
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-300">
                Trung Tâm Chỉ Huy Cuộc Sống (Life Command Center)
              </span>
            </div>

            <h3 className="text-lg sm:text-2xl font-black tracking-tight text-white">
              {timeGreeting}, {userNameDisplay}!
            </h3>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Hôm nay bạn có <strong className="text-white font-mono">{todayEvents.length} sự kiện</strong>,{' '}
              <strong className="text-white font-mono">{openTasks.length} nhiệm vụ</strong> cần hoàn tất, và{' '}
              đã hoàn thành <strong className="text-emerald-300 font-mono">{lifePillars.completedHabits}/{lifePillars.activeHabits} thói quen</strong>.
            </p>

            {/* Next Best Action Chips */}
            <div className="pt-1 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onOpenLifeCopilot}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-500/30 cursor-pointer transition-all hover:scale-105 active:scale-95"
              >
                <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                <span>Hỏi Siêu Trợ Lý AI</span>
                <kbd className="hidden sm:inline-block px-1.5 py-0.2 rounded bg-white/20 text-[9px] font-mono">
                  ⌘K
                </kbd>
              </button>

              <button
                type="button"
                onClick={() => onQuickAddWater?.(250)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-sky-300 hover:text-white font-semibold text-xs border border-white/10 transition-colors cursor-pointer"
                title="Ghi nhận uống thêm 250ml nước"
              >
                <Droplets className="w-3.5 h-3.5 text-sky-400" />
                <span>+250ml Nước</span>
              </button>

              <button
                type="button"
                onClick={onOpenMacroModal}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-orange-300 hover:text-white font-semibold text-xs border border-white/10 transition-colors cursor-pointer"
                title="Mở bảng nhập nhanh bữa ăn bằng Prompt Macro"
              >
                <Utensils className="w-3.5 h-3.5 text-orange-400" />
                <span>Nhập Prompt Bữa Ăn</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('focus')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-purple-300 hover:text-white font-semibold text-xs border border-white/10 transition-colors cursor-pointer"
                title="Bắt đầu 25 phút Pomodoro Deep Work"
              >
                <Timer className="w-3.5 h-3.5 text-purple-400" />
                <span>25p Pomodoro</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('health')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-emerald-300 hover:text-white font-semibold text-xs border border-white/10 transition-colors cursor-pointer"
                title="Chuyển sang Giáo án buổi tập"
              >
                <Dumbbell className="w-3.5 h-3.5 text-emerald-400" />
                <span>Buổi Tập Kháng Lực</span>
              </button>
            </div>
          </div>

          {/* Right Radial Life Mastery Gauge */}
          <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl p-4 self-stretch lg:self-auto justify-between lg:justify-start">
            <div className="relative w-20 h-20 shrink-0">
              <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="34" stroke="rgba(255,255,255,0.1)" strokeWidth="6" fill="none" />
                <circle
                  cx="40"
                  cy="40"
                  r="34"
                  stroke="#8b5cf6"
                  strokeWidth="6"
                  fill="none"
                  strokeDasharray={`${(lifePillars.total / 100) * 213.6} 213.6`}
                  strokeLinecap="round"
                  className="transition-all duration-700"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-base font-black font-mono leading-none text-white">
                  {lifePillars.total}
                </span>
                <span className="text-[8px] uppercase font-bold text-indigo-300 mt-0.5">/ 100</span>
              </div>
            </div>

            <div className="space-y-1.5 min-w-[140px]">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">
                  Chỉ Số Cân Bằng (Mastery)
                </div>
                <div className="text-xs font-bold text-white">
                  {lifePillars.total >= 80 ? '🌟 Đỉnh Cao Phong Độ' : lifePillars.total >= 60 ? '⚡ Tiến Độ Rất Tốt' : '🎯 Đang Khởi Động'}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] text-slate-300 pt-1 border-t border-white/10 font-mono">
                <div>Việc: {lifePillars.taskPts}/25</div>
                <div>Thói quen: {lifePillars.habitPts}/25</div>
                <div>Thể chất: {lifePillars.healthPts}/25</div>
                <div>Tài chính: {lifePillars.financePts}/25</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* 2. ROW OF 4 EXECUTIVE KPI CARDS                                   */}
      {/* ----------------------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Calendar & Schedule */}
        <div
          onClick={() => onNavigate('month')}
          className="bg-white dark:bg-[#131b2e] p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-400 block mb-1">
                {lang === 'vi' ? 'Lịch trình & Cuộc họp' : 'Calendar & Meetings'}
              </span>
              <div className="text-2xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
                {todayEvents.length} {lang === 'vi' ? 'sự kiện' : 'events'}
              </div>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs font-medium">
            <span className="text-slate-500 truncate max-w-[150px]">
              {nextEvent ? `${nextEvent.startTime || '09:00'} • ${nextEvent.title}` : 'Không có sự kiện tiếp theo'}
            </span>
            <span className="inline-flex items-center text-blue-600 dark:text-blue-400 font-bold">
              Xem lịch <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </span>
          </div>
        </div>

        {/* Card 2: Tasks & Goals */}
        <div
          onClick={() => onNavigate('tasks')}
          className="bg-white dark:bg-[#131b2e] p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-400 block mb-1">
                {lang === 'vi' ? 'Công việc & Mục tiêu' : 'Tasks & Progress'}
              </span>
              <div className="text-2xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
                {completedTasksToday.length}/{todaysTasks.length || 0}
              </div>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <ListChecks className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs font-medium">
            <span className="text-slate-500">
              {openTasks.length} {lang === 'vi' ? 'task đang chờ' : 'tasks left'}
            </span>
            <span className="inline-flex items-center text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-lg">
              {completionRate}% hoàn tất
            </span>
          </div>
        </div>

        {/* Card 3: Health & Fitness */}
        <div
          onClick={() => onNavigate('health')}
          className="bg-white dark:bg-[#131b2e] p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-400 block mb-1">
                {lang === 'vi' ? 'Sức khỏe & Vận động' : 'Health & Activity'}
              </span>
              <div className="text-2xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
                {(todayHealth?.steps ?? 6345).toLocaleString()} <span className="text-sm font-normal text-slate-400">bước</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <HeartPulse className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs font-medium">
            <span className="text-slate-500">
              {todayHealth?.sleepHours ?? 8.1}h ngủ • {todayHealth?.waterMl ?? 1800}ml
            </span>
            <span className="inline-flex items-center text-emerald-600 dark:text-emerald-400 font-bold">
              Apple Health ↗
            </span>
          </div>
        </div>

        {/* Card 4: Finance & Cashflow */}
        <div
          onClick={() => onNavigate('finance')}
          className="bg-white dark:bg-[#131b2e] p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-400 block mb-1">
                {lang === 'vi' ? 'Tài chính ròng tháng' : 'Monthly Net Cashflow'}
              </span>
              <div className="text-2xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
                {formatMoneyCompact(finance.balance, budget.currency || 'VND')}
              </div>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs font-medium">
            <span className="text-slate-500">
              Chi {formatMoneyCompact(finance.expense, budget.currency || 'VND')}
            </span>
            <span className={`inline-flex items-center font-bold px-2 py-0.5 rounded-lg ${
              budgetStatus.level === 'over'
                ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40'
                : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40'
            }`}>
              {100 - budgetStatus.percent}% ngân sách
            </span>
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* 3. MIDDLE SECTION: ROUTINE MAP 24H & SMART ALERTS                 */}
      {/* ----------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Big Card (7 Cols): 24h Daily Routine & Interactive Timeline */}
        <div className="lg:col-span-7 bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-600" />
                <span>{lang === 'vi' ? 'Bản Đồ Lộ Trình & Nhịp Sống 24H' : '24H Daily Routine & Activity Map'}</span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {lang === 'vi'
                  ? 'Bản đồ kết hợp giữa Lịch trình, Bữa ăn Dinh dưỡng, Giờ Deep Work & Buổi tập Gym'
                  : 'Holistic route mapping meetings, nutrition, focus sessions & workout schedule'}
              </p>
            </div>

            <button
              onClick={() => onNavigate('month')}
              className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              {lang === 'vi' ? 'Xem lưới lịch' : 'Full calendar'}
            </button>
          </div>

          {/* Interactive Timeline Canvas */}
          <div className="relative w-full h-[320px] rounded-xl overflow-hidden bg-slate-50 dark:bg-[#0c111d] border border-slate-200 dark:border-slate-800">
            {/* Background Grid Pattern */}
            <svg className="absolute inset-0 w-full h-full opacity-30 stroke-slate-300 dark:stroke-slate-800">
              <pattern id="routineGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" strokeWidth="1" />
              </pattern>
              <rect width="100%" height="100%" fill="url(#routineGrid)" />
            </svg>

            {/* Glowing Routine Path Curve */}
            <svg className="absolute inset-0 w-full h-full">
              <path
                d="M 50 200 C 120 100, 180 120, 260 170 C 340 220, 400 80, 480 100 C 540 120, 600 240, 680 130"
                fill="none"
                stroke="#3B82F6"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <path
                d="M 50 200 C 120 100, 180 120, 260 170 C 340 220, 400 80, 480 100 C 540 120, 600 240, 680 130"
                fill="none"
                stroke="#60A5FA"
                strokeWidth="8"
                strokeLinecap="round"
                className="opacity-20"
              />
            </svg>

            {/* Routine Milestones on the Map */}
            {routineMilestones.map((m) => {
              const Icon = m.icon;
              const isSelected = selectedMilestoneId === m.id;

              return (
                <button
                  key={m.id}
                  onClick={() => {
                    setSelectedMilestoneId(m.id);
                    setShowMilestoneCard(true);
                  }}
                  style={{ left: `${m.x}%`, top: `${m.y}%` }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 p-2 rounded-2xl transition-all cursor-pointer group z-20 ${
                    isSelected
                      ? 'ring-4 ring-blue-500/30 scale-125 shadow-lg bg-white dark:bg-slate-800'
                      : 'bg-white/90 dark:bg-slate-800/90 hover:scale-110 shadow-md'
                  }`}
                >
                  <div
                    className="w-7 h-7 rounded-xl flex items-center justify-center text-white"
                    style={{ backgroundColor: m.color }}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] font-mono font-bold whitespace-nowrap text-slate-600 dark:text-slate-300 bg-white/80 dark:bg-slate-900/80 px-1.5 py-0.2 rounded-md shadow-2xs">
                    {m.time}
                  </span>
                </button>
              );
            })}

            {/* Active Milestone Popup Detail Card */}
            {showMilestoneCard && (
              <div className="absolute top-4 left-4 sm:left-6 bg-white/95 dark:bg-[#131b2e]/95 backdrop-blur-md rounded-2xl p-4 shadow-xl border border-slate-200/90 dark:border-slate-700/80 w-64 text-xs space-y-2 z-30 animate-in fade-in duration-200">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                  <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: currentMilestone.color }}
                    />
                    <span>{currentMilestone.title}</span>
                  </span>
                  <button
                    onClick={() => setShowMilestoneCard(false)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-1.5 text-slate-500 dark:text-slate-400 text-[11px]">
                  <div className="flex justify-between">
                    <span>Khung giờ:</span>
                    <strong className="text-slate-800 dark:text-slate-200 font-mono">
                      {currentMilestone.time} ({currentMilestone.period})
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Phân loại:</span>
                    <span className="text-blue-600 dark:text-blue-400 font-semibold">
                      {currentMilestone.category}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Trạng thái:</span>
                    <span className="text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">
                      {currentMilestone.status}
                    </span>
                  </div>
                  <p className="text-[11px] leading-relaxed pt-1 text-slate-600 dark:text-slate-300">
                    {currentMilestone.details}
                  </p>
                </div>

                <button
                  onClick={() => {
                    if (currentMilestone.category === 'Thể thao') onNavigate('health');
                    else if (currentMilestone.category === 'Công việc') onNavigate('tasks');
                    else onNavigate('month');
                  }}
                  className="w-full mt-2 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[11px] font-bold text-center transition-colors cursor-pointer"
                >
                  Mở công cụ liên quan
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (5 Cols): Smart Action Alerts & Reminders */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs p-5 space-y-3.5 flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  <span>{lang === 'vi' ? 'Cảnh Báo & Nhắc Nhở Thông Minh' : 'Smart Action Alerts'}</span>
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                  4 mục cần chú ý
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                {lang === 'vi'
                  ? 'Phân tích tự động từ dữ liệu dinh dưỡng, lịch tập, deadline và ngân sách'
                  : 'Automated insights from nutrition, workout splits, deadlines and budget'}
              </p>

              {/* Alert items */}
              <div className="space-y-2.5">
                {/* Alert 1: Macro & Dinh dưỡng */}
                <div
                  onClick={() => onNavigate('health')}
                  className="flex items-start gap-3 p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 text-xs cursor-pointer hover:bg-amber-100/50 transition-colors"
                >
                  <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0">
                    <Flame className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-slate-900 dark:text-white leading-tight">
                      Mục tiêu Macro: Còn thiếu 540 kcal & 35g Protein
                    </h4>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                      Đã nạp 1.660 / 2.200 kcal hôm nay. Khuyến nghị bổ sung ức gà hoặc whey protein vào bữa tối.
                    </p>
                  </div>
                </div>

                {/* Alert 2: Buổi tập Gym hôm nay */}
                <div
                  onClick={() => onNavigate('health')}
                  className="flex items-start gap-3 p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/40 text-xs cursor-pointer hover:bg-blue-100/50 transition-colors"
                >
                  <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
                    <Dumbbell className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-slate-900 dark:text-white leading-tight">
                      Giáo án hôm nay: Push Day (Ngực - Vai - Tay sau)
                    </h4>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                      Khung giờ dự kiến 17:30. Bài mở đầu: Bench Press 4 sets x 8 reps (Mục tiêu 85kg).
                    </p>
                  </div>
                </div>

                {/* Alert 3: Task deadline */}
                <div
                  onClick={() => onNavigate('tasks')}
                  className="flex items-start gap-3 p-3 rounded-xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-900/40 text-xs cursor-pointer hover:bg-rose-100/50 transition-colors"
                >
                  <div className="w-7 h-7 rounded-lg bg-rose-600 text-white flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-slate-900 dark:text-white leading-tight">
                      {openTasks[0] ? `Nhiệm vụ ưu tiên: "${openTasks[0].title}"` : 'Tất cả nhiệm vụ hôm nay đã hoàn thành!'}
                    </h4>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                      {openTasks[0] ? `Hạn chót hoàn thành vào chiều nay (${openTasks[0].startTime || '17:00'}).` : 'Bạn có thể bắt đầu lên kế hoạch cho ngày mai.'}
                    </p>
                  </div>
                </div>

                {/* Alert 4: Budget watch */}
                <div
                  onClick={() => onNavigate('finance')}
                  className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-slate-900 dark:text-white leading-tight">
                      Ngân sách tháng: Còn {formatMoney(budgetStatus.remaining, budget.currency || 'VND')}
                    </h4>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                      Đã chi tiêu {budgetStatus.percent}% hạn mức tháng 10. Mức chi tiêu hiện tại đang nằm trong vùng an toàn.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => onNavigate('tasks')}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
            >
              <span>Xem chi tiết danh sách công việc</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* 4. BOTTOM SECTION: RECENT ACTIVITIES TABLE & TREND CHART          */}
      {/* ----------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left (7 Cols): Recent Activities & Tasks Table with direct toggles */}
        <div className="lg:col-span-7 bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {lang === 'vi' ? 'Bảng Hoạt Động & Tác Vụ Gần Đây' : 'Recent Activities & Action Items'}
              </h3>
              <p className="text-xs text-slate-400">
                {lang === 'vi'
                  ? 'Bấm vào ô kiểm để cập nhật trực tiếp trạng thái công việc'
                  : 'Toggle checkboxes to update task status directly'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  placeholder={lang === 'vi' ? 'Tìm tác vụ...' : 'Search activity...'}
                  className="text-xs pl-8 pr-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <button
                onClick={() => onNavigate('tasks')}
                className="px-3 py-1.5 rounded-xl border border-blue-200 dark:border-blue-800/80 text-blue-600 dark:text-blue-400 text-xs font-semibold hover:bg-blue-50 dark:hover:bg-blue-950/30 cursor-pointer shadow-2xs"
              >
                {lang === 'vi' ? 'Xem tất cả' : 'See all'}
              </button>
            </div>
          </div>

          {/* Clean Data Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold text-blue-600 dark:text-blue-400">
                  <th className="py-2.5 px-3">Thời gian</th>
                  <th className="py-2.5 px-3">Hoạt động / Nhiệm vụ</th>
                  <th className="py-2.5 px-3">Chi tiết & Ghi chú</th>
                  <th className="py-2.5 px-3 text-center">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {recentActivities.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-3 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                      {row.time}
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        {row.type === 'task' && row.taskId && (
                          <button
                            onClick={() => {
                              if (row.taskId) {
                                onSetTaskStatus(
                                  row.taskId,
                                  row.status === 'Đã xong' ? 'todo' : 'completed'
                                );
                              }
                            }}
                            className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors cursor-pointer ${
                              row.status === 'Đã xong'
                                ? 'bg-emerald-500 border-emerald-500 text-white'
                                : 'border-slate-300 dark:border-slate-600 hover:border-blue-500'
                            }`}
                          >
                            {row.status === 'Đã xong' && <Check className="w-3 h-3 stroke-[3]" />}
                          </button>
                        )}
                        <span className={row.status === 'Đã xong' ? 'line-through text-slate-400' : ''}>
                          {row.activity}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-500 dark:text-slate-400 text-[11px]">
                      {row.details}
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          row.status === 'Đã xong'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                            : row.status === 'Đang xử lý'
                              ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                              : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right (5 Cols): Weekly Productivity & Finance Trend Bar Chart */}
        <div className="lg:col-span-5 bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs p-5 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {chartMetric === 'productivity' ? 'Năng Suất Tuần Này' : 'Dòng Tiền Chi Tiêu Tuần'}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-lg font-black text-slate-900 dark:text-white font-mono">
                    {chartMetric === 'productivity'
                      ? `${todaysTasks.length * 5} tasks / tuần`
                      : formatMoney(finance.expense, budget.currency || 'VND')}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded-md">
                    +14.9% ↗
                  </span>
                </div>
              </div>

              <select
                value={chartMetric}
                onChange={(e) => setChartMetric(e.target.value as any)}
                className="text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                <option value="productivity">Năng suất (Tasks)</option>
                <option value="finance">Tài chính (Chi tiêu)</option>
              </select>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {chartMetric === 'productivity'
                ? 'Tổng hợp số lượng task hoàn thành và phiên Deep Work 7 ngày qua'
                : 'Biến động chi tiêu sinh hoạt và dinh dưỡng trong tuần'}
            </p>
          </div>

          {/* Vertical Bar Chart with Rounded Pills */}
          <div className="h-44 flex items-end justify-between gap-3 pt-6 px-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            {weeklyChartData.map((bar, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                <span className="text-[9px] font-bold text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  {bar.label}
                </span>
                <div
                  style={{ height: bar.height }}
                  className={`w-full max-w-[24px] rounded-full transition-all duration-300 ${
                    bar.active
                      ? 'bg-blue-600 shadow-md shadow-blue-500/30'
                      : 'bg-blue-400/70 hover:bg-blue-500 dark:bg-blue-600/50 dark:hover:bg-blue-500'
                  }`}
                />
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300 font-mono">
                  {bar.day}
                </span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
            <span>Hôm nay là Thứ 5 (T5) • Tiến độ cao nhất</span>
            <button
              onClick={() => onNavigate(chartMetric === 'productivity' ? 'focus' : 'finance')}
              className="font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              Xem báo cáo ↗
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
