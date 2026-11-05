import React, { useState, useEffect, useMemo } from 'react';
import {
  CheckSquare,
  FileText,
  Users,
  MapPin,
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
  CheckCircle2,
  X,
} from 'lucide-react';
import { TaskItem, TaskPriority, TASK_PRIORITY_META } from '../types/productivity';
import { CalendarEvent } from '../types/calendar';

interface NoteItem {
  id: string;
  title: string;
  content: string;
  color: string;
}

interface RightSidebarProps {
  lang: 'vi' | 'en';
  tasks?: TaskItem[];
  events?: CalendarEvent[];
  onAddTask?: (title: string) => void;
  onToggleTask?: (taskId: string) => void;
  onDeleteTask?: (taskId: string) => void;
}

const DEFAULT_NOTES: NoteItem[] = [
  {
    id: 'n-1',
    title: 'Ý tưởng Sprint 42',
    content: 'Tối ưu hoá hiệu năng lưới lịch khi có >100 sự kiện và bổ sung phím tắt nhanh.',
    color: '#FEF3C7',
  },
  {
    id: 'n-2',
    title: 'Địa chỉ nhà hàng họp nhóm',
    content: "Pizza 4P's Saigon Centre - Đặt bàn lúc 12:00, liên hệ Hương Mai.",
    color: '#E0F2FE',
  },
];

