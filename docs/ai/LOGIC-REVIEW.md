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

### B6. Mở bảo trì được cho máy đang ở nhà khách khi đơn quá hạn — **Thấp — ĐÃ SỬA (lần 4)**

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

## F. Lần rà soát 3 — 08/11/2026: frontend, backend, luồng thật

Đã chạy: `npm run build` (sạch, không cảnh báo); CI PR #3 — pgTAP 12 file / 333 test pass; trên
production (chỉ đọc, không đăng nhập): trang chủ, danh mục, chi tiết, giỏ thuê → lịch trống (63
ngày) → báo giá (7 ngày Lenovo Yoga 7 14 = 1.624.000 ₫, cọc 4.500.000 ₫), chat (tìm sản phẩm, FAQ,
kiểm tra lịch, hỏi đơn khi chưa đăng nhập) — đều đúng, không lỗi console.

| #   | Vấn đề                                                     | Hậu quả                                                                           | Sửa                                                                                           |
| --- | ---------------------------------------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| 1   | Header 901–1079px: ô tìm kiếm cố định 210px, menu không co | Mọi trang cuộn ngang tới 136px (đo ở 940px), nút "Đăng nhập" bị cắt               | `globals.css`: ô tìm kiếm co giãn dưới 1120px; đo lại 4 trang × 9 khổ màn hình không còn tràn |
| 2   | Gợi ý thanh toán "Chuyển khoản tiền cọc để giữ máy"        | Sai: chuyển khoản không giữ máy (B5), mâu thuẫn với chat ("cọc thu khi bàn giao") | `payments/state-labels.ts`: nói đúng hành vi hiện tại và việc hoàn tiền khi huỷ               |

Ghi nhận chưa sửa (thấp):

- Mobile: nút trợ lý chat nổi che một phần thẻ giá ở hero và ô "Sắp xếp" trên `/san-pham`.
- Giấy tờ định danh có hai công tắc (env `AIR_ENABLE_IDENTITY_DOCUMENTS` và bảng
  `identity_document_settings`) nhưng không có UI bật cái thứ hai; ảnh đã duyệt không có hạn xoá.
- Chưa kiểm tra được luồng cần đăng nhập (đặt đơn, quản trị, đối tác) trên trình duyệt: bản local
  không có Supabase và không đăng nhập tài khoản trên production.

## G. Lần rà soát 4 — 08/11/2026

Đã sửa:

| #   | Vấn đề                                                                                                                              | Hậu quả                                                                              | Sửa                                                                                                     |
| --- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| 1   | Checkout không dùng sổ địa chỉ: ô địa chỉ luôn trống dù khách đã lưu địa chỉ mặc định (`saveOwnAddress` còn revalidate `/checkout`) | Sổ địa chỉ gần như vô dụng; khách gõ lại mỗi lần                                     | `(rental)/checkout/page.tsx` điền sẵn từ địa chỉ mặc định (tên/SĐT lấy hồ sơ, thiếu thì lấy từ địa chỉ) |
| 2   | `order_events.actor_id` khi expire = người đang chạy câu lệnh; đơn hết hạn bị expire hàng loạt trong lượt đặt của một khách khác    | `/admin/nhat-ky` ghi một khách lạ là "người thao tác" làm hết hạn đơn của người khác | migration `202611080002`: expire luôn ghi actor = null ("Hệ thống")                                     |
| 3   | B6: bảo trì mở được cho máy của đơn `overdue` đã qua `blocked_period`                                                               | Đóng bảo trì đưa máy về `available` dù khách chưa trả                                | migration `202611080002`: chặn khi máy thuộc đơn `delivering/active/returning/overdue`                  |

Test: `supabase/tests/audit_custody.test.sql` (5 test).

Còn mở, cần quyết định:

