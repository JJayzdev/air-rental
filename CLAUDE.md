# CLAUDE.md — Hướng dẫn cho AI làm việc trong repo A.I.R

A.I.R là web **cho thuê thiết bị công nghệ theo ngày** (laptop, điện thoại, máy ảnh, tablet, phụ
kiện) có 4 vai trò: khách (`customer`), nhân viên (`staff`), quản trị (`admin`), đối tác cho thuê
(`partner`). Giao diện và thông báo đều bằng **tiếng Việt**.

Đọc thêm khi cần chi tiết:

- [docs/ai/ARCHITECTURE.md](docs/ai/ARCHITECTURE.md) — bản đồ thư mục/file, bảng DB, RPC, quyền.
- [docs/ai/FLOWS.md](docs/ai/FLOWS.md) — luồng nghiệp vụ từng bước và file nào tham gia.
- [docs/ai/LOGIC-REVIEW.md](docs/ai/LOGIC-REVIEW.md) — kết quả rà soát logic, rủi ro còn mở.

## 1. Ứng dụng nào là ứng dụng thật?

| Thư mục                                                                                                                                            | Vai trò                                                                 | Có sửa không?                      |
| -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ---------------------------------- |
| `web/`                                                                                                                                             | **Ứng dụng chính** Next.js 15 + React 19 + TypeScript strict + Supabase | Có — gần như mọi việc làm ở đây    |
| `supabase/`                                                                                                                                        | Schema Postgres, RLS, RPC nghiệp vụ, seed, test pgTAP                   | Có — logic đặt thuê/tiền nằm ở đây |
| `src/`, `index.html`, `vite.config.js` (gốc)                                                                                                       | Bản Vite tĩnh cũ cho GitHub Pages, không backend                        | Chỉ khi được yêu cầu rõ            |
| `original-build/`                                                                                                                                  | Build gốc xuất từ Figma Make, chỉ để tham chiếu                         | Không                              |
| `web/src/views/`, `web/src/components/app-shell.tsx`, `web/src/app/client-app.tsx`, `web/src/data/products.ts`, `web/src/lib/{storage,pricing}.ts` | Prototype localStorage chỉ dùng ở route `/demo`                         | Không dùng cho tính năng thật      |
| `docs/`                                                                                                                                            | Tài liệu giai đoạn (GD1…GD7), chính sách, hồ sơ đồ án                   | Cập nhật khi đổi hành vi           |
| `scripts/`                                                                                                                                         | Script kiểm thử Playwright/Node, seed tài khoản demo, backup            | Khi sửa luồng tương ứng            |

## 2. Lệnh

Chạy trong `web/`:

```bash
npm run dev         # http://localhost:3000
npm test            # node --test, danh sách file test liệt kê thủ công trong package.json
npm run lint
npm run typecheck
npm run build       # CI dùng SKIP_ENV_VALIDATION=true
```

Chạy ở gốc repo (cần Docker + Supabase CLI):

```bash
supabase start
supabase db reset   # áp toàn bộ migrations + seed.sql
supabase test db    # pgTAP trong supabase/tests
```

- **Thêm file `*.test.ts` mới thì phải thêm đường dẫn vào script `test` trong `web/package.json`** —
  runner không tự glob.
- Test chạy bằng `node --experimental-strip-types`: file được test phải import bằng đuôi `.ts`
  tương đối (`./domain.ts`) và không import `server-only`/alias `@/` ở chuỗi phụ thuộc.
- CI (`.github/workflows/ci.yml`): test → lint → typecheck → build; job thứ hai chạy pgTAP.

## 3. Muốn sửa X thì đụng vào đâu

