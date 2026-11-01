# Môi trường kiểm thử GĐ2 của A.I.R

Môi trường local dùng Supabase CLI, `project_id = "air-rental"` trong
`supabase/config.toml`. Container, network và volume do CLI tạo dành riêng cho
project này; không gắn volume hoặc kết nối database của ứng dụng khác.

## Khởi động

Từ thư mục gốc repository, với Docker Desktop đang chạy:

```powershell
npx supabase start -x realtime,storage-api,imgproxy,postgres-meta,studio,edge-runtime,logflare,vector,supavisor
npx supabase status
```

CLI tải các image Supabase cần thiết. Profile kiểm thử chỉ chạy PostgreSQL 15,
Auth, PostgREST, gateway và hộp thư local. Storage/realtime/edge functions không
nằm trong phạm vi kiểm thử này.

| Dịch vụ | Địa chỉ |
| --- | --- |
| Supabase API | http://127.0.0.1:55321 |
| PostgreSQL | 127.0.0.1:55322 |
| Hộp thư local | http://127.0.0.1:55324 |
| Next.js nghiệm thu | http://localhost:3011 |

Lấy URL và anon key từ `supabase status` để cấu hình Next.js. Không đưa service
role key vào trình duyệt hoặc commit file môi trường. Đăng nhập thử dùng địa chỉ
`@example.invalid`; thư đăng nhập nằm trong hộp thư local, không gửi ra ngoài.
Callback được cho phép tại `/auth/callback` trên localhost cổng 3011 và 3000.

Sau khi cài dependency trong `web/`, chạy preview với cấu hình local đồng nhất
khi build và khi chạy (không ghi key vào file):

```powershell
./scripts/start-gd2-preview.ps1 -Build
```

Để kiểm tra tranh chấp tồn kho bằng hai kết nối thật:

```powershell
node scripts/check-booking-concurrency.mjs
```

Script kiểm tra nhãn Docker và thư mục sở hữu project trước khi chạy. Dữ liệu
thử có UUID riêng và được dọn sau bài thử, không reset database.

Bài trình duyệt tạo sản phẩm thử có UUID mới mỗi lần. Catalog có cache 5 phút;
để chạy lại ngay, dừng preview trước rồi khởi động với
`./scripts/start-gd2-preview.ps1 -FreshCatalog` (thêm `-Build` nếu vừa đổi code),
sau đó chạy `node scripts/check-gd2-browser.mjs`. Cờ này chỉ xóa fetch cache được
sinh trong `web/.next/cache/fetch-cache`; không xóa database hay dữ liệu ứng dụng.

## Kiểm tra và dừng

```powershell
npx supabase test db
npx supabase stop
```

Lệnh stop ở thư mục này nhắm project `air-rental`, không tắt Docker Desktop.
CLI giữ dữ liệu local để dùng lại; không dùng `--all` hoặc xóa volume của project
khác. Không chạy reset trên database có dữ liệu cần giữ. Seed catalog chỉ chứa
thiết bị tham khảo; sản phẩm mẫu không trở thành hàng cho thuê khi khởi động.

Kết quả nghiệm thu và giới hạn thực tế được ghi riêng trong `GD2-REVIEW.md`.
