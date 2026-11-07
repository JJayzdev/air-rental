# Kiến trúc A.I.R — bản đồ cho AI

Tài liệu này mô tả **cái gì nằm ở đâu**. Luồng nghiệp vụ chi tiết xem [FLOWS.md](FLOWS.md); quy tắc
làm việc xem [CLAUDE.md](../../CLAUDE.md).

## 1. Tổng quan hệ thống

```text
Trình duyệt ──► Next.js 15 (Vercel, web/)
                 ├─ Server Components / Server Actions ──► Supabase (anon key + cookie phiên, chịu RLS)
                 ├─ Service role (chỉ server, sau khi xác minh) ─► Supabase (bỏ qua RLS)
                 ├─ /api/chat ──► FAQ cục bộ, RPC, (tuỳ chọn) OpenAI
                 └─ /api/webhooks/sepay ◄── SePay (ngân hàng) ─► RPC apply_sepay_payment
Supabase: Postgres (bảng + RLS + RPC security definer), Auth (OTP email/SMS), Storage (giấy tờ)
```

- Không có backend riêng: **logic nghiệp vụ quan trọng (giá, giữ máy, chuyển trạng thái, thanh
  toán) nằm trong hàm PL/pgSQL** ở `supabase/migrations/`. Next.js chỉ validate đầu vào, kiểm tra
  vai trò và gọi RPC.
- Middleware (`web/src/middleware.ts`) chỉ làm mới cookie phiên Supabase (bỏ qua
  `/api/webhooks`, static). Phân quyền theo trang nằm ở các `layout.tsx` của route group.

## 2. Cây thư mục `web/src`

```text
app/                              App Router
├─ layout.tsx                     metadata gốc + ChatAssistant
├─ page.tsx                       Trang chủ (server)
├─ san-pham/                      Danh mục + chi tiết sản phẩm (/san-pham, /san-pham/[slug])
├─ huong-dan/, chinh-sach/        Nội dung tĩnh (content.tsx)
├─ dang-nhap/, dang-ky/           Form OTP email (+ SMS tuỳ chọn), đăng ký khách
├─ dang-ky-doi-tac/               Form đăng ký đối tác
├─ auth/callback/route.ts         Đổi code/token_hash từ email thành phiên
├─ (rental)/                      Khu khách (header/footer chung)
│  ├─ gio-thue/                   Giỏ thuê (client, localStorage)
│  ├─ checkout/                   Xác nhận đặt thuê (yêu cầu đăng nhập)
│  ├─ don-thue/, don-thue/[id]/, don-thue/[id]/hoa-don/   Đơn của tôi, chi tiết, hoá đơn in
│  ├─ tai-khoan/ (+ dia-chi/, giay-to/)                    Hồ sơ, sổ địa chỉ, giấy tờ
│  └─ yeu-thich/                  Sản phẩm yêu thích
├─ (admin)/                       layout chặn: role ∈ {staff, admin}
│  ├─ admin/                      Dashboard; san-pham, kho, bao-tri, ma-giam-gia, khu-vuc-giao,
│  │                              nhat-ky, doi-tac (một số trang chỉ admin)
│  ├─ quan-ly-don/                Quản lý đơn + chuyển trạng thái + hoàn cọc
│  ├─ quan-ly-don/[id]/phieu-ban-giao/  Phiếu bàn giao in
│  └─ quan-ly-giay-to/            Duyệt giấy tờ định danh
├─ (partner)/                     layout chặn: role = partner
│  └─ partner/ (+ san-pham, san-pham/them, don-thue, doanh-thue)
├─ api/chat/route.ts              Trợ lý chat (POST JSON ≤ 8KB, cùng origin, rate limit)
├─ api/webhooks/sepay/route.ts    Webhook chuyển khoản
├─ demo/                          Prototype localStorage (KHÔNG phải luồng thật)
└─ robots.ts, sitemap.ts

features/<miền>/                  Logic theo miền; mỗi miền thường có:
   actions.ts      'use server' — server action (zod → auth → Supabase → revalidate → redirect)
   server-data.ts  'server-only' — đọc dữ liệu cho Server Component
   *-schema.ts     zod schema (thuần, có test)
   *.test.ts       node --test
├─ account/        hồ sơ, địa chỉ, ảnh giấy tờ (identity-image.ts kiểm tra byte ảnh)
├─ admin/          actions (sản phẩm, máy, bảo trì, mã giảm, khu vực, duyệt đối tác), server-data
├─ auth/           OTP email/SMS, demo login, landing-path theo role, đồng bộ hồ sơ đăng ký
├─ booking/        createRentalBooking, cancel, transition, lịch trống; domain.ts (ngày/giá thuần)
├─ cart/           giỏ localStorage, RentalCartPanel (giỏ + form checkout)
├─ chat/           phân loại ý định, tìm sản phẩm, OpenAI tuỳ chọn, rate limit
├─ favorites/      yêu thích
├─ orders/         đọc đơn (khách/nhân viên), phân trang, nhãn trạng thái, bảng chuyển trạng thái
├─ partner/        đăng ký, thêm sản phẩm, đọc đơn/doanh thu đối tác, slug/mã máy, ngày VN
├─ payments/       parse/verify webhook SePay, panel thanh toán, hoàn cọc
├─ pricing/        preview báo giá (preview_booking_quote), thông báo lỗi giảm giá/giao hàng
└─ products/       đọc catalog (REST anon, cache tag `catalog`), map/validate dòng, SEO

lib/
├─ supabase/server.ts     client theo cookie (anon key, chịu RLS)
├─ supabase/service.ts    client service role (server-only)
├─ supabase/auth.ts       getVerifiedUser / requireVerifiedUser / getVerifiedAppRole
├─ supabase/database.ts   kiểu DB viết tay (một số bảng mới như partners dùng `as any`)
├─ env.ts                 @t3-oss/env-nextjs
├─ observability.ts, error-*.ts   captureException + cảnh báo webhook vận hành (đã khử dữ liệu nhạy cảm)
├─ safe-internal-path.ts  chống open redirect cho `?next=`
└─ format.ts              money(), dateVN()

components/layout/        site-header/footer (thật), admin-shell, partner-shell, account-menu
components/chat/          ChatAssistant (widget thật), chat-engine (FAQ)
components/ui, views/, app-shell.tsx, client-app.tsx, data/products.ts   → prototype /demo
```

