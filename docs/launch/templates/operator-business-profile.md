# Phiếu thông tin đồ án / lớp / nhóm

> Tên file được giữ để tương thích với liên kết cũ. Phiếu này không phải hồ sơ doanh nghiệp. Điền
> theo thông tin lớp học đã công bố; dùng mã người học thay tên nếu yêu cầu riêng tư của lớp.

| Trường | Thông tin điền trong lớp |
|---|---|
| Tên học phần / mã môn |  |
| Tên đề tài | A.I.R — đồ án mô phỏng cho thuê thiết bị |
| Học kỳ / lớp |  |
| Nhóm / mã nhóm |  |
| Thành viên (tên hoặc mã theo quy định lớp) |  |
| Giảng viên / người hướng dẫn |  |
| Người chấm / hội đồng |  |
| Ngày demo |  |
| Commit / phiên bản trình bày |  |
| Mục tiêu học tập | Trình bày website mô phỏng cho thuê thiết bị công nghệ; giải thích catalog mẫu, luồng giao diện, kiến trúc Next.js/Supabase, ranh giới auth/RLS và giới hạn giữa demo UI với luồng backend có fixture. Đánh giá khả năng dùng, an toàn dữ liệu và cách kiểm thử mà không nhận giao dịch thật. |
| Ngoài phạm vi bài | Không phải dịch vụ cho thuê thật; không đại diện inventory/tài sản sở hữu; không thu khách hàng thật; không xác nhận giá/cọc hay chính sách; không có thanh toán, SMS/email hoặc webhook ra dịch vụ thật; demo catalog sample không tạo được đơn. |

## Giả định mô hình hóa

| Chủ đề | Giả định của nhóm | Hư cấu / chưa kiểm chứng? | Cách trình bày để tránh nhầm là sự thật |
|---|---|---|---|
| Thiết bị / kho | `DEMO-UNIT-001`, laptop giả lập; không có thiết bị vật lý. Catalog `SAMPLE` của ứng dụng cũng là nội dung tham khảo, không phải hàng sẵn sàng. | Có; không phải tài sản thật và không được nạp database. | Nêu nhãn hư cấu khi demo; sample product không bookable. |
| Giá / tiền cọc | CSV ví dụ dùng 350.000 VND/ngày và 500.000 VND cọc để minh họa cấu trúc dữ liệu. | Có; số giả lập cho bài tập, không phải báo giá/chính sách. | Ghi “giả lập” bên cạnh số liệu; không tạo hóa đơn hoặc yêu cầu tiền. |
| Hình ảnh / nguồn | `DEMO-PHOTO-NOT-A-DEVICE`; placeholder không phải ảnh thiết bị. | Có; không mô tả tài sản thật, không dùng làm quảng cáo. | Dùng mã tham chiếu placeholder; không gán cho asset tag thật. |
| Danh tính / tài khoản | `DEMO-STUDENT-001` hoặc user fixture do bài local tạo. | Có; không phải người dùng khách hàng. | Không nhập PII; không dùng tài khoản cá nhân. |
| Quy tắc đặt/hủy | Kịch bản ngày thuê/trạng thái chỉ dùng để thảo luận domain và kiểm thử fixture. | Có; không xác lập điều khoản thuê/hủy/hoàn tiền áp dụng ngoài đồ án. | Phân biệt logic phần mềm với chính sách vận hành thật. |
| Thanh toán/thông báo | Demo mặc định không phát sinh giao dịch; script GD7 có mock-payment local khi chạy fixture được chọn riêng. | Có; không gọi ngân hàng/provider và không gửi thông báo ra ngoài. | Nếu thực hành integration, ghi rõ local fixture/mock; không gọi là thanh toán thật. |

## Phân công học tập

| Thành viên/mã | Phần phụ trách | Bằng chứng đóng góp | Người xác nhận trong lớp |
|---|---|---|---|
|  |  |  |  |
