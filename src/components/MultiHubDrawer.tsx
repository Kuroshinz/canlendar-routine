import React, { useState, useEffect } from 'react';
import {
  X,
  Clock,
  DollarSign,
  GraduationCap,
  HeartPulse,
  RefreshCw,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Plus,
  AlertCircle,
  TrendingUp,
  Sparkles,
  LogOut,
  User as UserIcon,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { AppUser } from '../services/auth';
import { CalendarEvent } from '../types/calendar';
import { ExpenseEntry, StudyItem, DailyWellnessCheck, PomodoroState } from '../types/multiHub';
import { playNotificationSound } from '../utils/sound';

interface MultiHubDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  events: CalendarEvent[];
  user: AppUser | User | null;
  onGoogleSignIn: () => Promise<void>;
  onGoogleSignOut: () => Promise<void>;
  onSyncGoogleCalendar: () => Promise<void>;
  isSyncing: boolean;
  lastSyncedTime: string | null;
  lang: 'vi' | 'en';
}

export const MultiHubDrawer: React.FC<MultiHubDrawerProps> = ({
  isOpen,
  onClose,
  events,
  user,
  onGoogleSignIn,
  onGoogleSignOut,
  onSyncGoogleCalendar,
  isSyncing,
  lastSyncedTime,
  lang,
}) => {
  const [activeTab, setActiveTab] = useState<'sync' | 'time' | 'finance' | 'study' | 'stress'>('sync');

  // --- 1. Pomodoro Focus State ---
  const [pomo, setPomo] = useState<PomodoroState>({
    timeLeftSeconds: 25 * 60,
    isRunning: false,
    mode: 'work',
    sessionsCompleted: 3,
  });

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (pomo.isRunning && pomo.timeLeftSeconds > 0) {
      interval = setInterval(() => {
        setPomo((prev) => ({ ...prev, timeLeftSeconds: prev.timeLeftSeconds - 1 }));
      }, 1000);
    } else if (pomo.isRunning && pomo.timeLeftSeconds === 0) {
      playNotificationSound();
      setPomo((prev) => ({
        ...prev,
        isRunning: false,
        sessionsCompleted: prev.sessionsCompleted + (prev.mode === 'work' ? 1 : 0),
        mode: prev.mode === 'work' ? 'shortBreak' : 'work',
        timeLeftSeconds: prev.mode === 'work' ? 5 * 60 : 25 * 60,
      }));
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [pomo.isRunning, pomo.timeLeftSeconds, pomo.mode]);

  // --- 2. Finance State ---
  const [currency, setCurrency] = useState<'VND' | 'USD'>('VND');
  const [expenses, setExpenses] = useState<ExpenseEntry[]>([
    { id: 'ex-1', title: 'Ăn trưa họp team', amount: 350000, currency: 'VND', type: 'expense', category: 'food', date: '2026-10-29' },
    { id: 'ex-2', title: 'Mua sách công nghệ AI', amount: 280000, currency: 'VND', type: 'expense', category: 'study', date: '2026-10-28' },
    { id: 'ex-3', title: 'Tạm ứng phụ cấp dự án', amount: 5000000, currency: 'VND', type: 'income', category: 'work', date: '2026-10-27' },
  ]);
  const [newExpTitle, setNewExpTitle] = useState('');
  const [newExpAmount, setNewExpAmount] = useState('');
  const [newExpType, setNewExpType] = useState<'expense' | 'income'>('expense');

  const totalExpenseVND = expenses.filter((e) => e.type === 'expense').reduce((sum, e) => sum + e.amount, 0);
  const totalIncomeVND = expenses.filter((e) => e.type === 'income').reduce((sum, e) => sum + e.amount, 0);
  const balanceVND = totalIncomeVND - totalExpenseVND;

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(newExpAmount);
    if (!newExpTitle.trim() || isNaN(amt) || amt <= 0) return;
    setExpenses([
      {
        id: `ex-${Date.now()}`,
        title: newExpTitle.trim(),
        amount: amt,
        currency,
        type: newExpType,
        category: 'work',
        date: new Date().toISOString().split('T')[0],
      },
      ...expenses,
    ]);
    setNewExpTitle('');
    setNewExpAmount('');
  };

  // --- 3. Study Tracker State ---
  const [studyItems, setStudyItems] = useState<StudyItem[]>([
    { id: 'st-1', courseName: 'Trí tuệ Nhân tạo nâng cao', taskTitle: 'Hoàn thành bài tập lớn Fine-tuning', dueDate: '2026-11-05', status: 'in_progress', targetHours: 12, completedHours: 8, priority: 'high' },
    { id: 'st-2', courseName: 'Cấu trúc Dữ liệu & Giải thuật', taskTitle: 'Luyện 5 bài toán đồ thị trên LeetCode', dueDate: '2026-10-31', status: 'todo', targetHours: 6, completedHours: 2, priority: 'medium' },
    { id: 'st-3', courseName: 'Thiết kế Trải nghiệm UI/UX', taskTitle: 'Nộp báo cáo phỏng vấn người dùng', dueDate: '2026-10-29', status: 'submitted', targetHours: 8, completedHours: 8, priority: 'high' },
  ]);
  const [newCourseName, setNewCourseName] = useState('');
  const [newCourseTask, setNewCourseTask] = useState('');

  const handleAddStudyItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourseName.trim() || !newCourseTask.trim()) return;
    setStudyItems([
      {
        id: `st-${Date.now()}`,
        courseName: newCourseName.trim(),
        taskTitle: newCourseTask.trim(),
        dueDate: '2026-11-10',
        status: 'todo',
        targetHours: 6,
        completedHours: 0,
        priority: 'medium',
      },
      ...studyItems,
    ]);
    setNewCourseName('');
    setNewCourseTask('');
  };

  // --- 4. Stress & Wellness State ---
  const [stressCheck, setStressCheck] = useState<DailyWellnessCheck>({
    date: '2026-10-29',
    stressLevel: 2, // 1 to 5
    energyLevel: 4,
    sleepHours: 7.5,
  });

  const [isBreathing, setIsBreathing] = useState(false);
  const [breathPhase, setBreathPhase] = useState<'Hít vào...' | 'Giữ hơi...' | 'Thở ra...'>('Hít vào...');

  useEffect(() => {
    let breathTimer: NodeJS.Timeout | null = null;
    if (isBreathing) {
      const phases: Array<'Hít vào...' | 'Giữ hơi...' | 'Thở ra...'> = ['Hít vào...', 'Giữ hơi...', 'Thở ra...'];
      let idx = 0;
      breathTimer = setInterval(() => {
        idx = (idx + 1) % 3;
        setBreathPhase(phases[idx]);
      }, 4000);
    }
    return () => {
      if (breathTimer) clearInterval(breathTimer);
    };
  }, [isBreathing]);

  if (!isOpen) return null;

  const formatPomoTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/45 backdrop-blur-2xs select-none">
      <div className="bg-white dark:bg-[#1a1e24] rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Drawer Header with Multi-Hub Navigation Tabs */}
        <div className="px-5 py-3.5 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-gray-50/70 dark:bg-gray-900/50">
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 scrollbar-none">
            {[
              { id: 'sync', icon: RefreshCw, labelVi: 'Đồng bộ Google', labelEn: 'Google Sync' },
              { id: 'time', icon: Clock, labelVi: 'Quản lý thời gian', labelEn: 'Time & Focus' },
              { id: 'finance', icon: DollarSign, labelVi: 'Tiền tệ & Chi tiêu', labelEn: 'Finance' },
              { id: 'study', icon: GraduationCap, labelVi: 'Việc học tập', labelEn: 'Study' },
              { id: 'stress', icon: HeartPulse, labelVi: 'Chỉ số Stress', labelEn: 'Stress & Zen' },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200/60 dark:hover:bg-gray-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{lang === 'vi' ? tab.labelVi : tab.labelEn}</span>
                </button>
              );
            })}
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-[#242931] text-gray-400 hover:text-gray-600 cursor-pointer ml-2 shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* TAB 1: GOOGLE SYNC */}
          {activeTab === 'sync' && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50/60 dark:bg-blue-950/30 rounded-2xl border border-blue-200 dark:border-blue-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                    {user ? user.displayName?.[0] || user.email?.[0]?.toUpperCase() : 'G'}
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                      {user ? user.displayName || user.email : (lang === 'vi' ? 'Chưa kết nối tài khoản Google' : 'No Google account linked')}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {user ? user.email : (lang === 'vi' ? 'Đăng nhập để đồng bộ trực tiếp với Google Calendar' : 'Sign in to sync with Google Calendar')}
                    </p>
                  </div>
                </div>

                {user ? (
                  <button
                    onClick={onGoogleSignOut}
                    className="flex items-center gap-1.5 px-3.5 py-2 border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-200 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>{lang === 'vi' ? 'Đăng xuất' : 'Sign out'}</span>
                  </button>
                ) : (
                  <button
                    onClick={onGoogleSignIn}
                    className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-[#242931] text-gray-800 dark:text-gray-100 font-medium text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 48 48">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                    </svg>
                    <span>{lang === 'vi' ? 'Đăng nhập bằng Google' : 'Sign in with Google'}</span>
                  </button>
                )}
              </div>

              {/* Sync Action Bar */}
              <div className="p-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-semibold text-gray-800 dark:text-gray-100">
                      {lang === 'vi' ? 'Đồng bộ hóa 2 chiều với Google Calendar' : '2-Way Google Calendar Synchronization'}
                    </h4>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                      {lang === 'vi'
                        ? 'Tải các sự kiện từ Google Lịch và tự động đẩy sự kiện mới lên đám mây.'
                        : 'Pull latest events from Google Calendar and push new changes to the cloud.'}
                    </p>
                  </div>
                  <button
                    onClick={onSyncGoogleCalendar}
                    disabled={isSyncing}
                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer shrink-0"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? (lang === 'vi' ? 'Đang đồng bộ...' : 'Syncing...') : (lang === 'vi' ? 'Đồng bộ ngay' : 'Sync now')}</span>
                  </button>
                </div>

                {lastSyncedTime && (
                  <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium pt-2 border-t border-gray-100 dark:border-gray-700">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{lang === 'vi' ? `Lần đồng bộ gần nhất: ${lastSyncedTime}` : `Last synced: ${lastSyncedTime}`}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: TIME & FOCUS MANAGEMENT */}
          {activeTab === 'time' && (
            <div className="space-y-4">
              {/* Pomodoro Timer Widget */}
              <div className="p-5 bg-linear-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/40 dark:to-blue-950/40 rounded-2xl border border-indigo-100 dark:border-indigo-900 text-center space-y-3">
                <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider">
                  {pomo.mode === 'work'
                    ? (lang === 'vi' ? 'Phiên tập trung sâu (Pomodoro)' : 'Deep Work Session')
                    : (lang === 'vi' ? 'Nghỉ ngơi nạp năng lượng' : 'Short Break')}
                </span>

                <div className="text-5xl font-mono font-bold text-gray-800 dark:text-gray-100">
                  {formatPomoTime(pomo.timeLeftSeconds)}
                </div>

                <div className="flex items-center justify-center gap-3 pt-1">
                  <button
                    onClick={() => setPomo((prev) => ({ ...prev, isRunning: !prev.isRunning }))}
                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs rounded-xl shadow-md cursor-pointer transition-transform hover:scale-105"
                  >
                    {pomo.isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    <span>{pomo.isRunning ? (lang === 'vi' ? 'Tạm dừng' : 'Pause') : (lang === 'vi' ? 'Bắt đầu' : 'Start Focus')}</span>
                  </button>
                  <button
                    onClick={() => setPomo((prev) => ({ ...prev, isRunning: false, timeLeftSeconds: 25 * 60 }))}
                    className="p-2.5 border border-gray-300 dark:border-gray-700 rounded-xl hover:bg-white dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  {lang === 'vi' ? `Đã hoàn thành ${pomo.sessionsCompleted} phiên hôm nay` : `Completed ${pomo.sessionsCompleted} sessions today`}
                </p>
              </div>

              {/* Time Allocation Breakdown */}
              <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 space-y-3">
                <h4 className="text-xs font-bold text-gray-800 dark:text-gray-100 uppercase tracking-wider">
                  {lang === 'vi' ? 'Phân bổ quỹ thời gian theo danh mục (Tuần này)' : 'Weekly Time Allocation'}
                </h4>
                <div className="space-y-2 text-xs">
                  <div>
                    <div className="flex justify-between text-gray-600 dark:text-gray-300 mb-1">
                      <span>{lang === 'vi' ? 'Công việc & Dự án' : 'Work & Projects'}</span>
                      <span className="font-mono font-semibold">18.5 giờ (52%)</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                      <div className="h-full bg-blue-600 rounded-full" style={{ width: '52%' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-gray-600 dark:text-gray-300 mb-1">
                      <span>{lang === 'vi' ? 'Học tập & Nghiên cứu' : 'Study & Research'}</span>
                      <span className="font-mono font-semibold">8.0 giờ (23%)</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                      <div className="h-full bg-purple-600 rounded-full" style={{ width: '23%' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-gray-600 dark:text-gray-300 mb-1">
                      <span>{lang === 'vi' ? 'Sức khỏe & Thể thao' : 'Fitness & Health'}</span>
                      <span className="font-mono font-semibold">5.0 giờ (14%)</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                      <div className="h-full bg-emerald-600 rounded-full" style={{ width: '14%' }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: FINANCE & MULTI-CURRENCY */}
          {activeTab === 'finance' && (
            <div className="space-y-4">
              {/* Currency Toggle & Balance Card */}
              <div className="p-4 bg-linear-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase text-emerald-800 dark:text-emerald-300">
                    {lang === 'vi' ? 'Ngân sách tháng 10' : 'October Balance'}
                  </span>
                  <div className="flex items-center gap-1 bg-white dark:bg-gray-800 p-0.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs">
                    <button
                      onClick={() => setCurrency('VND')}
                      className={`px-2 py-0.5 rounded font-medium ${currency === 'VND' ? 'bg-emerald-600 text-white' : 'text-gray-600'}`}
                    >
                      VND (₫)
                    </button>
                    <button
                      onClick={() => setCurrency('USD')}
                      className={`px-2 py-0.5 rounded font-medium ${currency === 'USD' ? 'bg-emerald-600 text-white' : 'text-gray-600'}`}
                    >
                      USD ($)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 bg-white/70 dark:bg-gray-800/70 rounded-xl">
                    <span className="text-[10px] text-gray-500 uppercase">{lang === 'vi' ? 'Thu nhập' : 'Income'}</span>
                    <p className="text-sm font-bold text-emerald-600 font-mono">
                      {currency === 'VND' ? `${(totalIncomeVND / 1000).toLocaleString('vi-VN')}k ₫` : `$${Math.round(totalIncomeVND / 25000)}`}
                    </p>
                  </div>
                  <div className="p-2 bg-white/70 dark:bg-gray-800/70 rounded-xl">
                    <span className="text-[10px] text-gray-500 uppercase">{lang === 'vi' ? 'Chi tiêu' : 'Expense'}</span>
                    <p className="text-sm font-bold text-rose-600 font-mono">
                      {currency === 'VND' ? `${(totalExpenseVND / 1000).toLocaleString('vi-VN')}k ₫` : `$${Math.round(totalExpenseVND / 25000)}`}
                    </p>
                  </div>
                  <div className="p-2 bg-white/70 dark:bg-gray-800/70 rounded-xl">
                    <span className="text-[10px] text-gray-500 uppercase">{lang === 'vi' ? 'Còn lại' : 'Remaining'}</span>
                    <p className="text-sm font-bold text-blue-600 font-mono">
                      {currency === 'VND' ? `${(balanceVND / 1000).toLocaleString('vi-VN')}k ₫` : `$${Math.round(balanceVND / 25000)}`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Add Quick Expense Form */}
              <form onSubmit={handleAddExpense} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-wrap gap-2 items-center">
                <input
                  type="text"
                  value={newExpTitle}
                  onChange={(e) => setNewExpTitle(e.target.value)}
                  placeholder={lang === 'vi' ? 'Tên chi tiêu (VD: Vé tàu, Ăn tối)' : 'Item name...'}
                  className="flex-1 min-w-[120px] text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
                />
                <input
                  type="number"
                  value={newExpAmount}
                  onChange={(e) => setNewExpAmount(e.target.value)}
                  placeholder={currency === 'VND' ? 'Số tiền (VNĐ)' : 'Amount (USD)'}
                  className="w-28 text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 font-mono"
                />
                <select
                  value={newExpType}
                  onChange={(e) => setNewExpType(e.target.value as 'expense' | 'income')}
                  className="text-xs px-2 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
                >
                  <option value="expense">{lang === 'vi' ? 'Chi tiền (-)' : 'Expense'}</option>
                  <option value="income">{lang === 'vi' ? 'Thu tiền (+)' : 'Income'}</option>
                </select>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
                >
                  {lang === 'vi' ? 'Ghi nhận' : 'Add'}
                </button>
              </form>

              {/* Recent Transaction items */}
              <div className="space-y-2">
                {expenses.map((ex) => (
                  <div key={ex.id} className="p-2.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-gray-800 dark:text-gray-100">{ex.title}</p>
                      <p className="text-[10px] text-gray-400">{ex.date}</p>
                    </div>
                    <span className={`text-xs font-mono font-bold ${ex.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {ex.type === 'income' ? '+' : '-'}{ex.amount.toLocaleString()} {currency === 'VND' ? '₫' : '$'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: STUDY & ACADEMIC TRACKER */}
          {activeTab === 'study' && (
            <div className="space-y-4">
              <form onSubmit={handleAddStudyItem} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 flex gap-2">
                <input
                  type="text"
                  value={newCourseName}
                  onChange={(e) => setNewCourseName(e.target.value)}
                  placeholder={lang === 'vi' ? 'Môn học (VD: Trí tuệ Nhân tạo)' : 'Course...'}
                  className="w-1/3 text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
                />
                <input
                  type="text"
                  value={newCourseTask}
                  onChange={(e) => setNewCourseTask(e.target.value)}
                  placeholder={lang === 'vi' ? 'Nội dung bài tập / ôn thi...' : 'Assignment...'}
                  className="flex-1 text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </form>

              <div className="space-y-2.5">
                {studyItems.map((st) => (
                  <div key={st.id} className="p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase">
                        {st.courseName}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        st.status === 'submitted'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                      }`}>
                        {st.status === 'submitted' ? (lang === 'vi' ? 'Đã hoàn thành' : 'Done') : (lang === 'vi' ? 'Đang thực hiện' : 'In progress')}
                      </span>
                    </div>

                    <h5 className="text-xs font-semibold text-gray-800 dark:text-gray-100">
                      {st.taskTitle}
                    </h5>

                    <div className="flex items-center justify-between text-[11px] text-gray-400">
                      <span>{lang === 'vi' ? `Hạn chót: ${st.dueDate}` : `Due: ${st.dueDate}`}</span>
                      <span>{st.completedHours}/{st.targetHours} {lang === 'vi' ? 'giờ đã học' : 'hours'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: STRESS & MENTAL WELLNESS */}
          {activeTab === 'stress' && (
            <div className="space-y-4">
              {/* Daily Stress Check-in */}
              <div className="p-4 bg-linear-to-br from-rose-50 to-orange-50 dark:from-rose-950/40 dark:to-orange-950/40 rounded-2xl border border-rose-200 dark:border-rose-900 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-800 dark:text-rose-300 uppercase">
                    {lang === 'vi' ? 'Đánh giá mức độ áp lực hôm nay' : 'Daily Stress Level'}
                  </span>
                  <span className="text-sm font-bold font-mono">
                    {stressCheck.stressLevel === 1 ? '🌿 Thư thái (1/5)' : stressCheck.stressLevel === 2 ? '😊 Nhẹ nhàng (2/5)' : stressCheck.stressLevel === 3 ? '😐 Bình thường (3/5)' : stressCheck.stressLevel === 4 ? '⚡ Áp lực (4/5)' : '🔥 Quá tải (5/5)'}
                  </span>
                </div>

                {/* Level selector buttons */}
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => setStressCheck((prev) => ({ ...prev, stressLevel: lvl }))}
                      className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        stressCheck.stressLevel === lvl
                          ? 'bg-rose-600 text-white shadow-md scale-105'
                          : 'bg-white/80 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-white'
                      }`}
                    >
                      {lvl === 1 ? '🌿 1' : lvl === 2 ? '😊 2' : lvl === 3 ? '😐 3' : lvl === 4 ? '⚡ 4' : '🔥 5'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Guided Breathing Box */}
              <div className="p-5 bg-teal-50/60 dark:bg-teal-950/40 rounded-2xl border border-teal-200 dark:border-teal-800 text-center space-y-3">
                <span className="text-xs font-bold text-teal-800 dark:text-teal-300 uppercase">
                  {lang === 'vi' ? 'Bài tập thở thư giãn 4-4-4 (Box Breathing)' : '4-4-4 Box Breathing Exercise'}
                </span>

                <div className="h-28 flex items-center justify-center">
                  <div
                    className={`w-20 h-20 rounded-full bg-teal-500 text-white font-bold text-xs flex items-center justify-center shadow-lg transition-transform duration-1000 ${
                      isBreathing ? 'scale-125 animate-pulse' : 'scale-100'
                    }`}
                  >
                    {isBreathing ? breathPhase : 'Bắt đầu'}
                  </div>
                </div>

                <button
                  onClick={() => setIsBreathing(!isBreathing)}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-xs"
                >
                  {isBreathing ? (lang === 'vi' ? 'Dừng bài tập' : 'Stop') : (lang === 'vi' ? 'Bắt đầu thư giãn 2 phút' : 'Start 2-min Breath')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

