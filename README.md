# Google Calendar Pro — Lịch Thông Minh

Ứng dụng quản lý lịch & thói quen viết bằng React 19 + TypeScript + Vite + Tailwind CSS v4, tích hợp **đồng bộ dữ liệu thật** với Google Calendar.

## Tính năng

- **Xem lịch**: Ngày / Tuần / Tháng / Năm, kéo-thả và thay đổi thời lượng sự kiện.
- **Âm lịch Việt Nam**: hiển thị song song dương lịch, ngày lễ, giờ hoàng đạo.
- **Đồng bộ Google Calendar thật** (3 cách, xem bên dưới).
- **Multi-Hub**: Pomodoro, Tài chính, Học tập, Sức khỏe.
- **Google Meet room** trong app, nhập/xuất `.ics`, phân tích thời gian, cảnh báo quá tải.
- **Firestore sync** (tuỳ chọn, dùng Firebase project đã cấu hình trong `firebase-applet-config.json`).

## Chạy cục bộ

```bash
npm ci
npm run dev      # http://localhost:3000 (tự nhảy 3001/3002 nếu bận)
npm run lint     # tsc --noEmit
npm run build    # tsc --noEmit && vite build -> dist/
```

## Đồng bộ Google Calendar thật

Mở hộp thoại **Đồng bộ Google** (nút trên header) và chọn một trong ba tab:

### 1. Tab "Đăng Nhập Google API" — Google Identity Services popup

Mở popup consent chính thức của Google, lấy access token có scope
`calendar.events`, `calendar.readonly`, `userinfo.profile`, `userinfo.email`,
sau đó gọi Google Calendar API v3 để nạp sự kiện thật.

> [!IMPORTANT]
> Client ID mặc định trong `firebase-applet-config.json` là client dùng chung của
> AI Studio, **chỉ chấp nhận origin đã đăng ký của nó**. Nếu bạn thấy
> `400: origin_mismatch`, hãy dùng Client ID riêng:
>
> 1. Vào [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)
> 2. Tạo **OAuth client ID** loại *Web application*
> 3. Thêm origin của bạn vào **Authorized JavaScript origins**, ví dụ:
>    - `http://localhost:3000`
>    - `http://localhost:3001`
>    - `https://<ten-du-an>.vercel.app`
> 4. Bật **Google Calendar API** cho project đó
> 5. Dán Client ID vào ô "Dùng Client ID của bạn" trong hộp thoại đồng bộ,
>    hoặc đặt biến môi trường `VITE_GOOGLE_CLIENT_ID` (xem `.env.example`)

### 2. Tab "Đăng Nhập Google API" → Access Token

Dán access token lấy từ [Google OAuth 2.0 Playground](https://developers.google.com/oauthplayground):

1. Chọn scope `https://www.googleapis.com/auth/calendar.events`
2. **Authorize APIs** → đăng nhập → **Exchange authorization code for tokens**
3. Sao chép *Access token* (`ya29...`) và dán vào ô trong app

Cách này không phụ thuộc origin, hoạt động ngay trên mọi domain. Token hết hạn
sau ~1 giờ, khi đó app sẽ báo lỗi và bạn chỉ cần dán token mới.

### 3. Tab "URL Bí Mật (Không Cần API)"

Dán **Địa chỉ bí mật ở định dạng iCal** của lịch Google:

> Google Calendar → bánh răng ⚙ → *Cài đặt và chia sẻ* → chọn lịch →
> *Tích hợp lịch* → **Địa chỉ bí mật ở định dạng iCal** (kết thúc bằng `basic.ics`)

App tải và parse `.ics` qua CORS proxy dự phòng (`allorigins.win`, `corsproxy.io`).
Không cần API key, không cần Client ID, dữ liệu là lịch thật của bạn.

> [!NOTE]
> Không có chế độ đăng nhập giả hay dữ liệu giả lập. Nếu chưa xác thực được
> Google, app giữ nguyên dữ liệu cục bộ và hiển thị trạng thái ngoại tuyến.

## Triển khai Vercel

Repo đã có `vercel.json`:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

Thêm biến môi trường `VITE_GOOGLE_CLIENT_ID` trong *Project Settings → Environment
Variables* nếu dùng Client ID riêng, rồi nhớ thêm domain Vercel vào
**Authorized JavaScript origins**.

> [!WARNING]
> Tất cả file nguồn phải là UTF-8 **không có BOM**. BOM ở đầu `package.json`
> khiến Vercel báo `Unexpected token '﻿', "{ "na"... is not valid JSON`.

## Cấu trúc

```
src/
  components/          UI (MonthView, TimeGridView, Header, CloudSyncModal, MultiHubDrawer…)
  components/sync/     CloudSyncModal — 3 luồng đồng bộ thật
  services/
    auth.ts            Firebase session + real access-token storage (no fake users)
    realGoogleAuth.ts  GIS OAuth popup + userinfo + Calendar API sync
    googleCalendarSync.ts  Google Calendar API v3 client
    googleCalendarUrlSync.ts  iCal secret-URL fetch qua CORS proxy
    icalService.ts     Parse/export .ics
    firestoreSync.ts   Firestore realtime sync
  utils/               lunar, dnd, analytics
  types/               calendar, multiHub
```

## Kiểm thử

Test dùng `node:test`-style assertions và chạy trực tiếp bằng `tsx`:

```bash
npx tsx src/utils/calendarUtils.test.ts
npx tsx src/utils/dndUtils.test.ts
npx tsx src/utils/analyticsUtils.test.ts
npx tsx src/services/icalService.test.ts
```
