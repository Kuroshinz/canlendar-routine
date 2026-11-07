import React, { useState } from 'react';
import { CalendarViewType, SyncState } from '../types/calendar';
import {
  Menu,
  Search,
  Sun,
  Moon,
  Plus,
  Bell,
  Globe,
  Sparkles,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  FileSpreadsheet,
  Cloud,
  LogOut,
  RefreshCw,
  FolderSync,
  FileText,
} from 'lucide-react';

interface HeaderProps {
  currentDate: Date;
  view: CalendarViewType;
  onViewChange: (view: CalendarViewType) => void;
  onToggleSidebar: () => void;
  onOpenQuickAdd: () => void;
  onOpenShortcuts: () => void;
  onOpenExportImport: () => void;
  onOpenCloudSync?: () => void;
  onGoogleSignIn?: () => Promise<void>;
  onOpenAppleHealth?: () => void;
  onOpenGeminiMacro?: () => void;
  onToggleRightDrawer?: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  userEmail?: string;
  userName?: string;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  lang: 'vi' | 'en';
  onToggleLang: () => void;
  isLoggedInGoogle?: boolean;
  isSyncing?: boolean;
  syncState?: SyncState;
  pendingTasksCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentDate,
  view,
  onViewChange,
  onToggleSidebar,
  onOpenQuickAdd,
  onOpenShortcuts,
  onOpenExportImport,
  onOpenCloudSync,
  onGoogleSignIn,
  onOpenAppleHealth,
  onOpenGeminiMacro,
  onToggleRightDrawer,
  searchQuery,
  onSearchChange,
  userEmail = 'Admin',
  userName,
  darkMode,
  onToggleDarkMode,
  lang,
  onToggleLang,
  isLoggedInGoogle = false,
  isSyncing = false,
  syncState = 'offline',
  pendingTasksCount = 3,
}) => {
  const [showNotificationPopup, setShowNotificationPopup] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Derive friendly greeting based on current time
  const hour = new Date().getHours();
  const timeGreetingVi =
    hour < 12 ? 'Chào buổi sáng' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';
  const timeGreetingEn =
    hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const displayName = userName || (userEmail ? userEmail.split('@')[0] : 'Admin');

  return (
    <header className="h-18 px-4 sm:px-6 lg:px-8 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-[#111726]/90 backdrop-blur-md flex items-center justify-between gap-3 sm:gap-6 shrink-0 select-none z-30 transition-colors">
      {/* Left: Hamburger & Greeting (ShipNexus style: Hello, Admin) */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          title={lang === 'vi' ? 'Ẩn/hiện thanh bên' : 'Toggle sidebar'}
          className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex flex-col">
          <h1 className="text-base sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <span>
              {lang === 'vi' ? `${timeGreetingVi}, ` : `${timeGreetingEn}, `}
              <span className="text-blue-600 dark:text-blue-400 capitalize">{displayName}</span>
            </span>
          </h1>
          <span className="text-[11px] font-medium text-slate-400 hidden sm:inline">
            {lang === 'vi'
              ? 'Hệ thống quản lý lịch & năng suất VortexCal'
              : 'VortexCal Smart Routine & Executive Workspace'}
          </span>
        </div>
      </div>

      {/* Center: Search pill bar with shortcut badge */}
      <div className="flex-1 max-w-xs md:max-w-md lg:max-w-lg mx-2 hidden sm:block">
        <div className="relative w-full">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={
              lang === 'vi'
                ? 'Tìm kiếm sự kiện, công việc, dinh dưỡng, chi tiêu...'
                : 'Search events, tasks, macros, transactions...'
            }
            className="w-full pl-10 pr-12 py-2 bg-slate-100 dark:bg-slate-800/80 text-sm text-slate-800 dark:text-slate-100 rounded-full border border-slate-200 dark:border-slate-700/60 focus:outline-hidden focus:ring-2 focus:ring-blue-500 placeholder-slate-400 transition-all shadow-2xs"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden md:inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded">
            Ctrl+K
          </kbd>
        </div>
      </div>

      {/* Right: Quick actions, Sync, Notification, Theme, Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* + Tạo mới pill button */}
        <button
          onClick={onOpenQuickAdd}
          title={lang === 'vi' ? 'Tạo nhanh bằng câu lệnh tự nhiên' : 'Quick add'}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-full text-xs font-bold shadow-sm shadow-blue-500/20 transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden md:inline">{lang === 'vi' ? 'Tạo mới' : 'Create'}</span>
        </button>

        {/* Apple Health & Gemini Sync button */}
        {onOpenAppleHealth && (
          <button
            onClick={onOpenAppleHealth}
            title={lang === 'vi' ? 'Đồng bộ Apple Health' : 'Sync Apple Health'}
            className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer hidden sm:flex items-center justify-center relative"
          >
            <Smartphone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500" />
          </button>
        )}

        {/* Gemini AI Macro Studio quick button */}
        {onOpenGeminiMacro && (
          <button
            onClick={onOpenGeminiMacro}
            title={lang === 'vi' ? 'Vortex Gemini AI Studio' : 'Gemini AI Studio'}
            className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-blue-600 dark:text-blue-400 transition-colors cursor-pointer hidden sm:flex items-center justify-center"
          >
            <Sparkles className="w-4 h-4" />
          </button>
        )}

        {/* Right drawer notes toggle */}
        {onToggleRightDrawer && (
          <button
            onClick={onToggleRightDrawer}
            title={lang === 'vi' ? 'Ghi chú & Công việc nhanh' : 'Quick Notes & Tasks'}
            className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer hidden lg:flex items-center justify-center"
          >
            <FileText className="w-4 h-4" />
          </button>
        )}

        {/* Notification Bell with Badge */}
        <div className="relative">
          <button
            onClick={() => setShowNotificationPopup(!showNotificationPopup)}
            title={lang === 'vi' ? 'Thông báo & Nhắc nhở' : 'Notifications'}
            className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer relative"
          >
            <Bell className="w-4 h-4" />
            {pendingTasksCount > 0 && (
              <span className="absolute top-0 right-0 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
                {pendingTasksCount}
              </span>
            )}
          </button>

          {showNotificationPopup && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowNotificationPopup(false)}
              />
              <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl p-4 z-50">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {lang === 'vi' ? 'Thông báo hệ thống' : 'Notifications'}
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                    {pendingTasksCount} mới
                  </span>
                </div>

                <div className="mt-3 space-y-2.5">
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 text-xs flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">
                        {lang === 'vi' ? 'Mục tiêu dinh dưỡng' : 'Nutrition Target'}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {lang === 'vi'
                          ? 'Bạn còn thiếu 540 kcal & 35g protein cho ngày hôm nay.'
                          : 'You need 540 kcal & 35g protein remaining today.'}
                      </p>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 text-xs flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">
                        {lang === 'vi' ? 'Đồng bộ Apple Health' : 'Apple Health Synced'}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {lang === 'vi'
                          ? 'Đã tải 6.345 bước chân & 8.1 giờ ngủ từ thiết bị.'
                          : 'Loaded 6,345 steps & 8.1 hrs sleep from device.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Language switch */}
        <button
          onClick={onToggleLang}
          title={lang === 'vi' ? 'Đổi sang English' : 'Chuyển sang Tiếng Việt'}
          className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer font-bold text-xs flex items-center gap-1"
        >
          <Globe className="w-3.5 h-3.5" />
          <span>{lang === 'vi' ? 'VI' : 'EN'}</span>
        </button>

        {/* Theme Dark / Light toggle */}
        <button
          onClick={onToggleDarkMode}
          title={darkMode ? 'Chuyển giao diện sáng' : 'Chuyển giao diện tối'}
          className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
        >
          {darkMode ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-600" />
          )}
        </button>

        {/* User Profile Avatar with dropdown (ShipNexus style) */}
        <div className="relative ml-1">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer group"
          >
            <div className="relative">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center ring-2 ring-slate-200 dark:ring-slate-700 group-hover:ring-blue-400 transition-all shadow-xs">
                {(displayName && displayName.length > 0 ? displayName[0] : 'A').toUpperCase()}
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#111726]" />
            </div>
          </button>

          {showProfileMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)} />
              <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl p-3 z-50">
                <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700/60 mb-2">
                  <p className="font-bold text-sm text-slate-900 dark:text-white capitalize">
                    {displayName}
                  </p>
                  <p className="text-xs text-slate-400 truncate">
                    {userEmail || 'admin@vortexcal.io'}
                  </p>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isLoggedInGoogle ? 'bg-emerald-500' : 'bg-slate-400'
                      }`}
                    />
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      {isLoggedInGoogle ? 'Google Synced' : 'Offline First Mode'}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  {onOpenCloudSync && (
                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        onOpenCloudSync();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-left cursor-pointer"
                    >
                      <Cloud className="w-4 h-4 text-blue-500" />
                      <span>{lang === 'vi' ? 'Đồng bộ đám mây' : 'Cloud Sync'}</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      onOpenExportImport();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-left cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                    <span>{lang === 'vi' ? 'Xuất / Nhập dữ liệu (iCal)' : 'Export / Import (iCal)'}</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      onOpenShortcuts();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-left cursor-pointer"
                  >
                    <HelpCircle className="w-4 h-4 text-indigo-500" />
                    <span>{lang === 'vi' ? 'Phím tắt bàn phím' : 'Keyboard Shortcuts'}</span>
                  </button>

                  <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-700/60">
                    {isLoggedInGoogle ? (
                      <button
                        onClick={() => {
                          setShowProfileMenu(false);
                          if (onOpenCloudSync) onOpenCloudSync();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors text-left cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>{lang === 'vi' ? 'Quản lý tài khoản' : 'Manage Account'}</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setShowProfileMenu(false);
                          if (onGoogleSignIn) onGoogleSignIn();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors text-left cursor-pointer"
                      >
                        <FolderSync className="w-4 h-4" />
                        <span>{lang === 'vi' ? 'Đăng nhập Google' : 'Sign in Google'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