- **Phí huỷ trong chính sách không ghi được vào hệ thống — Trung bình.** `/chinh-sach/huy-don-hoan-coc`
  nói huỷ trong vòng 24 giờ trước giờ nhận máy bị phí 20% tiền thuê, nhưng khoản hoàn tạo tự động
  luôn là toàn bộ số đã nhận và `complete_deposit_refund` chỉ đánh dấu đủ số tiền đó → sổ cái ghi
  sai nếu nhân viên thực tế giữ lại phí. Đề xuất: thêm tham số số tiền thực hoàn (≤ khoản chờ) hoặc
  tự tính phí theo giờ nhận máy. Chính sách cũng hứa "đổi lịch" nhưng hệ thống chưa có chức năng này.
- **Đăng ký hộ email người khác — Thấp.** `registerAccount` lưu họ tên/SĐT/địa chỉ vào metadata của
  một email chưa có tài khoản; khi chủ email đăng nhập lần đầu, `syncRegistrationProfile` chép các
  thông tin đó vào hồ sơ và sổ địa chỉ của họ (giờ còn được điền sẵn ở checkout). Chủ email vẫn thấy
  và sửa được trước khi đặt, nhưng nên để người dùng xác nhận thông tin ở lần đăng nhập đầu.
- **Chat LLM không thể kiểm tra lịch hợp lệ — Thấp.** Công cụ `checkAvailability` cần UUID sản phẩm
  và ngày, nhưng model không được cung cấp UUID hay ngày hôm nay → gần như luôn bị từ chối hoặc đoán.
- ~~`robots.ts` không chặn `/partner` và `/dang-ky-doi-tac`~~ — đã sửa ở lần 5.

## H. Lần rà soát 5 — 08/11/2026: lỗi trải nghiệm và cải thiện

| #   | Vấn đề                                                                                 | Hậu quả                                                                                                                      | Sửa                                                                                                        |
| --- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 1   | Giỏ thuê ghi localStorage nhưng không phát sự kiện `air-rental-cart-change`            | Số trên biểu tượng giỏ ở header không đổi khi sửa số lượng; sau khi đặt đơn thành công giỏ đã xoá nhưng badge vẫn hiện số cũ | `rental-cart-panel.tsx`: phát sự kiện khi lưu/xoá, chỉ ghi khi nội dung đổi để không lặp vô hạn với `sync` |
| 2   | Đăng nhập: "Gửi lại mã" bị từ chối (phải chờ 60 giây) thì form quay về bước nhập email | Khách mất ô nhập mã dù đã có mã hợp lệ                                                                                       | `login-form.tsx`: nhớ email đã gửi thành công                                                              |
| 3   | Đăng nhập: "Đổi email" là link tới đúng URL đang mở                                    | Next giữ nguyên state nên bấm không có tác dụng                                                                              | nút đổi `key` để làm mới form                                                                              |
| 4   | Đăng ký xong, nút "Nhập mã OTP" chuyển sang `/dang-nhap` buộc gửi mã mới               | Gần như luôn bị Supabase chặn "chờ 60 giây" vì vừa gửi mã đăng ký                                                            | `register-form.tsx`: nhập mã ngay trên trang đăng ký                                                       |
| 5   | Đăng ký đối tác xong không có lối vào khu vực đối tác; header vẫn là của khách         | Phải tự tải lại trang                                                                                                        | link `/partner` + `revalidatePath('/', 'layout')`                                                          |
| 6   | Danh mục: 24 sản phẩm mẫu (không đặt được) đứng trước 10 sản phẩm thật                 | Khách phải cuộn qua hết mẫu mới thấy hàng thuê được                                                                          | thứ tự mặc định đưa hàng đặt được lên trước (có test)                                                      |
| 7   | Tìm kiếm phân biệt dấu: "may anh" không ra "Máy ảnh"                                   | Gõ không dấu trên điện thoại ra 0 kết quả                                                                                    | `searchText` bỏ dấu tiếng Việt (có test)                                                                   |
| 8   | `robots.ts` không chặn `/partner`, `/dang-ky-doi-tac`                                  | Bot vẫn thu thập (các trang đã `noindex`)                                                                                    | thêm vào disallow                                                                                          |

