import React from 'react';
import { X, Keyboard } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'vi' | 'en';
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose, lang }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'T', descVi: 'Di chuyển về ngày hôm nay', descEn: 'Go to today' },
    { key: 'J / K', descVi: 'Kỳ tiếp theo / Kỳ trước đó', descEn: 'Next / previous date period' },
    { key: 'M', descVi: 'Chuyển sang chế độ xem Tháng', descEn: 'Month view' },
    { key: 'W', descVi: 'Chuyển sang chế độ xem Tuần', descEn: 'Week view' },
    { key: 'D', descVi: 'Chuyển sang chế độ xem Ngày', descEn: 'Day view' },
    { key: 'X', descVi: 'Chuyển sang chế độ xem 4 Ngày', descEn: '4-Day view' },
    { key: 'A', descVi: 'Chuyển sang Lịch biểu (Schedule)', descEn: 'Schedule / Agenda view' },
    { key: 'P', descVi: 'Mở Bảng Phân Tích Năng Suất', descEn: 'Productivity Analytics view' },
    { key: 'Y', descVi: 'Chuyển sang chế độ xem Năm', descEn: 'Year view' },
    { key: '1', descVi: 'Mở Tổng quan năng suất', descEn: 'Productivity dashboard' },
    { key: '2', descVi: 'Mở Công việc & Mục tiêu', descEn: 'Tasks & Goals' },
    { key: '3', descVi: 'Mở Đồng hồ học tập (Pomodoro)', descEn: 'Study clock (Pomodoro)' },
    { key: '4', descVi: 'Mở Quản lý tài chính', descEn: 'Money manager' },
    { key: '5', descVi: 'Mở Sức khỏe & Thể hình', descEn: 'Health & Fitness' },
    { key: 'C', descVi: 'Tạo mới sự kiện', descEn: 'Create event' },
    { key: 'Ctrl + Z', descVi: 'Hoàn tác di chuyển / co giãn sự kiện', descEn: 'Undo drag / resize' },
    { key: 'Ctrl + Shift + Z', descVi: 'Làm lại thao tác vừa hoàn tác', descEn: 'Redo move / resize' },
    { key: '/', descVi: 'Tìm kiếm nhanh sự kiện', descEn: 'Focus search' },
    { key: 'Esc', descVi: 'Hủy kéo thả hoặc đóng hộp thoại', descEn: 'Cancel drag or close active modal' },
    { key: '?', descVi: 'Hiển thị danh sách phím tắt này', descEn: 'Show keyboard shortcuts' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/45 backdrop-blur-2xs">
      <div className="bg-white dark:bg-[#1a1e24] rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95">
        <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-base font-bold text-gray-800 dark:text-gray-100">
              {lang === 'vi' ? 'Phím tắt trên bàn phím' : 'Keyboard Shortcuts'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 max-h-[70vh] overflow-y-auto space-y-2">
          {shortcuts.map((sc, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0"
            >
              <span className="text-xs text-gray-700 dark:text-gray-300">
                {lang === 'vi' ? sc.descVi : sc.descEn}
              </span>
              <kbd className="px-2.5 py-1 text-xs font-mono font-semibold bg-gray-100 dark:bg-[#242931] text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-md shadow-2xs">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

