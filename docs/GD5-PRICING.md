# GĐ 5 — Giá bán (đợt B: mã giảm giá, phí giao theo khu vực)

**Trạng thái:** xong ngày 02/11/2026, nghiệm thu local. Tiếp nối đợt A trong
[`docs/GD5-ADMIN.md`](GD5-ADMIN.md).

Đợt B thay đổi cách tính tiền của một đơn thuê:

1. Giá niêm yết và giảm giá theo số ngày thuê (đã có từ GĐ 2) tạo ra **tiền thuê**.
2. Mã giảm giá trừ trên **tiền thuê**, không trừ tiền cọc.
3. Phí giao của khu vực được cộng **sau** khi trừ mã.
4. Ngưỡng miễn phí giao so với **tiền thuê còn lại sau giảm**.
5. Tiền cọc luôn tách riêng và không bị mã giảm giá làm thay đổi.

## Phạm vi đã làm

| Hạng mục            | Nơi triển khai                                                          | Ghi chú                                                                                   |
| ------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Mã giảm giá         | `discount_codes`, `app/(rental)/admin/ma-giam-gia`                      | Mã theo phần trăm hoặc số tiền cố định; giới hạn ngày, lượt dùng, tiền thuê tối thiểu     |
| Khu vực giao        | `delivery_zones`, `app/(rental)/admin/khu-vuc-giao`                     | Phí giao, ngưỡng miễn phí, ghi chú thời gian giao, thứ tự hiển thị, bật/tắt               |
| Chọn khi thanh toán | `features/cart/rental-cart-panel.tsx`, `app/(rental)/checkout/page.tsx` | Chọn nhận tại cửa hàng hoặc giao hàng + khu vực; áp/bỏ mã ngay trên giỏ                   |
| Máy tính giá chung  | RPC `quote_booking()`, `preview_booking_quote()`                        | Server tự tính lại từ bảng giá; browser không gửi giá lên                                 |
| Tổng tiền đơn       | `orders.discount_vnd`, `orders.delivery_fee_vnd`, `orders.total_vnd`    | `total_vnd` là tiền thuê sau giảm + phí giao, **chưa gồm cọc**                            |
| Hiển thị            | Trang đơn, hoá đơn, thanh toán, hàng đợi staff, phiếu bàn giao          | Tách dòng giảm giá, phí giao, tổng thuê, cọc, tổng cộng                                   |
| Thanh toán          | `apply_sepay_payment()`                                                 | Ngưỡng `paid` dùng `deposit_vnd + total_vnd`                                              |
| Dữ liệu mẫu         | `supabase/seed.sql`                                                     | 3 khu vực (`Nội thành Hà Nội`, `Nội thành TP. Hồ Chí Minh`, `Ngoại thành / tỉnh lân cận`) |

## Mô hình dữ liệu

```text
discount_codes(id, code, description, kind, value, min_subtotal_vnd, max_uses,
               used_count, starts_on, ends_on, active)
discount_kind: percent | fixed

delivery_zones(id, name, fee_vnd, free_from_vnd, notes, sort_order, active)

orders + discount_code_id, discount_code, discount_vnd,
         delivery_zone_id, delivery_zone_name, delivery_fee_vnd,
         total_vnd = subtotal_vnd - discount_vnd + delivery_fee_vnd
```

- **Mã giảm giá và khu vực giao đều lưu bản chụp trên đơn** (`discount_code`, `delivery_zone_name`).
  Admin sửa hoặc tắt mã/khu vực sau đó không làm thay đổi hoá đơn cũ.
- **`discount_vnd` không vượt quá `subtotal_vnd`.** Mã số tiền cố định lớn hơn tiền thuê được kẹp
  lại; cọc vẫn giữ nguyên.
- **`total_vnd` là cột generated** để mọi truy vấn đọc cùng một công thức, tránh lệch giữa RPC và UI.
- **RLS:** khách chỉ đọc được khu vực đang bật; mã giảm giá không cấp SELECT cho `anon` và RLS chỉ cho
  admin. Admin ghi trực tiếp qua policy `current_app_role() = 'admin'`, không cần RPC riêng.

