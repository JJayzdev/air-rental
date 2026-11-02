# GĐ 5 — Admin (đợt A: vận hành, kho, bảo trì)

**Trạng thái:** xong đợt A ngày 02/11/2026, nghiệm thu local. Đợt B (mã giảm giá, phí giao theo khu
vực) chưa bắt đầu.

GĐ 5 được tách làm hai đợt để không trộn phần vận hành nội bộ với phần thay đổi giá/đơn hàng:

- **Đợt A (tài liệu này):** dashboard, quản lý sản phẩm, kho thiết bị, lịch bảo trì, nhật ký thao
  tác, phiếu bàn giao in được.
- **Đợt B:** mã giảm giá, phí giao theo khu vực, lịch giao — sẽ sửa `create_multi_product_booking`
  và bảng giá.

## Phạm vi đã làm

| Hạng mục         | Nơi triển khai                                                                       | Ghi chú                                                                                                                    |
| ---------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| Dashboard        | `app/(rental)/admin/page.tsx`, RPC `admin_dashboard()`                               | Đơn chờ, đã xác nhận, đang thuê, quá hạn, cọc chờ hoàn, doanh thu/hoàn tiền tháng, máy sẵn sàng/bảo trì, giấy tờ chờ duyệt |
| Quản lý sản phẩm | `app/(rental)/admin/san-pham`, `features/admin/actions.ts`                           | Admin tạo/sửa sản phẩm qua RLS sẵn có; `revalidateTag('catalog')` sau khi lưu                                              |
| Kho thiết bị     | `app/(rental)/admin/kho`                                                             | Admin thêm máy, ngừng dùng / đưa lại vào kho; chuyển sang bảo trì phải qua RPC                                             |
| Lịch bảo trì     | `app/(rental)/admin/bao-tri`, RPC `open_unit_maintenance` / `close_unit_maintenance` | Máy bị rút khỏi lịch cho thuê; chặn trùng đơn đã giữ máy                                                                   |
| Nhật ký thao tác | `app/(rental)/admin/nhat-ky`                                                         | 100 thay đổi trạng thái đơn gần nhất từ `order_events`                                                                     |
| Phiếu bàn giao   | `app/(rental)/quan-ly-don/[id]/phieu-ban-giao`                                       | In bằng trình duyệt, có mã máy và ô ký; link từ hàng đợi staff                                                             |
| Điều hướng       | `app/(rental)/layout.tsx`                                                            | Link “Quản trị” cho staff/admin; `/admin` thay cho redirect cũ sang `/quan-ly-don`                                         |

## Mô hình dữ liệu

```text
unit_maintenance(id, unit_id, reason, notes, started_on, expected_end_on, completed_on, created_by)
maintenance_reason: scheduled | repair | inspection
product_units.state: available | maintenance | retired
```

- **Bảo trì là bảng riêng, không nhét lịch sử vào `product_units`.** Một máy có nhiều phiếu theo thời
  gian; chỉ một phiếu được mở (`completed_on is null`) tại một thời điểm, đảm bảo bằng kiểm tra trong
  RPC và index từng phần.
- **`open_unit_maintenance`** khoá dòng máy, từ chối máy `retired`, từ chối phiếu thứ hai, từ chối
  khoảng bảo trì giao với reservation còn hiệu lực (`pending`/`confirmed`), rồi đặt
  `state = 'maintenance'` và `ready_on = greatest(ready_on, expected_end_on)`.
- **`close_unit_maintenance`** ghi `completed_on`, trả máy về `available` và đẩy `ready_on` tới ngày
  hoàn tất; không đóng được phiếu đã đóng.
- **Khách không đọc được `unit_maintenance`.** Chỉ `authenticated` có SELECT, và RLS giới hạn
  staff/admin. Không cấp INSERT/UPDATE/DELETE cho client — mọi thay đổi đi qua RPC security definer.
