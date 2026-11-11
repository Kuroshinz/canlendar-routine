/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  CalendarEvent,
  CalendarCategory,
  CalendarViewType,
  EventType,
  SyncState,
  DEFAULT_CALENDARS,
} from './types/calendar';
import { INITIAL_EVENTS } from './data/initialEvents';
import { formatDateString, parseDateString } from './utils/calendarUtils';
import { playNotificationSound } from './utils/sound';
import { useCalendarDnD } from './hooks/useCalendarDnD';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { MonthView } from './components/MonthView';
import { TimeGridView } from './components/TimeGridView';
import { YearView } from './components/YearView';
import { ScheduleView } from './components/ScheduleView';
import { TimeAnalyticsView } from './components/analytics/TimeAnalyticsView';
import { EventModal } from './components/EventModal';
import { EventDetailCard } from './components/EventDetailCard';
import { QuickAddModal } from './components/QuickAddModal';
import { MiniEventPopover } from './components/MiniEventPopover';
import { DayPlannerDrawer } from './components/DayPlannerDrawer';
import { ShortcutsModal } from './components/ShortcutsModal';
import { ExportImportModal } from './components/ExportImportModal';
import { CloudSyncModal } from './components/sync/CloudSyncModal';
import { RightSidebar } from './components/RightSidebar';
import { MultiHubDrawer } from './components/MultiHubDrawer';
import { ProductivityDashboard } from './components/productivity/ProductivityDashboard';
import { TasksGoalsView } from './components/productivity/TasksGoalsView';
import { StudyFocusView } from './components/productivity/StudyFocusView';
import { FinanceView } from './components/productivity/FinanceView';
import { HealthView } from './components/productivity/HealthView';
import { useProductivityStore, todayString } from './hooks/useProductivityStore';
import { buildTaskEvents } from './utils/productivityUtils';
import { buildWorkoutEvents, startOfWeek } from './utils/fitnessMetrics';
import { User } from 'firebase/auth';
import { initAuth, logout, getAccessToken, AppUser } from './services/auth';
import { fetchGoogleCalendarEvents, createGoogleCalendarEvent } from './services/googleCalendarSync';
import { fetchCalendarFromICalUrl } from './services/googleCalendarUrlSync';
import { executeRealGoogleSync, hasOwnClientId } from './services/realGoogleAuth';
import {
  subscribeUserEvents,
  saveEventToFirestore,
  deleteEventFromFirestore,
} from './services/firestoreSync';
import { Bell, FileText } from 'lucide-react';
import { CalendarActionBar } from './components/CalendarActionBar';
import { GeminiMacroModal } from './components/productivity/fitness/GeminiMacroModal';
import { GeminiMacroItem } from './services/geminiSync';
import { LifeCopilotModal } from './components/productivity/LifeCopilotModal';

