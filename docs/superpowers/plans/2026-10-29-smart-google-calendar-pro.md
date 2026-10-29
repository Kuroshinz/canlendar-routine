# Smart Google Calendar Pro Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xây dựng và nâng cấp ứng dụng Google Calendar hiện tại thành nền tảng quản lý thời gian và năng suất toàn diện với 3 tính năng đột phá: Kéo thả & Co giãn sự kiện mượt mà (Snap 15p), Bảng phân tích năng suất & Cảnh báo quá tải (Time Analytics & Burnout Alert), Đồng bộ đám mây Firebase + LocalStorage Hybrid & Xuất/Nhập chuẩn iCalendar (.ics).

**Architecture:** Áp dụng kiến trúc Module hóa tách biệt (Separation of Concerns). Toàn bộ logic tương tác kéo thả/co giãn sự kiện được quản lý tập trung qua `useCalendarDnD` với native Pointer/HTML5 events nhằm đạt hiệu năng 60 FPS mà không phụ thuộc thư viện ngoài nặng nề. Phân tích năng suất được tính toán qua `useTimeAnalytics` và hiển thị bằng các thành phần SVG tương tác. Dữ liệu duy trì chế độ Offline-First với LocalStorage và tự động đồng bộ 2 chiều lên Firestore khi đăng nhập tài khoản.

**Tech Stack:** React 19, TypeScript, Vite 8, Tailwind CSS v4, Lucide React, Motion, Firebase Firestore/Auth.

## Global Constraints

- Toàn bộ mã nguồn nằm trong thư mục: `D:\Download\google-calendar---lịch-thông-minh`.
- Tương thích 100% với React 19 và Tailwind CSS v4 (không cài đặt thư viện dnd ngoài gây xung đột peer-dependencies).
- Bước nhảy snap kéo thả và resize cố định là 15 phút (tương ứng 14px trên lưới 56px/giờ).
- Thời lượng tối thiểu của một sự kiện khi co giãn là 15 phút.
- Hỗ trợ đầy đủ song ngữ (vi / en) và Dark / Light theme có sẵn trong hệ thống.
- Chuẩn xuất/nhập tệp `.ics` tuân thủ nghiêm ngặt RFC 5545.

---

### Task 1: Cấu trúc Dữ liệu & Types Mở Rộng

**Files:**
- Modify: `src/types/calendar.ts`
- Modify: `src/types/multiHub.ts`

**Interfaces:**
- Consumes: `CalendarEvent`, `CalendarCategory`, `CalendarViewType`
- Produces: `DnDState`, `ResizeHandle`, `LiveTimePreview`, `AnalyticsMetrics`, `WeeklyGoal`, `SyncStatus`

- [ ] **Step 1: Cập nhật `src/types/calendar.ts` để mở rộng types**

Thêm các types phục vụ kéo thả, co giãn, chế độ xem phân tích năng suất và đồng bộ:
```typescript
export type CalendarViewType = 'month' | 'week' | 'day' | 'fourDay' | 'year' | 'schedule' | 'analytics';

export type SyncState = 'synced' | 'syncing' | 'offline' | 'error';

export interface LiveTimePreview {
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
}

export interface DnDState {
  isDragging: boolean;
  isResizing: boolean;
  eventId: string | null;
  initialEvent: CalendarEvent | null;
  currentPreview: LiveTimePreview | null;
  dragStartX: number;
  dragStartY: number;
  originalStartTime: string;
  originalEndTime: string;
  originalDate: string;
}

export interface WeeklyGoal {
  id: string;
  category: string;
  targetHours: number;
}
```

- [ ] **Step 2: Cập nhật `src/types/multiHub.ts` bổ sung `AnalyticsMetrics`**

```typescript
export interface AnalyticsMetrics {
  totalMinutes: number;
  deepWorkMinutes: number;
  meetingMinutes: number;
  categoryBreakdown: {
    categoryId: string;
    categoryName: string;
    color: string;
    minutes: number;
    percentage: number;
  }[];
  isOverloaded: boolean;
  overloadedDays: {
    date: string;
    totalHours: number;
    reason: string;
  }[];
}
```

