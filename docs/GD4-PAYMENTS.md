# GĐ 4 — Thanh toán, cọc và hoá đơn

**Trạng thái:** xong phần code, đã nghiệm thu local đầy đủ ngày 01/11/2026. Mới chạy với tài khoản
ngân hàng giả lập và webhook gửi tay; chưa kết nối SePay thật.

## Phạm vi đã làm

| Hạng mục | Nơi triển khai | Ghi chú |
| --- | --- | --- |
| Trạng thái thanh toán | `orders.payment_state`, `features/payments/state-labels.ts` | Tách khỏi `order_state`; badge ở danh sách, chi tiết đơn và trang staff |
| Sổ giao dịch | bảng `payments` (append-only) | Mỗi giao dịch vào/ra một dòng; unique `(provider, external_id)` |
| Webhook SePay | `app/api/webhooks/sepay/route.ts`, `features/payments/sepay.ts` | Xác thực `Authorization: Apikey`, kiểm tra envelope, gọi RPC security definer |
| Idempotency | bảng `payment_webhook_events` + `apply_sepay_payment` | Replay trả lại `paymentId` cũ, không tạo dòng thứ hai |
| Hoàn cọc | trigger `orders_create_deposit_refund`, RPC `complete_deposit_refund` | Đơn `completed` mở khoản hoàn `pending`; staff xác nhận đã chuyển tiền |
| Hướng dẫn chuyển khoản | `features/payments/payment-panel.tsx` | Hiện số tài khoản, số tiền còn thiếu và nội dung chuyển khoản đúng mã đơn |
| Hoá đơn in/PDF | `/don-thue/[id]/hoa-don` | In bằng trình duyệt (`window.print()`), `@media print` ẩn điều hướng |

## Mô hình dữ liệu

```text
orders.payment_state: unpaid → deposit_paid → paid → refund_pending → refunded
payments(provider, external_id, direction, kind, amount_vnd, status, payload)
payment_webhook_events(provider, external_id, payload, outcome, order_id, payment_id)
```

- **`payment_state` độc lập với `order_state`.** Một đơn có thể `completed` mà vẫn `refund_pending`
  cho tới khi cửa hàng chuyển trả cọc.
- **Ledger chỉ ghi thêm.** Không có UPDATE số tiền; chỉ `status` của khoản hoàn chuyển từ `pending`
  sang `succeeded` khi staff xác nhận.
- **`payment_webhook_events` giữ cả envelope không khớp đơn** (`outcome = 'ignored'`) để đối soát tay;
  đây là bảng server-only, RLS bật và không cấp quyền cho `anon`/`authenticated`.
- **`payments` đọc được theo chủ đơn hoặc staff/admin**, không có quyền INSERT/UPDATE/DELETE cho client.

## Hợp đồng webhook SePay

- `POST /api/webhooks/sepay`, JSON theo mẫu SePay (`id`, `transferType`, `transferAmount`, `content`).
- Header xác thực: `Authorization: Apikey <SEPAY_WEBHOOK_SECRET>`; so sánh độ dài cố định, không rò rỉ
  tiền tố qua thời gian phản hồi.
- Mã đơn được tìm bằng regex `AIR-\d{6}-[A-F0-9]{8}` trong nội dung chuyển khoản.
- Trả `200` cho: replay (`duplicate`), chuyển tiền ra (`not-incoming`), không có mã đơn
  (`order-code-not-found`), deployment đang tắt (`disabled`). Trả `401` khi sai khoá, `400` khi JSON
  hỏng, `500` khi ghi DB thất bại — để SePay retry đúng trường hợp cần retry.
- `apply_sepay_payment` khoá dòng đơn (`for update`), nên hai webhook đến cùng lúc vẫn tuần tự.

## Quyết định kỹ thuật

- **Cọc lấy theo `orders.deposit_vnd`, không tính lại 30%.** Roadmap ghi "30% hoặc theo `category`",
  nhưng GĐ 2 đã chốt cọc theo tổng cọc của từng sản phẩm và lưu vào đơn. GĐ 4 dùng đúng con số đó để
  không lệch với số khách đã thấy lúc đặt.
- **Không tự động chuyển tiền hoàn cọc.** Hệ thống tạo nghĩa vụ hoàn và để staff xác nhận sau khi
  chuyển khoản thật; tránh đánh dấu "đã hoàn" khi tiền chưa đi.
- **Hoàn cọc = `min(deposit_vnd, tiền đã thu)`**, nên đơn miễn cọc hoặc thu thiếu không sinh khoản âm.
- **Webhook là nguồn duy nhất ghi tiền vào.** Không có nút "đánh dấu đã thanh toán" cho staff, tránh
  hai nguồn sự thật.
- **Hoá đơn PDF dùng bản in trình duyệt.** Chưa thêm thư viện PDF server-side; `@media print` đã ẩn
  header/footer/nút để bản in sạch.

## Kiểm thử

| Lệnh | Kết quả hiện tại |
| --- | --- |
| `cd web && npm test` | **33/33 pass** (12 file, thêm `features/payments/sepay.test.ts`) |
| `cd web && npm run lint` / `typecheck` | sạch |
| `cd web && npm run build` | thành công, có `/api/webhooks/sepay` và `/don-thue/[id]/hoa-don` |
| `npx supabase db reset` + `supabase test db` | **171/171 pass** (34 + 9 + 49 + 48 + 31) |
| `node scripts/check-booking-concurrency.mjs` | **6/6 pass** |
| `node scripts/check-gd2-browser.mjs` | **pass** toàn bộ, không hồi quy sau khi thêm thanh toán |
| `node scripts/check-payments-webhook.mjs` | **6/6 pass**: replay, sai khoá, thiếu mã đơn, chuyển tiền ra |
| Kiểm tra trình duyệt GĐ 4 (Playwright, chạy tay) | **pass**: hướng dẫn chuyển khoản → webhook → badge/lịch sử → hoá đơn in + 390px; staff hoàn cọc |

## Cách bật local

1. `supabase start` + `supabase db reset`.
2. Trong `web/.env.local`:
   ```dotenv
   AIR_ENABLE_PAYMENTS=true
   SEPAY_WEBHOOK_SECRET=local-sepay-secret
   AIR_BANK_NAME=Vietcombank (local)
   AIR_BANK_ACCOUNT_NUMBER=0123456789
   AIR_BANK_ACCOUNT_NAME=CONG TY AIR
   SUPABASE_SERVICE_ROLE_KEY=<service role key của Supabase local>
   ```
3. `cd web && npm run build && npm start`, rồi chạy
   `SEPAY_WEBHOOK_SECRET=local-sepay-secret node scripts/check-payments-webhook.mjs`.
4. Trên SePay: trỏ webhook về `https://<domain>/api/webhooks/sepay`, chọn xác thực API key và dán
   cùng giá trị `SEPAY_WEBHOOK_SECRET`.

## Giới hạn còn lại

- Chưa kết nối SePay/ngân hàng thật; chưa thử retry thật của SePay, chỉ mô phỏng bằng HTTP.
- Chưa có MoMo/VNPay (roadmap để mở, chưa cần cho MVP).
- Hoá đơn là bản in trình duyệt, không phải hoá đơn VAT và không có ký số.
- Chưa có đối soát tự động cho khoản chuyển thiếu/sai nội dung; `payment_webhook_events` giúp tra tay.
- Chưa gửi email/SMS xác nhận thanh toán (thuộc GĐ 5–6).
