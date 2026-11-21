import React, { useState } from 'react';
import {
  ExternalLink,
  LayoutDashboard,
  Compass,
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
      labelVi: 'Tá»•ng quan',
      labelEn: 'Dashboard',
    },
    {
      id: 'month',
      icon: CalendarIcon,
      labelVi: 'Lá»‹ch trÃ¬nh',
      labelEn: 'Calendar',
    },
    {
      id: 'tasks',
      icon: CheckSquare,
      labelVi: 'CÃ´ng viá»‡c & Má»¥c tiÃªu',
      labelEn: 'Tasks & Goals',
    },
    {
      id: 'focus',
      icon: Timer,
      labelVi: 'Äá»“ng há»“ táº­p trung',
      labelEn: 'Focus & Timer',
    },
    {
      id: 'health',
      icon: HeartPulse,
      labelVi: 'Sá»©c khá»e & Macro',
      labelEn: 'Health & Macro',
      badge: 'Fitness AI',
    },
    {
      id: 'finance',
      icon: Wallet,
      labelVi: 'Quáº£n lÃ½ TÃ i chÃ­nh',
      labelEn: 'Finance',
    },
    {
      id: 'analytics',
      icon: BarChart3,
      labelVi: 'BÃ¡o cÃ¡o & PhÃ¢n tÃ­ch',
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
    'ThÃ¡ng 1', 'ThÃ¡ng 2', 'ThÃ¡ng 3', 'ThÃ¡ng 4', 'ThÃ¡ng 5', 'ThÃ¡ng 6',
    'ThÃ¡ng 7', 'ThÃ¡ng 8', 'ThÃ¡ng 9', 'ThÃ¡ng 10', 'ThÃ¡ng 11', 'ThÃ¡ng 12'
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

      <aside className="fixed lg:static top-0 bottom-0 left-0 w-72 bg-[#080205] backdrop-blur-2xl border-r border-white/[0.08] z-40 flex flex-col justify-between p-4 sm:p-5 shrink-0 select-none shadow-2xl lg:shadow-none transition-all overflow-y-auto">
        {/* Top: Brand Header & Primary Navigation */}
        <div className="space-y-6">
          {/* Brand header & Dedicated Space Indicator */}
          <div className="space-y-2.5 px-1">
            <div className="flex items-center justify-between">
              <div
                onClick={() => onViewChange && onViewChange('landing')}
                title={lang === 'vi' ? 'Quay vá» Trang chá»§ (Landing Page)' : 'Return to Landing Page'}
                className="flex items-center cursor-pointer group py-1 transition-transform duration-200 hover:scale-[1.02]"
                
              >
                <img
                  src="/zenox-logo.png"
                  alt="ZENOX"
                  className="h-7 w-auto object-contain filter drop-shadow-[0_0_12px_rgba(56,189,248,0.35)]"
                />
              </div>

              <button
                onClick={onCloseMobile}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 lg:hidden cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>


          </div>

          {/* Primary Navigation List */}
          <nav className="space-y-1">
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
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm transition-all duration-200 cursor-pointer group ${
                    isActive
                      ? 'bg-rose-500/15 text-white border border-rose-500/30 font-semibold shadow-[0_2px_10px_rgba(225,29,72,0.15)]'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.04] border border-transparent font-medium'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        isActive
                          ? 'text-rose-400'
                          : 'text-slate-400 group-hover:text-slate-200'
                      }`}
                    />
                    <span className="truncate">{lang === 'vi' ? item.labelVi : item.labelEn}</span>
                  </div>

                  {item.badge && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-300 border border-rose-500/25 shrink-0">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Calendar Categories Sub-list when calendar view is active */}
          {isCalendarActive && (
            <div className="pt-2 border-t border-white/[0.08] space-y-2">
              <div
                onClick={() => setShowCalendarCategories(!showCalendarCategories)}
                className="flex items-center justify-between px-2 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
              >
                <span>{lang === 'vi' ? 'Lá»‹ch cá»§a tÃ´i' : 'My Calendars'}</span>
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
        <div className="space-y-1.5 pt-3 border-t border-white/[0.08]">
          {isLoggedInGoogle && userEmail && (
            <div className="px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center gap-2.5 mb-1">
              <div className="w-6 h-6 rounded-full bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-[10px] font-bold text-rose-300 shrink-0">
                {userEmail[0].toUpperCase()}
              </div>
              <span className="text-xs text-slate-300 truncate font-mono" title={userEmail}>
                {userEmail}
              </span>
            </div>
          )}

          

          <button
            onClick={() => onOpenSettings && onOpenSettings()}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-white/[0.04] transition-colors cursor-pointer"
          >
            <Settings className="w-4 h-4 text-slate-400" />
            <span>{lang === 'vi' ? 'CÃ i Ä‘áº·t' : 'Settings'}</span>
          </button>

          <button
            onClick={() => {
              if (onLogout) {
                onLogout();
              } else if (onOpenCloudSync) {
                onOpenCloudSync();
              }
            }}
            title={lang === 'vi' ? 'ÄÄƒng xuáº¥t khá»i há»‡ thá»‘ng' : 'Logout from workspace'}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer group"
          >
            <LogOut className="w-4 h-4 text-slate-400 group-hover:text-rose-400 transition-colors" />
            <span>{lang === 'vi' ? 'ÄÄƒng xuáº¥t' : 'Logout'}</span>
          </button>

          {/* Dev Attribution */}
          <div className="pt-2 px-1 text-center select-none">
            <div className="text-[10px] font-mono font-semibold text-rose-400/90 tracking-wider">
              Dev By Zenox Development
            </div>
            <div className="text-[9px] font-mono text-zinc-500 mt-0.5">
              ZENOX OS Core Â· Vault Encrypted
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
