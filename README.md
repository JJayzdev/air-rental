# A.I.R — Thuê thiết bị công nghệ theo ngày

Website cho thuê laptop, điện thoại, máy ảnh, tablet và phụ kiện công nghệ. Người dùng có thể
xem danh mục, chọn lịch thuê, nhận báo giá, đặt đơn, theo dõi trạng thái và quản lý tài khoản.
Đội ngũ vận hành có khu vực quản trị đơn, kho, bảo trì, giá và mã giảm giá.

Ứng dụng chính nằm trong [`web/`](web/) — Next.js 15, React 19, TypeScript strict và Supabase.
Thư mục gốc vẫn giữ bản Vite tĩnh để tham chiếu giao diện và chạy trên GitHub Pages.

## Bản đang chạy

| Bản                | URL                                                    |
| ------------------ | ------------------------------------------------------ |
| Ứng dụng đầy đủ    | https://air-rental.vercel.app                          |
| Giao diện tĩnh     | https://jjayzdev.github.io/air-rental/                 |
| Supabase (backend) | project `iseenbdkqnzzhqttazne`, region `ap-southeast-1` |

Bản Vercel dùng Supabase Cloud, có đăng nhập, đặt thuê, tồn kho và quản trị. Bản GitHub Pages chỉ
là giao diện tĩnh, không có backend.

## Tính năng

- **Danh mục và tìm kiếm**: lọc theo danh mục, sắp xếp theo giá, tìm theo tên hoặc cấu hình.
- **Trang sản phẩm**: thông số, giá theo ngày, tiền cọc, ảnh, nguồn tham khảo và JSON-LD.
- **Giỏ thuê nhiều thiết bị**: chọn số lượng, ngày nhận/trả, hình thức nhận máy.
- **Báo giá phía server**: bậc thuê dài ngày, mã giảm giá, phí giao và tổng tiền sau giảm.
- **Đặt thuê và tồn kho**: giữ máy theo toàn bộ khoảng thuê, chống trùng lịch, idempotency.
- **Tài khoản**: đăng nhập email magic link, hồ sơ, sổ địa chỉ, đơn của tôi, yêu thích.
- **Thanh toán**: trạng thái thanh toán tách khỏi trạng thái đơn, webhook SePay, hoàn cọc.
- **Quản trị**: dashboard, đơn hàng, kho máy vật lý, bảo trì, khu vực giao, mã giảm giá, nhật ký.
- **Trợ lý A.I.R**: FAQ và tìm sản phẩm; LLM tùy chọn, mặc định tắt.
- **Nội dung**: hướng dẫn chọn thiết bị và trung tâm chính sách thuê.
- **SEO**: metadata, canonical, Open Graph, sitemap, robots và dữ liệu có cấu trúc.

## Công nghệ

| Lớp          | Công nghệ                                      |
| ------------ | ---------------------------------------------- |
| Giao diện    | Next.js 15 App Router, React 19, CSS thuần      |
| Ngôn ngữ     | TypeScript strict                              |
| Dữ liệu/Auth | Supabase (Postgres, Auth, RLS, Storage)        |
| Kiểm thử     | Node test runner, pgTAP, Playwright scripts    |
| Chất lượng   | ESLint 9, Prettier, Husky + lint-staged        |
| Triển khai   | Vercel (Next.js), GitHub Actions (CI)          |
| Bản tĩnh     | Vite 7 + React 19 ở thư mục gốc (GitHub Pages) |

## Cấu trúc

```text
.
├── web/                        # Ứng dụng chính Next.js
│   ├── src/app/                # App Router: trang, layout, route handlers
│   ├── src/features/           # booking, cart, pricing, orders, admin, chat...
│   ├── src/components/         # header, footer, chat, UI
│   ├── src/lib/                # env, Supabase client, format, observability
│   └── .env.example
├── supabase/
│   ├── migrations/             # Schema, RLS, RPC đặt thuê và thanh toán
│   ├── tests/                  # pgTAP
│   └── seed.sql                # Danh mục, tồn kho, giá, khu vực giao, mã giảm
├── docs/                       # Tài liệu kỹ thuật và nghiệm thu
├── src/                        # Bản Vite tĩnh (demo giao diện)
└── .github/workflows/          # CI và deploy GitHub Pages
```

