# Phạm vi và tiêu chí hoàn thành đồ án

Ngày chốt 02/11/2026 · Dự án học tập, không kinh doanh.

## Quyết định phạm vi

| Nội dung | Quyết định |
|---|---|
| Mục đích | Học tập, trình diễn thiết kế và triển khai hệ thống thuê thiết bị |
| Giao dịch | Mô phỏng, không thu tiền hoặc bàn giao máy thật |
| Dữ liệu | Catalog mẫu và fixture kiểm thử riêng; không coi sample là hàng có thể thuê |
| Chính sách | Quy tắc tình huống giả lập đã viết đầy đủ; phân biệt với hành vi mã nguồn |
| Hạ tầng | Local của A.I.R, Supabase project `air-rental`; không dùng database dự án khác |
| Thanh toán | Webhook và ledger thử nghiệm, không bắt buộc tài khoản ngân hàng thật |
| AI và SMS | Tùy chọn, không cần bật dịch vụ trả phí để đạt phạm vi đồ án |
| Thông tin pháp nhân và VAT | Không áp dụng cho phạm vi học tập hiện tại |
| GĐ8 | Không nằm trong đợt hoàn thiện này |
| Dữ liệu trong hồ sơ | Không chứa khóa, mật khẩu, backup DB hoặc thông tin người thật |

## Tiêu chí đánh giá

1. Giải thích được hai luồng: demo giao diện dùng localStorage và luồng thuê có Supabase/Auth/RLS.
2. Trình diễn được catalog, tìm kiếm/lọc, trang chi tiết và hướng dẫn; chỉ rõ sản phẩm SAMPLE không đặt được.
3. Giải thích cách server tính giá, cấp máy, chống đặt trùng và phát lại yêu cầu.
4. Dùng bằng chứng hoặc chạy lại fixture local theo hướng dẫn để minh họa thanh toán giả lập và quyền đọc đơn.
5. Trình bày được quyền khách/staff, cách bảo vệ secret, giới hạn chat và dữ liệu lưu trên máy.
6. Đọc đúng kết quả kiểm thử trước đó, không trình bày mock hoặc phép đo local như xác nhận dịch vụ thật.
7. Hồ sơ nhất quán, liên kết hợp lệ và có biểu mẫu ghi kết quả thực hành.

Các tiêu chí trên là đề xuất đánh giá nội bộ của đồ án, không phải thang điểm hoặc yêu cầu đã được trường/giảng viên phê duyệt. Phiếu nghiệm thu được điền sau buổi demo thực tế.

## Giới hạn được chấp nhận

Prototype được tách tại `/demo`; catalog seed không cho đặt; không gửi email/SMS xác nhận đơn; AI/provider thật chưa nghiệm thu; chưa có phục hồi toàn bộ hạ tầng/blob; số đo hiệu năng GĐ7 là local mô phỏng của phiên bản trước khi tách trang chủ. Đây là giới hạn cần giải thích trong báo cáo, không phải yêu cầu mua hạ tầng hoặc mở dịch vụ thật.

Nếu sau này đổi sang kinh doanh hoặc mở cho công chúng nhập dữ liệu thật, phải lập phạm vi mới và đánh giá lại dữ liệu, tích hợp, vận hành và nghĩa vụ áp dụng. Hồ sơ đồ án này không tự cấp phép cho phạm vi đó.
