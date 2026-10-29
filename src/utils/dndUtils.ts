/**
 * Utility functions for Drag-and-Drop and Event Resizing operations
 * Supporting 15-minute / 30-minute snap-to-grid on a time grid (56px per hour).
 */

export const HOUR_HEIGHT = 56; // 56px corresponds to 60 minutes
export const MIN_EVENT_DURATION = 15; // minimum event duration in minutes

/**
 * Converts "HH:mm" to total minutes from 00:00.
 */
export function timeStringToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.split(':');
  const h = parseInt(parts[0] || '0', 10);
  const m = parseInt(parts[1] || '0', 10);
  return Math.max(0, Math.min(24 * 60, h * 60 + m));
}

/**
 * Converts total minutes from 00:00 to "HH:mm".
 */
export function minutesToTimeString(totalMinutes: number): string {
  const bounded = Math.max(0, Math.min(24 * 60, Math.round(totalMinutes)));
  const h = Math.floor(bounded / 60) % 24;
  const m = bounded % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/**
 * Snaps minutes to the nearest step (default 15 minutes).
 */
export function snapMinutesToStep(minutes: number, step: number = 15): number {
  const snapped = Math.round(minutes / step) * step;
  return Math.max(0, Math.min(24 * 60, snapped));
}

/**
 * Snaps delta minutes (can be negative or positive) to the nearest step.
 */
export function snapDeltaMinutes(deltaMinutes: number, step: number = 15): number {
  return Math.round(deltaMinutes / step) * step;
}

/**
 * Converts a vertical pixel coordinate inside the time grid to snapped "HH:mm".
 */
export function yCoordToTimeString(
  yPx: number,
  hourHeight: number = HOUR_HEIGHT,
  step: number = 15
): string {
  const minutes = (yPx / hourHeight) * 60;
  const snapped = snapMinutesToStep(minutes, step);
  return minutesToTimeString(snapped);
}

/**
 * Calculates new start time when moving an event by deltaY pixels.
 */
export function calculateNewTime(
  initialTime: string,
  deltaY: number,
  hourHeight: number = HOUR_HEIGHT,
  step: number = 15
): string {
  const initialMinutes = timeStringToMinutes(initialTime);
  const deltaMinutes = (deltaY / hourHeight) * 60;
  const snappedDelta = snapDeltaMinutes(deltaMinutes, step);
  const newMinutes = Math.max(0, Math.min(24 * 60 - 15, initialMinutes + snappedDelta));
  return minutesToTimeString(newMinutes);
}

/**
 * Computes resized end time when dragging the bottom edge handle.
 */
export function computeResizedEndTime(
  startTime: string,
  initialEndTime: string,
  deltaY: number,
  hourHeight: number = HOUR_HEIGHT,
  step: number = 15,
  minDuration: number = MIN_EVENT_DURATION
): { endTime: string; durationMinutes: number } {
  const startMins = timeStringToMinutes(startTime);
  const initialEndMins = timeStringToMinutes(initialEndTime);
  const deltaMinutes = (deltaY / hourHeight) * 60;
  const snappedDelta = snapDeltaMinutes(deltaMinutes, step);

  let newEndMins = initialEndMins + snappedDelta;
  if (newEndMins - startMins < minDuration) {
    newEndMins = startMins + minDuration;
  }
  newEndMins = Math.min(24 * 60, newEndMins);

  const durationMinutes = Math.max(minDuration, newEndMins - startMins);
  return {
    endTime: minutesToTimeString(newEndMins),
    durationMinutes,
  };
}

/**
 * Formats duration nicely: e.g. "1h 30p" or "45p" / "1h 30m" or "45m".
 */
export function formatLiveDuration(durationMinutes: number, lang: 'vi' | 'en'): string {
  const h = Math.floor(durationMinutes / 60);
  const m = durationMinutes % 60;
  if (lang === 'vi') {
    if (h === 0) return `${m}p`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}p`;
  } else {
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  }
}