export const RightSidebar: React.FC<RightSidebarProps> = ({
  lang,
  tasks: sharedTasks,
  events,
  onAddTask: onSharedAddTask,
  onToggleTask: onSharedToggleTask,
  onDeleteTask: onSharedDeleteTask,
}) => {
  const [activePanel, setActivePanel] = useState<'keep' | 'tasks' | 'contacts' | 'maps' | null>(null);

  // Keep Notes state (persisted to localStorage)
  const [notes, setNotes] = useState<NoteItem[]>(() => {
    try {
      const saved = localStorage.getItem('gcal_keep_notes');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_NOTES;
  });

  useEffect(() => {
    try {
      localStorage.setItem('gcal_keep_notes', JSON.stringify(notes));
    } catch {}
  }, [notes]);

  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');

  // Fallback local tasks when shared tasks are not provided
  const [localTasks, setLocalTasks] = useState<TaskItem[]>([
    {
      id: 't-1',
      title: 'Gửi biên bản cuộc họp sáng nay',
      status: 'completed',
      priority: 'medium',
      categoryId: 'work',
      dueDate: 'Hôm nay',
      subtasks: [],
      createdAt: Date.now(),
    },
    {
      id: 't-2',
      title: 'Cập nhật tài liệu kỹ thuật API',
      status: 'todo',
      priority: 'high',
      categoryId: 'work',
      dueDate: '30 thg 10',
      subtasks: [],
      createdAt: Date.now(),
    },
  ]);
  const [newTaskInput, setNewTaskInput] = useState('');

  const displayTasks = sharedTasks ?? localTasks;

  // Dynamic contacts list: team defaults + attendees found in calendar events
  const displayContacts = useMemo(() => {
    const defaultContacts = [
      { name: 'Nhân Nguyễn', email: 'nghuyenthiennhannghuyen@gmail.com', role: lang === 'vi' ? 'Chủ sở hữu' : 'Owner' },
      { name: 'Hương Mai', email: 'designer@company.com', role: 'Lead UI/UX' },
      { name: 'Tuấn Anh', email: 'dev.lead@company.com', role: 'Tech Lead' },
      { name: 'David Trần', email: 'client.director@partner.com', role: lang === 'vi' ? 'Khách hàng đối tác' : 'Partner Director' },
    ];
    if (!events || events.length === 0) return defaultContacts;

    const guestMap = new Map<string, { name: string; email: string; role: string }>();
    for (const c of defaultContacts) {
      guestMap.set(c.email.toLowerCase(), c);
    }

    for (const ev of events) {
      if (ev.guests && Array.isArray(ev.guests)) {
        for (const g of ev.guests) {
          const email = (g.email || '').toLowerCase().trim();
          if (email && !guestMap.has(email)) {
            guestMap.set(email, {
              name: g.name || email.split('@')[0],
              email,
              role: lang === 'vi' ? 'Khách mời sự kiện' : 'Event attendee',
            });
          }
        }
      }
    }
    return Array.from(guestMap.values());
  }, [events, lang]);

  // Dynamic locations list: default landmarks + locations found in calendar events
  const displayLocations = useMemo(() => {
    const defaultLocations = [
      { name: "Pizza 4P's Saigon Centre", addr: '65 Lê Lợi, Bến Nghé, Quận 1, TP.HCM' },
      { name: 'California Fitness & Yoga Club', addr: 'Tầng 3, Crescent Mall, Quận 7' },
      { name: 'Trung tâm Hội nghị Quốc gia', addr: 'Đại lộ Thăng Long, Mễ Trì, Hà Nội' },
      { name: 'Phòng họp Paris (Tầng 5)', addr: 'Trụ sở chính công ty' },
    ];
    if (!events || events.length === 0) return defaultLocations;

    const locMap = new Map<string, { name: string; addr: string }>();
    for (const l of defaultLocations) {
      locMap.set(l.addr.toLowerCase(), l);
    }

    for (const ev of events) {
      if (ev.location && ev.location.trim()) {
        const addr = ev.location.trim();
        if (!locMap.has(addr.toLowerCase())) {
          locMap.set(addr.toLowerCase(), {
            name: ev.title,
            addr,
          });
        }
      }
    }
    return Array.from(locMap.values());
  }, [events]);

  const handleToggleTask = (id: string) => {
    if (onSharedToggleTask) {
      onSharedToggleTask(id);
    } else {
      setLocalTasks((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, status: t.status === 'completed' ? 'todo' : 'completed' } : t
        )
      );
    }
  };

  const handleDeleteTask = (id: string) => {
    if (onSharedDeleteTask) {
      onSharedDeleteTask(id);
    } else {
      setLocalTasks((prev) => prev.filter((t) => t.id !== id));
    }
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    const title = newTaskInput.trim();
    if (!title) return;
    if (onSharedAddTask) {
      onSharedAddTask(title);
    } else {
      setLocalTasks((prev) => [
        {
          id: `t-${Date.now()}`,
          title,
          status: 'todo',
          priority: 'medium',
          categoryId: 'work',
          dueDate: lang === 'vi' ? 'Hôm nay' : 'Today',
          subtasks: [],
          createdAt: Date.now(),
        },
        ...prev,
      ]);
    }
    setNewTaskInput('');
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteTitle.trim() && !newNoteContent.trim()) return;
    const colors = ['#FEF3C7', '#E0F2FE', '#DCFCE7', '#FCE7F3', '#F3E8FF'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    setNotes((prev) => [
      {
        id: `n-${Date.now()}`,
        title: newNoteTitle.trim() || (lang === 'vi' ? 'Ghi chú mới' : 'New note'),
        content: newNoteContent.trim(),
        color: randomColor,
      },
      ...prev,
    ]);
    setNewNoteTitle('');
    setNewNoteContent('');
  };

  const handleDeleteNote = (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <div className="hidden md:flex relative z-20 shrink-0">
      {/* Slide-out Drawer Panel when an icon is selected */}
      {activePanel && (
        <div className="w-80 bg-white dark:bg-[#1a1e24] border-l border-gray-200 dark:border-gray-800 shadow-xl flex flex-col h-full animate-in slide-in-from-right duration-200">
          {/* Drawer Header */}
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {activePanel === 'keep' && (
                <>
                  <div className="w-6 h-6 rounded-md bg-amber-400 flex items-center justify-center text-white font-bold text-xs">
                    <FileText className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                    Google Keep
                  </h3>
                </>
              )}
              {activePanel === 'tasks' && (
                <>
                  <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
                    <CheckSquare className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                    Google Tasks
                  </h3>
                </>
              )}
              {activePanel === 'contacts' && (
                <>
                  <div className="w-6 h-6 rounded-md bg-indigo-600 flex items-center justify-center text-white font-bold text-xs">
                    <Users className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                    {lang === 'vi' ? 'Danh bạ' : 'Contacts'}
                  </h3>
                </>
              )}
              {activePanel === 'maps' && (
                <>
                  <div className="w-6 h-6 rounded-md bg-emerald-600 flex items-center justify-center text-white font-bold text-xs">
                    <MapPin className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                    Google Maps
                  </h3>
                </>
              )}
            </div>

            <button
              onClick={() => setActivePanel(null)}
              className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-[#242931] text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Drawer Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Google Keep Panel */}
            {activePanel === 'keep' && (
              <div className="space-y-3">
                <form onSubmit={handleAddNote} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 space-y-2">
                  <input
                    type="text"
                    value={newNoteTitle}
                    onChange={(e) => setNewNoteTitle(e.target.value)}
                    placeholder={lang === 'vi' ? 'Tiêu đề ghi chú...' : 'Title...'}
                    className="w-full text-xs font-semibold px-2 py-1 bg-transparent border-b border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none"
                  />
                  <textarea
                    rows={2}
                    value={newNoteContent}
                    onChange={(e) => setNewNoteContent(e.target.value)}
                    placeholder={lang === 'vi' ? 'Tạo một ghi chú...' : 'Take a note...'}
                    className="w-full text-xs px-2 py-1 bg-transparent text-gray-700 dark:text-gray-200 focus:outline-none resize-none"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={!newNoteTitle.trim() && !newNoteContent.trim()}
                      className="px-3 py-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white rounded-md text-xs font-medium cursor-pointer"
                    >
                      {lang === 'vi' ? 'Lưu' : 'Done'}
                    </button>
                  </div>
                </form>

                <div className="space-y-2">
                  {notes.map((n) => (
                    <div
                      key={n.id}
                      style={{ backgroundColor: n.color }}
                      className="p-3 rounded-xl shadow-xs text-gray-900 border border-black/5 relative group"
                    >
                      <h4 className="font-semibold text-xs mb-1">{n.title}</h4>
                      <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">
                        {n.content}
                      </p>
                      <button
                        onClick={() => handleDeleteNote(n.id)}
                        className="opacity-0 group-hover:opacity-100 absolute top-2 right-2 p-1 text-gray-500 hover:text-red-600 transition-opacity cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Google Tasks Panel */}
            {activePanel === 'tasks' && (
              <div className="space-y-3">
                <form onSubmit={handleAddTask} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newTaskInput}
                    onChange={(e) => setNewTaskInput(e.target.value)}
                    placeholder={lang === 'vi' ? 'Thêm một tác vụ...' : 'Add a task...'}
                    className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-xs text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-800 focus:outline-blue-500"
                  />
                  <button
                    type="submit"
                    className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs cursor-pointer shadow-xs"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </form>

                <div className="space-y-1.5">
                  {displayTasks.map((t) => {
                    const isCompleted = t.status === 'completed';
                    const priorityMeta = TASK_PRIORITY_META[t.priority];
                    return (
                      <div
                        key={t.id}
                        className="group flex items-start gap-2.5 p-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-700"
                      >
                        <button
                          type="button"
                          onClick={() => handleToggleTask(t.id)}
                          className="pt-0.5 cursor-pointer text-left"
                          title={isCompleted ? (lang === 'vi' ? 'Đánh dấu chưa xong' : 'Mark as todo') : (lang === 'vi' ? 'Đánh dấu hoàn thành' : 'Mark as completed')}
                        >
                          <CheckCircle2
                            className={`w-4 h-4 transition-colors ${
                              isCompleted
                                ? 'text-blue-600 fill-blue-100 dark:fill-blue-950'
                                : 'text-gray-400 hover:text-blue-500'
                            }`}
                          />
                        </button>
                        <div
                          className="flex-1 min-w-0 cursor-pointer"
                          onClick={() => handleToggleTask(t.id)}
                        >
                          <p
                            className={`text-xs text-gray-800 dark:text-gray-200 ${
                              isCompleted ? 'line-through text-gray-400 dark:text-gray-500' : ''
                            }`}
                          >
                            {t.title}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            {t.dueDate && (
                              <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                                {t.dueDate}
                              </span>
                            )}
                            {priorityMeta && (
                              <span
                                className={`text-[9px] px-1.5 py-0.5 rounded-md font-semibold border ${priorityMeta.badgeClass}`}
                              >
                                {lang === 'vi' ? priorityMeta.labelVi : priorityMeta.label}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTask(t.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-opacity cursor-pointer shrink-0"
                          title={lang === 'vi' ? 'Xoá tác vụ' : 'Delete task'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                  {displayTasks.length === 0 && (
                    <p className="text-center text-xs text-gray-400 py-4">
                      {lang === 'vi' ? 'Chưa có tác vụ nào' : 'No tasks yet'}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Contacts Panel */}
            {activePanel === 'contacts' && (
              <div className="space-y-2">
                {displayContacts.map((c, i) => (
                  <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40">
                    <div className="w-8 h-8 rounded-full bg-linear-to-tr from-blue-500 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                      {c.name[0]?.toUpperCase() || 'U'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-800 dark:text-gray-100 truncate">{c.name}</p>
                      <p className="text-[11px] text-gray-400 truncate">{c.email}</p>
                      <span className="text-[10px] text-blue-600 dark:text-blue-400">{c.role}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Maps Panel */}
            {activePanel === 'maps' && (
              <div className="space-y-3 text-xs">
                <p className="text-gray-500 dark:text-gray-400">
                  {lang === 'vi' ? 'Vị trí sự kiện đã lưu trên lịch:' : 'Saved event locations on calendar:'}
                </p>
                {displayLocations.map((loc, i) => (
                  <div key={i} className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                    <div className="flex items-center gap-1.5 font-semibold text-gray-800 dark:text-gray-100 mb-1">
                      <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                      <span className="truncate">{loc.name}</span>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 text-[11px] truncate">{loc.addr}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Right Icon Strip */}
      <div className="w-14 border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col items-center py-4 justify-between select-none">
        <div className="flex flex-col items-center gap-3">
          {/* Keep Icon */}
          <button
            onClick={() => setActivePanel(activePanel === 'keep' ? null : 'keep')}
            title="Google Keep"
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              activePanel === 'keep'
                ? 'bg-amber-100 dark:bg-amber-950 text-amber-600 ring-2 ring-amber-400'
                : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-amber-500'
            }`}
          >
            <FileText className="w-5 h-5" />
          </button>

          {/* Tasks Icon */}
          <button
            onClick={() => setActivePanel(activePanel === 'tasks' ? null : 'tasks')}
            title="Google Tasks"
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              activePanel === 'tasks'
                ? 'bg-blue-100 dark:bg-blue-950 text-blue-600 ring-2 ring-blue-500'
                : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-blue-600 dark:text-blue-400'
            }`}
          >
            <CheckSquare className="w-5 h-5" />
          </button>

          {/* Contacts Icon */}
          <button
            onClick={() => setActivePanel(activePanel === 'contacts' ? null : 'contacts')}
            title={lang === 'vi' ? 'Danh bạ' : 'Contacts'}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              activePanel === 'contacts'
                ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-600 ring-2 ring-indigo-500'
                : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-indigo-500'
            }`}
          >
            <Users className="w-5 h-5" />
          </button>

          {/* Maps Icon */}
          <button
            onClick={() => setActivePanel(activePanel === 'maps' ? null : 'maps')}
            title="Google Maps"
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              activePanel === 'maps'
                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 ring-2 ring-emerald-500'
                : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-emerald-500'
            }`}
          >
            <MapPin className="w-5 h-5" />
          </button>

          <div className="w-6 h-px bg-gray-200 dark:bg-gray-800 my-1" />

          {/* Plus Add-on button */}
          <button
            onClick={() => setActivePanel(activePanel ? null : 'keep')}
            title={lang === 'vi' ? 'Tiện ích bổ sung' : 'Get add-ons'}
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 transition-colors cursor-pointer"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Toggle Panel Chevron at bottom */}
        <button
          onClick={() => setActivePanel(activePanel ? null : 'keep')}
          title={activePanel ? 'Đóng bảng tiện ích' : 'Mở bảng tiện ích'}
          className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
        >
          {activePanel ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};