## Chạy nhanh

Yêu cầu: **Node 20+**, npm và Docker Desktop (nếu chạy Supabase local).

```bash
cd web
npm install
npm run dev
```

Mở http://localhost:3000.

Ở chế độ không có Supabase, ứng dụng hiển thị catalog xem trước và các trang nội dung. Để đặt
thuê thật, cấu hình Supabase theo hướng dẫn bên dưới.

### Chạy với Supabase local

```bash
# Tại thư mục gốc repo
npx supabase start
npx supabase db reset        # chạy migrations + seed

# Lấy URL và anon key in ra từ lệnh start, sau đó tạo web/.env.local
```

Tạo `web/.env.local`:

```dotenv
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key từ supabase start>
SUPABASE_SERVICE_ROLE_KEY=<service role key từ supabase start>
CHAT_RATE_LIMIT_SECRET=<chuỗi ngẫu nhiên dài>
```

Khởi động lại `npm run dev`. Đăng nhập bằng email magic link; hộp thư local mở tại
http://127.0.0.1:54324.

Seed tạo sẵn 8 thiết bị có thể đặt thuê (`AIR-*`) và 24 sản phẩm tham khảo (`SAMPLE-*`).
Sản phẩm tham khảo không thể đặt thuê.

## Biến môi trường

Xem đầy đủ trong [`web/.env.example`](web/.env.example).

| Biến                            | Bắt buộc | Mô tả                                              |
| ------------------------------- | -------- | -------------------------------------------------- |
| `NEXT_PUBLIC_APP_URL`           | Có       | URL công khai, dùng cho metadata và callback auth  |
| `NEXT_PUBLIC_SUPABASE_URL`      | Có       | URL project Supabase                               |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Có       | Anon key cho client và đọc catalog qua RLS         |
| `SUPABASE_SERVICE_ROLE_KEY`     | Không    | Chat quota, giấy tờ định danh, tác vụ quản trị     |
| `CHAT_RATE_LIMIT_SECRET`        | Không    | Bí mật server cho RPC giới hạn chat                |
| `AIR_ENABLE_PAYMENTS`           | Không    | Bật webhook SePay                                  |
| `SEPAY_WEBHOOK_SECRET`          | Không    | Khớp header `Authorization: Apikey ...` của SePay  |
| `AIR_BANK_NAME`                 | Không    | Tên ngân hàng hiển thị trên trang đơn              |
| `AIR_BANK_ACCOUNT_NUMBER`       | Không    | Số tài khoản nhận chuyển khoản                     |
| `AIR_BANK_ACCOUNT_NAME`         | Không    | Tên chủ tài khoản                                  |
| `AIR_ENABLE_CHAT_LLM`           | Không    | Bật trả lời bằng LLM                               |
| `OPENAI_API_KEY`                | Không    | Khóa cho chat LLM                                  |
| `AIR_ENABLE_PHONE_OTP`          | Không    | Bật đăng nhập OTP điện thoại                       |
| `AIR_ENABLE_IDENTITY_DOCUMENTS` | Không    | Bật thu thập giấy tờ định danh                     |

Không commit `.env.local` hoặc khóa service role.

## Lệnh

Tại `web/`:

| Lệnh                   | Việc                              |
| ---------------------- | --------------------------------- |
| `npm run dev`          | Dev server (cổng 3000)            |
| `npm run build`        | Build production                  |
| `npm start`            | Chạy bản build                    |
| `npm test`             | 66 Node test cho domain và schema |
| `npm run lint`         | ESLint                            |
| `npm run typecheck`    | `tsc --noEmit`                    |
| `npm run format`       | Prettier                          |
| `npm run format:check` | Kiểm tra định dạng                |

