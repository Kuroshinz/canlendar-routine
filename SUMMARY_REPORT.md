# Báo Cáo Bàn Giao — Mở Rộng Năng Suất (Tasks · Focus · Finance · Health)

> Báo cáo này mô tả **những gì đã được thêm vào hệ thống hiện có**. Không có project mới, không có file nào bị ghi đè làm mất chức năng cũ.

---

## 1. Tổng quan

Ứng dụng lịch hiện tại (Google Calendar clone: Month/Week/Day/4-Day/Year/Schedule/Analytics, lunar calendar, DnD, iCal, Firestore sync, Multi-Hub) được **mở rộng thêm 5 phân hệ mới**, dùng chung một kho dữ liệu duy nhất:

| Phân hệ | View | Phím tắt |
| --- | --- | --- |
| Tổng quan năng suất | `dashboard` | `1` |
| Công việc & Mục tiêu | `tasks` | `2` |
| Đồng hồ học tập (Pomodoro / Stopwatch / Countdown) | `focus` | `3` |
| Quản lý tài chính | `finance` | `4` |
| Sức khỏe & Thể hình | `health` | `5` |

Tất cả view cũ **giữ nguyên** và hoạt động như trước.

---

## 2. File cũ đã được chỉnh sửa / nâng cấp

| File | Thay đổi |
| --- | --- |
| [`src/types/calendar.ts`](file:///D:/Download/google-calendar---l%E1%BB%8Bch-th%C3%B4ng-minh/src/types/calendar.ts) | Mở rộng `CalendarViewType` với 5 view mới (`dashboard`, `tasks`, `focus`, `finance`, `health`). Thêm 2 category mặc định `study` (Học tập) và `health` (Tập luyện & Sức khỏe) để task/event dùng đúng màu và không bị bộ lọc category ẩn đi. |
| [`src/App.tsx`](file:///D:/Download/google-calendar---l%E1%BB%8Bch-th%C3%B4ng-minh/src/App.tsx) | Gọi `useProductivityStore()` một lần; tính `taskEvents` (task có `dueDate` + `startTime` được mirror lên lịch) và `allEvents = [...events, ...taskEvents]` truyền cho Month/Week/Day/4-Day/Year/Schedule/Analytics/DayPlanner — **không ghi vào `gcal_events`**. Thêm 5 case render view mới. Thêm phím tắt `1`–`5`. Thêm migration **additive** cho `gcal_categories`: chỉ thêm category mặc định còn thiếu, không đụng vào category người dùng tự tạo hay trạng thái ẩn/hiện. Truyền `onViewChange`/`currentView` cho Sidebar và `onNavigate` cho MultiHubDrawer. `handleSaveEvent` / `handleDeleteEvent` / `handleMoveEvent` / `handleToggleCompleteTask` nhận diện event id `task-*` và **chuyển tiếp về đúng chủ sở hữu** (productivity store) thay vì ghi vào `gcal_events`. |
| [`src/components/Header.tsx`](file:///D:/Download/google-calendar---l%E1%BB%8Bch-th%C3%B4ng-minh/src/components/Header.tsx) | Thêm 5 mục vào dropdown chọn view (VI/EN + phím tắt), có dấu phân cách giữa nhóm lịch và nhóm năng suất; dropdown cao tối đa 70vh và cuộn được. |
| [`src/components/Sidebar.tsx`](file:///D:/Download/google-calendar---l%E1%BB%8Bch-th%C3%B4ng-minh/src/components/Sidebar.tsx) | Thêm khối **"Không gian làm việc"** (Workspace) giữa mini-calendar và "Lịch của tôi" với 5 lối vào module, có highlight view đang mở; tự đóng sidebar trên mobile. |
| [`src/components/MultiHubDrawer.tsx`](file:///D:/Download/google-calendar---l%E1%BB%8Bch-th%C3%B4ng-minh/src/components/MultiHubDrawer.tsx) | Thêm prop tuỳ chọn `onNavigate`. Mỗi tab `time` / `finance` / `study` / `stress` có thêm nút **"Mở … đầy đủ"** dẫn tới module tương ứng (`focus` / `finance` / `tasks` / `health`). Nội dung tóm tắt sẵn có trong drawer **được giữ nguyên**, không tạo bản trùng lặp. Tab Google Sync không đổi. |
| [`src/components/ShortcutsModal.tsx`](file:///D:/Download/google-calendar---l%E1%BB%8Bch-th%C3%B4ng-minh/src/components/ShortcutsModal.tsx) | Bổ sung 5 phím tắt mới vào bảng trợ giúp. |
| [`.env.example`](file:///D:/Download/google-calendar---l%E1%BB%8Bch-th%C3%B4ng-minh/.env.example) | Thêm biến `VITE_GOOGLE_HEALTH_ENABLED` kèm hướng dẫn scope Fitness. |

---

## 3. File mới được thêm

### Domain & logic

| File | Nội dung |
| --- | --- |
| [`src/types/productivity.ts`](file:///D:/Download/google-calendar---l%E1%BB%8Bch-th%C3%B4ng-minh/src/types/productivity.ts) | Toàn bộ type dùng chung: `TaskItem`, `SubTask`, `GoalItem`, `GoalProgress`, `FocusSession`, `Transaction`, `BudgetSettings`, `HealthDayLog`, `HealthProfile`, `WorkoutLog`, `WellnessCheck`. Kèm `FINANCE_CATEGORIES` (10 danh mục, màu Google), `TASK_PRIORITY_META`, `TASK_STATUS_META`, `DEFAULT_BUDGET` (15.000.000 ₫), `DEFAULT_HEALTH_PROFILE`. |
| [`src/utils/productivityUtils.ts`](file:///D:/Download/google-calendar---l%E1%BB%8Bch-th%C3%B4ng-minh/src/utils/productivityUtils.ts) | Hàm thuần, không side-effect: tính % task/goal, sort theo urgency, overdue, mirror task → `CalendarEvent`, thống kê focus theo ngày, tổng hợp thu/chi, ngưỡng budget (`ok` <80%, `warning` ≥80%, `over` ≥100%), chi theo danh mục, dòng tiền theo ngày, format tiền VND/USD, BMI + nhãn, xu hướng cân nặng, macro calories/%, phút tập tuần, trung bình 7 ngày. |
| [`src/hooks/usePersistentState.ts`](file:///D:/Download/google-calendar---l%E1%BB%8Bch-th%C3%B4ng-minh/src/hooks/usePersistentState.ts) | Hook `useState` + `localStorage`, cùng pattern `gcal_*` đang dùng trong project. |
| [`src/hooks/useProductivityStore.ts`](file:///D:/Download/google-calendar---l%E1%BB%8Bch-th%C3%B4ng-minh/src/hooks/useProductivityStore.ts) | **Chủ sở hữu duy nhất** cho toàn bộ dữ liệu năng suất. Các view không tự giữ state riêng nên không có chuyện lệch dữ liệu giữa các trang. Khoá lưu: `gcal_prod_tasks`, `gcal_prod_goals`, `gcal_prod_focus_sessions`, `gcal_prod_transactions`, `gcal_prod_budget`, `gcal_prod_health_logs`, `gcal_prod_workouts`, `gcal_prod_wellness`, `gcal_prod_health_profile`. |
| [`src/data/productivitySeed.ts`](file:///D:/Download/google-calendar---l%E1%BB%8Bch-th%C3%B4ng-minh/src/data/productivitySeed.ts) | Dữ liệu khởi tạo hợp lý để giao diện không trống ngay lần đầu: 3 mục tiêu, 9 công việc, 10 giao dịch, 5 phiên focus, 7 ngày sức khỏe, 4 buổi tập, 3 check-in wellness. |

### Dịch vụ

| File | Nội dung |
| --- | --- |
| [`src/services/googleHealthSync.ts`](file:///D:/Download/google-calendar---l%E1%BB%8Bch-th%C3%B4ng-minh/src/services/googleHealthSync.ts) | Gọi Google Fitness REST `users/me/dataset:aggregate` để lấy `steps`, `calories.expired`, `heart_rate.bpm`, `sleep.segment`, `weight`. `syncGoogleHealth()` trả về `{ source: 'google-fit' \| 'mock', metrics, error? }` — **nguồn luôn được báo rõ ra UI**, không thể nhầm dữ liệu mô phỏng với dữ liệu thật. Mock là deterministic theo ngày nên biểu đồ xu hướng vẫn có hình dạng. |

### Giao diện

| File | Nội dung |
| --- | --- |
| [`src/components/charts/SimpleCharts.tsx`](file:///D:/Download/google-calendar---l%E1%BB%8Bch-th%C3%B4ng-minh/src/components/charts/SimpleCharts.tsx) | `BarChart`, `LineChart`, `ProgressBar`, `StackedBar` — SVG thuần, không thêm dependency, cùng phong cách `analytics/CategoryDoughnut`. |
| [`src/components/productivity/TasksGoalsView.tsx`](file:///D:/Download/google-calendar---l%E1%BB%8Bch-th%C3%B4ng-minh/src/components/productivity/TasksGoalsView.tsx) | 4 thẻ thống kê, tab trạng thái + lọc ưu tiên + tìm kiếm, task card có badge ưu tiên / màu category / hạn chót / mục tiêu, mở rộng sub-task (thêm/xoá/tick) với thanh tiến độ, đổi trạng thái, sửa/xoá, nút **"Xem trên Lịch"** khi task có giờ. Cột mục tiêu tự cập nhật % từ sub-task. Modal thêm/sửa task và modal thêm mục tiêu. |
| [`src/components/productivity/StudyFocusView.tsx`](file:///D:/Download/google-calendar---l%E1%BB%8Bch-th%C3%B4ng-minh/src/components/productivity/StudyFocusView.tsx) | 3 chế độ: Pomodoro (Focus 25m / Short 5m / Long 15m), Stopwatch, Countdown (preset 5–60m). Vòng tiến độ SVG, gắn task/mục tiêu vào phiên, Start/Pause/Reset/Save, âm thanh thông báo, **Zen mode** toàn màn hình. Biểu đồ 7 ngày + lịch sử phiên. |
| [`src/components/productivity/FinanceView.tsx`](file:///D:/Download/google-calendar---l%E1%BB%8Bch-th%C3%B4ng-minh/src/components/productivity/FinanceView.tsx) | 4 thẻ: số dư tổng, thu nhập tháng, chi tiêu tháng, ngân sách còn lại. Điều hướng tháng, banner cảnh báo theo ngưỡng (xanh/vàng/đỏ) + thanh tiến độ + đặt hạn mức. Form thêm nhanh Thu/Chi (số tiền, danh mục lọc theo loại, ngày, ghi chú). Bộ lọc danh mục + tìm kiếm. Biểu đồ tỷ lệ chi theo danh mục (`StackedBar`) và dòng tiền theo ngày (`BarChart`). |
| [`src/components/productivity/HealthView.tsx`](file:///D:/Download/google-calendar---l%E1%BB%8Bch-th%C3%B4ng-minh/src/components/productivity/HealthView.tsx) | Chọn ngày, 4 thẻ chỉ số có thanh tiến độ theo mục tiêu (bước, nước, ngủ, calo đốt). Nhập tay cân nặng / calo nạp / calo đốt / ngủ / bước / nước (kèm nút +250/+500 ml). Macros Protein-Carbs-Fat + `StackedBar` + % + kcal. BMI + chiều cao + cân nặng mục tiêu. Biểu đồ xu hướng cân nặng 30 ngày. Nhật ký tập luyện (loại, thời lượng, sets×reps, kcal) + form thêm. Nút **"Đồng bộ Google Health"** với badge nguồn (`Google Fit` / `Mô phỏng`) và giải thích rõ khi dùng mock. |
| [`src/components/productivity/ProductivityDashboard.tsx`](file:///D:/Download/google-calendar---l%E1%BB%8Bch-th%C3%B4ng-minh/src/components/productivity/ProductivityDashboard.tsx) | Tổng quan: 4 số liệu đầu trang (sự kiện sắp tới, việc hôm nay, phút tập trung, chi tiêu tháng), 4 thẻ lối vào module, danh sách lịch sắp tới, việc hôm nay (tick nhanh), tiến độ 3 mục tiêu, ngân sách tháng, chỉ số sức khỏe hôm nay. |
| [`src/utils/productivityUtils.test.ts`](file:///D:/Download/google-calendar---l%E1%BB%8Bch-th%C3%B4ng-minh/src/utils/productivityUtils.test.ts) | Test cho toàn bộ logic thuần, cùng style `assert` + `console.log` như các test có sẵn. |

---

## 4. Liên kết Task → Calendar (cách hoạt động)

```
TaskItem (dueDate + startTime)
        │  buildTaskEvents(tasks, colorByCategoryId)
        ▼
CalendarEvent { id: `task-<taskId>`, color: <màu category> }
        │
        ▼
allEvents = [...events, ...taskEvents]   ← chỉ để render
        │
        ▼
MonthView / TimeGridView / ScheduleView / YearView / Analytics / DayPlanner
```

- Event sinh ra **không được ghi** vào `gcal_events`, nên không bị đồng bộ ngược lên Google Calendar và không tạo bản trùng khi task thay đổi.
- Sửa/xoá task → event biến mất/tự cập nhật ở lần render sau.
- Xoá / kéo-thả / tick hoàn thành / sửa một event `task-*` trên lịch sẽ ghi ngược về task gốc (xoá task, đổi `dueDate`, đổi trạng thái, sửa tiêu đề & giờ). Không tạo bản sao trong `gcal_events`.
- Task không có `startTime` sẽ **không** lên lịch (tránh làm rối chế độ xem giờ).

---

## 5. Biến môi trường

| Biến | Bắt buộc | Ý nghĩa |
| --- | --- | --- |
| `VITE_GOOGLE_CLIENT_ID` | Không (khuyến nghị) | OAuth Client ID của bạn để popup đăng nhập Google thật hoạt động. Thiếu → app mở hộp thoại đồng bộ (Client ID / Access Token / URL iCal bí mật) thay vì mở popup chắc chắn lỗi `400: origin_mismatch`. |
| `VITE_GOOGLE_HEALTH_ENABLED` | Không | `"true"` để bật gọi Google Fitness API thật. Cần access token có scope `fitness.activity.read`, `fitness.body.read`, `fitness.sleep.read`, `fitness.heart_rate.read`. Khi tắt (hoặc token thiếu scope), nút đồng bộ dùng dữ liệu mô phỏng **có ghi rõ nguồn**. |

> Lưu ý: bật `VITE_GOOGLE_HEALTH_ENABLED` **không** tự thêm scope Fitness vào popup đăng nhập hiện tại — scope của popup đang tối thiểu cho Calendar. Muốn lấy dữ liệu thật, dán access token đã cấp scope Fitness vào tab Access Token của hộp thoại đồng bộ, hoặc bổ sung scope vào `requestRealGoogleOAuthToken` trong [`src/services/realGoogleAuth.ts`](file:///D:/Download/google-calendar---l%E1%BB%8Bch-th%C3%B4ng-minh/src/services/realGoogleAuth.ts).

---

## 6. Kết quả kiểm thử (đã chạy thật)

```text
npm run lint    → tsc --noEmit, 0 lỗi
npm run build   → tsc --noEmit && vite build
                  ✓ 1727 modules transformed
                  dist/assets/index-*.js  1,123.71 kB │ gzip: 321.18 kB
                  ✓ built in ~10s

npx tsx src/utils/productivityUtils.test.ts  → All productivityUtils tests passed successfully!
npx tsx src/utils/calendarUtils.test.ts      → 8 pass / 0 fail
npx tsx src/utils/dndUtils.test.ts           → All dndUtils tests passed successfully!
npx tsx src/utils/analyticsUtils.test.ts     → All analyticsUtils tests passed successfully!
npx tsx src/services/icalService.test.ts     → All icalService tests passed successfully!
```

Cảnh báo còn lại của Vite (không phải lỗi, có từ trước): bundle > 500 kB và `__dirname` trong `vite.config.ts`.

---

## 7. Hạn chế đã biết

1. **Google Calendar thật** vẫn cần OAuth Client ID của chính bạn (đã đăng ký origin). Không có fallback đăng nhập giả — đúng như yêu cầu trước đó.
2. **Google Health** dùng dữ liệu mô phỏng khi thiếu token/scope; UI luôn ghi rõ nguồn, không giả làm dữ liệu thật.
3. Dữ liệu năng suất lưu **localStorage** (offline-first, giống cách project đang lưu `gcal_events`). Chưa đồng bộ lên Firestore; nếu cần, có thể nối thêm vào `src/services/firestoreSync.ts` theo cùng pattern `subscribeUserEvents`.
4. Nút "Đặt lại dữ liệu" trong `ExportImportModal` khôi phục **cả** lịch/category **và** dữ liệu năng suất (gọi `productivity.resetAll()`, đưa mọi khoá `gcal_prod_*` về seed). Hộp thoại xác nhận nêu rõ việc này trước khi ghi đè.
5. Task mirror lên lịch là **một chiều** ở tầng dữ liệu: task → lịch. Kéo-thả, **co giãn (resize)**, tick hoàn thành, xoá và sửa một event `task-*` đều ghi ngược về task gốc qua `handleSaveEvent` (đổi `dueDate` và/hoặc `startTime`/`endTime`), không tạo bản sao trong `gcal_events`.
6. Phím `P` mở Bảng phân tích năng suất; phím điều hướng kỳ trước chỉ còn `K` (trước đây `P` bị nhánh điều hướng chiếm mất nên phím phân tích không bao giờ chạy).

---

## 8. Cập nhật tiếp theo (vòng cải thiện sau bàn giao)

| Hạng mục | Chi tiết |
| --- | --- |
| **Đồng hồ học tập không còn mất trạng thái** | `StudyFocusView` trước đây giữ đồng hồ trong `useState` nên chuyển sang view khác (component unmount) hoặc tải lại trang là mất phiên đang chạy. Nay trạng thái nằm trong `gcal_focus_timer` (`usePersistentState`) và mọi giá trị hiển thị được **suy ra từ mốc thời gian thực** `runStartedAt`, nên đồng hồ đúng cả khi tab bị ẩn, khi chuyển view và khi reload. Hoàn thành phiên tự lưu lịch sử, tự chuyển Focus ↔ Nghỉ ngắn như cũ. |
| **Bắt đầu tập trung → cập nhật công việc** | Bắt đầu một phiên gắn với task đang `todo` sẽ tự chuyển task sang `in_progress` (prop `onStartTask`), không cần tick tay ở trang Công việc. |
| **Sao lưu / khôi phục dữ liệu năng suất (.json)** | `ExportImportModal` có thêm mục xuất và khôi phục toàn bộ tasks, goals, phiên focus, giao dịch, ngân sách, nhật ký sức khỏe, workout, wellness, hồ sơ sức khỏe. Định dạng `kind: 'productivity-backup'` được kiểm tra bằng `parseProductivityBackup()` trước khi ghi đè — tệp lạ hoặc thiếu collection bị từ chối, không thể xoá dữ liệu. Nút "Nhập" chung cũng tự nhận diện tệp sao lưu năng suất. |
| **Đặt lại toàn bộ** | Nút "Đặt lại" giờ khôi phục cả `gcal_prod_*` qua `productivity.resetAll()` (đã ghi ở mục 7.4). |
| **Kiểm thử** | Thêm `src/utils/productivityBackup.test.ts`: round-trip qua JSON, từ chối mảng sự kiện / object lạ / thiếu collection / thiếu `budget` / `healthProfile` null, và giữ nguyên nội dung item sau khi khôi phục. |
