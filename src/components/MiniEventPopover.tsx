import React, { useState, useEffect, useRef } from 'react';
import { CalendarEvent, CalendarCategory, EventType, GOOGLE_COLORS } from '../types/calendar';
import { X, Clock, Video, Check, Plus, Minus, Calendar as CalIcon } from 'lucide-react';

interface MiniEventPopoverProps {
  isOpen: boolean;
  position: { top: number; left: number } | null;
  dateStr: string;
  startTime: string;
  endTime: string;
  categories: CalendarCategory[];
  onSave: (event: CalendarEvent) => void;
  onOpenFullModal: (
    dateStr: string,
    startTime: string,
    endTime: string,
    title?: string,
    allDay?: boolean,
    color?: string
  ) => void;
  onClose: () => void;
  lang: 'vi' | 'en';
}

function adjustTimeMinutes(timeStr: string, deltaMins: number): string {
  if (!timeStr) return '09:00';
  const [h, m] = timeStr.split(':').map(Number);
  let total = (h || 0) * 60 + (m || 0) + deltaMins;
  if (total < 0) total = 0;
  if (total > 23 * 60 + 59) total = 23 * 60 + 59;
  const newH = Math.floor(total / 60);
  const newM = total % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}

export const MiniEventPopover: React.FC<MiniEventPopoverProps> = ({
  isOpen,
  position,
  dateStr,
  startTime,
  endTime,
  categories,
  onSave,
  onOpenFullModal,
  onClose,
  lang,
}) => {
  const [title, setTitle] = useState('');
  const [eventType, setEventType] = useState<EventType>('event');
  const [selectedColor, setSelectedColor] = useState('#039BE5');
  const [selectedCalendarId, setSelectedCalendarId] = useState('personal');
  const [hasMeet, setHasMeet] = useState(false);

  // Directly editable date & times to easily fix when dragging is slightly skewed
  const [curDate, setCurDate] = useState(dateStr);
  const [curStartTime, setCurStartTime] = useState(startTime || '09:00');
  const [curEndTime, setCurEndTime] = useState(endTime || '10:00');
  const [isAllDay, setIsAllDay] = useState(false);
  const [isEditingTimeDirectly, setIsEditingTimeDirectly] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setEventType('event');
      setHasMeet(false);
      setSelectedColor('#039BE5');
      setSelectedCalendarId('personal');
      setCurDate(dateStr);
      setCurStartTime(startTime || '09:00');
      setCurEndTime(endTime || '10:00');
      setIsAllDay(false);
      setIsEditingTimeDirectly(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen, dateStr, startTime, endTime]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('mousedown', handleOutsideClick);
      return () => window.removeEventListener('mousedown', handleOutsideClick);
    }
  }, [isOpen, onClose]);

  if (!isOpen || !position) return null;

  const dateObj = new Date(curDate + 'T00:00:00');
  const weekdayVi = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'][dateObj.getDay()];
  const weekdayEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dateObj.getDay()];
  const dateLabel = lang === 'vi'
    ? `${weekdayVi}, ${dateObj.getDate()} thg ${dateObj.getMonth() + 1}`
    : `${weekdayEn}, ${dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const finalTitle = title.trim() || (lang === 'vi' ? '(Không có tiêu đề)' : '(No title)');

    const newEv: CalendarEvent = {
      id: `ev-${Date.now()}`,
      title: finalTitle,
      startDate: curDate,
      endDate: curDate,
      startTime: isAllDay ? '00:00' : curStartTime,
      endTime: isAllDay ? '23:59' : curEndTime,
      allDay: isAllDay,
      calendarId: selectedCalendarId,
      color: selectedColor,
      type: eventType,
      meetUrl: hasMeet ? `https://meet.google.com/${Math.random().toString(36).substring(2, 5)}-${Math.random().toString(36).substring(2, 6)}-${Math.random().toString(36).substring(2, 5)}` : undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    onSave(newEv);
    onClose();
  };

  const popoverWidth = 380;
  const popoverHeight = 420;
  let adjustedLeft = position.left;
  let adjustedTop = position.top;

  if (adjustedLeft + popoverWidth > window.innerWidth - 16) {
    adjustedLeft = window.innerWidth - popoverWidth - 16;
  }
  if (adjustedLeft < 16) adjustedLeft = 16;

  if (adjustedTop + popoverHeight > window.innerHeight - 16) {
    adjustedTop = window.innerHeight - popoverHeight - 16;
  }
  if (adjustedTop < 16) adjustedTop = 16;

  return (
    <div
      ref={popoverRef}
      style={{ top: `${adjustedTop}px`, left: `${adjustedLeft}px` }}
      className="fixed z-50 w-[380px] bg-white dark:bg-[#1a1e24] rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700/80 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
    >
      {/* Top Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-0.5 rounded-lg text-xs font-medium">
          <button
            type="button"
            onClick={() => setEventType('event')}
            className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
              eventType === 'event'
                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-xs font-semibold'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
            }`}
          >
            {lang === 'vi' ? 'Sự kiện' : 'Event'}
          </button>
          <button
            type="button"
            onClick={() => setEventType('task')}
            className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
              eventType === 'task'
                ? 'bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-xs font-semibold'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
            }`}
          >
            {lang === 'vi' ? 'Tác vụ' : 'Task'}
          </button>
        </div>

        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-3.5">
        <div>
          <input
            ref={inputRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={lang === 'vi' ? 'Thêm tiêu đề...' : 'Add title...'}
            className="w-full text-base font-semibold text-gray-900 dark:text-gray-100 placeholder-gray-400 bg-transparent border-b-2 border-transparent focus:border-blue-500 focus:outline-hidden py-1 transition-colors"
          />
        </div>

        {/* Date & Time with Interactive Direct Editing and +/- 15m Adjustment */}
        <div className="bg-gray-50 dark:bg-[#121518] p-3 rounded-xl border border-gray-100 dark:border-gray-800 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 font-medium text-gray-700 dark:text-gray-300">
              <Clock className="w-4 h-4 text-blue-500 shrink-0" />
              <span>{dateLabel}</span>
            </div>
            <button
              type="button"
              onClick={() => setIsEditingTimeDirectly((v) => !v)}
              className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer"
            >
              {isEditingTimeDirectly
                ? (lang === 'vi' ? 'Xong' : 'Done')
                : (lang === 'vi' ? 'Chỉnh giờ' : 'Edit time')}
            </button>
          </div>

          {/* Time and All-Day Controls */}
          {isEditingTimeDirectly ? (
            <div className="space-y-2 pt-1 border-t border-gray-200/60 dark:border-gray-800 animate-in fade-in duration-100">
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={curDate}
                  onChange={(e) => setCurDate(e.target.value)}
                  className="text-xs px-2 py-1 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                />
                <label className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300 ml-auto cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isAllDay}
                    onChange={(e) => setIsAllDay(e.target.checked)}
                    className="rounded text-blue-600"
                  />
                  <span>{lang === 'vi' ? 'Cả ngày' : 'All day'}</span>
                </label>
              </div>

              {!isAllDay && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-gray-400 font-medium">Bắt đầu:</span>
                    <input
                      type="time"
                      value={curStartTime}
                      onChange={(e) => setCurStartTime(e.target.value)}
                      className="text-xs px-2 py-1 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 font-mono"
                    />
                  </div>
                  <span className="text-gray-400">–</span>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-gray-400 font-medium">Kết thúc:</span>
                    <input
                      type="time"
                      value={curEndTime}
                      onChange={(e) => setCurEndTime(e.target.value)}
                      className="text-xs px-2 py-1 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 font-mono"
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                {isAllDay ? (
                  <span>{lang === 'vi' ? 'Cả ngày' : 'All day'}</span>
                ) : (
                  <span>{curStartTime} – {curEndTime}</span>
                )}
              </div>

              {/* Nút chỉnh nhanh +/- 15p giúp khắc phục khi kéo chuột lệch */}
              {!isAllDay && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setCurStartTime((t) => adjustTimeMinutes(t, -15));
                      setCurEndTime((t) => adjustTimeMinutes(t, -15));
                    }}
                    title={lang === 'vi' ? 'Lùi lại 15 phút' : '-15 min'}
                    className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-[10px] font-semibold text-gray-700 dark:text-gray-300 cursor-pointer"
                  >
                    -15p
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCurStartTime((t) => adjustTimeMinutes(t, 15));
                      setCurEndTime((t) => adjustTimeMinutes(t, 15));
                    }}
                    title={lang === 'vi' ? 'Tiến thêm 15 phút' : '+15 min'}
                    className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-[10px] font-semibold text-gray-700 dark:text-gray-300 cursor-pointer"
                  >
                    +15p
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quick Google Meet */}
        <button
          type="button"
          onClick={() => setHasMeet(!hasMeet)}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
            hasMeet
              ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 text-blue-600 dark:text-blue-400 shadow-xs'
              : 'border-gray-200 dark:border-gray-700/80 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
          }`}
        >
          <Video className="w-4 h-4 text-blue-500 shrink-0" />
          <span>
            {hasMeet
              ? (lang === 'vi' ? 'Đã thêm Google Meet' : 'Google Meet added')
              : (lang === 'vi' ? 'Thêm hội nghị truyền hình Google Meet' : 'Add Google Meet video conferencing')}
          </span>
          {hasMeet && <Check className="w-3.5 h-3.5 ml-auto text-blue-600 dark:text-blue-400" />}
        </button>

        {/* Color Palette */}
        <div className="flex items-center justify-between gap-1 pt-0.5">
          <span className="text-[11px] font-medium text-gray-400">
            {lang === 'vi' ? 'Màu sắc' : 'Color'}:
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {GOOGLE_COLORS.slice(0, 8).map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedColor(c.hex)}
                style={{ backgroundColor: c.hex }}
                className={`w-5 h-5 rounded-full transition-transform hover:scale-115 flex items-center justify-center cursor-pointer ${
                  selectedColor === c.hex ? 'ring-2 ring-offset-2 ring-blue-500 scale-110 shadow-xs' : ''
                }`}
                title={lang === 'vi' ? c.nameVi : c.name}
              >
                {selectedColor === c.hex && <Check className="w-3 h-3 text-white stroke-[3]" />}
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800 mt-1">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenFullModal(curDate, curStartTime, curEndTime, title, isAllDay, selectedColor);
            }}
            className="text-xs font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:underline px-1 py-1 cursor-pointer"
          >
            {lang === 'vi' ? 'Tùy chọn khác' : 'More options'}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
            >
              {lang === 'vi' ? 'Hủy' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-xs hover:shadow-md cursor-pointer"
            >
              {lang === 'vi' ? 'Lưu' : 'Save'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