Đã kiểm tra trên bản local: badge 1 → 3 khi đổi số lượng, xoá trống ô số lượng giữ nguyên dòng,
"may anh" ra 5 máy ảnh, trang đăng nhập/đăng ký hiển thị bình thường. Luồng OTP thật chưa thử được
(bản local không có Supabase).

## I. Lần rà soát 6 — 08/11/2026: nội dung hiển thị và độ bền trang

| #   | Vấn đề                                                                     | Hậu quả                                                                                | Sửa                                                                         |
| --- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 1   | Trang chủ: "N+ thiết bị" và "Giá từ …K/ngày" tính cả sản phẩm mẫu          | Production ghi "34+ thiết bị" khi chỉ 10 máy thuê được; giá "từ" có thể là giá của mẫu | `app/page.tsx`: chỉ tính hàng đặt được (mẫu chỉ dùng khi chưa có hàng thật) |
| 2   | Khung thanh toán và hoá đơn ghi "Còn lại: …" cho đơn đã huỷ/hết hạn        | Khách tưởng còn nợ tiền một đơn đã đóng                                                | `payment-panel.tsx`, `hoa-don/page.tsx`: đơn đã đóng còn lại 0              |
| 3   | Trang tài khoản mời staff/admin đăng ký đối tác                            | Bấm vào chỉ nhận lỗi "Tài khoản nhân viên không thể đăng ký"                           | chỉ hiện cho khách                                                          |
| 4   | Trang tài khoản luôn hiện mục giấy tờ định danh                            | Khi tính năng tắt, khách vào trang chỉ thấy thông báo "chưa bật"                       | ẩn khi `identityDocumentsEnabled()` sai                                     |
| 5   | Lỗi đọc danh sách yêu thích làm sập cả danh mục/trang sản phẩm (trang lỗi) | Một bảng phụ lỗi kéo theo trang công khai                                              | `readViewerFavorites` trả danh sách rỗng khi lỗi                            |

Vẫn chờ quyết định: B5 (đơn đã trả cọc vẫn hết hạn sau 30 phút), phí huỷ 20% chưa ghi được vào
sổ cái, B3, C1 (tài khoản demo admin trên production).

## J. Lần rà soát 7 — 08/11/2026: frontend

Quét tự động 9 trang công khai trên production (alt ảnh, nhãn form, tên nút/link, id trùng, số h1,
thứ tự heading, lang, meta description, canonical): **không có lỗi** (chỉ các trang `noindex` không có
canonical — đúng). Focus bàn phím có viền 3px toàn cục. Tải trang (cache ấm): TTFB ~60ms, DOM xong
0,5–0,7s, ảnh danh mục lazy-load.

Đã sửa:

| #   | Vấn đề                                                                                                | Sửa                                                                                       |
| --- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 1   | 404 là trang mặc định tiếng Anh của Next, không header, không lối về (gặp khi mở link sản phẩm đã gỡ) | `app/not-found.tsx` (có header/footer) và `app/san-pham/not-found.tsx` riêng cho thiết bị |
| 2   | Không có `app/error.tsx`: lỗi ở trang chủ, quản trị, đối tác, nội dung rơi vào trang lỗi tiếng Anh    | thêm trang lỗi chung tiếng Việt có "Thử lại"                                              |
| 3   | Điện thoại: nút phụ "Quay lại danh mục" nằm trên nút chính "Thêm vào giỏ thuê"; hai nút khác bề ngang | đưa nút chính lên trước, cùng bề ngang                                                    |
| 4   | Điện thoại: nút chat 76×76px che nội dung/footer                                                      | 58px dưới 560px                                                                           |
| 5   | 4 cảnh báo autoprefixer (`align-items: end/start` trong flex) mỗi lần build                           | đổi sang `flex-end`/`flex-start` (cùng kết quả); build không còn cảnh báo                 |

### Đề xuất cải thiện frontend (chưa làm)

