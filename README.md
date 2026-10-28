# Squat Counter

Web app nội bộ giúp mọi thành viên trong công ty đếm rep squat bằng webcam và thi đua trên bảng xếp hạng.
Việc nhận diện tư thế chạy **hoàn toàn trên trình duyệt** (MediaPipe), video không bao giờ rời khỏi máy người dùng.

## Tính năng

- **Tập luyện**: bật camera, AI vẽ khung xương, đếm rep theo thời gian thực, phát âm "ding" mỗi rep, gợi ý tư thế ("Hạ thấp hơn", "Đứng thẳng chân trái"…). Kết thúc buổi tập thì kết quả được lưu tự động.
- **Video mẫu**: thử nhanh với video có sẵn (không cần camera, kết quả không được lưu).
- **Tổng quan**: số rep hôm nay / tuần / tháng / tổng, chuỗi ngày tập liên tiếp, biểu đồ 7 ngày, hạng trong tuần.
- **Bảng xếp hạng**: cá nhân và phòng ban, theo hôm nay / tuần / tháng / tất cả. Phòng ban có thêm chỉ số rep/người để so sánh công bằng.
- **Lịch sử**: xem và xoá các buổi tập của mình.
- **Quản trị**: cấp/hạ quyền admin, khoá/mở khoá tài khoản. Tài khoản đầu tiên đăng ký tự động là admin.
- Giới hạn đăng ký theo domain email công ty (`ALLOWED_EMAIL_DOMAINS`).

## Kiến trúc

```
Trình duyệt                                   Server (Next.js 16, Node.js)
┌─────────────────────────────────┐           ┌──────────────────────────────────┐
│ Webcam → MediaPipe PoseLandmarker│           │ proxy.ts   kiểm tra cookie phiên  │
│        → SquatCounter (đếm rep) │  Server   │ lib/auth   DAL: xác thực + quyền  │
│        → kết thúc buổi tập ─────┼─ Action ─→│ actions    validate (zod) + lưu   │
└─────────────────────────────────┘           │ lib/*.ts   truy vấn SQLite        │
                                              └──────────────┬───────────────────┘
                                                             ▼
                                                  SQLite (better-sqlite3, WAL)
```

| Thư mục / file | Vai trò |
|---|---|
| `src/lib/squat/counter.ts` | Thuật toán đếm rep (port từ `legacy/MAIN.py`), thuần TypeScript, có unit test |
| `src/lib/squat/pose.ts` | Tải MediaPipe (tự host trong `public/mediapipe`, fallback CDN) |
| `src/app/(app)/workout/workout-client.tsx` | Màn hình tập: camera, vòng lặp nhận diện, vẽ khung xương, lưu kết quả |
| `src/lib/db.ts` | Kết nối SQLite + migration (`PRAGMA user_version`) |
| `src/lib/auth.ts`, `session-token.ts` | Phiên đăng nhập JWT (cookie httpOnly, 7 ngày), Data Access Layer |
| `src/lib/users.ts`, `workouts.ts` | Truy vấn người dùng, buổi tập, thống kê, bảng xếp hạng |
| `src/lib/time.ts` | Tính "hôm nay / tuần / tháng" theo múi giờ công ty (tuần bắt đầu thứ Hai) |
| `src/proxy.ts` | Chặn sớm truy cập khi chưa đăng nhập |
| `legacy/MAIN.py` | Script Python gốc (OpenCV), giữ lại để tham khảo |

### Thuật toán đếm rep

Giữ nguyên logic của `MAIN.py`: tính góc gối (hông, gối, cổ chân) cho từng chân, phân loại *squat / chuyển tiếp / đứng thẳng*, và đếm 1 rep khi cả hai chân chuyển từ đứng thẳng xuống squat. Có hai điều chỉnh, đã đo trên video mẫu:

1. **Dùng `worldLandmarks` (toạ độ 3D theo mét) thay vì toạ độ ảnh chuẩn hoá.** Toạ độ chuẩn hoá chia x theo chiều rộng, y theo chiều cao, nên góc bị méo trên video 16:9. Với video mẫu, người đứng thẳng chỉ đo được ~125–135°, không bao giờ đạt ngưỡng 150°, nên chỉ đếm được 1 rep. Với world landmarks, đứng thẳng đo được ~148–160°.
2. **Ngưỡng đứng thẳng 145° (thay vì 150°)**, để có biên an toàn. Squat vẫn là gối < 105°; vùng 105–145° vẫn loại bỏ được các lần squat nửa vời.

## Chạy ở máy local

Yêu cầu: Node.js ≥ 22.18.

```bash
npm install          # tự copy MediaPipe WASM và tải model vào public/mediapipe
cp .env.example .env.local
npm run dev          # http://localhost:3000
```

Người đăng ký đầu tiên sẽ là admin.

```bash
npm test             # unit test (thuật toán đếm rep, múi giờ)
npm run typecheck
npm run lint
```

## Cấu hình (`.env.local`)

| Biến | Mặc định | Ghi chú |
|---|---|---|
| `SESSION_SECRET` | *(bắt buộc ở production)* | Tạo bằng `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"` |
| `DATABASE_PATH` | `./data/squat-counter.db` | File SQLite, tự tạo khi chạy lần đầu |
| `ALLOWED_EMAIL_DOMAINS` | *(trống = cho phép tất cả)* | VD: `congty.vn,congty.com` |
| `APP_TIMEZONE` | `Asia/Ho_Chi_Minh` | Múi giờ để tính ngày/tuần/tháng |

## Triển khai

```bash
npm ci && npm run build
SESSION_SECRET=... ALLOWED_EMAIL_DOMAINS=congty.vn npm start   # cổng 3000
```

- **Bắt buộc HTTPS.** Trình duyệt chỉ cho truy cập camera trên HTTPS (hoặc `localhost`), và cookie phiên đăng nhập có cờ `Secure`. Đặt app sau reverse proxy có TLS (Nginx, Caddy, Traefik…). Nếu truy cập qua `http://<IP-nội-bộ>`, cả camera lẫn đăng nhập đều sẽ không hoạt động.
- **Chạy 1 instance trên server có ổ đĩa bền** (VM, Docker có volume). SQLite thừa sức cho vài nghìn người dùng. Không phù hợp với nền tảng serverless (Vercel…) vì filesystem không bền. Nếu cần scale ngang, chuyển sang Postgres (chỉ cần thay phần truy vấn trong `src/lib/users.ts` và `workouts.ts`).
- **Sao lưu**: `sqlite3 data/squat-counter.db ".backup backup.db"` (an toàn khi app đang chạy), hoặc chép cả thư mục `data/` khi đã dừng app.
- Mạng công ty chặn CDN cũng không sao: MediaPipe được tự host trong `public/mediapipe` (tạo khi `npm install`).

## Giới hạn cần biết

- Rep được đếm **trên trình duyệt**, server chỉ kiểm tra tính hợp lý (≤ 1000 rep/buổi, ≥ 0,6 giây/rep, thời điểm bắt đầu hợp lệ). Người rành kỹ thuật vẫn có thể gửi số liệu giả. Với thi đua nội bộ thì như vậy là đủ; nếu có giải thưởng lớn, nên có thêm bước kiểm tra thủ công.
- Để nhận diện tốt: đứng cách camera 2–3 m, thấy rõ toàn thân (hông, gối, cổ chân), đủ ánh sáng.