- [ ] **Step 3: Kiểm tra biên dịch TypeScript**

Run: `npx tsc --noEmit`
Expected: PASS không có lỗi type.

---

### Task 2: Engine Kéo Thả & Co Giãn Sự Kiện (DnD Utils & Custom Hook)

**Files:**
- Create: `src/utils/dndUtils.ts`
- Create: `src/utils/dndUtils.test.ts`
- Create: `src/hooks/useCalendarDnD.ts`

**Interfaces:**
- Consumes: `CalendarEvent`, `LiveTimePreview`, `DnDState`
- Produces: `snapMinutesToStep()`, `yCoordToTimeString()`, `timeStringToMinutes()`, `useCalendarDnD()`

- [ ] **Step 1: Viết test cho `dndUtils.ts`**

Tạo `src/utils/dndUtils.test.ts`:
Kiểm tra:
- `snapMinutesToStep(17, 15)` -> `15`
- `snapMinutesToStep(23, 15)` -> `30`
- `yCoordToTimeString(420, 56)` -> `07:30`
- `computeResizedEndTime("09:00", deltaMinutes)` với min duration 15 phút.

- [ ] **Step 2: Viết mã triển khai `src/utils/dndUtils.ts`**

Chứa các hàm chuyển đổi toạ độ và thời gian:
- `timeStringToMinutes(timeStr: string): number`
- `minutesToTimeString(minutes: number): string`
- `snapMinutesToStep(minutes: number, step: number = 15): number`
- `yCoordToTimeString(yPx: number, hourHeight: number = 56): string`
- `calculateNewTime(initialTime: string, deltaY: number, hourHeight: number = 56): string`

- [ ] **Step 3: Viết custom hook `src/hooks/useCalendarDnD.ts`**

Quản lý trạng thái tương tác chuột:
- `startDrag(event: CalendarEvent, clientX: number, clientY: number)`
- `startResize(event: CalendarEvent, clientY: number)`
- `updateMove(currentY: number, targetDate?: string)`
- `updateResize(currentY: number)`
- `cancelDnD()` (nhấn phím `Escape`)
- `finishDnD()` -> trả về sự kiện đã cập nhật để lưu vào state chính và danh sách undo stack.

- [ ] **Step 4: Chạy test kiểm tra `dndUtils.test.ts`**

Run: `npx vitest run src/utils/dndUtils.test.ts` hoặc chạy test runner cục bộ.
Expected: PASS tất cả các case chuyển đổi snap 15 phút.

---

### Task 3: Tích Hợp Kéo Thả & Co Giãn vào TimeGridView & MonthView

**Files:**
- Modify: `src/components/TimeGridView.tsx`
- Modify: `src/components/MonthView.tsx`

**Interfaces:**
- Consumes: `useCalendarDnD`, `dndUtils`, `playNotificationSound`
- Produces: Giao diện kéo thả trực tiếp, ghost card, resize handle, live time tooltip

- [ ] **Step 1: Cập nhật `src/components/TimeGridView.tsx`**

1. Thêm thanh điều khiển mép dưới (Resize Handle) vào mỗi thẻ sự kiện:
   - Phần tử `div` ở đáy thẻ có chiều cao 6px, bo góc đáy, `cursor-ns-resize`.
   - Bắt sự kiện `onPointerDown` gọi `startResize`.
2. Thêm trình xử lý kéo thân sự kiện:
   - Nhấn giữ chuột vào thẻ sự kiện gọi `startDrag`.
3. Hiển thị **Ghost Card** và **Floating Live Preview Badge**:
   - Khi đang kéo/resize, hiển thị thẻ mờ tại vị trí thời gian mới.
   - Badge hiển thị: Giờ bắt đầu - Giờ kết thúc và số phút (ví dụ `10:00 - 11:30 (1h30p)`).
4. Auto-scroll khi kéo sự kiện gần mép trên (scrollTop < 40px) hoặc mép dưới khung nhìn.

