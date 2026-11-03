# Checklist buổi demo

- Ngày / múi giờ:
- Nhóm / người trình bày:
- Người chấm:
- Commit / phiên bản:
- Phòng / máy local:

## Trước buổi

- [ ] Đã đọc `DEMO-GUIDE.md` và biết catalog sample không bookable
- [ ] Dùng local sample hoặc project Supabase local cô lập đúng phạm vi bài tập
- [ ] Đã kiểm tra không có Supabase credentials ngoài phạm vi trong `.env.local`
- [ ] Màn hình hiển thị nhãn sample và thông báo giới hạn
- [ ] Chuẩn bị fixture giả lập; không dùng email/điện thoại/địa chỉ thật
- [ ] Không cần bật SMS, LLM, Sentry, alert webhook hay payment provider

## Trong buổi

- [ ] Giải thích dữ liệu nào là hư cấu, dữ liệu nào đọc từ backend local
- [ ] Không tạo giao dịch thật hoặc gửi email/SMS/webhook ra dịch vụ bên ngoài
- [ ] Nếu bài tập dùng backend local, email chỉ tới Mailpit local và webhook chỉ tới endpoint loopback của fixture
- [ ] Không thu hoặc chiếu dữ liệu riêng tư/secrets
- [ ] Ghi lỗi bằng mô tả/mã tham chiếu không nhạy cảm
- [ ] Nếu tự chọn bài backend fixture, chỉ thao tác trong môi trường local cô lập đã xác nhận

## Sau buổi

- [ ] Dừng dev server; ghi phiên bản và kết quả đánh giá
- [ ] Xác nhận trạng thái fixture theo đúng cleanup runbook (nếu có dùng fixture)
- [ ] Không xóa database, volume hoặc archive diện rộng
- [ ] Lưu phiếu theo quy định lớp; không commit thông tin cá nhân

Ghi chú / sự cố:

Việc cần làm tiếp / người phụ trách:
