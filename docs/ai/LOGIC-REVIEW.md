# Rà soát logic — 07/11/2026

Phạm vi: toàn bộ `web/src` (server actions, route handlers, trang đối tác/quản trị/khách) và
`supabase/migrations` (RPC, RLS, trigger). Baseline trước khi sửa: `npm test` 78/78 pass, lint và
typecheck sạch. pgTAP chưa chạy được trong lần rà soát này (cần Docker + Supabase CLI).

## A. Đã sửa trong lần này

| #   | Vấn đề                                                                                                | Hậu quả                                                                                                             | File                                                            |
| --- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| 1   | Trang tổng quan đối tác đọc `partner.status` khi `partner` là `null` và truy vấn `partner_id = ''`    | Crash 500 cho tài khoản role `partner` không có hồ sơ đối tác                                                       | `web/src/app/(partner)/partner/page.tsx`                        |
| 2   | Nhãn trạng thái sản phẩm nháp ghi "Khả draft"; trạng thái hồ sơ hiện mã thô (`pending`)               | Sai chính tả, khó hiểu                                                                                              | như trên                                                        |
| 3   | Trang duyệt đối tác dùng `money()` cho phần trăm hoa hồng                                             | Hiện "15 ₫%"                                                                                                        | `web/src/app/(admin)/admin/doi-tac/page.tsx`                    |
| 4   | Trang duyệt đối tác gọi `partners.length` khi query lỗi (`data = null`); `suspended` hiện "Chờ duyệt" | Crash 500; nhãn sai                                                                                                 | như trên                                                        |
| 5   | Ngày tạo đơn, lịch sử đơn, hoạt động gần đây ở dashboard format không có `timeZone`                   | Vercel chạy UTC → đơn đặt 00:00–06:59 giờ VN hiện sai ngày/giờ                                                      | `don-thue/page.tsx`, `don-thue/[id]/page.tsx`, `admin/page.tsx` |
| 6   | Danh sách "Đơn của tôi" hiện `subtotal` (trước giảm giá, chưa phí giao)                               | Lệch với "Tổng tiền thuê" ở trang chi tiết                                                                          | `web/src/app/(rental)/don-thue/page.tsx`                        |
| 7   | `productAssetTag` cắt slug còn 48 ký tự                                                               | Hai sản phẩm tên dài chung tiền tố (`…-2`) sinh cùng `asset_tag` → insert máy lỗi → đối tác không lưu được sản phẩm | `web/src/features/partner/slug.ts` (+ test)                     |
| 8   | Form thêm sản phẩm đối tác nói "hiển thị sau khi duyệt"                                               | Thực tế chọn "Đang cho thuê" là lên catalog ngay                                                                    | `partner/san-pham/them/page.tsx`                                |

## B. Lỗi logic ở tầng DB

### B1. Mã giảm giá không được hoàn lượt khi đơn huỷ/hết hạn — **Cao — ĐÃ SỬA (chưa áp lên production)**

Trước đây `create_multi_product_booking` tăng `discount_codes.used_count` ngay khi tạo đơn
`pending` và không chỗ nào giảm lại khi đơn `cancelled`/`expired`; mã có `max_uses` bị "đốt" bởi
đơn giữ chỗ bỏ dở, ai cũng có thể đặt rồi huỷ liên tục để vô hiệu hoá mã.

Cách sửa — migration `supabase/migrations/202611070001_discount_usage_from_orders.sql`:

- `discount_code_active_uses(id)` đếm đơn đang dùng mã: mọi trạng thái trừ `cancelled`, `expired`
  và `pending` đã quá `expires_at`.
- `quote_booking` so `max_uses` với con số này (vẫn khoá dòng discount `FOR UPDATE` trước khi đếm
  nên không bán vượt). Không dùng trigger trả lượt vì có thể deadlock với CTE expire.
- `used_count` giữ ý nghĩa lịch sử (tổng lần đã áp, kể cả đơn huỷ); bỏ ràng buộc
  `used_count <= max_uses` — nhờ đó admin cũng hạ được `max_uses` (mục C3 cũ).
- `discount_code_usage()` (chỉ admin) cho trang `/admin/ma-giam-gia` hiển thị "đang dùng X/max".
  Nếu DB chưa có migration, trang tạm hiện `used_count`.
- Test: `supabase/tests/discount_usage.test.sql` (13 test); fixture `EXHAUSTED` trong
  `discounts_delivery.test.sql` nay có một đơn `confirmed` thật.

