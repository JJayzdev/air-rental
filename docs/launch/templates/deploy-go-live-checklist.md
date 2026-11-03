# Checklist sẵn sàng demo local

> Đây là checklist cho trình bày đồ án trên máy local, không phải checklist go-live. Không cần dịch vụ
> trả phí hay tài khoản doanh nghiệp.

## Chuẩn bị demo catalog mẫu

- [ ] Node.js và dependencies của `web/` sẵn sàng theo hướng dẫn lớp
- [ ] `NEXT_PUBLIC_SUPABASE_URL` và `NEXT_PUBLIC_SUPABASE_ANON_KEY` không được đặt để dùng catalog mẫu, hoặc đang trỏ tới sandbox local riêng cho bài tập
- [ ] Đã kiểm tra `.env.local` để không vô tình kết nối môi trường ngoài phạm vi bài
- [ ] `npm run dev` chạy; `/san-pham` hiển thị nhãn sample
- [ ] Trang chi tiết chỉ rõ sample không nhận đặt thuê
- [ ] Không nhập dữ liệu cá nhân/secret; không giao dịch, gửi email/SMS hoặc webhook thật
- [ ] Có bản sao checklist và phiếu đánh giá trống

## Nếu chọn thực hành backend riêng

| Cổng kỹ thuật | Đã chuẩn bị | Người thực hiện / quan sát | Mã tham chiếu / ghi chú |
|---|---|---|---|
| Supabase CLI/Docker project local đúng repo |  |  |  |
| Project local cô lập, không phải hosted |  |  |  |
| Runbook fixture được chọn và đọc kỹ |  |  |  |
| Fixture cleanup và điều kiện dừng đã đọc |  |  |  |
| Không dùng `supabase reset` hoặc xóa dữ liệu diện rộng |  |  |  |
| Người quan sát xác nhận trạng thái cuối |  |  |  |

Không bật SMS OTP, thu giấy tờ định danh, LLM, alert webhook hoặc thanh toán provider cho buổi demo.
Các biến runtime từ `.env.example` không cần thiết nếu chỉ chạy catalog sample. Nếu app đang có
Supabase URL và anon key, nó chuyển sang đọc catalog backend thay vì dùng sample; dừng và xác nhận
đúng môi trường trước khi tiếp tục.

## Kết quả

- Mục tiêu demo:
- Môi trường / URL local:
- Commit / phiên bản:
- Kết quả: Sẵn sàng trình bày / Cần sửa / Dừng
- Người thực hiện:
- Người chấm:
- Ngày:
