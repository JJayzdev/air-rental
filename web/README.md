# A.I.R — Next.js (ứng dụng chính, GĐ 0–7 local)

App Next.js 15 + TypeScript strict, port từ bản Vite ở thư mục cha. Giao diện giữ nguyên
(`globals.css` bắt đầu từ bản sao y nguyên `../src/styles/site.css`, sau đó nối thêm style cho
catalog và luồng đặt thuê), logic state chuyển sang TS.

Tài liệu đầy đủ về dự án, dữ liệu và lộ trình: [`../README.md`](../README.md),
[`../docs/ROADMAP.md`](../docs/ROADMAP.md).

## Chạy

```bash
npm install
cp .env.example .env.local   # không bắt buộc khi chạy local
npm run dev                  # http://localhost:3000
```

Bản production:

```bash
npm run build
npm start
```

## Lệnh

| Lệnh                   | Việc                               |
| ---------------------- | ---------------------------------- |
| `npm run dev`          | Dev server (cổng 3000)             |
| `npm run build`        | Build production                   |
| `npm start`            | Chạy bản build                     |
| `npm run lint`         | ESLint 9 flat config               |
| `npm run lint:fix`     | ESLint tự sửa                      |
| `npm run typecheck`    | `tsc --noEmit`                     |
| `npm run format`       | Prettier ghi đè                    |
| `npm run format:check` | Chỉ kiểm tra định dạng             |
| `npm run precommit`    | lint-staged (Husky gọi khi commit) |

## Cấu trúc

```
src/
  app/          App Router: layout, page, client-app, globals.css
  components/   app-shell (state), layout/, ui/, chat/
  views/        8 màn: Home … Account
  features/     schema Zod + domain GĐ 1–7 (catalog, booking, cart, orders, account, favorites, pricing, admin)
  lib/          format, dates, pricing, order-code, storage, env, observability
  data/         products.ts
  types/        type dùng chung
```

## Ghi chú GĐ 0

- **Client-side toàn bộ**: `app/client-app.tsx` dùng `dynamic(..., { ssr: false })` vì app đọc
  `localStorage` ngay lần render đầu. Demo tại `/` và các màn checkout/giỏ vẫn giữ state-routing cũ;
  `/san-pham` và `/san-pham/[slug]` là các trang URL thật, render phía server.
- **CSS nền giữ nguyên**: `globals.css` bắt đầu là bản sao `site.css`; style riêng cho catalog Next
  được nối thêm ở cuối file, còn bản Vite giữ nguyên.
- **Husky đã cài**: hook `../.husky/pre-commit` chạy `cd web && npx lint-staged` (chỉ kiểm tra
  file trong `web/`). `prepare` là `cd .. && husky .husky` — đã tạo `../.husky/_` ở gốc repo và
  trỏ `core.hooksPath` vào đó, nên hook chạy thật khi commit. Nếu clone repo mới, chạy
  `npm install` trong `web/` một lần là hook được cài lại.
- **Env**: `lib/env.ts` validate bằng Zod. Build/CI có thể đặt `SKIP_ENV_VALIDATION=true`
  (xem `.github/workflows/ci.yml`).

## Đặt thuê GĐ2

- Next.js có giỏ thuê UUID riêng với localStorage và validation; không chia sẻ state với giỏ numeric
  của bản demo Vite. Lịch chọn ngày hiện là danh sách ngày khả dụng trong 63 ngày tới.
- Checkout cần Supabase Auth. Server xác minh tài khoản, kiểm tra schema và gọi một RPC atomic cho
  toàn bộ giỏ; giá, tiền cọc và unit lấy từ database. Đơn được xem theo tài khoản; staff được xác minh
  mới thấy màn quản lý và asset tag máy đã cấp.
