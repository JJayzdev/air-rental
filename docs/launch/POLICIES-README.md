# Bộ chính sách mô phỏng A.I.R cho đồ án

**Tài liệu học tập — kịch bản giả lập, không phải chính sách của doanh nghiệp.** A.I.R trong bộ tài liệu này là sản phẩm đồ án. Không có đơn vị kinh doanh hay nhà cung cấp dịch vụ cho thuê nào được xác nhận từ các tài liệu này. Nội dung mô phỏng cách một dịch vụ *có thể* xử lý yêu cầu thuê; không tạo giao dịch, khoản phải trả hoặc cam kết thương mại thật.

## Các tài liệu

- [Điều khoản thuê thiết bị (mô phỏng)](policies/rental-terms.md)
- [Hủy, hoàn tiền và tiền cọc (mô phỏng)](policies/cancellation-refunds-deposit.md)
- [Giao nhận, trả máy, kiểm tra và hư hỏng (mô phỏng)](policies/delivery-return-inspection-damage.md)
- [Quyền riêng tư, cookie và trợ lý AI (mô phỏng)](policies/privacy-cookies-ai.md)
- [Tiếp nhận và xử lý khiếu nại (mô phỏng)](policies/complaints.md)

## Quy ước của kịch bản

- Danh mục, khách hàng, đơn thuê, khoản cọc và giao dịch dùng trong bài tập là dữ liệu mẫu. Sản phẩm có nhãn mẫu không thể đặt thuê.
- Đặt thuê hoặc thanh toán trong local là thao tác kiểm thử. Không có thiết bị nào được giao và không có tiền nào thực sự chuyển qua ngân hàng.
- Trong tình huống giả lập, việc dừng yêu cầu không làm phát sinh phí. Ứng dụng có nút hủy cho một số đơn đang chờ; chỉ dùng thao tác mà code hỗ trợ cho trạng thái đó, và nếu không có thì dừng diễn tập mà không đổi trạng thái trực tiếp. Sau checklist nhận trả, nhóm đánh dấu hoàn lại toàn bộ khoản cọc giả lập. Đây là quy tắc lớp học, không phải quy tắc thương mại.
- Không nhập tên thật, số điện thoại thật, địa chỉ thật, thông tin đăng nhập ngân hàng, mã OTP, số giấy tờ hoặc tài liệu định danh vào bản demo. Dùng fixture tổng hợp.
- Các câu “đã có trong local” mô tả code/kiểm thử cục bộ. Chúng không có nghĩa tính năng đã được triển khai trên dịch vụ công khai hay đã tạo hoạt động kinh doanh.

## Tài liệu và kiểm chứng dự án

Chi tiết luồng local nằm trong [GD2-IMPLEMENTATION.md](../GD2-IMPLEMENTATION.md), [GD4-PAYMENTS.md](../GD4-PAYMENTS.md), [GD5-PRICING.md](../GD5-PRICING.md), [GD6-LOCAL.md](../GD6-LOCAL.md) và [GD7-POLICY-DRAFT.md](../GD7-POLICY-DRAFT.md). Những bài nghiệm thu dùng Supabase local và giao dịch ngân hàng giả lập; không kết nối ngân hàng thật. Giấy tờ định danh tắt mặc định; LLM tùy chọn cũng mặc định tắt và chưa được gọi trong nghiệm thu local.

## Đọc thêm — nguồn pháp luật chính thức

Các văn bản sau được tra cứu trên Cổng Thông tin điện tử Chính phủ ngày 02/11/2026 và được liệt kê để phục vụ thảo luận trong đồ án. Đây không phải tư vấn pháp lý, bản giải thích điều luật hay xác nhận dự án tuân thủ:

- [Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15](https://vanban.chinhphu.vn/?classid=1&docid=214590&pageid=27160&typegroup=) và [Nghị định 356/2025/NĐ-CP](https://vanban.chinhphu.vn/?classid=1&docid=216387&pageid=27160), cùng có hiệu lực 01/01/2026 theo thông tin văn bản.
- [Luật Bảo vệ quyền lợi người tiêu dùng 19/2023/QH15](https://vanban.chinhphu.vn/?classid=1&docid=208363&orggroupid=1&pageid=27160) và [Nghị định 55/2024/NĐ-CP](https://vanban.chinhphu.vn/?docid=210254&pageid=27160).
- [Bộ luật Dân sự 91/2015/QH13](https://vanban.chinhphu.vn/default.aspx?docid=183188&pageid=27160) và [Văn bản hợp nhất 113/VBHN-VPQH năm 2025 — Luật Thương mại](https://vanban.chinhphu.vn/?classid=2629&docid=215232&pageid=27160).

Nếu sau này chuyển đồ án thành dịch vụ thật, các trang này cần được viết lại theo chủ thể, fleet, giá, quy trình, hạ tầng và hoạt động thực tế; kịch bản học tập không thể dùng thay cho việc đó.
