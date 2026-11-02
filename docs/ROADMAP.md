# A.I.R — Kiến trúc & lộ trình phát triển hoàn chỉnh

Tài liệu này mô tả đích đến của dự án: công nghệ, cấu trúc thư mục, mô hình dữ liệu và
các giai đoạn triển khai. Repo có hai app: bản demo React + Vite ở thư mục gốc và Next.js + TypeScript
trong `web/`. Demo Vite vẫn dùng localStorage; Next.js có catalog SSR và luồng đặt thuê Supabase local.
Migrations, seed, Auth/RLS và booking đã được kiểm tra trên Supabase local đầy đủ (PostgreSQL 15,
Auth, PostgREST và Mailpit). Thanh toán chuyển khoản có webhook SePay idempotent và hoàn cọc, nhưng
mới chạy với tài khoản ngân hàng giả lập trên local. Khu vực quản trị GĐ 5 đợt A đã có dashboard, kho,
bảo trì và phiếu bàn giao; mã giảm giá/phí giao còn ở đợt B. Dữ liệu sản phẩm vẫn là mẫu; chưa có pilot
thương mại và thông báo xác nhận đơn. Đây vẫn là **nền tảng đang phát triển**, không phải hệ thống
vận hành.

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
| `order_items`   | Dòng đơn — **1 dòng = 1 máy** | giữ `unit_id` + khoảng thuê `daterange`               |
| `payments`      | Giao dịch                     | provider, `txn_ref`, số tiền, raw `jsonb`, trạng thái |
| `deposits`      | Cọc & hoàn cọc                | tách riêng để đối soát                                |
| `profiles`      | Hồ sơ khách                   | tên, SĐT, địa chỉ, `role`                             |
| `favorites`     | Yêu thích                     | đồng bộ đa thiết bị                                   |
| `coupons`       | Mã giảm giá                   | % hoặc số tiền, giới hạn lượt                         |
| `order_events`  | Audit log trạng thái          | ai đổi, khi nào, ghi chú                              |

### 3.2 Chống trùng lịch ở tầng database

Đây là điểm quan trọng nhất. Không kiểm tra bằng `if` trong ứng dụng — hai request
đồng thời sẽ cùng pass. Mỗi máy vật lý có thể có nhiều reservation chưa release nếu các khoảng ngày
không chồng lấn; exclusion constraint chỉ chặn những khoảng chồng lấn trên cùng máy. Dòng reservation
được tách khỏi `order_items` để lịch sử vẫn giữ sau hủy/hết hạn. Migration đã được chạy và kiểm thử
trên Supabase local đầy đủ (PostgreSQL 15); chưa chạy trên môi trường live:

```sql
create extension if not exists btree_gist;

-- mỗi dòng order_items là MỘT máy vật lý
create table reservations (
  id          uuid primary key default gen_random_uuid(),
  order_item_id uuid not null references order_items(id),
  unit_id     uuid not null references product_units(id),
  blocked_period daterange not null,
  released_at timestamptz,
  constraint no_double_booking exclude using gist (
    unit_id with =,
    blocked_period with &&
  ) where (released_at is null)
);
```

- Máy có serial (laptop, camera) → mỗi máy là 1 unit, ràng buộc trên `unit_id`.
- Phụ kiện không serial (AirPods) → bảng `stock_counters` + `select … for update`
  khi tạo đơn, hoặc cũng cấp serial để đơn giản hoá. MVP foundation dùng serial unit cho mọi loại.
- Ngày thuê là inclusive `[ngày nhận, ngày trả]` khi tính giá; `blocked_period` là
  `[ngày nhận, ngày trả + 2 ngày)` để chừa **một ngày buffer** sau ngày trả.

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

Client gửi lên `{ productId, quantity, start, end, fulfillment, customer, idempotencyKey }`.
Không nhận `unitId`, giá, tổng tiền hoặc số ngày tính sẵn từ client. Database tính lại `subtotal`
từ catalog + `price_tiers`, chọn unit và lưu snapshot giá trước khi tạo reservation. Shipping,
coupon và payment chưa thuộc foundation hiện tại.

---

## 4. Thứ tự MVP vận hành

Các giai đoạn cũ bên dưới chia theo năng lực sản phẩm. Với MVP đặt thuê thật, triển khai theo thứ
tự phụ thuộc dưới đây để có thể kiểm tra an toàn tồn kho trước khi nối giao diện:

1. **Booking domain + database foundation** — ngày thuê inclusive, giá server-side, unit vật lý,
   reservation có buffer, trạng thái và RLS. _Đã kiểm tra local._
2. **Đăng nhập và server boundary** — Supabase Auth, session cookie, server-only client và phân quyền.
   Booking RPC chỉ cho tài khoản đã đăng nhập. _Đã kiểm tra local với Auth thật._
3. **Catalog thật** — catalog hiện là dữ liệu mẫu, đọc công khai an toàn và có lịch khả dụng; chưa có
   kiểm kê fleet thật.
4. **Checkout + staff ops tối thiểu** — RPC multi-line cấp phát mọi sản phẩm trong cùng transaction;
   checkout gửi product/quantity/dates/contact/idempotency key, hiển thị đơn theo tài khoản. Màn staff
   xem đơn, xác nhận, hủy, bàn giao, nhận trả và xem máy đã cấp phát. _Luồng local đã được kiểm tra._
5. **Kiểm chứng và pilot không thanh toán online** — Supabase local integration tests cho tranh chấp,
   hủy, hết hạn, RLS/role; chạy pilot có staff xử lý đơn và đối soát thủ công trước khi bật payment.
6. **Thanh toán và thông báo** — email/SMS, SePay/webhook và đối soát sau pilot.
7. **Admin nâng cao, SEO, hardening và ra mắt** — dashboard phân tích, quản lý catalog/kho nâng cao,
   nội dung và hoàn thiện ra mắt sau khi luồng vận hành đã ổn.

Các migration và pgTAP/concurrency tests đã chạy trên Supabase local PG15. Việc này chưa xác minh
catalog fleet thật, email/SMS xác nhận, thanh toán, project live hoặc pilot vận hành.

## 5. Giai đoạn triển khai theo năng lực

Ước lượng cho **1 dev full-time**. Đội 2 người chia đôi được phần lớn giai đoạn 3–5.

### GĐ 0 — Nền móng (3–5 ngày)

**Trạng thái: xong. Repo đã `git init` (nhánh `main`, chưa có remote), hook Husky chạy khi
commit; deploy preview bỏ qua theo quyết định.**

- [x] Tạo app Next.js 15 + TypeScript strict, port `site.css` và 8 view hiện tại → `web/`
- [x] ESLint, Prettier, `tsc --noEmit`; Husky + lint-staged đã cài (`.husky/_`, `core.hooksPath`)
- [x] Env schema (Zod), Sentry hook (`lib/observability.ts`), cấu trúc `features/`
- [x] CI: lint + typecheck + build trên mỗi PR (`.github/workflows/ci.yml`)
- [x] **Nghiệm thu giao diện**: 0 khác biệt qua 13 bước tương tác, ≤0,4% pixel (nhiễu animation)
- [~] Deploy preview: **bỏ qua theo quyết định** — thay bằng build production chạy local

### GĐ 1 — Catalog thật (1 tuần; thực hiện sau server/auth foundation)

- [x] Mở rộng schema Supabase cho catalog, specifications và ảnh; policies anon chỉ đọc sản phẩm active.
- [x] Seed 24 sản phẩm `SAMPLE`, 48 unit bảo trì và price tiers; giá/kho chưa phải dữ liệu A.I.R thật.
- [x] Catalog SSR: filter/search/sort qua URL, trang chi tiết, metadata, Open Graph, JSON-LD, sitemap, robots, canonical.
- [x] 3 ảnh tham khảo CC BY-SA 4.0 có ghi công; 21 placeholder có nhãn. Mascot Next chuyển WebP.
- [x] Chạy migrations, seed, Auth/RLS pgTAP và concurrency checks trên Supabase local PG15; đọc catalog qua PostgREST cục bộ.
- [ ] Kiểm tra trên project live sau khi cấu hình credentials.
- [ ] Xác nhận danh sách máy, cấu hình theo từng chiếc, giá/cọc và ảnh fleet trước khi bỏ nhãn mẫu.
- [ ] Upload ảnh được xác nhận lên Storage; hiện ảnh để local, chưa upload.

### GĐ 2 — Đặt thuê & tồn kho (1.5 tuần) ← **trái tim của hệ thống**

