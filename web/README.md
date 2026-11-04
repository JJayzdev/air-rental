# A.I.R — Ứng dụng Next.js

Ứng dụng chính của A.I.R: website thuê thiết bị công nghệ theo ngày, xây dựng bằng Next.js 15,
React 19, TypeScript strict và Supabase.

## Chạy

```bash
npm install
cp .env.example .env.local   # cấu hình Supabase
npm run dev                  # http://localhost:3000
```

Build production:

```bash
npm run build
npm start
```

## Biến môi trường

Tối thiểu để chạy đầy đủ:

```dotenv
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Tùy chọn: `SUPABASE_SERVICE_ROLE_KEY`, `CHAT_RATE_LIMIT_SECRET`, cấu hình SePay, OTP điện thoại,
giấy tờ định danh và chat LLM. Xem [`.env.example`](.env.example).

Nếu chưa cấu hình Supabase, ứng dụng hiển thị catalog xem trước và các trang nội dung; luồng đặt
thuê cần Supabase hoạt động.

## Cấu trúc

```text
src/
├── app/                 App Router
│   ├── (rental)/        giỏ thuê, checkout, tài khoản, đơn, quản trị
│   ├── san-pham/        danh mục và chi tiết sản phẩm
│   ├── huong-dan/       cẩm nang chọn thiết bị
│   ├── chinh-sach/      điều khoản, hủy đơn, giao nhận, bảo mật, hỗ trợ
│   └── api/             chat, webhook SePay, auth callback
├── components/          header, footer, chat, UI
├── features/            booking, cart, pricing, orders, admin, favorites, chat
├── lib/                 env, Supabase client, format, observability
└── middleware.ts        refresh session
```

## Lệnh

| Lệnh                   | Việc                           |
| ---------------------- | ------------------------------ |
| `npm run dev`          | Dev server (cổng 3000)         |
| `npm run build`        | Build production               |
| `npm start`            | Chạy bản build                 |
| `npm test`             | Node test cho domain và schema |
| `npm run lint`         | ESLint 9 flat config           |
| `npm run typecheck`    | `tsc --noEmit`                 |
| `npm run format`       | Prettier                       |
| `npm run format:check` | Kiểm tra định dạng             |

## Luồng chính

1. Người dùng chọn thiết bị tại `/san-pham`.
2. Thêm vào giỏ thuê tại `/gio-thue`, chọn ngày và hình thức nhận.
3. Server tính báo giá từ bảng giá, bậc thuê, mã giảm và phí giao.
4. Đăng nhập tại `/dang-nhap`, hoàn tất thông tin tại `/checkout`.
5. Đơn được tạo qua RPC atomic, giữ máy theo toàn bộ khoảng thuê.
6. Theo dõi tại `/don-thue`; staff xử lý tại `/quan-ly-don` và `/admin`.

## Dữ liệu

Seed tạo 8 thiết bị có thể đặt thuê với 3 máy mỗi model, cùng 24 sản phẩm tham khảo
(`is_sample = true`) không thể đặt. Giá, cọc, khu vực giao và mã giảm là dữ liệu mẫu trong
[`../supabase/seed.sql`](../supabase/seed.sql).

## Kiểm thử

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

Kiểm thử database nằm ở [`../supabase/tests`](../supabase/tests):

```bash
npx supabase test db
```

## Triển khai

Deploy thư mục `web/` lên Vercel và cấu hình các biến môi trường trong dashboard. Thêm domain vào
**Supabase → Auth → URL Configuration** với redirect `/auth/callback`.

Bản Vite ở thư mục gốc được deploy riêng lên GitHub Pages và chỉ là giao diện tĩnh.
