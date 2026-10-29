import React, { useState, useRef } from 'react';
import { User } from 'firebase/auth';
import { CalendarEvent, CalendarCategory, SyncState } from '../../types/calendar';
import { downloadICalFile, parseICalToEvents } from '../../services/icalService';
import { batchUploadEvents } from '../../services/firestoreSync';
import {
  Cloud,
  CloudCheck,
  CloudOff,
  RefreshCw,
  Download,
  Upload,
  X,
  LogIn,
  LogOut,
  FileCheck,
  AlertCircle,
  Share2,
} from 'lucide-react';

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onGoogleSignIn: () => Promise<void>;
  onGoogleSignOut: () => Promise<void>;
  events: CalendarEvent[];
  categories: CalendarCategory[];
  onImportEvents: (newEvents: CalendarEvent[]) => void;
  syncState: SyncState;
  lastSyncedTime: string | null;
  lang: 'vi' | 'en';
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
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [importCount, setImportCount] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleSyncAll = async () => {
    if (!user) {
      await onGoogleSignIn();
      return;
    }
    try {
      setIsUploading(true);
      setErrorMsg(null);
      await batchUploadEvents(user.uid, events);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Lỗi đồng bộ dữ liệu');
    } finally {
      setIsUploading(false);
    }
  };

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
        setErrorMsg(null);
      } catch (err: any) {
        setErrorMsg(err.message || 'Lỗi đọc tệp .ics');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#1a1e24] w-full max-w-lg rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
                {lang === 'vi' ? 'Đồng Bộ Đám Mây & Xuất/Nhập Lịch' : 'Cloud Sync & iCal Export/Import'}
              </h2>
              <p className="text-xs text-gray-400">
                Firebase Firestore + Chuẩn RFC 5545 iCalendar
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col gap-6 max-h-[75vh] overflow-y-auto">
          {/* User Account & Realtime Sync Card */}
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
                      {lang === 'vi' ? 'Đã kết nối Firestore Realtime' : 'Connected to Firestore Realtime'}
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
                      {lang === 'vi' ? 'Đăng nhập Google để lưu trữ đám mây' : 'Sign in with Google to sync in cloud'}
                    </div>
                  </div>
                </div>
              )}

              {user ? (
                <button
                  onClick={onGoogleSignOut}
                  className="flex items-center gap-1 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 px-3 py-1.5 rounded-lg transition-colors border border-red-200 dark:border-red-900/40"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{lang === 'vi' ? 'Đăng xuất' : 'Sign out'}</span>
                </button>
              ) : (
                <button
                  onClick={onGoogleSignIn}
                  className="flex items-center gap-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-3.5 py-2 rounded-xl transition-colors shadow-xs"
                >
                  <LogIn className="w-4 h-4" />
                  <span>{lang === 'vi' ? 'Đăng nhập Google' : 'Google Sign In'}</span>
                </button>
              )}
            </div>

            {user && (
              <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-xs">
                <span className="text-gray-500">
                  {lang === 'vi' ? 'Đồng bộ lần cuối:' : 'Last sync:'}{' '}
                  <strong className="text-gray-700 dark:text-gray-300 font-mono">
                    {lastSyncedTime || (lang === 'vi' ? 'Vừa xong' : 'Just now')}
                  </strong>
                </span>

                <button
                  onClick={handleSyncAll}
                  disabled={isUploading}
                  className="flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isUploading ? 'animate-spin' : ''}`} />
                  <span>{lang === 'vi' ? 'Đẩy dữ liệu lên mây ngay' : 'Push to Cloud now'}</span>
                </button>
              </div>
            )}
          </div>

          {/* iCalendar (.ics) Section */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              {lang === 'vi' ? 'Xuất & Nhập Tệp iCalendar (.ics)' : 'iCalendar (.ics) Export & Import'}
            </h3>

            <div className="grid grid-cols-2 gap-3">
              {/* Export Full Calendar */}
              <button
                onClick={() => downloadICalFile(events, 'lich-cua-toi.ics')}
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-500 hover:bg-blue-50/20 dark:hover:bg-blue-950/20 transition-all text-center group"
              >
                <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-800 dark:text-gray-200">
                    {lang === 'vi' ? 'Xuất Tệp .ICS' : 'Export .ICS'}
                  </div>
                  <div className="text-[11px] text-gray-400 mt-0.5">
                    {events.length} {lang === 'vi' ? 'sự kiện' : 'events'}
                  </div>
                </div>
              </button>

              {/* Import .ics */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 hover:border-purple-500 hover:bg-purple-50/20 dark:hover:bg-purple-950/20 transition-all text-center group"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".ics,text/calendar"
                  className="hidden"
                />
                <div className="w-10 h-10 rounded-full bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-800 dark:text-gray-200">
                    {lang === 'vi' ? 'Nhập Tệp .ICS' : 'Import .ICS'}
                  </div>
                  <div className="text-[11px] text-gray-400 mt-0.5">
                    {lang === 'vi' ? 'Từ Apple/Google/Outlook' : 'From Apple/Google/Outlook'}
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Feedback Messages */}
          {importCount !== null && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-200 rounded-xl text-xs">
              <FileCheck className="w-4 h-4 text-emerald-600" />
              <span>
                {lang === 'vi'
                  ? `Đã nhập thành công ${importCount} sự kiện vào lịch!`
                  : `Successfully imported ${importCount} events!`}
              </span>
            </div>
          )}

          {errorMsg && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-200 rounded-xl text-xs">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