Cần làm khi deploy: chạy `supabase db push` (hoặc SQL migration) lên Supabase Cloud.

### B2. Đơn đã nhận tiền bị huỷ/hết hạn không tạo nghĩa vụ hoàn tiền — **Cao — ĐÃ SỬA (chưa áp lên production)**

Lần rà soát 2 cho thấy lỗi rộng hơn mô tả ban đầu. Trang đơn hiện thông tin chuyển khoản ngay khi
đơn còn `pending`, nên tiền có thể vào trước khi đơn bị huỷ. Ba đường giữ tiền khách mà không ghi
khoản phải trả:

1. Khách chuyển cọc rồi tự huỷ đơn `pending` (`cancel_booking`).
2. Đơn `pending` đã trả cọc nhưng hết 30 phút giữ máy trước khi nhân viên xác nhận (expire).
3. Nhân viên huỷ đơn `confirmed` đã thanh toán.
4. (B2 cũ) Tiền đến sau khi đơn đã huỷ/hết hạn — còn có thể đặt `payment_state = 'paid'`.

Cách sửa — migration `supabase/migrations/202611080001_cancellation_refunds.sql`:

- `payments.kind` thêm `cancellation_refund`.
- Trigger `create_refund_on_cancellation`: khi đơn chuyển sang `cancelled`/`expired`, hoàn toàn bộ
  số dư (`order_refundable_balance` = tiền vào thành công − các khoản hoàn đã/đang làm),
  `payment_state = 'refund_pending'`.
- `apply_sepay_payment`: tiền đến cho đơn đã huỷ/hết hạn được ghi nhận và tạo ngay khoản hoàn.
- `complete_deposit_refund` xác nhận được cả hai loại; `admin_dashboard.refunds_pending` đếm cả hai.
- Web: `/quan-ly-don` hiện nút xác nhận cho cả hoàn tiền huỷ đơn; nhãn `refund_pending`/`refunded`
  đổi thành "Chờ hoàn tiền"/"Đã hoàn tiền" (không còn nói "đơn đã hoàn thành" với đơn bị huỷ).
- Test: `supabase/tests/cancellation_refunds.test.sql` (17 test).

Chưa mô hình hoá phí huỷ: hệ thống tạo khoản hoàn toàn bộ, nhân viên điều chỉnh ngoài hệ thống nếu
chính sách có phí.

### B3. Hoàn cọc đủ dù khách chưa trả tiền thuê — **Trung bình (chính sách)**

Trigger `create_deposit_refund_on_completion` hoàn `least(cọc, tổng đã trả)`. Nếu khách chỉ trả cọc
(`deposit_paid`) rồi đơn hoàn thành, hệ thống tạo khoản hoàn toàn bộ cọc trong khi tiền thuê chưa
thu. Cần quyết định: hoàn `max(0, đã trả − total)` hay chặn `→ completed` khi chưa `paid`.

### B4. Webhook SePay có thể bị retry vô hạn — **Thấp**

`apply_sepay_payment` `raise` khi số tiền > 10^12 hoặc `external_id` > 120 ký tự; route trả 500 →
SePay gửi lại mãi. Nên trả về `{status: 'ignored'}` thay vì raise cho các lỗi dữ liệu.

### B5. Đơn đã trả cọc vẫn hết hạn sau 30 phút nếu nhân viên chưa xác nhận — **Trung bình (chính sách)**

`expires_at` cố định 30 phút từ lúc tạo; thanh toán không gia hạn và không tự xác nhận đơn. Khách
đặt buổi tối, chuyển cọc ngay, nhưng nhân viên chưa bấm "Xác nhận" trong 30 phút → đơn hết hạn,
máy được giải phóng cho người khác. Sau B2 tiền sẽ được ghi nhận để hoàn, nhưng khách vẫn mất lịch.
Đề xuất (cần quyết định): khi `apply_sepay_payment` đưa đơn `pending` còn hạn lên `deposit_paid`,
gia hạn `expires_at` (ví dụ tới cuối ngày làm việc kế tiếp) hoặc tự chuyển `confirmed`.

### B6. Mở bảo trì được cho máy đang ở nhà khách khi đơn quá hạn — **Thấp**

`open_unit_maintenance` chỉ chặn reservation `pending`/`confirmed` trùng cửa sổ bảo trì. Đơn
`overdue` đã qua `blocked_period` nên máy đang ở nhà khách vẫn mở bảo trì được; đóng bảo trì sẽ đưa
máy về `available` dù chưa trả. Nên chặn thêm khi máy thuộc đơn `delivering/active/returning/overdue`.