Tại thư mục gốc (bản Vite):

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # dist/
npm run preview
```

Supabase:

```bash
npx supabase start
npx supabase db reset
npx supabase test db
npx supabase gen types typescript --local > web/src/lib/supabase/database.ts
```

## Kiểm thử

- **66 Node test** cho pricing, booking, catalog, cart, auth cookie, chat và tiện ích.
- **290 pgTAP** cho schema, RLS, RPC đặt thuê, tồn kho, thanh toán, quản trị và chính sách.
- **Script Playwright** trong `scripts/` cho các luồng đặt thuê, thanh toán và giao diện.

```bash
cd web && npm test && npm run lint && npm run typecheck && npm run build
npx supabase test db
```

## Triển khai

### Vercel (ứng dụng đầy đủ)

Bản production hiện chạy tại **https://air-rental.vercel.app**, backend là Supabase Cloud
`iseenbdkqnzzhqttazne`. Project Vercel đã kết nối GitHub: mỗi push lên `main` tự động deploy
production từ thư mục `web/`.

1. Tạo project Supabase Cloud (khuyến nghị region `ap-southeast-1`).
2. Chạy migrations và seed:

   ```bash
   npx supabase link --project-ref <project-ref>
   npx supabase db push --remote --include-seed
   ```

3. Import thư mục `web/` vào Vercel, đặt các biến môi trường ở trên.
4. Thêm URL Vercel vào **Auth → URL Configuration** của Supabase:
   - Site URL: `https://<domain>`
   - Redirect URLs: `https://<domain>/auth/callback`, `http://localhost:3000/auth/callback`

5. Cấp quyền quản trị cho tài khoản đầu tiên sau khi đăng nhập:

   ```sql
   update public.profiles set role = 'admin' where id = (
     select id from auth.users where email = 'you@example.com'
   );
   ```

Sau khi thêm domain riêng, cập nhật `NEXT_PUBLIC_APP_URL` và danh sách redirect trong Supabase rồi
deploy lại.

### GitHub Pages (bản tĩnh)

Workflow `.github/workflows/deploy-pages.yml` build bản Vite ở thư mục gốc và phát hành lên
GitHub Pages. Bản này chỉ là giao diện tĩnh, không có đăng nhập, thanh toán hay quản trị.

## Dữ liệu

- Seed tạo **8 thiết bị có thể đặt thuê** với 3 máy mỗi model, đủ để kiểm tra toàn bộ luồng.
- **24 sản phẩm tham khảo** giữ nhãn `is_sample = true` và không thể đặt thuê. Đây là dữ liệu
  minh hoạ, không phải xác nhận quyền sở hữu hay tồn kho thực tế.
- Giá, tiền cọc, khu vực giao và mã giảm giá là dữ liệu mẫu trong `supabase/seed.sql`.
- Trước khi vận hành thương mại, thay bằng hàng thật, ảnh có quyền sử dụng và bảng giá đã duyệt.

## Giới hạn

- Thanh toán mặc định tắt; SePay và ngân hàng thật cần cấu hình riêng.
- SMS OTP và giấy tờ định danh mặc định tắt.
- Chat LLM mặc định tắt; FAQ cục bộ vẫn hoạt động.
- Hoá đơn hiện là bản in trình duyệt, chưa phải hoá đơn VAT.
- Dữ liệu seed phục vụ đánh giá sản phẩm, không phải hợp đồng cho thuê thực tế.

## Ghi công & giấy phép

Giao diện tham khảo **"Electronics Rental Website"** của **Pam** trên Figma Community, giấy phép
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Bản này giữ tinh thần bố cục gốc, viết
lại logic bằng React/Next.js và bổ sung backend Supabase.

- Ảnh sản phẩm tham khảo: Unsplash và Wikimedia Commons, ghi công trên từng trang.
- Mascot robot thuộc tác phẩm gốc của Pam.