- [x] API kiểm tra cả khoảng thuê, buffer và trạng thái giữ máy; không trả lộ unit/customer.
- [x] Checkout multi-product: Server Action/Zod, giá DB, cấp phát nguyên tử, idempotency và session Auth.
- [x] Đơn của tôi, chi tiết theo UUID/RLS, hủy đơn; staff xác nhận, hủy, bàn giao, nhận trả, kết thúc.
- [x] Supabase local PG15: 92 pgTAP assertions và 6 bài concurrency độc lập.
- [x] Kiểm tra trình duyệt, gồm khôi phục khi mất phản hồi tạo đơn — `scripts/check-gd2-browser.mjs` exit 0.
- [ ] Nạp danh mục fleet/giá thật và chạy pilot có staff đối soát thủ công.
- [ ] Email/SMS xác nhận đơn chờ nhà cung cấp; email magic link chỉ dùng đăng nhập. Thanh toán online ở bước sau pilot.

Giỏ UUID hiện lưu bằng localStorage có schema validation; chọn ngày dùng danh sách ngày khả dụng trong
cửa sổ 63 ngày, chưa phải lịch tháng dạng lưới. UI không dùng Zustand. Xem
[`docs/GD2-IMPLEMENTATION.md`](GD2-IMPLEMENTATION.md) và [`docs/GD2-LOCAL.md`](GD2-LOCAL.md).

### GĐ 3 — Tài khoản (1 tuần)

**Trạng thái: xong phần code; đã nghiệm thu local ngày 01/11/2026.** 140 pgTAP, 6 bài concurrency,
browser E2E và smoke favorites đều pass; 29 unit test, lint và typecheck sạch.

- [x] OTP số điện thoại (opt-in `AIR_ENABLE_PHONE_OTP`), session cookie refresh qua middleware.
- [x] Hồ sơ, sổ địa chỉ, đơn của tôi, yêu thích đồng bộ qua `user_favorites` + RLS.
- [x] Upload CCCD/giấy tờ tùy chọn cho đơn (gate `AIR_ENABLE_IDENTITY_DOCUMENTS`, mặc định tắt).
- [x] Guard trang `/admin`, `/quan-ly-don`, `/quan-ly-giay-to` theo role ở server component.
- [ ] Xác minh OTP với SMS provider thật (local đang dùng fixture, đã khôi phục config).
- [x] Chạy `supabase test db` (140/140) và 6 concurrency checks khi Docker bật lại.

Xem [`docs/GD3-ACCOUNTS.md`](GD3-ACCOUNTS.md).

### GĐ 4 — Thanh toán & cọc (1–1.5 tuần)

- [x] Chuyển khoản + SePay webhook (`Authorization: Apikey`, bảng `payment_webhook_events` giữ cả
      payload không khớp đơn, idempotency theo `(provider, external_id)`).
- [ ] MoMo/VNPay — chưa làm; chỉ chuyển khoản ngân hàng ở giai đoạn này.
- [x] Cọc theo `orders.deposit_vnd` (đã chốt ở GĐ 2, ghi đè quy tắc "30% hoặc theo category" trong
      roadmap) và hoàn cọc khi đơn `completed` qua `complete_deposit_refund`.
- [x] Hoá đơn in/PDF bằng bản in trình duyệt, lịch sử giao dịch trên trang đơn và trang hoá đơn.
- [x] **Nghiệm thu**: webhook replay không tạo thanh toán trùng (31 pgTAP + 6 kiểm tra HTTP thật).

Xem [`docs/GD4-PAYMENTS.md`](GD4-PAYMENTS.md).

### GĐ 5 — Admin (1.5 tuần)

Đợt A xong ngày 02/11/2026 — xem [`docs/GD5-ADMIN.md`](GD5-ADMIN.md). Đợt B (mã giảm giá, phí giao)
chưa làm.

- [x] Dashboard: đơn chờ xác nhận, máy đang cho thuê, doanh thu tháng.
- [x] Quản lý đơn theo vòng đời §3.3, in phiếu bàn giao.
- [x] Quản lý sản phẩm + máy vật lý + lịch bảo trì.
- [ ] Mã giảm giá, phí giao theo khu vực, lịch giao.
- [x] Nhật ký thao tác (`order_events`).

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

## 6. Chi phí vận hành dự kiến

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

## 7. Rủi ro & cách chặn

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

## 8. Nguyên tắc giữ nguyên

1. **Không viết lại UI.** `site.css` và markup hiện tại đã đúng thiết kế — chỉ di chuyển.
2. **Không thêm abstraction trước khi cần.** 2.1k dòng chưa cần Redux, chưa cần monorepo.
3. **Database là nguồn sự thật** cho tồn kho và giá; client chỉ là bản hiển thị.
4. **Mỗi giai đoạn phải deploy được.** Không có nhánh sống 3 tuần.
