# Hướng dẫn sử dụng đồ án A.I.R

Tài liệu dành cho sinh viên và người xem demo local. Không có dịch vụ thuê hoặc thanh toán thật.

## Chọn đúng luồng

| Luồng | Cách nhận biết | Dữ liệu |
|---|---|---|
| Prototype | `/demo`, chuyển màn trong giao diện cũ | localStorage của trình duyệt, giỏ/đơn minh họa |
| Catalog và thuê Next.js | `/san-pham`, trang chi tiết và các route tài khoản | Catalog mẫu nếu chưa cấu hình; Supabase khi đã cấu hình |

Đơn tạo trong prototype không xuất hiện trong tài khoản Supabase. Xóa dữ liệu trình duyệt không đồng nghĩa xóa đơn trong database. Một catalog SAMPLE không đặt được là trạng thái được thiết kế, không phải lỗi cần bỏ qua kiểm tra.

Trang chủ `/` là điểm vào của đồ án, dẫn tới catalog và luồng thuê chính. `/demo` được tách riêng để không nhầm giỏ/đơn minh họa với dữ liệu Supabase.

## Xem thiết bị

Mở `/san-pham`, nhập từ khóa, chọn danh mục hoặc cách sắp xếp và mở một sản phẩm. Quan sát nhãn mẫu, giá minh họa, ảnh tham khảo/placeholder. Kiểm tra ngày khả dụng nằm trong luồng giỏ thuê khi backend được cấu hình. Không suy diễn model trong catalog là thiết bị dự án đang sở hữu.

## Đăng nhập và tài khoản thử nghiệm

Trong môi trường Supabase local đã cấu hình, dùng email `sinhvien-demo@example.invalid`. Nhận magic link trong hộp thư local theo hướng dẫn kỹ thuật; không dùng email thật. Sau đăng nhập, mở `/tai-khoan`, `/tai-khoan/dia-chi` hoặc `/yeu-thich` để quan sát dữ liệu gắn với tài khoản. Chỉ nhập thông tin giả lập, không tải giấy tờ thật.

Không có mật khẩu staff dùng chung trong hồ sơ. Quyền quản trị phải đến từ tài khoản thử nghiệm được cấp đúng cách hoặc fixture; không tự sửa cookie/localStorage để giả quyền. Người chưa có quyền không cần truy cập admin để hoàn thành demo catalog.

## Giỏ và đơn thuê

Luồng checkout đầy đủ chỉ dùng được khi có backend, tài khoản hợp lệ và sản phẩm/thiết bị thử nghiệm đủ điều kiện. Chọn ngày, kiểm tra số lượng và xem các khoản thuê, giảm giá, phí giao, cọc trước khi gửi. Sau gửi, đối chiếu mã đơn và trạng thái với kết quả server. Nếu mạng lỗi, kiểm tra đơn đã tạo trước khi thử lại; không suy luận từ một thông báo trình duyệt rằng ngân hàng đã nhận tiền.

Catalog seed SAMPLE không đáp ứng điều kiện checkout. [Hướng dẫn demo](DEMO-GUIDE.md) chỉ ra cách dùng kiểm thử có fixture để chứng minh luồng đầy đủ mà không cần hàng thật.

## Thanh toán và quản trị

Chỉ quan sát sổ giao dịch, webhook giả lập và thao tác vòng đời theo quyền trong môi trường local. Không quét/chuyển tiền đến thông tin ngân hàng, không nhập tài khoản ngân hàng thật. Hủy đơn, ghi nhận thanh toán và xác nhận hoàn cọc là các thao tác riêng; diễn giải kết quả bằng trạng thái và bằng chứng local.

Nhân viên thử nghiệm có thể xem các chức năng quản trị theo quyền đã cấp. Không chỉnh trực tiếp dữ liệu để ép kết quả được coi là đúng. Khi trình diễn kịch bản lỗi, ghi nhận vào phiếu thực hành và nêu rõ kết quả quan sát được.

## Chat và hướng dẫn

Mở trợ lý, thử câu hỏi FAQ hoặc tìm model có trong catalog. Với quota/backend chưa cấu hình, tính năng có thể báo chưa sẵn sàng; đây không phải bằng chứng provider AI bị lỗi. AI mặc định tắt; buổi học không cần API trả phí. Không nhập dữ liệu nhạy cảm vào chat. Các bài hướng dẫn tại `/huong-dan` có thể dùng để trình diễn nội dung và điều hướng.

## Kết thúc buổi thực hành

Đăng xuất tài khoản thử nghiệm. Có thể xóa dữ liệu của origin local trong công cụ trình duyệt nếu muốn dọn prototype, nhưng việc này cũng xóa phiên/lựa chọn tại origin đó. Fixture do script tạo được dọn theo script; kiểm tra thông báo cleanup trước khi kết luận đã dọn xong. Không chạy reset database hoặc xóa volume để dọn một buổi demo.

Ghi kết quả vào [phiếu nghiệm thu](templates/pilot-acceptance.md), gồm môi trường, thao tác, kết quả và giới hạn. Chỉ ghi “đạt” với những gì đã quan sát hoặc có bằng chứng được chỉ rõ.