export default function App() {
  // 1. Language state
  const [lang, setLang] = useState<'vi' | 'en'>(() => {
    return (localStorage.getItem('gcal_lang') as 'vi' | 'en') || 'vi';
  });

  // 2. Dark mode state (defaults to true for sleek dark theme)
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('gcal_theme');
    if (saved) return saved === 'dark';
    return true;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
      localStorage.setItem('gcal_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
      localStorage.setItem('gcal_theme', 'light');
    }
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode((prev) => !prev);
  const toggleLang = () => {
    const nextLang = lang === 'vi' ? 'en' : 'vi';
    setLang(nextLang);
    localStorage.setItem('gcal_lang', nextLang);
  };

  // 3. Current active date & view
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date(2026, 9, 29)); // Oct 29, 2026
  const [view, setView] = useState<CalendarViewType>(() => {
    return (localStorage.getItem('gcal_view') as CalendarViewType) || 'month';
  });

  const handleViewChange = (newView: CalendarViewType) => {
    setView(newView);
    localStorage.setItem('gcal_view', newView);
  };

  // 4. Events & Categories persistence (Offline-First)
  const [events, setEvents] = useState<CalendarEvent[]>(() => {
    try {
      const v = localStorage.getItem('gcal_events_v');
      if (v === '2.1') {
        const saved = localStorage.getItem('gcal_events');
        if (saved) return JSON.parse(saved);
      }
    } catch {}
    localStorage.setItem('gcal_events_v', '2.1');
    return INITIAL_EVENTS;
  });

  const [categories, setCategories] = useState<CalendarCategory[]>(() => {
    let saved: CalendarCategory[] | null = null;
    try {
      const raw = localStorage.getItem('gcal_categories');
      if (raw) saved = JSON.parse(raw);
    } catch {}

    if (!saved) return DEFAULT_CALENDARS;

    // Additive migration: categories added to DEFAULT_CALENDARS after a user
    // already persisted their list (e.g. Study / Fitness) must appear without
    // touching the user's own custom calendars or visibility choices.
    const knownIds = new Set(saved.map((c) => c.id));
    const missing = DEFAULT_CALENDARS.filter((c) => !knownIds.has(c.id));
    return missing.length > 0 ? [...saved, ...missing] : saved;
  });

  useEffect(() => {
    localStorage.setItem('gcal_events', JSON.stringify(events));
  }, [events]);

  useEffect(() => {
    localStorage.setItem('gcal_categories', JSON.stringify(categories));
  }, [categories]);

  // Set of visible category IDs
  const visibleCategoryIds = useMemo(() => {
    return new Set(categories.filter((c) => c.visible).map((c) => c.id));
  }, [categories]);

  // 4b. Productivity store — single owner for tasks, goals, focus, finance & health.
  // Tasks that carry a due date *and* a start time are mirrored onto the calendar
  // as derived events so they never pollute the persisted `gcal_events` array.
  const productivity = useProductivityStore();
  const colorByCategoryId = useMemo(
    () => new Map(categories.map((c) => [c.id, c.color])),
    [categories]
  );
  const taskEvents = useMemo(
    () => buildTaskEvents(productivity.tasks, colorByCategoryId),
    [productivity.tasks, colorByCategoryId]
  );
  const workoutEvents = useMemo(
    () =>
      buildWorkoutEvents(
        productivity.workoutSessions,
        productivity.plannedSessions,
        startOfWeek(todayString())
      ),
    [productivity.workoutSessions, productivity.plannedSessions]
  );
  const allEvents = useMemo(
    () => [...events, ...taskEvents, ...workoutEvents],
    [events, taskEvents, workoutEvents]
  );

  // 5. Sidebar toggle (closed by default on mobile)
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024;
    }
    return true;
  });

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 6. Search query
  const [searchQuery, setSearchQuery] = useState('');

  // 7. Modals state
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [eventToEdit, setEventToEdit] = useState<CalendarEvent | null>(null);
  const [modalDate, setModalDate] = useState<string | undefined>(undefined);
  const [modalTime, setModalTime] = useState<string | undefined>(undefined);
  const [modalType, setModalType] = useState<EventType>('event');

  const [selectedEventForDetail, setSelectedEventForDetail] = useState<CalendarEvent | null>(null);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isExportImportOpen, setIsExportImportOpen] = useState(false);
  const [isCloudSyncOpen, setIsCloudSyncOpen] = useState(false);
  const [isMultiHubOpen, setIsMultiHubOpen] = useState(false);
  const [isGeminiMacroOpen, setIsGeminiMacroOpen] = useState(false);
  const [isLifeCopilotOpen, setIsLifeCopilotOpen] = useState(false);
  const [isRightDrawerOpen, setIsRightDrawerOpen] = useState(false);

  const handleApplyGeminiMacros = useCallback(
    (items: GeminiMacroItem[]) => {
      items.forEach((item) => {
        productivity.addMealLog({
          date: todayString(),
          slot: item.slot || 'lunch',
          description: item.name,
          items: [
            {
              name: item.name,
              amount: item.amount || 100,
              unit: item.unit || 'g',
              kcal: item.kcal,
              protein: item.protein,
              carbs: item.carbs,
              fat: item.fat,
            },
          ],
        });
      });
      setIsGeminiMacroOpen(false);
    },
    [productivity.addMealLog]
  );

  // Mini Inline Event Popover state
  const [miniPopover, setMiniPopover] = useState<{
    isOpen: boolean;
    position: { top: number; left: number } | null;
    dateStr: string;
    startTime: string;
    endTime: string;
  }>({
    isOpen: false,
    position: null,
    dateStr: '',
    startTime: '09:00',
    endTime: '10:00',
  });

  // Day Planner Drawer state
  const [dayPlanner, setDayPlanner] = useState<{
    isOpen: boolean;
    dateStr: string;
  }>({
    isOpen: false,
    dateStr: formatDateString(new Date(2026, 9, 29)),
  });

  // Google OAuth & Cloud Sync State
  const [user, setUser] = useState<AppUser | User | null>(() => {
    try {
      const saved = localStorage.getItem('gcal_active_user');
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  });
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncState, setSyncState] = useState<SyncState>(() => {
    return localStorage.getItem('gcal_active_user') ? 'synced' : 'offline';
  });
  const [lastSyncedTime, setLastSyncedTime] = useState<string | null>(() => {
    return localStorage.getItem('gcal_active_user') ? 'Vừa xong' : null;
  });

  // 8. Event saving / updating handler
  const handleSaveEvent = useCallback((savedEvent: CalendarEvent) => {
    // Editing a task-derived event updates the owning task instead of creating a
    // duplicate calendar event in `gcal_events`.
    if (savedEvent.id.startsWith('task-')) {
      productivity.updateTask(savedEvent.id.slice('task-'.length), {
        title: savedEvent.title,
        notes: savedEvent.description,
        dueDate: savedEvent.startDate,
        startTime: savedEvent.allDay ? undefined : savedEvent.startTime,
        endTime: savedEvent.allDay ? undefined : savedEvent.endTime,
      });
      return;
    }

    setEvents((prev) => {
      const idx = prev.findIndex((e) => e.id === savedEvent.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = savedEvent;
        return copy;
      }
      return [savedEvent, ...prev];
    });

    // Cloud sync push if logged in
    if (user) {
      setSyncState('syncing');
      saveEventToFirestore(user.uid, savedEvent)
        .then(() => setSyncState('synced'))
        .catch(() => setSyncState('error'));
    }

    // Google Calendar Push if token available
    getAccessToken()
      .then((token) => {
        if (token && !savedEvent.id.startsWith('gcal-')) {
          createGoogleCalendarEvent(token, savedEvent).catch((e) =>
            console.warn('Background Google Calendar sync error:', e)
          );
        }
      })
      .catch(() => {});
  }, [user, productivity.updateTask]);

  const handleDeleteEvent = useCallback((eventId: string) => {
    // Task-derived calendar events are owned by the productivity store, not by
    // the persisted `gcal_events` array — route the delete to their real owner.
    if (eventId.startsWith('task-')) {
      productivity.deleteTask(eventId.slice('task-'.length));
      setSelectedEventForDetail(null);
      return;
    }

    setEvents((prev) => prev.filter((e) => e.id !== eventId));
    if (selectedEventForDetail?.id === eventId) {
      setSelectedEventForDetail(null);
    }
    if (user) {
      deleteEventFromFirestore(user.uid, eventId).catch(console.warn);
    }
  }, [selectedEventForDetail, user, productivity.deleteTask]);

  const handleToggleCompleteTask = (eventId: string) => {
    if (eventId.startsWith('task-')) {
      const taskId = eventId.slice('task-'.length);
      const task = productivity.tasks.find((t) => t.id === taskId);
      productivity.setTaskStatus(taskId, task?.status === 'completed' ? 'todo' : 'completed');
      return;
    }

    setEvents((prev) =>
      prev.map((e) => (e.id === eventId ? { ...e, isCompleted: !e.isCompleted } : e))
    );
  };

  const handleMoveEvent = useCallback((eventId: string, newDateStr: string) => {
    if (eventId.startsWith('task-')) {
      productivity.updateTask(eventId.slice('task-'.length), { dueDate: newDateStr });
      return;
    }

    setEvents((prev) =>
      prev.map((e) => {
        if (e.id === eventId) {
          const updated = {
            ...e,
            startDate: newDateStr,
            endDate: newDateStr,
            updatedAt: Date.now(),
          };
          if (user) {
            saveEventToFirestore(user.uid, updated).catch(console.warn);
          }
          return updated;
        }
        return e;
      })
    );
  }, [user, productivity.updateTask]);

  // 9. Drag & Drop and Resizing Engine
  const {
    dndState,
    startDrag,
    startResize,
    updatePointerMove,
    finishDnD,
    cancelDnD,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useCalendarDnD(handleSaveEvent, lang);

  // 10. Firebase Auth & Realtime Firestore sync subscription
  useEffect(() => {
    const unsubscribeAuth = initAuth(
      (authedUser) => {
        setUser(authedUser);
        setSyncState('synced');
      },
      () => {
        setUser(null);
        setSyncState('offline');
      }
    );
    return () => {
      if (unsubscribeAuth) unsubscribeAuth();
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    setSyncState('syncing');

    const unsubscribeFirestore = subscribeUserEvents(
      user.uid,
      (remoteEvents) => {
        if (remoteEvents.length > 0) {
          setEvents((prev) => {
            const remoteMap = new Map(remoteEvents.map((r) => [r.id, r]));
            const merged = prev.map((local) => {
              const remote = remoteMap.get(local.id);
              if (!remote) return local;
              remoteMap.delete(local.id);
              return (remote.updatedAt || 0) > (local.updatedAt || 0) ? remote : local;
            });
            return [...merged, ...Array.from(remoteMap.values())];
          });
        }
        setSyncState('synced');
        setLastSyncedTime(new Date().toLocaleTimeString(lang === 'vi' ? 'vi-VN' : 'en-US'));
      },
      (err) => {
        console.warn('Firestore subscription warning:', err);
        setSyncState('offline');
      }
    );

    return () => {
      if (unsubscribeFirestore) unsubscribeFirestore();
    };
  }, [user, lang]);

  // Auto-sync from saved Google Calendar iCal URL if present
  useEffect(() => {
    const savedUrl = localStorage.getItem('gcal_sync_url');
    if (savedUrl) {
      setSyncState('syncing');
      fetchCalendarFromICalUrl(savedUrl)
        .then((remoteEvents) => {
          if (remoteEvents.length > 0) {
            setEvents((prev) => {
              const map = new Map(prev.map((e) => [e.id, e]));
              for (const item of remoteEvents) {
                map.set(item.id, item);
              }
              return Array.from(map.values());
            });
            setLastSyncedTime(new Date().toLocaleTimeString(lang === 'vi' ? 'vi-VN' : 'en-US'));
            setSyncState('synced');
          }
        })
        .catch(() => {
          setSyncState('offline');
        });
    }
  }, [lang]);

  // In-app reminder notification toast
  const [activeAlert, setActiveAlert] = useState<{ title: string; time: string } | null>(null);

  // Navigation handlers
  const handleNavigateToday = useCallback(() => {
    setCurrentDate(new Date(2026, 9, 29));
  }, []);

  const handleNavigatePrev = useCallback(() => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      if (view === 'month') {
        d.setMonth(d.getMonth() - 1);
      } else if (view === 'week') {
        d.setDate(d.getDate() - 7);
      } else if (view === 'day') {
        d.setDate(d.getDate() - 1);
      } else if (view === 'fourDay') {
        d.setDate(d.getDate() - 4);
      } else if (view === 'year') {
        d.setFullYear(d.getFullYear() - 1);
      } else {
        d.setDate(d.getDate() - 7);
      }
      return d;
    });
  }, [view]);

  const handleNavigateNext = useCallback(() => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      if (view === 'month') {
        d.setMonth(d.getMonth() + 1);
      } else if (view === 'week') {
        d.setDate(d.getDate() + 7);
      } else if (view === 'day') {
        d.setDate(d.getDate() + 1);
      } else if (view === 'fourDay') {
        d.setDate(d.getDate() + 4);
      } else if (view === 'year') {
        d.setFullYear(d.getFullYear() + 1);
      } else {
        d.setDate(d.getDate() + 7);
      }
      return d;
    });
  }, [view]);

  // Keyboard shortcuts listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setIsLifeCopilotOpen((v) => !v);
        return;
      }

      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if (e.key === 'Escape') {
        setIsEventModalOpen(false);
        setSelectedEventForDetail(null);
        setIsQuickAddOpen(false);
        setIsShortcutsOpen(false);
        setIsExportImportOpen(false);
        setIsCloudSyncOpen(false);
        setIsLifeCopilotOpen(false);
        setMiniPopover((prev) => ({ ...prev, isOpen: false }));
        setDayPlanner((prev) => ({ ...prev, isOpen: false }));
        cancelDnD();
        return;
      }

      if (e.key === 't' || e.key === 'T') {
        handleNavigateToday();
      } else if (e.key === 'j' || e.key === 'n') {
        handleNavigateNext();
      } else if (e.key === 'k') {
        // 'P' is reserved for the productivity analytics view (see below and
        // the shortcuts modal), so only 'K' steps back a period here.
        handleNavigatePrev();
      } else if (e.key === 'm' || e.key === 'M') {
        handleViewChange('month');
      } else if (e.key === 'w' || e.key === 'W') {
        handleViewChange('week');
      } else if (e.key === 'd' || e.key === 'D') {
        handleViewChange('day');
      } else if (e.key === 'x' || e.key === 'X') {
        handleViewChange('fourDay');
      } else if (e.key === 'a' || e.key === 'A') {
        handleViewChange('schedule');
      } else if (e.key === 'p' || e.key === 'P') {
        handleViewChange('analytics');
      } else if (e.key === 'y' || e.key === 'Y') {
        handleViewChange('year');
      } else if (e.key === '1') {
        handleViewChange('dashboard');
      } else if (e.key === '2') {
        handleViewChange('tasks');
      } else if (e.key === '3') {
        handleViewChange('focus');
      } else if (e.key === '4') {
        handleViewChange('finance');
      } else if (e.key === '5') {
        handleViewChange('health');
      } else if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        openCreateModal('event');
      } else if (e.key === '/') {
        e.preventDefault();
        const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
        searchInput?.focus();
      } else if (e.key === '?') {
        setIsShortcutsOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNavigateToday, handleNavigateNext, handleNavigatePrev, cancelDnD]);

  // Category toggles
  const handleToggleCategory = (id: string) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, visible: !c.visible } : c))
    );
  };

  const handleAddCategory = (name: string, color: string) => {
    const newCat: CalendarCategory = {
      id: `custom-${Date.now()}`,
      name,
      nameVi: name,
      color,
      visible: true,
      isCustom: true,
    };
    setCategories((prev) => [...prev, newCat]);
  };

  const handleDeleteCategory = (id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
  };

  // Open create modal with pre-fills
  const openCreateModal = (type: EventType = 'event', dateStr?: string, timeStr?: string) => {
    setEventToEdit(null);
    setModalType(type);
    setModalDate(dateStr || formatDateString(currentDate));
    setModalTime(timeStr || '09:00');
    setIsEventModalOpen(true);
  };

  // Inline Quick Add trigger on MonthView or TimeGridView click
  const handleOpenInlineQuickAdd = (
    dateStr: string,
    startTime: string = '09:00',
    endTime: string = '10:00',
    clientX?: number,
    clientY?: number
  ) => {
    const left = clientX !== undefined ? clientX : window.innerWidth / 2 - 180;
    const top = clientY !== undefined ? clientY : window.innerHeight / 2 - 170;

    setMiniPopover({
      isOpen: true,
      position: { top, left },
      dateStr,
      startTime,
      endTime,
    });
  };

  // Google OAuth Handlers
  const handleGoogleSignIn = async () => {
    // The shared sample Client ID cannot authorize this origin, so the Google
    // consent popup would only end on a "400: origin_mismatch" error page.
    // Send the user straight to the real sync dialog (own Client ID, access
    // token, or secret iCal URL) instead of opening a dead popup.
    if (!hasOwnClientId()) {
      setIsCloudSyncOpen(true);
      return;
    }

    try {
      setIsSyncing(true);
      // Attempt official real Google OAuth login via Google Identity Services
      const realRes = await executeRealGoogleSync();
      if (realRes?.user) {
        setUser(realRes.user);
        setSyncState('synced');
        if (realRes.events && realRes.events.length > 0) {
          setEvents(realRes.events);
        }
        setActiveAlert({
          title: lang === 'vi' ? 'Đã kết nối Google Calendar thành công!' : 'Google Calendar Connected!',
          time: realRes.user.email || 'Google',
        });
        setLastSyncedTime(new Date().toLocaleTimeString(lang === 'vi' ? 'vi-VN' : 'en-US'));
        return;
      }
    } catch (realErr: any) {
      console.info('Google GIS direct popup requires origin or token setup, opening Sync Modal:', realErr);
      setIsCloudSyncOpen(true);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleGoogleSignOut = async () => {
    try {
      await logout();
      setUser(null);
      localStorage.removeItem('gcal_active_user');
      setSyncState('offline');
    } catch (err) {
      console.error('Sign Out failed:', err);
    }
  };

  const handleCreateNewAccount = (name: string, email: string, clearData: boolean) => {
    const trimmedName = name.trim() || (lang === 'vi' ? 'Người dùng mới' : 'New User');
    const trimmedEmail = email.trim() || null;
    const newUser: AppUser = {
      uid: 'user-' + Date.now(),
      displayName: trimmedName,
      email: trimmedEmail,
      photoURL: null,
    };
    setUser(newUser);
    localStorage.setItem('gcal_active_user', JSON.stringify(newUser));

    if (clearData) {
      setEvents([]);
      localStorage.setItem('gcal_events', JSON.stringify([]));
      productivity.clearAll(trimmedName, trimmedEmail || undefined);
    } else {
      productivity.updateCtgProfile({
        name: trimmedName,
        email: trimmedEmail || undefined,
      });
    }

    setSyncState('synced');
    setLastSyncedTime(new Date().toLocaleTimeString(lang === 'vi' ? 'vi-VN' : 'en-US'));
    setActiveAlert({
      title: lang === 'vi' ? `Chào mừng ${trimmedName}!` : `Welcome ${trimmedName}!`,
      time: clearData
        ? (lang === 'vi' ? 'Dữ liệu đã được làm mới hoàn toàn.' : 'Data reset to fresh state.')
        : (lang === 'vi' ? 'Tài khoản mới đã kích hoạt.' : 'New account activated.'),
    });
  };

  const handleSyncGoogleCalendar = async (explicitToken?: string) => {
    setIsSyncing(true);
    try {
      const token = explicitToken || (await getAccessToken());
      if (!token) {
        // No real token yet: route the user to the real sync dialog
        // (Google OAuth popup / access token / secret iCal URL).
        setIsCloudSyncOpen(true);
        return;
      }
      const gEvents = await fetchGoogleCalendarEvents(token);
      if (gEvents && gEvents.length > 0) {
        setEvents((prev) => {
          const incomingIds = new Set(gEvents.map((e) => e.id));
          const filtered = prev.filter((e) => !incomingIds.has(e.id));
          return [...gEvents, ...filtered];
        });
      }
      const now = new Date();
      const timeStr = now.toLocaleTimeString(lang === 'vi' ? 'vi-VN' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      setLastSyncedTime(timeStr);
      setSyncState('synced');
    } catch (err) {
      console.error('Failed to sync Google Calendar:', err);
      setActiveAlert({
        title:
          lang === 'vi'
            ? 'Đồng bộ Google Calendar thất bại — token có thể đã hết hạn, vui lòng kết nối lại.'
            : 'Google Calendar sync failed — the token may have expired, please reconnect.',
        time: new Date().toLocaleTimeString(lang === 'vi' ? 'vi-VN' : 'en-US'),
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-[#0b101b] text-slate-800 dark:text-slate-100 font-sans antialiased">
      {/* Reminder Banner Toast */}
      {activeAlert && (
        <div className="fixed top-4 right-4 bg-blue-600 text-white px-4 py-2.5 rounded-2xl shadow-xl z-50 flex items-center gap-3 animate-in slide-in-from-top">
          <Bell className="w-4 h-4 animate-bounce" />
          <div className="text-xs">
            <span className="font-bold">{lang === 'vi' ? 'Nhắc nhở: ' : 'Reminder: '}</span>
            <span>
              {activeAlert.title} ({activeAlert.time})
            </span>
          </div>
          <button
            onClick={() => setActiveAlert(null)}
            className="p-1 hover:bg-blue-700 rounded-lg text-white font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Modern Executive Sidebar Dock */}
      <Sidebar
        currentDate={currentDate}
        onSelectDate={(d) => {
          setCurrentDate(d);
          if (window.innerWidth < 1024) {
            setIsSidebarOpen(false);
          }
        }}
        isOpen={isSidebarOpen}
        onCloseMobile={() => setIsSidebarOpen(false)}
        categories={categories}
        onToggleCategory={handleToggleCategory}
        onAddCategory={handleAddCategory}
        onDeleteCategory={handleDeleteCategory}
        onOpenCreateModal={(type) => openCreateModal(type)}
        lang={lang}
        onViewChange={handleViewChange}
        currentView={view}
        onOpenGeminiMacro={() => setIsGeminiMacroOpen(true)}
        onOpenSettings={() => setIsShortcutsOpen(true)}
        onOpenCloudSync={() => setIsCloudSyncOpen(true)}
        onGoogleSignIn={handleGoogleSignIn}
        onLogout={handleGoogleSignOut}
        userEmail={user?.email || undefined}
        isLoggedInGoogle={Boolean(user)}
      />

      {/* Main Content Workspace */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        {/* Top Modern Header Bar */}
        <Header
          currentDate={currentDate}
          view={view}
          onViewChange={handleViewChange}
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onOpenQuickAdd={() => setIsQuickAddOpen(true)}
          onOpenShortcuts={() => setIsShortcutsOpen(true)}
          onOpenExportImport={() => setIsExportImportOpen(true)}
          onOpenCloudSync={() => setIsCloudSyncOpen(true)}
          onGoogleSignIn={handleGoogleSignIn}
          onOpenGeminiMacro={() => setIsGeminiMacroOpen(true)}
          onOpenLifeCopilot={() => setIsLifeCopilotOpen(true)}
          onToggleRightDrawer={() => setIsRightDrawerOpen((prev) => !prev)}
          userEmail={user?.email || 'admin@vortexcal.io'}
          userName={user?.displayName || undefined}
          darkMode={darkMode}
          onToggleDarkMode={toggleDarkMode}
          lang={lang}
          onToggleLang={toggleLang}
          isLoggedInGoogle={Boolean(user)}
          isSyncing={isSyncing}
          syncState={syncState}
          pendingTasksCount={productivity.tasks.filter((t) => t.status !== 'completed').length}
        />

        {/* Viewport Content */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-5 lg:p-6 min-w-0">
          {view === 'month' ||
          view === 'week' ||
          view === 'day' ||
          view === 'fourDay' ||
          view === 'year' ||
          view === 'schedule' ? (
            <div className="flex flex-col h-full bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
              <CalendarActionBar
                currentDate={currentDate}
                onPrev={handleNavigatePrev}
                onNext={handleNavigateNext}
                onToday={handleNavigateToday}
                view={view}
                onViewChange={handleViewChange}
                lang={lang}
                categories={categories}
                onToggleCategory={handleToggleCategory}
                onAddCategory={handleAddCategory}
                canUndo={canUndo}
                canRedo={canRedo}
                onUndo={undo}
                onRedo={redo}
                onOpenCreateModal={(type) => openCreateModal(type)}
              />

              <div className="flex-1 overflow-hidden relative">
                {view === 'month' && (
                  <MonthView
                    currentDate={currentDate}
                    events={allEvents}
                    visibleCategoryIds={visibleCategoryIds}
                    onSelectEvent={(ev) => setSelectedEventForDetail(ev)}
                    onCellClick={(dateStr, clientX, clientY) => {
                      handleOpenInlineQuickAdd(dateStr, '09:00', '10:00', clientX, clientY);
                    }}
                    onOpenDayPlanner={(dateStr) => {
                      setDayPlanner({ isOpen: true, dateStr });
                    }}
                    onMoveEvent={handleMoveEvent}
                    lang={lang}
                  />
                )}

                {(view === 'week' || view === 'day' || view === 'fourDay') && (
                  <TimeGridView
                    currentDate={currentDate}
                    viewType={view}
                    events={allEvents}
                    visibleCategoryIds={visibleCategoryIds}
                    onSelectEvent={(ev) => setSelectedEventForDetail(ev)}
                    onSlotClick={(dateStr, timeStr, clientX, clientY) => {
                      const parts = timeStr.split(':');
                      const nextH = Math.min(23, parseInt(parts[0], 10) + 1);
                      const nextTime = `${String(nextH).padStart(2, '0')}:${parts[1]}`;
                      handleOpenInlineQuickAdd(dateStr, timeStr, nextTime, clientX, clientY);
                    }}
                    onSlotRangeSelect={(dateStr, startTime, endTime, clientX, clientY) => {
                      handleOpenInlineQuickAdd(dateStr, startTime, endTime, clientX, clientY);
                    }}
                    lang={lang}
                    dndState={dndState}
                    onStartDrag={startDrag}
                    onStartResize={startResize}
                    onPointerMove={updatePointerMove}
                    onFinishDnD={finishDnD}
                    onCancelDnD={cancelDnD}
                  />
                )}

                {view === 'year' && (
                  <YearView
                    currentDate={currentDate}
                    events={allEvents}
                    visibleCategoryIds={visibleCategoryIds}
                    onSelectDate={(d) => {
                      setCurrentDate(d);
                      setView('day');
                    }}
                    lang={lang}
                  />
                )}

                {view === 'schedule' && (
                  <ScheduleView
                    currentDate={currentDate}
                    events={allEvents}
                    visibleCategoryIds={visibleCategoryIds}
                    searchQuery={searchQuery}
                    onSelectEvent={(ev) => setSelectedEventForDetail(ev)}
                    onToggleCompleteTask={handleToggleCompleteTask}
                    onJoinMeet={(ev) => {
                      if (ev.meetUrl) window.open(ev.meetUrl, '_blank');
                    }}
                    lang={lang}
                  />
                )}
              </div>
            </div>
          ) : (
            <div className="h-full">
              {view === 'analytics' && (
                <TimeAnalyticsView
                  events={allEvents}
                  categories={categories}
                  currentDate={currentDate}
                  lang={lang}
                />
              )}

              {view === 'dashboard' && (
                <ProductivityDashboard
                  events={allEvents}
                  tasks={productivity.tasks}
                  goals={productivity.goals}
                  goalProgress={productivity.goalProgress}
                  sessions={productivity.sessions}
                  transactions={productivity.transactions}
                  budget={productivity.budget}
                  healthLogs={productivity.healthLogs}
                  healthProfile={productivity.healthProfile}
                  lang={lang}
                  onNavigate={handleViewChange}
                  onSetTaskStatus={productivity.setTaskStatus}
                  onOpenEvent={(ev) => setSelectedEventForDetail(ev)}
                  onAddTask={(title) =>
                    productivity.addTask({
                      title,
                      status: 'todo',
                      priority: 'medium',
                      categoryId: 'tasks',
                      dueDate: todayString(),
                    })
                  }
                  habits={productivity.habits}
                  onToggleHabit={productivity.toggleHabitDate}
                  onScheduleTask={(taskId, dateStr, startTime, endTime) => {
                    productivity.updateTask(taskId, { dueDate: dateStr, startTime, endTime });
                  }}
                  currentUser={user}
                  onOpenLifeCopilot={() => setIsLifeCopilotOpen(true)}
                  onQuickAddWater={(ml) => {
                    const today = todayString();
                    const existing = productivity.healthLogs.find((l) => l.date === today);
                    productivity.upsertHealthLog({
                      ...(existing || { date: today, source: 'manual' }),
                      waterMl: (existing?.waterMl || 0) + ml,
                      date: today,
                      source: 'manual',
                    });
                  }}
                  onOpenMacroModal={() => setIsGeminiMacroOpen(true)}
                />
              )}

              {view === 'tasks' && (
                <TasksGoalsView
                  tasks={productivity.tasks}
                  goals={productivity.goals}
                  goalProgress={productivity.goalProgress}
                  categories={categories}
                  lang={lang}
                  onAddTask={productivity.addTask}
                  onUpdateTask={productivity.updateTask}
                  onDeleteTask={productivity.deleteTask}
                  onSetTaskStatus={productivity.setTaskStatus}
                  onToggleSubtask={productivity.toggleSubtask}
                  onAddSubtask={productivity.addSubtask}
                  onRemoveSubtask={productivity.removeSubtask}
                  onAddGoal={productivity.addGoal}
                  onDeleteGoal={productivity.deleteGoal}
                  onOpenTaskOnCalendar={(dateStr) => {
                    setCurrentDate(parseDateString(dateStr));
                    handleViewChange('day');
                  }}
                  onStartFocus={(taskId) => {
                    try {
                      const raw = localStorage.getItem('gcal_focus_timer');
                      if (raw) {
                        const parsed = JSON.parse(raw);
                        parsed.linkedTaskId = taskId;
                        parsed.mode = 'pomodoro';
                        localStorage.setItem('gcal_focus_timer', JSON.stringify(parsed));
                      }
                    } catch {}
                    handleViewChange('focus');
                  }}
                  habits={productivity.habits}
                  onAddHabit={productivity.addHabit}
                  onToggleHabit={productivity.toggleHabitDate}
                  onDeleteHabit={productivity.deleteHabit}
                />
              )}

              {view === 'focus' && (
                <StudyFocusView
                  tasks={productivity.tasks}
                  goals={productivity.goals}
                  sessions={productivity.sessions}
                  lang={lang}
                  onAddSession={productivity.addSession}
                  onDeleteSession={productivity.deleteSession}
                  onStartTask={(taskId) => productivity.setTaskStatus(taskId, 'in_progress')}
                  onOpenTask={(taskId) => {
                    const task = productivity.tasks.find((t) => t.id === taskId);
                    if (task?.dueDate) {
                      setCurrentDate(parseDateString(task.dueDate));
                      handleViewChange('day');
                    } else {
                      handleViewChange('tasks');
                    }
                  }}
                />
              )}

              {view === 'finance' && (
                <FinanceView
                  transactions={productivity.transactions}
                  budget={productivity.budget}
                  lang={lang}
                  onAddTransaction={productivity.addTransaction}
                  onUpdateTransaction={productivity.updateTransaction}
                  onDeleteTransaction={productivity.deleteTransaction}
                  onUpdateBudget={productivity.updateBudget}
                  onClearAllTransactions={productivity.clearAllTransactions}
                  onSetRealStartingBalance={productivity.setRealStartingBalance}
                  onAdjustBalanceWithTransaction={productivity.adjustBalanceWithTransaction}
                  onResetFinance={productivity.resetFinance}
                />
              )}

              {view === 'health' && (
                <HealthView
                  healthLogs={productivity.healthLogs}
                  healthProfile={productivity.healthProfile}
                  workouts={productivity.workouts}
                  lang={lang}
                  onUpsertHealthLog={productivity.upsertHealthLog}
                  onUpdateHealthProfile={productivity.updateHealthProfile}
                  onAddWorkout={productivity.addWorkout}
                  onDeleteWorkout={productivity.deleteWorkout}
                  currentUser={user}
                  onGoogleSignIn={handleGoogleSignIn}
                  ctgProfile={productivity.ctgProfile}
                  onUpdateCtgProfile={productivity.updateCtgProfile}
                  bodyPoints={productivity.bodyPoints}
                  onAddBodyPoint={productivity.addBodyPoint}
                  onUpdateBodyPoint={productivity.updateBodyPoint}
                  onDeleteBodyPoint={productivity.deleteBodyPoint}
                  bodyPhotos={productivity.bodyPhotos}
                  onAddBodyPhoto={productivity.addBodyPhoto}
                  onDeleteBodyPhoto={productivity.deleteBodyPhoto}
                  savedRoadmaps={productivity.savedRoadmaps}
                  onAddSavedRoadmap={productivity.addSavedRoadmap}
                  onDeleteSavedRoadmap={productivity.deleteSavedRoadmap}
                  ctgPeriodizedRoadmap={productivity.ctgPeriodizedRoadmap}
                  savedCtgRoadmaps={productivity.savedCtgRoadmaps}
                  onUpdateCtgPeriodizedRoadmap={productivity.updateCtgPeriodizedRoadmap}
                  onSetActiveRoadmapPhase={productivity.setActiveRoadmapPhase}
                  onSaveCtgRoadmap={productivity.saveCtgRoadmapToList}
                  onDeleteCtgRoadmap={productivity.deleteCtgRoadmapFromList}
                  onSwitchCtgRoadmap={productivity.switchActiveCtgRoadmap}
                  onDeleteCurrentCtgRoadmap={productivity.deleteCurrentCtgRoadmap}
                  customExercises={productivity.customExercises}
                  onAddCustomExercise={productivity.addCustomExercise}
                  onDeleteCustomExercise={productivity.deleteCustomExercise}
                  onApplySplitTemplate={productivity.applySplitTemplate}
                  plannedSessions={productivity.plannedSessions}
                  onAddPlannedSession={productivity.addPlannedSession}
                  onUpdatePlannedSession={productivity.updatePlannedSession}
                  onDeletePlannedSession={productivity.deletePlannedSession}
                  workoutSessions={productivity.workoutSessions}
                  onLogWorkoutSession={productivity.logWorkoutSession}
                  onUpdateWorkoutSession={productivity.updateWorkoutSession}
                  onDeleteWorkoutSession={productivity.deleteWorkoutSession}
                  sportSessions={productivity.sportSessions}
                  onAddSportSession={productivity.addSportSession}
                  onDeleteSportSession={productivity.deleteSportSession}
                  meals={productivity.meals}
                  onAddMealLog={productivity.addMealLog}
                  onUpdateMealLog={productivity.updateMealLog}
                  onDeleteMealLog={productivity.deleteMealLog}
                  nutritionSettings={productivity.nutritionSettings}
                  onUpdateNutritionSettings={productivity.updateNutritionSettings}
                  onScheduleSessionToCalendar={(title, date, color) => {
                    const newEv: CalendarEvent = {
                      id: `scheduled-wo-${Date.now()}`,
                      title: `💪 ${title}`,
                      startDate: date,
                      startTime: '17:30',
                      endDate: date,
                      endTime: '18:45',
                      allDay: false,
                      calendarId: 'health',
                      color,
                      type: 'event',
                      isCompleted: false,
                      createdAt: Date.now(),
                    };
                    setEvents((prev) => [...prev, newEv]);
                  }}
                />
              )}
            </div>
          )}
        </main>
      </div>

      {/* Slide-over Right Drawer for Notes & Tasks */}
      {isRightDrawerOpen && (
        <div className="fixed inset-y-0 right-0 z-50 w-80 sm:w-96 bg-white dark:bg-[#111726] border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right">
          <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <span>{lang === 'vi' ? 'Ghi chú & Tác vụ nhanh' : 'Quick Notes & Tasks'}</span>
            </h3>
            <button
              onClick={() => setIsRightDrawerOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              ✕
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <RightSidebar
              lang={lang}
              events={allEvents}
              tasks={productivity.tasks}
              onAddTask={(title: string) =>
                productivity.addTask({
                  title,
                  status: 'todo',
                  priority: 'medium',
                  categoryId: categories[0]?.id || 'personal',
                  dueDate: formatDateString(new Date()),
                })
              }
              onToggleTask={(taskId: string) => {
                const task = productivity.tasks.find((t) => t.id === taskId);
                productivity.setTaskStatus(taskId, task?.status === 'completed' ? 'todo' : 'completed');
              }}
              onDeleteTask={(taskId: string) => productivity.deleteTask(taskId)}
            />
          </div>
        </div>
      )}

      {/* Mini Inline Event Creation Popover */}
      <MiniEventPopover
        isOpen={miniPopover.isOpen}
        position={miniPopover.position}
        dateStr={miniPopover.dateStr}
        startTime={miniPopover.startTime}
        endTime={miniPopover.endTime}
        categories={categories}
        onSave={handleSaveEvent}
        onOpenFullModal={(dateStr, startTime, endTime, title) => {
          setEventToEdit(null);
          setModalDate(dateStr);
          setModalTime(startTime);
          setIsEventModalOpen(true);
        }}
        onClose={() => setMiniPopover((prev) => ({ ...prev, isOpen: false }))}
        lang={lang}
      />

      {/* Dedicated Day Planner Drawer */}
      <DayPlannerDrawer
        isOpen={dayPlanner.isOpen}
        onClose={() => setDayPlanner((prev) => ({ ...prev, isOpen: false }))}
        selectedDateStr={dayPlanner.dateStr}
        onSelectDate={(dateStr) => setDayPlanner((prev) => ({ ...prev, dateStr }))}
        events={allEvents}
        categories={categories}
        onSelectEvent={(ev) => setSelectedEventForDetail(ev)}
        onAddEventClick={(dateStr, timeStr) => {
          const parts = timeStr.split(':');
          const nextH = Math.min(23, parseInt(parts[0], 10) + 1);
          const nextTime = `${String(nextH).padStart(2, '0')}:${parts[1]}`;
          handleOpenInlineQuickAdd(dateStr, timeStr, nextTime);
        }}
        lang={lang}
      />

      {/* Event Details Floating Card */}
      {selectedEventForDetail && (
        <EventDetailCard
          event={selectedEventForDetail}
          categories={categories}
          onClose={() => setSelectedEventForDetail(null)}
          onEdit={(ev) => {
            setSelectedEventForDetail(null);
            setEventToEdit(ev);
            setIsEventModalOpen(true);
          }}
          onDelete={handleDeleteEvent}
          onToggleComplete={handleToggleCompleteTask}
          onJoinMeet={(ev) => {
            if (ev.meetUrl) window.open(ev.meetUrl, '_blank');
          }}
          lang={lang}
        />
      )}

      {/* Event Create / Edit Full Modal */}
      {isEventModalOpen && (
        <EventModal
          isOpen={isEventModalOpen}
          onClose={() => setIsEventModalOpen(false)}
          eventToEdit={eventToEdit}
          initialDate={modalDate}
          initialTime={modalTime}
          initialType={modalType}
          categories={categories}
          onSave={handleSaveEvent}
          onDelete={handleDeleteEvent}
          lang={lang}
        />
      )}

      {/* Quick Add with Natural Language Modal */}
      <QuickAddModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        onAddEvent={handleSaveEvent}
        currentDate={currentDate}
        lang={lang}
      />

      {/* Keyboard Shortcuts Modal */}
      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
        lang={lang}
      />

      {/* Export & Import Modal */}
      <ExportImportModal
        isOpen={isExportImportOpen}
        onClose={() => setIsExportImportOpen(false)}
        events={events}
        onImportEvents={(imported) => {
          setEvents((prev) => [...imported, ...prev]);
        }}
        onExportProductivityBackup={productivity.snapshot}
        onImportProductivityBackup={productivity.restore}
        onResetEvents={() => {
          setEvents(INITIAL_EVENTS);
          setCategories(DEFAULT_CALENDARS);
          localStorage.removeItem('gcal_events');
          localStorage.removeItem('gcal_categories');
          // The productivity modules keep their own storage keys, so a full
          // reset has to clear them explicitly or the button would look dead
          // for tasks/goals/focus/money/health.
          productivity.resetAll();
        }}
        lang={lang}
      />

      {/* Cloud Sync & iCal Modal */}
      <CloudSyncModal
        isOpen={isCloudSyncOpen}
        onClose={() => setIsCloudSyncOpen(false)}
        user={user}
        onGoogleSignIn={handleGoogleSignIn}
        onGoogleSignOut={handleGoogleSignOut}
        events={events}
        categories={categories}
        onImportEvents={(imported) => {
          setEvents((prev) => {
            const map = new Map(prev.map((e) => [e.id, e]));
            for (const item of imported) {
              map.set(item.id, item);
            }
            return Array.from(map.values());
          });
          setLastSyncedTime(new Date().toLocaleTimeString(lang === 'vi' ? 'vi-VN' : 'en-US'));
          setSyncState('synced');
        }}
        syncState={syncState}
        lastSyncedTime={lastSyncedTime}
        lang={lang}
        onSyncGoogleCalendar={handleSyncGoogleCalendar}
        onCreateNewAccount={handleCreateNewAccount}
      />

      {/* Multi-Hub: Đồng bộ Google & Quản lý Cuộc sống (Pomodoro, Tài chính, Học tập, Sức khỏe) */}
      <MultiHubDrawer
        isOpen={isMultiHubOpen}
        onClose={() => setIsMultiHubOpen(false)}
        events={allEvents}
        user={user}
        onGoogleSignIn={handleGoogleSignIn}
        onGoogleSignOut={handleGoogleSignOut}
        onSyncGoogleCalendar={handleSyncGoogleCalendar}
        isSyncing={isSyncing}
        lastSyncedTime={lastSyncedTime}
        lang={lang}
        onNavigate={handleViewChange}
        store={productivity}
        categories={categories}
      />

      {/* Global Gemini AI Macro Studio Modal */}
      <GeminiMacroModal
        isOpen={isGeminiMacroOpen}
        onClose={() => setIsGeminiMacroOpen(false)}
        onApplyGeminiMacros={handleApplyGeminiMacros}
        selectedDate={formatDateString(currentDate)}
      />

      {/* Global Life Copilot AI Assistant Modal */}
      <LifeCopilotModal
        isOpen={isLifeCopilotOpen}
        onClose={() => setIsLifeCopilotOpen(false)}
        lang={lang}
        store={productivity}
        events={allEvents}
        onAddEvent={handleSaveEvent}
        onNavigate={handleViewChange}
        currentDate={currentDate}
      />
    </div>
  );
}

