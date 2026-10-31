# A.I.R — Kiến trúc & lộ trình phát triển hoàn chỉnh

Tài liệu này mô tả đích đến của dự án: công nghệ, cấu trúc thư mục, mô hình dữ liệu và
các giai đoạn triển khai. Hiện trạng (React 19 + Vite, 2.126 dòng, không backend) là
**điểm xuất phát**, không phải đích.

---

## 1. Quyết định công nghệ

### 1.1 Khuyến nghị: Next.js 15 (App Router)

| Lý do          | Chi tiết                                                                                                   |
| -------------- | ---------------------------------------------------------------------------------------------------------- |
| SEO            | Trang sản phẩm cần index Google ("thuê macbook air", "thuê máy ảnh hà nội"). SPA hiện tại gần như vô hình. |
| SSR/ISR        | Giá và tồn kho render phía server, không lộ toàn bộ catalog trong bundle.                                  |
| Server Actions | Đặt đơn, tính giá lại phía server — không tin số tiền từ client.                                           |
| Route handlers | Webhook thanh toán (MoMo/VNPay/SePay) cần endpoint thật.                                                   |
| Hệ sinh thái   | Dễ tuyển người, tài liệu nhiều, deploy Vercel một cú click.                                                |

**Phương án thay thế** — Vite + React Router 7 (framework mode). Giữ được gần như
nguyên code hiện tại, ít migration hơn, nhưng phải tự lo SSR/metadata. Chọn phương án
này nếu: không quan tâm SEO, hoặc muốn ra bản nội bộ nhanh trong 2–3 tuần.

> Không khuyến nghị ở lại SPA thuần (Vite + state routing) cho bản thương mại.

### 1.2 Bảng công nghệ đích

| Lớp           | Lựa chọn                                                                           | Ghi chú                                                                                |
| ------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Framework     | Next.js 15 (App Router)                                                            | React 19                                                                               |
| Ngôn ngữ      | TypeScript (strict)                                                                | 2.1k dòng hiện tại → chuyển ~1 ngày                                                    |
| Styling       | **Giữ `site.css` hiện tại**, CSS Modules cho component mới                         | Không viết lại UI. Tailwind v4 optional, chỉ dùng cho trang admin                      |
| UI kit        | shadcn/ui (chỉ cho admin)                                                          | Copy-paste, không lock-in                                                              |
| Backend/DB    | **Supabase** (Postgres + Auth + Storage + RLS + Edge Functions)                    | Rời bỏ khi nào: >50k đơn/tháng hoặc cần logic kho phức tạp → NestJS + Postgres tự host |
| Auth          | Supabase Auth — **OTP số điện thoại** (ESMS/Twilio), email magic-link dự phòng     | Người Việt dùng SĐT, không nhớ mật khẩu                                                |
| Server state  | TanStack Query + Server Components                                                 | Cache, revalidate, optimistic update                                                   |
| Client state  | Zustand + `persist` (chỉ cho giỏ hàng)                                             | Giỏ là state client duy nhất cần tồn tại                                               |
| Form          | react-hook-form + Zod                                                              | Dùng chung schema client/server                                                        |
| Tiền tệ       | Số nguyên VND (`bigint`/`int`), **không dùng float**                               | 350000, không phải 350000.00                                                           |
| Ngày          | `date` (không timestamp), timezone `Asia/Ho_Chi_Minh`                              | Khoảng thuê là ngày lịch                                                               |
| Ảnh           | Supabase Storage / Cloudflare R2 + `next/image`                                    | Bỏ hotlink Unsplash                                                                    |
| Thanh toán    | GĐ đầu: chuyển khoản + **SePay** webhook (phí thấp, tự đối soát). Sau: MoMo, VNPay | Stripe chỉ khi bán cho khách quốc tế                                                   |
| Email/SMS     | Resend (email) + Zalo OA / ESMS (SMS)                                              | Xác nhận đơn, nhắc trả máy                                                             |
| Chat AI       | Giữ rule-based làm FAQ, thêm LLM tool-calling để tra sản phẩm/tồn kho              | Route handler + rate limit                                                             |
| Test          | Vitest + Testing Library (unit), Playwright (e2e luồng đặt thuê)                   |                                                                                        |
| Chất lượng    | ESLint + Prettier + `tsc --noEmit`                                                 | Bắt buộc trong CI                                                                      |
| Observability | Sentry + PostHog (hoặc Umami self-host)                                            |                                                                                        |
| CI/CD         | GitHub Actions → Vercel; Supabase CLI cho migration                                | Preview deploy mỗi PR                                                                  |
| Env           | `@t3-oss/env-nextjs` + Zod                                                         | Fail-fast khi thiếu biến môi trường                                                    |

---

## 2. Cấu trúc thư mục đích

