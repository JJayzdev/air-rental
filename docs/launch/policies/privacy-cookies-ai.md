# Quyền riêng tư, cookie và trợ lý AI — kịch bản mô phỏng của đồ án

> **TÀI LIỆU HỌC TẬP.** Chỉ dùng dữ liệu tổng hợp. Không nhập thông tin cá nhân, giấy tờ, mật khẩu, mã OTP hoặc dữ liệu ngân hàng thật vào A.I.R. Môi trường local là phần mềm thử nghiệm; không phải dịch vụ đang nhận khách.

## 1. Dữ liệu và mục đích trong bài tập

Kịch bản giả định một dịch vụ cần tài khoản để quản lý giỏ, đơn thuê và yêu cầu hỗ trợ. Dữ liệu trong lần chạy local chỉ nhằm minh họa luồng đó và kiểm thử quyền truy cập. Những mục tiêu như liên hệ khách để giao hàng hoặc xử lý thanh toán thật không áp dụng cho đồ án.

### Tài khoản và thông tin đơn

Ứng dụng Next.js dùng Supabase Auth trong môi trường local; luồng được nghiệm thu dùng email magic link qua Mailpit local. Cấu hình OTP điện thoại là tùy chọn và chưa được xác minh với nhà cung cấp SMS thật. Tài khoản thử có thể liên kết profile, địa chỉ, danh sách yêu thích và đơn test. Quy tắc RLS được kiểm thử để người dùng chỉ đọc đơn của mình, còn nhân viên test có quyền theo vai trò.

Đơn test có thể chứa tên, số liên hệ, địa chỉ, ngày, sản phẩm, giá, phí và trạng thái mà người kiểm thử nhập. Dù giá trị là giả lập, ứng dụng có thể lưu chúng trong Supabase local. Chỉ dùng fixture tổng hợp và dọn fixture theo hướng dẫn bài test; không đẩy dữ liệu này lên dịch vụ Supabase công khai.

### Hai loại giỏ và bản demo cũ

Giỏ thuê UUID của catalog lưu mã sản phẩm, số lượng và ngày trong `localStorage` với khóa `air-uuid-rental-cart-v1`. Bản demo giao diện cũ hiện ở `/demo` lưu thêm `air-cart`, `air-orders`, `air-favorites` và `air-user` trong `localStorage`. Các form demo có thể ghi tên, số điện thoại, địa chỉ, sản phẩm yêu thích hoặc đơn giả lập ngay trên trình duyệt. Hai luồng lưu tách biệt; dữ liệu không tự biến mất khi đóng tab.

Nếu đã nhập nhầm thông tin cá nhân thật vào bản demo, xóa dữ liệu trang của trình duyệt (site data/local storage) cho địa chỉ đang dùng. Thao tác này cũng xóa các giỏ và đơn demo được lưu trên trình duyệt đó. Nó không xóa hồ sơ trong cơ sở dữ liệu local; nhóm đồ án phải dọn test fixture qua quy trình quản trị riêng. Không yêu cầu người học tự chạy lệnh xóa cơ sở dữ liệu.

### Cookie, nhật ký và kiểm thử

Phiên Supabase được duy trì bằng cookie phiên; cấu hình cụ thể phụ thuộc ứng dụng local đang chạy. Công cụ lưu trữ trình duyệt khác cookie HTTP và vẫn cần được tính đến khi giải thích dữ liệu lưu trên thiết bị. Bộ mô phỏng không định nghĩa quảng cáo hay phân tích hành vi. Tuy nhiên, trình duyệt có thể nhận request từ các dịch vụ ngoài do cấu hình môi trường; hãy kiểm tra cấu hình và yêu cầu mạng thực tế trước khi tuyên bố không có công cụ theo dõi.

Code log sự cố lọc một số trường nhạy cảm; cảnh báo qua webhook tùy chọn tắt trong nghiệm thu và chưa gửi tới endpoint thật. Điều này không có nghĩa mọi log của hệ điều hành, hosting, proxy, database hoặc nhà cung cấp đều đã được kiểm kê. Log và backup local có thể chứa dữ liệu test, vì vậy cần giới hạn chia sẻ và chỉ giữ trong lúc làm bài.

## 2. Giấy tờ định danh

Tính năng yêu cầu/tải ảnh giấy tờ có cờ cấu hình và tắt mặc định trong cấu hình local đã nghiệm thu. Không cần CCCD/hộ chiếu để xem demo hoặc chạy kịch bản thông thường; không tải giấy tờ thật lên. Nếu một bài test kỹ thuật phải kiểm tra tính năng này, chỉ dùng ảnh fixture không thuộc về người thật, ở môi trường local riêng, rồi dọn theo quy trình test đã có. Không diễn giải tính năng này thành quy trình nhận dạng khách đã vận hành.

