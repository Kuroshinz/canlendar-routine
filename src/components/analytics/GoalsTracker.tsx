import React, { useState } from 'react';
import { WeeklyGoal } from '../../types/calendar';
import { CategoryBreakdownItem } from '../../types/multiHub';
import { Target, Plus, CheckCircle2, Trash2 } from 'lucide-react';

interface GoalsTrackerProps {
  categoryBreakdown: CategoryBreakdownItem[];
  lang: 'vi' | 'en';
}

export const GoalsTracker: React.FC<GoalsTrackerProps> = ({ categoryBreakdown, lang }) => {
  const [goals, setGoals] = useState<WeeklyGoal[]>(() => {
    try {
      const saved = localStorage.getItem('gcal_weekly_goals');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      { id: 'g-1', category: 'work', targetHours: 25 },
      { id: 'g-2', category: 'study', targetHours: 10 },
      { id: 'g-3', category: 'personal', targetHours: 8 },
    ];
  });

  const [newCat, setNewCat] = useState('');
  const [newHours, setNewHours] = useState('5');
  const [isAdding, setIsAdding] = useState(false);

  const saveGoals = (next: WeeklyGoal[]) => {
    setGoals(next);
    localStorage.setItem('gcal_weekly_goals', JSON.stringify(next));
  };

  const handleAddGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCat.trim()) return;
    const hours = parseFloat(newHours) || 5;
    const item: WeeklyGoal = {
      id: `goal-${Date.now()}`,
      category: newCat.trim(),
      targetHours: hours,
    };
    saveGoals([...goals, item]);
    setNewCat('');
    setIsAdding(false);
  };

  const handleDelete = (id: string) => {
    saveGoals(goals.filter((g) => g.id !== id));
  };

  return (
    <div className="bg-white dark:bg-[#1a1e24] p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
            {lang === 'vi' ? 'Mục tiêu Thời gian Hàng tuần' : 'Weekly Time Goals'}
          </h3>
        </div>

        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 px-2.5 py-1 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{lang === 'vi' ? 'Thêm mục tiêu' : 'Add Goal'}</span>
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleAddGoal} className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl flex gap-2 items-center text-xs">
          <input
            type="text"
            placeholder={lang === 'vi' ? 'Tên danh mục (vd: Thể thao, Học tập)' : 'Category name'}
            value={newCat}
            onChange={(e) => setNewCat(e.target.value)}
            className="flex-1 px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
            required
          />
          <input
            type="number"
            min="1"
            max="80"
            value={newHours}
            onChange={(e) => setNewHours(e.target.value)}
            className="w-16 px-2 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-mono text-center"
          />
          <span className="text-gray-500 font-medium">h</span>
          <button
            type="submit"
            className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors shrink-0"
          >
            {lang === 'vi' ? 'Lưu' : 'Save'}
          </button>
        </form>
      )}

      <div className="flex flex-col gap-3">
        {goals.map((g) => {
          // Find actual minutes from breakdown
          const match = categoryBreakdown.find(
            (c) =>
              c.categoryId.toLowerCase() === g.category.toLowerCase() ||
              c.categoryName.toLowerCase().includes(g.category.toLowerCase())
          );
          const actualHours = match ? Math.round((match.minutes / 60) * 10) / 10 : 0;
          const percent = Math.min(100, Math.round((actualHours / g.targetHours) * 100));
          const isCompleted = actualHours >= g.targetHours;

          return (
            <div key={g.id} className="p-3 rounded-xl bg-gray-50/70 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800/80">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                  )}
                  <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 capitalize">
                    {g.category}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-medium text-gray-600 dark:text-gray-300">
                    <strong className="text-gray-900 dark:text-gray-100">{actualHours}h</strong> / {g.targetHours}h
                  </span>
                  <button
                    onClick={() => handleDelete(g.id)}
                    className="text-gray-400 hover:text-red-500 p-0.5 rounded transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                <div
                  style={{ width: `${percent}%` }}
                  className={`h-full rounded-full transition-all duration-500 ${
                    isCompleted ? 'bg-emerald-500' : 'bg-indigo-600'
                  }`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

