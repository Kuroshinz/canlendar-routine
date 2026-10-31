import React, { useRef, useState } from 'react';
import { X, Download, Upload, RotateCcw, Volume2, CheckCircle2 } from 'lucide-react';
import { CalendarEvent } from '../types/calendar';
import { exportToIcs, parseIcsContent } from '../utils/calendarUtils';
import {
  buildProductivityBackup,
  parseProductivityBackup,
  ProductivitySnapshotData,
} from '../utils/productivityBackup';
import { playNotificationSound } from '../utils/sound';

interface ExportImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  events: CalendarEvent[];
  onImportEvents: (newEvents: CalendarEvent[]) => void;
  onResetEvents: () => void;
  onExportProductivityBackup?: () => ProductivitySnapshotData;
  onImportProductivityBackup?: (data: ProductivitySnapshotData) => void;
  lang: 'vi' | 'en';
}

export const ExportImportModal: React.FC<ExportImportModalProps> = ({
  isOpen,
  onClose,
  events,
  onImportEvents,
  onResetEvents,
  onExportProductivityBackup,
  onImportProductivityBackup,
  lang,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const productivityInputRef = useRef<HTMLInputElement>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const showNotification = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleExportIcs = () => {
    const icsContent = exportToIcs(events);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `google-calendar-export-${new Date().toISOString().split('T')[0]}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showNotification(lang === 'vi' ? 'Đã tải xuống tệp .ics thành công!' : 'ICS file downloaded successfully!');
  };

  const handleExportProductivity = () => {
    if (!onExportProductivityBackup) return;
    const backup = buildProductivityBackup(onExportProductivityBackup());
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `productivity-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showNotification(
      lang === 'vi' ? 'Đã tải xuống bản sao lưu năng suất!' : 'Productivity backup downloaded!'
    );
  };

  const handleProductivityFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(String(event.target?.result || ''));
        const backup = parseProductivityBackup(parsed);
        if (!backup) {
          alert(
            lang === 'vi'
              ? 'Tệp này không phải bản sao lưu dữ liệu năng suất hợp lệ.'
              : 'This file is not a valid productivity backup.'
          );
          return;
        }
        onImportProductivityBackup?.(backup);
        showNotification(
          lang === 'vi'
            ? `Đã khôi phục ${backup.tasks.length} việc, ${backup.transactions.length} giao dịch, ${backup.healthLogs.length} ngày sức khỏe.`
            : `Restored ${backup.tasks.length} tasks, ${backup.transactions.length} transactions, ${backup.healthLogs.length} health days.`
        );
      } catch {
        alert(lang === 'vi' ? 'Lỗi khi đọc tệp.' : 'Error reading file.');
      }
    };
    reader.readAsText(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) return;

      try {
        if (file.name.endsWith('.json')) {
          const parsed = JSON.parse(content);
          const productivityBackup = parseProductivityBackup(parsed);
          if (productivityBackup) {
            // A productivity backup may also be opened through the generic import
            // button, so route it to the store instead of ignoring it.
            onImportProductivityBackup?.(productivityBackup);
            showNotification(
              lang === 'vi'
                ? `Đã khôi phục ${productivityBackup.tasks.length} việc, ${productivityBackup.transactions.length} giao dịch, ${productivityBackup.healthLogs.length} ngày sức khỏe.`
                : `Restored ${productivityBackup.tasks.length} tasks, ${productivityBackup.transactions.length} transactions, ${productivityBackup.healthLogs.length} health days.`
            );
            return;
          }
          if (Array.isArray(parsed)) {
            onImportEvents(parsed);
            showNotification(lang === 'vi' ? `Đã nhập ${parsed.length} sự kiện từ JSON!` : `Imported ${parsed.length} events from JSON!`);
          }
        } else {
          // Assume .ics
          const parsedPartial = parseIcsContent(content);
          if (parsedPartial.length > 0) {
            const completedEvents: CalendarEvent[] = parsedPartial.map((p, idx) => ({
              id: p.id || `imported-${Date.now()}-${idx}`,
              title: p.title || 'Sự kiện nhập',
              description: p.description,
              location: p.location,
              startDate: p.startDate || new Date().toISOString().split('T')[0],
              startTime: p.startTime || '09:00',
              endDate: p.endDate || p.startDate || new Date().toISOString().split('T')[0],
              endTime: p.endTime || '10:00',
              allDay: p.allDay || false,
              calendarId: 'personal',
              color: '#039BE5',
              meetUrl: p.meetUrl,
              type: 'event',
              createdAt: Date.now(),
            }));
            onImportEvents(completedEvents);
            showNotification(lang === 'vi' ? `Đã nhập ${completedEvents.length} sự kiện từ .ics!` : `Imported ${completedEvents.length} events from .ics!`);
          } else {
            alert(lang === 'vi' ? 'Không thể đọc dữ liệu sự kiện từ tệp này.' : 'Could not parse events from this file.');
          }
        }
      } catch (err) {
        alert(lang === 'vi' ? 'Lỗi khi đọc tệp.' : 'Error reading file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/45 backdrop-blur-2xs">
      <div className="bg-white dark:bg-[#1a1e24] rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
        <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-800 dark:text-gray-100">
            {lang === 'vi' ? 'Dữ liệu & Cài đặt' : 'Data & Settings'}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {successMsg && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Export to .ICS */}
          <div className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/40 flex items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                {lang === 'vi' ? 'Xuất tệp iCalendar (.ics)' : 'Export iCalendar (.ics)'}
              </h4>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                {lang === 'vi'
                  ? 'Đồng bộ với Google Calendar thực, Outlook, Apple Calendar'
                  : 'Compatible with Google Calendar, Outlook, Apple Calendar'}
              </p>
            </div>
            <button
              onClick={handleExportIcs}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium shadow-xs transition-colors cursor-pointer shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{lang === 'vi' ? 'Xuất' : 'Export'}</span>
            </button>
          </div>

          {/* Import .ICS or JSON */}
          <div className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/40 flex items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                {lang === 'vi' ? 'Nhập tệp (.ics hoặc .json)' : 'Import (.ics or .json)'}
              </h4>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                {lang === 'vi' ? 'Thêm lịch từ tệp đã xuất từ trước' : 'Add events from existing backup'}
              </p>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".ics,.json"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-650 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg text-xs font-medium shadow-xs transition-colors cursor-pointer shrink-0"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{lang === 'vi' ? 'Nhập' : 'Import'}</span>
            </button>
          </div>

          {/* Test Sound Reminder Chime */}
          <div className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/40 flex items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                {lang === 'vi' ? 'Kiểm tra chuông báo' : 'Test Reminder Chime'}
              </h4>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                {lang === 'vi' ? 'Âm thanh thông báo khi đến giờ sự kiện' : 'Pleasant audio notification chime'}
              </p>
            </div>
            <button
              onClick={() => playNotificationSound()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium shadow-xs transition-colors cursor-pointer shrink-0"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>{lang === 'vi' ? 'Thử' : 'Test'}</span>
            </button>
          </div>

          {/* Productivity JSON backup */}
          <div className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/40">
            <h4 className="text-xs font-semibold text-gray-800 dark:text-gray-200">
              {lang === 'vi' ? 'Sao lưu dữ liệu năng suất (.json)' : 'Productivity backup (.json)'}
            </h4>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
              {lang === 'vi'
                ? 'Công việc, mục tiêu, phiên tập trung, giao dịch, sức khỏe và ngân sách'
                : 'Tasks, goals, focus sessions, transactions, health and budget'}
            </p>
            <div className="flex items-center gap-2 mt-2.5">
              <button
                onClick={handleExportProductivity}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium shadow-xs transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{lang === 'vi' ? 'Xuất' : 'Export'}</span>
              </button>
              <input
                type="file"
                ref={productivityInputRef}
                onChange={handleProductivityFileChange}
                accept=".json"
                className="hidden"
              />
              <button
                onClick={() => productivityInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-650 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg text-xs font-medium shadow-xs transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{lang === 'vi' ? 'Khôi phục' : 'Restore'}</span>
              </button>
            </div>
          </div>

          {/* Reset to sample events */}
          <div className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/40 flex items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                {lang === 'vi' ? 'Khôi phục dữ liệu mẫu' : 'Reset to Sample Data'}
              </h4>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                {lang === 'vi'
                  ? 'Tải lại sự kiện, lịch và dữ liệu năng suất ban đầu'
                  : 'Reload sample events, calendars and productivity data'}
              </p>
            </div>
            <button
              onClick={() => {
                if (
                  confirm(
                    lang === 'vi'
                      ? 'Nạp lại dữ liệu mẫu? Toàn bộ công việc, mục tiêu, phiên tập trung, giao dịch và nhật ký sức khỏe của bạn sẽ bị thay bằng dữ liệu mẫu.'
                      : 'Reset to sample data? Your tasks, goals, focus sessions, transactions and health logs will be replaced with the samples.'
                  )
                ) {
                  onResetEvents();
                  showNotification(lang === 'vi' ? 'Đã khôi phục dữ liệu mẫu!' : 'Sample data restored!');
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-xs font-medium transition-colors cursor-pointer shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{lang === 'vi' ? 'Đặt lại' : 'Reset'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

