# Review độc lập GĐ 1 — 01/11/2026

**Kết luận:** chấp nhận phần kỹ thuật catalog GĐ 1 trong phạm vi preview đã thống nhất. Không còn phát hiện P0/P1/P2 chưa xử lý. Chưa nghiệm thu catalog fleet thật hoặc hệ thống đặt thuê production; các giới hạn dữ liệu, ảnh và Supabase đầy đủ vẫn được ghi rõ bên dưới.

## Phạm vi

Catalog SSR `/san-pham`, URL tìm kiếm/lọc/sắp xếp, trang chi tiết, metadata/canonical/Open Graph/JSON-LD, sitemap/robots, server public read bằng anon/RLS, migration bổ sung và sample seed. Đã đọc phần điều hướng từ demo, CSS, ảnh/ghi công và tests. Booking foundation là baseline của giai đoạn trước, không tính là chức năng mới của GĐ 1.

24 model có tài liệu đối chiếu tại `CATALOG-SOURCES.md`. Ba ảnh tham khảo Canon EOS R50, Sony a6400 và iPhone 16 Pro có nguồn, tác giả và giấy phép CC BY-SA 4.0; 21 model dùng placeholder. Thông số model không chứng minh cấu hình máy A.I.R sở hữu. Giá, cọc và unit vẫn là mẫu.

## Phát hiện đã xử lý

- **P1:** seed dùng giá dạng text trong `VALUES`; thêm cast bigint để insert đúng kiểu.
- **P2:** sample units không được book qua RPC cũ: seed đặt toàn bộ unit mẫu ở `maintenance`. Seed chạy lại không ghi đè sản phẩm đã chuyển thành dữ liệu thật hoặc trạng thái unit của sản phẩm đó.
- **P2:** tránh phát hành giá mẫu thành báo giá SEO: sản phẩm/list có sample đặt noindex, sản phẩm mẫu không có Offer JSON-LD, sitemap loại URL sản phẩm mẫu. JSON-LD escape các ký tự đóng script.
- **P2:** bỏ CTA giỏ demo trỏ nhầm trang chủ và lời dẫn kỹ thuật; catalog có header/footer riêng, giữ liên kết quay về demo rõ ràng. Catalog UUID không được đưa vào giỏ numeric hoặc đổi số lượng của demo.
- Từ chối cấu hình Supabase thiếu một nửa, lỗi HTTP/network/payload/row không hợp lệ; không fallback sample khi đã cấu hình backend. Production không cấu hình backend cũng fail closed.
- Mapper từ chối cấu hình lồng nhau không hỗ trợ; kiểm thử request anon, select công khai và dữ liệu lỗi. Sửa lỗi TypeScript trong test ghi nhận request.
- **P2:** parent phát hiện robots được tạo lúc build dùng origin cũ; route robots chuyển dynamic để đồng bộ origin runtime với canonical/sitemap.
- **P2:** kiểm tra ảnh mobile xác nhận CTA kế thừa fixed positioning của demo đã che tên/mô tả sản phẩm. Thêm override chỉ trong catalog để CTA trở về normal flow; sửa khoảng cách liên kết nguồn ở desktop. Bản build cuối đã được kiểm tra lại trên desktop và mobile, tên sản phẩm không còn bị che.

## Bằng chứng đã có

Reviewer đã chạy lại trên mã nguồn cuối: **15/15 tests**, `npm run typecheck`, `npm run lint` và `git diff --check` đều đạt. Người triển khai báo production build đạt; reviewer không chạy lại build khi parent đang kiểm tra server.

Reviewer đã gửi HTTP thật tới production server local cổng 3011 (backend PostgREST local):

- `?danh-muc=camera&sap-xep=gia-tang&q=sony`: HTTP 200, hai card nằm trong SSR HTML, noindex.
- `/san-pham/canon-eos-r50`: HTTP 200, `<h1>` sản phẩm nằm trong HTML, có JSON-LD và noindex, không có Offer giá mẫu.
- Slug không tồn tại: HTTP **404**, noindex.

Parent đã kiểm tra HTTP/browser trên build cuối: SSR đủ 24 card; query Sony trả hai sản phẩm đúng thứ tự giá; canonical/robots/sitemap cùng origin runtime; noindex và không có Offer cho sample; ảnh cùng ghi công hiển thị. Desktop và mobile 390px không tràn ngang, CTA ở normal flow phía sau nội dung, tiêu đề nhìn thấy và liên kết nguồn đủ khoảng cách. Reviewer cũng mở trực tiếp ảnh mobile chụp lại và xác nhận tiêu đề/CTA đã hết chồng lấn. Ảnh lưu tại `gd1-catalog-desktop.png`, `gd1-detail-desktop.png` và `gd1-detail-mobile.png`.

Parent chạy thêm production server với backend lỗi: trang hiển thị thông báo tải thất bại cùng nút thử lại, không có card/fallback và không lộ chi tiết backend. Kiểm tra demo cart vẫn giữ hành vi cũ, không có uncaught error. Build cuối do người triển khai thực thi đạt; parent nghiệm thu browser sau build đó.

Parent đã thực thi trên **PostgreSQL 16 trong Docker**, với auth fixture tối thiểu và default grants rộng để kiểm tra quyền. Đây là bằng chứng chạy SQL thực tế, không phải full Supabase stack:

- Booking migration và **34/34 pgTAP** đạt; catalog migration/seed và **9/9 pgTAP** đạt.
- Seed có 24 sản phẩm, 48 unit ở maintenance, 72 tier và 3 credit ảnh; chạy lại không nhân đôi. Kiểm tra collision giữ nguyên sản phẩm thật và trạng thái unit thật đạt.
- Anon đọc được active, không đọc được draft hoặc bảng physical units; sample không thể đặt thuê qua RPC.
- Bốn thử nghiệm đồng thời/rollback đạt: tranh unit cuối có một bên thắng; cùng key/cùng payload trả cùng đơn; cùng key/khác payload một bên lỗi; thiếu unit rollback toàn bộ.
- PostgREST local đọc và mapper nhận 24 row cùng 3 credit bằng public role.

Biên bản `BOOKING-REVIEW.md` ghi đúng hạn chế tại thời điểm review trước khi có database. Bằng chứng PostgreSQL trong biên bản GĐ 1 này bổ sung cho hạn chế lịch sử đó. Cấu hình dự án vẫn chọn PG15; chưa chạy nguyên stack Supabase/GoTrue/gateway/Storage hoặc database cloud.

## Giới hạn nghiệm thu

Chưa có fleet/giá/cọc được chủ dự án xác nhận, 21 ảnh sản phẩm còn thiếu, chưa upload Storage hoặc deploy. Đọc public REST local không thay thế kiểm thử full Supabase hoặc production. Catalog chỉ để tham khảo; auth session, giỏ nhiều sản phẩm và đặt thuê/thanh toán thật chưa mở. Xử lý máy trả trễ và tồn kho vận hành vẫn thuộc giai đoạn tiếp theo. Cần pagination khi catalog vượt giới hạn REST mặc định; hiện chỉ có 24 mẫu.
