import React, { useState, useEffect } from 'react';
import {
  X,
  Clock,
  MapPin,
  Users,
  Video,
  AlignLeft,
  Calendar as CalIcon,
  Bell,
  Trash2,
  Copy,
  Check,
} from 'lucide-react';
import {
  CalendarEvent,
  CalendarCategory,
  EventType,
  RecurrenceType,
  GOOGLE_COLORS,
  EventGuest,
} from '../types/calendar';
import { generateGoogleMeetUrl } from '../utils/calendarUtils';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventToEdit: CalendarEvent | null;
  initialDate?: string;
  initialTime?: string;
  initialType?: EventType;
  categories: CalendarCategory[];
  onSave: (event: CalendarEvent) => void;
  onDelete?: (eventId: string) => void;
  lang: 'vi' | 'en';
}

export const EventModal: React.FC<EventModalProps> = ({
  isOpen,
  onClose,
  eventToEdit,
  initialDate,
  initialTime,
  initialType = 'event',
  categories,
  onSave,
  onDelete,
  lang,
}) => {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<EventType>(initialType);
  const [startDate, setStartDate] = useState(initialDate || new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState(initialTime || '09:00');
  const [endDate, setEndDate] = useState(initialDate || new Date().toISOString().split('T')[0]);
  const [endTime, setEndTime] = useState('10:00');
  const [allDay, setAllDay] = useState(false);
  const [recurrence, setRecurrence] = useState<RecurrenceType>('none');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [calendarId, setCalendarId] = useState('personal');
  const [color, setColor] = useState('#039BE5');
  const [meetUrl, setMeetUrl] = useState<string | undefined>(undefined);
  const [guests, setGuests] = useState<EventGuest[]>([]);
  const [guestInput, setGuestInput] = useState('');
  const [reminderMinutes, setReminderMinutes] = useState<number>(10);
  const [copiedLink, setCopiedLink] = useState(false);

  // Synchronize state when modal opens
  useEffect(() => {
    if (eventToEdit) {
      setTitle(eventToEdit.title);
      setType(eventToEdit.type || 'event');
      setStartDate(eventToEdit.startDate);
      setStartTime(eventToEdit.startTime || '09:00');
      setEndDate(eventToEdit.endDate || eventToEdit.startDate);
      setEndTime(eventToEdit.endTime || '10:00');
      setAllDay(eventToEdit.allDay || false);
      setRecurrence(eventToEdit.recurrence || 'none');
      setLocation(eventToEdit.location || '');
      setDescription(eventToEdit.description || '');
      setCalendarId(eventToEdit.calendarId || 'personal');
      setColor(eventToEdit.color || '#039BE5');
      setMeetUrl(eventToEdit.meetUrl);
      setGuests(eventToEdit.guests || []);
      setReminderMinutes(eventToEdit.reminders?.[0] ?? 10);
    } else {
      const today = initialDate || new Date().toISOString().split('T')[0];
      setTitle('');
      setType(initialType);
      setStartDate(today);
      setStartTime(initialTime || '09:00');
      setEndDate(today);
      // default end time: 1 hour later
      const startH = parseInt(initialTime?.split(':')[0] || '9', 10);
      const endH = (startH + 1) % 24;
      setEndTime(`${String(endH).padStart(2, '0')}:00`);
      setAllDay(false);
      setRecurrence('none');
      setLocation('');
      setDescription('');
      setCalendarId('personal');
      setColor('#039BE5');
      setMeetUrl(undefined);
      setGuests([]);
      setGuestInput('');
      setReminderMinutes(10);
    }
  }, [eventToEdit, initialDate, initialTime, initialType, isOpen]);

  if (!isOpen) return null;

  const handleAddGuest = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && guestInput.trim()) {
      e.preventDefault();
      const email = guestInput.trim().toLowerCase();
      if (!guests.some((g) => g.email === email)) {
        setGuests([...guests, { email, status: 'pending' }]);
      }
      setGuestInput('');
    }
  };

  const handleRemoveGuest = (email: string) => {
    setGuests(guests.filter((g) => g.email !== email));
  };

  const handleAddMeet = () => {
    if (!meetUrl) {
      setMeetUrl(generateGoogleMeetUrl());
    }
  };

  const handleCopyMeet = () => {
    if (meetUrl) {
      navigator.clipboard.writeText(meetUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalEvent: CalendarEvent = {
      id: eventToEdit ? eventToEdit.id : `ev-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: title.trim() || (lang === 'vi' ? '(Chưa có tiêu đề)' : '(Untitled)'),
      type,
      startDate,
      startTime: allDay ? '00:00' : startTime,
      endDate: endDate < startDate ? startDate : endDate,
      endTime: allDay ? '23:59' : endTime,
      allDay,
      recurrence,
      location: location.trim() || undefined,
      description: description.trim() || undefined,
      calendarId,
      color,
      meetUrl,
      guests: guests.length > 0 ? guests : undefined,
      reminders: [reminderMinutes],
      isCompleted: eventToEdit?.isCompleted ?? false,
      createdAt: eventToEdit?.createdAt ?? Date.now(),
    };

    onSave(finalEvent);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/45 backdrop-blur-xs">
      <div className="bg-white dark:bg-gray-850 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header Bar */}
        <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/70 dark:bg-gray-900/50">
          <div className="flex items-center gap-1.5 p-1 bg-gray-200/60 dark:bg-gray-800 rounded-lg">
            {(['event', 'task', 'reminder'] as EventType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  type === t
                    ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
                }`}
              >
                {t === 'event'
                  ? lang === 'vi' ? 'Sự kiện' : 'Event'
                  : t === 'task'
                  ? lang === 'vi' ? 'Tác vụ' : 'Task'
                  : lang === 'vi' ? 'Nhắc nhở' : 'Reminder'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {eventToEdit && onDelete && (
              <button
                type="button"
                onClick={() => {
                  onDelete(eventToEdit.id);
                  onClose();
                }}
                title={lang === 'vi' ? 'Xóa sự kiện' : 'Delete event'}
                className="p-1.5 rounded-full hover:bg-red-50 dark:hover:bg-red-950/40 text-gray-500 hover:text-red-600 transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-750 text-gray-500 dark:text-gray-400 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Title Input */}
          <div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={lang === 'vi' ? 'Thêm tiêu đề' : 'Add title'}
              autoFocus
              className="w-full text-xl md:text-2xl font-normal text-gray-900 dark:text-gray-100 placeholder-gray-400 border-b border-gray-300 dark:border-gray-700 focus:border-blue-600 pb-2 focus:outline-none bg-transparent transition-colors"
            />
          </div>

          {/* Date & Time Row */}
          <div className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-200">
            <Clock className="w-5 h-5 text-gray-400 mt-1 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-2.5 py-1.5 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-xs text-gray-800 dark:text-gray-100 focus:outline-blue-500"
                />
                {!allDay && (
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="px-2.5 py-1.5 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-xs text-gray-800 dark:text-gray-100 focus:outline-blue-500"
                  />
                )}
                <span className="text-gray-400">–</span>
                {!allDay && (
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="px-2.5 py-1.5 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-xs text-gray-800 dark:text-gray-100 focus:outline-blue-500"
                  />
                )}
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-2.5 py-1.5 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-xs text-gray-800 dark:text-gray-100 focus:outline-blue-500"
                />
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allDay}
                    onChange={(e) => setAllDay(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>{lang === 'vi' ? 'Cả ngày' : 'All day'}</span>
                </label>

                {/* Recurrence Dropdown */}
                <select
                  value={recurrence}
                  onChange={(e) => setRecurrence(e.target.value as RecurrenceType)}
                  className="px-2.5 py-1 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-xs text-gray-700 dark:text-gray-200 focus:outline-blue-500"
                >
                  <option value="none">{lang === 'vi' ? 'Không lặp lại' : 'Does not repeat'}</option>
                  <option value="daily">{lang === 'vi' ? 'Hàng ngày' : 'Daily'}</option>
                  <option value="weekly">{lang === 'vi' ? 'Hàng tuần' : 'Weekly'}</option>
                  <option value="monthly">{lang === 'vi' ? 'Hàng tháng' : 'Monthly'}</option>
                  <option value="yearly">{lang === 'vi' ? 'Hàng năm' : 'Yearly'}</option>
                </select>
              </div>
            </div>
          </div>

          {/* Google Meet Conferencing Section */}
          <div className="flex items-center gap-3 text-sm">
            <Video className="w-5 h-5 text-gray-400 shrink-0" />
            <div className="flex-1">
              {!meetUrl ? (
                <button
                  type="button"
                  onClick={handleAddMeet}
                  className="px-3.5 py-2 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-semibold flex items-center gap-2 border border-blue-200 dark:border-blue-800 transition-colors cursor-pointer"
                >
                  <Video className="w-4 h-4 text-blue-500" />
                  <span>{lang === 'vi' ? 'Thêm hội nghị truyền hình Google Meet' : 'Add Google Meet video conferencing'}</span>
                </button>
              ) : (
                <div className="flex items-center justify-between p-2.5 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="flex items-center gap-2 truncate">
                    <Video className="w-4 h-4 text-blue-600 shrink-0" />
                    <span className="text-xs font-mono font-medium text-blue-700 dark:text-blue-300 truncate">
                      {meetUrl}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <button
                      type="button"
                      onClick={handleCopyMeet}
                      title={lang === 'vi' ? 'Sao chép đường liên kết' : 'Copy link'}
                      className="p-1 hover:bg-blue-200/50 dark:hover:bg-blue-900 rounded text-blue-600 cursor-pointer"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setMeetUrl(undefined)}
                      className="p-1 hover:bg-blue-200/50 dark:hover:bg-blue-900 rounded text-gray-400 hover:text-red-500 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Location Input */}
          <div className="flex items-center gap-3 text-sm">
            <MapPin className="w-5 h-5 text-gray-400 shrink-0" />
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder={lang === 'vi' ? 'Thêm vị trí (phòng họp, địa chỉ...)' : 'Add location or room'}
              className="flex-1 px-3 py-1.5 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-xs text-gray-800 dark:text-gray-100 focus:outline-blue-500"
            />
          </div>

          {/* Guests / Attendees */}
          <div className="flex items-start gap-3 text-sm">
            <Users className="w-5 h-5 text-gray-400 mt-1 shrink-0" />
            <div className="flex-1 space-y-2">
              <input
                type="email"
                value={guestInput}
                onChange={(e) => setGuestInput(e.target.value)}
                onKeyDown={handleAddGuest}
                placeholder={lang === 'vi' ? 'Thêm người tham dự (nhập email rồi nhấn Enter)' : 'Add guests (type email and hit Enter)'}
                className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-xs text-gray-800 dark:text-gray-100 focus:outline-blue-500"
              />

              {guests.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {guests.map((g) => (
                    <span
                      key={g.email}
                      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-xs text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600"
                    >
                      <span>{g.email}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveGuest(g.email)}
                        className="text-gray-400 hover:text-red-500 cursor-pointer"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Calendar Category & Color */}
          <div className="flex items-center gap-3 text-sm">
            <CalIcon className="w-5 h-5 text-gray-400 shrink-0" />
            <div className="flex-1 flex flex-wrap items-center gap-3">
              <select
                value={calendarId}
                onChange={(e) => {
                  setCalendarId(e.target.value);
                  const selectedCat = categories.find((c) => c.id === e.target.value);
                  if (selectedCat) setColor(selectedCat.color);
                }}
                className="px-3 py-1.5 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-xs text-gray-800 dark:text-gray-100 focus:outline-blue-500"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {lang === 'vi' ? c.nameVi : c.name}
                  </option>
                ))}
              </select>

              {/* Color dots picker */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {GOOGLE_COLORS.map((gc) => (
                  <button
                    key={gc.id}
                    type="button"
                    onClick={() => setColor(gc.hex)}
                    title={lang === 'vi' ? gc.nameVi : gc.name}
                    style={{ backgroundColor: gc.hex }}
                    className={`w-5 h-5 rounded-full cursor-pointer transition-transform hover:scale-115 flex items-center justify-center ${
                      color === gc.hex ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''
                    }`}
                  >
                    {color === gc.hex && <Check className="w-3 h-3 text-white stroke-[3]" />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Reminder Notification selector */}
          <div className="flex items-center gap-3 text-sm">
            <Bell className="w-5 h-5 text-gray-400 shrink-0" />
            <select
              value={reminderMinutes}
              onChange={(e) => setReminderMinutes(parseInt(e.target.value, 10))}
              className="px-3 py-1.5 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-xs text-gray-800 dark:text-gray-100 focus:outline-blue-500"
            >
              <option value="5">{lang === 'vi' ? '5 phút trước' : '5 minutes before'}</option>
              <option value="10">{lang === 'vi' ? '10 phút trước' : '10 minutes before'}</option>
              <option value="15">{lang === 'vi' ? '15 phút trước' : '15 minutes before'}</option>
              <option value="30">{lang === 'vi' ? '30 phút trước' : '30 minutes before'}</option>
              <option value="60">{lang === 'vi' ? '1 giờ trước' : '1 hour before'}</option>
              <option value="1440">{lang === 'vi' ? '1 ngày trước' : '1 day before'}</option>
            </select>
          </div>

          {/* Description */}
          <div className="flex items-start gap-3 text-sm">
            <AlignLeft className="w-5 h-5 text-gray-400 mt-1 shrink-0" />
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={lang === 'vi' ? 'Thêm mô tả hoặc tài liệu đính kèm...' : 'Add description or notes...'}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-xs text-gray-800 dark:text-gray-100 focus:outline-blue-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
            >
              {lang === 'vi' ? 'Hủy bỏ' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              {lang === 'vi' ? 'Lưu sự kiện' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