## 3. Cơ sở dữ liệu (`supabase/migrations`, theo thứ tự áp)

| Migration                                    | Nội dung chính                                                                                                                                                                                        |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `202611010001_booking_foundation`            | enum, `profiles`, `categories`, `products`, `product_units`, `price_tiers`, `orders`, `order_items`, `reservations` (exclusion constraint chống trùng), `order_events` (trigger ghi lịch sử), RLS gốc |
| `202611010002_catalog`                       | cột catalog công khai: specs, ảnh, `is_sample`, nguồn/giấy phép ảnh                                                                                                                                   |
| `202611010003_multi_product_booking`         | `product_units.ready_on`, `booking_calendar`, `transition_booking` (bản dùng hiện tại)                                                                                                                |
| `202611010004_product_name_snapshot`         | `order_items.product_name_snapshot` + trigger                                                                                                                                                         |
| `202611010005_accounts`                      | `customer_addresses`, `user_favorites`, giấy tờ định danh (bảng + Storage policy)                                                                                                                     |
| `202611010006_payments`                      | `payment_state`, `payments` (sổ cái), `payment_webhook_events`, trigger tạo hoàn cọc khi `completed`, `complete_deposit_refund`                                                                       |
| `202611010007_admin`                         | `unit_maintenance`, `admin_dashboard`, `open/close_unit_maintenance`                                                                                                                                  |
| `202611010008_pricing`                       | `discount_codes`, `delivery_zones`, cột giảm giá/phí giao/`total_vnd` trên `orders`, `quote_booking` (bản đầu), **`create_multi_product_booking` (bản hiện tại)**, `apply_sepay_payment` (bản cũ)     |
| `202611020009_chat_rate_limits`              | quota chat theo IP/user (hash HMAC)                                                                                                                                                                   |
| `202611020010_academic_correctness`          | `preview_booking_quote` (anon được gọi), trigger chặn đổi trạng thái máy khi còn đơn/bảo trì                                                                                                          |
| `202611030001_partners` … `202611060004`     | bảng `partners`, `products.partner_id`, role `partner`, siết RLS đối tác, cột hồ sơ đối tác                                                                                                           |
| `202611070001_discount_usage_from_orders`    | giới hạn lượt mã giảm giá tính theo đơn còn sống, **`quote_booking` (bản hiện tại)**, `discount_code_usage` cho admin                                                                                 |
| `202611080001_cancellation_refunds`          | hoàn tiền khi đơn đã nhận tiền bị huỷ/hết hạn; **`apply_sepay_payment`, `complete_deposit_refund`, `admin_dashboard` (bản hiện tại)**                                                                 |
| `202611080002_audit_actor_and_custody_guard` | expire ghi "Hệ thống" trong nhật ký; **`open_unit_maintenance`, `record_order_state_change` (bản hiện tại)**                                                                                          |

> Hàm bị `create or replace`/`drop` + tạo lại ở migration sau: **bản có hiệu lực là bản ở migration
> mới nhất**. Ví dụ `create_multi_product_booking` thật nằm ở `_pricing.sql`, `quote_booking` ở `_discount_usage_from_orders.sql`, `apply_sepay_payment` ở `_cancellation_refunds.sql`.

### Bảng chính

