import React, { useState } from 'react';
import { CalendarViewType, SyncState } from '../types/calendar';
import {
  Menu,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Search,
  HelpCircle,
  Sun,
  Moon,
  Sparkles,
  Download,
  Calendar as CalIcon,
  Globe,
  Layers,
  RefreshCw,
  Check,
  Activity,
  Cloud,
  Undo,
  Redo,
} from 'lucide-react';

interface HeaderProps {
  currentDate: Date;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  view: CalendarViewType;
  onViewChange: (view: CalendarViewType) => void;
  onToggleSidebar: () => void;
  onOpenQuickAdd: () => void;
  onOpenShortcuts: () => void;
  onOpenExportImport: () => void;
  onOpenCloudSync?: () => void;
  onOpenMultiHub?: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  userEmail?: string;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  lang: 'vi' | 'en';
  onToggleLang: () => void;
  isLoggedInGoogle?: boolean;
  isSyncing?: boolean;
  syncState?: SyncState;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentDate,
  onPrev,
  onNext,
  onToday,
  view,
  onViewChange,
  onToggleSidebar,
  onOpenQuickAdd,
  onOpenShortcuts,
  onOpenExportImport,
  onOpenCloudSync,
  onOpenMultiHub,
  searchQuery,
  onSearchChange,
  userEmail = 'user@example.com',
  darkMode,
  onToggleDarkMode,
  lang,
  onToggleLang,
  isLoggedInGoogle = false,
  isSyncing = false,
  syncState = 'offline',
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
}) => {
  const [showViewDropdown, setShowViewDropdown] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Month & Year display formatting
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

  const viewOptions: { id: CalendarViewType; labelVi: string; labelEn: string; shortcut: string }[] = [
    { id: 'month', labelVi: 'Tháng', labelEn: 'Month', shortcut: 'M' },
    { id: 'week', labelVi: 'Tuần', labelEn: 'Week', shortcut: 'W' },
    { id: 'day', labelVi: 'Ngày', labelEn: 'Day', shortcut: 'D' },
    { id: 'fourDay', labelVi: '4 ngày', labelEn: '4 days', shortcut: 'X' },
    { id: 'year', labelVi: 'Năm', labelEn: 'Year', shortcut: 'Y' },
    { id: 'schedule', labelVi: 'Lịch biểu', labelEn: 'Schedule', shortcut: 'A' },
    { id: 'analytics', labelVi: 'Phân tích năng suất', labelEn: 'Analytics', shortcut: 'P' },
  ];

  const currentViewObj = viewOptions.find((v) => v.id === view) || viewOptions[0];

  return (
    <header className="h-16 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-4 shrink-0 select-none z-30 transition-colors">
      {/* Left: Hamburger, Brand, Navigation buttons */}
      <div className="flex items-center gap-1 sm:gap-3">
        <button
          onClick={onToggleSidebar}
          title={lang === 'vi' ? 'Ẩn/hiện thanh bên' : 'Main menu'}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Brand Logo & Name */}
        <div
          onClick={() => onViewChange('month')}
          className="flex items-center gap-2 cursor-pointer group select-none mr-1 sm:mr-3"
        >
          <div className="w-9 h-9 rounded-xl bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform">
            <CalIcon className="w-5 h-5" />
          </div>
          <div className="hidden md:flex flex-col">
            <span className="font-semibold text-base leading-tight tracking-tight text-gray-800 dark:text-gray-100 font-sans">
              Google <span className="font-bold text-blue-600 dark:text-blue-400">Calendar</span>
            </span>
            <span className="text-[10px] text-gray-400 font-medium tracking-wide">
              {lang === 'vi' ? 'Pro • Lịch Thông Minh' : 'Pro • Smart Calendar'}
            </span>
          </div>
        </div>

        {/* Today button */}
        <button
          onClick={onToday}
          className="px-3.5 py-1.5 border border-gray-300 dark:border-gray-700 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
        >
          {lang === 'vi' ? 'Hôm nay' : 'Today'}
        </button>

        {/* Prev / Next buttons */}
        <div className="flex items-center">
          <button
            onClick={onPrev}
            title={lang === 'vi' ? 'Thời gian trước' : 'Previous'}
            className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={onNext}
            title={lang === 'vi' ? 'Thời gian tới' : 'Next'}
            className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors cursor-pointer"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Undo / Redo for Drag & Drop */}
        {canUndo && (
          <button
            onClick={onUndo}
            title={lang === 'vi' ? 'Hoàn tác kéo thả (Ctrl+Z)' : 'Undo (Ctrl+Z)'}
            className="p-1.5 rounded-full bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 text-blue-600 dark:text-blue-400 transition-colors cursor-pointer"
          >
            <Undo className="w-4 h-4" />
          </button>
        )}
        {canRedo && (
          <button
            onClick={onRedo}
            title={lang === 'vi' ? 'Làm lại (Ctrl+Shift+Z)' : 'Redo (Ctrl+Shift+Z)'}
            className="p-1.5 rounded-full bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 text-blue-600 dark:text-blue-400 transition-colors cursor-pointer"
          >
            <Redo className="w-4 h-4" />
          </button>
        )}

        {/* Month & Year Title */}
        <h2 className="text-base sm:text-lg font-medium text-gray-800 dark:text-gray-100 ml-1 sm:ml-2 font-sans truncate">
          {currentMonthName} {currentYear}
        </h2>
      </div>

      {/* Center: Search Bar */}
      <div className="hidden md:flex items-center flex-1 max-w-xs lg:max-w-md mx-2">
        <div className="relative w-full">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={lang === 'vi' ? 'Tìm kiếm sự kiện, công việc...' : 'Search events, tasks...'}
            className="w-full pl-9 pr-4 py-1.5 bg-gray-100 dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 rounded-full border-none focus:outline-hidden focus:ring-2 focus:ring-blue-500 placeholder-gray-400 transition-all"
          />
        </div>
      </div>

      {/* Right: Actions, Analytics, Sync, View dropdown, User Avatar */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Productivity Analytics Button */}
        <button
          onClick={() => onViewChange('analytics')}
          title={lang === 'vi' ? 'Phân tích thời gian & năng suất' : 'Productivity Analytics'}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border cursor-pointer ${
            view === 'analytics'
              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
              : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 border-indigo-200 dark:border-indigo-800'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{lang === 'vi' ? 'Phân tích' : 'Analytics'}</span>
        </button>

        {/* Cloud Sync Button & Status Badge */}
        <button
          onClick={onOpenCloudSync || onOpenExportImport}
          title={lang === 'vi' ? 'Đồng bộ đám mây & iCal' : 'Cloud Sync & iCal'}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
        >
          <Cloud
            className={`w-3.5 h-3.5 ${
              syncState === 'syncing'
                ? 'text-amber-500 animate-spin'
                : syncState === 'synced'
                ? 'text-emerald-500'
                : 'text-gray-400'
            }`}
          />
          <span className="hidden lg:inline text-[11px] font-mono font-medium">
            {syncState === 'synced'
              ? lang === 'vi'
                ? 'Đã sync'
                : 'Synced'
              : syncState === 'syncing'
              ? '...'
              : 'Offline'}
          </span>
        </button>

        {/* Quick Add with Natural Language */}
        <button
          onClick={onOpenQuickAdd}
          title={lang === 'vi' ? 'Tạo nhanh bằng câu lệnh tự nhiên' : 'Quick create event'}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/60 rounded-full text-xs font-medium border border-blue-200 dark:border-blue-800 cursor-pointer transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5 text-blue-500" />
          <span className="hidden xl:inline">{lang === 'vi' ? 'Tạo nhanh' : 'Quick Add'}</span>
        </button>

        {/* View Switcher Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowViewDropdown(!showViewDropdown)}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 dark:border-gray-700 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <span>{lang === 'vi' ? currentViewObj.labelVi : currentViewObj.labelEn}</span>
            <ChevronDown className="w-4 h-4 text-gray-500" />
          </button>

          {showViewDropdown && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setShowViewDropdown(false)}
              ></div>
              <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1.5 z-40">
                {viewOptions.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => {
                      onViewChange(opt.id);
                      setShowViewDropdown(false);
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer ${
                      view === opt.id
                        ? 'text-blue-600 dark:text-blue-400 font-semibold bg-blue-50/50 dark:bg-blue-900/20'
                        : 'text-gray-700 dark:text-gray-200'
                    }`}
                  >
                    <span>{lang === 'vi' ? opt.labelVi : opt.labelEn}</span>
                    <span className="text-xs text-gray-400 font-mono">{opt.shortcut}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Language switch */}
        <button
          onClick={onToggleLang}
          title={lang === 'vi' ? 'Đổi sang English' : 'Chuyển sang Tiếng Việt'}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors cursor-pointer font-bold text-xs flex items-center gap-0.5"
        >
          <Globe className="w-3.5 h-3.5" />
          <span>{lang === 'vi' ? 'VI' : 'EN'}</span>
        </button>

        {/* Dark Mode toggle */}
        <button
          onClick={onToggleDarkMode}
          title={darkMode ? 'Chuyển chế độ sáng' : 'Chuyển chế độ tối'}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors cursor-pointer"
        >
          {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-gray-600" />}
        </button>

        {/* Shortcuts Modal trigger */}
        <button
          onClick={onOpenShortcuts}
          title={lang === 'vi' ? 'Phím tắt' : 'Keyboard shortcuts'}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors cursor-pointer hidden sm:block"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        {/* User Profile */}
        <button
          onClick={() => setShowProfileMenu(!showProfileMenu)}
          className="w-8 h-8 rounded-full bg-linear-to-tr from-blue-600 to-indigo-600 text-white font-medium text-xs flex items-center justify-center ring-2 ring-transparent hover:ring-blue-300 transition-all cursor-pointer shadow-xs ml-1"
        >
          {userEmail[0].toUpperCase()}
        </button>
      </div>
    </header>
  );
};