- [ ] **Step 2: Cập nhật `src/components/MonthView.tsx`**

1. Biến các thẻ sự kiện trong MonthView thành `draggable={true}`.
2. Xử lý `onDragStart` lưu `eventId`.
3. Xử lý `onDragOver` và `onDrop` trên từng ô ngày trong tháng:
   - Khi thả vào ô ngày mới: Cập nhật `startDate` và `endDate` của sự kiện sang ngày đích, giữ nguyên giờ cũ.
   - Phát âm thanh phản hồi `playNotificationSound()`.

- [ ] **Step 3: Kiểm tra hiển thị và không có lỗi runtime**

Run: `npx tsc --noEmit`
Expected: PASS.

---

### Task 4: Mô-đun Phân Tích Thời Gian & Năng Suất (Time Analytics Dashboard)

**Files:**
- Create: `src/utils/analyticsUtils.ts`
- Create: `src/utils/analyticsUtils.test.ts`
- Create: `src/components/analytics/TimeAnalyticsView.tsx`
- Create: `src/components/analytics/CategoryDoughnut.tsx`
- Create: `src/components/analytics/BurnoutAlert.tsx`
- Create: `src/components/analytics/GoalsTracker.tsx`

**Interfaces:**
- Consumes: `CalendarEvent[]`, `CalendarCategory[]`, `AnalyticsMetrics`, `WeeklyGoal[]`
- Produces: `computeAnalyticsMetrics()`, `TimeAnalyticsView` component

- [ ] **Step 1: Viết test cho `src/utils/analyticsUtils.test.ts`**

Kiểm tra:
- Tính tổng số phút và giờ của danh sách sự kiện trong khoảng ngày.
- Phân loại tỷ lệ Deep Work (sự kiện cá nhân, học tập, công việc) vs. Meeting (có meetUrl hoặc chứa từ khóa họp/meet).
- Nhận diện đúng ngày bị quá tải (> 8 tiếng hoặc > 3 cuộc họp liên tiếp không có nghỉ).

- [ ] **Step 2: Viết mã `src/utils/analyticsUtils.ts`**

Thực hiện logic tính toán metrics và phân loại danh mục.

- [ ] **Step 3: Tạo `CategoryDoughnut.tsx`**

Component vẽ biểu đồ tròn rỗng (Doughnut) bằng SVG thuần:
- Hiển thị các cung tròn tỉ lệ % tương ứng với màu của từng danh mục Google Calendar.
- Hiệu ứng hover nổi bật lát cắt kèm tooltip chi tiết.

- [ ] **Step 4: Tạo `BurnoutAlert.tsx` và `GoalsTracker.tsx`**

- `BurnoutAlert`: Hiển thị cảnh báo thông minh màu vàng/đỏ nếu phát hiện ngày làm việc căng thẳng, kèm lời khuyên cân bằng công việc - cuộc sống.
- `GoalsTracker`: Cho phép thêm mục tiêu tuần (ví dụ: Học tập 12h) và thanh tiến trình tự động tính toán.

- [ ] **Step 5: Tạo `TimeAnalyticsView.tsx` hoàn chỉnh**

Tích hợp Metric Cards, CategoryDoughnut, BurnoutAlert, GoalsTracker và bộ lọc thời gian (Hôm nay / Tuần này / Tháng này).

---

### Task 5: Mô-đun Đồng Bộ Đám Mây & Xuất/Nhập Chuẩn iCalendar (.ics)

**Files:**
- Create: `src/services/icalService.ts`
- Create: `src/services/icalService.test.ts`
- Create: `src/services/firestoreSync.ts`
- Create: `src/components/sync/CloudSyncModal.tsx`

**Interfaces:**
- Consumes: `CalendarEvent[]`, `User`, Firebase app
- Produces: `exportEventsToICal()`, `parseICalToEvents()`, `syncEventsWithFirestore()`, `CloudSyncModal`

- [ ] **Step 1: Viết test cho `src/services/icalService.test.ts`**