- Session dùng cookie HttpOnly và middleware làm mới token. Không dùng service role hay lưu token ở
  localStorage. Mã idempotency được giữ trong session để phát lại cùng yêu cầu sau lỗi mạng; khi payload
  không khớp, người dùng được hướng dẫn kiểm tra danh sách đơn trước khi mở yêu cầu mới.
- Hủy đơn và vòng đời staff chạy qua RPC/RLS. Xác nhận đơn qua email/SMS và thanh toán online chưa
  cấu hình; email magic link chỉ phục vụ đăng nhập. Không có nội dung nào khẳng định đã gửi thông báo.
- Mẫu catalog và sample units không thể đặt thuê; cần nhập fleet, tình trạng, giá và cọc đã xác nhận
  trước khi pilot.
- Chạy unit tests bằng `npm test`, typecheck bằng `npm run typecheck`, lint bằng `npm run lint`.
  Hướng dẫn Supabase local nằm ở [`../docs/GD2-LOCAL.md`](../docs/GD2-LOCAL.md); triển khai và giới hạn
  hiện tại xem [`../docs/GD2-IMPLEMENTATION.md`](../docs/GD2-IMPLEMENTATION.md).

## Tài khoản GĐ3

- `/tai-khoan` sửa hồ sơ liên hệ; `/tai-khoan/dia-chi` quản lý sổ địa chỉ qua RPC owner-scoped và
  luôn giữ đúng một địa chỉ mặc định.
- `/yeu-thich` đọc bảng `user_favorites` theo tài khoản; nút lưu xuất hiện ở catalog và trang chi tiết.
  Khách chưa đăng nhập được dẫn sang `/dang-nhap`.
- Giấy tờ định danh là tùy chọn và mặc định tắt: bật `AIR_ENABLE_IDENTITY_DOCUMENTS`, cấp
  `SUPABASE_SERVICE_ROLE_KEY` và bật `identity_document_settings.enabled`.
- OTP điện thoại chỉ bật khi có SMS provider; nếu không, dùng magic link email. Session vẫn được
  refresh trong `src/middleware.ts`; phân quyền staff/admin kiểm tra ở từng trang.
- Chi tiết và giới hạn: [`../docs/GD3-ACCOUNTS.md`](../docs/GD3-ACCOUNTS.md).

## Catalog GĐ1

- `/san-pham` hỗ trợ tìm kiếm `q`, lọc `danh-muc` và sắp xếp `sap-xep` qua URL;
  `/san-pham/[slug]` có metadata, canonical, Open Graph và JSON-LD Product.
- Khi chạy local không có Supabase credentials, trang dùng 24 sản phẩm `SAMPLE` và luôn gắn nhãn.
  Giá, cọc và hai máy mẫu mỗi sản phẩm trong seed là giả lập, không chứng minh A.I.R sở hữu hàng.
- Đặt cả `NEXT_PUBLIC_SUPABASE_URL` và `NEXT_PUBLIC_SUPABASE_ANON_KEY` để đọc catalog active bằng
  anon key qua RLS. Nếu backend đã cấu hình nhưng lỗi, trang báo lỗi và không chuyển sang sample.
  Không dùng service role cho thao tác đọc công khai.
- Migrations/seed và Auth/RLS đã chạy trên Supabase local PG15; 92 pgTAP assertions và 6 bài concurrency
  xác minh booking. Project live chưa được xác minh.
- Ba ảnh mẫu Canon EOS R50, Sony a6400 và iPhone 16 Pro là ảnh tham khảo CC BY-SA 4.0 với
  ghi công hiển thị trên trang. 21 model còn lại dùng hình placeholder có nhãn. Ảnh chưa upload lên
  Supabase Storage; ảnh máy thực tế, quyền ảnh, catalog fleet và giá thuê thật còn chờ xác nhận.
- Mascot Next đã được chuyển sang WebP; file PNG gốc vẫn nằm nguyên để bản Vite tiếp tục dùng.
- Catalog giữ giỏ UUID riêng với giỏ demo numeric. Chỉ non-sample sản phẩm mới có thể thêm vào checkout.

