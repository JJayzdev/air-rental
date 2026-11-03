# Bộ biểu mẫu học tập và đánh giá đồ án

Bộ này phục vụ buổi demo và đánh giá dự án A.I.R trong môi trường học tập. Đây không phải bộ hồ sơ
khai trương doanh nghiệp. Các trường về sinh viên, người hướng dẫn, người chấm, phiên bản và kết quả
để trống để điền theo lớp học thực tế; không bịa tên hoặc điểm.

## Ranh giới dữ liệu

- Catalog `SAMPLE` của ứng dụng là dữ liệu minh họa, không đại diện hàng thật. Sample unit không thể
  đặt thuê. Giá/cấu hình hiển thị là ví dụ của đồ án, không phải báo giá hay giao dịch.
- Các dòng minh họa trong CSV dưới đây là hư cấu. Chúng chỉ là worksheet bằng tay: không được nạp,
  đồng bộ hoặc đánh dấu là có sẵn trong database.
- Buổi demo mặc định không cần tài khoản trả phí, provider thanh toán, ngân hàng hoặc khách thật.
  Không có giao dịch, email/SMS hay webhook thật trong kịch bản này.
- Không dùng dữ liệu cá nhân thật, giấy tờ, khóa, token, mật khẩu, số tài khoản hoặc bí mật lớp học.
  Dùng mã người học/fixture hư cấu và giữ hồ sơ đánh giá ở nơi lớp học được phép.

## Bộ tài liệu

1. [`DEMO-GUIDE.md`](./DEMO-GUIDE.md): chạy demo chỉ đọc catalog mẫu, giới hạn checkout và cách dẫn buổi.
2. `templates/operator-business-profile.md`: đổi thành phiếu thông tin đồ án/lớp/nhóm.
3. `templates/fleet-pricing-register.csv` và `templates/photo-rights-register.csv`: worksheet dữ liệu
   giả lập, kèm cột để người học ghi giả định và nguồn hình minh họa.
4. `templates/handover-inspection-form.md` và `templates/refund-cancellation-reconciliation.md`:
   diễn tập quy trình bằng mã đơn giả, không thực hiện giao nhận/hoàn tiền.
5. `templates/pilot-daily-checklist.md` và `templates/pilot-acceptance.md`: checklist buổi demo và
   phiếu nhận xét/đánh giá.
6. `templates/incident-escalation-runbook.md`: tabletop exercise, không liên hệ dịch vụ thật.
7. `templates/backup-restore-retention-worksheet.md`: ghi nhận bài tập khôi phục cô lập và quyết
   định retention cho dữ liệu bài tập; không chạy lệnh ghi DB nếu chỉ làm demo catalog.
8. `templates/deploy-go-live-checklist.md`: đổi thành checklist sẵn sàng demo local, không phát hành.

## Quy trình dùng trong lớp

1. Đọc demo guide và phân biệt UI demo với luồng backend có fixture.
2. Điền profile nhóm và các giả định; đánh dấu rõ giả định nào chỉ là mô hình hóa.
3. Mỗi sinh viên dẫn một kịch bản; người chấm ghi quan sát và mã tham chiếu không nhạy cảm.
4. Đánh giá theo tiêu chí của giảng viên. Trọng số, điểm đạt và quy tắc môn học để trống cho giảng viên.
5. Ghi giới hạn, lỗi và hướng cải tiến; không kết luận rằng hệ thống đã sẵn sàng kinh doanh.

## Giới hạn vận hành

Các bài kiểm tra trình duyệt/fixture trong tài liệu GD2 và GD7 có thể tạo rồi xóa dữ liệu trong
Supabase local. Bài fixture là lựa chọn riêng cho người muốn thực hành backend; chỉ chạy trên project
local cô lập, không chạy trên hosted project hoặc database có dữ liệu cần giữ. Nếu môn học có quy
định riêng, làm theo giảng viên. Unit tests trong `web/` là lựa chọn kiểm tra mã không cần thao tác
thủ công vào database. Sao lưu/khôi phục local có thể tạo archive chứa dữ liệu; chỉ làm với dữ liệu
fixture cô lập và không chia sẻ archive.

Giữ bản mẫu trống trong Git. Không commit phiếu đã điền nếu có dữ liệu định danh, secrets hoặc thông
tin riêng của người học. Chính sách trong đồ án chỉ là nội dung mô phỏng để thảo luận trong lớp.
