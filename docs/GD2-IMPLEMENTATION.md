# GĐ2 — Luồng đặt thuê

## Đã triển khai

- Giỏ thuê UUID riêng với dữ liệu sản phẩm, số lượng và ngày thuê; không trộn với đơn numeric demo.
- Lịch khả dụng cho cả giỏ và toàn bộ khoảng ngày, kèm buffer. UI hiện chọn ngày từ danh sách trong
  63 ngày tới; chưa có lịch tháng dạng lưới.
- Đăng nhập bằng email magic link Supabase, cookie HttpOnly và xác minh người dùng trên server.
- Checkout nhiều sản phẩm qua một RPC transaction duy nhất. Database quyết định giá, tiền cọc, máy
  cấp phát và trạng thái; cùng idempotency key chỉ phát lại payload ban đầu.
- Khách hàng xem/hủy đơn của mình. Staff/admin xem đơn, asset tag được cấp, xác nhận, hủy, bàn giao,
  nhận trả, đánh dấu quá hạn/hoàn tất và giải phóng yêu cầu giữ máy hết hạn.
- Giỏ được lưu bằng localStorage có schema validation, không dùng Zustand. Mã yêu cầu phục hồi được
  giữ trong sessionStorage; thông tin liên hệ không lưu trong storage. Nếu yêu cầu có thể đã hoàn tất,
  UI hướng dẫn kiểm tra danh sách đơn trước khi gửi lại.
- Sản phẩm SAMPLE và các unit mẫu bị chặn khỏi checkout; unit seed ở trạng thái bảo trì.

## Kiểm chứng

Migration và seed đã chạy trong Supabase local đầy đủ với PostgreSQL 15, Auth, PostgREST và Mailpit.
Parent đã chạy 92/92 pgTAP assertions và 6/6 bài concurrency độc lập, gồm cấp phát cạnh tranh, replay
idempotency, rollback giỏ thiếu hàng, phân quyền, hết hạn và vòng đời trả trễ. Production build local
và bài trình duyệt cũng đạt, gồm đăng nhập thật, checkout, quyền riêng tư, phục hồi khi mất phản hồi,
vòng đời staff, đăng xuất và giỏ lỗi. Chi tiết tại `GD2-INTEGRATION.md` và `GD2-REVIEW.md`.

Chạy local theo [`GD2-LOCAL.md`](GD2-LOCAL.md). Chạy `npm test`, `npm run typecheck` và `npm run lint`
trong `web/` để kiểm tra domain/UI.

## Chưa sẵn sàng pilot

- Catalog, giá, cọc và unit hiện là dữ liệu SAMPLE; cần xác nhận tồn kho và cấu hình từng máy thật.
- Gửi email/SMS xác nhận đơn chưa tích hợp nhà cung cấp. Magic link chỉ xác thực đăng nhập, không phải
  thông báo đặt thuê.
- Thanh toán online, đối soát, quy trình hoàn cọc, điều khoản thuê và vận hành giao nhận chưa triển khai.
- Kiểm chứng local không phải xác nhận project Supabase live hay chạy production.
