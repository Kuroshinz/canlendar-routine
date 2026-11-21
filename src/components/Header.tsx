import { SkeuomorphicToggleCollection } from '@designcodeio/threeui';
import '@designcodeio/threeui/style.css';
import React, { useState, useEffect, useMemo } from 'react';
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
  Compass,
  Check,
  Trash2,
  Clock,
  ArrowRight,
  AlertTriangle,
  X,
  Info,
  Radio,
} from 'lucide-react';
import {
  getStoredNotifications,
  markAllNotificationsRead,
  deleteNotification,
  clearAllNotifications,
  SystemNotification,
} from '../utils/notify';

export interface HeaderNutritionSummary {
  consumedKcal: number;
  targetKcal: number;
  consumedProtein: number;
  targetProtein: number;
}

export interface HeaderRoadmapSummary {
  roadmapTitle: string;
  phaseName: string;
  remainingDays: number;
  startWeightKg: number;
  targetWeightKg: number;
  startDate: string;
  endDate: string;
}

export interface HeaderTaskAlerts {
  overdue: number;
  dueToday: number;
}

export interface HeaderWeightTrendAlert {
  type: 'warning' | 'info';
  title: string;
  message: string;
}

function formatRelativeTime(timestamp: number, lang: 'vi' | 'en'): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (diffSec < 60) return lang === 'vi' ? 'Vừa xong' : 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return lang === 'vi' ? `${diffMin} phút trước` : `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return lang === 'vi' ? `${diffHour} giờ trước` : `${diffHour}h ago`;
  const diffDays = Math.floor(diffHour / 24);
  return lang === 'vi' ? `${diffDays} ngày trước` : `${diffDays}d ago`;
}

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
  onOpenGeminiMacro?: () => void;
  onOpenLifeCopilot?: () => void;
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
  nutritionSummary?: HeaderNutritionSummary | null;
  activeRoadmapSummary?: HeaderRoadmapSummary | null;
  taskAlerts?: HeaderTaskAlerts | null;
  weightTrendAlert?: HeaderWeightTrendAlert | null;
  isLiveSyncEnabled?: boolean;
  onToggleLiveSync?: (enabled: boolean) => void;
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
  onOpenGeminiMacro,
  onOpenLifeCopilot,
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
  pendingTasksCount = 0,
  nutritionSummary,
  activeRoadmapSummary,
  taskAlerts,
  weightTrendAlert,
  isLiveSyncEnabled = true,
  onToggleLiveSync,
}) => {
  const [showNotificationPopup, setShowNotificationPopup] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [storedNotifs, setStoredNotifs] = useState<SystemNotification[]>(() => getStoredNotifications());

  useEffect(() => {
    const handler = () => {
      setStoredNotifs(getStoredNotifications());
    };
    window.addEventListener('app:notification-updated', handler);
    return () => window.removeEventListener('app:notification-updated', handler);
  }, []);

  const unreadStoredCount = useMemo(() => storedNotifs.filter((n) => !n.read).length, [storedNotifs]);
  const smartAlertsCount = useMemo(() => {
    let count = 0;
    if (nutritionSummary && nutritionSummary.consumedKcal < nutritionSummary.targetKcal) count++;
    if (activeRoadmapSummary) count++;
    if (weightTrendAlert) count++;
    if (taskAlerts && taskAlerts.overdue > 0) count++;
    return count;
  }, [nutritionSummary, activeRoadmapSummary, weightTrendAlert, taskAlerts]);

  const totalNotificationBadge = unreadStoredCount + smartAlertsCount;

  // Derive friendly greeting based on current time
  const hour = new Date().getHours();
  const timeGreetingVi =
    hour < 12 ? 'Chào buổi sáng' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';
  const timeGreetingEn =
    hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const displayName = userName || (userEmail ? userEmail.split('@')[0] : 'Admin');

  return (
    <header className="h-18 px-4 sm:px-6 lg:px-8 border-b border-slate-200/80 dark:border-white/[0.08] bg-white/90 dark:bg-[#080204]/85 backdrop-blur-2xl flex items-center justify-between gap-3 sm:gap-6 shrink-0 select-none z-30 transition-colors">
      {/* Left: Hamburger & Greeting */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={onToggleSidebar}
          title={lang === 'vi' ? 'Ẩn/hiện thanh bên' : 'Toggle sidebar'}
          className="p-2 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex flex-col">
          <h1 className="text-sm sm:text-base font-bold tracking-tight text-white flex items-center gap-1.5 leading-none">
            <span>
              {lang === 'vi' ? `${timeGreetingVi}, ` : `${timeGreetingEn}, `}
              <span className="text-rose-500 font-extrabold capitalize">{displayName}</span>
            </span>
          </h1>
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
            className="w-full pl-10 pr-12 py-2 bg-slate-100 dark:bg-white/[0.05] text-sm text-slate-800 dark:text-slate-100 rounded-full border border-slate-200 dark:border-white/[0.12] focus:outline-none focus:border-rose-500/60 placeholder-slate-400 transition-all shadow-sm backdrop-blur-md"
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
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-600/25 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden md:inline">{lang === 'vi' ? 'Tạo mới' : 'Create'}</span>
        </button>

        

        {/* ThreeUI Live Sync Switch in Header - Chỉ là nút và trạng thái, không nền xám */}
        <div className="flex items-center gap-2 select-none header-threeui-sync-control">
          <div className="w-[74px] sm:w-[82px] h-[36px] sm:h-[40px] rounded-full overflow-hidden bg-transparent relative">
            <SkeuomorphicToggleCollection
              variant="shader"
              mode="auto"
              speed={1.00}
              size={2.5}
              opacity={1.00}
              hue={syncState === 'synced' && isLiveSyncEnabled ? -85 : syncState === 'syncing' ? 45 : 140}
              saturation={isLiveSyncEnabled ? 1.3 : 0.35}
              brightness={isLiveSyncEnabled ? 1.1 : 0.7}
              defaultOn={isLiveSyncEnabled}
              label={
                !isLiveSyncEnabled
                  ? (lang === 'vi' ? 'CHƯA ĐỒNG BỘ' : 'NOT SYNCED')
                  : syncState === 'synced'
                  ? (lang === 'vi' ? 'ĐÃ ĐỒNG BỘ' : 'SYNCED')
                  : syncState === 'syncing'
                  ? (lang === 'vi' ? 'ĐANG LƯU...' : 'SYNCING...')
                  : (lang === 'vi' ? 'CHƯA ĐỒNG BỘ' : 'NOT SYNCED')
              }
              onChange={onToggleLiveSync}
            />
          </div>

          <span
            onClick={() => onToggleLiveSync?.(!isLiveSyncEnabled)}
            title={lang === 'vi' ? 'Bấm để bật/tắt Live Sync' : 'Click to toggle Live Sync'}
            className={`text-[11px] font-mono font-bold tracking-tight cursor-pointer transition-colors whitespace-nowrap select-none ${
              !isLiveSyncEnabled
                ? 'text-slate-400 dark:text-zinc-500'
                : syncState === 'synced'
                ? 'text-emerald-500 dark:text-emerald-400'
                : syncState === 'syncing'
                ? 'text-amber-500 dark:text-amber-400 animate-pulse'
                : 'text-rose-500 dark:text-rose-400'
            }`}
          >
            {!isLiveSyncEnabled
              ? (lang === 'vi' ? 'CHƯA ĐỒNG BỘ' : 'NOT SYNCED')
              : syncState === 'synced'
              ? (lang === 'vi' ? 'ĐÃ ĐỒNG BỘ' : 'SYNCED')
              : syncState === 'syncing'
              ? (lang === 'vi' ? 'ĐANG LƯU...' : 'SYNCING...')
              : (lang === 'vi' ? 'CHƯA ĐỒNG BỘ' : 'NOT SYNCED')}
          </span>
        </div>

        {/* Notification Bell with Badge */}
        <div className="relative">
          <button
            onClick={() => setShowNotificationPopup(!showNotificationPopup)}
            title={lang === 'vi' ? 'Thông báo hệ thống' : 'Notifications'}
            className="p-2 rounded-full bg-slate-100 dark:bg-white/[0.08] hover:bg-slate-200 dark:hover:bg-white/[0.16] text-slate-700 dark:text-slate-200 border border-transparent dark:border-white/[0.15] backdrop-blur-md transition-all cursor-pointer relative"
          >
            <Bell className="w-4 h-4" />
            {totalNotificationBadge > 0 && (
              <span className="absolute top-0 right-0 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center leading-none animate-pulse">
                {totalNotificationBadge}
              </span>
            )}
          </button>

          {showNotificationPopup && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowNotificationPopup(false)}
              />
              <div className="absolute right-0 mt-2 w-84 sm:w-96 bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-white/[0.08] rounded-3xl shadow-2xl p-4 z-50 max-h-[82vh] flex flex-col backdrop-blur-xl animate-fadeIn">
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/[0.08]/80 shrink-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      {lang === 'vi' ? 'Thông báo hệ thống' : 'Notifications'}
                    </h3>
                    {totalNotificationBadge > 0 && (
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                        {totalNotificationBadge} mới
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        markAllNotificationsRead();
                        setStoredNotifs(getStoredNotifications());
                      }}
                      title={lang === 'vi' ? 'Đánh dấu đã đọc tất cả' : 'Mark all as read'}
                      className="px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors text-xs flex items-center gap-1 cursor-pointer font-medium"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span className="text-[10px]">{lang === 'vi' ? 'Đã đọc' : 'Read'}</span>
                    </button>
                    {storedNotifs.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          clearAllNotifications();
                          setStoredNotifs([]);
                        }}
                        title={lang === 'vi' ? 'Xóa toàn bộ lịch sử' : 'Clear all'}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-rose-500 transition-colors text-xs flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Scrollable Items Container */}
                <div className="mt-3 space-y-2.5 overflow-y-auto pr-1 flex-1 text-xs">
                  {/* Real Nutrition Alert */}
                  {nutritionSummary && (
                    <div
                      onClick={() => {
                        onViewChange('health');
                        setShowNotificationPopup(false);
                      }}
                      className="p-3 rounded-2xl bg-amber-500/10 dark:bg-amber-950/25 border border-amber-500/25 hover:border-amber-500/50 transition-all cursor-pointer group space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-bold text-amber-600 dark:text-amber-400">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>{lang === 'vi' ? 'Mục tiêu dinh dưỡng hôm nay' : 'Daily Nutrition Target'}</span>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-amber-500 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                        {nutritionSummary.consumedKcal < nutritionSummary.targetKcal
                          ? (lang === 'vi'
                              ? `Bạn còn thiếu ${(nutritionSummary.targetKcal - nutritionSummary.consumedKcal).toLocaleString('vi-VN')} kcal & ${Math.max(0, nutritionSummary.targetProtein - nutritionSummary.consumedProtein)}g đạm cho ngày hôm nay (Đã nạp ${nutritionSummary.consumedKcal.toLocaleString('vi-VN')} / ${nutritionSummary.targetKcal.toLocaleString('vi-VN')} kcal).`
                              : `Remaining ${(nutritionSummary.targetKcal - nutritionSummary.consumedKcal)} kcal & ${Math.max(0, nutritionSummary.targetProtein - nutritionSummary.consumedProtein)}g protein today.`)
                          : (lang === 'vi'
                              ? `Đã đạt mục tiêu dinh dưỡng hôm nay (${nutritionSummary.consumedKcal.toLocaleString('vi-VN')} / ${nutritionSummary.targetKcal.toLocaleString('vi-VN')} kcal & ${nutritionSummary.consumedProtein}g đạm)!`
                              : `Daily nutrition goal achieved!`)}
                      </p>
                    </div>
                  )}

                  {/* Active CTG Wave Roadmap Alert */}
                  {activeRoadmapSummary && (
                    <div
                      onClick={() => {
                        onViewChange('health');
                        setShowNotificationPopup(false);
                      }}
                      className="p-3 rounded-2xl bg-rose-500/10 dark:bg-rose-950/25 border border-rose-500/25 hover:border-rose-500/50 transition-all cursor-pointer group space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-bold text-rose-600 dark:text-rose-400">
                          <Compass className="w-4 h-4 shrink-0" />
                          <span>Lộ trình CTG: {activeRoadmapSummary.phaseName}</span>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-rose-500 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                        {lang === 'vi'
                          ? `${activeRoadmapSummary.startDate} – ${activeRoadmapSummary.endDate} (Còn ~${activeRoadmapSummary.remainingDays} ngày). Mục tiêu: ${activeRoadmapSummary.startWeightKg}kg ➔ ${activeRoadmapSummary.targetWeightKg}kg.`
                          : `${activeRoadmapSummary.startDate} – ${activeRoadmapSummary.endDate} (~${activeRoadmapSummary.remainingDays} days left). Target: ${activeRoadmapSummary.startWeightKg}kg -> ${activeRoadmapSummary.targetWeightKg}kg.`}
                      </p>
                    </div>
                  )}

                  {/* Weight Trend Alert */}
                  {weightTrendAlert && (
                    <div
                      onClick={() => {
                        onViewChange('health');
                        setShowNotificationPopup(false);
                      }}
                      className="p-3 rounded-2xl bg-rose-500/10 dark:bg-rose-950/25 border border-rose-500/25 hover:border-rose-500/50 transition-all cursor-pointer group space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-bold text-rose-600 dark:text-rose-400">
                          <AlertTriangle className="w-4 h-4 shrink-0" />
                          <span>{weightTrendAlert.title}</span>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-rose-500 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                        {weightTrendAlert.message}
                      </p>
                    </div>
                  )}

                  {/* Task Alerts */}
                  {taskAlerts && taskAlerts.overdue > 0 && (
                    <div
                      onClick={() => {
                        onViewChange('tasks');
                        setShowNotificationPopup(false);
                      }}
                      className="p-3 rounded-2xl bg-rose-500/10 dark:bg-rose-950/25 border border-rose-500/25 hover:border-rose-500/50 transition-all cursor-pointer group space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-bold text-rose-600 dark:text-rose-400">
                          <Clock className="w-4 h-4 shrink-0" />
                          <span>{lang === 'vi' ? 'Công việc quá hạn' : 'Overdue Tasks'}</span>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-rose-500 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                        {lang === 'vi'
                          ? `Bạn có ${taskAlerts.overdue} công việc quá hạn cần hoàn thành.`
                          : `You have ${taskAlerts.overdue} overdue tasks.`}
                      </p>
                    </div>
                  )}

                  {/* Real Cloud & Google Sync Status */}
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/[0.08] text-xs space-y-1">
                    <div className="flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-300">
                      <Cloud className="w-4 h-4 text-rose-500 shrink-0" />
                      <span>
                        {isLoggedInGoogle
                          ? (lang === 'vi' ? 'Đồng bộ Google Calendar' : 'Google Calendar')
                          : (lang === 'vi' ? 'Lưu trữ cục bộ an toàn' : 'Local Storage')}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      {isLoggedInGoogle
                        ? (lang === 'vi'
                            ? `Tài khoản: ${userEmail}. Trạng thái: ${syncState === 'synced' ? 'Đã đồng bộ' : syncState === 'syncing' ? 'Đang cập nhật...' : syncState === 'error' ? 'Lỗi kết nối' : 'Ngoại tuyến'}.`
                            : `Account: ${userEmail}. Sync: ${syncState}.`)
                        : (lang === 'vi'
                            ? 'Dữ liệu được lưu trữ an toàn trên trình duyệt của bạn (Offline Mode).'
                            : 'All data saved securely on your browser.')}
                    </p>
                  </div>

                  {/* Stored Recent Activity / Notifications */}
                  {storedNotifs.length > 0 && (
                    <div className="pt-2 border-t border-slate-100 dark:border-white/[0.08]/80 space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block px-1">
                        {lang === 'vi' ? 'Hoạt động & Thông báo gần đây' : 'Recent Activity'}
                      </span>
                      {storedNotifs.slice(0, 10).map((n) => {
                        const isSuccess = n.type === 'success';
                        const isWarning = n.type === 'warning';
                        const isError = n.type === 'error';

                        return (
                          <div
                            key={n.id}
                            onClick={() => {
                              if (n.targetView) {
                                onViewChange(n.targetView as CalendarViewType);
                                setShowNotificationPopup(false);
                              }
                            }}
                            className={`p-2.5 rounded-xl border text-xs flex items-start justify-between gap-2.5 transition-colors ${
                              n.targetView ? 'cursor-pointer hover:bg-slate-100/80 dark:hover:bg-slate-800/80' : ''
                            } ${
                              n.read
                                ? 'bg-slate-50/50 dark:bg-slate-900/40 border-slate-100 dark:border-white/[0.08]/60 opacity-80'
                                : 'bg-slate-50 dark:bg-slate-900/80 border-slate-200 dark:border-slate-700/80'
                            }`}
                          >
                            <div className="flex items-start gap-2.5 min-w-0">
                              <div className="shrink-0 mt-0.5">
                                {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                                {isWarning && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                                {isError && <AlertCircle className="w-4 h-4 text-rose-500" />}
                                {!isSuccess && !isWarning && !isError && <Info className="w-4 h-4 text-rose-500" />}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                                    {n.title}
                                  </p>
                                  <span className="text-[9px] text-slate-400 shrink-0">
                                    {formatRelativeTime(n.createdAt, lang)}
                                  </span>
                                </div>
                                {n.message && (
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed line-clamp-2">
                                    {n.message}
                                  </p>
                                )}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNotification(n.id);
                                setStoredNotifs(getStoredNotifications());
                              }}
                              className="text-slate-400 hover:text-rose-500 p-1 rounded-md transition-colors shrink-0"
                              title="Xóa thông báo này"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Life Copilot AI Button */}
        {onOpenLifeCopilot && (
          <button
            onClick={onOpenLifeCopilot}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-rose-950/40 text-rose-300 hover:text-white border border-rose-500/30 hover:border-rose-500/60 font-semibold text-xs shadow-xs cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] backdrop-blur-md"
            title="Trợ Lý AI (⌘K / Ctrl + K)"
          >
            <Sparkles className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
            <span className="hidden sm:inline">Trợ Lý AI</span>
            <kbd className="hidden lg:inline-block px-1 py-0.2 rounded bg-white/10 text-[9px] font-mono text-rose-300/80">
              ⌘K
            </kbd>
          </button>
        )}

        {/* Consolidated Utility Capsule: Lang + Theme */}
        <div className="flex items-center p-0.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
          <button
            onClick={onToggleLang}
            title={lang === 'vi' ? 'Đổi sang English' : 'Chuyển sang Tiếng Việt'}
            className="px-2 py-1 rounded-full text-[11px] font-bold text-white/75 hover:text-white hover:bg-white/10 transition-colors cursor-pointer flex items-center gap-1"
          >
            <Globe className="w-3 h-3 text-rose-400" />
            <span>{lang === 'vi' ? 'VI' : 'EN'}</span>
          </button>

          <div className="w-px h-3 bg-white/15 mx-0.5" />

          <button
            onClick={onToggleDarkMode}
            title={darkMode ? 'Chuyển giao diện sáng' : 'Chuyển giao diện tối'}
            className="p-1 rounded-full text-white/75 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            {darkMode ? (
              <Sun className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <Moon className="w-3.5 h-3.5 text-slate-300" />
            )}
          </button>
        </div>

        {/* User Profile Avatar with dropdown (ShipNexus style) */}
        <div className="relative ml-1">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer group"
          >
            <div className="relative">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-rose-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center ring-2 ring-slate-200 dark:ring-slate-700 group-hover:ring-rose-400 transition-all shadow-xs">
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
                    {userEmail || (lang === 'vi' ? 'Tài khoản ZENOX' : 'ZENOX Account')}
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
                      <Cloud className="w-4 h-4 text-rose-500" />
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
                    <HelpCircle className="w-4 h-4 text-rose-500" />
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
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors text-left cursor-pointer"
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