## Hợp đồng RPC

| RPC                                                                  | Quyền              | Hành vi                                                                      |
| -------------------------------------------------------------------- | ------------------ | ---------------------------------------------------------------------------- |
| `quote_booking(items, start, end, fulfillment, discount_code, zone)` | nội bộ             | Khoá sản phẩm và mã, tính tiền thuê/cọc/giảm/phí/tổng; đã revoke khỏi client |
| `preview_booking_quote(items, start, end, fulfillment, code, zone)`  | anon/authenticated | Trả toàn bộ báo giá (dòng giá, giảm, phí, tổng, cọc); mã yêu cầu đăng nhập   |
| `create_multi_product_booking(... , discount_code, zone)`            | authenticated      | Gọi `quote_booking`, ghi đơn + bản chụp mã/khu vực, tăng `used_count`        |
| `create_booking(... , discount_code, zone)`                          | authenticated      | Wrapper một sản phẩm, chuyển tiếp đủ hai tham số mới                         |

## Quyết định kỹ thuật

- **Một engine giá duy nhất.** `quote_booking()` là nguồn tính tiền; `preview_booking_quote()` gọi lại
  cùng logic nên con số khách thấy trước và con số ghi vào đơn không thể lệch nhau.
- **`quote_booking` khoá dòng mã bằng `for update`.** Hai đơn đồng thời không thể vượt `max_uses`;
  `used_count` chỉ tăng sau khi giữ đủ thiết bị, transaction rollback nếu hết máy.
- **Request hash của idempotency gồm mã và khu vực.** Dùng lại khoá với mã/khu vực khác bị từ chối thay
  vì trả nhầm đơn cũ.
- **Miễn phí giao tính sau giảm.** Đây là quy tắc kinh doanh đã chốt: mã càng lớn càng có thể làm mất
  ngưỡng miễn phí, nên UI hiển thị rõ phí và ngưỡng ngay dưới ô chọn khu vực.
- **Không giảm cọc.** Cọc là khoản hoàn lại, không phải doanh thu; giảm cọc sẽ làm sai nghĩa vụ hoàn
  tiền khi đơn kết thúc.
- **Lịch giao dùng ngày thuê + ghi chú khu vực.** Đơn giao hàng lấy ngày nhận thiết bị làm mốc giao;
  mỗi khu vực có ghi chú “giao trong ngày” hoặc “có thể chậm hơn một ngày”. Chưa đặt khung giờ giao
  theo phút.

## Kiểm thử

| Lệnh                                             | Kết quả hiện tại                                                                                                                           |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `npx supabase db reset` + `npx supabase test db` | **290/290 pass** (thêm `discounts_delivery.test.sql` plan 53, `chat_rate_limits.test.sql` plan 8, `academic_correctness.test.sql` plan 20) |
| `cd web && npm test`                             | **66/66 pass** (thêm chat, phân trang, xử lý lỗi và pricing)                                                                               |
| `cd web && npm run lint` / `typecheck`           | sạch                                                                                                                                       |
| `cd web && npm run build`                        | thành công, có `/admin/ma-giam-gia`, `/admin/khu-vuc-giao`                                                                                 |
| `node scripts/check-gd5-pricing.mjs`             | pass: preview server, mã sai, mã percent, miễn phí giao sau giảm, pickup không phí, tổng đơn trong DB, admin tạo mã, 390px                 |

## Giới hạn còn lại

- Chưa đặt khung giờ giao theo phút; khu vực chỉ có ghi chú thời gian tương đối.
- Mỗi đơn chỉ dùng một mã; chưa cộng dồn nhiều mã hoặc mã theo từng sản phẩm.
- Mã giảm giá chưa có màn hình thống kê doanh thu theo mã ngoài `used_count`.
- Chưa có lịch sử thay đổi mã/khu vực trong nhật ký admin.
