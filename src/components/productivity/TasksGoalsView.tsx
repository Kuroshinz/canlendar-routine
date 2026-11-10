import React, { useMemo, useState } from 'react';
import {
  Plus,
  Target,
  CheckCircle2,
  Circle,
  Clock,
  Trash2,
  ChevronDown,
  ChevronRight,
  Flag,
  Calendar as CalIcon,
  ListChecks,
  X,
  Pencil,
  Timer,
  Flame,
  Sunrise,
  Sun,
  Sunset,
  LayoutGrid,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import {
  GoalItem,
  HabitItem,
  RoutineTimeOfDay,
  TASK_PRIORITY_META,
  TASK_STATUS_META,
  TaskItem,
  TaskPriority,
  TaskStatus,
} from '../../types/productivity';
import { CalendarCategory } from '../../types/calendar';
import { ProgressBar } from '../charts/SimpleCharts';
import {
  computeTaskCompletionRatio,
  habitCurrentStreak,
  isHabitDoneOn,
  isTaskOverdue,
  sortTasks,
} from '../../utils/productivityUtils';
import { formatDateString } from '../../utils/calendarUtils';

interface TasksGoalsViewProps {
  tasks: TaskItem[];
  goals: GoalItem[];
  goalProgress: { goalId: string; totalTasks: number; completedTasks: number; percent: number }[];
  categories: CalendarCategory[];
  lang: 'vi' | 'en';
  onAddTask: (input: Omit<TaskItem, 'id' | 'createdAt' | 'subtasks'>) => TaskItem;
  onUpdateTask: (id: string, patch: Partial<TaskItem>) => void;
  onDeleteTask: (id: string) => void;
  onSetTaskStatus: (id: string, status: TaskStatus) => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
  onAddSubtask: (taskId: string, title: string) => void;
  onRemoveSubtask: (taskId: string, subtaskId: string) => void;
  onAddGoal: (goal: Omit<GoalItem, 'id' | 'createdAt'>) => GoalItem;
  onDeleteGoal: (id: string) => void;
  onOpenTaskOnCalendar: (dateStr: string) => void;
  onStartFocus?: (taskId: string) => void;
  habits?: HabitItem[];
  onAddHabit?: (habit: Omit<HabitItem, 'id' | 'createdAt' | 'completedDates'>) => HabitItem;
  onToggleHabit?: (id: string, dateStr: string) => void;
  onDeleteHabit?: (id: string) => void;
}

const STATUS_TABS: { id: TaskStatus | 'all'; labelVi: string; labelEn: string }[] = [
  { id: 'all', labelVi: 'Tất cả', labelEn: 'All' },
  { id: 'todo', labelVi: 'Cần làm', labelEn: 'To do' },
  { id: 'in_progress', labelVi: 'Đang làm', labelEn: 'In progress' },
  { id: 'completed', labelVi: 'Hoàn thành', labelEn: 'Completed' },
];

export const TasksGoalsView: React.FC<TasksGoalsViewProps> = ({
  tasks,
  goals,
  goalProgress,
  categories,
  lang,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onSetTaskStatus,
  onToggleSubtask,
  onAddSubtask,
  onRemoveSubtask,
  onAddGoal,
  onDeleteGoal,
  onOpenTaskOnCalendar,
  onStartFocus,
  habits = [],
  onAddHabit,
  onToggleHabit,
  onDeleteHabit,
}) => {
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'all'>('all');
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [showHabitForm, setShowHabitForm] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [subtaskDraft, setSubtaskDraft] = useState<Record<string, string>>({});

  // Habit form state
  const [habitTitle, setHabitTitle] = useState('');
  const [habitTimeOfDay, setHabitTimeOfDay] = useState<RoutineTimeOfDay>('morning');
  const [habitColor, setHabitColor] = useState('#039BE5');

  const today = formatDateString(new Date());

  // --- View Mode & Quick Input
  const [viewMode, setViewMode] = useState<'list' | 'matrix'>('list');
  const [quickTitle, setQuickTitle] = useState('');
  const [quickPriority, setQuickPriority] = useState<TaskPriority>('medium');
  const [quickDueOption, setQuickDueOption] = useState<'today' | 'tomorrow' | 'none'>('today');

  const handleQuickAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;
    const dueDate =
      quickDueOption === 'today'
        ? today
        : quickDueOption === 'tomorrow'
          ? (() => {
              const d = new Date();
              d.setDate(d.getDate() + 1);
              return formatDateString(d);
            })()
          : undefined;

    onAddTask({
      title: quickTitle.trim(),
      priority: quickPriority,
      categoryId: categories[0]?.id || 'tasks',
      dueDate,
      status: 'todo',
    });
    setQuickTitle('');
  };

  const weekDays = useMemo(() => {
    const now = new Date();
    const day = now.getDay();
    const mondayDiff = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayDiff);

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = formatDateString(d);
      const dayNameVi = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'][i];
      const dayNameEn = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i];
      return {
        dateStr,
        dayNum: d.getDate(),
        dayName: lang === 'vi' ? dayNameVi : dayNameEn,
        isToday: dateStr === today,
      };
    });
  }, [today, lang]);

  const matrixQuadrants = useMemo(() => {
    const q1: TaskItem[] = []; // Do First (Urgent & Important)
    const q2: TaskItem[] = []; // Schedule (Not Urgent but Important)
    const q3: TaskItem[] = []; // Delegate (Urgent but Not Important)
    const q4: TaskItem[] = []; // Eliminate (Not Urgent & Not Important)

    tasks.forEach((t) => {
      const isUrgent = Boolean(t.dueDate && t.dueDate <= today);
      const isImportant = t.priority === 'high' || Boolean(t.goalId);

      if (isUrgent && isImportant) {
        q1.push(t);
      } else if (!isUrgent && isImportant) {
        q2.push(t);
      } else if (isUrgent && !isImportant) {
        q3.push(t);
      } else {
        q4.push(t);
      }
    });

    return { q1, q2, q3, q4 };
  }, [tasks, today]);

  // --- New task form state
  const [formTitle, setFormTitle] = useState('');
  const [formPriority, setFormPriority] = useState<TaskPriority>('medium');
  const [formCategory, setFormCategory] = useState(categories[0]?.id || 'tasks');
  const [formGoal, setFormGoal] = useState('');
  const [formDueDate, setFormDueDate] = useState(today);
  const [formStartTime, setFormStartTime] = useState('');
  const [formEndTime, setFormEndTime] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // --- New goal form state
  const [goalTitle, setGoalTitle] = useState('');
  const [goalCategory, setGoalCategory] = useState(categories[0]?.id || 'study');
  const [goalTargetDate, setGoalTargetDate] = useState('');

  const resetTaskForm = () => {
    setFormTitle('');
    setFormPriority('medium');
    setFormCategory(categories[0]?.id || 'tasks');
    setFormGoal('');
    setFormDueDate(today);
    setFormStartTime('');
    setFormEndTime('');
    setFormNotes('');
    setEditingTask(null);
  };

  const handleSubmitTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    const payload = {
      title: formTitle.trim(),
      notes: formNotes.trim() || undefined,
      priority: formPriority,
      categoryId: formCategory,
      goalId: formGoal || undefined,
      dueDate: formDueDate || undefined,
      startTime: formStartTime || undefined,
      endTime: formEndTime || undefined,
    };

    if (editingTask) {
      onUpdateTask(editingTask.id, payload);
    } else {
      onAddTask({ ...payload, status: 'todo' });
    }

    resetTaskForm();
    setShowTaskForm(false);
  };

  const handleSubmitGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalTitle.trim()) return;
    const cat = categories.find((c) => c.id === goalCategory);
    onAddGoal({
      title: goalTitle.trim(),
      categoryId: goalCategory,
      color: cat?.color || '#3F51B5',
      targetDate: goalTargetDate || undefined,
    });
    setGoalTitle('');
    setGoalTargetDate('');
    setShowGoalForm(false);
  };

  const handleSubmitHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!habitTitle.trim() || !onAddHabit) return;
    onAddHabit({
      title: habitTitle.trim(),
      category: 'personal',
      timeOfDay: habitTimeOfDay,
      color: habitColor,
      targetDaysPerWeek: 7,
    });
    setHabitTitle('');
    setShowHabitForm(false);
  };

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredTasks = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = tasks.filter((t) => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
      if (q && !`${t.title} ${t.notes || ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
    return sortTasks(list);
  }, [tasks, statusFilter, priorityFilter, query]);

  const counts = useMemo(
    () => ({
      all: tasks.length,
      todo: tasks.filter((t) => t.status === 'todo').length,
      in_progress: tasks.filter((t) => t.status === 'in_progress').length,
      completed: tasks.filter((t) => t.status === 'completed').length,
      overdue: tasks.filter((t) => isTaskOverdue(t, today)).length,
    }),
    [tasks, today]
  );

  const categoryOf = (id: string) => categories.find((c) => c.id === id);

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-gray-50/50 dark:bg-slate-900 p-4 md:p-6 lg:p-8 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <ListChecks className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">
              {lang === 'vi' ? 'Công Việc & Mục Tiêu' : 'Tasks & Goals'}
            </h1>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {lang === 'vi'
              ? 'Quản lý công việc theo ưu tiên và hạn chót. Task có giờ sẽ tự hiện trên Lịch.'
              : 'Manage tasks by priority and deadline. Timed tasks appear on the Calendar automatically.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              resetTaskForm();
              setShowTaskForm(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{lang === 'vi' ? 'Thêm công việc' : 'New task'}</span>
          </button>
          <button
            onClick={() => setShowGoalForm(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-[#242931] text-gray-700 dark:text-gray-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            <Target className="w-4 h-4 text-indigo-500" />
            <span>{lang === 'vi' ? 'Thêm mục tiêu' : 'New goal'}</span>
          </button>
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          {
            label: lang === 'vi' ? 'Tổng công việc' : 'Total tasks',
            value: counts.all,
            cls: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40',
            icon: ListChecks,
          },
          {
            label: lang === 'vi' ? 'Đang làm' : 'In progress',
            value: counts.in_progress,
            cls: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40',
            icon: Clock,
          },
          {
            label: lang === 'vi' ? 'Hoàn thành' : 'Completed',
            value: counts.completed,
            cls: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40',
            icon: CheckCircle2,
          },
          {
            label: lang === 'vi' ? 'Quá hạn' : 'Overdue',
            value: counts.overdue,
            cls: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40',
            icon: Flag,
          },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-white dark:bg-[#131b2e] p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3"
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${card.cls}`}>
                <Icon className="w-4.5 h-4.5" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider truncate">
                  {card.label}
                </div>
                <div className="text-lg font-bold text-gray-900 dark:text-gray-100">{card.value}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Tasks column */}
        <div className="xl:col-span-7 space-y-4">
          {/* Quick Task Input Bar */}
          <form
            onSubmit={handleQuickAddTask}
            className="bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200 dark:border-slate-800 p-2.5 shadow-xs flex flex-wrap sm:flex-nowrap items-center gap-2"
          >
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Plus className="w-4 h-4 text-blue-500 shrink-0 ml-1.5" />
              <input
                type="text"
                value={quickTitle}
                onChange={(e) => setQuickTitle(e.target.value)}
                placeholder={
                  lang === 'vi'
                    ? 'Thêm nhanh việc cần làm... (Gõ tên việc rồi nhấn Enter)'
                    : 'Quick add task... (Type and press Enter)'
                }
                className="w-full text-xs bg-transparent border-none outline-none text-gray-800 dark:text-gray-100 placeholder:text-gray-400"
              />
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-[10px] font-semibold">
                <button
                  type="button"
                  onClick={() => setQuickPriority('high')}
                  className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                    quickPriority === 'high'
                      ? 'bg-rose-500 text-white shadow-xs'
                      : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
                >
                  🔴 {lang === 'vi' ? 'Gấp' : 'High'}
                </button>
                <button
                  type="button"
                  onClick={() => setQuickPriority('medium')}
                  className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                    quickPriority === 'medium'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
                >
                  🟡 {lang === 'vi' ? 'Vừa' : 'Med'}
                </button>
                <button
                  type="button"
                  onClick={() => setQuickPriority('low')}
                  className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                    quickPriority === 'low'
                      ? 'bg-slate-400 text-white shadow-xs'
                      : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
                >
                  🟢 {lang === 'vi' ? 'Nhẹ' : 'Low'}
                </button>
              </div>

              <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-[10px] font-semibold">
                <button
                  type="button"
                  onClick={() => setQuickDueOption('today')}
                  className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                    quickDueOption === 'today'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
                >
                  {lang === 'vi' ? 'Hôm nay' : 'Today'}
                </button>
                <button
                  type="button"
                  onClick={() => setQuickDueOption('tomorrow')}
                  className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                    quickDueOption === 'tomorrow'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
                >
                  {lang === 'vi' ? 'Ngày mai' : 'Tmrw'}
                </button>
                <button
                  type="button"
                  onClick={() => setQuickDueOption('none')}
                  className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                    quickDueOption === 'none'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
                >
                  {lang === 'vi' ? 'Không hạn' : 'No date'}
                </button>
              </div>

              <button
                type="submit"
                disabled={!quickTitle.trim()}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                {lang === 'vi' ? 'Thêm' : 'Add'}
              </button>
            </div>
          </form>

          {/* View Mode Toggle & Filters */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="bg-gray-200/80 dark:bg-gray-800 p-1 rounded-xl flex text-xs font-semibold">
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                <ListChecks className="w-3.5 h-3.5" />
                <span>{lang === 'vi' ? 'Danh sách' : 'List'}</span>
              </button>
              <button
                onClick={() => setViewMode('matrix')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'matrix'
                    ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>{lang === 'vi' ? 'Ma trận Eisenhower' : 'Eisenhower Matrix'}</span>
              </button>
            </div>

            {viewMode === 'list' && (
              <div className="flex flex-wrap items-center gap-2 flex-1 justify-end">
                <div className="bg-gray-200/80 dark:bg-gray-800 p-1 rounded-xl flex text-xs font-semibold">
                  {STATUS_TABS.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setStatusFilter(tab.id)}
                      className={`px-2 py-1 rounded-lg transition-all cursor-pointer text-[11px] ${
                        statusFilter === tab.id
                          ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-xs'
                          : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
                      }`}
                    >
                      {lang === 'vi' ? tab.labelVi : tab.labelEn}
                    </button>
                  ))}
                </div>

                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value as TaskPriority | 'all')}
                  className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200"
                >
                  <option value="all">{lang === 'vi' ? 'Mọi ưu tiên' : 'All priorities'}</option>
                  <option value="high">{lang === 'vi' ? 'Cao' : 'High'}</option>
                  <option value="medium">{lang === 'vi' ? 'Trung bình' : 'Medium'}</option>
                  <option value="low">{lang === 'vi' ? 'Thấp' : 'Low'}</option>
                </select>

                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={lang === 'vi' ? 'Tìm công việc...' : 'Search tasks...'}
                  className="w-32 lg:w-40 text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                />
              </div>
            )}
          </div>

          {/* Eisenhower Matrix View */}
          {viewMode === 'matrix' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Q1: Do First */}
              <div className="bg-rose-50/40 dark:bg-rose-950/20 border border-rose-300/80 dark:border-rose-900/60 rounded-2xl p-4 flex flex-col min-h-[220px]">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                    <h4 className="text-xs font-bold text-rose-700 dark:text-rose-300 uppercase tracking-wider">
                      {lang === 'vi' ? 'Q1: Làm Ngay (Khẩn cấp & Quan trọng)' : 'Q1: Do First (Urgent & Important)'}
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-200/60 dark:bg-rose-900/40 text-rose-800 dark:text-rose-200 font-bold">
                    {matrixQuadrants.q1.length}
                  </span>
                </div>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-3">
                  {lang === 'vi' ? 'Hạn hôm nay/quá hạn & ưu tiên cao. Cần giải quyết ngay lập tức.' : 'Due today/overdue & high priority. Do right away.'}
                </p>
                <div className="space-y-1.5 flex-1 overflow-y-auto max-h-64">
                  {matrixQuadrants.q1.length === 0 ? (
                    <div className="text-[11px] text-gray-400 italic text-center py-6">
                      {lang === 'vi' ? 'Không có việc khẩn cấp!' : 'No urgent tasks!'}
                    </div>
                  ) : (
                    matrixQuadrants.q1.map((t) => (
                      <div
                        key={t.id}
                        className="bg-white dark:bg-[#131b2e] p-2.5 rounded-xl border border-rose-200/50 dark:border-rose-900/40 flex items-center justify-between gap-2 text-xs shadow-2xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <button
                            type="button"
                            onClick={() => onSetTaskStatus(t.id, t.status === 'completed' ? 'todo' : 'completed')}
                            className="cursor-pointer shrink-0"
                          >
                            {t.status === 'completed' ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            ) : (
                              <Circle className="w-4 h-4 text-gray-300 dark:text-gray-600 hover:text-emerald-500" />
                            )}
                          </button>
                          <span className={`truncate font-medium ${t.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-800 dark:text-gray-100'}`}>
                            {t.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {onStartFocus && t.status !== 'completed' && (
                            <button
                              onClick={() => onStartFocus(t.id)}
                              className="p-1 rounded text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/40 cursor-pointer"
                              title={lang === 'vi' ? 'Bắt đầu Focus' : 'Start Focus'}
                            >
                              <Timer className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => onDeleteTask(t.id)}
                            className="p-1 text-gray-400 hover:text-rose-600 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Q2: Schedule */}
              <div className="bg-blue-50/40 dark:bg-blue-950/20 border border-blue-300/80 dark:border-blue-900/60 rounded-2xl p-4 flex flex-col min-h-[220px]">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    <h4 className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                      {lang === 'vi' ? 'Q2: Lên Kế Hoạch (Quan trọng, Chưa gấp)' : 'Q2: Schedule (Important, Not Urgent)'}
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-200/60 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 font-bold">
                    {matrixQuadrants.q2.length}
                  </span>
                </div>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-3">
                  {lang === 'vi' ? 'Mục tiêu dài hạn, phát triển bản thân và dự án chiến lược.' : 'Long-term goals and strategic deep work.'}
                </p>
                <div className="space-y-1.5 flex-1 overflow-y-auto max-h-64">
                  {matrixQuadrants.q2.length === 0 ? (
                    <div className="text-[11px] text-gray-400 italic text-center py-6">
                      {lang === 'vi' ? 'Trống' : 'Empty'}
                    </div>
                  ) : (
                    matrixQuadrants.q2.map((t) => (
                      <div
                        key={t.id}
                        className="bg-white dark:bg-[#131b2e] p-2.5 rounded-xl border border-blue-200/50 dark:border-blue-900/40 flex items-center justify-between gap-2 text-xs shadow-2xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <button
                            type="button"
                            onClick={() => onSetTaskStatus(t.id, t.status === 'completed' ? 'todo' : 'completed')}
                            className="cursor-pointer shrink-0"
                          >
                            {t.status === 'completed' ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            ) : (
                              <Circle className="w-4 h-4 text-gray-300 dark:text-gray-600 hover:text-emerald-500" />
                            )}
                          </button>
                          <span className={`truncate font-medium ${t.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-800 dark:text-gray-100'}`}>
                            {t.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {onStartFocus && t.status !== 'completed' && (
                            <button
                              onClick={() => onStartFocus(t.id)}
                              className="p-1 rounded text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/40 cursor-pointer"
                              title={lang === 'vi' ? 'Bắt đầu Focus' : 'Start Focus'}
                            >
                              <Timer className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => onDeleteTask(t.id)}
                            className="p-1 text-gray-400 hover:text-rose-600 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Q3: Delegate / Quick */}
              <div className="bg-amber-50/40 dark:bg-amber-950/20 border border-amber-300/80 dark:border-amber-900/60 rounded-2xl p-4 flex flex-col min-h-[220px]">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <h4 className="text-xs font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider">
                      {lang === 'vi' ? 'Q3: Xử Lý Nhanh (Gấp, Ít quan trọng)' : 'Q3: Delegate (Urgent, Not Important)'}
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-200/60 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 font-bold">
                    {matrixQuadrants.q3.length}
                  </span>
                </div>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-3">
                  {lang === 'vi' ? 'Việc lặt vặt, phản hồi tin nhắn hoặc ủy thác nếu có thể.' : 'Interfering tasks or quick operational items.'}
                </p>
                <div className="space-y-1.5 flex-1 overflow-y-auto max-h-64">
                  {matrixQuadrants.q3.length === 0 ? (
                    <div className="text-[11px] text-gray-400 italic text-center py-6">
                      {lang === 'vi' ? 'Trống' : 'Empty'}
                    </div>
                  ) : (
                    matrixQuadrants.q3.map((t) => (
                      <div
                        key={t.id}
                        className="bg-white dark:bg-[#131b2e] p-2.5 rounded-xl border border-amber-200/50 dark:border-amber-900/40 flex items-center justify-between gap-2 text-xs shadow-2xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <button
                            type="button"
                            onClick={() => onSetTaskStatus(t.id, t.status === 'completed' ? 'todo' : 'completed')}
                            className="cursor-pointer shrink-0"
                          >
                            {t.status === 'completed' ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            ) : (
                              <Circle className="w-4 h-4 text-gray-300 dark:text-gray-600 hover:text-emerald-500" />
                            )}
                          </button>
                          <span className={`truncate font-medium ${t.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-800 dark:text-gray-100'}`}>
                            {t.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => onDeleteTask(t.id)}
                            className="p-1 text-gray-400 hover:text-rose-600 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Q4: Eliminate */}
              <div className="bg-slate-50/40 dark:bg-slate-900/30 border border-slate-300/80 dark:border-slate-800 rounded-2xl p-4 flex flex-col min-h-[220px]">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      {lang === 'vi' ? 'Q4: Cân Nhắc Hủy (Không gấp, Không quan trọng)' : 'Q4: Eliminate (Not Urgent, Not Important)'}
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-200/60 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                    {matrixQuadrants.q4.length}
                  </span>
                </div>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-3">
                  {lang === 'vi' ? 'Việc gây xao nhãng, nên trì hoãn hoặc loại bỏ.' : 'Time-wasters or non-essential backlog.'}
                </p>
                <div className="space-y-1.5 flex-1 overflow-y-auto max-h-64">
                  {matrixQuadrants.q4.length === 0 ? (
                    <div className="text-[11px] text-gray-400 italic text-center py-6">
                      {lang === 'vi' ? 'Trống' : 'Empty'}
                    </div>
                  ) : (
                    matrixQuadrants.q4.map((t) => (
                      <div
                        key={t.id}
                        className="bg-white dark:bg-[#131b2e] p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 text-xs shadow-2xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <button
                            type="button"
                            onClick={() => onSetTaskStatus(t.id, t.status === 'completed' ? 'todo' : 'completed')}
                            className="cursor-pointer shrink-0"
                          >
                            {t.status === 'completed' ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            ) : (
                              <Circle className="w-4 h-4 text-gray-300 dark:text-gray-600 hover:text-emerald-500" />
                            )}
                          </button>
                          <span className={`truncate font-medium ${t.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-800 dark:text-gray-100'}`}>
                            {t.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => onDeleteTask(t.id)}
                            className="p-1 text-gray-400 hover:text-rose-600 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {/* Task list (only in list view) */}
          {viewMode === 'list' && (
            <>
              {filteredTasks.length === 0 ? (
                <div className="bg-white dark:bg-[#131b2e] rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 p-10 text-center">
                  <ListChecks className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                  <p className="text-xs text-gray-400">
                    {lang === 'vi' ? 'Không có công việc nào phù hợp bộ lọc.' : 'No tasks match this filter.'}
                  </p>
                </div>
              ) : (
            <div className="space-y-2">
              {filteredTasks.map((task) => {
                const cat = categoryOf(task.categoryId);
                const priority = TASK_PRIORITY_META[task.priority];
                const ratio = computeTaskCompletionRatio(task);
                const overdue = isTaskOverdue(task, today);
                const isOpen = expanded.has(task.id);
                const goal = goals.find((g) => g.id === task.goalId);
                const doneSubtasks = task.subtasks.filter((s) => s.done).length;

                return (
                  <div
                    key={task.id}
                    className={`bg-white dark:bg-[#131b2e] rounded-2xl border shadow-xs transition-colors ${
                      overdue
                        ? 'border-rose-200 dark:border-rose-900/70'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="p-3.5 flex items-start gap-3">
                      <button
                        onClick={() =>
                          onSetTaskStatus(
                            task.id,
                            task.status === 'completed' ? 'todo' : 'completed'
                          )
                        }
                        className="mt-0.5 shrink-0 cursor-pointer"
                        title={lang === 'vi' ? 'Đánh dấu hoàn thành' : 'Toggle complete'}
                      >
                        {task.status === 'completed' ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        ) : (
                          <Circle className="w-5 h-5 text-gray-300 dark:text-gray-600 hover:text-emerald-500 transition-colors" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4
                            className={`text-sm font-semibold leading-snug ${
                              task.status === 'completed'
                                ? 'line-through text-gray-400'
                                : 'text-gray-900 dark:text-gray-100'
                            }`}
                          >
                            {task.title}
                          </h4>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => {
                                setEditingTask(task);
                                setFormTitle(task.title);
                                setFormPriority(task.priority);
                                setFormCategory(task.categoryId);
                                setFormGoal(task.goalId || '');
                                setFormDueDate(task.dueDate || '');
                                setFormStartTime(task.startTime || '');
                                setFormEndTime(task.endTime || '');
                                setFormNotes(task.notes || '');
                                setShowTaskForm(true);
                              }}
                              className="p-1 text-gray-400 hover:text-blue-600 rounded cursor-pointer"
                              title={lang === 'vi' ? 'Sửa' : 'Edit'}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onDeleteTask(task.id)}
                              className="p-1 text-gray-400 hover:text-rose-600 rounded cursor-pointer"
                              title={lang === 'vi' ? 'Xóa' : 'Delete'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold ${priority.badgeClass}`}
                          >
                            {lang === 'vi' ? priority.labelVi : priority.label}
                          </span>
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded border font-medium text-gray-600 dark:text-gray-300 border-slate-200 dark:border-gray-700 flex items-center gap-1"
                            style={{ borderLeftColor: cat?.color, borderLeftWidth: 3 }}
                          >
                            {lang === 'vi' ? cat?.nameVi || task.categoryId : cat?.name || task.categoryId}
                          </span>
                          {task.dueDate && (
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-medium flex items-center gap-1 ${
                                overdue
                                  ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300'
                                  : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                              }`}
                            >
                              <CalIcon className="w-2.5 h-2.5" />
                              {task.dueDate}
                              {task.startTime && ` · ${task.startTime}`}
                            </span>
                          )}
                          {goal && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300 font-medium flex items-center gap-1">
                              <Target className="w-2.5 h-2.5" />
                              {goal.title}
                            </span>
                          )}
                          {task.subtasks.length > 0 && (
                            <button
                              onClick={() => toggleExpanded(task.id)}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 font-medium flex items-center gap-1 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
                            >
                              {isOpen ? (
                                <ChevronDown className="w-2.5 h-2.5" />
                              ) : (
                                <ChevronRight className="w-2.5 h-2.5" />
                              )}
                              {doneSubtasks}/{task.subtasks.length}
                            </button>
                          )}
                          {task.dueDate && task.startTime && (
                            <button
                              onClick={() => onOpenTaskOnCalendar(task.dueDate!)}
                              className="text-[10px] px-1.5 py-0.5 rounded text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 font-medium cursor-pointer"
                            >
                              {lang === 'vi' ? 'Xem trên Lịch' : 'View on Calendar'}
                            </button>
                          )}
                          {task.status !== 'completed' && onStartFocus && (
                            <button
                              onClick={() => onStartFocus(task.id)}
                              className="text-[10px] px-2 py-0.5 rounded text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/40 hover:bg-violet-100 dark:hover:bg-violet-900/50 font-medium cursor-pointer flex items-center gap-1 transition-colors"
                              title={
                                lang === 'vi'
                                  ? 'Bắt đầu phiên tập trung Pomodoro cho công việc này'
                                  : 'Start Pomodoro focus session for this task'
                              }
                            >
                              <Timer className="w-2.5 h-2.5" />
                              <span>{lang === 'vi' ? 'Tập trung' : 'Focus'}</span>
                            </button>
                          )}
                        </div>

                        {task.subtasks.length > 0 && (
                          <div className="mt-2">
                            <ProgressBar
                              percent={Math.round(ratio * 100)}
                              color={task.status === 'completed' ? '#33B679' : cat?.color || '#3F51B5'}
                              height={4}
                            />
                          </div>
                        )}

                        {/* Sub-tasks */}
                        {isOpen && (
                          <div className="mt-2.5 pl-1 space-y-1.5 border-l-2 border-gray-100 dark:border-slate-800 ml-1">
                            {task.subtasks.map((sub) => (
                              <div key={sub.id} className="flex items-center gap-2 pl-2 group/sub">
                                <button
                                  onClick={() => onToggleSubtask(task.id, sub.id)}
                                  className="shrink-0 cursor-pointer"
                                >
                                  {sub.done ? (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                  ) : (
                                    <Circle className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600" />
                                  )}
                                </button>
                                <span
                                  className={`text-[11px] flex-1 ${
                                    sub.done ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-300'
                                  }`}
                                >
                                  {sub.title}
                                </span>
                                <button
                                  onClick={() => onRemoveSubtask(task.id, sub.id)}
                                  className="opacity-0 group-hover/sub:opacity-100 text-gray-300 hover:text-rose-500 cursor-pointer"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}

                            <form
                              onSubmit={(e) => {
                                e.preventDefault();
                                const draft = subtaskDraft[task.id] || '';
                                if (!draft.trim()) return;
                                onAddSubtask(task.id, draft);
                                setSubtaskDraft((prev) => ({ ...prev, [task.id]: '' }));
                              }}
                              className="flex items-center gap-1.5 pl-2 pt-1"
                            >
                              <Plus className="w-3 h-3 text-gray-400 shrink-0" />
                              <input
                                type="text"
                                value={subtaskDraft[task.id] || ''}
                                onChange={(e) =>
                                  setSubtaskDraft((prev) => ({ ...prev, [task.id]: e.target.value }))
                                }
                                placeholder={
                                  lang === 'vi' ? 'Thêm việc con...' : 'Add sub-task...'
                                }
                                className="flex-1 text-[11px] bg-transparent border-b border-transparent focus:border-blue-400 outline-hidden py-0.5 text-gray-700 dark:text-gray-300"
                              />
                            </form>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Status selector */}
                    <div className="px-3.5 pb-2.5 flex items-center gap-1">
                      {(['todo', 'in_progress', 'completed'] as TaskStatus[]).map((st) => {
                        const meta = TASK_STATUS_META[st];
                        const active = task.status === st;
                        return (
                          <button
                            key={st}
                            onClick={() => onSetTaskStatus(task.id, st)}
                            className={`text-[10px] px-2 py-0.5 rounded-full font-semibold transition-all cursor-pointer border ${
                              active
                                ? 'text-white border-transparent'
                                : 'text-gray-500 dark:text-gray-400 border-slate-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                            }`}
                            style={active ? { backgroundColor: meta.color } : undefined}
                          >
                            {lang === 'vi' ? meta.labelVi : meta.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          </>
        )}
        </div>

        {/* Goals column */}
        <div className="xl:col-span-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
              <Target className="w-4 h-4 text-indigo-500" />
              {lang === 'vi' ? 'Mục tiêu & Tiến độ' : 'Goals & Progress'}
            </h2>
            <span className="text-[11px] text-gray-400 font-mono">{goals.length}</span>
          </div>

          {goals.length === 0 ? (
            <div className="bg-white dark:bg-[#131b2e] rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 p-8 text-center">
              <Target className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
              <p className="text-xs text-gray-400">
                {lang === 'vi' ? 'Chưa có mục tiêu nào.' : 'No goals yet.'}
              </p>
            </div>
          ) : (
            goals.map((goal) => {
              const prog = goalProgress.find((p) => p.goalId === goal.id);
              const percent = prog?.percent || 0;
              const linked = tasks.filter((t) => t.goalId === goal.id);
              return (
                <div
                  key={goal.id}
                  className="bg-white dark:bg-[#131b2e] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100 leading-snug">
                        {goal.title}
                      </h4>
                      {goal.description && (
                        <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-2">
                          {goal.description}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => onDeleteGoal(goal.id)}
                      className="p-1 text-gray-300 hover:text-rose-500 rounded shrink-0 cursor-pointer"
                      title={lang === 'vi' ? 'Xóa mục tiêu' : 'Delete goal'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-[11px] mb-1.5">
                    <span className="text-gray-500 dark:text-gray-400 font-medium">
                      {prog?.completedTasks || 0}/{prog?.totalTasks || 0}{' '}
                      {lang === 'vi' ? 'công việc' : 'tasks'}
                    </span>
                    <span className="font-mono font-bold" style={{ color: goal.color }}>
                      {percent}%
                    </span>
                  </div>

                  <ProgressBar percent={percent} color={goal.color} height={7} />

                  <div className="flex items-center justify-between mt-2 text-[10px] text-gray-400">
                    <span>
                      {linked.length === 0
                        ? lang === 'vi'
                          ? 'Chưa gắn công việc nào'
                          : 'No linked tasks'
                        : lang === 'vi'
                        ? `${linked.filter((t) => t.status !== 'completed').length} việc còn lại`
                        : `${linked.filter((t) => t.status !== 'completed').length} remaining`}
                    </span>
                    {goal.targetDate && (
                      <span className="font-mono flex items-center gap-1">
                        <CalIcon className="w-2.5 h-2.5" />
                        {goal.targetDate}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {/* Daily Habits & Routines */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
                {lang === 'vi' ? 'Thói Quen & Routine Hàng Ngày' : 'Daily Habits & Routines'}
              </h2>
              {onAddHabit && (
                <button
                  type="button"
                  onClick={() => setShowHabitForm(true)}
                  className="flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{lang === 'vi' ? 'Thêm thói quen' : 'Add habit'}</span>
                </button>
              )}
            </div>

            <div className="space-y-2">
              {habits.map((habit) => {
                const isDone = isHabitDoneOn(habit, today);
                const streak = habitCurrentStreak(habit, today);
                return (
                  <div
                    key={habit.id}
                    className="bg-white dark:bg-[#131b2e] p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <button
                          type="button"
                          onClick={() => onToggleHabit?.(habit.id, today)}
                          className="cursor-pointer shrink-0"
                        >
                          {isDone ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 fill-emerald-100 dark:fill-emerald-950" />
                          ) : (
                            <Circle className="w-4 h-4 text-gray-300 dark:text-gray-600 hover:text-amber-500" />
                          )}
                        </button>
                        <div className="min-w-0">
                          <p
                            className={`text-xs font-semibold truncate ${
                              isDone
                                ? 'line-through text-gray-400 dark:text-gray-500 font-normal'
                                : 'text-gray-800 dark:text-gray-100'
                            }`}
                          >
                            {habit.title}
                          </p>
                          <span className="text-[10px] text-gray-400">
                            {habit.timeOfDay === 'morning'
                              ? lang === 'vi'
                                ? 'Buổi sáng'
                                : 'Morning'
                              : habit.timeOfDay === 'afternoon'
                              ? lang === 'vi'
                                ? 'Buổi chiều'
                                : 'Afternoon'
                              : habit.timeOfDay === 'evening'
                              ? lang === 'vi'
                                ? 'Buổi tối'
                                : 'Evening'
                              : lang === 'vi'
                              ? 'Cả ngày'
                              : 'Anytime'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {streak > 0 && (
                          <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full">
                            <Flame className="w-3 h-3 text-amber-500 fill-amber-500" />
                            <span>{streak}d</span>
                          </span>
                        )}
                        {onDeleteHabit && (
                          <button
                            type="button"
                            onClick={() => onDeleteHabit(habit.id)}
                            className="p-1 text-gray-300 hover:text-rose-500 rounded cursor-pointer"
                            title={lang === 'vi' ? 'Xoá thói quen' : 'Delete habit'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* 7-Day Weekly Streak Grid */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-1">
                      {weekDays.map((d) => {
                        const done = isHabitDoneOn(habit, d.dateStr);
                        return (
                          <button
                            key={d.dateStr}
                            type="button"
                            onClick={() => onToggleHabit?.(habit.id, d.dateStr)}
                            className={`flex-1 flex flex-col items-center justify-center py-1 rounded-lg text-[9px] transition-all cursor-pointer ${
                              done
                                ? 'bg-emerald-500 text-white font-bold shadow-xs'
                                : d.isToday
                                  ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 font-bold border border-blue-500/30'
                                  : 'bg-slate-100 dark:bg-slate-800/70 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                            title={`${d.dayName} (${d.dateStr})`}
                          >
                            <span className="scale-90 opacity-80">{d.dayName}</span>
                            <span className="text-[10px] font-mono mt-0.5">{d.dayNum}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {habits.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-4">
                  {lang === 'vi' ? 'Chưa có thói quen nào.' : 'No habits yet.'}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Task form modal */}
      {showTaskForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <form
            onSubmit={handleSubmitTask}
            className="bg-white dark:bg-[#131b2e] w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-gray-700 overflow-hidden max-h-[92vh] flex flex-col"
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                {editingTask
                  ? lang === 'vi'
                    ? 'Sửa công việc'
                    : 'Edit task'
                  : lang === 'vi'
                  ? 'Thêm công việc'
                  : 'New task'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowTaskForm(false);
                  resetTaskForm();
                }}
                className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3 overflow-y-auto">
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-300 mb-1">
                  {lang === 'vi' ? 'Tiêu đề' : 'Title'}
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  autoFocus
                  required
                  className="w-full text-xs px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-300 mb-1">
                    {lang === 'vi' ? 'Ưu tiên' : 'Priority'}
                  </label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as TaskPriority)}
                    className="w-full text-xs px-2.5 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100"
                  >
                    <option value="high">{lang === 'vi' ? 'Cao' : 'High'}</option>
                    <option value="medium">{lang === 'vi' ? 'Trung bình' : 'Medium'}</option>
                    <option value="low">{lang === 'vi' ? 'Thấp' : 'Low'}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-300 mb-1">
                    {lang === 'vi' ? 'Danh mục' : 'Category'}
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full text-xs px-2.5 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {lang === 'vi' ? c.nameVi : c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-300 mb-1">
                  {lang === 'vi' ? 'Thuộc mục tiêu' : 'Linked goal'}
                </label>
                <select
                  value={formGoal}
                  onChange={(e) => setFormGoal(e.target.value)}
                  className="w-full text-xs px-2.5 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100"
                >
                  <option value="">{lang === 'vi' ? '— Không gắn —' : '— None —'}</option>
                  {goals.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-300 mb-1">
                    {lang === 'vi' ? 'Hạn chót' : 'Deadline'}
                  </label>
                  <input
                    type="date"
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    className="w-full text-xs px-2 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-300 mb-1">
                    {lang === 'vi' ? 'Bắt đầu' : 'Start'}
                  </label>
                  <input
                    type="time"
                    value={formStartTime}
                    onChange={(e) => setFormStartTime(e.target.value)}
                    className="w-full text-xs px-2 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-300 mb-1">
                    {lang === 'vi' ? 'Kết thúc' : 'End'}
                  </label>
                  <input
                    type="time"
                    value={formEndTime}
                    onChange={(e) => setFormEndTime(e.target.value)}
                    className="w-full text-xs px-2 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 font-mono"
                  />
                </div>
              </div>

              <p className="text-[10px] text-gray-400 leading-relaxed">
                {lang === 'vi'
                  ? 'Điền giờ bắt đầu để công việc này tự động xuất hiện trên Lịch.'
                  : 'Add a start time to mirror this task onto the Calendar.'}
              </p>

              <div>
                <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-300 mb-1">
                  {lang === 'vi' ? 'Ghi chú' : 'Notes'}
                </label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  rows={2}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 resize-none"
                />
              </div>
            </div>

            <div className="px-5 py-3 border-t border-gray-100 dark:border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowTaskForm(false);
                  resetTaskForm();
                }}
                className="px-3.5 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg cursor-pointer"
              >
                {lang === 'vi' ? 'Hủy' : 'Cancel'}
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                {lang === 'vi' ? 'Lưu' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Goal form modal */}
      {showGoalForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <form
            onSubmit={handleSubmitGoal}
            className="bg-white dark:bg-[#131b2e] w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-gray-700 overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                {lang === 'vi' ? 'Thêm mục tiêu' : 'New goal'}
              </h3>
              <button
                type="button"
                onClick={() => setShowGoalForm(false)}
                className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-300 mb-1">
                  {lang === 'vi' ? 'Tên mục tiêu' : 'Goal title'}
                </label>
                <input
                  type="text"
                  value={goalTitle}
                  onChange={(e) => setGoalTitle(e.target.value)}
                  autoFocus
                  required
                  className="w-full text-xs px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-300 mb-1">
                    {lang === 'vi' ? 'Danh mục' : 'Category'}
                  </label>
                  <select
                    value={goalCategory}
                    onChange={(e) => setGoalCategory(e.target.value)}
                    className="w-full text-xs px-2.5 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {lang === 'vi' ? c.nameVi : c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-300 mb-1">
                    {lang === 'vi' ? 'Ngày đích' : 'Target date'}
                  </label>
                  <input
                    type="date"
                    value={goalTargetDate}
                    onChange={(e) => setGoalTargetDate(e.target.value)}
                    className="w-full text-xs px-2 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 font-mono"
                  />
                </div>
              </div>
              <p className="text-[10px] text-gray-400 leading-relaxed">
                {lang === 'vi'
                  ? 'Tiến độ tự động tính từ các công việc được gắn vào mục tiêu này.'
                  : 'Progress is computed automatically from the tasks linked to this goal.'}
              </p>
            </div>

            <div className="px-5 py-3 border-t border-gray-100 dark:border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowGoalForm(false)}
                className="px-3.5 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg cursor-pointer"
              >
                {lang === 'vi' ? 'Hủy' : 'Cancel'}
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                {lang === 'vi' ? 'Tạo mục tiêu' : 'Create goal'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Habit form modal */}
      {showHabitForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <form
            onSubmit={handleSubmitHabit}
            className="bg-white dark:bg-[#131b2e] w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-gray-700 overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span>{lang === 'vi' ? 'Thêm thói quen mới' : 'New Habit'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowHabitForm(false)}
                className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-300 mb-1">
                  {lang === 'vi' ? 'Tên thói quen' : 'Habit title'}
                </label>
                <input
                  type="text"
                  value={habitTitle}
                  onChange={(e) => setHabitTitle(e.target.value)}
                  autoFocus
                  required
                  placeholder={
                    lang === 'vi'
                      ? 'Ví dụ: Đọc sách 20 phút mỗi ngày...'
                      : 'e.g. Read 20 minutes daily...'
                  }
                  className="w-full text-xs px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-300 mb-1">
                  {lang === 'vi' ? 'Khung thời gian' : 'Time of day'}
                </label>
                <select
                  value={habitTimeOfDay}
                  onChange={(e) => setHabitTimeOfDay(e.target.value as RoutineTimeOfDay)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100"
                >
                  <option value="morning">{lang === 'vi' ? 'Buổi sáng' : 'Morning'}</option>
                  <option value="afternoon">{lang === 'vi' ? 'Buổi chiều' : 'Afternoon'}</option>
                  <option value="evening">{lang === 'vi' ? 'Buổi tối' : 'Evening'}</option>
                  <option value="anytime">{lang === 'vi' ? 'Linh hoạt cả ngày' : 'Anytime'}</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowHabitForm(false)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 cursor-pointer"
                >
                  {lang === 'vi' ? 'Hủy' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={!habitTitle.trim()}
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white cursor-pointer disabled:opacity-40"
                >
                  {lang === 'vi' ? 'Lưu thói quen' : 'Save habit'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

