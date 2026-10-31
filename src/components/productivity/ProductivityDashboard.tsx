import React, { useMemo } from 'react';
import {
  LayoutDashboard,
  CalendarClock,
  ListChecks,
  Timer,
  Wallet,
  HeartPulse,
  ArrowRight,
  CheckCircle2,
  Circle,
  Clock,
  Flame,
  Footprints,
  TrendingDown,
} from 'lucide-react';
import { CalendarEvent, CalendarViewType } from '../../types/calendar';
import {
  BudgetSettings,
  FocusSession,
  GoalItem,
  GoalProgress,
  HealthDayLog,
  HealthProfile,
  TaskItem,
  Transaction,
} from '../../types/productivity';
import { ProgressBar } from '../charts/SimpleCharts';
import {
  computeBudgetStatus,
  formatMoney,
  formatMoneyCompact,
  isTaskOverdue,
  monthPrefixOf,
  sortTasks,
  summarizeFinance,
  tasksDueOn,
  totalFocusMinutes,
} from '../../utils/productivityUtils';
import { formatDateString } from '../../utils/calendarUtils';

interface ProductivityDashboardProps {
  events: CalendarEvent[];
  tasks: TaskItem[];
  goals: GoalItem[];
  goalProgress: GoalProgress[];
  sessions: FocusSession[];
  transactions: Transaction[];
  budget: BudgetSettings;
  healthLogs: HealthDayLog[];
  healthProfile: HealthProfile;
  lang: 'vi' | 'en';
  onNavigate: (view: CalendarViewType) => void;
  onSetTaskStatus: (id: string, status: TaskItem['status']) => void;
  onOpenEvent: (event: CalendarEvent) => void;
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
  lang,
  onNavigate,
  onSetTaskStatus,
  onOpenEvent,
}) => {
  const today = formatDateString(new Date());
  const monthPrefix = monthPrefixOf(new Date());

  const upcoming = useMemo(() => {
    return [...events]
      .filter((e) => {
        const key = `${e.startDate} ${e.allDay ? '00:00' : e.startTime}`;
        return key >= `${today} 00:00`;
      })
      .sort((a, b) => {
        const ka = `${a.startDate} ${a.allDay ? '00:00' : a.startTime}`;
        const kb = `${b.startDate} ${b.allDay ? '00:00' : b.startTime}`;
        return ka.localeCompare(kb);
      })
      .slice(0, 4);
  }, [events, today]);

  const todaysTasks = useMemo(() => sortTasks(tasksDueOn(tasks, today)), [tasks, today]);
  const openTasks = useMemo(() => todaysTasks.filter((t) => t.status !== 'completed'), [todaysTasks]);

  const focusToday = useMemo(() => totalFocusMinutes(sessions, today, today), [sessions, today]);
  const focusWeek = useMemo(() => {
    const d = new Date();
    const monday = new Date(d);
    monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return totalFocusMinutes(sessions, formatDateString(monday), today);
  }, [sessions, today]);

  const finance = useMemo(() => summarizeFinance(transactions, monthPrefix), [transactions, monthPrefix]);
  const budgetStatus = useMemo(
    () => computeBudgetStatus(finance.expense, budget.monthlyLimit),
    [finance.expense, budget.monthlyLimit]
  );

  const todayHealth = useMemo(
    () => healthLogs.find((l) => l.date === today),
    [healthLogs, today]
  );

  const topGoals = useMemo(
    () =>
      goals
        .map((g) => ({ goal: g, progress: goalProgress.find((p) => p.goalId === g.id) }))
        .filter((row) => row.progress)
        .sort((a, b) => (b.progress?.percent || 0) - (a.progress?.percent || 0))
        .slice(0, 3),
    [goals, goalProgress]
  );

  const moduleCards: {
    id: CalendarViewType;
    label: string;
    desc: string;
    icon: typeof ListChecks;
    cls: string;
  }[] = [
    {
      id: 'tasks',
      label: lang === 'vi' ? 'Công việc & Mục tiêu' : 'Tasks & Goals',
      desc:
        lang === 'vi'
          ? `${openTasks.length} việc hôm nay · ${goals.length} mục tiêu`
          : `${openTasks.length} due today · ${goals.length} goals`,
      icon: ListChecks,
      cls: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40',
    },
    {
      id: 'focus',
      label: lang === 'vi' ? 'Đồng hồ học tập' : 'Study clock',
      desc:
        lang === 'vi'
          ? `${focusToday} phút hôm nay · ${focusWeek} phút tuần này`
          : `${focusToday} min today · ${focusWeek} min this week`,
      icon: Timer,
      cls: 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/40',
    },
    {
      id: 'finance',
      label: lang === 'vi' ? 'Tài chính' : 'Finance',
      desc:
        lang === 'vi'
          ? `Chi ${formatMoneyCompact(finance.expense, budget.currency)} / ${formatMoneyCompact(budget.monthlyLimit, budget.currency)}`
          : `Spent ${formatMoneyCompact(finance.expense, budget.currency)} of ${formatMoneyCompact(budget.monthlyLimit, budget.currency)}`,
      icon: Wallet,
      cls: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40',
    },
    {
      id: 'health',
      label: lang === 'vi' ? 'Sức khỏe' : 'Health',
      desc:
        lang === 'vi'
          ? `${todayHealth?.steps || 0} bước · ${todayHealth?.sleepHours || 0}h ngủ`
          : `${todayHealth?.steps || 0} steps · ${todayHealth?.sleepHours || 0}h sleep`,
      icon: HeartPulse,
      cls: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40',
    },
  ];

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-gray-50/50 dark:bg-gray-900 p-4 md:p-6 lg:p-8 select-none">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">
            {lang === 'vi' ? 'Tổng Quan Hôm Nay' : "Today's Overview"}
          </h1>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {lang === 'vi'
            ? `Tóm tắt lịch, công việc, giờ học, chi tiêu và sức khỏe — ${today}`
            : `Calendar, tasks, study time, spending and health at a glance — ${today}`}
        </p>
      </div>

      {/* Headline stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          {
            label: lang === 'vi' ? 'Sự kiện sắp tới' : 'Upcoming events',
            value: String(upcoming.length),
            icon: CalendarClock,
            cls: 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40',
          },
          {
            label: lang === 'vi' ? 'Việc hôm nay' : "Today's tasks",
            value: `${openTasks.length}/${todaysTasks.length}`,
            icon: ListChecks,
            cls: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40',
          },
          {
            label: lang === 'vi' ? 'Phút tập trung' : 'Focus minutes',
            value: String(focusToday),
            icon: Timer,
            cls: 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/40',
          },
          {
            label: lang === 'vi' ? 'Chi tiêu tháng' : 'Month spending',
            value: formatMoneyCompact(finance.expense, budget.currency),
            icon: TrendingDown,
            cls: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40',
          },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-white dark:bg-[#1a1e24] p-3.5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs flex items-center gap-3"
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${card.cls}`}>
                <Icon className="w-4.5 h-4.5" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider truncate">
                  {card.label}
                </div>
                <div className="text-lg font-bold text-gray-900 dark:text-gray-100 truncate">{card.value}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Module launcher */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-6">
        {moduleCards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.id}
              onClick={() => onNavigate(card.id)}
              className="text-left bg-white dark:bg-[#1a1e24] p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs hover:border-blue-300 dark:hover:border-blue-800 hover:shadow-md transition-all group cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${card.cls}`}>
                  <Icon className="w-4.5 h-4.5" />
                </div>
                <ArrowRight className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-blue-500 transition-colors" />
              </div>
              <div className="mt-2.5 text-xs font-bold text-gray-900 dark:text-gray-100">{card.label}</div>
              <div className="text-[10px] text-gray-400 mt-0.5">{card.desc}</div>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left column */}
        <div className="xl:col-span-7 space-y-4">
          {/* Upcoming events */}
          <div className="bg-white dark:bg-[#1a1e24] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                <CalendarClock className="w-3.5 h-3.5" />
                {lang === 'vi' ? 'Lịch sắp tới' : 'Upcoming calendar'}
              </h3>
              <button
                onClick={() => onNavigate('month')}
                className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                {lang === 'vi' ? 'Xem lịch' : 'Open calendar'}
              </button>
            </div>

            {upcoming.length === 0 ? (
              <p className="text-xs text-gray-400 py-6 text-center">
                {lang === 'vi' ? 'Không có sự kiện sắp tới.' : 'No upcoming events.'}
              </p>
            ) : (
              <div className="space-y-1.5">
                {upcoming.map((ev) => (
                  <button
                    key={ev.id}
                    onClick={() => onOpenEvent(ev)}
                    className="w-full flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-[#242931] text-left cursor-pointer"
                  >
                    <span className="w-1 h-8 rounded-full shrink-0" style={{ backgroundColor: ev.color }} />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">
                        {ev.title}
                      </div>
                      <div className="text-[10px] text-gray-400 truncate">
                        {ev.startDate}
                        {ev.allDay ? ` · ${lang === 'vi' ? 'Cả ngày' : 'All day'}` : ` · ${ev.startTime}–${ev.endTime}`}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Today's tasks */}
          <div className="bg-white dark:bg-[#1a1e24] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                <ListChecks className="w-3.5 h-3.5" />
                {lang === 'vi' ? 'Công việc hôm nay' : "Today's tasks"}
              </h3>
              <button
                onClick={() => onNavigate('tasks')}
                className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                {lang === 'vi' ? 'Tất cả công việc' : 'All tasks'}
              </button>
            </div>

            {todaysTasks.length === 0 ? (
              <p className="text-xs text-gray-400 py-6 text-center">
                {lang === 'vi' ? 'Hôm nay không có công việc nào.' : 'Nothing due today.'}
              </p>
            ) : (
              <div className="space-y-1">
                {todaysTasks.slice(0, 6).map((task) => {
                  const done = task.status === 'completed';
                  const overdue = isTaskOverdue(task, today);
                  return (
                    <div key={task.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-gray-50 dark:hover:bg-[#242931]">
                      <button
                        onClick={() => onSetTaskStatus(task.id, done ? 'todo' : 'completed')}
                        className="shrink-0 cursor-pointer"
                        aria-label={lang === 'vi' ? 'Đổi trạng thái' : 'Toggle status'}
                      >
                        {done ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Circle className={`w-4 h-4 ${overdue ? 'text-rose-400' : 'text-gray-300 dark:text-gray-600'}`} />
                        )}
                      </button>
                      <span
                        className={`text-xs flex-1 truncate ${
                          done ? 'line-through text-gray-400' : 'text-gray-800 dark:text-gray-100'
                        }`}
                      >
                        {task.title}
                      </span>
                      {task.startTime && (
                        <span className="text-[10px] text-gray-400 font-mono flex items-center gap-1 shrink-0">
                          <Clock className="w-3 h-3" />
                          {task.startTime}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="xl:col-span-5 space-y-4">
          {/* Goals */}
          <div className="bg-white dark:bg-[#1a1e24] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs p-4">
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-3">
              {lang === 'vi' ? 'Tiến độ mục tiêu' : 'Goal progress'}
            </h3>
            {topGoals.length === 0 ? (
              <p className="text-xs text-gray-400 py-6 text-center">
                {lang === 'vi' ? 'Chưa có mục tiêu nào.' : 'No goals yet.'}
              </p>
            ) : (
              <div className="space-y-3">
                {topGoals.map(({ goal, progress }) => (
                  <div key={goal.id}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-200 truncate">
                        {goal.title}
                      </span>
                      <span className="text-[10px] text-gray-400 font-mono shrink-0 ml-2">
                        {progress?.percent || 0}%
                      </span>
                    </div>
                    <ProgressBar percent={progress?.percent || 0} color={goal.color} height={6} />
                    <div className="text-[10px] text-gray-400 mt-1">
                      {progress?.completedTasks || 0}/{progress?.totalTasks || 0}{' '}
                      {lang === 'vi' ? 'công việc hoàn thành' : 'tasks completed'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Budget */}
          <div className="bg-white dark:bg-[#1a1e24] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5" />
                {lang === 'vi' ? 'Ngân sách tháng' : 'Monthly budget'}
              </h3>
              <button
                onClick={() => onNavigate('finance')}
                className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                {lang === 'vi' ? 'Chi tiết' : 'Details'}
              </button>
            </div>
            <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
              {formatMoney(budgetStatus.spent, budget.currency)}
              <span className="text-[10px] font-normal text-gray-400 ml-1">
                / {formatMoney(budgetStatus.limit, budget.currency)}
              </span>
            </div>
            <div className="mt-2">
              <ProgressBar
                percent={budgetStatus.percent}
                color={
                  budgetStatus.level === 'over' ? '#E11D48' : budgetStatus.level === 'warning' ? '#F59E0B' : '#059669'
                }
                height={6}
              />
            </div>
            <div className="text-[10px] text-gray-400 mt-1">
              {budgetStatus.level === 'over'
                ? lang === 'vi'
                  ? `Vượt ${formatMoneyCompact(Math.abs(budgetStatus.remaining), budget.currency)}`
                  : `Over by ${formatMoneyCompact(Math.abs(budgetStatus.remaining), budget.currency)}`
                : lang === 'vi'
                  ? `Còn ${formatMoneyCompact(budgetStatus.remaining, budget.currency)}`
                  : `${formatMoneyCompact(budgetStatus.remaining, budget.currency)} left`}
            </div>
          </div>

          {/* Health */}
          <div className="bg-white dark:bg-[#1a1e24] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                <HeartPulse className="w-3.5 h-3.5" />
                {lang === 'vi' ? 'Sức khỏe hôm nay' : "Today's health"}
              </h3>
              <button
                onClick={() => onNavigate('health')}
                className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                {lang === 'vi' ? 'Chi tiết' : 'Details'}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                {
                  icon: Footprints,
                  label: lang === 'vi' ? 'Bước' : 'Steps',
                  value: (todayHealth?.steps || 0).toLocaleString(),
                  target: healthProfile.dailySteps,
                  color: '#039BE5',
                },
                {
                  icon: Flame,
                  label: 'kcal',
                  value: String(todayHealth?.caloriesIn || 0),
                  target: 2200,
                  color: '#F4511E',
                },
                {
                  icon: HeartPulse,
                  label: lang === 'vi' ? 'Đốt' : 'Burned',
                  value: String(todayHealth?.caloriesBurned || 0),
                  target: 2400,
                  color: '#33B679',
                },
                {
                  icon: Clock,
                  label: lang === 'vi' ? 'Ngủ' : 'Sleep',
                  value: `${todayHealth?.sleepHours || 0}h`,
                  target: healthProfile.dailySleepHours,
                  color: '#7986CB',
                },
              ].map((row) => {
                const Icon = row.icon;
                const percent = row.target > 0 ? Math.min(100, Math.round((Number(String(row.value).replace(/,/g, '')) / row.target) * 100)) : 0;
                return (
                  <div key={row.label} className="p-2 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                    <div className="flex items-center gap-1.5">
                      <Icon className="w-3.5 h-3.5" style={{ color: row.color }} />
                      <span className="text-[9px] uppercase tracking-wider text-gray-400 font-semibold">
                        {row.label}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-gray-900 dark:text-gray-100 mt-0.5">{row.value}</div>
                    <div className="mt-1">
                      <ProgressBar percent={percent} color={row.color} height={3} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

