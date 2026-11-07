import React, { useState } from 'react';
import {
  LayoutDashboard,
  Calendar as CalendarIcon,
  CheckSquare,
  Timer,
  HeartPulse,
  Wallet,
  BarChart3,
  Sparkles,
  Settings,
  LogOut,
  LogIn,
  ChevronDown,
  ChevronRight,
  Plus,
  X,
  Check,
  CalendarCheck2,
  Apple,
} from 'lucide-react';
import { CalendarCategory, CalendarViewType, EventType } from '../types/calendar';
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
  onViewChange?: (view: CalendarViewType) => void;
  currentView?: CalendarViewType;
  onOpenGeminiMacro?: () => void;
  onOpenAppleHealth?: () => void;
  onOpenSettings?: () => void;
  onOpenCloudSync?: () => void;
  onGoogleSignIn?: () => Promise<void>;
  userEmail?: string;
  isLoggedInGoogle?: boolean;
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
  onViewChange,
  currentView = 'dashboard',
  onOpenGeminiMacro,
  onOpenAppleHealth,
  onOpenSettings,
  onOpenCloudSync,
  onGoogleSignIn,
  userEmail,
  isLoggedInGoogle = false,
}) => {
  const [showCalendarCategories, setShowCalendarCategories] = useState(true);
  const [showMiniCalendar, setShowMiniCalendar] = useState(false);
  const [miniYear, setMiniYear] = useState<number>(currentDate.getFullYear());
  const [miniMonth, setMiniMonth] = useState<number>(currentDate.getMonth());

  const isCalendarActive =
    currentView === 'month' ||
    currentView === 'week' ||
    currentView === 'day' ||
    currentView === 'fourDay' ||
    currentView === 'year' ||
    currentView === 'schedule';

  const navItems: {
    id: CalendarViewType;
    icon: React.ElementType;
    labelVi: string;
    labelEn: string;
    badge?: string;
  }[] = [
    {
      id: 'dashboard',
      icon: LayoutDashboard,
      labelVi: 'Tổng quan',
      labelEn: 'Dashboard',
    },
    {
      id: 'month',
      icon: CalendarIcon,
      labelVi: 'Lịch trình',
      labelEn: 'Calendar',
    },
    {
      id: 'tasks',
      icon: CheckSquare,
      labelVi: 'Công việc & Mục tiêu',
      labelEn: 'Tasks & Goals',
    },
    {
      id: 'focus',
      icon: Timer,
      labelVi: 'Đồng hồ tập trung',
      labelEn: 'Focus & Timer',
    },
    {
      id: 'health',
      icon: HeartPulse,
      labelVi: 'Sức khỏe & Macro',
      labelEn: 'Health & Macro',
      badge: 'Apple / AI',
    },
    {
      id: 'finance',
      icon: Wallet,
      labelVi: 'Quản lý Tài chính',
      labelEn: 'Finance',
    },
    {
      id: 'analytics',
      icon: BarChart3,
      labelVi: 'Báo cáo & Phân tích',
      labelEn: 'Analytics',
    },
  ];

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
  const selectedDateStr = formatDateString(currentDate);

  const monthNamesVi = [
    'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
    'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
  ];
  const monthNamesEn = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  if (!isOpen) return null;

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 lg:hidden"
        onClick={onCloseMobile}
        aria-hidden="true"
      />

      <aside className="fixed lg:static top-0 bottom-0 left-0 w-72 bg-white dark:bg-[#111726] border-r border-slate-200/90 dark:border-slate-800/90 z-40 flex flex-col justify-between p-4 sm:p-5 shrink-0 select-none shadow-xl lg:shadow-none transition-all overflow-y-auto">
        {/* Top: Brand Header & Primary Navigation */}
        <div className="space-y-6">
          {/* Brand header */}
          <div className="flex items-center justify-between px-1">
            <div
              onClick={() => onViewChange && onViewChange('dashboard')}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
                <CalendarCheck2 className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-xl leading-tight tracking-tight text-slate-900 dark:text-white">
                  Vortex<span className="text-blue-600 dark:text-blue-400">Cal</span>
                </span>
                <span className="text-[11px] font-medium text-slate-400">
                  {lang === 'vi' ? 'Executive Workspace' : 'Smart Executive Suite'}
                </span>
              </div>
            </div>

            <button
              onClick={onCloseMobile}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 lg:hidden cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Primary Navigation List */}
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.id === 'month' ? isCalendarActive : currentView === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (onViewChange) {
                      onViewChange(item.id);
                    }
                    if (window.innerWidth < 1024) {
                      onCloseMobile();
                    }
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer group ${
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                        isActive
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300'
                      }`}
                    />
                    <span className="truncate">{lang === 'vi' ? item.labelVi : item.labelEn}</span>
                  </div>

                  {item.badge && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Calendar Categories Sub-list when calendar view is active */}
          {isCalendarActive && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 space-y-2">
              <div
                onClick={() => setShowCalendarCategories(!showCalendarCategories)}
                className="flex items-center justify-between px-2 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
              >
                <span>{lang === 'vi' ? 'Lịch của tôi' : 'My Calendars'}</span>
                {showCalendarCategories ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
              </div>

              {showCalendarCategories && (
                <div className="space-y-1 max-h-36 overflow-y-auto px-1">
                  {categories.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => onToggleCategory(c.id)}
                      className="w-full flex items-center gap-2 px-2 py-1 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors text-left cursor-pointer"
                    >
                      <div
                        className="w-3.5 h-3.5 rounded flex items-center justify-center transition-colors border"
                        style={{
                          backgroundColor: c.visible ? c.color : 'transparent',
                          borderColor: c.color,
                        }}
                      >
                        {c.visible && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
                      </div>
                      <span className="truncate">{lang === 'vi' ? c.nameVi : c.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Middle: Floating Gemini AI Promo Card (ShipNexus Try AI card style) */}
        <div className="my-5">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50/90 via-indigo-50/70 to-blue-50/90 dark:from-blue-950/40 dark:via-indigo-950/30 dark:to-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 p-4 shadow-xs">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                Vortex Gemini AI
              </span>
            </div>

            <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300 mb-3 font-medium">
              {lang === 'vi'
                ? 'Bóc tách Macro món Việt từ ảnh & đồng bộ Apple Health tự động.'
                : 'Auto parse Vietnamese food macros & sync Apple Health.'}
            </p>

            <button
              onClick={() => onOpenGeminiMacro && onOpenGeminiMacro()}
              className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-blue-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer hover:shadow-md"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{lang === 'vi' ? 'Mở AI Studio' : 'Launch AI Studio'}</span>
            </button>
          </div>
        </div>

        {/* Bottom: Settings & Account / Logout */}
        <div className="space-y-1.5 pt-3 border-t border-slate-200/80 dark:border-slate-800/80">
          <button
            onClick={() => onOpenSettings && onOpenSettings()}
            className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
          >
            <Settings className="w-4 h-4 text-slate-400" />
            <span>{lang === 'vi' ? 'Cài đặt & Phím tắt' : 'Settings & Shortcuts'}</span>
          </button>

          {isLoggedInGoogle ? (
            <button
              onClick={() => onOpenCloudSync && onOpenCloudSync()}
              className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2 truncate">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <span className="truncate font-mono">{userEmail || 'Google Synced'}</span>
              </div>
              <LogOut className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </button>
          ) : (
            <button
              onClick={() => onGoogleSignIn && onGoogleSignIn()}
              className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
            >
              <LogIn className="w-4 h-4 text-slate-400" />
              <span>{lang === 'vi' ? 'Kết nối Google' : 'Connect Google'}</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
};
