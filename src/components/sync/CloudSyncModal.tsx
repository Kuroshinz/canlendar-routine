import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { CalendarEvent, CalendarCategory, SyncState } from '../../types/calendar';
import { AppUser } from '../../services/auth';
import { executeRealGoogleSync, DEFAULT_GOOGLE_CLIENT_ID } from '../../services/realGoogleAuth';
import { fetchCalendarFromICalUrl } from '../../services/googleCalendarUrlSync';
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
  Link2,
  ExternalLink,
  HelpCircle,
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
  const [activeTab, setActiveTab] = useState<'ical' | 'google' | 'token' | 'new-account'>('ical');
  const [customClientId, setCustomClientId] = useState(() => localStorage.getItem('gcal_custom_client_id') || '');
  const [showClientIdField, setShowClientIdField] = useState(
    () => Boolean(localStorage.getItem('gcal_custom_client_id'))
  );

  // iCal URL state
  const [icalUrl, setIcalUrl] = useState(() => localStorage.getItem('gcal_sync_url') || '');

  // Access Token state
  const [manualToken, setManualToken] = useState(() => localStorage.getItem('gcal_real_access_token') || '');

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

  // 1. Handle iCal Secret URL Sync (100% works on Vercel & Brave without origin restrictions)
  const handleIcalSync = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = icalUrl.trim();
    if (!trimmed) {
      setErrorMsg(lang === 'vi' ? 'Vui lòng nhập liên kết iCal' : 'Please enter an iCal link');
      return;
    }

    try {
      setIsSyncing(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      const imported = await fetchCalendarFromICalUrl(trimmed);
      if (imported.length > 0) {
        localStorage.setItem('gcal_sync_url', trimmed);
        onImportEvents(imported);
        setSuccessMsg(
          lang === 'vi'
            ? `Đã đồng bộ thành công ${imported.length} sự kiện từ Google Calendar vào web!`
            : `Successfully synced ${imported.length} events from Google Calendar!`
        );
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể đồng bộ từ URL này. Vui lòng kiểm tra lại liên kết.');
    } finally {
      setIsSyncing(false);
    }
  };

  // 2. Handle Real Google OAuth Login Popup
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
      const msg = err.message || '';
      if (msg.includes('origin') || msg.includes('400') || msg.includes('blocked') || msg.includes('popup')) {
        setErrorMsg(
          lang === 'vi'
            ? 'Lỗi xung đột OAuth trên web vortexcal.vercel.app: Do Google yêu cầu đăng ký Authorized JavaScript Origin, hoặc do trình duyệt Brave đang bật chặn Popup/Shields. Vui lòng dùng tab "Liên kết iCal Google" bên cạnh để đồng bộ ngay lập tức 100% không bị chặn!'
            : 'OAuth origin conflict or popup blocked on vortexcal.vercel.app. Please switch to the "Google iCal Link" tab to sync immediately without origin restrictions!'
        );
      } else {
        setErrorMsg(msg || 'Không thể đăng nhập Google.');
      }
    } finally {
      setIsSyncing(false);
    }
  };

  // 3. Handle Manual Access Token Sync
  const handleTokenSync = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualToken.trim()) {
      setErrorMsg(lang === 'vi' ? 'Vui lòng nhập Access Token' : 'Please enter an Access Token');
      return;
    }

    try {
      setIsSyncing(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      const res = await executeRealGoogleSync(undefined, manualToken.trim());
      if (res.user) {
        onImportEvents(res.events);
        setSuccessMsg(
          lang === 'vi'
            ? `Đã kết nối Google qua Access Token! Tải về ${res.events.length} sự kiện.`
            : `Connected via Access Token! Loaded ${res.events.length} events.`
        );
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Access Token không hợp lệ hoặc đã hết hạn.');
    } finally {
      setIsSyncing(false);
    }
  };

  // 4. Handle Create New Account
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#1a1e24] w-full max-w-xl rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
              </svg>
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
                {lang === 'vi' ? 'Đồng Bộ Google Calendar' : 'Google Calendar Sync'}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {lang === 'vi'
                  ? 'Đồng bộ lịch thật của bạn lên vortexcal.vercel.app'
                  : 'Sync your real calendar to vortexcal.vercel.app'}
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

        {/* User Status Bar if logged in */}
        {user ? (
          <div className="px-6 py-2.5 bg-emerald-50/80 dark:bg-emerald-950/40 border-b border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between text-xs shrink-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-emerald-900 dark:text-emerald-200">{user.displayName || user.email}</span>
              <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-mono">
                • {lang === 'vi' ? 'Đã kết nối' : 'Connected'}
              </span>
            </div>
            <button
              onClick={onGoogleSignOut}
              className="text-xs text-red-600 dark:text-red-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
            >
              <LogOut className="w-3 h-3" />
              <span>{lang === 'vi' ? 'Đăng xuất' : 'Sign out'}</span>
            </button>
          </div>
        ) : null}

        {/* Messages */}
        {successMsg && (
          <div className="m-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="m-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 flex items-start gap-2 text-xs text-red-800 dark:text-red-200 leading-relaxed">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="flex border-b border-gray-200 dark:border-gray-800 px-6 bg-gray-50/50 dark:bg-gray-900/40 text-xs font-semibold shrink-0 overflow-x-auto">
          {/* TAB 1: iCal Secret Link (Recommended for Web / Brave) */}
          <button
            onClick={() => setActiveTab('ical')}
            className={`py-3 px-3 border-b-2 flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors ${
              activeTab === 'ical'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <Link2 className="w-4 h-4 text-blue-500" />
            <span>{lang === 'vi' ? 'Liên kết iCal (Khuyên dùng)' : 'iCal Link (Recommended)'}</span>
          </button>

          {/* TAB 2: Official Google OAuth */}
          <button
            onClick={() => setActiveTab('google')}
            className={`py-3 px-3 border-b-2 flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors ${
              activeTab === 'google'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>{lang === 'vi' ? 'Popup Google OAuth' : 'Google OAuth'}</span>
          </button>

          {/* TAB 3: Access Token */}
          <button
            onClick={() => setActiveTab('token')}
            className={`py-3 px-3 border-b-2 flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors ${
              activeTab === 'token'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <span>Access Token</span>
          </button>

          {/* TAB 4: New Account */}
          <button
            onClick={() => setActiveTab('new-account')}
            className={`py-3 px-3 border-b-2 flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors ${
              activeTab === 'new-account'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>{lang === 'vi' ? 'Tài Khoản Mới' : 'New Account'}</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          {/* TAB 1: iCal Link (Secret Google Calendar Address - 100% works on Vercel & Brave) */}
          {activeTab === 'ical' && (
            <form onSubmit={handleIcalSync} className="space-y-4">
              <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/80">
                <div className="flex items-center gap-2 font-bold text-xs text-blue-900 dark:text-blue-200 mb-1">
                  <Sparkles className="w-4 h-4 text-blue-500 shrink-0" />
                  <span>{lang === 'vi' ? 'Giải pháp đồng bộ 100% không bị chặn OAuth' : '100% Guaranteed Sync without OAuth block'}</span>
                </div>
                <p className="text-[11px] text-gray-600 dark:text-gray-300 leading-relaxed">
                  {lang === 'vi'
                    ? 'Hoạt động hoàn hảo trên vortexcal.vercel.app và trình duyệt Brave mà không cần cấu hình Google Cloud Console hay lo lỗi Origin Mismatch.'
                    : 'Works perfectly on vortexcal.vercel.app and Brave browser without any origin restrictions.'}
                </p>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                  {lang === 'vi' ? 'Địa chỉ bí mật ở định dạng iCal từ Google Calendar:' : 'Secret address in iCal format:'}
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://calendar.google.com/calendar/ical/.../private-.../basic.ics"
                  value={icalUrl}
                  onChange={(e) => setIcalUrl(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono shadow-2xs focus:outline-blue-500"
                />
              </div>

              {/* Instructions on how to get secret iCal URL */}
              <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700/60 text-xs space-y-1.5 text-gray-600 dark:text-gray-300">
                <span className="font-bold text-gray-800 dark:text-gray-200 block">
                  {lang === 'vi' ? 'Cách lấy link iCal bí mật trong 30 giây:' : 'How to get your secret iCal link:'}
                </span>
                <ol className="list-decimal pl-4 space-y-1 text-[11px]">
                  <li>{lang === 'vi' ? 'Mở Google Calendar (calendar.google.com) trên trình duyệt máy tính.' : 'Open Google Calendar on your PC.'}</li>
                  <li>{lang === 'vi' ? 'Ở cột bên trái (Lịch của tôi), bấm vào dấu 3 chấm cạnh tên lịch > chọn "Cài đặt và chia sẻ".' : 'Click the 3 dots next to your calendar > "Settings and sharing".'}</li>
                  <li>{lang === 'vi' ? 'Cuộn xuống mục "Tích hợp lịch" > Sao chép "Địa chỉ bí mật ở định dạng iCal".' : 'Scroll down to "Integrate calendar" > Copy "Secret address in iCal format".'}</li>
                  <li>{lang === 'vi' ? 'Dán vào ô trên và bấm "Đồng Bộ Ngay" bên dưới.' : 'Paste above and click "Sync Now".'}</li>
                </ol>
              </div>

              <button
                type="submit"
                disabled={isSyncing}
                className="w-full flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 shrink-0 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>
                  {isSyncing
                    ? (lang === 'vi' ? 'Đang tải dữ liệu lịch...' : 'Syncing...')
                    : (lang === 'vi' ? 'Đồng Bộ Lịch Ngay' : 'Sync Calendar Now')}
                </span>
              </button>
            </form>
          )}

          {/* TAB 2: Google OAuth Popup */}
          {activeTab === 'google' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-200">
                <span className="font-bold block mb-1">
                  {lang === 'vi' ? 'Lưu ý khi chạy trên domain vortexcal.vercel.app:' : 'Note for vortexcal.vercel.app domain:'}
                </span>
                <p className="text-[11px] leading-relaxed">
                  {lang === 'vi'
                    ? 'Để đăng nhập trực tiếp qua popup Google, bạn cần tạo OAuth Client ID trên Google Cloud Console và thêm "https://vortexcal.vercel.app" vào mục Authorized JavaScript Origins (Đồng thời tắt khiên Brave Shields nếu đang dùng Brave).'
                    : 'To use Google popup on Vercel, add "https://vortexcal.vercel.app" to Authorized JavaScript Origins in Google Cloud Console.'}
                </p>
              </div>

              <button
                onClick={handleRealGoogleOAuthLogin}
                disabled={isSyncing}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 shrink-0 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>
                  {isSyncing
                    ? (lang === 'vi' ? 'Đang kết nối Google...' : 'Connecting...')
                    : (lang === 'vi' ? 'Thử Mở Cửa Sổ Đăng Nhập Google' : 'Open Google Sign-In Popup')}
                </span>
              </button>

              {/* Custom Client ID */}
              <div className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                <button
                  type="button"
                  onClick={() => setShowClientIdField((v) => !v)}
                  className="w-full flex items-center justify-between text-left cursor-pointer"
                >
                  <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-300 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                    {lang === 'vi' ? 'Tùy chỉnh Google Client ID của bạn' : 'Custom Google Client ID'}
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

          {/* TAB 3: Access Token Sync */}
          {activeTab === 'token' && (
            <form onSubmit={handleTokenSync} className="space-y-4">
              <div>
                <label className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                  {lang === 'vi' ? 'Dán Google OAuth Access Token (Bearer ya29...):' : 'Paste Google Access Token:'}
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="ya29.a0AfH6SM..."
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-mono focus:outline-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={isSyncing}
                className="w-full flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 shrink-0 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{lang === 'vi' ? 'Kết Nối Bằng Token' : 'Connect via Token'}</span>
              </button>
            </form>
          )}

          {/* TAB 4: Create New Account */}
          {activeTab === 'new-account' && (
            <form onSubmit={handleCreateAccountSubmit} className="space-y-4">
              <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/80">
                <h3 className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  Bắt Đầu Với Dữ Liệu Mới Hoàn Toàn (Clean Slate)
                </h3>
                <p className="text-[11px] text-gray-600 dark:text-gray-300 mt-1 leading-relaxed">
                  Tạo một tài khoản riêng để bắt đầu từ con số 0.
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
                    placeholder="Ví dụ: Nguyễn Thiện Nhân..."
                    value={newAccName}
                    onChange={(e) => setNewAccName(e.target.value)}
                    className="mt-1 w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 shadow-2xs"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-xs"
                >
                  Tạo Tài Khoản & Bắt Đầu
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
