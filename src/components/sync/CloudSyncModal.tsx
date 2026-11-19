import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { CalendarEvent, CalendarCategory, SyncState } from '../../types/calendar';
import { AppUser } from '../../services/auth';
import { executeRealGoogleSync } from '../../services/realGoogleAuth';
import { playSuccessSound } from '../../utils/sound';
import { notifySuccess } from '../../utils/notify';
import {
  X,
  LogIn,
  LogOut,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
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
}) => {
  const [customClientId, setCustomClientId] = useState('');
  const [manualToken, setManualToken] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      setSuccessMsg(null);
      const savedClientId = localStorage.getItem('gcal_custom_client_id') || '';
      setCustomClientId(savedClientId);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentDomain = typeof window !== 'undefined' ? window.location.origin : 'https://vortexcal.vercel.app';

  const handleDirectGoogleLogin = async (overrideClientId?: string) => {
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const activeClientId = (overrideClientId !== undefined ? overrideClientId : customClientId).trim();

    try {
      if (activeClientId) {
        localStorage.setItem('gcal_custom_client_id', activeClientId);
      }
      
      const res = await executeRealGoogleSync(activeClientId || undefined);
      if (res?.user) {
        playSuccessSound();
        notifySuccess(
          lang === 'vi' ? 'Đã kết nối Google Calendar!' : 'Google Calendar Connected!',
          lang === 'vi'
            ? `Tài khoản ${res.user.email} đã đồng bộ thành công ${res.events?.length || 0} sự kiện.`
            : `Synced ${res.events?.length || 0} events for ${res.user.email}.`
        );
        if (res.events && res.events.length > 0) {
          onImportEvents(res.events);
        }
        setSuccessMsg(
          lang === 'vi'
            ? `Đã đăng nhập thành công tài khoản ${res.user.email || res.user.displayName} và đồng bộ ${res.events?.length || 0} sự kiện!`
            : `Logged in as ${res.user.email} and synced ${res.events?.length || 0} events!`
        );
        setTimeout(() => {
          onClose();
        }, 1200);
      }
    } catch (err: any) {
      console.error('Google Sign In failed:', err);
      const msg = err?.message || String(err);
      setErrorMsg(msg);
      // Auto expand configuration so user can immediately paste Client ID
      setShowAdvanced(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualTokenLogin = async () => {
    if (!manualToken.trim()) return;
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await executeRealGoogleSync(undefined, manualToken.trim());
      if (res?.user) {
        if (res.events && res.events.length > 0) {
          onImportEvents(res.events);
        }
        setSuccessMsg(
          lang === 'vi'
            ? `Đã xác thực Access Token thành công (${res.user.email})!`
            : `Token verified successfully (${res.user.email})!`
        );
        setTimeout(() => {
          onClose();
        }, 1200);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Access Token không hợp lệ hoặc đã hết hạn.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSyncNow = async () => {
    if (!onSyncGoogleCalendar) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      await onSyncGoogleCalendar();
      playSuccessSound();
      notifySuccess(
        lang === 'vi' ? 'Làm mới lịch Google thành công!' : 'Google Calendar refreshed!',
        lang === 'vi' ? 'Dữ liệu sự kiện đã được cập nhật mới nhất.' : 'Events up to date.'
      );
      setSuccessMsg(lang === 'vi' ? 'Đã làm mới dữ liệu lịch Google!' : 'Google Calendar refreshed!');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Lỗi làm mới lịch Google.');
    } finally {
      setIsLoading(false);
    }
  };

  const isOriginMismatch =
    Boolean(errorMsg) &&
    (errorMsg!.includes('origin') ||
      errorMsg!.includes('400') ||
      errorMsg!.includes('401') ||
      errorMsg!.includes('invalid_client') ||
      errorMsg!.includes('unauthorized') ||
      errorMsg!.includes('redirect_uri_mismatch') ||
      errorMsg!.includes('closed'));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center border border-blue-100 dark:border-blue-900/50 shadow-xs">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {lang === 'vi' ? 'Đăng nhập Google' : 'Google Sign-In'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {lang === 'vi'
                  ? 'Đồng bộ trực tiếp với Google Calendar của bạn'
                  : 'Direct sync with your real Google Calendar'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Notifications */}
          {errorMsg && (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-2xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <div className="text-xs text-rose-700 dark:text-rose-300 space-y-1">
                <p className="font-semibold">{lang === 'vi' ? 'Trạng thái đăng nhập Google:' : 'Google Login Status:'}</p>
                <p className="break-all">{errorMsg}</p>
              </div>
            </div>
          )}

          {successMsg && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-2xl flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                {successMsg}
              </p>
            </div>
          )}

          {/* User state: Already logged in */}
          {user ? (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center gap-4">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Google'}
                    className="w-12 h-12 rounded-full border border-slate-200 dark:border-slate-700 object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-blue-600 text-white font-bold text-base flex items-center justify-center">
                    {(user.displayName || user.email || 'G')[0].toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {user.displayName || 'Google User'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {user.email}
                  </p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                      {lang === 'vi' ? 'Đã kết nối tài khoản Google' : 'Google Connected'}
                    </span>
                  </div>
                </div>
              </div>

              {lastSyncedTime && (
                <p className="text-center text-xs text-slate-500 dark:text-slate-400">
                  {lang === 'vi' ? `Lần đồng bộ gần nhất: ${lastSyncedTime}` : `Last synced: ${lastSyncedTime}`}
                </p>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleSyncNow}
                  disabled={isLoading}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>{lang === 'vi' ? 'Làm mới lịch ngay' : 'Sync Calendar Now'}</span>
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await onGoogleSignOut();
                    onClose();
                  }}
                  className="flex items-center justify-center gap-2 py-3 px-4 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 text-rose-600 dark:text-rose-400 text-xs font-bold rounded-xl transition-all cursor-pointer border border-rose-200 dark:border-rose-900/40"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{lang === 'vi' ? 'Đăng xuất' : 'Sign Out'}</span>
                </button>
              </div>
            </div>
          ) : (
            /* User state: Not logged in */
            <div className="space-y-4">
              {/* Main One-Click Google Login Button */}
              <button
                type="button"
                onClick={() => handleDirectGoogleLogin()}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 py-3.5 px-6 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-bold text-sm rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 shadow-md transition-all cursor-pointer disabled:opacity-50 group"
              >
                {isLoading ? (
                  <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                )}
                <span>
                  {isLoading
                    ? lang === 'vi'
                      ? 'Đang kết nối Google...'
                      : 'Connecting Google...'
                    : lang === 'vi'
                    ? 'Đăng nhập bằng tài khoản Google'
                    : 'Sign in with Google'}
                </span>
              </button>

              {/* Explanatory Origin Mismatch / 401 Invalid Client Card */}
              {isOriginMismatch && (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-2xl text-xs space-y-2.5">
                  <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
                    <ShieldCheck className="w-4 h-4 text-amber-600" />
                    <span>
                      {lang === 'vi'
                        ? 'Cách khắc phục trong tab Clients – Google Auth Platform bạn đang mở:'
                        : 'How to fix in your open Google Auth Platform tab:'}
                    </span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1.5 text-amber-800 dark:text-amber-300 pl-1 leading-relaxed">
                    <li>
                      {lang === 'vi' ? (
                        <>
                          Trong tab <b>Clients – Google Auth Platform</b>, bấm vào tên <b>OAuth 2.0 Client ID</b> của bạn.
                        </>
                      ) : (
                        'In your Google Auth Platform tab, click on your OAuth 2.0 Client ID.'
                      )}
                    </li>
                    <li>
                      {lang === 'vi' ? (
                        <>
                          Kéo đến <b>Authorized JavaScript origins</b>, bấm <b>+ ADD URI</b> và dán:
                          <div className="mt-1 p-1.5 bg-amber-100 dark:bg-amber-900 font-mono font-bold rounded select-all text-[11px] text-amber-900 dark:text-amber-100">
                            {currentDomain}
                          </div>
                        </>
                      ) : (
                        <>
                          Add <code className="px-1 py-0.5 bg-amber-100 font-mono">{currentDomain}</code> to <b>Authorized JavaScript origins</b>
                        </>
                      )}
                    </li>
                    <li>
                      {lang === 'vi'
                        ? 'Bấm Lưu (SAVE). Sau đó copy Client ID của bạn dán vào ô bên dưới:'
                        : 'Click Save, copy your Client ID and paste below:'}
                    </li>
                  </ol>
                </div>
              )}

              {/* Client ID / Token Input Section */}
              <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/60 animate-in fade-in duration-200">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>{lang === 'vi' ? 'Google OAuth Client ID của bạn:' : 'Your Google OAuth Client ID:'}</span>
                    {customClientId && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-normal">
                        ✓ {lang === 'vi' ? 'Đã lưu' : 'Saved'}
                      </span>
                    )}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customClientId}
                      onChange={(e) => setCustomClientId(e.target.value)}
                      placeholder="...apps.googleusercontent.com"
                      className="flex-1 px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 font-mono text-slate-800 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => handleDirectGoogleLogin(customClientId)}
                      disabled={!customClientId.trim() || isLoading}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50 cursor-pointer shadow-xs"
                    >
                      {lang === 'vi' ? 'Lưu & Đăng nhập' : 'Save & Login'}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {lang === 'vi'
                      ? 'Dán Client ID từ tab Google Cloud đã thêm domain vortexcal.vercel.app để đăng nhập ngay.'
                      : 'Paste your Client ID with vortexcal.vercel.app whitelisted to login.'}
                  </p>
                </div>

                {/* Collapsible OAuth Playground token input */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="w-full flex items-center justify-between py-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 transition-colors cursor-pointer"
                  >
                    <span>
                      {lang === 'vi'
                        ? 'Hoặc đăng nhập tức thì bằng Access Token (Google OAuth Playground)'
                        : 'Or login instantly with Access Token'}
                    </span>
                    {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {showAdvanced && (
                    <div className="mt-2 space-y-2 pt-2 animate-in fade-in duration-150">
                      <div className="flex gap-2">
                        <input
                          type="password"
                          value={manualToken}
                          onChange={(e) => setManualToken(e.target.value)}
                          placeholder="ya29.a0AfH6S..."
                          className="flex-1 px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 font-mono text-slate-800 dark:text-white"
                        />
                        <button
                          type="button"
                          onClick={handleManualTokenLogin}
                          disabled={!manualToken.trim() || isLoading}
                          className="px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50 cursor-pointer"
                        >
                          {lang === 'vi' ? 'Xác thực' : 'Verify'}
                        </button>
                      </div>
                      <a
                        href="https://developers.google.com/oauthplayground"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-blue-500 hover:underline"
                      >
                        <span>{lang === 'vi' ? 'Mở Google OAuth Playground để lấy token' : 'Open OAuth Playground to get token'}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
