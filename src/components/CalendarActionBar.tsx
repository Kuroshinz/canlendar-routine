import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Filter,
  Check,
  Undo,
  Redo,
  Calendar as CalIcon,
} from 'lucide-react';
import { CalendarCategory, CalendarViewType, EventType } from '../types/calendar';

interface CalendarActionBarProps {
  currentDate: Date;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  view: CalendarViewType;
  onViewChange: (view: CalendarViewType) => void;
  lang: 'vi' | 'en';
  categories: CalendarCategory[];
  onToggleCategory: (id: string) => void;
  onAddCategory?: (name: string, color: string) => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  onOpenCreateModal: (type?: EventType) => void;
}

export const CalendarActionBar: React.FC<CalendarActionBarProps> = ({
  currentDate,
  onPrev,
  onNext,
  onToday,
  view,
  onViewChange,
  lang,
  categories,
  onToggleCategory,
  onAddCategory,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  onOpenCreateModal,
}) => {
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#2563EB');

  const monthNamesVi = [
    'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
    'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
  ];
  const monthNamesEn = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const currentMonthName =
    lang === 'vi'
      ? monthNamesVi[currentDate.getMonth()]
      : monthNamesEn[currentDate.getMonth()];
  const currentYear = currentDate.getFullYear();

  const calViewOptions: { id: CalendarViewType; labelVi: string; labelEn: string }[] = [
    { id: 'month', labelVi: 'Tháng', labelEn: 'Month' },
    { id: 'week', labelVi: 'Tuần', labelEn: 'Week' },
    { id: 'day', labelVi: 'Ngày', labelEn: 'Day' },
    { id: 'schedule', labelVi: 'Lịch biểu', labelEn: 'Schedule' },
    { id: 'year', labelVi: 'Năm', labelEn: 'Year' },
  ];

  const handleAddCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim() || !onAddCategory) return;
    onAddCategory(newCatName.trim(), newCatColor);
    setNewCatName('');
    setShowNewCategory(false);
  };

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-4 sm:px-6 py-3.5 bg-white dark:bg-[#131b2e] border-b border-slate-200 dark:border-slate-800 rounded-t-2xl shadow-xs">
      {/* Left: Date navigation */}
      <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
        <h2 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <CalIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <span>{currentMonthName} {currentYear}</span>
        </h2>

        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700/60">
          <button
            onClick={onToday}
            className="px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 rounded-md transition-colors cursor-pointer"
          >
            {lang === 'vi' ? 'Hôm nay' : 'Today'}
          </button>
          <button
            onClick={onPrev}
            title={lang === 'vi' ? 'Thời gian trước' : 'Previous'}
            className="p-1 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded-md transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={onNext}
            title={lang === 'vi' ? 'Thời gian tới' : 'Next'}
            className="p-1 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded-md transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Undo / Redo */}
        {(canUndo || canRedo) && (
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700/60">
            {canUndo && (
              <button
                onClick={onUndo}
                title={lang === 'vi' ? 'Hoàn tác (Ctrl+Z)' : 'Undo (Ctrl+Z)'}
                className="p-1 text-blue-600 dark:text-blue-400 hover:bg-white dark:hover:bg-slate-700 rounded-md transition-colors cursor-pointer"
              >
                <Undo className="w-3.5 h-3.5" />
              </button>
            )}
            {canRedo && (
              <button
                onClick={onRedo}
                title={lang === 'vi' ? 'Làm lại (Ctrl+Shift+Z)' : 'Redo (Ctrl+Shift+Z)'}
                className="p-1 text-blue-600 dark:text-blue-400 hover:bg-white dark:hover:bg-slate-700 rounded-md transition-colors cursor-pointer"
              >
                <Redo className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Right: View Pills + Category Filter + Add Event */}
      <div className="flex items-center gap-2 flex-wrap justify-between sm:justify-end">
        {/* View Switcher segment */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700/60">
          {calViewOptions.map((opt) => (
            <button
              key={opt.id}
              onClick={() => onViewChange(opt.id)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                view === opt.id
                  ? 'bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {lang === 'vi' ? opt.labelVi : opt.labelEn}
            </button>
          ))}
        </div>

        {/* Filter Categories Popover */}
        <div className="relative">
          <button
            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            title={lang === 'vi' ? 'Bộ lọc lịch' : 'Filter calendars'}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              showFilterDropdown
                ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-800 shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span className="hidden md:inline">{lang === 'vi' ? 'Bộ lọc lịch' : 'Filter'}</span>
          </button>

          {showFilterDropdown && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setShowFilterDropdown(false)}
              />
              <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl p-3 z-40">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-700/60">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    {lang === 'vi' ? 'Lịch của tôi' : 'My Calendars'}
                  </span>
                  {onAddCategory && (
                    <button
                      onClick={() => setShowNewCategory(!showNewCategory)}
                      className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer flex items-center gap-0.5"
                    >
                      <Plus className="w-3 h-3" />
                      <span>{lang === 'vi' ? 'Thêm' : 'Add'}</span>
                    </button>
                  )}
                </div>

                {showNewCategory && (
                  <form onSubmit={handleAddCategorySubmit} className="mb-2 p-2 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700">
                    <input
                      type="text"
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      placeholder={lang === 'vi' ? 'Tên danh mục mới...' : 'New calendar name...'}
                      className="w-full text-xs px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md mb-2 text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                      autoFocus
                    />
                    <div className="flex items-center justify-between gap-2">
                      <input
                        type="color"
                        value={newCatColor}
                        onChange={(e) => setNewCatColor(e.target.value)}
                        className="w-6 h-6 rounded cursor-pointer border-0 p-0"
                      />
                      <button
                        type="submit"
                        className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold cursor-pointer"
                      >
                        {lang === 'vi' ? 'Lưu' : 'Save'}
                      </button>
                    </div>
                  </form>
                )}

                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {categories.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => onToggleCategory(c.id)}
                      className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors text-left cursor-pointer"
                    >
                      <div
                        className="w-4 h-4 rounded-md flex items-center justify-center transition-colors border"
                        style={{
                          backgroundColor: c.visible ? c.color : 'transparent',
                          borderColor: c.color,
                        }}
                      >
                        {c.visible && <Check className="w-3 h-3 text-white stroke-[3]" />}
                      </div>
                      <span className="text-xs text-slate-700 dark:text-slate-200 font-medium truncate">
                        {lang === 'vi' ? c.nameVi : c.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* + Thêm sự kiện */}
        <button
          onClick={() => onOpenCreateModal('event')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{lang === 'vi' ? 'Thêm sự kiện' : 'Add Event'}</span>
        </button>
      </div>
    </div>
  );
};
