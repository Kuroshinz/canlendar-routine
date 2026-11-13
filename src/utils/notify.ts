import { playNotificationSound, playSuccessSound } from './sound';

export type ToastType = 'success' | 'info' | 'warning' | 'error';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  durationMs: number;
}

export interface SystemNotification {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  createdAt: number;
  read: boolean;
  category?: 'nutrition' | 'fitness' | 'roadmap' | 'task' | 'finance' | 'sync' | 'system';
  targetView?: string;
}

const STORAGE_KEY = 'vortexcal_notifications';
const MAX_NOTIFICATIONS = 50;

export function getStoredNotifications(): SystemNotification[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveStoredNotifications(items: SystemNotification[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_NOTIFICATIONS)));
    window.dispatchEvent(new CustomEvent('app:notification-updated'));
  } catch (err) {
    console.warn('Failed to save notifications', err);
  }
}

export function addSystemNotification(notif: {
  type: ToastType;
  title: string;
  message?: string;
  category?: SystemNotification['category'];
  targetView?: string;
}): SystemNotification {
  const item: SystemNotification = {
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type: notif.type,
    title: notif.title,
    message: notif.message,
    createdAt: Date.now(),
    read: false,
    category: notif.category || 'system',
    targetView: notif.targetView,
  };
  const list = [item, ...getStoredNotifications()];
  saveStoredNotifications(list);
  return item;
}

export function markNotificationRead(id: string): void {
  const list = getStoredNotifications().map((n) => (n.id === id ? { ...n, read: true } : n));
  saveStoredNotifications(list);
}

export function markAllNotificationsRead(): void {
  const list = getStoredNotifications().map((n) => ({ ...n, read: true }));
  saveStoredNotifications(list);
}

export function deleteNotification(id: string): void {
  const list = getStoredNotifications().filter((n) => n.id !== id);
  saveStoredNotifications(list);
}

export function clearAllNotifications(): void {
  saveStoredNotifications([]);
}

export interface NotifyOptions {
  durationMs?: number;
  playSound?: boolean;
  category?: SystemNotification['category'];
  targetView?: string;
  saveToHistory?: boolean;
}

export function notify(
  type: ToastType,
  title: string,
  message?: string,
  options?: NotifyOptions
): void {
  const shouldPlaySound = options?.playSound ?? true;

  if (shouldPlaySound) {
    if (type === 'success') {
      playSuccessSound();
    } else {
      playNotificationSound();
    }
  }

  if (typeof window !== 'undefined') {
    const detail: ToastItem = {
      id: `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type,
      title,
      message,
      durationMs: options?.durationMs ?? 4200,
    };
    window.dispatchEvent(new CustomEvent('app:toast', { detail }));

    // Save to system notification center if not explicitly disabled
    if (options?.saveToHistory !== false) {
      addSystemNotification({
        type,
        title,
        message,
        category: options?.category,
        targetView: options?.targetView,
      });
    }
  }
}

export const notifySuccess = (
  title: string,
  message?: string,
  options?: number | NotifyOptions
): void => {
  const opts = typeof options === 'number' ? { durationMs: options } : options;
  notify('success', title, message, { ...opts, playSound: true });
};

export const notifyInfo = (
  title: string,
  message?: string,
  options?: number | NotifyOptions
): void => {
  const opts = typeof options === 'number' ? { durationMs: options } : options;
  notify('info', title, message, { ...opts, playSound: true });
};

export const notifyWarning = (
  title: string,
  message?: string,
  options?: number | NotifyOptions
): void => {
  const opts = typeof options === 'number' ? { durationMs: options } : options;
  notify('warning', title, message, { ...opts, playSound: true });
};

export const notifyError = (
  title: string,
  message?: string,
  options?: number | NotifyOptions
): void => {
  const opts = typeof options === 'number' ? { durationMs: options } : options;
  notify('error', title, message, { ...opts, playSound: true });
};