Tổ chức **theo feature**, không theo loại file. Mỗi feature tự chứa schema, query, component.

```
air/
├─ src/
│  ├─ app/
│  │  ├─ layout.tsx                    # providers, font, metadata gốc
│  │  ├─ globals.css                   # = site.css hiện tại
│  │  ├─ (marketing)/
│  │  │  ├─ page.tsx                   # trang chủ
│  │  │  ├─ san-pham/page.tsx          # catalog, filter qua searchParams
│  │  │  ├─ san-pham/[slug]/page.tsx   # chi tiết + JSON-LD Product
│  │  │  ├─ cach-thuc-thue/page.tsx
│  │  │  └─ ve-chung-toi/page.tsx
│  │  ├─ (shop)/
│  │  │  ├─ gio-thue/page.tsx
│  │  │  ├─ dat-thue/page.tsx          # checkout
│  │  │  └─ dat-thue/thanh-cong/[code]/page.tsx
│  │  ├─ (account)/
│  │  │  ├─ tai-khoan/page.tsx
│  │  │  ├─ don-thue/page.tsx
│  │  │  └─ don-thue/[code]/page.tsx
│  │  ├─ admin/                        # bảo vệ bằng middleware + role
│  │  │  ├─ layout.tsx
│  │  │  ├─ page.tsx                   # dashboard
│  │  │  ├─ san-pham/…
│  │  │  ├─ don-thue/…
│  │  │  ├─ kho/…
│  │  │  └─ khach-hang/…
│  │  └─ api/
│  │     ├─ webhooks/sepay/route.ts
│  │     ├─ webhooks/momo/route.ts
│  │     └─ chat/route.ts
│  ├─ features/
│  │  ├─ products/{api.ts,queries.ts,schema.ts,types.ts,components/}
│  │  ├─ availability/{api.ts,queries.ts}
│  │  ├─ cart/{store.ts,components/}
│  │  ├─ checkout/{schema.ts,actions.ts,components/}
│  │  ├─ orders/{api.ts,queries.ts,status.ts,components/}
│  │  ├─ auth/{actions.ts,components/}
│  │  ├─ chat/{agent.ts,components/}
│  │  └─ admin/
│  ├─ components/
│  │  ├─ ui/                           # Button, Input, Dialog… (shadcn)
│  │  └─ layout/                       # Header, Footer, BottomNav
│  ├─ lib/
│  │  ├─ supabase/{client.ts,server.ts,middleware.ts}
│  │  ├─ money.ts, dates.ts, format.ts
│  │  ├─ env.ts
│  │  └─ seo.ts                        # metadata helpers
│  ├─ styles/
│  └─ types/database.ts                # sinh tự động: supabase gen types
├─ supabase/
│  ├─ migrations/                      # SQL versioned
│  └─ seed.sql
├─ e2e/                                # Playwright
└─ docs/
```

**Quy ước quan trọng**

- `server-only` cho mọi file chạm service key.
- Mutation = **Server Action**; chỉ webhook và chat dùng route handler.
- Không import `lib/supabase/server.ts` vào client component.
- Mỗi feature export qua `index.ts`, không import xuyên qua đường dẫn nội bộ.

---

## 3. Mô hình dữ liệu

### 3.1 Bảng chính

| Bảng            | Mục đích                      | Ghi chú                                               |
| --------------- | ----------------------------- | ----------------------------------------------------- |
| `categories`    | Laptop, Điện thoại, Máy ảnh…  | slug, thứ tự hiển thị                                 |
| `products`      | Mẫu sản phẩm                  | slug, giá/ngày, mô tả, specs `jsonb`, ảnh, `status`   |
| `product_units` | **Từng máy vật lý** (serial)  | `status`: available / rented / maintenance / retired  |
| `price_tiers`   | Giảm giá theo số ngày         | 1–2 ngày, 3–6 ngày −10%, 7+ ngày −20%                 |
| `orders`        | Đơn thuê                      | mã, user, khoảng ngày, tiền, trạng thái               |
| `order_items`   | Dòng đơn — **1 dòng = 1 máy** | giữ `unit_id` + `period daterange`                    |
| `payments`      | Giao dịch                     | provider, `txn_ref`, số tiền, raw `jsonb`, trạng thái |
| `deposits`      | Cọc & hoàn cọc                | tách riêng để đối soát                                |
| `profiles`      | Hồ sơ khách                   | tên, SĐT, địa chỉ, `role`                             |
| `favorites`     | Yêu thích                     | đồng bộ đa thiết bị                                   |
| `coupons`       | Mã giảm giá                   | % hoặc số tiền, giới hạn lượt                         |
| `order_events`  | Audit log trạng thái          | ai đổi, khi nào, ghi chú                              |