| Việc                                            | File chính                                                                                                                                     |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Giá, giảm giá dài ngày, mã giảm giá, phí giao   | `quote_booking` (bản hiện tại ở `*_discount_usage_from_orders.sql`, gốc ở `*_pricing.sql`) — preview ở `web/src/features/pricing/`             |
| Tạo đơn, giữ máy, chống trùng lịch              | RPC `create_multi_product_booking` (`*_pricing.sql`), gọi từ `web/src/features/booking/actions.ts`                                             |
| Lịch ngày trống                                 | RPC `booking_calendar` (`*_multi_product_booking.sql`), `getBookingCalendar` trong booking/actions                                             |
| Vòng đời đơn (xác nhận → giao → trả)            | RPC `transition_booking` (`*_multi_product_booking.sql`), UI `web/src/app/(admin)/quan-ly-don/`                                                |
| Thanh toán / webhook SePay / hoàn cọc           | `*_payments.sql`, `*_pricing.sql` (bản mới của `apply_sepay_payment`), `web/src/app/api/webhooks/sepay/route.ts`, `web/src/features/payments/` |
| Giỏ thuê                                        | `web/src/features/cart/` (localStorage `air-uuid-rental-cart-v1`), trang `(rental)/gio-thue`                                                   |
| Checkout                                        | `web/src/app/(rental)/checkout/page.tsx` + `features/cart/rental-cart-panel.tsx`                                                               |
| Danh mục sản phẩm công khai                     | `web/src/features/products/catalog-*.ts`, trang `app/san-pham/`                                                                                |
| Đăng nhập / đăng ký / OTP / demo login          | `web/src/features/auth/`, `app/dang-nhap`, `app/dang-ky`, `app/auth/callback/route.ts`                                                         |
| Tài khoản, địa chỉ, giấy tờ                     | `web/src/features/account/`, `app/(rental)/tai-khoan/`, `*_accounts.sql`                                                                       |
| Quản trị (dashboard, kho, bảo trì, mã, khu vực) | `web/src/features/admin/`, `app/(admin)/admin/*`, `*_admin.sql`                                                                                |
| Đối tác (đăng ký, duyệt, sản phẩm, doanh thu)   | `web/src/features/partner/`, `app/(partner)/`, `app/dang-ky-doi-tac/`, `app/(admin)/admin/doi-tac/`, `*_partner*.sql`                          |
| Trợ lý chat                                     | `web/src/app/api/chat/route.ts`, `web/src/features/chat/`, `components/chat/`                                                                  |
| Biến môi trường                                 | `web/src/lib/env.ts`, `web/.env.example`                                                                                                       |
| Kiểu dữ liệu DB cho TypeScript                  | `web/src/lib/supabase/database.ts` (viết tay — cập nhật khi đổi schema)                                                                        |
| Nhãn trạng thái tiếng Việt                      | `features/orders/state-labels.ts`, `features/payments/state-labels.ts`, `features/admin/labels.ts`                                             |

## 4. Bất biến KHÔNG được phá

1. **Giá luôn do DB tính.** Client chỉ gửi `productId` + `quantity` + ngày; tiền thuê, cọc, giảm
   giá, phí giao đều lấy từ `quote_booking`. Không bao giờ nhận số tiền từ trình duyệt.
2. **Ngày thuê là inclusive.** `rental_period = [start, end+1)`, `blocked_period = [start, end+2)`
   (thêm 1 ngày vệ sinh). Mọi ngày "hôm nay" tính theo `Asia/Ho_Chi_Minh`, kể cả ở server Vercel
   chạy UTC — luôn truyền `timeZone: 'Asia/Ho_Chi_Minh'` khi format ngày giờ.
3. **Idempotency khi đặt đơn**: khoá `(user_id, idempotency_key)` + `request_hash`. Giữ nguyên key
   khi thử lại cùng yêu cầu; xem `features/booking/idempotency-key.ts`.
4. **RLS là tầng bảo vệ cuối.** Server action vẫn kiểm tra vai trò, nhưng quyền thật nằm ở policy và
   `security definer` RPC. Cột `profiles.role` không cho client cập nhật.
5. **Service role chỉ dùng ở server** (`createSupabaseServiceClient`, `import 'server-only'`) và chỉ
   sau khi đã xác minh người gọi. Không bao giờ đưa `SUPABASE_SERVICE_ROLE_KEY` ra client.
6. **Sản phẩm mẫu (`is_sample = true`) không bao giờ đặt thuê được.**
7. **Trạng thái đơn (`order_state`) và trạng thái thanh toán (`payment_state`) tách biệt.** Chuyển
   trạng thái đơn chỉ qua RPC `transition_booking`; đổi bảng chuyển trạng thái thì sửa cả
   `features/orders/status.ts` và label.
8. **Webhook SePay** phải trả 200 cho mọi thứ không nên retry; non-2xx chỉ cho sai secret/lỗi DB.
9. **Đối tác** chỉ ghi sản phẩm khi `role = 'partner'` _và_ `partners.status = 'active'`
   (`is_active_partner_owner`). Ghi bảng `partners`/`product_units` của đối tác đi qua service role.

## 5. Quy ước khi sửa

- **Thay đổi schema → tạo migration MỚI** trong `supabase/migrations/` (tên
  `YYYYMMDDNNNN_mo_ta.sql`), không sửa migration cũ đã chạy trên production. Kèm test pgTAP trong
  `supabase/tests/` và cập nhật `web/src/lib/supabase/database.ts`.
- Đổi hàm RPC có chữ ký mới: `drop function` bản cũ, `revoke all ... from public, anon,
authenticated`, rồi `grant execute` đúng vai trò (xem mẫu ở các migration hiện có).
- Server action: parse bằng zod → xác minh user/role → gọi Supabase → `revalidatePath`/
  `revalidateTag('catalog')` → `redirect` với query `?error=`/`?saved=`. Danh mục cache bằng tag
  `catalog` (5 phút), nhớ revalidate khi đổi sản phẩm.
- Thông báo lỗi hiển thị cho người dùng bằng tiếng Việt, không lộ thông điệp Postgres.
- Prettier: không dấu chấm phẩy, nháy đơn, width 100. Husky + lint-staged chạy khi commit.
- Tên route bằng tiếng Việt không dấu (`/don-thue`, `/gio-thue`, `/quan-ly-don`…).
- Production (Vercel + Supabase Cloud) **không tự áp migration** — sau khi merge phải chạy
  `supabase db push` hoặc SQL thủ công.
