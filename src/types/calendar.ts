export type CalendarViewType = 'month' | 'week' | 'day' | 'fourDay' | 'year' | 'schedule' | 'analytics';

export type EventType = 'event' | 'task' | 'reminder';

export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';

export type SyncState = 'synced' | 'syncing' | 'offline' | 'error';

export interface EventGuest {
  email: string;
  name?: string;
  avatar?: string;
  status: 'accepted' | 'tentative' | 'declined' | 'pending';
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  location?: string;
  startDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endDate: string; // YYYY-MM-DD
  endTime: string; // HH:mm
  allDay: boolean;
  calendarId: string;
  color: string; // Hex color code
  meetUrl?: string;
  recurrence?: RecurrenceType;
  guests?: EventGuest[];
  reminders?: number[]; // minutes before event, e.g. [10, 30]
  type: EventType;
  isCompleted?: boolean; // For tasks & reminders
  createdAt: number;
  updatedAt?: number;
}

export interface CalendarCategory {
  id: string;
  name: string;
  nameVi: string;
  color: string;
  visible: boolean;
  isCustom?: boolean;
}

export interface GoogleColor {
  id: string;
  name: string;
  nameVi: string;
  hex: string;
}

export interface LiveTimePreview {
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
}

export interface DnDState {
  isDragging: boolean;
  isResizing: boolean;
  eventId: string | null;
  initialEvent: CalendarEvent | null;
  currentPreview: LiveTimePreview | null;
  dragStartX: number;
  dragStartY: number;
  originalStartTime: string;
  originalEndTime: string;
  originalDate: string;
}

export interface WeeklyGoal {
  id: string;
  category: string;
  targetHours: number;
  color?: string;
}

export const GOOGLE_COLORS: GoogleColor[] = [
  { id: 'peacock', name: 'Peacock', nameVi: 'Xanh Khổng Tước', hex: '#039BE5' },
  { id: 'flamingo', name: 'Flamingo', nameVi: 'Hồng Hạc', hex: '#E67C73' },
  { id: 'tomato', name: 'Tomato', nameVi: 'Đỏ Cà Chua', hex: '#D50000' },
  { id: 'tangerine', name: 'Tangerine', nameVi: 'Cam Quýt', hex: '#F4511E' },
  { id: 'banana', name: 'Banana', nameVi: 'Vàng Chuối', hex: '#F6BF26' },
  { id: 'sage', name: 'Sage', nameVi: 'Xanh Lá Xô', hex: '#33B679' },
  { id: 'basil', name: 'Basil', nameVi: 'Xanh Húng Tây', hex: '#0B8043' },
  { id: 'cobalt', name: 'Cobalt', nameVi: 'Xanh Coban', hex: '#3F51B5' },
  { id: 'grape', name: 'Grape', nameVi: 'Tím Nho', hex: '#8E24AA' },
  { id: 'amethyst', name: 'Amethyst', nameVi: 'Tím Thạch Anh', hex: '#7986CB' },
  { id: 'graphite', name: 'Graphite', nameVi: 'Xám Than Chì', hex: '#616161' },
];

export const DEFAULT_CALENDARS: CalendarCategory[] = [
  { id: 'personal', name: 'Personal', nameVi: 'Cá nhân', color: '#039BE5', visible: true },
  { id: 'work', name: 'Work', nameVi: 'Công việc', color: '#7986CB', visible: true },
  { id: 'reminders', name: 'Reminders', nameVi: 'Nhắc nhở', color: '#33B679', visible: true },
  { id: 'tasks', name: 'Tasks', nameVi: 'Tác vụ', color: '#8E24AA', visible: true },
  { id: 'holidays', name: 'Holidays in Vietnam', nameVi: 'Ngày lễ Việt Nam', color: '#D50000', visible: true },
];