1. ✅ **Trạng thái đang tải:** không có `loading.tsx` nào; mọi trang là `force-dynamic` gọi Supabase nên
   khi bấm chuyển trang không có phản hồi. Thêm skeleton cho `/san-pham`, `/don-thue`, `/gio-thue`,
   `/admin`, `/partner`.
2. ✅ **Thanh đặt thuê cố định trên điện thoại:** giá/ngày + "Thêm vào giỏ" dính đáy màn hình ở trang
   chi tiết; hiện nút nằm sau toàn bộ bảng thông số.
3. **Header điện thoại chiếm ~150px** (logo, menu, ô tìm kiếm, đều sticky) ≈ 18% màn hình: thu ô tìm
   kiếm thành biểu tượng hoặc ẩn khi cuộn xuống.
4. **Chọn ngày bằng lịch** thay cho hai `<select>` 63 mục ở giỏ thuê; hiện cả ngày hết máy (mờ).
5. ✅ **Thư viện ảnh sản phẩm:** trang chi tiết chỉ hiện ảnh đầu dù đối tác/admin lưu được 8 ảnh.
6. ✅ **Checkout chọn địa chỉ** trong sổ địa chỉ (hiện chỉ điền địa chỉ mặc định).
7. ✅ **Ảnh mascot 73KB** tải ở mọi trang cho nút 58–76px: xuất bản ~160px (≈10KB) hoặc dùng
   `next/image`; xoá `public/air-robot-mascot.png` (1,3MB, không còn dùng).
8. ✅ **Thống nhất định dạng tiền:** nhiều chỗ `toLocaleString('vi-VN') + " ₫"`, chỗ khác `money()`.
9. **Gỡ prototype `/demo`** (`views/`, `app-shell.tsx`, `data/products.ts`, `lib/storage.ts`,
   `lib/pricing.ts`) để giảm mã phải bảo trì, nếu đồ án không còn cần.
10. **Kiểm tra a11y tự động trong CI** (axe-core qua Playwright, đã có sẵn script Playwright), gồm
    độ tương phản màu — lần quét này chưa đo tương phản.

## K. Cải thiện frontend đã làm (08/11/2026)

Các mục đánh dấu ✅ ở danh sách đề xuất của mục J:

- **Khung chờ khi chuyển trang:** `components/ui/PageSkeleton.tsx` + `loading.tsx` cho `/san-pham`,
  nhóm `(rental)`, `(admin)`, `(partner)`; tắt hiệu ứng khi người dùng bật giảm chuyển động.
- **Thanh đặt thuê trên điện thoại** (`.mobile-book-bar`, dưới 760px): giá/ngày, cọc và nút thêm vào
  giỏ dính đáy màn hình; footer chừa chỗ, nút chat dời lên trên thanh. Nút trong thanh có test id
  riêng `add-to-rental-cart-mobile-bar` để các script Playwright dùng `add-to-rental-cart` không bị
  trùng.
- **Thư viện ảnh:** `features/products/product-gallery.tsx` hiện dải ảnh nhỏ khi sản phẩm có từ 2 ảnh.
- **Checkout chọn từ sổ địa chỉ** (tối đa 20, mặc định đứng đầu, có "Nhập thông tin khác"). Tên, SĐT,
  địa chỉ giờ là input có kiểm soát: trước đây React 19 tự đặt lại form sau mỗi lần gửi, nên đặt thất
  bại (ví dụ máy vừa hết lịch) làm mất những gì khách đã sửa.
- **Ảnh mascot** 1254px/73KB → 256px/7,5KB; xoá `web/public/air-robot-mascot.png` (1,3MB, không dùng;
  bản Vite ở gốc có file riêng).
- **Định dạng tiền:** 7 chỗ `toLocaleString('vi-VN') + " ₫"` chuyển sang `money()`.

Còn lại: 3 (header điện thoại gọn hơn), 4 (lịch chọn ngày), 9 (gỡ `/demo`, cần bạn quyết định),
10 (a11y tự động trong CI).

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
