import React, { useState } from 'react';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  Calendar as CalendarIcon,
  CheckSquare,
  Bell,
  Trash2,
} from 'lucide-react';
import { CalendarCategory, EventType } from '../types/calendar';
import { formatDateString, getMonthDays } from '../utils/calendarUtils';

interface SidebarProps {
  currentDate: Date;
  onSelectDate: (date: Date) => void;
  isOpen: boolean;
  onCloseMobile: () => void;
  categories: CalendarCategory[];
  onToggleCategory: (id: string) => void;
  onAddCategory: (name: string, color: string) => void;
  onDeleteCategory: (id: string) => void;
  onOpenCreateModal: (type?: EventType) => void;
  lang: 'vi' | 'en';
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentDate,
  onSelectDate,
  isOpen,
  onCloseMobile,
  categories,
  onToggleCategory,
  onAddCategory,
  onDeleteCategory,
  onOpenCreateModal,
  lang,
}) => {
  const [miniYear, setMiniYear] = useState<number>(currentDate.getFullYear());
  const [miniMonth, setMiniMonth] = useState<number>(currentDate.getMonth());
  const [showCreateDropdown, setShowCreateDropdown] = useState(false);
  const [showAddCalendarInput, setShowAddCalendarInput] = useState(false);
  const [newCalName, setNewCalName] = useState('');
  const [newCalColor, setNewCalColor] = useState('#039BE5');

  // Mini calendar navigation
  const handlePrevMiniMonth = () => {
    if (miniMonth === 0) {
      setMiniMonth(11);
      setMiniYear(miniYear - 1);
    } else {
      setMiniMonth(miniMonth - 1);
    }
  };

  const handleNextMiniMonth = () => {
    if (miniMonth === 11) {
      setMiniMonth(0);
      setMiniYear(miniYear + 1);
    } else {
      setMiniMonth(miniMonth + 1);
    }
  };

  const miniMonthDays = getMonthDays(miniYear, miniMonth, false);
  const todayStr = formatDateString(new Date());
  const selectedDateStr = formatDateString(currentDate);

  const monthNamesVi = [
    'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
    'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
  ];
  const monthNamesEn = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const weekdayInitials = lang === 'vi'
    ? ['C', 'H', 'B', 'T', 'N', 'S', 'B'] // CN, T2, T3, T4, T5, T6, T7
    : ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const handleCreateNewCalendar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCalName.trim()) return;
    onAddCategory(newCalName.trim(), newCalColor);
    setNewCalName('');
    setShowAddCalendarInput(false);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-30 lg:hidden"
        onClick={onCloseMobile}
        aria-hidden="true"
      />

      <aside className="fixed lg:static top-16 bottom-0 left-0 w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 z-30 flex flex-col p-3 overflow-y-auto shrink-0 select-none shadow-lg lg:shadow-none transition-transform">
        {/* + Create Pill Button with Google 4-color plus */}
        <div className="relative mb-5">
          <button
            onClick={() => setShowCreateDropdown(!showCreateDropdown)}
            className="flex items-center gap-3 px-5 py-3 rounded-full bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-[#242931] text-gray-700 dark:text-gray-100 font-medium text-sm border border-gray-200 dark:border-gray-700 shadow-md hover:shadow-lg transition-all cursor-pointer group"
          >
            {/* Google colored plus icon */}
            <svg className="w-8 h-8" viewBox="0 0 36 36">
              <path fill="#4285F4" d="M16 16v14h4V16h14v-4H20V2h-4v10H2v4h14z" />
              <path fill="#34A853" d="M30 16H20l-4-4h14v4z" opacity="0.9" />
              <path fill="#FBBC05" d="M16 30V20l4-4v14h-4z" opacity="0.9" />
              <path fill="#EA4335" d="M20 16v14h-4V16H2v-4h14V2h4v14z" opacity="0.2" />
            </svg>
            <span className="text-base tracking-wide font-sans">
              {lang === 'vi' ? 'Tạo mới' : 'Create'}
            </span>
            <ChevronDown className="w-4 h-4 ml-1 text-gray-400 group-hover:text-gray-600 transition-colors" />
          </button>

          {showCreateDropdown && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowCreateDropdown(false)}
              />
              <div className="absolute left-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                <button
                  onClick={() => {
                    onOpenCreateModal('event');
                    setShowCreateDropdown(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                >
                  <CalendarIcon className="w-4 h-4 text-blue-500" />
                  <span>{lang === 'vi' ? 'Sự kiện' : 'Event'}</span>
                </button>
                <button
                  onClick={() => {
                    onOpenCreateModal('task');
                    setShowCreateDropdown(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                >
                  <CheckSquare className="w-4 h-4 text-purple-500" />
                  <span>{lang === 'vi' ? 'Tác vụ' : 'Task'}</span>
                </button>
                <button
                  onClick={() => {
                    onOpenCreateModal('reminder');
                    setShowCreateDropdown(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                >
                  <Bell className="w-4 h-4 text-emerald-500" />
                  <span>{lang === 'vi' ? 'Nhắc nhở' : 'Reminder'}</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Mini Calendar */}
        <div className="mb-6 px-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              {lang === 'vi' ? monthNamesVi[miniMonth] : monthNamesEn[miniMonth]} {miniYear}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={handlePrevMiniMonth}
                aria-label="Tháng trước"
                className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleNextMiniMonth}
                aria-label="Tháng sau"
                className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 text-center text-xs text-gray-400 dark:text-gray-500 font-medium mb-1">
            {weekdayInitials.map((w, idx) => (
              <span key={idx} className="h-6 flex items-center justify-center">
                {w}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 text-center text-xs">
            {miniMonthDays.map((item, idx) => {
              const isSelected = item.dateString === selectedDateStr;
              return (
                <button
                  key={idx}
                  onClick={() => onSelectDate(item.date)}
                  className={`h-7 w-7 mx-auto rounded-full flex items-center justify-center transition-colors cursor-pointer text-xs ${
                    isSelected
                      ? 'bg-blue-600 text-white font-semibold shadow-xs'
                      : item.isToday
                      ? 'bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-bold'
                      : item.isCurrentMonth
                      ? 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
                      : 'text-gray-400 dark:text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/40'
                  }`}
                >
                  {item.dayNumber}
                </button>
              );
            })}
          </div>
        </div>

        {/* My Calendars Section */}
        <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex-1">
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {lang === 'vi' ? 'Lịch của tôi' : 'My calendars'}
            </span>
            <button
              onClick={() => setShowAddCalendarInput(!showAddCalendarInput)}
              title={lang === 'vi' ? 'Thêm lịch mới' : 'Add other calendar'}
              className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {showAddCalendarInput && (
            <form onSubmit={handleCreateNewCalendar} className="mb-3 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <input
                type="text"
                placeholder={lang === 'vi' ? 'Tên lịch mới...' : 'Calendar name...'}
                value={newCalName}
                onChange={(e) => setNewCalName(e.target.value)}
                autoFocus
                className="w-full text-xs px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 mb-2 focus:outline-blue-500"
              />
              <div className="flex items-center justify-between">
                <input
                  type="color"
                  value={newCalColor}
                  onChange={(e) => setNewCalColor(e.target.value)}
                  className="w-6 h-6 rounded border-0 cursor-pointer p-0"
                />
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setShowAddCalendarInput(false)}
                    className="text-xs px-2 py-1 text-gray-500 hover:text-gray-700"
                  >
                    {lang === 'vi' ? 'Hủy' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    className="text-xs px-2 py-1 bg-blue-600 text-white rounded font-medium hover:bg-blue-700"
                  >
                    {lang === 'vi' ? 'Lưu' : 'Save'}
                  </button>
                </div>
              </div>
            </form>
          )}

          <div className="space-y-1">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="group flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                onClick={() => onToggleCategory(cat.id)}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-4 h-4 rounded flex items-center justify-center transition-colors"
                    style={{
                      backgroundColor: cat.visible ? cat.color : 'transparent',
                      border: `2px solid ${cat.color}`,
                    }}
                  >
                    {cat.visible && <Check className="w-3 h-3 text-white stroke-[3]" />}
                  </div>
                  <span className="text-xs text-gray-700 dark:text-gray-200 truncate">
                    {lang === 'vi' ? cat.nameVi : cat.name}
                  </span>
                </div>

                {cat.isCustom && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteCategory(cat.id);
                    }}
                    title={lang === 'vi' ? 'Xóa lịch' : 'Delete calendar'}
                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-opacity cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer info: Google standard notice */}
        <div className="pt-3 border-t border-gray-100 dark:border-gray-800 text-[11px] text-gray-400 dark:text-gray-500 px-1">
          <p>{lang === 'vi' ? 'Điều khoản & Quyền riêng tư' : 'Terms & Privacy'}</p>
        </div>
      </aside>
    </>
  );
};

