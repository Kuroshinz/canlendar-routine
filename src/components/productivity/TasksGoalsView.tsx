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
} from 'lucide-react';
import {
  GoalItem,
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
}) => {
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'all'>('all');
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [subtaskDraft, setSubtaskDraft] = useState<Record<string, string>>({});

  const today = formatDateString(new Date());

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
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-gray-50/50 dark:bg-gray-900 p-4 md:p-6 lg:p-8 select-none">
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
              className="bg-white dark:bg-[#1a1e24] p-3.5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs flex items-center gap-3"
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
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="bg-gray-200/80 dark:bg-gray-800 p-1 rounded-xl flex text-xs font-semibold">
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
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
              className="flex-1 min-w-32 text-xs px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
            />
          </div>

          {/* Task list */}
          {filteredTasks.length === 0 ? (
            <div className="bg-white dark:bg-[#1a1e24] rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 p-10 text-center">
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
                    className={`bg-white dark:bg-[#1a1e24] rounded-2xl border shadow-xs transition-colors ${
                      overdue
                        ? 'border-rose-200 dark:border-rose-900/70'
                        : 'border-gray-200 dark:border-gray-800'
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
                            className="text-[10px] px-1.5 py-0.5 rounded border font-medium text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 flex items-center gap-1"
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
                          <div className="mt-2.5 pl-1 space-y-1.5 border-l-2 border-gray-100 dark:border-gray-800 ml-1">
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
                                : 'text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
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
            <div className="bg-white dark:bg-[#1a1e24] rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 p-8 text-center">
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
                  className="bg-white dark:bg-[#1a1e24] p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs"
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
        </div>
      </div>

      {/* Task form modal */}
      {showTaskForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <form
            onSubmit={handleSubmitTask}
            className="bg-white dark:bg-[#1a1e24] w-full max-w-lg rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden max-h-[92vh] flex flex-col"
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 dark:border-gray-800">
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
                  className="w-full text-xs px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
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
                    className="w-full text-xs px-2.5 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
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
                    className="w-full text-xs px-2.5 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
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
                  className="w-full text-xs px-2.5 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
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
                    className="w-full text-xs px-2 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-mono"
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
                    className="w-full text-xs px-2 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-mono"
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
                    className="w-full text-xs px-2 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-mono"
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
                  className="w-full text-xs px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 resize-none"
                />
              </div>
            </div>

            <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-2">
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
            className="bg-white dark:bg-[#1a1e24] w-full max-w-md rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 dark:border-gray-800">
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
                  className="w-full text-xs px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
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
                    className="w-full text-xs px-2.5 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
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
                    className="w-full text-xs px-2 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-mono"
                  />
                </div>
              </div>
              <p className="text-[10px] text-gray-400 leading-relaxed">
                {lang === 'vi'
                  ? 'Tiến độ tự động tính từ các công việc được gắn vào mục tiêu này.'
                  : 'Progress is computed automatically from the tasks linked to this goal.'}
              </p>
            </div>

            <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-2">
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
    </div>
  );
};

