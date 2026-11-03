# Điều khoản thuê thiết bị — kịch bản mô phỏng của đồ án

> **TÀI LIỆU HỌC TẬP.** A.I.R là đồ án giao diện và luồng thuê giả lập, không phải doanh nghiệp cung cấp thiết bị. Không có hợp đồng thuê, khoản phải trả hoặc giao nhận thật được tạo bởi tài liệu này.

## 1. Phạm vi

Điều khoản này mô tả kịch bản dùng khi trình bày hoặc kiểm thử đồ án. Tất cả sản phẩm, giá, khách hàng, lịch, đơn và khoản thanh toán trong kịch bản đều là dữ liệu thử. Sản phẩm có nhãn **MẪU** chỉ để minh họa và không thể đặt thuê. Không sử dụng các trang của đồ án như báo giá, xác nhận còn hàng hoặc lời mời ký hợp đồng.

Không nhập thông tin cá nhân thật. Khi cần đăng nhập để diễn tập, dùng email/fixture được tạo riêng cho môi trường Supabase local. Tài liệu, thao tác hoặc ảnh chụp màn hình đồ án không tạo cam kết ngoài đời.

## 2. Tình huống đặt thuê giả lập

Trong kịch bản, người học chọn một thiết bị trong danh mục minh họa, khoảng ngày và cách nhận. Màn hình kiểm tra khả năng đặt và hiển thị tổng tiền giả lập. Gửi checkout tạo một bản ghi test trong cơ sở dữ liệu local; đây là điểm kết thúc của giao dịch mô phỏng, không có nhân viên thương mại nào nhận đơn để giao thiết bị.

Bản local hiện dùng Supabase Auth để xác thực một số thao tác thuê. Checkout tính giá và khả năng cấp phát ở phía server/DB; catalog seeded mang dữ liệu mẫu, và sản phẩm mẫu bị chặn khỏi checkout. Các bài kiểm tra đặt thuê thành công tạo fixture thử nghiệm riêng, không đặt sản phẩm MẪU trong seed. Đây là hành vi code/kiểm thử local, không xác nhận inventory, giá hoặc luồng vận hành ngoài đời.

Trong thuật toán tính thử, ngày nhận và ngày trả đều được tính vào số ngày thuê; giữa hai lượt giữ một ngày đệm quản lý lịch. Đây là quy tắc của bài tập, không quyết định thời điểm giao nhận vật lý. Dữ liệu giá, cọc, giảm giá và khu vực giao lấy từ cấu hình seed/test, không phải bảng giá thật.

## 3. Thông tin của một đơn mẫu

Để bài tập dễ theo dõi, một đơn mô phỏng thể hiện: tên sản phẩm và mã sản phẩm test; số lượng; ngày bắt đầu/kết thúc; cách nhận; giá thuê mẫu; giảm giá/phí giao test nếu được cấu hình; tiền cọc test; tổng tiền tính thử; trạng thái đơn và trạng thái thanh toán mô phỏng. Hệ thống tự tính lại các giá trị cần thiết ở server/database nhằm minh họa ranh giới bảo mật, nhưng kết quả vẫn chỉ là số liệu thử.

Mã giảm, ngưỡng phí giao miễn phí và mức phí theo khu vực do fixture/admin local đặt ra để thử công thức. Tiền cọc được hiển thị riêng với tiền thuê. Không dùng các con số đang thấy để đặt mua, chuyển khoản, hạch toán hoặc so sánh giá thị trường.

## 4. Trạng thái và xác nhận

Đồ án có thể biểu diễn các bước như chờ xử lý, đã xác nhận, đang giao, đang thuê, chờ nhận lại, hoàn tất hoặc đã hủy. Trạng thái là dữ liệu mô phỏng. Email magic link hoặc xác thực local chỉ đăng nhập vào môi trường thử, không phải xác nhận một giao dịch thật.

Trong kịch bản lớp học, đơn chỉ được coi là “đã đặt” trong phạm vi bài tập khi test record hiện trong tài khoản đã đăng nhập. Không có lời hứa rằng sản phẩm đã được chuẩn bị hay chuyển tới khách. Nếu trang hiển thị lỗi, bài tập ghi nhận lỗi và không gửi lại thông tin thật hoặc chuyển tiền thật.

## 5. Thanh toán mô phỏng

Luồng thanh toán có thể trình bày nội dung chuyển khoản và trạng thái cọc/đã thanh toán/hoàn cọc, nhưng chỉ dùng tài khoản ngân hàng giả lập và webhook gửi tay trong local acceptance. Không có kết nối ngân hàng/SePay thật; không quét QR thật, không chuyển khoản và không tải chứng từ ngân hàng thật lên đồ án.

Nếu bản trình bày không bật mock-payment, bỏ qua bước này. Nếu có bật, chỉ dùng fixture được chỉ định trong bài kiểm tra. Dòng “đã thanh toán” trong cơ sở dữ liệu test không chứng minh tiền thật đã được nhận.

## 6. Bàn giao, sử dụng và trả trong tình huống

Đồ án mô tả việc hai bên đối chiếu model, mã máy test, phụ kiện, tình trạng và các ghi chú tại lúc nhận/trả. Không có thiết bị vật lý được A.I.R cung cấp trong kịch bản. Nếu lớp học dùng thiết bị minh họa của trường/nhóm, việc mượn thiết bị đó chịu nội quy riêng của đơn vị sở hữu, không chịu điều khoản của tài liệu này.

Trong phần diễn tập, người dùng có thể ghi nhận lỗi hoặc sai khác vào checklist mẫu. Không tạo phí hư hỏng, trả trễ, giao nhận hay bồi thường. Mọi khoản phí, khoản cọc hoặc mức bồi thường trong seed chỉ là fixture tính toán.

## 7. Hủy và quyền của người tham gia

Quy tắc kịch bản là việc dừng một yêu cầu giả lập không phát sinh khoản phí. Ứng dụng hiện cho hủy một số đơn đang chờ; trạng thái nào được hủy phụ thuộc logic và quyền trong code. Nếu nút hủy không hiện hoặc không có thao tác hỗ trợ cho trạng thái đó, dừng phần diễn tập mà không sửa trực tiếp DB và ghi nhận sai khác. Không ép chuyển trạng thái sang hủy hoặc hiểu việc không hủy được là nghĩa vụ trả tiền.

Quy tắc hủy/hoàn đầy đủ cho khoản mock-payment được mô tả trong [Hủy, hoàn tiền và tiền cọc](cancellation-refunds-deposit.md). Đây là kịch bản học tập, không thay thế điều kiện của giao dịch với nhà cung cấp thật.

## 8. Giới hạn áp dụng

Tài liệu này không định danh một công ty, chủ thể thu tiền hay cửa hàng; không xác lập thuế, hóa đơn, địa bàn phục vụ, thời hạn xử lý, quyền khấu trừ hoặc nghĩa vụ bồi thường. Những nội dung đó không thuộc kịch bản và không được suy ra từ code. Đọc [Bộ chính sách mô phỏng](../POLICIES-README.md) để hiểu phạm vi bài tập.
