import React, { useState, useRef, useEffect } from 'react';
import { User } from 'firebase/auth';
import { CalendarEvent, CalendarCategory, SyncState } from '../../types/calendar';
import { downloadICalFile, parseICalToEvents } from '../../services/icalService';
import { batchUploadEvents } from '../../services/firestoreSync';
import { fetchCalendarFromICalUrl } from '../../services/googleCalendarUrlSync';
import { AppUser } from '../../services/auth';
import { executeRealGoogleSync, DEFAULT_GOOGLE_CLIENT_ID } from '../../services/realGoogleAuth';
import {
  Cloud,
  CloudOff,
  RefreshCw,
  Download,
  Upload,
  X,
  LogIn,
  LogOut,
  FileCheck,
  AlertCircle,
  Link,
  HelpCircle,
  ExternalLink,
  CheckCircle2,
  Calendar as CalendarIcon,
  Sparkles,
  Key,
  ShieldCheck,
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
  const [activeTab, setActiveTab] = useState<'oauth' | 'url' | 'file'>('oauth');
  const [gcalUrl, setGcalUrl] = useState(() => localStorage.getItem('gcal_sync_url') || '');
  const [oauthToken, setOauthToken] = useState(() => localStorage.getItem('gcal_real_access_token') || '');
  const [customClientId, setCustomClientId] = useState(() => localStorage.getItem('gcal_custom_client_id') || '');
  const [isSyncing, setIsSyncing] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showTokenGuide, setShowTokenGuide] = useState(false);
  const [showUrlGuide, setShowUrlGuide] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
            ? `Đã xác thực Google thành công! Đã tải về ${res.events.length} sự kiện thực tế từ tài khoản ${res.user.email}!`
            : `Authenticated successfully with Google! Loaded ${res.events.length} live events from ${res.user.email}!`
        );
      }
    } catch (err: any) {
      setErrorMsg(
        err.message ||
          'Không thể mở cửa sổ Google OAuth. Nếu bạn gặp lỗi origin mismatch trên localhost, hãy dán Access Token hoặc dùng tab URL Bí Mật.'
      );
    } finally {
      setIsSyncing(false);
    }
  };

  // 2. Handle Direct Access Token Sync (from Google OAuth Playground or Cloud Console)
  const handleSyncWithToken = async () => {
    if (!oauthToken.trim()) {
      setErrorMsg(lang === 'vi' ? 'Vui lòng nhập Google Access Token' : 'Please provide Google Access Token');
      return;
    }
    try {
      setIsSyncing(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      const res = await executeRealGoogleSync(undefined, oauthToken.trim());
      localStorage.setItem('gcal_real_access_token', oauthToken.trim());

      if (res.events && res.events.length >= 0) {
        onImportEvents(res.events);
        setSuccessMsg(
          lang === 'vi'
            ? `Đã kết nối tài khoản ${res.user.email || 'Google'} và tải về ${res.events.length} sự kiện thật từ Google Calendar!`
            : `Connected to ${res.user.email} and loaded ${res.events.length} real events!`
        );
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi kết nối Google Calendar bằng Access Token.');
    } finally {
      setIsSyncing(false);
    }
  };

  // 3. Handle Sync from Google Calendar Secret URL (iCal WebCal)
  const handleSyncFromUrl = async () => {
    if (!gcalUrl.trim()) {
      setErrorMsg(lang === 'vi' ? 'Vui lòng dán liên kết iCal từ Google Calendar' : 'Please paste Google Calendar iCal link');
      return;
    }

    try {
      setIsSyncing(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      const parsedEvents = await fetchCalendarFromICalUrl(gcalUrl.trim());
      localStorage.setItem('gcal_sync_url', gcalUrl.trim());

      onImportEvents(parsedEvents);
      setSuccessMsg(
        lang === 'vi'
          ? `Đã đồng bộ thành công ${parsedEvents.length} sự kiện thật từ Google Calendar!`
          : `Successfully synced ${parsedEvents.length} live events from Google Calendar!`
      );
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi đồng bộ từ liên kết Google Calendar');
    } finally {
      setIsSyncing(false);
    }
  };

  // 4. Handle File Import
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = parseICalToEvents(text);
        if (parsed.length === 0) {
          setErrorMsg(lang === 'vi' ? 'Không tìm thấy sự kiện nào trong tệp .ics' : 'No events found in .ics file');
          return;
        }

        const validEvents: CalendarEvent[] = parsed.map((p) => ({
          id: p.id || `ev-imp-${Date.now()}-${Math.random()}`,
          title: p.title || 'Untitled',
          startDate: p.startDate || new Date().toISOString().split('T')[0],
          endDate: p.endDate || p.startDate || new Date().toISOString().split('T')[0],
          startTime: p.startTime || '09:00',
          endTime: p.endTime || '10:00',
          allDay: Boolean(p.allDay),
          calendarId: p.calendarId || 'work',
          color: p.color || '#039BE5',
          description: p.description,
          location: p.location,
          meetUrl: p.meetUrl,
          type: 'event',
          createdAt: Date.now(),
        }));

        onImportEvents(validEvents);
        setSuccessMsg(
          lang === 'vi'
            ? `Đã nạp thành công ${validEvents.length} sự kiện từ tệp Google Calendar .ics!`
            : `Successfully imported ${validEvents.length} events from Google .ics!`
        );
        setErrorMsg(null);
      } catch (err: any) {
        setErrorMsg(err.message || 'Lỗi đọc tệp .ics');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#1a1e24] w-full max-w-xl rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col max-h-[92vh]">
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
              <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <span>{lang === 'vi' ? 'Đồng Bộ Lịch Thật Với Google Calendar' : 'Real Google Calendar Sync'}</span>
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {lang === 'vi' ? 'Kết nối tài khoản Google để nạp sự kiện thực tế' : 'Connect real Google account to fetch live events'}
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
                <img src={user.photoURL} alt="" className="w-7 h-7 rounded-full border border-emerald-400 object-cover" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                  {user.displayName?.[0] || 'G'}
                </div>
              )}
              <div>
                <span className="font-bold text-emerald-900 dark:text-emerald-200">{user.displayName || user.email}</span>
                <span className="text-[11px] text-emerald-700 dark:text-emerald-400 block font-mono">
                  {user.email} • {lang === 'vi' ? 'Đã kết nối' : 'Connected'}
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

        {/* Tab Switcher */}
        <div className="flex border-b border-gray-200 dark:border-gray-800 px-6 bg-gray-50/50 dark:bg-gray-900/40 text-xs font-semibold shrink-0">
          <button
            onClick={() => setActiveTab('oauth')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
              activeTab === 'oauth'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>{lang === 'vi' ? 'Đăng Nhập Google API' : 'Google API OAuth'}</span>
          </button>

          <button
            onClick={() => setActiveTab('url')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
              activeTab === 'url'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <Link className="w-4 h-4" />
            <span>{lang === 'vi' ? 'URL Bí Mật (Không Cần API)' : 'Secret iCal URL'}</span>
          </button>

          <button
            onClick={() => setActiveTab('file')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
              activeTab === 'file'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>{lang === 'vi' ? 'Tệp Google .ICS' : 'Google .ICS File'}</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          {/* TAB 1: Google OAuth2 Real */}
          {activeTab === 'oauth' && (
            <div className="space-y-4">
              {/* Official 1-click Popup Button */}
              <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-blue-900 dark:text-blue-200">
                      {lang === 'vi' ? 'Đăng nhập bằng cửa sổ Google (GIS)' : 'Sign In with Official Google Popup'}
                    </h3>
                    <p className="text-[11px] text-gray-600 dark:text-gray-300 mt-0.5">
                      {lang === 'vi'
                        ? 'Mở popup chính thức của Google để cấp quyền đọc lịch'
                        : 'Launch official Google consent screen to fetch your real calendar'}
                    </p>
                  </div>
                  <button
                    onClick={handleRealGoogleOAuthLogin}
                    disabled={isSyncing}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer shrink-0"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                      <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                    </svg>
                    <span>{isSyncing ? (lang === 'vi' ? 'Đang mở Google...' : 'Connecting...') : (lang === 'vi' ? 'Đăng Nhập Google' : 'Sign In with Google')}</span>
                  </button>
                </div>
              </div>

              {/* Direct Access Token Input (For 100% reliable real sync without localhost domain mismatch) */}
              <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-blue-600" />
                    {lang === 'vi' ? 'Đồng bộ trực tiếp bằng Google Access Token' : 'Direct Google Access Token'}
                  </span>
                  <button
                    onClick={() => setShowTokenGuide(!showTokenGuide)}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>{showTokenGuide ? 'Ẩn hướng dẫn' : 'Cách lấy token trong 15 giây'}</span>
                  </button>
                </div>

                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  {lang === 'vi'
                    ? 'Dán mã Access Token từ Google để ứng dụng kết nối trực tiếp đến Google Calendar API v3 và nạp 100% dữ liệu lịch thật.'
                    : 'Paste Google Access Token to fetch 100% real events from Google Calendar API v3.'}
                </p>

                {showTokenGuide && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900 rounded-lg text-[11px] text-gray-700 dark:text-gray-300 space-y-1 animate-in fade-in duration-100">
                    <p className="font-semibold text-gray-900 dark:text-gray-100">
                      Cách lấy Google Access Token miễn phí và nhanh nhất:
                    </p>
                    <ol className="list-decimal list-inside space-y-1 pl-1">
                      <li>
                        Truy cập:{' '}
                        <a
                          href="https://developers.google.com/oauthplayground"
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 font-bold underline inline-flex items-center gap-0.5"
                        >
                          Google OAuth 2.0 Playground <ExternalLink className="w-3 h-3" />
                        </a>
                      </li>
                      <li>Ở cột trái, cuộn tìm <strong>Google Calendar API v3</strong> &gt; Tích chọn <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">.../auth/calendar.events</code></li>
                      <li>Bấm nút xanh <strong>"Authorize APIs"</strong> &gt; Đăng nhập tài khoản Google của bạn &gt; Cho phép.</li>
                      <li>Bấm <strong>"Exchange authorization code for tokens"</strong> &gt; Sao chép ô <strong>Access token</strong> (bắt đầu bằng <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">ya29...</code>) và dán vào ô bên dưới.</li>
                    </ol>
                  </div>
                )}

                <div className="flex gap-2">
                  <input
                    type="password"
                    placeholder="ya29.a0AfH6SM..."
                    value={oauthToken}
                    onChange={(e) => setOauthToken(e.target.value)}
                    className="flex-1 text-xs px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 font-mono"
                  />
                  <button
                    onClick={handleSyncWithToken}
                    disabled={isSyncing || !oauthToken.trim()}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{lang === 'vi' ? 'Nạp Lịch Thật Ngay' : 'Fetch Real Events'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Secret URL iCal */}
          {activeTab === 'url' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    {lang === 'vi' ? 'Đồng bộ 100% dữ liệu thật không cần thiết lập API' : 'Sync 100% real data without API setup'}
                  </span>
                  <button
                    onClick={() => setShowUrlGuide(!showUrlGuide)}
                    className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium cursor-pointer"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>{showUrlGuide ? 'Ẩn' : 'Xem cách lấy'}</span>
                  </button>
                </div>
                <p className="text-gray-600 dark:text-gray-300">
                  {lang === 'vi'
                    ? 'Chỉ cần dán "Địa chỉ bí mật ở định dạng iCal" từ Google Calendar để nạp toàn bộ lịch cá nhân thật của bạn vào ứng dụng.'
                    : 'Paste the Secret address in iCal format from Google Calendar to sync your real schedule.'}
                </p>

                {showUrlGuide && (
                  <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-900/60 text-[11px] text-gray-700 dark:text-gray-300 space-y-1.5 animate-in fade-in duration-100">
                    <ol className="list-decimal list-inside space-y-1 pl-1">
                      <li>Mở [calendar.google.com](https://calendar.google.com/) trên máy tính.</li>
                      <li>Ở cột trái bên cạnh tên lịch, bấm dấu 3 chấm ⋮ &gt; "Cài đặt và chia sẻ".</li>
                      <li>Cuộn xuống mục "Tích hợp lịch" &gt; Sao chép ô "Địa chỉ bí mật ở định dạng iCal" (kết thúc bằng <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">basic.ics</code>).</li>
                    </ol>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  {lang === 'vi' ? 'Địa chỉ bí mật iCal từ Google Calendar:' : 'Google Calendar iCal Secret URL:'}
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://calendar.google.com/calendar/ical/.../basic.ics"
                    value={gcalUrl}
                    onChange={(e) => setGcalUrl(e.target.value)}
                    className="flex-1 text-xs px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                  <button
                    onClick={handleSyncFromUrl}
                    disabled={isSyncing || !gcalUrl.trim()}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer shrink-0"
                  >
                    <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? 'Đang tải...' : 'Đồng Bộ Lịch Thật'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: File Import */}
          {activeTab === 'file' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3.5">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="p-5 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-500 hover:bg-blue-50/20 dark:hover:bg-blue-950/20 transition-all flex flex-col items-center justify-center text-center cursor-pointer group"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".ics,text/calendar"
                    className="hidden"
                  />
                  <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform mb-3">
                    <Upload className="w-6 h-6" />
                  </div>
                  <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100 mb-1">
                    {lang === 'vi' ? 'Nhập Tệp .ICS Thật' : 'Import Real .ICS'}
                  </h4>
                  <p className="text-[11px] text-gray-400">
                    {lang === 'vi' ? 'Kéo thả file xuất từ Google Calendar' : 'Drop exported Google file'}
                  </p>
                </div>

                <div
                  onClick={() => downloadICalFile(events, 'lich-google-calendar-pro.ics')}
                  className="p-5 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-emerald-500 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/20 transition-all flex flex-col items-center justify-center text-center cursor-pointer group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform mb-3">
                    <Download className="w-6 h-6" />
                  </div>
                  <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100 mb-1">
                    {lang === 'vi' ? 'Xuất Tệp .ICS' : 'Export .ICS'}
                  </h4>
                  <p className="text-[11px] text-gray-400">
                    {events.length} {lang === 'vi' ? 'sự kiện sẵn sàng nhập Google' : 'events ready for Google'}
                  </p>
                </div>
              </div>
            </div>
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
