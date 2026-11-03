# Hồ sơ đồ án A.I.R

Phiên bản 1.0 · Ngày hoàn thiện 02/11/2026 · **Dự án học tập, không kinh doanh**

A.I.R là đồ án mô phỏng website thuê thiết bị công nghệ. Bộ hồ sơ này phục vụ tìm hiểu mã nguồn, trình diễn và đánh giá kết quả kỹ thuật. Không cung cấp dịch vụ thuê, nhận tiền hoặc xác lập hợp đồng với người xem demo. Tên thư mục `launch` được giữ để không làm hỏng liên kết cũ; không có nghĩa dự án đang ra mắt thương mại.

## Đọc theo thứ tự

1. [Báo cáo đồ án](PROJECT-REPORT.md): mục tiêu, phạm vi, yêu cầu, kiến trúc, dữ liệu và kết quả kiểm thử.
2. [Hướng dẫn sử dụng](USER-GUIDE.md): các vai trò và phân biệt demo giao diện với luồng Supabase.
3. [Hướng dẫn trình diễn](DEMO-GUIDE.md): chuẩn bị và các bước demo/đánh giá local.
4. [Quy tắc mô phỏng](POLICIES-README.md): năm chính sách dùng làm tình huống nghiệp vụ học tập.
5. [Hồ sơ thực hành](OPERATIONS-README.md): biểu mẫu, dữ liệu mẫu và checklist.
6. [Phạm vi nghiệm thu](DECISIONS.md) và [review độc lập](REVIEW.md).

## Những gì đã hoàn thiện

Bộ hồ sơ có báo cáo tổng quan, hướng dẫn người dùng, kịch bản demo, năm chính sách mô phỏng, phiếu giao nhận/đối soát/sự cố/khôi phục, bảng dữ liệu thực hành và tiêu chí đánh giá. Các dòng trống trong phiếu dùng để ghi kết quả của từng buổi thực hành, không phải điều kiện pháp lý còn thiếu.

Không cần tên doanh nghiệp, mã số thuế, VAT, máy cho thuê thật, tài khoản ngân hàng nhận tiền hay phê duyệt thương mại để hoàn thành phạm vi này. Không tự điền tên sinh viên, trường, giảng viên hoặc điểm đánh giá; có thể thêm thông tin đó vào hồ sơ cá nhân khi nộp.

## Cách dùng dữ liệu

Dùng dữ liệu giả lập và email thử nghiệm `@example.invalid` trên môi trường local. Không nhập căn cước, tài khoản ngân hàng, mật khẩu dùng ở nơi khác hoặc địa chỉ thật. Dữ liệu demo vẫn có thể được lưu trong trình duyệt hoặc Supabase local; không đồng nghĩa với không có lưu trữ. Chính sách mô phỏng không thay thế kiểm soát truy cập đang có trong mã.

## Tình trạng kỹ thuật

GĐ0–GĐ7 đã có kết quả nghiệm thu local được lưu trong repo. Lần hoàn thiện hồ sơ này không chạy lại các bài kiểm thử ứng dụng và không xác nhận hệ thống production. Tích hợp ngân hàng/SMS/AI trả phí không bắt buộc cho đồ án; GĐ8 tạm bỏ qua theo yêu cầu.

Các trang chính sách bên trong ứng dụng được đồng bộ thành năm kịch bản học tập. Trang chủ dẫn vào luồng Next.js; prototype localStorage được tách riêng tại `/demo`. Xem thêm [kịch bản bảo vệ và sơ đồ](DEFENSE-GUIDE.md) cùng báo cáo nghiệm thu đợt hoàn thiện để biết phiên bản đã kiểm thử.

## Gói bàn giao

ZIP chứa toàn bộ thư mục hồ sơ (Markdown/CSV) và các tài liệu kỹ thuật tham chiếu, giữ đường dẫn tương đối. Liên kết đến mã nguồn, script và ảnh bằng chứng cần mở trong repository. Chưa có bản Word/PDF được kiểm tra bố cục. Mở CSV bằng chế độ nhập UTF-8 nếu phần mềm bảng tính hiển thị sai dấu tiếng Việt.
