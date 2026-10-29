# Tài Liệu Đặc Tả Thiết Kế: Smart Google Calendar Pro (Cải Tiến & Mở Rộng)

- **Ngày tạo**: 2026-10-29
- **Dự án**: `D:\Download\google-calendar---lịch-thông-minh`
- **Trạng thái**: Đã phê duyệt (Approved)

---

## 1. Mục Tiêu & Tầm Nhìn Dự Án

Nâng cấp ứng dụng Google Calendar hiện tại thành một nền tảng **Quản lý Thời gian & Năng suất Toàn diện (Personal Time & Productivity Engine)** với 3 trụ cột sức mạnh chính:
1. **Trải nghiệm Kéo thả & Co giãn Sự kiện Trực quan (Native DnD & Resize Engine)** chuẩn Google Calendar mượt mà 60 FPS, snap 15 phút.
2. **Bảng Phân Tích Năng Suất (Time & Productivity Analytics Dashboard)**: Biểu đồ trực quan hóa thời lượng, tỷ lệ Deep Work vs. Meeting, phát hiện & cảnh báo quá tải lịch (Burnout Warning), quản lý mục tiêu tuần.
3. **Đồng Bộ Đám Mây & Chia Sẻ Đa Nền Tảng (Cloud Sync & Sharing Engine)**: Firebase Firestore + LocalStorage Hybrid (Offline-first), xuất/nhập tệp chuẩn quốc tế iCalendar (`.ics` - RFC 5545).

---

## 2. Kiến Trúc Hệ Thống & Cấu Trúc Mã Nguồn

Ứng dụng tuân thủ mô hình **Separation of Concerns**:

```
src/
├── types/
│   ├── calendar.ts               # Mở rộng types: DnDState, ResizeHandle, AnalyticsMetrics
│   └── multiHub.ts               # Types cho Time Tracker, Goals, Productivity
├── hooks/
│   ├── useCalendarEvents.ts      # Quản lý sự kiện, CRUD, Undo/Redo (Ctrl+Z)
│   ├── useCalendarDnD.ts         # Hook xử lý kéo thả di chuyển & co giãn sự kiện
│   ├── useTimeAnalytics.ts       # Hook tính toán phân bổ thời gian, cảnh báo burnout
│   └── useFirebaseSync.ts        # Hook đồng bộ 2 chiều Firestore + LocalStorage
├── services/
│   ├── firebase.ts               # Kết nối Firestore & Firebase Auth
│   ├── icalService.ts            # Xử lý xuất/nhập file .ics RFC 5545
│   └── calendarSync.ts           # Quản lý snapshot listener & offline cache
├── components/
│   ├── calendar/
│   │   ├── TimeGridView.tsx      # Lưới giờ (Ngày/Tuần/4 Ngày) tích hợp DnD & Resize
│   │   ├── MonthView.tsx         # Lịch Tháng tích hợp kéo thả giữa các ô ngày
│   │   └── EventCard.tsx         # Thẻ sự kiện với handle co giãn và live preview badge
│   ├── analytics/
│   │   ├── TimeAnalyticsView.tsx # Dashboard phân tích năng suất
│   │   ├── CategoryDoughnut.tsx  # Biểu đồ tròn SVG phân bổ danh mục
│   │   ├── BurnoutAlert.tsx      # Cảnh báo quá tải lịch và gợi ý nghỉ ngơi
│   │   └── GoalsTracker.tsx      # Theo dõi tiến độ mục tiêu số giờ trong tuần
│   ├── sync/
│   │   └── CloudSyncModal.tsx    # Modal đăng nhập Google, đồng bộ Firestore, xuất/nhập iCal
│   ├── Header.tsx                # Thêm nút xem Analytics & trạng thái đồng bộ
│   └── Sidebar.tsx               # Danh mục lịch, mini-calendar, bộ lọc
└── utils/
    ├── dndUtils.ts               # Thuật toán Snap-to-Grid (15m), chuyển đổi pixel <-> giờ
    ├── analyticsUtils.ts         # Thuật toán tính toán số giờ, tỷ lệ Deep Work
    └── calendarUtils.ts          # Tiện ích ngày tháng, lịch âm, màu sắc
```

---

## 3. Đặc Tả Chi Tiết Từng Mô-Đun

### 3.1. Kéo Thả & Co Giãn Sự Kiện (Native DnD & Resize)
- **TimeGridView (Lưới giờ Ngày / Tuần / 4 Ngày)**:
  - Tỷ lệ hiển thị: 1 giờ = 56px, 15 phút = 14px.
  - Kéo thân sự kiện: Di chuyển lên/xuống snap 15 phút; kéo sang trái/phải để chuyển cột ngày.
  - Kéo mép dưới sự kiện: Handle co giãn thay đổi `endTime` theo bước nhảy 15 phút (thời lượng tối thiểu: 15 phút).
  - Live Tooltip Badge: Hiển thị nổi cạnh con trỏ giờ bắt đầu - kết thúc dự kiến (ví dụ: `14:15 - 15:45 (1h30p)`).
  - Bóng mờ (Ghost Shadow): Hiển thị trước vị trí thả dự kiến.
  - Auto-scroll viền: Tự động cuộn khung nhìn khi kéo gần mép trên hoặc mép dưới của lưới giờ.
