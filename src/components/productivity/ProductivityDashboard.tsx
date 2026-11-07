import React, { useMemo, useState } from 'react';
import {
  LayoutDashboard,
  Calendar,
  ListChecks,
  Timer,
  Wallet,
  HeartPulse,
  TrendingUp,
  TrendingDown,
  Bell,
  Mail,
  Search,
  MoreHorizontal,
  Plus,
  Minus,
  Maximize2,
  AlertTriangle,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Flame,
  Droplets,
  Footprints,
  Sparkles,
  Settings,
  LogOut,
  ChevronDown,
  Check,
  ShieldCheck,
  Zap,
  X,
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
  isHabitDoneOn,
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
}) => {
  const today = formatDateString(new Date());
  const monthPrefix = monthPrefixOf(new Date());

  // Interactive UI states
  const [searchQuery, setSearchQuery] = useState('');
  const [tableSearch, setTableSearch] = useState('');
  const [timeRange, setTimeRange] = useState<'thisMonth' | 'thisWeek'>('thisMonth');
  const [showEventCard, setShowEventCard] = useState(true);
  const [mapZoom, setMapZoom] = useState(100);

  // Derived metrics
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

  const nextEvent = upcomingEvents.length > 0 ? upcomingEvents[0] : null;

  const todaysTasks = useMemo(() => sortTasks(tasksDueOn(tasks, today)), [tasks, today]);
  const completedTasksToday = useMemo(() => todaysTasks.filter((t) => t.status === 'completed'), [todaysTasks]);
  const openTasks = useMemo(() => todaysTasks.filter((t) => t.status !== 'completed'), [todaysTasks]);

  const finance = useMemo(() => summarizeFinance(transactions, monthPrefix), [transactions, monthPrefix]);
  const budgetStatus = useMemo(
    () => computeBudgetStatus(finance.expense, budget.monthlyLimit),
    [finance.expense, budget.monthlyLimit]
  );

  const todayHealth = useMemo(() => healthLogs.find((l) => l.date === today), [healthLogs, today]);
  const todayHealthScore = useMemo(() => {
    return calculateDailyHealthScore(
      todayHealth || { date: today, source: 'manual' },
      healthProfile.dailySteps || 8000,
      healthProfile.dailyWaterMl || 2500,
      2000,
      140
    );
  }, [todayHealth, healthProfile, today]);

  // Weekly bar data for Productivity Trend chart
  const weeklyBars = useMemo(() => {
    const days = ['Th 2', 'Th 3', 'Th 4', 'Th 5', 'Th 6', 'Th 7', 'CN'];
    const currentDayIdx = (new Date().getDay() + 6) % 7; // Monday = 0
    return [
      { label: days[0], val: 65, active: currentDayIdx === 0 },
      { label: days[1], val: 40, active: currentDayIdx === 1 },
      { label: days[2], val: 85, active: currentDayIdx === 2 },
      { label: days[3], val: 55, active: currentDayIdx === 3 },
      { label: days[4], val: 95, active: currentDayIdx === 4 },
      { label: days[5], val: 80, active: currentDayIdx === 5 },
      { label: days[6], val: 60, active: currentDayIdx === 6 },
    ];
  }, []);

  // Notifications & Alerts list
  const alertsList = useMemo(() => {
    const list: {
      id: string;
      title: string;
      desc: string;
      type: 'urgent' | 'warning' | 'info';
    }[] = [];

    // 1. Overdue / Urgent task
    const urgentTask = openTasks.find((t) => t.priority === 'high');
    if (urgentTask) {
      list.push({
        id: 'alert-task',
        title: 'Cảnh Báo: Công việc ưu tiên cao cần làm!',
        desc: `Nhiệm vụ "${urgentTask.title}" đến hạn hôm nay. Hãy giải quyết trước giờ nghỉ.`,
        type: 'urgent',
      });
    } else {
      list.push({
        id: 'alert-task-ok',
        title: 'Nhiệm Vụ Hôm Nay: Đang đúng tiến độ',
        desc: `Bạn còn ${openTasks.length} việc cần hoàn thành trong danh sách hôm nay.`,
        type: 'info',
      });
    }

    // 2. Health alert
    const currentWater = todayHealth?.waterMl || 0;
    if (currentWater < 1500) {
      list.push({
        id: 'alert-water',
        title: 'Cảnh Báo Sức Khỏe: Chưa nạp đủ nước!',
        desc: `Mới nạp ${currentWater}ml / 2,500ml mục tiêu. Hãy uống thêm 1 cốc nước ngay.`,
        type: 'warning',
      });
    } else {
      list.push({
        id: 'alert-water-ok',
        title: 'Nước Uống & Giấc Ngủ Tối Ưu',
        desc: `Đã nạp ${currentWater}ml nước · Giấc ngủ ${todayHealth?.sleepHours || 8}h phục hồi tốt.`,
        type: 'info',
      });
    }

    // 3. Next routine event
    if (nextEvent) {
      list.push({
        id: 'alert-next-ev',
        title: `Lịch Trình: ${nextEvent.title}`,
        desc: `Bắt đầu lúc ${nextEvent.allDay ? 'Cả ngày' : nextEvent.startTime || '17:30'}. Chuẩn bị tài liệu hoặc đồ tập.`,
        type: 'info',
      });
    }

    // 4. Budget alert
    if (budgetStatus.level === 'over' || budgetStatus.level === 'warning') {
      list.push({
        id: 'alert-budget',
        title: 'Cảnh Báo Ngân Sách: Đã tiêu phần lớn hạn mức!',
        desc: `Chi tiêu tháng đã đạt ${budgetStatus.percent}% hạn mức (${formatMoneyCompact(finance.expense, budget.currency)}).`,
        type: 'urgent',
      });
    } else {
      list.push({
        id: 'alert-budget-ok',
        title: 'Ngân Sách Tài Chính An Toàn',
        desc: `Hạn mức khả dụng còn lại ${formatMoneyCompact(budgetStatus.remaining, budget.currency)}.`,
        type: 'info',
      });
    }

    return list.slice(0, 4);
  }, [openTasks, todayHealth, nextEvent, budgetStatus, finance, budget]);

  // Combined Recent Activities Table rows
  const recentActivities = useMemo(() => {
    const rows: {
      id: string;
      time: string;
      activity: string;
      details: string;
      status: 'Confirmed' | 'In Transit' | 'Scheduled';
      category: string;
    }[] = [];

    // Next events
    upcomingEvents.slice(0, 3).forEach((ev) => {
      rows.push({
        id: ev.id,
        time: `${ev.startDate}, ${ev.startTime || '08:00'}`,
        activity: ev.title,
        details: ev.description || 'Lịch sự kiện trong ngày',
        status: 'Scheduled',
        category: 'Lịch trình',
      });
    });

    // Completed tasks
    completedTasksToday.slice(0, 2).forEach((t) => {
      rows.push({
        id: t.id,
        time: `${today}, 10:15`,
        activity: t.title,
        details: 'Đã hoàn thành và xác nhận mục tiêu',
        status: 'Confirmed',
        category: 'Công việc',
      });
    });

    // Open high tasks
    openTasks.slice(0, 2).forEach((t) => {
      rows.push({
        id: t.id,
        time: `${today}, ${t.startTime || '14:00'}`,
        activity: t.title,
        details: 'Đang triển khai thực hiện trong ngày',
        status: 'In Transit',
        category: 'Nhiệm vụ',
      });
    });

    // Filter by table search if present
    if (!tableSearch.trim()) return rows;
    return rows.filter(
      (r) =>
        r.activity.toLowerCase().includes(tableSearch.toLowerCase()) ||
        r.details.toLowerCase().includes(tableSearch.toLowerCase())
    );
  }, [upcomingEvents, completedTasksToday, openTasks, today, tableSearch]);

  const userName = currentUser?.displayName || 'Admin';

  return (
    <div className="flex-1 flex bg-[#F4F6FA] dark:bg-[#0f1115] text-gray-800 dark:text-gray-100 min-h-screen overflow-hidden select-none font-sans">
      {/* --------------------------------------------------------------------- */}
      {/* 1. LEFT SIDEBAR                                                       */}
      {/* --------------------------------------------------------------------- */}
      <aside className="w-64 bg-white dark:bg-[#1a1e24] border-r border-gray-200/80 dark:border-gray-800/80 flex flex-col justify-between p-5 shrink-0 z-20">
        <div>
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 px-2 mb-8">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-400 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Zap className="w-5 h-5 fill-white" />
            </div>
            <div>
              <span className="font-display font-extrabold text-xl tracking-tight text-gray-900 dark:text-white block leading-none">
                Vortex<span className="text-blue-600 dark:text-blue-400">Cal</span>
              </span>
              <span className="text-[10px] text-gray-400 font-semibold tracking-wider uppercase mt-1 block">
                Executive Suite
              </span>
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="space-y-1.5">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, active: true },
              { id: 'month', label: 'Lịch Trình & Sự Kiện', icon: Calendar, active: false },
              { id: 'tasks', label: 'Công Việc & Mục Tiêu', icon: ListChecks, active: false },
              { id: 'focus', label: 'Đồng Hồ Tập Trung', icon: Timer, active: false },
              { id: 'health', label: 'Sức Khỏe & Macro', icon: HeartPulse, active: false },
              { id: 'finance', label: 'Tài Chính & Thu Chi', icon: Wallet, active: false },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.id as CalendarViewType)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    item.active
                      ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100/70 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-gray-100'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Nexi / Gemini AI Promo Card */}
          <div className="mt-8 bg-gradient-to-br from-blue-50 via-indigo-50/50 to-white dark:from-blue-950/30 dark:via-indigo-950/20 dark:to-[#1a1e24] border border-blue-200/60 dark:border-blue-900/50 rounded-2xl p-4 shadow-sm relative overflow-hidden">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
                <Sparkles className="w-4 h-4 text-amber-300" />
              </div>
              <span className="text-xs font-extrabold text-gray-900 dark:text-white">
                Vortex Gemini AI
              </span>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
              Tự động phân tích ảnh bữa ăn, tính macro và xếp lịch trình thông minh.
            </p>
            <button
              type="button"
              onClick={() => onNavigate('health')}
              className="mt-3.5 w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            >
              <span>Kích Hoạt AI Pro</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Bottom Sidebar Actions */}
        <div className="pt-4 border-t border-gray-100 dark:border-gray-800 space-y-1">
          <button
            type="button"
            onClick={() => onNavigate('tasks')}
            className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-semibold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 cursor-pointer transition-colors"
          >
            <Settings className="w-4 h-4" />
            <span>Cài Đặt Hệ Thống</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-semibold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 cursor-pointer transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Tài Khoản Cá Nhân</span>
          </button>
        </div>
      </aside>

      {/* --------------------------------------------------------------------- */}
      {/* 2. MAIN DASHBOARD CONTENT AREA                                        */}
      {/* --------------------------------------------------------------------- */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto">
        {/* Top Header Bar */}
        <header className="h-18 px-8 flex items-center justify-between border-b border-gray-200/60 dark:border-gray-800/60 bg-white/60 dark:bg-[#1a1e24]/60 backdrop-blur-md sticky top-0 z-10 shrink-0">
          <div>
            <h1 className="text-sm font-bold text-gray-900 dark:text-gray-100">
              Hello, {userName}
            </h1>
          </div>

          {/* Search bar */}
          <div className="relative w-72 sm:w-96">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search activities, tasks, metrics..."
              className="w-full text-xs pl-10 pr-4 py-2 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Right Action Icons & Avatar */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="relative p-2 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 cursor-pointer shadow-2xs"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                4
              </span>
            </button>

            <button
              type="button"
              className="relative p-2 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 cursor-pointer shadow-2xs"
            >
              <Mail className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-blue-500 text-white text-[9px] font-bold flex items-center justify-center">
                2
              </span>
            </button>

            {/* User Avatar with status dot */}
            <div className="relative">
              {currentUser?.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt="avatar"
                  className="w-9 h-9 rounded-full object-cover ring-2 ring-blue-500/30"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs ring-2 ring-blue-500/30 shadow-xs">
                  {userName[0]?.toUpperCase() || 'U'}
                </div>
              )}
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-gray-900" />
            </div>
          </div>
        </header>

        {/* Dashboard Body */}
        <div className="p-6 md:p-8 space-y-6 flex-1">
          {/* Dashboard Overview Title & Date Pill */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl md:text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white">
                Dashboard Overview
              </h2>
            </div>

            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white dark:bg-[#1a1e24] border border-gray-200 dark:border-gray-800 text-xs font-bold text-gray-600 dark:text-gray-300 shadow-2xs self-start sm:self-auto">
              <Calendar className="w-3.5 h-3.5 text-blue-500" />
              <span>10 Feb 2025</span>
            </div>
          </div>

          {/* ----------------------------------------------------------------- */}
          {/* 3. ROW OF 4 METRIC KPI CARDS                                      */}
          {/* ----------------------------------------------------------------- */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Total Shipments / Calendar Events */}
            <div className="bg-white dark:bg-[#1a1e24] p-5 rounded-2xl border border-gray-200/80 dark:border-gray-800/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-gray-400 block mb-1">
                    Total Shipments
                  </span>
                  <div className="text-2xl font-black text-gray-900 dark:text-white font-mono tracking-tight">
                    7000
                  </div>
                </div>
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Calendar className="w-4.5 h-4.5" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-1.5 text-[11px] font-semibold text-gray-400">
                <span>Last week</span>
                <span className="inline-flex items-center text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded-md">
                  +14.9% ↗
                </span>
              </div>
            </div>

            {/* Card 2: Active Vehicles / Tasks */}
            <div className="bg-white dark:bg-[#1a1e24] p-5 rounded-2xl border border-gray-200/80 dark:border-gray-800/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-gray-400 block mb-1">
                    Active Vehicles
                  </span>
                  <div className="text-2xl font-black text-gray-900 dark:text-white font-mono tracking-tight">
                    900
                  </div>
                </div>
                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <ListChecks className="w-4.5 h-4.5" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-1.5 text-[11px] font-semibold text-gray-400">
                <span>Last week</span>
                <span className="inline-flex items-center text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded-md">
                  +14.9% ↗
                </span>
              </div>
            </div>

            {/* Card 3: Warehouse Capacity / Health Score */}
            <div className="bg-white dark:bg-[#1a1e24] p-5 rounded-2xl border border-gray-200/80 dark:border-gray-800/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-gray-400 block mb-1">
                    Warehouse Capacity
                  </span>
                  <div className="text-2xl font-black text-gray-900 dark:text-white font-mono tracking-tight">
                    48%
                  </div>
                </div>
                <div className="w-9 h-9 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
                  <HeartPulse className="w-4.5 h-4.5" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-1.5 text-[11px] font-semibold text-gray-400">
                <span>Last week</span>
                <span className="inline-flex items-center text-rose-600 font-bold bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.5 rounded-md">
                  -14.9% ↘
                </span>
              </div>
            </div>

            {/* Card 4: Earnings & Costs */}
            <div className="bg-white dark:bg-[#1a1e24] p-5 rounded-2xl border border-gray-200/80 dark:border-gray-800/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-gray-400 block mb-1">
                    Earnings &amp; Costs
                  </span>
                  <div className="text-2xl font-black text-gray-900 dark:text-white font-mono tracking-tight">
                    ₹ 3,05,000
                  </div>
                </div>
                <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                  <Wallet className="w-4.5 h-4.5" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-1.5 text-[11px] font-semibold text-gray-400">
                <span>Last week</span>
                <span className="inline-flex items-center text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded-md">
                  +16.9% ↗
                </span>
              </div>
            </div>
          </div>

          {/* ----------------------------------------------------------------- */}
          {/* 4. MIDDLE SECTION (Live Tracking Map + Alerts & Trend Chart)      */}
          {/* ----------------------------------------------------------------- */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left Big Card (7 Cols): Live Vehicles Tracking / Routine Map */}
            <div className="lg:col-span-7 bg-white dark:bg-[#1a1e24] rounded-2xl border border-gray-200/80 dark:border-gray-800/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  Live Vehicles Tracking
                </h3>
                <button
                  type="button"
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>

              {/* Map & Route Canvas */}
              <div className="relative w-full h-[320px] rounded-xl overflow-hidden bg-[#eef2f6] dark:bg-[#16191f] border border-gray-200 dark:border-gray-800">
                {/* SVG Street Grid Lines */}
                <svg className="absolute inset-0 w-full h-full opacity-40 dark:opacity-20 stroke-gray-300 dark:stroke-gray-700">
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" strokeWidth="1" />
                  </pattern>
                  <rect width="100%" height="100%" fill="url(#grid)" />
                </svg>

                {/* Tracking Route Blue Vector Lines */}
                <svg className="absolute inset-0 w-full h-full">
                  <path
                    d="M 60 220 L 140 220 L 140 120 L 260 120 L 260 180 L 340 180 L 340 260 L 420 260 L 420 80 L 520 80 L 520 220"
                    fill="none"
                    stroke="#2563EB"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* Waypoint Nodes */}
                  <circle cx="60" cy="220" r="4" fill="#EF4444" />
                  <circle cx="140" cy="120" r="6" fill="#2563EB" stroke="#ffffff" strokeWidth="2" />
                  <circle cx="340" cy="180" r="6" fill="#2563EB" stroke="#ffffff" strokeWidth="2" />
                  <circle cx="420" cy="80" r="4" fill="#EF4444" />
                  <circle cx="520" cy="220" r="4" fill="#EF4444" />
                </svg>

                {/* Floating "Vehicle Details" Dialog Card */}
                {showEventCard && (
                  <div className="absolute top-10 left-32 bg-white dark:bg-[#1e222b] rounded-xl p-3.5 shadow-xl border border-gray-200/90 dark:border-gray-700 w-56 text-[10px] space-y-1.5 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-1.5">
                      <span className="font-bold text-gray-900 dark:text-white flex items-center gap-1">
                        🚗 Vehicle Details
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowEventCard(false)}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="space-y-1 text-gray-500 dark:text-gray-400">
                      <div>
                        Driver Name: <strong className="text-gray-800 dark:text-gray-200">John Doe</strong>
                      </div>
                      <div>
                        Vehicle Number: <strong className="text-gray-800 dark:text-gray-200">ABX-1234</strong>
                      </div>
                      <div>
                        Vehicle Type: <strong className="text-gray-800 dark:text-gray-200">18-Wheeler Truck</strong>
                      </div>
                      <div>
                        Status:{' '}
                        <span className="text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-950/40 px-1 py-0.2 rounded">
                          Enroute
                        </span>
                      </div>
                      <div>
                        Contact No:{' '}
                        <strong className="text-gray-800 dark:text-gray-200">+1 987-654-3210</strong>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onNavigate('month')}
                      className="mt-2 w-full py-1 text-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md text-[9px] font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 cursor-pointer"
                    >
                      View Full Details
                    </button>
                  </div>
                )}

                {/* Bottom Map Controls */}
                <div className="absolute bottom-3 left-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 px-2 py-1 flex items-center gap-2 text-xs font-semibold shadow-xs">
                  <button
                    type="button"
                    onClick={() => setMapZoom((z) => Math.max(50, z - 10))}
                    className="hover:text-blue-600 cursor-pointer"
                  >
                    -
                  </button>
                  <span className="text-[10px] font-mono">{mapZoom}%</span>
                  <button
                    type="button"
                    onClick={() => setMapZoom((z) => Math.min(200, z + 10))}
                    className="hover:text-blue-600 cursor-pointer"
                  >
                    +
                  </button>
                </div>

                <button
                  type="button"
                  className="absolute bottom-3 right-3 p-1.5 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 shadow-xs cursor-pointer"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Right Column (5 Cols): Alerts Section & Revenue Chart */}
            <div className="lg:col-span-5 flex flex-col gap-5">
              {/* Card 1: Alerts & Notifications Section */}
              <div className="bg-white dark:bg-[#1a1e24] rounded-2xl border border-gray-200/80 dark:border-gray-800/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] p-5 space-y-3">
                <h3 className="text-xs font-extrabold text-gray-900 dark:text-gray-100">
                  Alerts &amp; Notifications Section
                </h3>

                <div className="space-y-2.5">
                  {/* Alert 1 */}
                  <div className="flex items-start gap-2.5 p-2 rounded-xl bg-red-50/50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40 text-[11px]">
                    <span className="text-red-500 font-bold shrink-0">⚠️</span>
                    <div className="min-w-0">
                      <h4 className="font-bold text-gray-900 dark:text-white leading-tight">
                        Urgent: Shipment Delay Alert!
                      </h4>
                      <p className="text-gray-500 dark:text-gray-400 text-[10px] mt-0.5 leading-snug">
                        Order #56789 is delayed due to unforeseen circumstances. Expected arrival: +2 days.
                      </p>
                    </div>
                  </div>

                  {/* Alert 2 */}
                  <div className="flex items-start gap-2.5 p-2 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 text-[11px]">
                    <span className="text-amber-500 font-bold shrink-0">📦</span>
                    <div className="min-w-0">
                      <h4 className="font-bold text-gray-900 dark:text-white leading-tight">
                        Inventory Alert: Low Stock!
                      </h4>
                      <p className="text-gray-500 dark:text-gray-400 text-[10px] mt-0.5 leading-snug">
                        Product SKU: 4532A is below the minimum threshold. Only 12 units left in Warehouse #5.
                      </p>
                    </div>
                  </div>

                  {/* Alert 3 */}
                  <div className="flex items-start gap-2.5 p-2 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 text-[11px]">
                    <span className="text-blue-500 font-bold shrink-0">🔧</span>
                    <div className="min-w-0">
                      <h4 className="font-bold text-gray-900 dark:text-white leading-tight">
                        Upcoming Maintenance Due
                      </h4>
                      <p className="text-gray-500 dark:text-gray-400 text-[10px] mt-0.5 leading-snug">
                        Vehicle #TX-9087 needs engine servicing in 5 days. Schedule maintenance to avoid breakdowns.
                      </p>
                    </div>
                  </div>

                  {/* Alert 4 */}
                  <div className="flex items-start gap-2.5 p-2 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 text-[11px]">
                    <span className="text-rose-500 font-bold shrink-0">🚨</span>
                    <div className="min-w-0">
                      <h4 className="font-bold text-gray-900 dark:text-white leading-tight">
                        Critical Stockout Warning!
                      </h4>
                      <p className="text-gray-500 dark:text-gray-400 text-[10px] mt-0.5 leading-snug">
                        Essential supplies (Pallet #A89) are out of stock! Reorder immediately to prevent delays.
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onNavigate('tasks')}
                  className="mt-2 w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
                >
                  See all
                </button>
              </div>

              {/* Card 2: Shipping Revenue Trend Chart */}
              <div className="bg-white dark:bg-[#1a1e24] rounded-2xl border border-gray-200/80 dark:border-gray-800/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-gray-900 dark:text-gray-100">
                      Shipping Revenue
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-lg font-black text-gray-900 dark:text-white font-mono">
                        ₹ 3,05,000
                      </span>
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-1 py-0.5 rounded">
                        +14.9% ↗
                      </span>
                    </div>
                  </div>

                  <select
                    value={timeRange}
                    onChange={(e) => setTimeRange(e.target.value as any)}
                    className="text-[10px] font-bold px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200"
                  >
                    <option value="thisMonth">This Month</option>
                    <option value="thisWeek">This Week</option>
                  </select>
                </div>

                {/* Vertical Bar Chart with Rounded Pills */}
                <div className="h-32 flex items-end justify-between gap-2 pt-4 px-1 border-b border-gray-100 dark:border-gray-800 pb-2">
                  {[
                    { label: '1 Jan', h: '45%' },
                    { label: '10 Jan', h: '60%' },
                    { label: '15 Jan', h: '35%' },
                    { label: '20 Jan', h: '95%', active: true },
                    { label: '25 Jan', h: '75%' },
                    { label: '30 Jan', h: '85%' },
                  ].map((bar, idx) => (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                      <div
                        style={{ height: bar.h }}
                        className={`w-full max-w-[18px] rounded-full transition-all duration-300 ${
                          bar.active
                            ? 'bg-blue-600 shadow-sm shadow-blue-500/30'
                            : 'bg-blue-500/80 hover:bg-blue-600'
                        }`}
                      />
                      <span className="text-[9px] font-mono text-gray-400">{bar.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ----------------------------------------------------------------- */}
          {/* 5. BOTTOM SECTION: Recent Activities Table                        */}
          {/* ----------------------------------------------------------------- */}
          <div className="bg-white dark:bg-[#1a1e24] rounded-2xl border border-gray-200/80 dark:border-gray-800/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                Recent Activities Table
              </h3>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={tableSearch}
                    onChange={(e) => setTableSearch(e.target.value)}
                    placeholder="Search..."
                    className="text-xs pl-8 pr-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => onNavigate('tasks')}
                  className="px-3.5 py-1.5 rounded-xl border border-blue-200 dark:border-blue-800/80 text-blue-600 dark:text-blue-400 text-xs font-semibold hover:bg-blue-50 cursor-pointer shadow-2xs"
                >
                  See details
                </button>
              </div>
            </div>

            {/* Clean Data Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800 text-[11px] font-bold text-blue-600 dark:text-blue-400">
                    <th className="py-2.5 px-3">Date &amp; Time :</th>
                    <th className="py-2.5 px-3">Activity :</th>
                    <th className="py-2.5 px-3">Details :</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60 font-medium">
                  {/* Row 1 */}
                  <tr className="hover:bg-gray-50/60 dark:hover:bg-white/5 transition-colors">
                    <td className="py-3 px-3 text-gray-500 text-[11px] font-mono">
                      Feb 10, 2025,<br />10:15 AM
                    </td>
                    <td className="py-3 px-3 font-bold text-gray-900 dark:text-white">
                      New Order Placed
                    </td>
                    <td className="py-3 px-3 text-gray-500 dark:text-gray-400 text-[11px]">
                      Order #98765 (Electronics) confirmed for shipping
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="inline-block px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                        Confirmed
                      </span>
                    </td>
                  </tr>

                  {/* Row 2 */}
                  <tr className="hover:bg-gray-50/60 dark:hover:bg-white/5 transition-colors">
                    <td className="py-3 px-3 text-gray-500 text-[11px] font-mono">
                      Feb 10, 2025,<br />09:45 AM
                    </td>
                    <td className="py-3 px-3 font-bold text-gray-900 dark:text-white">
                      Shipment Dispatched
                    </td>
                    <td className="py-3 px-3 text-gray-500 dark:text-gray-400 text-[11px]">
                      Order #56789 left Warehouse #3 for delivery
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="inline-block px-3 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
                        In Transit
                      </span>
                    </td>
                  </tr>

                  {/* Dynamic user events/tasks rows if available */}
                  {recentActivities.slice(0, 3).map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50/60 dark:hover:bg-white/5 transition-colors">
                      <td className="py-3 px-3 text-gray-500 text-[11px] font-mono">
                        {row.time}
                      </td>
                      <td className="py-3 px-3 font-bold text-gray-900 dark:text-white">
                        {row.activity}
                      </td>
                      <td className="py-3 px-3 text-gray-500 dark:text-gray-400 text-[11px]">
                        {row.details}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold border ${
                            row.status === 'Confirmed'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                              : row.status === 'In Transit'
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
        </div>
      </main>
    </div>
  );
};
