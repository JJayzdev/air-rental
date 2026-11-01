# Biên bản review nền tảng đặt thuê — 01/11/2026

**Kết luận:** chấp nhận phần mã nguồn làm nền tảng để tiếp tục phát triển; chưa nghiệm thu MVP đặt thuê thật hoặc cho phép vận hành production. Đã mở lại và hoàn tất kiểm tra tĩnh quyền bảng/sequence sau vòng review cuối. Không còn phát hiện P0/P1/P2 chưa xử lý trong phạm vi mã nguồn đã review. Hành vi PostgreSQL chưa được chạy kiểm chứng.

## Phạm vi đã đọc

Roadmap, hợp đồng Zod và domain đặt thuê, migration Supabase, bộ SQL pgTAP, cấu hình test/CI và tài liệu giới hạn. RPC hiện tạo đơn cho **một sản phẩm với số lượng**, chưa hỗ trợ toàn bộ giỏ nhiều sản phẩm. Giao diện vẫn là demo localStorage và chưa gọi RPC.

Kiểm tra tĩnh cho thấy giá và máy được lấy từ database; khoảng tính phí bao gồm cả ngày nhận/trả, khoảng giữ máy thêm một ngày vệ sinh; exclusion constraint chặn trùng lịch; hủy/hết hạn giải phóng reservation và giữ lịch sử. RLS phân biệt khách hàng/nhân viên/quản trị viên, không có tra cứu PII bằng mã đơn công khai và không cấp quyền khách hàng sửa role.

## Các điểm đã sửa trước khi chấp nhận

- Serialize request cùng user/idempotency key; trả lại đơn cũ trước khi kiểm tra ngày bắt đầu đã qua.
- Khóa đơn trước khi hết hạn/giải phóng reservation; từ chối xác nhận đơn pending đã quá thời hạn.
- Hoàn thành đơn vẫn giữ khoảng vệ sinh; không giải phóng sớm toàn bộ khoảng đã giữ.
- Schema từ chối thuộc tính giá/tổng tiền/unitId; tính VND bằng số nguyên và đồng bộ quy tắc chọn tier.
- Đồng bộ trạng thái reservation `released` giữa TypeScript và SQL; sửa quyền đọc máy cho nhân viên và test phân quyền.
- CI dùng Node 24 và chạy domain tests; SQL test plan cuối khớp 34 assertions.
- Roadmap đặt thao tác nhân viên tối thiểu cùng checkout trước pilot/thanh toán; sửa mô tả hiện trạng, migration chưa chạy và nhiều reservation không chồng lấn trên cùng máy.
- Bỏ phụ thuộc default grants của Supabase: thu hồi toàn bộ quyền trên chín bảng mới và sequence audit khỏi PUBLIC/anon/authenticated, sau đó cấp tường minh quyền đọc, cập nhật cột liên hệ và DML catalog/units có RLS giới hạn admin. Không để lại quyền `TRUNCATE`, `TRIGGER`, `REFERENCES` hoặc quyền sequence cho client. Thêm sáu assertions kiểm tra privilege bảng/cột/sequence.

## Bằng chứng kiểm tra

Reviewer đã thực thi trên Node 24.14.1: `npm test` **7/7 đạt**, `npm run typecheck` đạt, `npm run lint` đạt và `git diff --check` đạt. Người triển khai cũng báo build production đạt; reviewer không chạy lại build riêng.

**Chưa thực thi migration hoặc 34 assertions pgTAP trên PostgreSQL/Supabase.** Môi trường không có database khả dụng; không dùng kết quả kiểm tra TypeScript để suy ra RLS, SQL hoặc concurrency đã hoạt động. Vòng sửa privilege cuối chỉ thay SQL; reviewer đã đọc lại toàn bộ khối revoke/grant, sáu assertions mới và chạy lại `git diff --check` đạt.

## Điều kiện còn thiếu trước khi bật đặt thuê thật

1. Chạy migration từ database sạch và chạy toàn bộ pgTAP trên Supabase/PostgreSQL thật.
2. Chạy hai session đồng thời: tranh một máy cùng lịch; cùng idempotency key trả cùng một đơn; khác payload cùng key bị từ chối; tranh chấp xác nhận/hết hạn không để đơn confirmed mất reservation; thiếu máy phải rollback toàn bộ đơn/items/events. Bộ SQL hiện tại chạy tuần tự, chưa chứng minh các race này.
3. Bổ sung server/auth boundary và RPC nhiều dòng nguyên tử trước khi nối giỏ; không gọi RPC một sản phẩm lặp lại để tạo một checkout.
4. Xác định quy tắc máy trả trễ/bảo trì: máy đang thuê quá hạn không được tự trở thành khả dụng chỉ vì `blocked_period` ban đầu đã kết thúc. Migration hiện chưa giải quyết quản lý tồn kho vận hành này.

Các điều kiện trên chưa đạt. Chấp nhận nền tảng mã nguồn không đồng nghĩa đã xác nhận an toàn vận hành hoặc đã có sản phẩm production.