| Bảng                                                                              | Ý nghĩa                                                                                 |
| --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `profiles`                                                                        | 1-1 với `auth.users`; `role` ∈ customer/staff/admin/partner                             |
| `products`                                                                        | model cho thuê; `state` draft/active/archived; `is_sample`; `partner_id` (null = A.I.R) |
| `product_units`                                                                   | từng máy vật lý (`asset_tag`), `state` available/maintenance/retired, `ready_on`        |
| `price_tiers`                                                                     | giảm % theo số ngày thuê                                                                |
| `orders`                                                                          | đơn; `state`, `payment_state`, snapshot giá, `expires_at` (giữ 30 phút)                 |
| `order_items`                                                                     | 1 dòng / 1 máy được cấp; `rental_period`, giá snapshot                                  |
| `reservations`                                                                    | giữ máy; `blocked_period`, `released_at`; exclusion constraint chống trùng lịch         |
| `order_events`                                                                    | lịch sử chuyển trạng thái (trigger)                                                     |
| `payments`                                                                        | sổ cái tiền vào/ra (payment, deposit_refund)                                            |
| `payment_webhook_events`                                                          | nhật ký webhook, chống xử lý lặp                                                        |
| `discount_codes`, `delivery_zones`                                                | mã giảm giá, khu vực + phí giao                                                         |
| `unit_maintenance`                                                                | lịch bảo trì máy                                                                        |
| `partners`                                                                        | hồ sơ đối tác, `status` pending/active/suspended/rejected, `commission_rate`            |
| `customer_addresses`, `user_favorites`, `identity_document_*`, `chat_rate_limits` | phụ trợ                                                                                 |

### RPC (gọi qua `supabase.rpc`)

| RPC                                                    | Ai gọi                            | Tác dụng                               |
| ------------------------------------------------------ | --------------------------------- | -------------------------------------- |
| `booking_calendar`                                     | anon/auth                         | Ngày nào còn đủ máy cho cả giỏ         |
| `preview_booking_quote`                                | anon/auth (mã giảm cần đăng nhập) | Báo giá đầy đủ, không giữ máy          |
| `create_multi_product_booking`                         | auth                              | Tạo đơn + cấp máy + giữ lịch (atomic)  |
| `cancel_booking`                                       | chủ đơn                           | Huỷ đơn `pending`                      |
| `transition_booking`                                   | staff/admin                       | Chuyển trạng thái đơn                  |
| `expire_pending_bookings`                              | staff/admin                       | Giải phóng đơn quá hạn giữ             |
| `apply_sepay_payment`                                  | service_role (webhook)            | Ghi tiền vào, cập nhật `payment_state` |
| `complete_deposit_refund`                              | staff/admin                       | Đánh dấu đã hoàn cọc                   |
| `admin_dashboard`, `open/close_unit_maintenance`       | staff/admin                       | Quản trị                               |
| `save/delete_customer_address`, `*_identity_document*` | auth                              | Tài khoản                              |
| `consume_chat_rate_limit`                              | service_role                      | Quota chat                             |

## 4. Ma trận quyền (tóm tắt)

| Khu vực / dữ liệu        | anon | customer | partner                                                           | staff                      | admin      |
| ------------------------ | ---- | -------- | ----------------------------------------------------------------- | -------------------------- | ---------- |
| Catalog active           | đọc  | đọc      | đọc + đọc SP của mình mọi state                                   | đọc                        | đọc tất cả |
| Đặt đơn                  | —    | ✓        | ✓                                                                 | ✓                          | ✓          |
| Đơn hàng                 | —    | của mình | của mình (+ đơn có SP của mình qua service role, chỉ phần của họ) | tất cả                     | tất cả     |
| `/quan-ly-don`, `/admin` | —    | —        | —                                                                 | ✓ (một số trang chỉ admin) | ✓          |
| Sửa sản phẩm/máy         | —    | —        | SP của mình nếu `partners.status='active'`                        | —                          | ✓          |
| Duyệt đối tác            | —    | —        | —                                                                 | —                          | ✓          |
| `/partner`               | —    | —        | ✓                                                                 | —                          | —          |

## 5. Biến môi trường (xem `web/.env.example`)

| Biến                                                                            | Tác dụng                                                                    |
| ------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL/ANON_KEY`                                             | Bắt buộc ở production; thiếu → dev dùng catalog mẫu cục bộ                  |
| `SUPABASE_SERVICE_ROLE_KEY`                                                     | Giấy tờ, quota chat, webhook, đối tác, demo login                           |
| `AIR_DEMO_LOGIN`, `AIR_DEMO_OTP`                                                | Đăng nhập 3 tài khoản demo bằng OTP cố định (mặc định bật ngoài production) |
| `AIR_ENABLE_PAYMENTS`, `SEPAY_WEBHOOK_SECRET`, `AIR_BANK_*`                     | Thanh toán chuyển khoản                                                     |
| `AIR_ENABLE_CHAT_LLM`, `OPENAI_*`, `CHAT_RATE_LIMIT_SECRET`, `CHAT_TRUST_PROXY` | Chat                                                                        |
| `AIR_ENABLE_PHONE_OTP`, `AIR_ENABLE_IDENTITY_DOCUMENTS`                         | Tính năng tuỳ chọn                                                          |
| `AIR_ENABLE_ERROR_ALERTS`, `OPS_ALERT_WEBHOOK_URL`, `SENTRY_DSN`                | Giám sát                                                                    |
