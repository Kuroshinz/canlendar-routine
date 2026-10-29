import React, { useState } from 'react';
import {
  Menu,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  Sparkles,
  HelpCircle,
  Download,
  Moon,
  Sun,
  Globe,
  Check,
  ChevronDown,
  Layers,
  RefreshCw,
} from 'lucide-react';
import { CalendarViewType, CalendarEvent } from '../types/calendar';

interface HeaderProps {
  currentDate: Date;
  view: CalendarViewType;
  onViewChange: (view: CalendarViewType) => void;
  onNavigatePrev: () => void;
  onNavigateNext: () => void;
  onNavigateToday: () => void;
  onToggleSidebar: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenQuickAdd: () => void;
  onOpenShortcuts: () => void;
  onOpenExportImport: () => void;
  onOpenMultiHub?: () => void;
  lang: 'vi' | 'en';
  onToggleLang: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  userEmail?: string;
  isLoggedInGoogle?: boolean;
  isSyncing?: boolean;
  events?: CalendarEvent[];
  onSelectEvent?: (ev: CalendarEvent) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentDate,
  view,
  onViewChange,
  onNavigatePrev,
  onNavigateNext,
  onNavigateToday,
  onToggleSidebar,
  searchQuery,
  onSearchChange,
  onOpenQuickAdd,
  onOpenShortcuts,
  onOpenExportImport,
  onOpenMultiHub,
  lang,
  onToggleLang,
  darkMode,
  onToggleDarkMode,
  userEmail = 'nghuyenthiennhannghuyen@gmail.com',
  isLoggedInGoogle = false,
  isSyncing = false,
  events = [],
  onSelectEvent,
}) => {
  const [showViewDropdown, setShowViewDropdown] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Formatter for main title depending on view
  const getHeaderDateTitle = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;

    if (lang === 'vi') {
      if (view === 'year') {
        return `Năm ${year}`;
      }
      const monthNamesVi = [
        'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
        'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
      ];
      return `${monthNamesVi[month - 1]} năm ${year}`;
    } else {
      if (view === 'year') {
        return `${year}`;
      }
      const monthNamesEn = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      return `${monthNamesEn[month - 1]} ${year}`;
    }
  };

  const viewOptions: { id: CalendarViewType; labelVi: string; labelEn: string; shortcut: string }[] = [
    { id: 'day', labelVi: 'Ngày', labelEn: 'Day', shortcut: 'D' },
    { id: 'week', labelVi: 'Tuần', labelEn: 'Week', shortcut: 'W' },
    { id: 'month', labelVi: 'Tháng', labelEn: 'Month', shortcut: 'M' },
    { id: 'year', labelVi: 'Năm', labelEn: 'Year', shortcut: 'Y' },
    { id: 'schedule', labelVi: 'Lịch biểu', labelEn: 'Schedule', shortcut: 'A' },
    { id: 'fourDay', labelVi: '4 ngày', labelEn: '4 days', shortcut: 'X' },
  ];

  const currentViewObj = viewOptions.find((v) => v.id === view) || viewOptions[2];

  return (
    <header className="h-16 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 md:px-5 flex items-center justify-between gap-2 z-20 shrink-0 select-none">
      {/* Left section: Hamburger, Brand Logo, Today, Navigation */}
      <div className="flex items-center gap-2 md:gap-3">
        <button
          onClick={onToggleSidebar}
          aria-label={lang === 'vi' ? 'Mở menu chính' : 'Main menu'}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Google Calendar Logo */}
        <div className="flex items-center gap-2 cursor-pointer select-none pr-1">
          <div className="w-9 h-9 relative flex items-center justify-center rounded-lg shadow-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Calendar top bar */}
            <div className="absolute top-0 inset-x-0 h-2.5 bg-blue-600"></div>
            <span className="text-sm font-bold text-blue-600 dark:text-blue-400 mt-1 font-mono">
              {new Date().getDate()}
            </span>
          </div>
          <span className="hidden sm:inline-block font-medium text-lg md:text-xl text-gray-800 dark:text-gray-100 font-sans tracking-tight">
            Google <span className="text-gray-500 dark:text-gray-400 font-normal">{lang === 'vi' ? 'Lịch' : 'Calendar'}</span>
          </span>
        </div>

        {/* Today Button */}
        <button
          onClick={onNavigateToday}
          className="ml-0.5 sm:ml-2 px-2 sm:px-3 py-1 sm:py-1.5 border border-gray-300 dark:border-gray-700 rounded-md text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shadow-xs cursor-pointer shrink-0"
        >
          {lang === 'vi' ? 'Hôm nay' : 'Today'}
        </button>

        {/* Prev / Next Chevrons */}
        <div className="flex items-center">
          <button
            onClick={onNavigatePrev}
            aria-label={lang === 'vi' ? 'Kỳ trước' : 'Previous period'}
            className="p-1 sm:p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <button
            onClick={onNavigateNext}
            aria-label={lang === 'vi' ? 'Kỳ tiếp theo' : 'Next period'}
            className="p-1 sm:p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Date Title */}
        <h1 className="text-sm sm:text-base md:text-xl font-medium text-gray-800 dark:text-gray-100 truncate pl-0.5 sm:pl-1">
          {getHeaderDateTitle()}
        </h1>
      </div>

      {/* Middle section: Search Bar */}
      <div className="flex-1 max-w-xl mx-2 hidden md:block">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
            placeholder={
              lang === 'vi'
                ? 'Tìm kiếm sự kiện, phòng họp, người tham dự...'
                : 'Search events, rooms, people...'
            }
            className="w-full pl-9 pr-8 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200/70 dark:hover:bg-gray-700/70 focus:bg-white dark:focus:bg-gray-900 border border-transparent focus:border-blue-500 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-500 focus:outline-none transition-all shadow-2xs"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Floating Search Suggestions */}
          {isSearchFocused && searchQuery.trim() && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-gray-850 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl py-2 z-50 max-h-72 overflow-y-auto animate-in fade-in zoom-in-95">
              {events.filter((e) =>
                e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (e.location && e.location.toLowerCase().includes(searchQuery.toLowerCase()))
              ).length === 0 ? (
                <div className="px-4 py-3 text-xs text-gray-400 text-center">
                  {lang === 'vi' ? 'Không có sự kiện nào khớp.' : 'No matching events.'}
                </div>
              ) : (
                events
                  .filter((e) =>
                    e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (e.location && e.location.toLowerCase().includes(searchQuery.toLowerCase()))
                  )
                  .slice(0, 5)
                  .map((ev) => (
                    <div
                      key={ev.id}
                      onMouseDown={() => {
                        onSelectEvent?.(ev);
                        onSearchChange('');
                      }}
                      className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-750 flex items-center justify-between cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: ev.color }}
                        />
                        <span className="text-xs font-medium text-gray-800 dark:text-gray-100 truncate">
                          {ev.title}
                        </span>
                      </div>
                      <span className="text-[11px] text-gray-400 font-mono shrink-0 ml-2">
                        {ev.startDate} {!ev.allDay && ev.startTime ? `• ${ev.startTime}` : ''}
                      </span>
                    </div>
                  ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right section: Multi-Hub, Quick Add, View Switcher, Utility Buttons, Profile */}
      <div className="flex items-center gap-1.5 md:gap-2">
        {/* Multi-Hub: Đồng bộ Google, Pomodoro, Tiền tệ, Học tập, Stress */}
        <button
          onClick={onOpenMultiHub}
          title={lang === 'vi' ? 'Mở Trung tâm đa năng: Đồng bộ Google, Quản lí Thời gian, Tiền tệ, Học tập, Stress' : 'Open Multi-Hub: Google Sync, Time, Finance, Study, Stress'}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 hover:from-indigo-500/20 hover:to-pink-500/20 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 rounded-full text-xs font-semibold cursor-pointer transition-all shadow-xs"
        >
          <Layers className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span className="hidden sm:inline">{lang === 'vi' ? 'Trung tâm đa năng' : 'Multi-Hub'}</span>
          {isSyncing ? (
            <RefreshCw className="w-3 h-3 text-blue-600 animate-spin" />
          ) : isLoggedInGoogle ? (
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Đã kết nối Google" />
          ) : null}
        </button>

        {/* Quick Add with Natural Language */}
        <button
          onClick={onOpenQuickAdd}
          title={lang === 'vi' ? 'Tạo nhanh bằng câu lệnh tự nhiên' : 'Quick create event'}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/60 rounded-full text-xs font-medium border border-blue-200 dark:border-blue-800 cursor-pointer transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5 text-blue-500" />
          <span className="hidden lg:inline">{lang === 'vi' ? 'Tạo thông minh' : 'Quick Add'}</span>
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
              <div className="absolute right-0 mt-1 w-44 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1.5 z-40">
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

        {/* Export / Import Button */}
        <button
          onClick={onOpenExportImport}
          title={lang === 'vi' ? 'Xuất / Nhập tệp .ics' : 'Export / Import .ics'}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors cursor-pointer"
        >
          <Download className="w-4 h-4" />
        </button>

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

        {/* User Avatar */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="w-8 h-8 rounded-full bg-linear-to-tr from-blue-600 to-indigo-600 text-white font-medium text-xs flex items-center justify-center ring-2 ring-transparent hover:ring-blue-300 transition-all cursor-pointer shadow-xs ml-1"
          >
            {userEmail[0].toUpperCase()}
          </button>

          {showProfileMenu && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setShowProfileMenu(false)}
              ></div>
              <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-4 z-40">
                <div className="flex items-center gap-3 pb-3 border-b border-gray-100 dark:border-gray-700">
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold text-base flex items-center justify-center shrink-0">
                    {userEmail[0].toUpperCase()}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
                      Google Workspace
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{userEmail}</p>
                  </div>
                </div>

                <div className="mt-3 space-y-1 text-xs text-gray-600 dark:text-gray-300">
                  <div className="flex items-center justify-between py-1">
                    <span>{lang === 'vi' ? 'Trạng thái đồng bộ' : 'Sync status'}</span>
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                      <Check className="w-3.5 h-3.5" /> {lang === 'vi' ? 'Đã lưu cục bộ' : 'Saved locally'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span>{lang === 'vi' ? 'Múi giờ' : 'Timezone'}</span>
                    <span className="font-mono text-gray-500">GMT+07:00 (Asia/Ho_Chi_Minh)</span>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-gray-100 dark:border-gray-700">
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      onOpenMultiHub?.();
                    }}
                    className="w-full py-2 px-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <Layers className="w-4 h-4 text-indigo-500" />
                    <span>{lang === 'vi' ? 'Mở Trung tâm đa năng & Đồng bộ' : 'Open Multi-Hub & Sync'}</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