- **Sản phẩm/kho dùng RLS sẵn có.** `products` và `product_units` đã có policy “admin manage”; GĐ 5 chỉ
  cấp thêm `INSERT/UPDATE` cho `authenticated`, nên staff vẫn chỉ đọc. Staff UPDATE sản phẩm khớp 0
  dòng thay vì báo lỗi — UI không cho staff mở trang.

## Hợp đồng RPC

| RPC                                                           | Quyền       | Hành vi                                                                                                  |
| ------------------------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------- |
| `admin_dashboard()`                                           | staff/admin | Trả một dòng số liệu; doanh thu/hoàn tiền tính từ đầu tháng theo giờ Việt Nam, chỉ giao dịch `succeeded` |
| `open_unit_maintenance(unit, reason, expected_end_on, notes)` | staff/admin | Trả bản ghi vừa tạo; lỗi `P0001` với thông điệp cụ thể khi trùng lịch/phiếu/ngày                         |
| `close_unit_maintenance(id, completed_on?)`                   | staff/admin | Mặc định hoàn tất hôm nay; trả bản ghi đã đóng                                                           |

## Quyết định kỹ thuật

- **Dashboard dùng một RPC thay vì nhiều truy vấn rời.** Một lần gọi giữ số liệu nhất quán tại cùng
  thời điểm và không lộ bảng `payments`/`identity_document_requests` cho phía client.
- **Doanh thu chỉ đếm tiền vào đã nhận.** Chuyển khoản đang chờ hoặc hoàn cọc không được tính là doanh
  thu; hoàn tiền hiển thị riêng để đối chiếu.
- **Bảo trì không tự động đóng.** Giống hoàn cọc ở GĐ 4: hệ thống ghi nhận ý định, staff xác nhận khi
  máy thực sự xong.
- **Catalog có tag `'catalog'`.** Trang bán dùng `fetch(..., { next: { revalidate: 300, tags: ['catalog'] } })`;
  server action của admin gọi `revalidateTag('catalog')` nên sửa giá/tên hiện ngay, không phải chờ 5
  phút.
- **Phiếu bàn giao là bản in trình duyệt**, cùng cách làm hoá đơn GĐ 4; `@media print` ẩn header/footer
  và nút.
- **Nhật ký đọc thẳng `order_events`.** Chưa có bảng audit riêng cho thao tác admin; các thay đổi
  sản phẩm/kho hiện không được ghi log (xem giới hạn).

## Kiểm thử

| Lệnh                                             | Kết quả hiện tại                                                                                                                    |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| `npx supabase db reset` + `npx supabase test db` | **209/209 pass** (thêm `admin.test.sql`, plan 38)                                                                                   |
| `cd web && npm test`                             | **39/39 pass** (thêm `features/admin/admin-schema.test.ts`)                                                                         |
| `cd web && npm run lint` / `typecheck`           | sạch                                                                                                                                |
| `cd web && npm run build`                        | thành công, có `/admin`, `/admin/san-pham`, `/admin/kho`, `/admin/bao-tri`, `/admin/nhat-ky`, `/quan-ly-don/[id]/phieu-ban-giao`    |
| `node scripts/check-gd5-admin.mjs`               | pass: dashboard, tạo sản phẩm + catalog revalidate, thêm/ngừng máy, mở/đóng bảo trì, phiếu bàn giao, chặn staff sửa sản phẩm, 390px |

## Giới hạn còn lại

- Chưa có mã giảm giá, phí giao theo khu vực, lịch giao (đợt B).
- Chưa có audit log cho thao tác sản phẩm/kho/bảo trì; nhật ký hiện chỉ đọc `order_events`.
- Ảnh sản phẩm vẫn sửa bằng seed/migration; form admin chưa upload ảnh.
- Dashboard tính doanh thu theo `payments.created_at`, chưa có báo cáo theo ngày/tuần hay xuất CSV.
- Chưa phân quyền chi tiết hơn staff/admin (ví dụ chỉ quản lý kho được bảo trì).