### 3.2 Chống trùng lịch ở tầng database

Đây là điểm quan trọng nhất. Không kiểm tra bằng `if` trong ứng dụng — hai request
đồng thời sẽ cùng pass. Dùng ràng buộc loại trừ của Postgres:

```sql
create extension if not exists btree_gist;

-- mỗi dòng order_items là MỘT máy vật lý
create table order_items (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references orders(id) on delete cascade,
  unit_id     uuid not null references product_units(id),
  price_per_day int not null check (price_per_day > 0),
  period      daterange not null,          -- [ngày nhận, ngày trả)
  constraint no_double_booking exclude using gist (
    unit_id with =,
    period  with &&
  )
);
```

- Máy có serial (laptop, camera) → mỗi máy là 1 unit, ràng buộc trên `unit_id`.
- Phụ kiện không serial (AirPods) → bảng `stock_counters` + `select … for update`
  khi tạo đơn, hoặc cũng cấp serial để đơn giản hoá.
- Luôn chừa **1 ngày buffer** giữa hai lượt thuê (vệ sinh, sạc, kiểm tra) —
  cộng vào `period` khi tính.

### 3.3 Vòng đời đơn

```
pending ──confirm──> confirmed ──prepare──> delivering ──handover──> active
   │                     │                                                 │
   └──cancel──> cancelled └──cancel (hoàn tiền)                             │
                                                          ┌──return──> returning ──inspect──> completed
                                                          └──overdue──> overdue
```

Tách **trạng thái đơn** khỏi **trạng thái thanh toán** (`unpaid` / `deposit_paid` /
`paid` / `refunded`). Đừng gộp thành một cột.

### 3.4 Giá — luôn tính lại ở server

Client gửi lên: `{ items: [{unitId, days}], coupon?, method }`.
Server tính lại `subtotal` từ `price_tiers` + DB, cộng ship, cộng cọc, rồi mới tạo đơn.
Không nhận `total` từ client trong bất kỳ trường hợp nào.

---

## 4. Giai đoạn triển khai

Ước lượng cho **1 dev full-time**. Đội 2 người chia đôi được phần lớn giai đoạn 3–5.

### GĐ 0 — Nền móng (3–5 ngày)

**Trạng thái: xong phần code và nghiệm thu giao diện; deploy preview bỏ qua. Còn chờ `git init`
để cài hook Husky.**

- [x] Tạo app Next.js 15 + TypeScript strict, port `site.css` và 8 view hiện tại → `web/`
- [x] ESLint, Prettier, `tsc --noEmit` (Husky + lint-staged đã cấu hình, chưa cài được hook)
- [x] Env schema (Zod), Sentry hook (`lib/observability.ts`), cấu trúc `features/`
- [x] CI: lint + typecheck + build trên mỗi PR (`.github/workflows/ci.yml`)
- [x] **Nghiệm thu giao diện**: 0 khác biệt qua 13 bước tương tác, ≤0,3% pixel (nhiễu animation)
- [~] Deploy preview: **bỏ qua theo quyết định** — thay bằng build production chạy local

### GĐ 1 — Catalog thật (1 tuần)

- Schema Supabase cho `categories`, `products`, `product_units`, `price_tiers`, RLS đọc công khai.
- Seed 20–30 sản phẩm thật + ảnh tự chụp/đặt mua.
- Trang danh mục: filter/sort qua **URL searchParams** (`?danh-muc=laptop&sap-xep=gia-tang`).
- Trang chi tiết SSR, `generateMetadata`, Open Graph, JSON-LD `Product`.
- `sitemap.ts`, `robots.ts`, canonical.
- Upload ảnh lên Storage, `next/image`, nén mascot 1.37 MB → WebP.

### GĐ 2 — Đặt thuê & tồn kho (1.5 tuần) ← **trái tim của hệ thống**

- API kiểm tra trống theo khoảng ngày (dùng exclusion constraint ở §3.2).
- Lịch chọn ngày trên UI, disable ngày đã kín.
- Giỏ hàng (Zustand + persist) → checkout.
- Server Action tạo đơn: validate Zod, tính giá lại, giữ chỗ nguyên tử, sinh mã `AIR-YYMMDD-XXXX`.
- Trang xác nhận + tra cứu đơn bằng mã (không cần đăng nhập).
- Email xác nhận (Resend) + Zalo/SMS.
- **Nghiệm thu**: 2 tab đặt cùng 1 máy cùng ngày → tab thứ hai bị chặn ở tầng DB.

### GĐ 3 — Tài khoản (1 tuần)

- OTP số điện thoại, session cookie qua middleware.
- Hồ sơ, sổ địa chỉ, đơn của tôi, yêu thích đồng bộ.
- Upload CCCD cho đơn giá trị cao (yêu cầu thực tế của ngành cho thuê máy ảnh/laptop).
- Middleware bảo vệ `/admin`, phân quyền `customer` / `staff` / `admin`.

### GĐ 4 — Thanh toán & cọc (1–1.5 tuần)

- Chuyển khoản + SePay webhook (xác thực chữ ký, idempotency key).
- MoMo/VNPay nếu cần thanh toán tức thì.
- Cọc 30% (hoặc theo `category`), hoàn cọc khi đơn `completed`.
- Hoá đơn PDF, lịch sử giao dịch.
- **Nghiệm thu**: webhook replay không tạo thanh toán trùng.

### GĐ 5 — Admin (1.5 tuần)

- Dashboard: đơn chờ xác nhận, máy đang cho thuê, doanh thu tháng.
- Quản lý đơn theo vòng đời §3.3, in phiếu bàn giao.
- Quản lý sản phẩm + máy vật lý + lịch bảo trì.
- Mã giảm giá, phí giao theo khu vực, lịch giao.
- Nhật ký thao tác (`order_events`).

### GĐ 6 — Chat AI & nội dung (3–5 ngày)

- Giữ rule-based cho câu hỏi thường gặp (nhanh, miễn phí).
- Thêm LLM tool-calling: `searchProducts`, `checkAvailability`, `getOrderStatus`.
- Rate limit theo IP + user, giới hạn token, log hội thoại.
- Blog/SEO content: hướng dẫn thuê, so sánh máy — kênh khách hàng chính của ngành này.

### GĐ 7 — Hoàn thiện & ra mắt (1 tuần)

- Playwright: đặt thuê → thanh toán → tra cứu đơn; Vitest cho tính giá/ngày.
- Fix accessibility còn tồn: badge "Còn hàng" (2.97), bottom-nav 9px (3.55), timestamp chat 8px (2.81), focus ring, chat dùng được bằng bàn phím.
- Performance budget: LCP < 2.5s trên 4G, JS khởi tạo < 200 kB gzip.
- Trang pháp lý: điều khoản thuê, chính sách huỷ/hoàn cọc, bảo mật dữ liệu cá nhân (NĐ 13/2023/NĐ-CP), hiển thị giá đã gồm VAT.
- Backup DB, alert lỗi, runbook sự cố.

### GĐ 8 — Sau ra mắt

Đánh giá/sao, giới thiệu bạn bè, khách quen, đa chi nhánh, PWA, giao diện tiếng Anh cho khách du lịch.

**Tổng: ~8–10 tuần** (1 dev) · **~4–5 tuần** (2 dev).

---

## 5. Chi phí vận hành dự kiến

| Khoản                 | Hàng tháng                  |
| --------------------- | --------------------------- |
| Supabase Pro          | ~$25                        |
| Vercel Pro            | ~$20                        |
| Domain `.vn` / `.com` | ~25–30k (chia năm)          |
| Resend                | free tier đủ dùng ban đầu   |
| Sentry / PostHog      | free tier                   |
| Phí thanh toán        | MoMo ~1.5–2%, SePay ~0.5–1% |
| **Tổng cố định**      | **~1.2–1.5 triệu ₫**        |

---

## 6. Rủi ro & cách chặn

| Rủi ro                            | Cách chặn                                                             |
| --------------------------------- | --------------------------------------------------------------------- |
| Trùng lịch thuê                   | Ràng buộc `EXCLUDE` ở DB, không xử lý ở app                           |
| Client sửa giá                    | Tính lại 100% ở server, không nhận `total` từ client                  |
| Webhook replay / giả mạo          | Verify chữ ký + `idempotency_key` unique                              |
| Rò rỉ dữ liệu                     | RLS bật trên mọi bảng; service key chỉ ở server; không log PII        |
| Ảnh Unsplash mất/ vi phạm license | Chuyển sang ảnh tự có ngay GĐ 1                                       |
| SEO tụt khi đổi domain/cấu trúc   | Giữ slug tiếng Việt ổn định, 301 từ URL cũ, sitemap                   |
| Overbooking do buffer             | Luôn chừa 1 ngày giữa 2 lượt thuê                                     |
| Phụ thuộc Supabase                | Mọi truy cập qua lớp `features/*/api.ts`, đổi backend chỉ sửa lớp này |

---

## 7. Nguyên tắc giữ nguyên

1. **Không viết lại UI.** `site.css` và markup hiện tại đã đúng thiết kế — chỉ di chuyển.
2. **Không thêm abstraction trước khi cần.** 2.1k dòng chưa cần Redux, chưa cần monorepo.
3. **Database là nguồn sự thật** cho tồn kho và giá; client chỉ là bản hiển thị.
4. **Mỗi giai đoạn phải deploy được.** Không có nhánh sống 3 tuần.