- **MonthView (Lịch Tháng)**:
  - Cho phép kéo thẻ sự kiện từ ô ngày này sang ô ngày khác, giữ nguyên khoảng giờ gốc và cập nhật `startDate` / `endDate`.
- **UX & An Toàn**:
  - Hủy thao tác kéo bất kỳ lúc nào bằng phím `Escape`.
  - Hỗ trợ hoàn tác thao tác đổi lịch bằng `Ctrl + Z`.
  - Âm thanh phản hồi khi thả thành công.

### 3.2. Bảng Phân Tích Thời Gian & Năng Suất (Time Analytics Dashboard)
- **Truy cập**: Nút "Phân tích" trên thanh công cụ Header (ViewType: `'analytics'`) hoặc phím tắt `A`.
- **Bộ lọc thời gian**: Hôm nay, Tuần này (mặc định), Tháng này.
- **Metric Cards**:
  - Tổng giờ đã lên lịch (Total Scheduled Hours).
  - Tỷ lệ Deep Work vs. Meeting (Công việc tập trung so với Họp hành).
  - Số lượng sự kiện & cuộc họp đã hoàn thành.
- **Biểu đồ Tròn Phân Bổ (Category Doughnut Chart)**:
  - Vẽ bằng SVG mượt mà, phân loại theo màu danh mục (Công việc, Học tập, Cá nhân, Sức khỏe, Nghỉ ngơi).
  - Tooltip hover hiển thị số giờ cụ thể và phần trăm.
- **Cảnh Báo Quá Tải (Burnout Alert)**:
  - Phát hiện ngày có lịch trên 8 giờ hoặc lịch họp dày đặc không có khoảng nghỉ 15 phút.
  - Hiển thị badge cảnh báo kèm lời khuyên giãn lịch.
- **Theo Dõi Mục Tiêu Tuần (Weekly Goals)**:
  - Cho phép người dùng đặt mục tiêu giờ (ví dụ: 10h Học tập, 5h Thể thao).
  - Thanh tiến trình tự động tính toán dựa trên sự kiện thực tế trong tuần.

### 3.3. Đồng Bộ Đám Mây & Chia Sẻ (Cloud Sync & Sharing)
- **Offline-First & Firestore**:
  - Dữ liệu luôn được lưu vào LocalStorage tức thì.
  - Khi người dùng đăng nhập tài khoản Google (Firebase Auth): Tự động đồng bộ lên collection `users/{uid}/events` trên Firestore với cơ chế Real-time Listener (`onSnapshot`).
  - Chỉ báo trạng thái đồng bộ trên Header: 🟢 Đã đồng bộ, 🟡 Đang lưu, ⚪ Cục bộ/Offline.
- **Chuẩn iCalendar (`.ics` - RFC 5545)**:
  - Xuất toàn bộ hoặc từng danh mục sự kiện thành tệp `.ics` chuẩn, tương thích với Apple Calendar (iOS/macOS), Google Calendar, Outlook.
  - Nhập file `.ics` từ nguồn ngoài để đưa nhanh sự kiện vào hệ thống.
- **Chia sẻ sự kiện**:
  - Tạo tóm tắt sự kiện kèm liên kết tải nhanh `.ics` để gửi qua tin nhắn/email.

---

## 4. Xử Lý Lỗi & Khả Năng Mở Rộng
- **Lỗi mạng**: Giao diện không bị treo; lưu trữ vào queue cục bộ và tự động retry khi có kết nối trở lại.
- **Xung đột phiên bản (Conflict Resolution)**: Áp dụng quy tắc Last-write-wins dựa trên trường `updatedAt`.
- **Khả năng mở rộng**: Tương thích hoàn toàn với React 19, Tailwind v4 và các tính năng có sẵn (Lịch Âm, Google Meet Room, Pomodoro Timer).

---

## 5. Kế Hoạch Kiểm Thử (Verification Plan)
1. **Kiểm thử Kéo Thả & Resize**:
   - Thao tác kéo sự kiện trên TimeGrid lên/xuống, kiểm tra snap chính xác 15 phút.
   - Thao tác co giãn mép dưới, kiểm tra tính toán thời lượng tối thiểu 15 phút và live preview.
   - Thao tác kéo sự kiện trên MonthView sang ngày khác.
   - Kiểm tra phím `Esc` để hủy và `Ctrl+Z` để Undo.
2. **Kiểm thử Analytics Dashboard**:
   - Thêm các sự kiện với nhiều danh mục khác nhau.
   - Kiểm tra tổng số giờ, biểu đồ tròn và cảnh báo burnout khi sự kiện vượt quá 8h/ngày.
3. **Kiểm thử Đồng Bộ & iCal**:
   - Xuất file `.ics`, kiểm tra định dạng RFC 5545 hợp lệ.
   - Nhập file `.ics` mẫu và kiểm tra sự kiện hiển thị đúng vị trí trên lịch.
   - Kiểm tra lưu trữ LocalStorage khi không có mạng.
