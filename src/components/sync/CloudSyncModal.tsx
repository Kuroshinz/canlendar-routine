import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { CalendarEvent, CalendarCategory, SyncState } from '../../types/calendar';
import { AppUser } from '../../services/auth';
import { executeRealGoogleSync, DEFAULT_GOOGLE_CLIENT_ID } from '../../services/realGoogleAuth';
import {
  X,
  LogIn,
  LogOut,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  UserPlus,
  RefreshCw,
  Key,
} from 'lucide-react';

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: AppUser | User | null;
  onGoogleSignIn: () => Promise<void>;
  onGoogleSignOut: () => Promise<void>;
  events: CalendarEvent[];
  categories: CalendarCategory[];
  onImportEvents: (newEvents: CalendarEvent[]) => void;
  syncState: SyncState;
  lastSyncedTime: string | null;
  lang: 'vi' | 'en';
  onSyncGoogleCalendar?: (token?: string) => Promise<void>;
  onCreateNewAccount?: (name: string, email: string, clearData: boolean) => void;
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({
  isOpen,
  onClose,
  user,
  onGoogleSignIn,
  onGoogleSignOut,
  events,
  categories,
  onImportEvents,
  syncState,
  lastSyncedTime,
  lang,
  onSyncGoogleCalendar,
  onCreateNewAccount,
}) => {
  const [activeTab, setActiveTab] = useState<'google' | 'new-account'>('google');
  const [customClientId, setCustomClientId] = useState(() => localStorage.getItem('gcal_custom_client_id') || '');
  const [showClientIdField, setShowClientIdField] = useState(
    () => Boolean(localStorage.getItem('gcal_custom_client_id'))
  );

  // New account form state
  const [newAccName, setNewAccName] = useState('');
  const [newAccEmail, setNewAccEmail] = useState('');
  const [clearDataOnCreate, setClearDataOnCreate] = useState(true);

  const [isSyncing, setIsSyncing] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // 1. Handle Real Google OAuth Login Popup
  const handleRealGoogleOAuthLogin = async () => {
    try {
      setIsSyncing(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      const res = await executeRealGoogleSync(customClientId || undefined);
      if (res.user) {
        onImportEvents(res.events);
        setSuccessMsg(
          lang === 'vi'
            ? `Đã đăng nhập Google thành công! Tải về ${res.events.length} sự kiện từ tài khoản ${res.user.email}!`
            : `Authenticated with Google! Loaded ${res.events.length} events from ${res.user.email}!`
        );
      }
    } catch (err: any) {
      setErrorMsg(
        err.message || 'Không thể đăng nhập Google. Vui lòng thử lại hoặc sử dụng đăng nhập bằng popup Google.'
      );
    } finally {
      setIsSyncing(false);
    }
  };

  // 2. Handle Create New Account & Start Fresh
  const handleCreateAccountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccName.trim()) {
      setErrorMsg(lang === 'vi' ? 'Vui lòng nhập tên của bạn' : 'Please enter your name');
      return;
    }

    if (onCreateNewAccount) {
      onCreateNewAccount(newAccName.trim(), newAccEmail.trim(), clearDataOnCreate);
      setSuccessMsg(
        lang === 'vi'
          ? `Đã tạo tài khoản "${newAccName}" thành công! ${
              clearDataOnCreate ? 'Dữ liệu đã được làm mới hoàn toàn từ số 0.' : 'Bắt đầu làm việc.'
            }`
          : `Created account "${newAccName}" successfully!`
      );
      setTimeout(() => {
        onClose();
      }, 1200);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#1a1e24] w-full max-w-lg rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              {/* Google 4-color icon */}
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
              </svg>
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
                {lang === 'vi' ? 'Tài Khoản & Đồng Bộ' : 'Account & Sync'}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {lang === 'vi'
                  ? 'Đăng nhập Google hoặc tạo tài khoản mới để bắt đầu dữ liệu sạch'
                  : 'Sign in with Google or create a new account to start fresh'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Status Bar */}
        {user ? (
          <div className="px-6 py-3 bg-emerald-50/80 dark:bg-emerald-950/40 border-b border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between text-xs shrink-0">
            <div className="flex items-center gap-2.5">
              {user.photoURL ? (
                <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full border border-emerald-400 object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                  {user.displayName?.[0] || 'U'}
                </div>
              )}
              <div>
                <span className="font-bold text-emerald-900 dark:text-emerald-200">{user.displayName || user.email}</span>
                <span className="text-[11px] text-emerald-700 dark:text-emerald-400 block font-mono">
                  {user.email || 'Tài khoản cá nhân'} • {lang === 'vi' ? 'Đang hoạt động' : 'Active'}
                </span>
              </div>
            </div>
            <button
              onClick={onGoogleSignOut}
              className="text-xs text-red-600 dark:text-red-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{lang === 'vi' ? 'Đăng xuất' : 'Sign out'}</span>
            </button>
          </div>
        ) : null}

        {/* Tab Switcher - Only 2 tabs: Google or New Account */}
        <div className="flex border-b border-gray-200 dark:border-gray-800 px-6 bg-gray-50/50 dark:bg-gray-900/40 text-xs font-semibold shrink-0">
          <button
            onClick={() => setActiveTab('google')}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
              activeTab === 'google'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>{lang === 'vi' ? 'Đăng Nhập Google' : 'Sign In with Google'}</span>
          </button>

          <button
            onClick={() => setActiveTab('new-account')}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
              activeTab === 'new-account'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>{lang === 'vi' ? 'Tài Khoản Mới (Bắt Đầu Từ Đầu)' : 'Create New Account'}</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          {/* TAB 1: Google Sign In */}
          {activeTab === 'google' && (
            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/80 flex flex-col gap-4 text-center items-center">
                <div className="w-12 h-12 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center shadow-xs">
                  <svg className="w-7 h-7" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                    <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                  </svg>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                    {lang === 'vi' ? 'Đăng nhập bằng tài khoản Google' : 'Sign in with Google Account'}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm">
                    {lang === 'vi'
                      ? 'Tự động đồng bộ toàn bộ lịch trình thật từ Google Calendar và bảo mật dữ liệu sức khỏe của bạn.'
                      : 'Automatically sync your Google Calendar and keep your schedule up to date.'}
                  </p>
                </div>

                <button
                  onClick={handleRealGoogleOAuthLogin}
                  disabled={isSyncing}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 shrink-0 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>
                    {isSyncing
                      ? lang === 'vi'
                        ? 'Đang kết nối Google...'
                        : 'Connecting...'
                      : lang === 'vi'
                      ? 'Đăng Nhập Google Ngay'
                      : 'Sign In with Google'}
                  </span>
                </button>
              </div>

              {/* Optional Client ID config if needed for localhost */}
              <div className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                <button
                  onClick={() => setShowClientIdField((v) => !v)}
                  className="w-full flex items-center justify-between text-left cursor-pointer"
                >
                  <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-300 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                    {lang === 'vi' ? 'Tùy chỉnh Google Client ID (Tùy chọn)' : 'Custom Google Client ID (Optional)'}
                  </span>
                  <span className="text-[11px] text-blue-600 dark:text-blue-400 underline">
                    {showClientIdField ? 'Ẩn' : 'Mở rộng'}
                  </span>
                </button>

                {showClientIdField && (
                  <div className="space-y-2 pt-2.5">
                    <input
                      type="text"
                      placeholder="1234567890-xxxxxxxxxxxxxxxx.apps.googleusercontent.com"
                      value={customClientId}
                      onChange={(e) => {
                        setCustomClientId(e.target.value);
                        if (e.target.value.trim()) {
                          localStorage.setItem('gcal_custom_client_id', e.target.value.trim());
                        } else {
                          localStorage.removeItem('gcal_custom_client_id');
                        }
                      }}
                      className="w-full text-xs px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 font-mono"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Create New Account (Start with Fresh Clean Data) */}
          {activeTab === 'new-account' && (
            <form onSubmit={handleCreateAccountSubmit} className="space-y-4">
              <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/80">
                <h3 className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  Bắt Đầu Với Dữ Liệu Mới Hoàn Toàn (Clean Slate)
                </h3>
                <p className="text-[11px] text-gray-600 dark:text-gray-300 mt-1 leading-relaxed">
                  Tạo một tài khoản riêng để bắt đầu từ con số 0. Tùy chọn xóa sạch toàn bộ lịch trình,
                  thói quen và nhiệm vụ mẫu để bạn tự do xây dựng hệ thống của chính mình.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                    Tên của bạn / Biệt danh *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Nguyễn Thiện Nhân, Alex..."
                    value={newAccName}
                    onChange={(e) => setNewAccName(e.target.value)}
                    className="mt-1 w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                    Email liên hệ (Tùy chọn)
                  </label>
                  <input
                    type="email"
                    placeholder="ban@example.com"
                    value={newAccEmail}
                    onChange={(e) => setNewAccEmail(e.target.value)}
                    className="mt-1 w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 shadow-2xs"
                  />
                </div>

                <label className="flex items-start gap-2.5 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/60 dark:bg-emerald-950/30 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={clearDataOnCreate}
                    onChange={(e) => setClearDataOnCreate(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 block">
                      Làm sạch dữ liệu và bắt đầu từ số 0 (Khuyên dùng)
                    </span>
                    <span className="text-[11px] text-gray-500 dark:text-gray-400 block mt-0.5">
                      Xóa toàn bộ các sự kiện lịch, task và nhật ký mẫu ban đầu để bạn bắt đầu trang lịch hoàn toàn trống.
                    </span>
                  </div>
                </label>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Tạo Tài Khoản & Bắt Đầu Ngay</span>
                </button>
              </div>
            </form>
          )}

          {/* Feedback Messages */}
          {successMsg && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-200 rounded-xl text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-medium">{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-red-800 dark:text-red-200 rounded-xl text-xs">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/40 flex items-center justify-between text-xs text-gray-500">
          <span>{events.length} sự kiện trong lịch</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg font-medium cursor-pointer"
          >
            {lang === 'vi' ? 'Đóng' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
