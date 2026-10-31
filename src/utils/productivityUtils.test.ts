import {
  bmi,
  bmiLabel,
  buildTaskEvents,
  computeBudgetStatus,
  computeGoalProgress,
  computeTaskCompletionRatio,
  dailyCashFlow,
  expenseByCategory,
  filterTransactions,
  focusMinutesByDay,
  formatDuration,
  formatMoney,
  healthAverages,
  isTaskOverdue,
  macroCalories,
  macroPercentages,
  monthPrefixOf,
  sortTasks,
  summarizeFinance,
  taskToCalendarEvent,
  tasksDueOn,
  totalFocusMinutes,
  weightTrend,
} from './productivityUtils';
import { BudgetSettings, GoalItem, TaskItem, Transaction } from '../types/productivity';
import { FocusSession } from '../types/productivity';
import { HealthDayLog } from '../types/productivity';

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`Assertion failed: ${msg}`);
}

console.log('Running productivityUtils tests...');

// --- Tasks -----------------------------------------------------------------

const baseTask: TaskItem = {
  id: 'task-1',
  title: 'Ôn tập giải tích',
  status: 'todo',
  priority: 'high',
  dueDate: '2026-10-30',
  startTime: '09:00',
  endTime: '10:00',
  categoryId: 'study',
  subtasks: [],
  createdAt: 1000,
};

// 1. Completion ratio with no subtasks follows the task status.
assert(computeTaskCompletionRatio(baseTask) === 0, 'open task is 0%');
assert(
  computeTaskCompletionRatio({ ...baseTask, status: 'completed' }) === 1,
  'completed task is 100%'
);

// 2. Completion ratio blends completed sub-tasks with the parent status.
const withSubtasks: TaskItem = {
  ...baseTask,
  subtasks: [
    { id: 's1', title: 'Chương 1', done: true },
    { id: 's2', title: 'Chương 2', done: false },
  ],
};
assert(computeTaskCompletionRatio(withSubtasks) === 1 / 3, 'one of three units done → 33%');

// 3. Goal progress is derived from linked tasks only.
const goal: GoalItem = {
  id: 'goal-1',
  title: 'GPA 3.6',
  categoryId: 'study',
  color: '#8E24AA',
  createdAt: 1,
};
const goalProgress = computeGoalProgress(goal, [
  { ...baseTask, goalId: 'goal-1', status: 'completed' },
  { ...baseTask, id: 'task-2', goalId: 'goal-1', status: 'todo' },
]);
assert(goalProgress.totalTasks === 2, 'two linked tasks');
assert(goalProgress.completedTasks === 1, 'one completed task');
assert(goalProgress.percent === 50, 'goal progress is 50%');

// A goal with no tasks reports an explicit 0, not "complete".
const emptyGoal = computeGoalProgress(goal, []);
assert(emptyGoal.totalTasks === 0 && emptyGoal.percent === 0, 'empty goal is 0%');

// 4. Sorting puts in-progress first, then priority, then earliest deadline.
const sorted = sortTasks([
  { ...baseTask, id: 'c', status: 'completed', priority: 'high' },
  { ...baseTask, id: 'b', status: 'todo', priority: 'low' },
  { ...baseTask, id: 'a', status: 'in_progress', priority: 'medium' },
  { ...baseTask, id: 'd', status: 'todo', priority: 'high' },
]);
assert(
  sorted.map((t) => t.id).join(',') === 'a,d,b,c',
  `unexpected order: ${sorted.map((t) => t.id).join(',')}`
);

// 5. Overdue ignores completed tasks and undated tasks.
assert(isTaskOverdue(baseTask, '2026-10-31') === true, 'past deadline is overdue');
assert(isTaskOverdue(baseTask, '2026-10-30') === false, 'due today is not overdue');
assert(
  isTaskOverdue({ ...baseTask, status: 'completed' }, '2026-10-31') === false,
  'completed tasks are never overdue'
);
assert(
  isTaskOverdue({ ...baseTask, dueDate: undefined }, '2026-10-31') === false,
  'undated tasks are never overdue'
);

