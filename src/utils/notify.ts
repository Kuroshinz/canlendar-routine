import { playNotificationSound, playSuccessSound } from './sound';

export type ToastType = 'success' | 'info' | 'warning' | 'error';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  durationMs: number;
}

export function notify(
  type: ToastType,
  title: string,
  message?: string,
  options?: { durationMs?: number; playSound?: boolean }
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
  }
}

export const notifySuccess = (title: string, message?: string, durationMs?: number): void => {
  notify('success', title, message, { durationMs, playSound: true });
};

export const notifyInfo = (title: string, message?: string, durationMs?: number): void => {
  notify('info', title, message, { durationMs, playSound: true });
};

export const notifyWarning = (title: string, message?: string, durationMs?: number): void => {
  notify('warning', title, message, { durationMs, playSound: true });
};

export const notifyError = (title: string, message?: string, durationMs?: number): void => {
  notify('error', title, message, { durationMs, playSound: true });
};
