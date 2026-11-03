# Hủy, hoàn tiền và tiền cọc — kịch bản mô phỏng của đồ án

> **TÀI LIỆU HỌC TẬP.** Không có tiền thật được nhận hay hoàn. “Tiền cọc”, “thanh toán” và “hoàn tiền” dưới đây là nhãn/khoản tính thử trong cơ sở dữ liệu local.

## 1. Hủy yêu cầu thuê

Trong tình huống lớp học, việc dừng một yêu cầu giả lập không phát sinh khoản phí hay khoản phạt. Nếu đơn còn ở trạng thái chờ và ứng dụng hiện nút **Hủy**, khách có thể dùng nút đó; đây là hành vi đang có trong luồng local. Nếu nút không hiển thị do trạng thái hoặc quyền tài khoản, ghi nhận sai khác và dừng diễn tập mà không sửa trực tiếp database. Chỉ dùng thao tác hủy khi code cho phép trạng thái đó; không ép chuyển trạng thái.

Sau khi ứng dụng chấp nhận thao tác hủy, người học kiểm tra rằng đơn được đánh dấu đã hủy và lịch giữ máy test được giải phóng theo quy tắc của hệ thống. Thao tác chỉ thay đổi dữ liệu thử. Không gửi thư/hồ sơ hủy tới một nhà cung cấp thật.

## 2. Tiền thuê và cọc trong kịch bản

Các con số tiền thuê, mã giảm, phí giao, tiền cọc và số tiền đã nhận trong database đều là số liệu fixture. Ứng dụng tách tiền thuê và tiền cọc để minh họa cách tính/ghi sổ. Không có khoản nào là giá bán thật hay khoản người học phải trả.

Nếu đơn test có trạng thái mock-paid, sự kiện thanh toán được tạo bằng webhook local hoặc fixture. Nó không phải chứng từ ngân hàng. Không nhập mã đơn test vào nội dung chuyển khoản thật hoặc dùng thông tin ngân hàng giả lập ngoài bài kiểm thử.

## 3. Hoàn cọc giả lập

Quy tắc của tình huống đồ án: sau khi checklist trả thiết bị được đối chiếu, nhóm đánh dấu **hoàn lại toàn bộ khoản cọc giả lập**. Kịch bản mẫu giả định máy và phụ kiện được trả đủ, không phát hiện hư hỏng mới; vì vậy không có khấu trừ. Đây là lựa chọn sư phạm để minh họa trạng thái hoàn cọc, không phải quyền thu/hoàn tiền trong một dịch vụ thật.

Trong code local, khi đơn hoàn tất và có khoản cọc thực thu đủ điều kiện, hệ thống có thể tạo mục hoàn cọc chờ xử lý; nhân viên phải xác nhận thao tác hoàn. Đây chỉ là ledger và trạng thái test: đánh dấu hoàn tất không thực hiện lệnh chuyển ngân hàng. Môi trường local acceptance dùng tài khoản giả lập, chưa nối ngân hàng/SePay thật.

Để hoàn tất bài kiểm tra, nhóm ghi lại mã đơn fixture, khoản cọc mock trước và sau, kết quả checklist, thời điểm đánh dấu `refund_pending`/`refunded` và người thao tác test. Không ghi thông tin ngân hàng thật. Nếu database chưa tạo mục hoàn như mong đợi, báo đó là sai khác chức năng; không tự sửa khoản tiền bằng cách nhập lệnh ngân hàng.

## 4. Đối soát giao dịch giả lập

Các trường hợp chuyển thiếu/thừa, sai nội dung, replay hoặc đơn hết hạn có thể được tái tạo bằng fixture riêng. Mục tiêu là kiểm tra phần mềm giữ một sổ giao dịch nhất quán và xử lý replay an toàn. Không tạo giao dịch ngân hàng thật để thử các trường hợp này.

Nếu bản trình diễn có phản hồi “đã thanh toán” hoặc “đã hoàn”, người xem cần hiểu đó là trạng thái hệ thống thử. Chỉ ghi kết quả kiểm thử trong báo cáo đồ án. Các file fixture và log nên dùng dữ liệu tổng hợp và được dọn theo hướng dẫn riêng của repo.

## 5. Không có phí hay thời hạn giao dịch thật

Kịch bản không đặt phí hủy, phí hoàn, phí ngân hàng hoặc thời gian tiền về tài khoản vì không có giao dịch ngoài đời. Số ngày hay số tiền xuất hiện trong test là dữ liệu thử, không được dùng để quảng bá chính sách hoàn “trong X ngày”.

## 6. Quyền của người tham gia đồ án

Người học có thể dừng phiên diễn tập mà không mất tiền và không ảnh hưởng quyền học tập. Nếu bản demo hiển thị nhầm trạng thái hoặc đưa ra chỉ dẫn chuyển khoản, không thực hiện giao dịch; ghi nhận lỗi trong kênh quản lý bài tập. Các quyền pháp lý của người tiêu dùng trong giao dịch thật không được mô phỏng hay loại trừ bởi tài liệu này.

Đọc thêm: [Điều khoản thuê mô phỏng](rental-terms.md), [Checklist giao nhận](delivery-return-inspection-damage.md) và [Tiếp nhận khiếu nại](complaints.md).