// 6. tasksDueOn filters by exact date.
assert(tasksDueOn([baseTask, { ...baseTask, id: 'x', dueDate: '2026-11-01' }], '2026-10-30').length === 1,
  'tasksDueOn matches one task');

// 7. Calendar mirroring requires both a date and a start time.
const mirrored = taskToCalendarEvent(baseTask, '#8E24AA');
assert(mirrored !== null, 'timed task produces an event');
assert(mirrored!.id === 'task-task-1', 'event id is prefixed to avoid collisions');
assert(mirrored!.startDate === '2026-10-30' && mirrored!.startTime === '09:00', 'event keeps date and time');
assert(mirrored!.color === '#8E24AA', 'event uses the category colour');
assert(taskToCalendarEvent({ ...baseTask, startTime: undefined }, '#000') === null,
  'undated-time task is not mirrored');

const builtEvents = buildTaskEvents(
  [baseTask, { ...baseTask, id: 'task-2', startTime: undefined }],
  new Map([['study', '#8E24AA']])
);
assert(builtEvents.length === 1, 'only timed tasks become events');

// --- Focus -----------------------------------------------------------------

assert(formatDuration(0) === '00:00', 'zero formats as 00:00');
assert(formatDuration(90) === '01:30', 'ninety seconds formats as 01:30');
assert(formatDuration(3725) === '1:02:05', 'hour-scale durations include hours');

const sessions: FocusSession[] = [
  {
    id: 'f1',
    mode: 'pomodoro',
    phase: 'focus',
    label: 'Ôn thi',
    startedAt: new Date(2026, 9, 30, 9, 0, 0).getTime(),
    endedAt: new Date(2026, 9, 30, 9, 25, 0).getTime(),
    durationSeconds: 1500,
    completed: true,
  },
  {
    id: 'f2',
    mode: 'stopwatch',
    label: 'Đọc sách',
    startedAt: new Date(2026, 9, 29, 20, 0, 0).getTime(),
    endedAt: new Date(2026, 9, 29, 20, 30, 0).getTime(),
    durationSeconds: 1800,
    completed: true,
  },
];

const buckets = focusMinutesByDay(sessions, 3, new Date(2026, 9, 30));
assert(buckets.length === 3, 'three day buckets');
assert(buckets[buckets.length - 1].minutes === 25, 'today has 25 focus minutes');
assert(totalFocusMinutes(sessions, '2026-10-30', '2026-10-30') === 25, 'range filter sums one day');
assert(totalFocusMinutes(sessions) === 55, 'all sessions sum to 55 minutes');

// --- Finance ---------------------------------------------------------------

const transactions: Transaction[] = [
  { id: 't1', title: 'Lương', amount: 15000000, type: 'income', category: 'salary', date: '2026-10-01', createdAt: 1 },
  { id: 't2', title: 'Cà phê', amount: 45000, type: 'expense', category: 'food', date: '2026-10-02', createdAt: 2 },
  { id: 't3', title: 'Sách', amount: 300000, type: 'expense', category: 'study', date: '2026-10-03', createdAt: 3 },
  { id: 't4', title: 'Ăn trưa', amount: 75000, type: 'expense', category: 'food', date: '2026-10-04', createdAt: 4 },
];

const summary = summarizeFinance(transactions, '2026-10');
assert(summary.income === 15000000, 'income sums correctly');
assert(summary.expense === 420000, 'expense sums correctly');
assert(summary.balance === 14580000, 'balance is income − expense');
assert(summary.transactionCount === 4, 'all four transactions counted');

assert(summarizeFinance(transactions, '2026-11').transactionCount === 0, 'empty month has no transactions');

// Budget thresholds: <80 % ok, ≥80 % warning, ≥100 % over.
assert(computeBudgetStatus(100, 1000).level === 'ok', '10% is ok');
assert(computeBudgetStatus(800, 1000).level === 'warning', '80% is a warning');
assert(computeBudgetStatus(1000, 1000).level === 'over', '100% is over');
assert(computeBudgetStatus(500, 1000).remaining === 500, 'remaining is limit − spent');
assert(computeBudgetStatus(500, 0).level === 'ok', 'a zero limit never reports over');

assert(monthPrefixOf(new Date(2026, 9, 30)) === '2026-10', 'month prefix is zero padded');

const byCategory = expenseByCategory(transactions, '2026-10');
assert(byCategory.length === 2, 'two expense categories');
assert(byCategory[0].category === 'study', 'sorted by amount descending');
assert(byCategory[1].amount === 120000, 'food totals are merged');

const flow = dailyCashFlow(transactions, '2026-10');
assert(flow.length === 31, 'October has 31 days');
assert(flow[0].income === 15000000, 'day 1 has the salary');
assert(flow[1].expense === 45000, 'day 2 has the coffee');

assert(formatMoney(1500000, 'VND').includes('₫'), 'VND formatting includes the symbol');
assert(formatMoney(1500, 'USD').startsWith('$'), 'USD formatting includes the dollar sign');

const filtered = filterTransactions(transactions, { monthPrefix: '2026-10', category: 'food', query: 'cà' });
assert(filtered.length === 1 && filtered[0].id === 't2', 'search is case-insensitive and category-scoped');
assert(filterTransactions(transactions, { monthPrefix: '2026-10' }).length === 4, 'no filter keeps all');

const budget: BudgetSettings = { monthlyLimit: 5000000, categoryLimits: {}, currency: 'VND' };
assert(budget.monthlyLimit === 5000000, 'budget type keeps the monthly limit');

// --- Health ----------------------------------------------------------------

assert(bmi(70, 175) === 22.9, 'BMI is rounded to one decimal');
assert(bmi(0, 175) === 0, 'BMI with no weight is 0');
assert(bmiLabel(22.9, 'vi') === 'Bình thường', 'normal BMI label (vi)');
assert(bmiLabel(22.9, 'en') === 'Normal', 'normal BMI label (en)');
assert(bmiLabel(17, 'en') === 'Underweight', 'underweight label');
assert(bmiLabel(31, 'en') === 'Obese', 'obese label');
assert(bmiLabel(0, 'vi') === 'Chưa có dữ liệu', 'missing BMI label');

assert(macroCalories(150, 200, 60) === 1940, 'macro calories use 4/4/9');
const macroPct = macroPercentages(150, 200, 60);
assert(macroPct.protein + macroPct.carbs + macroPct.fat >= 99, 'macro percentages sum to ~100');
assert(macroPercentages(0, 0, 0).protein === 0, 'empty macros are 0%');

const healthLogs: HealthDayLog[] = [
  { date: '2026-10-28', weightKg: 68.5, steps: 8000, waterMl: 2000, sleepHours: 7, caloriesIn: 2100 },
  { date: '2026-10-29', weightKg: 68.1, steps: 10000, waterMl: 2500, sleepHours: 8, caloriesIn: 2300 },
  { date: '2026-10-30', weightKg: 67.9, steps: 6000, waterMl: 1500, sleepHours: 7.5, caloriesIn: 2200 },
];

const trend = weightTrend(healthLogs, 30, new Date(2026, 9, 30));
assert(trend.length === 3, 'three weight points');
assert(trend[0].date === '2026-10-28' && trend[2].weightKg === 67.9, 'weight trend is chronological');
assert(weightTrend(healthLogs, 1, new Date(2026, 9, 30)).length === 1, 'one-day window keeps only today');

const averages = healthAverages(healthLogs, 7, new Date(2026, 9, 30));
assert(averages.steps === 8000, 'average steps over three days');
assert(averages.sleepHours === 7.5, 'average sleep over three days');
assert(averages.caloriesIn === 2200, 'average calories over three days');
assert(healthAverages([], 7).steps === 0, 'no logs yields zeros');

console.log('All productivityUtils tests passed successfully!');

