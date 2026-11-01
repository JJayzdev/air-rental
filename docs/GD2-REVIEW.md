# Review độc lập GĐ 2 — 01/11/2026

**Kết luận:** chấp nhận phần lõi đặt thuê GĐ 2 trong môi trường local đã thống nhất. Không còn phát hiện P0/P1/P2 chưa xử lý sau vòng sửa và kiểm tra cuối. Đây chưa phải nghiệm thu hệ thống kinh doanh production hoặc xác nhận hàng/giá/thông báo thật.

## Phạm vi

Booking nhiều sản phẩm trong một transaction, lịch đủ máy cho toàn bộ khoảng thuê, giỏ UUID lưu trên trình duyệt, checkout có retry key, Supabase Auth qua email, đơn theo tài khoản và thao tác nhân viên tối thiểu. GĐ 1 và booking foundation là baseline, không tính lại thành chức năng mới.

## Các phát hiện đã sửa và kiểm tra lại

- **P1 — tồn kho vật lý:** mở rộng reservation quá hạn thành vô hạn có thể va vào đơn tương lai đã giữ máy; đơn active trả trễ cũng có thể trở lại khả dụng nếu chưa đổi trạng thái. Giữ nguyên khoảng hợp đồng, kiểm tra custody riêng, thêm `ready_on` theo ngày trả thực tế và cleanup. Giao máy phải khóa unit theo thứ tự, kiểm tra tình trạng, ngày hợp đồng và mọi đơn khác còn giữ máy.
- **P1 — tiền:** subtotal và order_items từng đọc lại price tiers ở hai lượt khác nhau. Dùng một snapshot giá tin cậy cho cả tổng đơn và từng máy.
- **P1 — retry:** UUID tự đổi khi nhập lại thông tin sau lỗi mất phản hồi có thể tạo đơn trùng. Giữ một key qua reload; payload giống replay đơn cũ, payload khác phải kiểm tra đơn trước rồi xác nhận rõ ý định tạo yêu cầu mới. Không lưu contact PII chỉ để phục hồi retry.
- **P1 — phục hồi đơn:** lỗi backend không được biến thành danh sách rỗng hoặc 404 giả; nếu không, khách có thể hiểu nhầm chưa có đơn rồi gửi lại. Query lỗi phải hiển thị trạng thái tải thất bại.
- **P1/P2 — Auth:** sửa refresh cookie bị mất các chunk, redirect nội bộ chống backslash/control characters, kiểm chứng user phía server và role từ database, không tin role/user_id từ form.
- **P2 — giỏ và form:** giới hạn tổng 20 máy cả khi tăng dòng đã có; không crash vì storage hỏng/bị chặn hoặc ngày đảo; đọc đúng contact/fulfillment từ form và không báo thêm/hủy thành công khi thao tác thất bại.
- **P2 — lịch sử và nhân viên:** snapshot tên model tránh đổi theo catalog; My Orders lọc owner ngay cả với staff; nhân viên cần biết asset tag được cấp và đường dẫn thao tác phù hợp. Chi tiết kho không được đưa vào dữ liệu công khai hoặc trang khách hàng.
- **P2 — trạng thái rõ ràng:** hiển thị deadline/hold đã hết hạn, chặn nút xác nhận hết hạn, thao tác staff giải phóng hold, sign-out và noindex các trang riêng tư. Thông báo email/SMS xác nhận đơn chưa cấu hình được nói rõ trên receipt.

## Bằng chứng database

Parent đã chạy trên **Supabase local thật của project `air-rental`**, PostgreSQL 15, Auth, PostgREST và Mailpit. Đây là bước tiến so với fixture Auth tối thiểu dùng ở GĐ 1:

