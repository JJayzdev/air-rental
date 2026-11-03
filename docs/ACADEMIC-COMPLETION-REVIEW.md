# Rà soát đợt hoàn thiện đồ án A.I.R

Ngày bắt đầu: 02/11/2026. Phạm vi theo yêu cầu: hoàn thiện các phát hiện audit trong môi trường học tập/local, không triển khai kinh doanh hoặc bổ sung GĐ8. Reviewer chỉ sửa tài liệu này; việc triển khai do các tác giả thực hiện, nghiệm thu runtime do parent điều phối.

## Điều kiện nghiệm thu

| Hạng mục | Bằng chứng cần kiểm tra | Trạng thái |
| --- | --- | --- |
| Báo giá trước đặt thuê | Giá theo bậc ngày, mã giảm, phí giao và cọc cùng nguồn DB; kết quả cũ không dùng khi đầu vào đã đổi; trường hợp tier qua ngưỡng miễn phí giao | Đang triển khai |
| Ngừng sử dụng máy | Chặn trực tiếp ở DB với reservation/custody còn hiệu lực; không chỉ ẩn nút; hai thứ tự cạnh tranh booking/retire có kết quả an toàn | Đang triển khai |
| Danh sách đơn nhân viên | Phân trang/sắp xếp ổn định, tìm được đơn cũ còn cần xử lý, trạng thái lọc không làm mất điều hướng | Đang triển khai |
| Hành trình demo | Trang chủ/catalog và prototype phân biệt rõ; `/demo` không index; nhãn giả lập, chính sách và chat thống nhất với phạm vi học tập | Đang triển khai |
| Fixture local tái tạo được | Kiểm tra đúng project/repo/loopback trước ghi; ID và cleanup thuộc lần chạy; không reset hoặc ghi nhầm môi trường | Đang triển khai |
| CI database/browser | Thư mục làm việc đúng, Linux portable, dịch vụ ngoài tắt, không in/lưu secret; các assertion thực sự bao phủ phát hiện audit | Đang triển khai |
| Hồ sơ/bằng chứng | Phân biệt kiểm tra source, mock và runtime; tài liệu/ảnh/video không tuyên bố bước chưa làm; không có dữ liệu cá nhân hoặc secret | Đang triển khai |

## Phương pháp

Đọc độc lập nguồn ứng dụng, migration, kiểm thử và CI. Reviewer không chạy Docker, migration hoặc build song song với parent. Mỗi kết quả runtime sẽ ghi rõ người chạy và lệnh/bằng chứng; đọc source không thay thế việc xác minh race hoặc CI trên môi trường đích.

Chưa có kết luận nghiệm thu cho đợt triển khai này. Các phát hiện trước được ghi tại [ACADEMIC-AUDIT.md](ACADEMIC-AUDIT.md); điểm số học tập và việc triển khai dịch vụ thật không thuộc kết luận review.

## Phản hồi trong quá trình triển khai

Các điểm dưới đây đã được gửi tác giả; chỉ đóng sau khi đọc bản sửa và kiểm tra bằng chứng liên quan:

1. Guard trạng thái ban đầu chặn cả việc đưa máy về `available` khi có đơn xác nhận ở tương lai, làm hỏng luồng bảo trì không trùng lịch. Đã sửa thiết kế để kiểm tra live reservation khi nghỉ máy; đóng bảo trì được phép nếu record đã hoàn tất. Cần kiểm tra pgTAP/runtime.
2. Thay đổi trạng thái trực tiếp sang `maintenance` hoặc rời bảo trì có thể bỏ qua RPC. Guard đã bổ sung điều kiện record đang mở, cùng chặn nghỉ máy khi bảo trì chưa đóng. Cần kiểm tra trường hợp trực tiếp bằng role admin.
3. Báo giá cần giới hạn tổng giỏ 20 máy ở cả schema và RPC, không chỉ giới hạn từng dòng. Phải dùng hai product ID khác nhau trong regression để không nhầm với gộp dòng trùng sản phẩm.
4. Client cần xử lý server-action bị từ chối ở tầng mạng, xóa pending và không nhận kết quả cũ. Giá chưa có kết quả phải hiển thị đang chờ thay vì 0 đồng. Đã thấy handler lỗi và trạng thái chờ trong bản sửa; cần nghiệm thu giao diện.
5. Kiểm thử race phải chứng minh hai transaction chồng thời gian và có tranh chấp khóa thực, không chỉ gọi retirement sau khi booking đã commit. Chỉ hostname loopback chưa đủ xác minh đúng database dự án. Đang yêu cầu bổ sung guard môi trường và barrier xác định.
6. Danh sách phân trang phải dùng thứ tự ổn định, xử lý trang ngoài giới hạn và giữ bộ lọc trong liên kết. Bản source đã dùng `created_at`, `id` và trang trả về sau clamp; cần kiểm tra phản hồi thực của PostgREST với range ngoài dữ liệu.

Kiểm thử và fixture vẫn đang thay đổi. Chưa dùng số lượng assertion hoặc đọc source như bằng chứng rằng mọi regression đã đạt.
