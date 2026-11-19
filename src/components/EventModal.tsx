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
  ChevronDown,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link2,
  RemoveFormatting,
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
  initialEndTime?: string;
  initialTitle?: string;
  initialAllDay?: boolean;
  initialColor?: string;
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
  initialEndTime,
  initialTitle,
  initialAllDay,
  initialColor,
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
  const [endTime, setEndTime] = useState(initialEndTime || '10:00');
  const [allDay, setAllDay] = useState(initialAllDay || false);
  const [recurrence, setRecurrence] = useState<RecurrenceType>('none');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [calendarId, setCalendarId] = useState('personal');
  const [color, setColor] = useState(initialColor || '#039BE5');
  const [meetUrl, setMeetUrl] = useState<string | undefined>(undefined);
  const [guests, setGuests] = useState<EventGuest[]>([]);
  const [guestInput, setGuestInput] = useState('');
  const [reminderMinutes, setReminderMinutes] = useState<number>(30);
  const [showOtherActions, setShowOtherActions] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'find_time'>('details');

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
      setReminderMinutes(eventToEdit.reminders?.[0] ?? 30);
    } else {
      const today = initialDate || new Date().toISOString().split('T')[0];
      setTitle(initialTitle || '');
      setType(initialType);
      setStartDate(today);
      setStartTime(initialTime || '09:00');
      setEndDate(today);
      setEndTime(initialEndTime || '10:00');
      setAllDay(initialAllDay || false);
      setRecurrence('none');
      setLocation('');
      setDescription('');
      setCalendarId('personal');
      setColor(initialColor || '#039BE5');
      setMeetUrl(undefined);
      setGuests([]);
      setGuestInput('');
      setReminderMinutes(30);
    }
    setShowOtherActions(false);
  }, [eventToEdit, initialDate, initialTime, initialEndTime, initialTitle, initialAllDay, initialColor, initialType, isOpen]);

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

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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
      updatedAt: Date.now(),
    };

    onSave(finalEvent);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-[#1e1e1e] text-gray-100 rounded-2xl shadow-2xl border border-gray-700/80 w-full max-w-4xl max-h-[94vh] flex flex-col overflow-hidden">
        {/* Google Calendar Top App Bar */}
        <div className="px-5 py-3 border-b border-gray-700/60 flex items-center justify-between bg-[#1e1e1e] shrink-0">
          <div className="flex items-center gap-4 flex-1 mr-4">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
              title={lang === 'vi' ? 'Đóng' : 'Close'}
            >
              <X className="w-5 h-5" />
            </button>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={lang === 'vi' ? 'Thêm tiêu đề' : 'Add title'}
              autoFocus
              className="w-full text-lg sm:text-xl font-medium text-white placeholder-gray-400 bg-transparent border-b border-transparent focus:border-blue-500 pb-0.5 focus:outline-hidden transition-colors"
            />
          </div>

          <div className="flex items-center gap-3">
            {/* Nút Lưu Google Blue Pill */}
            <button
              type="button"
              onClick={() => handleSubmit()}
              className="px-6 py-1.5 bg-[#8ab4f8] hover:bg-[#aecbfa] text-gray-900 rounded-full font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              {lang === 'vi' ? 'Lưu' : 'Save'}
            </button>

            {/* Menu Thao tác khác */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowOtherActions((v) => !v)}
                className="px-3 py-1.5 rounded-lg hover:bg-white/10 text-xs font-medium text-gray-300 flex items-center gap-1 cursor-pointer"
              >
                <span>{lang === 'vi' ? 'Thao tác khác' : 'More actions'}</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {showOtherActions && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowOtherActions(false)} />
                  <div className="absolute right-0 mt-1 w-44 bg-[#28292a] border border-gray-700 rounded-xl shadow-xl py-1 z-40 text-xs">
                    {eventToEdit && onDelete && (
                      <button
                        type="button"
                        onClick={() => {
                          onDelete(eventToEdit.id);
                          onClose();
                        }}
                        className="w-full px-4 py-2 text-left text-red-400 hover:bg-white/10 flex items-center gap-2 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{lang === 'vi' ? 'Xóa sự kiện' : 'Delete'}</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        const copy = { ...eventToEdit, id: `ev-${Date.now()}`, title: `${title} (Bản sao)` };
                        onSave(copy as CalendarEvent);
                        onClose();
                      }}
                      className="w-full px-4 py-2 text-left text-gray-200 hover:bg-white/10 flex items-center gap-2 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{lang === 'vi' ? 'Tạo bản sao' : 'Duplicate'}</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Date & Time Ribbon Row - Exactly matching Google Calendar */}
        <div className="px-6 py-3.5 border-b border-gray-700/60 bg-[#1e1e1e] flex flex-wrap items-center gap-x-4 gap-y-2 text-xs shrink-0">
          {/* Start Date & Time */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1.5 rounded-md bg-[#2d2e30] border border-gray-700 text-white text-xs focus:outline-blue-500 font-medium"
            />
            {!allDay && (
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="px-2.5 py-1.5 rounded-md bg-[#2d2e30] border border-gray-700 text-white text-xs font-mono focus:outline-blue-500"
              />
            )}
          </div>

          <span className="text-gray-400 font-medium">{lang === 'vi' ? 'tới' : 'to'}</span>

          {/* End Date & Time */}
          <div className="flex items-center gap-2">
            {!allDay && (
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="px-2.5 py-1.5 rounded-md bg-[#2d2e30] border border-gray-700 text-white text-xs font-mono focus:outline-blue-500"
              />
            )}
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1.5 rounded-md bg-[#2d2e30] border border-gray-700 text-white text-xs focus:outline-blue-500 font-medium"
            />
          </div>

          <span className="text-gray-400 text-[11px] hidden md:inline">
            (GMT+07:00) Giờ Đông Dương - TP Hồ Chí Minh
          </span>

          {/* All-Day checkbox & Recurrence Dropdown */}
          <div className="flex items-center gap-3 ml-auto">
            <label className="flex items-center gap-1.5 cursor-pointer text-gray-300">
              <input
                type="checkbox"
                checked={allDay}
                onChange={(e) => setAllDay(e.target.checked)}
                className="rounded text-blue-500 focus:ring-0"
              />
              <span>{lang === 'vi' ? 'Cả ngày' : 'All day'}</span>
            </label>

            {/* Recurrence Dropdown */}
            <select
              value={recurrence}
              onChange={(e) => setRecurrence(e.target.value as RecurrenceType)}
              className="px-3 py-1.5 rounded-md bg-[#2d2e30] border border-gray-700 text-white text-xs font-medium focus:outline-blue-500 cursor-pointer"
            >
              <option value="none">{lang === 'vi' ? 'Không lặp lại' : 'Does not repeat'}</option>
              <option value="daily">{lang === 'vi' ? 'Hàng ngày' : 'Daily'}</option>
              <option value="weekly">{lang === 'vi' ? 'Mọi ngày trong tuần (từ thứ Hai tới thứ Sáu)' : 'Every weekday (Mon to Fri)'}</option>
              <option value="monthly">{lang === 'vi' ? 'Hàng tháng' : 'Monthly'}</option>
              <option value="yearly">{lang === 'vi' ? 'Hàng năm' : 'Yearly'}</option>
            </select>
          </div>
        </div>

        {/* Modal Main Body: 2 Columns (Details left, Guests right) */}
        <div className="flex-1 overflow-y-auto flex flex-col md:flex-row">
          {/* Left Column: Event Details Form */}
          <div className="flex-1 p-6 space-y-5 border-r border-gray-700/60">
            {/* Tabs: Chi tiết sự kiện / Tìm thời gian */}
            <div className="flex border-b border-gray-700/60 gap-6 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('details')}
                className={`pb-2.5 border-b-2 cursor-pointer transition-colors ${
                  activeTab === 'details'
                    ? 'border-blue-400 text-blue-400'
                    : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
              >
                {lang === 'vi' ? 'Chi tiết sự kiện' : 'Event Details'}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('find_time')}
                className={`pb-2.5 border-b-2 cursor-pointer transition-colors ${
                  activeTab === 'find_time'
                    ? 'border-blue-400 text-blue-400'
                    : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
              >
                {lang === 'vi' ? 'Tìm thời gian' : 'Find a time'}
              </button>
            </div>

            {/* Google Meet Button */}
            <div className="flex items-center gap-3">
              <Video className="w-5 h-5 text-gray-400 shrink-0" />
              {meetUrl ? (
                <div className="flex-1 flex items-center justify-between p-2.5 rounded-xl bg-blue-950/40 border border-blue-800 text-xs text-blue-300">
                  <span className="font-mono truncate">{meetUrl}</span>
                  <button
                    type="button"
                    onClick={handleCopyMeet}
                    className="p-1 hover:bg-blue-900 rounded text-blue-200 cursor-pointer ml-2"
                    title={lang === 'vi' ? 'Sao chép link' : 'Copy link'}
                  >
                    {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleAddMeet}
                  className="px-4 py-2 bg-[#2d2e30] hover:bg-[#383a3c] text-white border border-gray-700 rounded-xl text-xs font-medium flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <Video className="w-4 h-4 text-blue-400" />
                  <span>{lang === 'vi' ? 'Thêm hội nghị truyền hình trên Google Meet' : 'Add Google Meet video conferencing'}</span>
                </button>
              )}
            </div>

            {/* Location Input */}
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-gray-400 shrink-0" />
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder={lang === 'vi' ? 'Thêm vị trí' : 'Add location'}
                className="flex-1 bg-[#2d2e30] border border-gray-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-400 focus:outline-blue-500"
              />
            </div>

            {/* Notification / Reminder */}
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-gray-400 shrink-0" />
              <div className="flex items-center gap-2 text-xs">
                <span className="text-gray-300">{lang === 'vi' ? 'Thông báo' : 'Notification'}</span>
                <input
                  type="number"
                  min="0"
                  max="1440"
                  value={reminderMinutes}
                  onChange={(e) => setReminderMinutes(parseInt(e.target.value, 10) || 10)}
                  className="w-16 bg-[#2d2e30] border border-gray-700 rounded-lg px-2 py-1 text-center text-white"
                />
                <span className="text-gray-400">{lang === 'vi' ? 'phút' : 'minutes'}</span>
              </div>
            </div>

            {/* Calendar Category & Color */}
            <div className="flex items-center gap-3">
              <CalIcon className="w-5 h-5 text-gray-400 shrink-0" />
              <div className="flex items-center gap-3 flex-wrap">
                <select
                  value={calendarId}
                  onChange={(e) => setCalendarId(e.target.value)}
                  className="bg-[#2d2e30] border border-gray-700 rounded-xl px-3 py-1.5 text-xs text-white cursor-pointer"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {lang === 'vi' ? c.nameVi : c.name}
                    </option>
                  ))}
                </select>

                {/* Color Dot Picker */}
                <div className="flex items-center gap-1.5">
                  {GOOGLE_COLORS.slice(0, 8).map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setColor(c.hex)}
                      style={{ backgroundColor: c.hex }}
                      className={`w-5 h-5 rounded-full transition-transform hover:scale-115 flex items-center justify-center cursor-pointer ${
                        color === c.hex ? 'ring-2 ring-white scale-110 shadow-xs' : ''
                      }`}
                      title={lang === 'vi' ? c.nameVi : c.name}
                    >
                      {color === c.hex && <Check className="w-3 h-3 text-white stroke-[3]" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Description Area with Google Calendar Style Formatting Toolbar */}
            <div className="space-y-1 pt-1">
              {/* Rich text formatting tools */}
              <div className="flex items-center gap-1 p-1 bg-[#28292a] rounded-t-xl border border-b-0 border-gray-700 text-gray-400">
                <button type="button" className="p-1 hover:text-white rounded hover:bg-white/10" title="Bold"><Bold className="w-3.5 h-3.5" /></button>
                <button type="button" className="p-1 hover:text-white rounded hover:bg-white/10" title="Italic"><Italic className="w-3.5 h-3.5" /></button>
                <button type="button" className="p-1 hover:text-white rounded hover:bg-white/10" title="Underline"><Underline className="w-3.5 h-3.5" /></button>
                <span className="w-px h-3 bg-gray-700 mx-1" />
                <button type="button" className="p-1 hover:text-white rounded hover:bg-white/10" title="Bullet List"><List className="w-3.5 h-3.5" /></button>
                <button type="button" className="p-1 hover:text-white rounded hover:bg-white/10" title="Numbered List"><ListOrdered className="w-3.5 h-3.5" /></button>
                <button type="button" className="p-1 hover:text-white rounded hover:bg-white/10" title="Link"><Link2 className="w-3.5 h-3.5" /></button>
                <button type="button" className="p-1 hover:text-white rounded hover:bg-white/10" title="Clear Formatting"><RemoveFormatting className="w-3.5 h-3.5" /></button>
              </div>

              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={lang === 'vi' ? 'Thêm nội dung mô tả' : 'Add description'}
                rows={4}
                className="w-full bg-[#2d2e30] border border-gray-700 rounded-b-xl p-3 text-xs text-white placeholder-gray-400 focus:outline-blue-500 resize-none"
              />
            </div>
          </div>

          {/* Right Column: Guests Section (Khách) */}
          <div className="w-full md:w-80 p-6 space-y-4 bg-[#1e1e1e]">
            <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider">
              {lang === 'vi' ? 'Khách' : 'Guests'}
            </h3>

            <input
              type="email"
              value={guestInput}
              onChange={(e) => setGuestInput(e.target.value)}
              onKeyDown={handleAddGuest}
              placeholder={lang === 'vi' ? 'Thêm khách' : 'Add guests'}
              className="w-full bg-[#2d2e30] border border-gray-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-400 focus:outline-blue-500"
            />

            {/* Guest List */}
            {guests.length > 0 && (
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {guests.map((g) => (
                  <div
                    key={g.email}
                    className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[#28292a] text-xs"
                  >
                    <span className="truncate text-gray-300">{g.email}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveGuest(g.email)}
                      className="text-gray-400 hover:text-red-400 ml-2"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Guest Permissions */}
            <div className="space-y-2 pt-2 border-t border-gray-700/60">
              <span className="text-[11px] font-semibold text-gray-400 block">
                {lang === 'vi' ? 'Quyền của khách' : 'Guest permissions'}
              </span>
              <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                <input type="checkbox" className="rounded text-blue-500" />
                <span>{lang === 'vi' ? 'Sửa đổi sự kiện' : 'Modify event'}</span>
              </label>
              <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                <input type="checkbox" defaultChecked className="rounded text-blue-500" />
                <span>{lang === 'vi' ? 'Mời những người khác' : 'Invite others'}</span>
              </label>
              <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                <input type="checkbox" defaultChecked className="rounded text-blue-500" />
                <span>{lang === 'vi' ? 'Xem danh sách khách mời' : 'See guest list'}</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
