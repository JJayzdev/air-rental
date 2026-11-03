# Rà soát độc lập hồ sơ đồ án A.I.R

> Đây là review lịch sử của lần biên soạn tài liệu trước khi sửa ứng dụng. Các nhận xét về route `/` và trang chính sách cũ được thay thế bằng [review hoàn thiện ứng dụng](../ACADEMIC-COMPLETION-REVIEW.md). Giữ lại nội dung dưới đây để truy vết phạm vi từng lần review.

Ngày rà soát: **02/11/2026**. Phạm vi: tài liệu học tập, chính sách mô phỏng và biểu mẫu cho đồ án; không triển khai tính năng mới và không bao gồm GĐ8. Bản rà soát này thay cách đọc “chuẩn bị kinh doanh” của phiên bản hồ sơ trước bằng phạm vi học tập được người dùng xác nhận.

## Tiêu chí rà soát

- Tài liệu phải xác định A.I.R là đồ án; nhân vật, giá/cọc và quy tắc xử lý dùng trong bài tập là giả lập. Không yêu cầu doanh nghiệp, merchant, tài khoản ngân hàng thật hoặc phê duyệt thương mại để hoàn thành bài học.
- Phân biệt chức năng có trong code, kết quả nghiệm thu local đã ghi nhận, kịch bản diễn tập thủ công và hướng phát triển. Biểu mẫu không tự tạo tính năng import, gia hạn, khấu trừ, chuyển tiền, gửi thông báo hoặc lưu lịch sử mới.
- Không dùng dữ liệu người thật, giấy tờ định danh hoặc giao dịch thật trong ví dụ. Kết quả “đạt” phải do người chạy bài ghi lại; một mẫu điền sẵn không phải bằng chứng đã chạy.
- Giữ đúng hành vi kỹ thuật: sản phẩm mẫu không đặt được; giá do DB tính; giỏ demo và giỏ thuê Supabase tách biệt; webhook local và hoàn tiền mô phỏng không phải chuyển tiền ngân hàng; OTP/giấy tờ/LLM có điều kiện cấu hình.
- Liên kết và hướng dẫn phải giúp người học tìm được tài liệu, nguồn kiểm chứng và cách trình diễn local.

## Phương pháp và giới hạn

Đối chiếu tài liệu với các route, cart/storage, chat, payment action/RPC và tài liệu nghiệm thu GĐ6/GĐ7 hiện có. Đợt này chỉ thay tài liệu nên không chạy lại build, browser, migration hoặc các thử nghiệm tích hợp. Số liệu kiểm thử trong báo cáo phải dẫn về lần nghiệm thu đã ghi trong tài liệu gốc; không coi là một lần chạy mới của bộ hồ sơ.

Phần chính sách là bài mô phỏng nghiệp vụ. Các nguồn pháp luật chính thức trong [hướng dẫn chính sách](POLICIES-README.md) phục vụ đọc thêm; việc dẫn nguồn không đánh giá tuân thủ hoặc tạo nghĩa vụ thương mại cho đồ án. Các URL của Luật 91/2025/QH15, Nghị định 356/2025/NĐ-CP, Luật 19/2023/QH15, Nghị định 55/2024/NĐ-CP, Bộ luật Dân sự 91/2015/QH13 và Văn bản hợp nhất 113/VBHN-VPQH đã được mở kiểm tra đúng tên văn bản trong lần review tài liệu cùng ngày.

Bản giao là nguồn Markdown/CSV có thể đóng gói ZIP. Chưa có bản Word/PDF đã render và kiểm tra bố cục. Một số liên kết kỹ thuật yêu cầu mở repository; cấu trúc và phạm vi tệp đi kèm được giải thích tại [mục lục](README.md).

## Trạng thái rà soát

**Chấp nhận bộ hồ sơ nguồn cho phạm vi học tập/đồ án.** Báo cáo, hướng dẫn, năm chính sách mô phỏng và biểu mẫu đã chuyển sang mục đích thực hành local. Không còn yêu cầu doanh nghiệp, VAT, tài sản thật hoặc ngân hàng thật như điều kiện hoàn thành. Các ô về người học, lớp, điểm và kết quả quan sát được để trống để dùng trong từng lần thực hành; đó không phải thiếu sót thương mại cần giải quyết.

Các điểm đã đối chiếu và sửa trong review:

| Điểm kiểm tra | Nội dung sau sửa |
| --- | --- |
| Catalog mẫu và checkout | SAMPLE không đặt được. Luồng checkout thành công dùng sản phẩm active không phải sample cùng unit khả dụng của fixture local riêng; không cần tài sản vật lý thật. |
| Hủy trong kịch bản | Không có phí thật, nhưng chỉ thao tác hủy khi code cho phép; dừng buổi diễn tập không tự thay đổi trạng thái DB. Không tuyên bố staff hủy được mọi trạng thái. |
| Hoàn cọc | Quy tắc lớp học giả định trả đủ và hoàn đủ khoản cọc mock; trigger/RPC thực tế có điều kiện và chỉ ghi ledger, không chuyển tiền ngân hàng. |
| Dữ liệu lưu trên máy | Giỏ thuê UUID tách khỏi `air-cart`, `air-orders`, `air-favorites`, `air-user` của prototype; xóa site data không xóa DB. Dừng app/container không tự xóa database lưu bền. |
| Bài tập chỉ xem và tích hợp | Catalog sample không cần provider trả phí. Bài fixture tùy chọn có thể ghi/dọn dữ liệu riêng trên local, gửi magic link tới Mailpit và webhook tới loopback; không lẫn với giao dịch/dịch vụ thật. |
| Kết quả kiểm thử trong báo cáo | 62/62 unit test, 270/270 pgTAP và LCP 2.116/1.368/1.108 ms khớp [review GĐ7](../GD7-REVIEW.md). Báo cáo ghi rõ là bằng chứng lịch sử local và giải thích đơn vị; đợt tài liệu này không chạy lại. |
| Phần đã làm và mô hình hóa | Nội dung chính sách/worksheet không bị trình bày như validation hoặc tính năng ứng dụng mới. Trang chính sách trong app vẫn là dự thảo GĐ7, được hướng dẫn riêng với hồ sơ học tập mới. |

Các CSV có dòng minh họa được gắn nhãn hư cấu và không nạp DB; điểm số, kết quả buổi demo và bằng chứng quan sát không được điền thành tích giả. Nguồn ảnh minh họa trên worksheet không phải bằng chứng dự án sở hữu thiết bị hay đã được cấp phép cho một ảnh thật.

Kiểm tra cuối trong repository: **44 liên kết Markdown tương đối, không có đích bị thiếu**; `git diff --check` đạt. Hai CSV đọc được bằng `Import-Csv`, mỗi file có một dòng minh họa hư cấu; lần lượt 15 và 10 cột đúng với tiêu đề. Các tài liệu GĐ0–GĐ7 kèm theo là bằng chứng/lịch sử kỹ thuật; định hướng thương mại trong chúng không còn là đầu việc bắt buộc của đồ án. Theo phạm vi đóng gói, ZIP chỉ gồm nguồn Markdown/CSV và tài liệu tham chiếu, không kèm mã nguồn, `.env`, backup hoặc ảnh bằng chứng; liên kết tới các loại tệp đó cần mở repository như giải thích ở mục lục. Kiểm tra nội dung ZIP thực tế được thực hiện khi tạo gói sau review nguồn.

Kết quả này đánh giá tính nhất quán của hồ sơ, không chấm điểm thay người đánh giá và không xác nhận một buổi trình diễn mới đã chạy thành công. GĐ8 vẫn ngoài phạm vi.
