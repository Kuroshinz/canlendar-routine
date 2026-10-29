import React, { useState } from 'react';
import {
  X,
  Edit2,
  Trash2,
  Clock,
  MapPin,
  Users,
  Video,
  AlignLeft,
  Copy,
  Check,
  CheckCircle2,
  Share2,
} from 'lucide-react';
import { CalendarEvent, CalendarCategory } from '../types/calendar';

interface EventDetailCardProps {
  event: CalendarEvent;
  categories: CalendarCategory[];
  onClose: () => void;
  onEdit: (event: CalendarEvent) => void;
  onDelete: (eventId: string) => void;
  onToggleComplete?: (eventId: string) => void;
  onJoinMeet?: (event: CalendarEvent) => void;
  lang: 'vi' | 'en';
}

export const EventDetailCard: React.FC<EventDetailCardProps> = ({
  event,
  categories,
  onClose,
  onEdit,
  onDelete,
  onToggleComplete,
  onJoinMeet,
  lang,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);

  const category = categories.find((c) => c.id === event.calendarId);

  const handleCopyMeet = () => {
    if (event.meetUrl) {
      navigator.clipboard.writeText(event.meetUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const getRecurrenceLabel = () => {
    if (!event.recurrence || event.recurrence === 'none') return null;
    const mapVi: Record<string, string> = {
      daily: 'Hàng ngày',
      weekly: 'Hàng tuần',
      monthly: 'Hàng tháng',
      yearly: 'Hàng năm',
    };
    const mapEn: Record<string, string> = {
      daily: 'Daily',
      weekly: 'Weekly',
      monthly: 'Monthly',
      yearly: 'Yearly',
    };
    return lang === 'vi' ? mapVi[event.recurrence] : mapEn[event.recurrence];
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/40 backdrop-blur-2xs">
      <div className="bg-white dark:bg-[#1a1e24] rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Top colored accent line */}
        <div className="h-2" style={{ backgroundColor: event.color }} />

        {/* Top Action bar */}
        <div className="px-4 py-2.5 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <span
              style={{ backgroundColor: `${event.color}20`, color: event.color }}
              className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
            >
              {category ? (lang === 'vi' ? category.nameVi : category.name) : 'Lịch'}
            </span>
            {event.type === 'task' && (
              <button
                onClick={() => onToggleComplete?.(event.id)}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-emerald-600 cursor-pointer"
              >
                <CheckCircle2
                  className={`w-4 h-4 ${
                    event.isCompleted ? 'text-emerald-600 fill-emerald-100' : ''
                  }`}
                />
                <span>{event.isCompleted ? (lang === 'vi' ? 'Đã xong' : 'Completed') : (lang === 'vi' ? 'Đánh dấu hoàn thành' : 'Mark complete')}</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => onEdit(event)}
              title={lang === 'vi' ? 'Chỉnh sửa sự kiện' : 'Edit event'}
              className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-[#242931] text-gray-600 dark:text-gray-300 transition-colors cursor-pointer"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                onDelete(event.id);
                onClose();
              }}
              title={lang === 'vi' ? 'Xóa sự kiện' : 'Delete event'}
              className="p-1.5 rounded-full hover:bg-red-50 dark:hover:bg-red-950/40 text-gray-600 hover:text-red-600 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              title={lang === 'vi' ? 'Đóng' : 'Close'}
              className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-[#242931] text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4">
          {/* Title & color icon */}
          <div className="flex items-start gap-3">
            <div
              className="w-4 h-4 rounded-sm mt-1 shrink-0 shadow-xs"
              style={{ backgroundColor: event.color }}
            />
            <div>
              <h2
                className={`text-lg font-bold text-gray-900 dark:text-gray-100 leading-snug ${
                  event.isCompleted ? 'line-through text-gray-400' : ''
                }`}
              >
                {event.title}
              </h2>
            </div>
          </div>

          {/* Time & Recurrence */}
          <div className="flex items-start gap-3 text-xs text-gray-600 dark:text-gray-300">
            <Clock className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-gray-800 dark:text-gray-200">
                {event.startDate}
                {event.endDate && event.endDate !== event.startDate ? ` – ${event.endDate}` : ''}
              </p>
              <p className="text-gray-500 dark:text-gray-400">
                {event.allDay
                  ? lang === 'vi' ? 'Cả ngày' : 'All day'
                  : `${event.startTime} – ${event.endTime}`}
                {getRecurrenceLabel() && ` • ${getRecurrenceLabel()}`}
              </p>
            </div>
          </div>

          {/* Google Meet Video Action */}
          {event.meetUrl && (
            <div className="flex items-center gap-3">
              <Video className="w-4 h-4 text-blue-600 shrink-0" />
              <div className="flex-1 flex items-center justify-between gap-2 p-2.5 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-800">
                <button
                  type="button"
                  onClick={() => onJoinMeet ? onJoinMeet(event) : window.open(event.meetUrl, '_blank')}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>{lang === 'vi' ? 'Tham gia bằng Google Meet' : 'Join with Google Meet'}</span>
                </button>
                <button
                  onClick={handleCopyMeet}
                  title={lang === 'vi' ? 'Sao chép đường liên kết' : 'Copy link'}
                  className="p-1.5 hover:bg-blue-200/50 dark:hover:bg-blue-900 text-blue-600 rounded-md transition-colors cursor-pointer"
                >
                  {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Location */}
          {event.location && (
            <div className="flex items-start gap-3 text-xs text-gray-600 dark:text-gray-300">
              <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
              <span>{event.location}</span>
            </div>
          )}

          {/* Guests List */}
          {event.guests && event.guests.length > 0 && (
            <div className="flex items-start gap-3 text-xs text-gray-600 dark:text-gray-300">
              <Users className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
              <div className="flex-1 space-y-1">
                <p className="font-semibold text-gray-700 dark:text-gray-200">
                  {event.guests.length} {lang === 'vi' ? 'người tham gia' : 'guests'}
                </p>
                <div className="space-y-1 pt-1">
                  {event.guests.map((g, idx) => (
                    <div key={idx} className="flex items-center justify-between text-[11px]">
                      <span className="truncate">{g.name ? `${g.name} (${g.email})` : g.email}</span>
                      <span className="text-[10px] text-gray-400 capitalize">{g.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Description */}
          {event.description && (
            <div className="flex items-start gap-3 text-xs text-gray-600 dark:text-gray-300 pt-1 border-t border-gray-100 dark:border-gray-800">
              <AlignLeft className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
              <div className="flex-1 whitespace-pre-wrap leading-relaxed">
                {event.description}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