## C. Rủi ro bảo mật/vận hành cần quyết định

### C1. Tài khoản demo `admin@air.com` với OTP cố định trên production — **Cao**

`docs/DEMO-ACCOUNTS.md` yêu cầu `AIR_DEMO_LOGIN=true` ở production. Khi đó bất kỳ ai biết mã `111111`
(được ghi công khai trong repo và hiện ngay trên form đăng nhập) đều đăng nhập quyền **admin**: xem
họ tên/SĐT/địa chỉ của mọi khách, duyệt đối tác, sửa giá, đổi trạng thái đơn. Chấp nhận được cho bản
trình diễn đồ án **chỉ khi không có dữ liệu khách thật**. Trước khi nhận khách thật: đặt
`AIR_DEMO_LOGIN=false` hoặc hạ `admin@air.com` xuống vai trò chỉ đọc.

### C2. Doanh thu đối tác tính trên giá trước mã giảm giá và không xét thanh toán — **chính sách**

`loadPartnerOrders` cộng `order_items.line_total_vnd` (sau giảm theo bậc ngày, **trước** mã giảm
giá cấp đơn) cho mọi đơn `completed`, kể cả đơn `unpaid`. Nghĩa là nền tảng chịu toàn bộ mã giảm
giá và trả đối tác cả khi chưa thu tiền. Nếu đúng chủ ý thì nên ghi vào chính sách đối tác.

### C3. Một số điểm nhỏ

- `rejectPartner`/`approvePartner` không kiểm tra trạng thái hiện tại (UI chỉ hiện nút cho
  `pending` nên chưa gây lỗi). Không có thao tác "tạm ngưng" dù schema có `suspended`.
- Đối tác bị từ chối không thể đăng ký lại (hồ sơ `rejected` vẫn còn).
- `registerPartner` cho nhập email liên hệ tự do, không ràng buộc với email tài khoản.

## E. Lần rà soát 2 — 08/11/2026: lỗi web đã sửa

| #   | Vấn đề                                                                                                                      | Hậu quả                                                        | File                                                                                    |
| --- | --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| 1   | Admin lưu sản phẩm chấp nhận mọi link `http(s)`, nhưng danh mục chỉ hiển thị ảnh `/images/` hoặc Supabase Storage công khai | Lưu "thành công" nhưng sản phẩm biến mất khỏi `/san-pham`      | `features/admin/actions.ts` → dùng chung `features/products/catalog-images.ts` (+ test) |
| 2   | Form sửa sản phẩm admin nối ảnh bằng chuỗi gồm dấu gạch chéo ngược + chữ n, không phải ký tự xuống dòng                     | Sửa một sản phẩm nhiều ảnh là gộp các link thành một link hỏng | `app/(admin)/admin/san-pham/page.tsx`                                                   |
| 3   | Ô số lượng trong giỏ: xoá trống để gõ số mới → `Number('') = 0` → xoá luôn dòng                                             | Mất sản phẩm khỏi giỏ khi đang sửa số lượng                    | `features/cart/rental-cart-panel.tsx`                                                   |
| 4   | Kiểm tra link ảnh của đối tác nằm riêng trong action đối tác                                                                | Hai quy tắc dễ lệch nhau                                       | gộp vào `catalog-images.ts`                                                             |

## D. Phần đã kiểm tra và thấy đúng

- Giá chỉ tính ở DB; client không gửi tiền. Làm tròn `floor` khớp giữa `domain.ts` và SQL.
- Chống trùng lịch: exclusion constraint trên `reservations` + `FOR UPDATE SKIP LOCKED` + advisory
  lock theo idempotency key; ngày inclusive và 1 ngày đệm nhất quán giữa lịch, đặt đơn, bàn giao.
- Idempotency phía client giữ key khi lỗi không xác định, xoá khi thành công.
- RLS đối tác sau `202611060003`: không tự duyệt, không tự bỏ hoa hồng, không đổi chủ sản phẩm,
  không đánh dấu sample; thông tin liên hệ đối tác không lộ cho anon.
- Webhook: so khớp secret thời gian hằng, chống lặp theo `external_id`, không mở lại hoàn cọc.
- Open redirect: `safeInternalPath` dùng cho mọi `?next=`.
- Chat: giới hạn kích thước, same-origin, quota bền vững trước khi gọi LLM.
