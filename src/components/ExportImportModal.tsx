import React, { useRef, useState } from 'react';
import { X, Download, Upload, RotateCcw, Volume2, CheckCircle2 } from 'lucide-react';
import { CalendarEvent } from '../types/calendar';
import { exportToIcs, parseIcsContent } from '../utils/calendarUtils';
import { playNotificationSound } from '../utils/sound';

interface ExportImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  events: CalendarEvent[];
  onImportEvents: (newEvents: CalendarEvent[]) => void;
  onResetEvents: () => void;
  lang: 'vi' | 'en';
}

export const ExportImportModal: React.FC<ExportImportModalProps> = ({
  isOpen,
  onClose,
  events,
  onImportEvents,
  onResetEvents,
  lang,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
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
    showNotification(lang === 'vi' ? 'ÄÃ£ táº£i xuá»‘ng tá»‡p .ics thÃ nh cÃ´ng!' : 'ICS file downloaded successfully!');
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
          if (Array.isArray(parsed)) {
            onImportEvents(parsed);
            showNotification(lang === 'vi' ? `ÄÃ£ nháº­p ${parsed.length} sá»± kiá»‡n tá»« JSON!` : `Imported ${parsed.length} events from JSON!`);
          }
        } else {
          // Assume .ics
          const parsedPartial = parseIcsContent(content);
          if (parsedPartial.length > 0) {
            const completedEvents: CalendarEvent[] = parsedPartial.map((p, idx) => ({
              id: p.id || `imported-${Date.now()}-${idx}`,
              title: p.title || 'Sá»± kiá»‡n nháº­p',
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
            showNotification(lang === 'vi' ? `ÄÃ£ nháº­p ${completedEvents.length} sá»± kiá»‡n tá»« .ics!` : `Imported ${completedEvents.length} events from .ics!`);
          } else {
            alert(lang === 'vi' ? 'KhÃ´ng thá»ƒ Ä‘á»c dá»¯ liá»‡u sá»± kiá»‡n tá»« tá»‡p nÃ y.' : 'Could not parse events from this file.');
          }
        }
      } catch (err) {
        alert(lang === 'vi' ? 'Lá»—i khi Ä‘á»c tá»‡p.' : 'Error reading file.');
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
            {lang === 'vi' ? 'Dá»¯ liá»‡u & CÃ i Ä‘áº·t' : 'Data & Settings'}
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
                {lang === 'vi' ? 'Xuáº¥t tá»‡p iCalendar (.ics)' : 'Export iCalendar (.ics)'}
              </h4>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                {lang === 'vi'
                  ? 'Äá»“ng bá»™ vá»›i Google Calendar thá»±c, Outlook, Apple Calendar'
                  : 'Compatible with Google Calendar, Outlook, Apple Calendar'}
              </p>
            </div>
            <button
              onClick={handleExportIcs}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium shadow-xs transition-colors cursor-pointer shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{lang === 'vi' ? 'Xuáº¥t' : 'Export'}</span>
            </button>
          </div>

          {/* Import .ICS or JSON */}
          <div className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/40 flex items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                {lang === 'vi' ? 'Nháº­p tá»‡p (.ics hoáº·c .json)' : 'Import (.ics or .json)'}
              </h4>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                {lang === 'vi' ? 'ThÃªm lá»‹ch tá»« tá»‡p Ä‘Ã£ xuáº¥t tá»« trÆ°á»›c' : 'Add events from existing backup'}
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
              <span>{lang === 'vi' ? 'Nháº­p' : 'Import'}</span>
            </button>
          </div>

          {/* Test Sound Reminder Chime */}
          <div className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/40 flex items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                {lang === 'vi' ? 'Kiá»ƒm tra chuÃ´ng bÃ¡o' : 'Test Reminder Chime'}
              </h4>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                {lang === 'vi' ? 'Ã‚m thanh thÃ´ng bÃ¡o khi Ä‘áº¿n giá» sá»± kiá»‡n' : 'Pleasant audio notification chime'}
              </p>
            </div>
            <button
              onClick={() => playNotificationSound()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium shadow-xs transition-colors cursor-pointer shrink-0"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>{lang === 'vi' ? 'Thá»­' : 'Test'}</span>
            </button>
          </div>

          {/* Reset to sample events */}
          <div className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/40 flex items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                {lang === 'vi' ? 'KhÃ´i phá»¥c dá»¯ liá»‡u máº«u' : 'Reset to Sample Events'}
              </h4>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                {lang === 'vi' ? 'Táº£i láº¡i danh sÃ¡ch sá»± kiá»‡n ban Ä‘áº§u' : 'Reload original sample calendar events'}
              </p>
            </div>
            <button
              onClick={() => {
                if (confirm(lang === 'vi' ? 'Báº¡n cÃ³ cháº¯c cháº¯n muá»‘n náº¡p láº¡i dá»¯ liá»‡u máº«u?' : 'Reset to sample events?')) {
                  onResetEvents();
                  showNotification(lang === 'vi' ? 'ÄÃ£ khÃ´i phá»¥c dá»¯ liá»‡u máº«u!' : 'Sample events restored!');
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-xs font-medium transition-colors cursor-pointer shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{lang === 'vi' ? 'Äáº·t láº¡i' : 'Reset'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

