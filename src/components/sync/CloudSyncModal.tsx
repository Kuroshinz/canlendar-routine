import React, { useState, useRef, useEffect } from 'react';
import { User } from 'firebase/auth';
import { AppUser } from '../../services/auth';
import { CalendarEvent, CalendarCategory, SyncState } from '../../types/calendar';
import { downloadICalFile, parseICalToEvents } from '../../services/icalService';
import { batchUploadEvents } from '../../services/firestoreSync';
import { fetchCalendarFromICalUrl } from '../../services/googleCalendarUrlSync';
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
  const [activeTab, setActiveTab] = useState<'url' | 'file' | 'oauth'>('url');
  const [gcalUrl, setGcalUrl] = useState(() => localStorage.getItem('gcal_sync_url') || '');
  const [oauthToken, setOauthToken] = useState(() => localStorage.getItem('gcal_oauth_token') || '');
  const [isSyncingUrl, setIsSyncingUrl] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [importCount, setImportCount] = useState<number | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setImportCount(null);
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // 1. Handle Sync from Google Calendar Secret URL
  const handleSyncFromUrl = async () => {
    if (!gcalUrl.trim()) {
      setErrorMsg(lang === 'vi' ? 'Vui lòng dán liên kết iCal từ Google Calendar' : 'Please paste Google Calendar iCal link');
      return;
    }

    try {
      setIsSyncingUrl(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      const parsedEvents = await fetchCalendarFromICalUrl(gcalUrl.trim());
      localStorage.setItem('gcal_sync_url', gcalUrl.trim());

      onImportEvents(parsedEvents);
      setImportCount(parsedEvents.length);
      setSuccessMsg(
        lang === 'vi'
          ? `Đã đồng bộ thành công ${parsedEvents.length} sự kiện thực tế từ Google Calendar!`
          : `Successfully synced ${parsedEvents.length} live events from Google Calendar!`
      );
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi đồng bộ từ liên kết Google Calendar');
    } finally {
      setIsSyncingUrl(false);
    }
  };

  // 2. Handle File Import
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
          calendarId: p.calendarId || 'personal',
          color: p.color || '#039BE5',
          description: p.description,
          location: p.location,
          meetUrl: p.meetUrl,
          type: 'event',
          createdAt: Date.now(),
        }));

        onImportEvents(validEvents);
        setImportCount(validEvents.length);
        setSuccessMsg(
          lang === 'vi'
            ? `Đã nạp thành công ${validEvents.length} sự kiện từ tệp .ics vào lịch!`
            : `Successfully imported ${validEvents.length} events from .ics file!`
        );
        setErrorMsg(null);
      } catch (err: any) {
        setErrorMsg(err.message || 'Lỗi đọc tệp .ics');
      }
    };
    reader.readAsText(file);
  };

  // 3. Handle Direct OAuth API Sync
  const handleSyncWithToken = async () => {
    if (!oauthToken.trim()) {
      setErrorMsg(lang === 'vi' ? 'Vui lòng nhập Google OAuth Access Token' : 'Please provide Google OAuth Token');
      return;
    }
    try {
      setIsSyncingUrl(true);
      setErrorMsg(null);
      localStorage.setItem('gcal_oauth_token', oauthToken.trim());
      if (onSyncGoogleCalendar) {
        await onSyncGoogleCalendar(oauthToken.trim());
        setSuccessMsg(lang === 'vi' ? 'Đã đồng bộ 2 chiều thành công với Google Calendar API!' : 'Two-way sync complete!');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi gọi Google Calendar API');
    } finally {
      setIsSyncingUrl(false);
    }
  };

  // 4. Handle Cloud Push
  const handleSyncAllFirestore = async () => {
    if (!user) {
      await onGoogleSignIn();
      return;
    }
    try {
      setIsUploading(true);
      setErrorMsg(null);
      await batchUploadEvents(user.uid, events);
      setSuccessMsg(lang === 'vi' ? 'Đã lưu trữ toàn bộ lịch lên đám mây!' : 'All events backed up to cloud!');
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi đẩy dữ liệu lên Cloud');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#1a1e24] w-full max-w-xl rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <span>{lang === 'vi' ? 'Đồng Bộ Hóa Google Calendar' : 'Google Calendar Synchronization'}</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                  Live Sync
                </span>
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {lang === 'vi'
                  ? 'Đồng bộ hóa dữ liệu lịch thật hai chiều với Google Calendar của bạn'
                  : 'Sync your real schedule seamlessly with Google Calendar'}
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

        {/* Tab Switcher */}
        <div className="flex border-b border-gray-200 dark:border-gray-800 px-6 bg-gray-50/50 dark:bg-gray-900/40 text-xs font-semibold shrink-0">
          <button
            onClick={() => setActiveTab('url')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
              activeTab === 'url'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <Link className="w-4 h-4" />
            <span>{lang === 'vi' ? 'URL Bí Mật (Khuyên Dùng)' : 'Secret iCal URL'}</span>
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
            <span>{lang === 'vi' ? 'Kéo Thả Tệp .ICS' : 'File .ICS'}</span>
          </button>

          <button
            onClick={() => setActiveTab('oauth')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
              activeTab === 'oauth'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <Cloud className="w-4 h-4" />
            <span>{lang === 'vi' ? 'Google API & Cloud' : 'Google API & Cloud'}</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* TAB 1: Secret URL iCal */}
          {activeTab === 'url' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    {lang === 'vi' ? 'Đồng bộ tự động không cần mật khẩu' : 'Auto sync without password'}
                  </span>
                  <button
                    onClick={() => setShowGuide(!showGuide)}
                    className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium cursor-pointer"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>{showGuide ? (lang === 'vi' ? 'Đóng hướng dẫn' : 'Hide guide') : (lang === 'vi' ? 'Xem cách lấy link' : 'How to get URL')}</span>
                  </button>
                </div>
                <p className="text-gray-600 dark:text-gray-300">
                  {lang === 'vi'
                    ? 'Dán "Địa chỉ bí mật ở định dạng iCal" từ Google Calendar để đồng bộ tất cả sự kiện cá nhân và công việc một cách tự động.'
                    : 'Paste the Secret address in iCal format from your Google Calendar to load all your real-time events.'}
                </p>

                {showGuide && (
                  <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-900/60 text-[11px] text-gray-700 dark:text-gray-300 space-y-1.5 animate-in fade-in duration-100">
                    <p className="font-semibold text-gray-900 dark:text-gray-100">
                      {lang === 'vi' ? '3 bước lấy URL bí mật trên Google Calendar:' : '3 steps on Google Calendar:'}
                    </p>
                    <ol className="list-decimal list-inside space-y-1 pl-1">
                      <li>
                        {lang === 'vi' ? 'Mở Google Calendar trên máy tính (calendar.google.com)' : 'Open calendar.google.com'}
                      </li>
                      <li>
                        {lang === 'vi' ? 'Ở cột trái bên cạnh tên lịch của bạn, bấm dấu 3 chấm ⋮ > "Cài đặt và chia sẻ"' : 'Click 3-dots on your calendar > Settings and sharing'}
                      </li>
                      <li>
                        {lang === 'vi' ? 'Cuộn xuống mục "Tích hợp lịch" > Sao chép ô "Địa chỉ bí mật ở định dạng iCal" (kết thúc bằng .ics)' : 'Scroll down to Integrate calendar > Copy "Secret address in iCal format"'}
                      </li>
                    </ol>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  {lang === 'vi' ? 'Liên kết iCal Google Calendar:' : 'Google Calendar iCal URL:'}
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="url"
                      placeholder="https://calendar.google.com/calendar/ical/.../basic.ics"
                      value={gcalUrl}
                      onChange={(e) => setGcalUrl(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                  </div>
                  <button
                    onClick={handleSyncFromUrl}
                    disabled={isSyncingUrl || !gcalUrl.trim()}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer shrink-0"
                  >
                    <RefreshCw className={`w-4 h-4 ${isSyncingUrl ? 'animate-spin' : ''}`} />
                    <span>{isSyncingUrl ? (lang === 'vi' ? 'Đang đồng bộ...' : 'Syncing...') : (lang === 'vi' ? 'Đồng bộ ngay' : 'Sync Now')}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: File Import/Export */}
          {activeTab === 'file' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3.5">
                {/* Import Box */}
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
                    {lang === 'vi' ? 'Nhập Tệp .ICS' : 'Import .ICS File'}
                  </h4>
                  <p className="text-[11px] text-gray-400">
                    {lang === 'vi' ? 'Kéo thả hoặc bấm để chọn tệp xuất từ Google Calendar' : 'Drop or pick exported .ics'}
                  </p>
                </div>

                {/* Export Box */}
                <div
                  onClick={() => downloadICalFile(events, 'lich-google-calendar-pro.ics')}
                  className="p-5 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-emerald-500 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/20 transition-all flex flex-col items-center justify-center text-center cursor-pointer group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform mb-3">
                    <Download className="w-6 h-6" />
                  </div>
                  <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100 mb-1">
                    {lang === 'vi' ? 'Xuất Tệp .ICS' : 'Export .ICS File'}
                  </h4>
                  <p className="text-[11px] text-gray-400">
                    {events.length} {lang === 'vi' ? 'sự kiện sẵn sàng nạp vào Google' : 'events ready for Google'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Google API & Cloud */}
          {activeTab === 'oauth' && (
            <div className="space-y-4">
              {/* Firestore card */}
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  {user ? (
                    <div className="flex items-center gap-3">
                      {user.photoURL ? (
                        <img
                          src={user.photoURL}
                          alt={user.displayName || ''}
                          className="w-10 h-10 rounded-full border border-blue-400"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                          {user.displayName?.[0] || 'U'}
                        </div>
                      )}
                      <div>
                        <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                          {user.displayName || user.email}
                        </div>
                        <div className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          {lang === 'vi' ? 'Đã kết nối Firestore Cloud' : 'Connected to Firestore Cloud'}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500">
                        <CloudOff className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                          {lang === 'vi' ? 'Chế độ Cục bộ (Offline)' : 'Offline Local Mode'}
                        </div>
                        <div className="text-xs text-gray-400">
                          {lang === 'vi' ? 'Đăng nhập Google để lưu trữ đám mây' : 'Sign in to sync with cloud'}
                        </div>
                      </div>
                    </div>
                  )}

                  {user ? (
                    <button
                      onClick={onGoogleSignOut}
                      className="flex items-center gap-1 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 px-3 py-1.5 rounded-lg transition-colors border border-red-200 dark:border-red-900/40 cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>{lang === 'vi' ? 'Đăng xuất' : 'Sign out'}</span>
                    </button>
                  ) : (
                    <button
                      onClick={onGoogleSignIn}
                      className="flex items-center gap-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-3.5 py-2 rounded-xl transition-colors shadow-xs cursor-pointer"
                    >
                      <LogIn className="w-4 h-4" />
                      <span>{lang === 'vi' ? 'Đăng nhập Google' : 'Google Sign In'}</span>
                    </button>
                  )}
                </div>

                {user && (
                  <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-xs">
                    <span className="text-gray-500">
                      {lang === 'vi' ? 'Lần đồng bộ gần nhất:' : 'Last sync:'}{' '}
                      <strong className="text-gray-700 dark:text-gray-300 font-mono">
                        {lastSyncedTime || (lang === 'vi' ? 'Vừa xong' : 'Just now')}
                      </strong>
                    </span>

                    <button
                      onClick={handleSyncAllFirestore}
                      disabled={isUploading}
                      className="flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50 cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isUploading ? 'animate-spin' : ''}`} />
                      <span>{lang === 'vi' ? 'Lưu ngay lên Cloud' : 'Push to Cloud now'}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Direct OAuth Token Input for 2-Way Sync */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  {lang === 'vi' ? 'Google OAuth Access Token (Tùy chọn):' : 'Google OAuth Access Token (Optional):'}
                </label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    placeholder="ya29.a0AfH6SM..."
                    value={oauthToken}
                    onChange={(e) => setOauthToken(e.target.value)}
                    className="flex-1 text-xs px-3.5 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 font-mono"
                  />
                  <button
                    onClick={handleSyncWithToken}
                    disabled={isSyncingUrl || !oauthToken.trim()}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0"
                  >
                    {lang === 'vi' ? 'Đồng bộ 2 chiều' : 'Sync 2-Way'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Success Notification Alert */}
          {successMsg && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-200 rounded-xl text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-medium">{successMsg}</span>
            </div>
          )}

          {/* Error Notification Alert */}
          {errorMsg && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-red-800 dark:text-red-200 rounded-xl text-xs">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/40 flex items-center justify-between text-xs text-gray-500">
          <span>
            {events.length} {lang === 'vi' ? 'sự kiện trong lịch hiện tại' : 'events in active calendar'}
          </span>
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