## Trợ lý chat GĐ6

- `/api/chat` giới hạn JSON 8 KiB, chỉ nhận same-origin request từ trình duyệt, và không lưu hội thoại.
  Search dùng catalog active; availability dùng `booking_calendar`; trạng thái đơn chỉ truy vấn order
  của user đã xác minh qua cookie session, lọc owner ID kể cả với tài khoản staff.
- Quota cố định 12 request/phút, độc lập theo IP và user, lưu HMAC-SHA256 identity thay cho IP hoặc
  transcript. Production cần `SUPABASE_SERVICE_ROLE_KEY` (chỉ gọi RPC quota),
  `CHAT_RATE_LIMIT_SECRET` (ít nhất 32 ký tự) và migration GĐ6 ở mọi môi trường cần chat. Chat bị
  chặn nếu quota store không hoạt động. Mặc định proxy IP không tin cậy, mọi request chung một quota
  IP an toàn; đặt `CHAT_TRUST_PROXY=true` chỉ khi ingress đã gỡ header do client gửi và tự đặt
  `X-Forwarded-For`.
- LLM tắt mặc định. Chỉ bật gửi câu hỏi sang OpenAI khi đặt `AIR_ENABLE_CHAT_LLM=true`,
  `OPENAI_API_KEY` và `OPENAI_MODEL`; giao diện báo khách trước khi nhập tin nhắn. Gửi `store:false`
  để không lưu trạng thái Responses truy xuất lại qua API, nhưng dữ liệu vẫn chịu chính sách xử lý và
  lưu giữ của nhà cung cấp. Model chỉ chọn tối đa một tool đã giới hạn; câu trả lời tồn kho/đơn do dữ
  liệu server tạo. FAQ và intent xác định chạy trước LLM. Nếu provider lỗi, trợ lý dùng FAQ xác định.

## Thanh toán GĐ4

- `payment_state` tách khỏi trạng thái đơn; `payments` là sổ giao dịch append-only, RLS chỉ đọc.
- Webhook `POST /api/webhooks/sepay` xác thực `Authorization: Apikey`, idempotent theo
  `(provider, external_id)`; replay trả giao dịch cũ thay vì tạo dòng mới.
- Hoàn cọc khi đơn `completed`: trigger tạo khoản `pending`, staff xác nhận đã chuyển tiền.
- Hoá đơn in/PDF tại `/don-thue/[id]/hoa-don`; thanh toán thật và MoMo/VNPay chưa cấu hình.

## Quản trị và giá GĐ5

- `/admin` có dashboard, quản lý đơn, kho/máy vật lý, lịch bảo trì và nhật ký thao tác.
- `/admin/ma-giam-gia` quản lý mã phần trăm/số tiền; `/admin/khu-vuc-giao` quản lý phí giao và
  ngưỡng miễn phí.
- Checkout chọn nhận tại cửa hàng hoặc giao hàng; giá, giảm giá và phí giao được tính lại ở server
  qua `preview_booking_quote()` trước khi tạo đơn.
- `orders.total_vnd` = tiền thuê sau giảm + phí giao, chưa gồm cọc; cọc không bị mã giảm giá.

## Hoàn thiện GĐ7

- Kiểm thử Playwright cho đặt thuê + webhook + tra cứu đơn; bổ sung kiểm tra tương phản, focus ring,
  reduced motion và thao tác chat bằng bàn phím.
- Trang điều khoản thuê, huỷ/hoàn cọc và bảo mật ở trạng thái dự thảo, `noindex`, không vào sitemap.
- Runbook vận hành, backup/restore PostgreSQL local và cảnh báo lỗi HTTPS tùy chọn (mặc định tắt).
- Chưa deploy, chưa cấu hình ngân hàng/SMS/LLM thật; hiệu năng mới đo trên production build local.
