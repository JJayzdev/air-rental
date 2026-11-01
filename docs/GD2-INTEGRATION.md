# GĐ2 — kiểm chứng tích hợp của agent nghiệm thu

Trạng thái: kiểm chứng tích hợp local đã đạt; biên bản review độc lập tại `GD2-REVIEW.md`.

## Môi trường

- Supabase CLI 2.122.0, project `air-rental`, PostgreSQL image 15.19.0.007.
- GoTrue v2.197.0, PostgREST v16.5 và Mailpit v1.31.3 local.
- Container database `supabase_db_air-rental` có nhãn project và workdir trỏ đúng
  repository A.I.R. Không kết nối container hoặc volume của project khác.
- Migration chạy trên auth schema và roles thực của Supabase, không dùng auth
  fixture giả lập như một phần kiểm tra GĐ1.

## Bằng chứng đã có

- API health xác nhận GoTrue, catalog REST trả 24 sản phẩm và cả 24 là mẫu.
- Thử OTP đến địa chỉ `@example.invalid`: nhận được liên kết xác minh trong
  hộp thư local, không gửi thư ra ngoài.
- `node scripts/check-booking-concurrency.mjs`: 6/6 đạt với hai phiên PostgreSQL
  độc lập. Kiểm tra máy cuối cùng, replay cùng key và đảo thứ tự món, khác payload
  cùng key, rollback toàn bộ giỏ khi thiếu một món, người khác không đọc/hủy được
  đơn, và tranh chấp hết hạn/xác nhận. Script dọn riêng dữ liệu thử sau mỗi lần.
- Sau khi tạo lại database local từ migration cuối, parent chạy
  `npx supabase test db`: 92/92 assertions đạt (34 booking foundation, 9 catalog,
  49 multi-product). Các trường hợp mới bao gồm mẫu không đặt được, khoảng thuê
  liên tục, trả trễ với lịch tương lai đã có, ngày sẵn sàng sau trả máy và chặn
  bàn giao ngoài thời gian hợp lệ và tên sản phẩm lịch sử không đổi sau sửa/ẩn
  catalog. Sáu bài concurrency cũng đạt sau migration 004.

## Kết quả trình duyệt trên production build local

- Build thành công, chỉ còn cảnh báo Autoprefixer `start/end` có sẵn trong CSS cũ.
- `node scripts/check-gd2-browser.mjs` hoàn tất với exit code 0.
- Catalog → giỏ hai sản phẩm → lưu ngày qua reload → email magic link trong
  Mailpit → PKCE/cookie thật → checkout → đơn có giá/cọc và hai máy đúng DB.
- Trang đơn có noindex; khách thứ hai không xem được PII hoặc trang nhân viên.
- Khách hủy đơn giải phóng cả hai máy. Nhân viên thấy mã máy được cấp và hoàn tất
  chuỗi xác nhận/bàn giao/đang thuê/nhận trả/hoàn tất; ngày sẵn sàng có buffer.
- Cố ý chặn phản hồi POST sau khi backend đã commit: reload giữ nguyên key,
  nhập lại liên hệ không đổi key, tìm lại được đúng một đơn qua danh sách của tôi.
- Đăng xuất bảo vệ lại trang đơn; JSON giỏ hỏng trước hydration được phục hồi.
- Không có lỗi JavaScript không được xử lý, ngoài lỗi mạng cố ý tạo trong bài thử.
  Giỏ demo `air-cart` vẫn giữ nguyên; receipt không chứa mã máy nội bộ.
- Parent xem trực tiếp ảnh desktop/staff/mobile 390px; không tràn ngang, tiêu đề
  không bị che, dòng lịch sử có khoảng cách rõ ràng.

Ảnh: `gd2-order-desktop.png`, `gd2-order-mobile.png`, `gd2-staff-desktop.png`.

Hai lỗi ở harness ban đầu đã được sửa: chèn JSON hỏng bằng init script trước khi
React đọc storage, và đợi chuyển trang đăng xuất trước lần truy cập bảo vệ tiếp
theo. Chạy lại ngay cần làm mới fetch cache vì fixture UUID thay đổi; xem
`GD2-LOCAL.md`. Không sửa logic ứng dụng để bỏ qua cache hoặc các kiểm tra quyền.

Sau kiểm thử: kiểm tra DB cho kết quả 0 đơn, 0 tài khoản thử và 0 sản phẩm không
phải SAMPLE. Chỉ 24 sản phẩm mẫu ban đầu được giữ lại.

Không coi việc kiểm thử local là xác nhận thiết bị, giá, SMTP production, Zalo/SMS
hoặc triển khai cloud đã sẵn sàng.
