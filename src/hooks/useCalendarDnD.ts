import { useState, useCallback, useEffect, useRef } from 'react';
import { CalendarEvent, DnDState, LiveTimePreview } from '../types/calendar';
import {
  calculateNewTime,
  computeResizedEndTime,
  timeStringToMinutes,
  minutesToTimeString,
  HOUR_HEIGHT,
} from '../utils/dndUtils';
import { playNotificationSound } from '../utils/sound';

export interface UndoItem {
  previousEvent: CalendarEvent;
  updatedEvent: CalendarEvent;
}

export function useCalendarDnD(
  onUpdateEvent: (event: CalendarEvent) => void,
  lang: 'vi' | 'en' = 'vi'
) {
  const [dndState, setDndState] = useState<DnDState>({
    isDragging: false,
    isResizing: false,
    eventId: null,
    initialEvent: null,
    currentPreview: null,
    dragStartX: 0,
    dragStartY: 0,
    originalStartTime: '',
    originalEndTime: '',
    originalDate: '',
  });

  const [undoStack, setUndoStack] = useState<UndoItem[]>([]);
  const [redoStack, setRedoStack] = useState<UndoItem[]>([]);

  // Ref to hold current state for event listeners
  const stateRef = useRef(dndState);
  stateRef.current = dndState;

  const startDrag = useCallback((event: CalendarEvent, clientX: number, clientY: number) => {
    const duration =
      timeStringToMinutes(event.endTime) - timeStringToMinutes(event.startTime);
    setDndState({
      isDragging: true,
      isResizing: false,
      eventId: event.id,
      initialEvent: event,
      currentPreview: {
        date: event.startDate,
        startTime: event.startTime,
        endTime: event.endTime,
        durationMinutes: Math.max(15, duration),
      },
      dragStartX: clientX,
      dragStartY: clientY,
      originalStartTime: event.startTime,
      originalEndTime: event.endTime,
      originalDate: event.startDate,
    });
  }, []);

  const startResize = useCallback((event: CalendarEvent, clientY: number) => {
    const duration =
      timeStringToMinutes(event.endTime) - timeStringToMinutes(event.startTime);
    setDndState({
      isDragging: false,
      isResizing: true,
      eventId: event.id,
      initialEvent: event,
      currentPreview: {
        date: event.startDate,
        startTime: event.startTime,
        endTime: event.endTime,
        durationMinutes: Math.max(15, duration),
      },
      dragStartX: 0,
      dragStartY: clientY,
      originalStartTime: event.startTime,
      originalEndTime: event.endTime,
      originalDate: event.startDate,
    });
  }, []);

  const updatePointerMove = useCallback(
    (clientY: number, targetDate?: string) => {
      const state = stateRef.current;
      if (!state.isDragging && !state.isResizing) return;
      if (!state.initialEvent) return;

      const deltaY = clientY - state.dragStartY;

      if (state.isDragging) {
        const newStart = calculateNewTime(state.originalStartTime, deltaY, HOUR_HEIGHT, 15);
        const originalDuration =
          timeStringToMinutes(state.originalEndTime) -
          timeStringToMinutes(state.originalStartTime);
        const newEndMins = timeStringToMinutes(newStart) + originalDuration;
        const newEnd = minutesToTimeString(Math.min(24 * 60, newEndMins));

        setDndState((prev) => ({
          ...prev,
          currentPreview: {
            date: targetDate || prev.originalDate,
            startTime: newStart,
            endTime: newEnd,
            durationMinutes: originalDuration,
          },
        }));
      } else if (state.isResizing) {
        const resized = computeResizedEndTime(
          state.originalStartTime,
          state.originalEndTime,
          deltaY,
          HOUR_HEIGHT,
          15,
          15
        );
        setDndState((prev) => ({
          ...prev,
          currentPreview: {
            date: prev.originalDate,
            startTime: prev.originalStartTime,
            endTime: resized.endTime,
            durationMinutes: resized.durationMinutes,
          },
        }));
      }
    },
    []
  );

  const cancelDnD = useCallback(() => {
    setDndState({
      isDragging: false,
      isResizing: false,
      eventId: null,
      initialEvent: null,
      currentPreview: null,
      dragStartX: 0,
      dragStartY: 0,
      originalStartTime: '',
      originalEndTime: '',
      originalDate: '',
    });
  }, []);

  const finishDnD = useCallback((): CalendarEvent | null => {
    const state = stateRef.current;
    if ((!state.isDragging && !state.isResizing) || !state.initialEvent || !state.currentPreview) {
      cancelDnD();
      return null;
    }

    const { initialEvent, currentPreview } = state;
    const isChanged =
      currentPreview.date !== initialEvent.startDate ||
      currentPreview.startTime !== initialEvent.startTime ||
      currentPreview.endTime !== initialEvent.endTime;

    if (!isChanged) {
      cancelDnD();
      return null;
    }

    const updatedEvent: CalendarEvent = {
      ...initialEvent,
      startDate: currentPreview.date,
      endDate: currentPreview.date,
      startTime: currentPreview.startTime,
      endTime: currentPreview.endTime,
      updatedAt: Date.now(),
    };

    // Save to undo stack
    setUndoStack((prev) => [...prev, { previousEvent: initialEvent, updatedEvent }]);
    setRedoStack([]); // Clear redo stack on new action

    // Apply update
    onUpdateEvent(updatedEvent);
    playNotificationSound();

    cancelDnD();
    return updatedEvent;
  }, [cancelDnD, onUpdateEvent]);

  const undo = useCallback((): boolean => {
    if (undoStack.length === 0) return false;
    const lastAction = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [...prev, lastAction]);

    onUpdateEvent(lastAction.previousEvent);
    playNotificationSound();
    return true;
  }, [undoStack, onUpdateEvent]);

  const redo = useCallback((): boolean => {
    if (redoStack.length === 0) return false;
    const nextAction = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, -1));
    setUndoStack((prev) => [...prev, nextAction]);

    onUpdateEvent(nextAction.updatedEvent);
    playNotificationSound();
    return true;
  }, [redoStack, onUpdateEvent]);

  // Global Escape & Ctrl+Z keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (stateRef.current.isDragging || stateRef.current.isResizing) {
          cancelDnD();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cancelDnD, undo, redo]);

  return {
    dndState,
    startDrag,
    startResize,
    updatePointerMove,
    finishDnD,
    cancelDnD,
    undo,
    redo,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
  };
}
