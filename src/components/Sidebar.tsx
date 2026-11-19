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
  onOpenSettings?: () => void;
  onOpenCloudSync?: () => void;
  onGoogleSignIn?: () => Promise<void>;
  onLogout?: () => void;
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
  onOpenSettings,
  onOpenCloudSync,
  onGoogleSignIn,
  onLogout,
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
      badge: 'Fitness AI',
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

      <aside className="fixed lg:static top-0 bottom-0 left-0 w-72 bg-white/95 dark:bg-[#090306]/95 backdrop-blur-2xl border-r border-slate-200 dark:border-white/[0.08] z-40 flex flex-col justify-between p-4 sm:p-5 shrink-0 select-none shadow-2xl lg:shadow-none transition-all overflow-y-auto">
        {/* Top: Brand Header & Primary Navigation */}
        <div className="space-y-6">
          {/* Brand header */}
          <div className="flex items-center justify-between px-1">
            <div
              onClick={() => onViewChange && onViewChange('dashboard')}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <div className="relative w-11 h-11 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <img
                  src="/logo-icon.png"
                  alt="VortexCal Emblem"
                  className="w-full h-full object-contain filter drop-shadow-[0_2px_10px_rgba(59,130,246,0.4)]"
                />
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-xl leading-tight tracking-tight text-slate-900 dark:text-white">Vortex<span className="text-rose-500">Cal</span></span>
                <span className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase">
                  {lang === 'vi' ? 'Lịch trình • Sức khỏe • Luyện tập' : 'Routine • Health • Fitness'}
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
                      ? 'bg-white/10 dark:bg-white/[0.12] text-white border border-white/20 shadow-[0_4px_16px_rgba(255,255,255,0.06)] backdrop-blur-md'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/[0.05] border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                        isActive ? 'text-rose-400 dark:text-rose-400' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300'
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

        

        {/* Bottom: Settings & Logout */}
        <div className="space-y-1.5 pt-3 border-t border-slate-200/80 dark:border-slate-800/80">
          <button
            onClick={() => onOpenSettings && onOpenSettings()}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
          >
            <Settings className="w-4 h-4 text-slate-400" />
            <span>{lang === 'vi' ? 'Cài đặt' : 'Settings'}</span>
          </button>

          <button
            onClick={() => {
              if (onLogout) {
                onLogout();
              } else if (onOpenCloudSync) {
                onOpenCloudSync();
              }
            }}
            title={lang === 'vi' ? 'Đăng xuất khỏi hệ thống' : 'Logout from workspace'}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <LogOut className="w-4 h-4 text-slate-400 group-hover:text-rose-500 transition-colors" />
              <span>{lang === 'vi' ? 'Đăng xuất' : 'Logout'}</span>
            </div>
            {isLoggedInGoogle && (
              <span className="text-[10px] text-slate-400 font-mono truncate max-w-[90px]">
                {userEmail?.split('@')[0]}
              </span>
            )}
          </button>
        </div>
      </aside>
    </>
  );
};