Kiểm tra:
- Tạo chuỗi format chuẩn `BEGIN:VCALENDAR...BEGIN:VEVENT...END:VEVENT...END:VCALENDAR`.
- Parse chuỗi `.ics` mẫu ngược lại thành `CalendarEvent[]`.

- [ ] **Step 2: Triển khai `src/services/icalService.ts` chuẩn RFC 5545**

Hỗ trợ:
- Xuất file `.ics` tải về trình duyệt.
- Đọc và import file `.ics` tải từ Google/Apple/Outlook Calendar vào ứng dụng.

- [ ] **Step 3: Triển khai `src/services/firestoreSync.ts`**

- Lắng nghe realtime từ `users/{uid}/events` qua `onSnapshot`.
- Cập nhật batch lên Firestore khi có thay đổi.
- Lưu cache dự phòng vào LocalStorage để hoạt động offline 100%.

- [ ] **Step 4: Tạo `CloudSyncModal.tsx`**

Giao diện quản lý đồng bộ trực quan:
- Trạng thái đăng nhập Google & tài khoản hiện tại.
- Trạng thái đồng bộ đám mây (Thời gian sync gần nhất, số lượng sự kiện).
- Nút xuất file `.ics` (Toàn bộ hoặc theo từng danh mục).
- Khu vực kéo thả để Nhập (Import) file `.ics`.

---

### Task 6: Tích Hợp Toàn Bộ vào Header, App.tsx & Phím Tắt

**Files:**
- Modify: `src/components/Header.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/ShortcutsModal.tsx`

**Interfaces:**
- Consumes: `TimeAnalyticsView`, `CloudSyncModal`, `useCalendarDnD`, `SyncState`
- Produces: Hệ thống thống nhất hoàn chỉnh

- [ ] **Step 1: Cập nhật `src/components/Header.tsx`**

1. Bổ sung nút chuyển sang chế độ **"Phân tích" (Analytics)** bên cạnh các chế độ xem Ngày/Tuần/Tháng.
2. Thêm nút mở modal **Đồng bộ Đám mây (Cloud Sync)** kèm badge trạng thái kết nối (🟢 Đã đồng bộ, 🟡 Đang lưu, ⚪ Offline).

- [ ] **Step 2: Cập nhật `src/App.tsx`**

1. Kết nối hook `useCalendarDnD` vào sự kiện của `TimeGridView` và `MonthView`.
2. Hỗ trợ hiển thị `TimeAnalyticsView` khi `view === 'analytics'`.
3. Bổ sung tính năng Undo (`Ctrl + Z`) phục hồi sự kiện sau khi kéo thả.
4. Bổ sung phím tắt: `A` để mở nhanh tab Phân tích, `Esc` để hủy kéo thả.

- [ ] **Step 3: Cập nhật `src/components/ShortcutsModal.tsx`**

Thêm các phím tắt mới vào bảng hướng dẫn phím tắt cho người dùng.

---

### Task 7: Kiểm Thử Toàn Diện, Tối Ưu Hiệu Năng & Đóng Gói

- [ ] **Step 1: Kiểm tra biên dịch TypeScript toàn dự án**

Run: `npx tsc --noEmit`
Expected: Không có bất kỳ lỗi nào.

- [ ] **Step 2: Kiểm tra Build Production của Vite**

Run: `npm run build`
Expected: Build thành công ra thư mục `dist/` sạch sẽ.

- [ ] **Step 3: Kiểm thử toàn diện các luồng nghiệp vụ**

1. Kéo sự kiện lên/xuống và sang ngày khác trên TimeGridView -> Snap 15 phút mượt mà.
2. Co giãn mép dưới sự kiện -> Thời lượng thay đổi chuẩn xác kèm live preview.
3. Kéo thả sự kiện giữa các ngày trên MonthView -> Cập nhật ngày hẹn tức thì.
4. Bấm `Ctrl + Z` -> Sự kiện quay về vị trí trước khi kéo.
5. Chuyển sang màn hình Phân tích -> Biểu đồ tròn và các chỉ số hiển thị chính xác.
6. Thử nghiệm xuất và nhập file `.ics` -> Hoạt động trơn tru.