## 3. Chat và AI

FAQ/chat rule-based có thể dùng mà không gọi LLM. Tùy chọn OpenAI bị tắt mặc định trong nghiệm thu local và chưa được gọi tới API thật trong các bài nghiệm thu đã ghi nhận. Khi cấu hình bật, code gửi nội dung tin nhắn hiện tại tới OpenAI để chọn tối đa một tác vụ giới hạn: tìm sản phẩm, kiểm tra ngày khả dụng hoặc truy vấn trạng thái đơn của chính tài khoản. Tác vụ chạy bằng dữ liệu Supabase; model không tự xác nhận một giao dịch hay viết sự thật về giá/tồn kho/đơn.

Yêu cầu API hiện có trường `store: false`. Đây là tham số trong request, không đủ để cam kết toàn bộ log/retention của bên cung cấp dịch vụ. Chính sách thực tế của nhà cung cấp chưa được thử nghiệm trong đồ án. Vì vậy:

- Chỉ thử với câu hỏi giả lập; không gửi tên, địa chỉ, email, số điện thoại, mã đơn gắn với người thật, giấy tờ, thông tin tài chính hoặc dữ liệu nhạy cảm.
- Nội dung chat không được lưu làm lịch sử hội thoại trong database theo kiểm thử local; dữ liệu nhật ký phía máy chủ/hosting và quy tắc lưu của OpenAI chưa được xác minh.
- Nếu bật LLM cho một buổi trình diễn, thông báo rõ đó là bài thử ngoài mạng local và dùng prompt tổng hợp. Sau buổi thử, tắt lại cấu hình.
- Kết quả về lịch khả dụng chỉ là ảnh chụp tại thời điểm kiểm tra; không phải xác nhận thiết bị đã được đặt.

## 4. Quyền truy cập, lưu giữ và xóa trong đồ án

Dữ liệu tổng hợp chỉ được dùng cho kiểm thử, trình diễn và đánh giá đồ án. Thành viên chỉ truy cập môi trường test khi cần làm nhiệm vụ; không chia sẻ file dump, service key hoặc ảnh chụp chứa thông tin người dùng. Quyền RLS trong local được kiểm thử, nhưng không xác nhận cấu hình project công khai hay quyền truy cập của hosting.

Không có thời hạn lưu khách hàng vì không có khách hàng thật. Dữ liệu trên trình duyệt có thể còn cho tới khi người dùng xóa site data. Database local có thể tiếp tục giữ dữ liệu sau khi ứng dụng hoặc container dừng; nhóm phải xóa fixture theo script/marker dành riêng cho fixture đó hoặc xóa dữ liệu của môi trường test qua quy trình kiểm soát. Một số bài kiểm tra tự dọn fixture của chính lần chạy. Không reset database dùng chung chỉ để xóa một fixture. Với yêu cầu xóa dữ liệu test, báo nhóm đồ án qua kênh học tập của lớp và nêu cách tìm fixture; không gửi thêm dữ liệu cá nhân.

## 5. Nhà cung cấp và phạm vi không được suy đoán

Các bài nghiệm thu dùng Supabase local, Mailpit và tài khoản ngân hàng giả lập. Chúng không kết nối ngân hàng, nhà cung cấp SMS, SePay thật hoặc OpenAI thật. Cấu hình Next.js có thể được chạy trên máy của người học; tài liệu này không ghi nhận một host công khai hay nhà cung cấp thương mại. Bất kỳ request nào vượt ra khỏi máy local (ví dụ LLM nếu bật hoặc dịch vụ hosting) phải được xem là phạm vi khác; chỉ dùng dữ liệu giả.

Không khẳng định có/không có cookie bên thứ ba, thời hạn retention hay xử lý dữ liệu ngoài Việt Nam chỉ từ code. Đây là chủ đề học tập để người làm đồ án kiểm tra cấu hình, tài liệu và traffic thật trước khi đề xuất triển khai dịch vụ.

## 6. Nguồn tham khảo

Để thảo luận về nguyên tắc quyền riêng tư trong bối cảnh Việt Nam, xem các nguồn chính thức được liệt kê ở [Bộ chính sách mô phỏng](../POLICIES-README.md). Việc nêu nguồn không phải tư vấn, đánh giá hay tuyên bố đồ án đã tuân thủ pháp luật.

