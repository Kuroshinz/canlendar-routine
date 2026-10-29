import React, { useState } from 'react';
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

interface NoteItem {
  id: string;
  title: string;
  content: string;
  color: string;
}

interface QuickTaskItem {
  id: string;
  text: string;
  completed: boolean;
  dueDate?: string;
}

interface RightSidebarProps {
  lang: 'vi' | 'en';
}

export const RightSidebar: React.FC<RightSidebarProps> = ({ lang }) => {
  const [activePanel, setActivePanel] = useState<'keep' | 'tasks' | 'contacts' | 'maps' | null>(null);

  // Keep Notes state
  const [notes, setNotes] = useState<NoteItem[]>([
    {
      id: 'n-1',
      title: 'Ý tưởng Sprint 42',
      content: 'Tối ưu hoá hiệu năng lưới lịch khi có >100 sự kiện và bổ sung phím tắt nhanh.',
      color: '#FEF3C7', // soft yellow
    },
    {
      id: 'n-2',
      title: 'Địa chỉ nhà hàng họp nhóm',
      content: 'Pizza 4P\'s Saigon Centre - Đặt bàn lúc 12:00, liên hệ Hương Mai.',
      color: '#E0F2FE', // soft blue
    },
  ]);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');

  // Tasks state
  const [tasks, setTasks] = useState<QuickTaskItem[]>([
    { id: 't-1', text: 'Gửi biên bản cuộc họp sáng nay', completed: true, dueDate: 'Hôm nay' },
    { id: 't-2', text: 'Cập nhật tài liệu kỹ thuật API', completed: false, dueDate: '30 thg 10' },
    { id: 't-3', text: 'Chuẩn bị slide thuyết trình demo', completed: false, dueDate: '31 thg 10' },
  ]);
  const [newTaskInput, setNewTaskInput] = useState('');

  const handleToggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskInput.trim()) return;
    setTasks((prev) => [
      ...prev,
      {
        id: `t-${Date.now()}`,
        text: newTaskInput.trim(),
        completed: false,
        dueDate: lang === 'vi' ? 'Hôm nay' : 'Today',
      },
    ]);
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
                  {tasks.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => handleToggleTask(t.id)}
                      className="flex items-start gap-2.5 p-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer border border-transparent hover:border-gray-200 dark:hover:border-gray-700"
                    >
                      <div className="pt-0.5">
                        <CheckCircle2
                          className={`w-4 h-4 transition-colors ${
                            t.completed
                              ? 'text-blue-600 fill-blue-100 dark:fill-blue-950'
                              : 'text-gray-400 hover:text-blue-500'
                          }`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-xs text-gray-800 dark:text-gray-200 ${
                            t.completed ? 'line-through text-gray-400 dark:text-gray-500' : ''
                          }`}
                        >
                          {t.text}
                        </p>
                        {t.dueDate && (
                          <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                            {t.dueDate}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Contacts Panel */}
            {activePanel === 'contacts' && (
              <div className="space-y-2">
                {[
                  { name: 'Nhân Nguyễn', email: 'nghuyenthiennhannghuyen@gmail.com', role: 'Chủ sở hữu' },
                  { name: 'Hương Mai', email: 'designer@company.com', role: 'Lead UI/UX' },
                  { name: 'Tuấn Anh', email: 'dev.lead@company.com', role: 'Tech Lead' },
                  { name: 'David Trần', email: 'client.director@partner.com', role: 'Khách hàng đối tác' },
                ].map((c, i) => (
                  <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40">
                    <div className="w-8 h-8 rounded-full bg-linear-to-tr from-blue-500 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                      {c.name[0]}
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
                {[
                  { name: 'Pizza 4P\'s Saigon Centre', addr: '65 Lê Lợi, Bến Nghé, Quận 1, TP.HCM' },
                  { name: 'California Fitness & Yoga Club', addr: 'Tầng 3, Crescent Mall, Quận 7' },
                  { name: 'Trung tâm Hội nghị Quốc gia', addr: 'Đại lộ Thăng Long, Mễ Trì, Hà Nội' },
                  { name: 'Phòng họp Paris (Tầng 5)', addr: 'Trụ sở chính công ty' },
                ].map((loc, i) => (
                  <div key={i} className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                    <div className="flex items-center gap-1.5 font-semibold text-gray-800 dark:text-gray-100 mb-1">
                      <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                      <span>{loc.name}</span>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 text-[11px]">{loc.addr}</p>
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

