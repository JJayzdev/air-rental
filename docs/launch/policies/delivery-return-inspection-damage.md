# Giao nhận, trả máy, kiểm tra và sự cố — kịch bản mô phỏng của đồ án

> **TÀI LIỆU HỌC TẬP.** Không có thiết bị được giao/nhận qua A.I.R và không có dịch vụ vận chuyển thương mại. Phần này là quy trình diễn tập bằng checklist và dữ liệu test.

## 1. Phạm vi tình huống

Đồ án mô phỏng lựa chọn nhận tại điểm hẹn hoặc giao theo khu vực, lưu ngày nhận/trả và cộng phí giao cấu hình trong dữ liệu test. Các khu vực, ghi chú thời gian, ngưỡng miễn phí và mức phí trong Supabase local là fixture. Chúng không công bố địa bàn, lịch hoặc bảng phí ngoài đời.

Không có người giao hàng hoặc địa chỉ A.I.R được xác nhận. Không gửi thiết bị, tiền, giấy tờ hay thông tin nhà riêng cho nhóm đồ án. Nếu buổi học sử dụng thiết bị do trường/nhóm sở hữu, phải theo quy trình mượn trả của đơn vị đó; chính sách này không điều chỉnh tài sản vật lý của họ.

## 2. Checklist bàn giao giả lập

Để diễn tập, người học ghi các mục sau trong checklist mẫu:

1. Mã đơn test, ngày nhận dự kiến và phương thức nhận đã chọn.
2. Tên sản phẩm/mã sản phẩm mẫu và mã asset test (không phải số sê-ri thiết bị khách hàng).
3. Danh sách phụ kiện giả định đi cùng thiết bị.
4. Các điểm kiểm tra ngoại quan/chức năng và ghi chú sẵn có.
5. Trạng thái bàn giao do người học chọn trong luồng test.

Checklist là bài tập, không phải biên bản giao nhận có hiệu lực. Không ký tên thật hoặc thêm ảnh chụp người, nhà ở, giấy tờ, mã sê-ri thật hay dữ liệu khác của bên thứ ba. Code local hỗ trợ nhân viên ghi nhận một số sự kiện vận hành và in phiếu, nhưng không có nghĩa thiết bị đã được kiểm tra hoặc giao ngoài đời.

## 3. Diễn tập sử dụng và báo sự cố

Trong tình huống, người thuê báo lỗi hoặc sai khác bằng fixture trong báo cáo/issue của bài tập. Nhóm ghi mã test, bước tái hiện, kết quả mong đợi và thực tế. Không cần cung cấp ảnh/serial thật; không mở máy hoặc thay đổi thiết bị của trường khi chưa có phép của chủ sở hữu.

Kịch bản không tạo phí sửa, phí mất máy, bồi thường hay khấu trừ. Khi xuất hiện một lỗi mô phỏng, nhóm có thể chuyển trạng thái máy test sang bảo trì để thể hiện rằng máy không được tiếp tục cấp phát cho tới khi được kiểm tra. Đây là quyết định trong database test, không phải kết luận lỗi thuộc về khách.

## 4. Checklist trả và kiểm tra

Khi diễn tập trả máy, đối chiếu danh sách thiết bị/phụ kiện với checklist lúc nhận; ghi nhận mục “đủ/thiếu”, tình trạng mô phỏng và ghi chú. Kịch bản chuẩn giả định thiết bị và phụ kiện đầy đủ, không có hư hỏng mới. Nhóm hoàn tất kiểm tra, ghi kết quả và cập nhật trạng thái đơn/asset trong môi trường test.

Nếu bài tập muốn mô phỏng sai khác, đánh dấu rõ là **fixture sự cố**. Không biến giả định thành khoản thu: dừng luồng, ghi bằng chứng giả lập, yêu cầu kiểm tra lại và thảo luận cách xử lý công bằng. Đồ án không có biểu phí bồi thường hay giá thay thế được xác nhận.

## 5. Dữ liệu và tài khoản trên thiết bị

Trong mô hình dịch vụ giả định, người thuê sẽ sao lưu dữ liệu và đăng xuất tài khoản cá nhân trước khi trả thiết bị. Tuy nhiên A.I.R trong đồ án không giao máy thật, không cài phần mềm quản lý và không xóa/reset thiết bị của người học. Nếu sử dụng máy tính cá nhân hoặc thiết bị của trường để demo, không nhập tài khoản thật vào ứng dụng demo và không làm theo thao tác xóa dữ liệu.

## 6. Gia hạn và lịch

Code local tính ngày bắt đầu và ngày kết thúc trong số ngày thuê, và giữ một ngày đệm giữa các lượt. Đơn test có thể qua các trạng thái xác nhận, giao, đang thuê, trả và hoàn tất. Các thao tác đó chỉ mô phỏng lịch và vòng đời đơn; không đặt lịch vận chuyển, không giữ thiết bị vật lý và không gia hạn một khoản thuê thật.

## 7. Sai khác trong diễn tập

Khi checklist, trạng thái hoặc dữ liệu không khớp, ghi lại nội dung và chụp ảnh màn hình đã loại bỏ dữ liệu riêng tư. Nhóm không được tự thêm phí hoặc tuyên bố khách chịu trách nhiệm. Vấn đề được ghi nhận trong bài tập theo [quy trình khiếu nại mô phỏng](complaints.md); khoản cọc giả lập xử lý theo [chính sách hoàn cọc](cancellation-refunds-deposit.md).
