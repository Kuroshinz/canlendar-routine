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
  DEFAULT_CALENDARS,
} from './types/calendar';
import { INITIAL_EVENTS } from './data/initialEvents';
import { formatDateString } from './utils/calendarUtils';
import { playNotificationSound } from './utils/sound';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { MonthView } from './components/MonthView';
import { TimeGridView } from './components/TimeGridView';
import { YearView } from './components/YearView';
import { ScheduleView } from './components/ScheduleView';
import { EventModal } from './components/EventModal';
import { EventDetailCard } from './components/EventDetailCard';
import { QuickAddModal } from './components/QuickAddModal';
import { ShortcutsModal } from './components/ShortcutsModal';
import { ExportImportModal } from './components/ExportImportModal';
import { RightSidebar } from './components/RightSidebar';
import { GoogleMeetRoom } from './components/GoogleMeetRoom';
import { MultiHubDrawer } from './components/MultiHubDrawer';
import { User } from 'firebase/auth';
import { initAuth, googleSignIn, logout, getAccessToken } from './services/auth';
import { fetchGoogleCalendarEvents, createGoogleCalendarEvent } from './services/googleCalendarSync';
import { Bell } from 'lucide-react';

export default function App() {
  // 1. Language state (defaults to Vietnamese as requested)
  const [lang, setLang] = useState<'vi' | 'en'>(() => {
    return (localStorage.getItem('gcal_lang') as 'vi' | 'en') || 'vi';
  });

  // 2. Dark mode state
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('gcal_theme') === 'dark';
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('gcal_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
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
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date(2026, 9, 29)); // Default to Oct 29, 2026
  const [view, setView] = useState<CalendarViewType>(() => {
    return (localStorage.getItem('gcal_view') as CalendarViewType) || 'month';
  });

  const handleViewChange = (newView: CalendarViewType) => {
    setView(newView);
    localStorage.setItem('gcal_view', newView);
  };

  // 4. Events & Categories persistence
  const [events, setEvents] = useState<CalendarEvent[]>(() => {
    try {
      const saved = localStorage.getItem('gcal_events');
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_EVENTS;
  });

  const [categories, setCategories] = useState<CalendarCategory[]>(() => {
    try {
      const saved = localStorage.getItem('gcal_categories');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_CALENDARS;
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
  const [activeMeetEvent, setActiveMeetEvent] = useState<CalendarEvent | null>(null);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isExportImportOpen, setIsExportImportOpen] = useState(false);
  const [isMultiHubOpen, setIsMultiHubOpen] = useState(false);

  // Google OAuth & Sync State
  const [user, setUser] = useState<User | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncedTime, setLastSyncedTime] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = initAuth(
      (authedUser) => {
        setUser(authedUser);
      },
      () => {
        setUser(null);
      }
    );
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

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
      // Ignore if user is inside an input or textarea
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
        return;
      }

      if (e.key === 't' || e.key === 'T') {
        handleNavigateToday();
      } else if (e.key === 'j' || e.key === 'n') {
        handleNavigateNext();
      } else if (e.key === 'k' || e.key === 'p') {
        handleNavigatePrev();
      } else if (e.key === 'm' || e.key === 'M') {
        handleViewChange('month');
      } else if (e.key === 'w' || e.key === 'W') {
        handleViewChange('week');
      } else if (e.key === 'd' || e.key === 'D') {
        handleViewChange('day');
      } else if (e.key === 'a' || e.key === 'A') {
        handleViewChange('schedule');
      } else if (e.key === 'y' || e.key === 'Y') {
        handleViewChange('year');
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
  }, [handleNavigateToday, handleNavigateNext, handleNavigatePrev]);

  // Reminder alert checker
  useEffect(() => {
    const timer = setInterval(() => {
      const todayStr = formatDateString(new Date());
      const nowH = new Date().getHours();
      const nowM = new Date().getMinutes();
      const nowTotalMin = nowH * 60 + nowM;

      for (const ev of events) {
        if (!ev.allDay && ev.startDate === todayStr && ev.startTime) {
          const [eh, em] = ev.startTime.split(':').map(Number);
          const evTotalMin = eh * 60 + em;
          const diff = evTotalMin - nowTotalMin;

          // Alert if event starts in 10 minutes
          if (diff === 10) {
            playNotificationSound();
            setActiveAlert({
              title: ev.title,
              time: ev.startTime,
            });
            break;
          }
        }
      }
    }, 60000);

    return () => clearInterval(timer);
  }, [events]);

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

  // Google Sync & Auth Handlers
  const handleGoogleSignIn = async () => {
    try {
      const res = await googleSignIn();
      if (res?.user) {
        setUser(res.user);
        if (res.accessToken) {
          await handleSyncGoogleCalendar(res.accessToken);
        }
      }
    } catch (err) {
      console.error('Google Sign In failed:', err);
    }
  };

  const handleGoogleSignOut = async () => {
    try {
      await logout();
      setUser(null);
    } catch (err) {
      console.error('Sign Out failed:', err);
    }
  };

  const handleSyncGoogleCalendar = async (explicitToken?: string) => {
    setIsSyncing(true);
    try {
      const token = explicitToken || (await getAccessToken());
      if (!token) {
        await handleGoogleSignIn();
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
    } catch (err) {
      console.error('Failed to sync Google Calendar:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Event handlers
  const handleSaveEvent = (savedEvent: CalendarEvent) => {
    setEvents((prev) => {
      const idx = prev.findIndex((e) => e.id === savedEvent.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = savedEvent;
        return copy;
      }
      return [savedEvent, ...prev];
    });

    // Background push to Google Calendar if signed in
    getAccessToken()
      .then((token) => {
        if (token && !savedEvent.id.startsWith('gcal-')) {
          createGoogleCalendarEvent(token, savedEvent).catch((e) =>
            console.warn('Background sync error:', e)
          );
        }
      })
      .catch(() => {});
  };

  const handleDeleteEvent = (eventId: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== eventId));
    if (selectedEventForDetail?.id === eventId) {
      setSelectedEventForDetail(null);
    }
  };

  const handleToggleCompleteTask = (eventId: string) => {
    setEvents((prev) =>
      prev.map((e) => (e.id === eventId ? { ...e, isCompleted: !e.isCompleted } : e))
    );
  };

  const handleMoveEvent = (eventId: string, newDateStr: string) => {
    setEvents((prev) =>
      prev.map((e) => {
        if (e.id === eventId) {
          return {
            ...e,
            startDate: newDateStr,
            endDate: newDateStr,
          };
        }
        return e;
      })
    );
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans antialiased">
      {/* Reminder Banner Toast */}
      {activeAlert && (
        <div className="bg-blue-600 text-white px-4 py-2.5 text-xs flex items-center justify-between shadow-md z-50 animate-in slide-in-from-top">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 animate-bounce" />
            <span className="font-semibold">
              {lang === 'vi' ? 'Nhắc nhở sự kiện sắp tới:' : 'Upcoming event reminder:'}
            </span>
            <span>
              {activeAlert.title} ({activeAlert.time})
            </span>
          </div>
          <button
            onClick={() => setActiveAlert(null)}
            className="px-2 py-0.5 bg-blue-700 hover:bg-blue-800 rounded font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Google Calendar Header */}
      <Header
        currentDate={currentDate}
        view={view}
        onViewChange={handleViewChange}
        onNavigatePrev={handleNavigatePrev}
        onNavigateNext={handleNavigateNext}
        onNavigateToday={handleNavigateToday}
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenQuickAdd={() => setIsQuickAddOpen(true)}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
        onOpenExportImport={() => setIsExportImportOpen(true)}
        onOpenMultiHub={() => setIsMultiHubOpen(true)}
        lang={lang}
        onToggleLang={toggleLang}
        darkMode={darkMode}
        onToggleDarkMode={toggleDarkMode}
        userEmail={user?.email || 'nghuyenthiennhannghuyen@gmail.com'}
        isLoggedInGoogle={Boolean(user)}
        isSyncing={isSyncing}
        events={events}
        onSelectEvent={(ev) => setSelectedEventForDetail(ev)}
      />

      {/* Main Body Area: Sidebar + Active View + Right Utility Dock */}
      <div className="flex-1 flex overflow-hidden relative">
        <Sidebar
          currentDate={currentDate}
          onSelectDate={(d) => {
            setCurrentDate(d);
            // On mobile close sidebar upon picking date
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
        />

        {/* View Grid Switcher */}
        <main className="flex-1 flex flex-col h-full overflow-hidden bg-white dark:bg-gray-900 relative">
          {view === 'month' && (
            <MonthView
              currentDate={currentDate}
              events={events}
              visibleCategoryIds={visibleCategoryIds}
              onSelectEvent={(ev) => setSelectedEventForDetail(ev)}
              onCellClick={(dateStr) => openCreateModal('event', dateStr)}
              onMoveEvent={handleMoveEvent}
              lang={lang}
            />
          )}

          {(view === 'week' || view === 'day' || view === 'fourDay') && (
            <TimeGridView
              currentDate={currentDate}
              viewType={view}
              events={events}
              visibleCategoryIds={visibleCategoryIds}
              onSelectEvent={(ev) => setSelectedEventForDetail(ev)}
              onSlotClick={(dateStr, timeStr) => openCreateModal('event', dateStr, timeStr)}
              lang={lang}
            />
          )}

          {view === 'year' && (
            <YearView
              currentDate={currentDate}
              events={events}
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
              events={events}
              visibleCategoryIds={visibleCategoryIds}
              searchQuery={searchQuery}
              onSelectEvent={(ev) => setSelectedEventForDetail(ev)}
              onToggleCompleteTask={handleToggleCompleteTask}
              onJoinMeet={(ev) => setActiveMeetEvent(ev)}
              lang={lang}
            />
          )}
        </main>

        {/* Right Google Workspace Utility Dock (Keep, Tasks, Contacts, Maps) */}
        <RightSidebar lang={lang} />
      </div>

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
            setSelectedEventForDetail(null);
            setActiveMeetEvent(ev);
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
        onResetEvents={() => {
          setEvents(INITIAL_EVENTS);
          setCategories(DEFAULT_CALENDARS);
          localStorage.removeItem('gcal_events');
          localStorage.removeItem('gcal_categories');
        }}
        lang={lang}
      />

      {/* Google Meet In-App Room Simulator */}
      {activeMeetEvent && (
        <GoogleMeetRoom
          event={activeMeetEvent}
          onLeave={() => setActiveMeetEvent(null)}
          lang={lang}
        />
      )}

      {/* Multi-Hub: Đồng bộ Google & Quản lí Cuộc sống (Thời gian, Tiền tệ, Học tập, Stress) */}
      <MultiHubDrawer
        isOpen={isMultiHubOpen}
        onClose={() => setIsMultiHubOpen(false)}
        events={events}
        user={user}
        onGoogleSignIn={handleGoogleSignIn}
        onGoogleSignOut={handleGoogleSignOut}
        onSyncGoogleCalendar={handleSyncGoogleCalendar}
        isSyncing={isSyncing}
        lastSyncedTime={lastSyncedTime}
        lang={lang}
      />
    </div>
  );
}