- Toàn bộ pgTAP **92/92** đạt: booking 34, catalog 9, multi-product 49.
- **6/6** thử nghiệm hai kết nối đạt sau migrations cuối: tranh unit cuối, replay cùng key với cart đảo thứ tự, cùng key khác payload, rollback toàn bộ khi một dòng thiếu máy, privacy/cancel khác owner, expiry đấu với confirm.
- Review tĩnh migrations 003/004: canonical cart/hash, advisory lock, giá snapshot, exclusion constraint, release giữ lịch sử, cùng quy tắc calendar/allocation, custody/cleanup và snapshot tên. Không phát hiện blocker database còn lại.
- Script concurrency kiểm tra project/workdir trước khi đụng dữ liệu, tạo UUID ngẫu nhiên và chỉ dọn fixture của chính nó. Reviewer không thay đổi Docker hoặc database của dự án khác.

## Bằng chứng web

Reviewer đã chạy độc lập **23/23 Node tests**, `npm run typecheck`, `npm run lint` và `git diff --check`: đều đạt. Đã đọc lại phần sửa nhỏ cuối về storage, phân loại kết quả không chắc chắn, role/expiry và dữ liệu máy chỉ dành cho staff. Người triển khai báo các kiểm tra cuối cũng đạt.

Parent build production cuối đạt và chạy `scripts/check-gd2-browser.mjs` **exit 0** trên chính build đó:

- Catalog sample không có nút đặt; giỏ hai sản phẩm, số lượng/ngày lưu qua reload; đăng nhập email PKCE và session cookie thật; tổng tiền/cọc lấy từ database và receipt có noindex.
- Desktop/mobile 390px không tràn ngang; tên máy, tiền, thông tin nhận và thao tác nhìn thấy. Timeline được sửa khoảng cách và chụp lại. Reviewer mở trực tiếp ảnh mobile cuối và xác nhận nội dung không chồng lấn.
- Khách thứ hai không thấy PII đơn thứ nhất hoặc workspace staff; chủ đơn hủy được và giải phóng toàn bộ hold. Staff thấy asset tag, đi hết confirm/handover/active/return/completed và `ready_on` được cập nhật theo cleanup thực tế.
- Cố ý bỏ phản hồi POST **sau commit**: reload giữ nguyên key, nhập lại không đổi key, khách mở danh sách đơn và phục hồi đúng một đơn. Đây là bằng chứng recovery bằng kiểm tra đơn; replay RPC cùng key được kiểm tra riêng trong SQL/concurrency.
- Đăng xuất bảo vệ lại route owner; JSON storage hỏng được cài trước hydration và phục hồi an toàn; không có uncaught error ngoài lỗi network cố ý tạo; giỏ demo numeric không bị đổi.

Các lỗi harness thời điểm inject storage/chờ redirect đã được sửa. Cache catalog 300 giây được làm mới bằng cờ `-FreshCatalog` trước khi chạy lại fixture UUID mới; không cần thay đổi cơ chế cache của ứng dụng. Script chỉ xóa fetch cache được sinh trong workspace sau khi kiểm tra đường dẫn và preview đã dừng.

Ảnh cuối: `gd2-order-desktop.png`, `gd2-order-mobile.png`, `gd2-staff-desktop.png`. Browser chạy trong context mới, không dùng phiên đăng nhập của ứng dụng khác.

## Giới hạn phải giữ rõ

Chưa deploy hoặc xác nhận trên project Supabase cloud. Catalog/fleet, giá/cọc và ảnh máy thật vẫn cần chủ dự án xác nhận; sample không được đặt thuê. Auth email trong Mailpit không chứng minh email xác nhận đơn hoặc SMS/Zalo đã gửi. Thanh toán trực tuyến, vận chuyển/đối soát và thông báo qua provider chưa được nghiệm thu.

Bộ chọn ngày liệt kê ngày đủ máy trong cửa sổ 63 ngày; đây chưa phải giao diện lịch tháng đầy đủ. Retry giữ key trong sessionStorage, không lưu contact PII; khách phải nhập lại đúng thông tin để replay hoặc kiểm tra đơn trước khi xác nhận bắt đầu yêu cầu mới. Hold hết hạn được xử lý trong cấp phát mới hoặc thao tác staff; chưa xác nhận scheduler production. Quy trình xử lý đơn tương lai bị ảnh hưởng bởi máy trả trễ vẫn cần nhân viên giải quyết; không tự hủy hay thay máy của khách một cách im lặng.
