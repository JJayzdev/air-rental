# Tiếp nhận và xử lý phản ánh — kịch bản mô phỏng của đồ án

> **TÀI LIỆU HỌC TẬP.** A.I.R không có trung tâm hỗ trợ khách hàng. Phần này mô phỏng cách một nhóm có thể ghi nhận lỗi và phản hồi người tham gia trong bài tập; không tạo SLA, cam kết dịch vụ hay kênh khiếu nại thương mại.

## 1. Điều gì nên được phản ánh

Trong quá trình dùng demo, người học có thể phản ánh lỗi trang, dữ liệu mẫu không khớp, trạng thái đơn test sai, cách tính giá mẫu không nhất quán, lỗi kiểm thử phân quyền hoặc nội dung chính sách khó hiểu. Đây là phản ánh về đồ án, không phải khiếu nại hợp đồng thuê. Không có khoản thu, cọc hoặc quyền lợi giao hàng thật cần yêu cầu bồi hoàn.

## 2. Cách gửi phản ánh trong lớp

Gửi issue theo kênh nộp bài/trao đổi mà giảng viên đã dùng cho lớp. Nêu tiêu đề, trang hoặc bước gặp lỗi, kết quả mong đợi, kết quả thực tế, trình duyệt/môi trường local nếu biết và ảnh chụp đã loại bỏ dữ liệu riêng tư. Nếu có mã đơn, chỉ dùng ID fixture tổng hợp. Không đính kèm `.env`, khóa API, database dump, thông tin đăng nhập, ảnh giấy tờ hoặc dữ liệu của người khác.

Ứng dụng hiện không có biểu mẫu xử lý khiếu nại khách hàng thật. Chat assistant chỉ dùng cho câu hỏi demo; không phải nơi xin hủy giao dịch, gửi yêu cầu dữ liệu hoặc nhận phản ánh có người trực xử lý.

## 3. Quy trình xử lý của nhóm đồ án

1. **Ghi nhận:** thành viên nhận issue tạo mục theo dõi, đánh dấu chủ đề (UI, dữ liệu, luồng đơn, thanh toán giả lập, quyền truy cập, nội dung hoặc quyền riêng tư) và xác nhận đây là môi trường demo.
2. **Phân loại:** nếu có nguy cơ lộ khóa, thông tin cá nhân hoặc endpoint thật, không sao chép thêm dữ liệu vào issue; ẩn nội dung nếu có thể và báo người phụ trách đồ án qua kênh lớp.
3. **Tái hiện:** dùng fixture tổng hợp trên local. Không dùng tài khoản, thiết bị hoặc tiền thật để xác minh lỗi.
4. **Phản hồi:** nhóm ghi bước tiếp theo hoặc kết quả tái hiện trong cùng issue để người học theo dõi. Đây là hoạt động lớp học, không có thời hạn phản hồi đã cam kết.
5. **Đóng:** ghi nguyên nhân/điều chỉnh nếu có, và thông báo cho người báo. Nếu không tái hiện được, giữ issue mở cho tới khi bổ sung đủ bước hoặc cùng thống nhất kết thúc.

## 4. Lỗi thanh toán hoặc cọc giả lập

Nếu giao diện hiện số tiền, mã đơn hoặc trạng thái `paid`/`refund_pending`/`refunded`, kiểm tra trước rằng đang dùng tài khoản và dữ liệu test. Trạng thái database không chứng minh ngân hàng đã nhận hoặc hoàn tiền. Không chuyển khoản, gọi ngân hàng, yêu cầu hoàn tiền thật hay gửi chứng từ ngân hàng. Ghi lại mã fixture và bước tái hiện đã che dữ liệu; nhóm kiểm tra event/log local tương ứng.

Trong chính sách lớp học, yêu cầu hủy đang chờ được hủy không mất phí và khoản cọc giả lập được hoàn đủ sau checklist trả máy. Nếu trạng thái không đúng, xử lý như bug và không thu/khấu trừ khoản nào. Xem [quy tắc hủy và hoàn mô phỏng](cancellation-refunds-deposit.md).

## 5. Sai khác checklist hoặc hư hỏng mô phỏng

Nếu người học tạo fixture sự cố thiết bị, nhóm chỉ dùng checklist và ghi chú giả lập. Không quy lỗi cho người học, không tạo hóa đơn sửa chữa và không trừ tiền. Có thể yêu cầu thành viên phụ trách review fixture độc lập để kiểm tra trạng thái, sau đó sửa hoặc xóa dữ liệu test có kiểm soát.

## 6. Yêu cầu liên quan dữ liệu cá nhân

Không gửi yêu cầu quyền riêng tư qua chat demo. Nếu ai vô tình nhập dữ liệu thật vào form, trước hết xóa site data/local storage trên trình duyệt đang dùng và báo người phụ trách đồ án qua kênh học tập để dọn fixture local nếu có. Không đăng thông tin đó vào issue hoặc báo cáo; chỉ mô tả loại dữ liệu và môi trường bị ảnh hưởng ở mức cần thiết.

Người phụ trách hạn chế chia sẻ thêm dữ liệu, xác định dữ liệu đang nằm ở localStorage hay database test, dọn fixture theo quy trình an toàn phù hợp và ghi nhận kết quả. Tài liệu đồ án không hứa rằng thao tác trên trình duyệt tự xóa database, backup hoặc log.

## 7. Nguyên tắc và giới hạn

Không thu phí để gửi phản ánh; không dùng issue để yêu cầu người học từ bỏ quyền; không xem phản ánh là bằng chứng khách đã đặt thuê; không xử lý tình huống mô phỏng như tranh chấp với khách thật. Tài liệu này không tạo khoản phải trả hoặc hình phạt tài chính; đánh giá bài học do giảng viên và quy định môn học quyết định. Quyền pháp lý trong giao dịch thật không được quy định hay giới hạn bởi quy trình học tập này.

Đọc cùng [Điều khoản thuê mô phỏng](rental-terms.md), [Quyền riêng tư mô phỏng](privacy-cookies-ai.md) và [Checklist giao nhận](delivery-return-inspection-damage.md).
