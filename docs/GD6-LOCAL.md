# GĐ6 — Chạy và kiểm tra local

Môi trường kiểm tra thuộc riêng project `air-rental` trong repo A.I.R: API `55321`,
PostgreSQL `55322`, Mailpit `55324`, Next.js `3011`. Không dùng container của project khác.

## Chạy bản build

Từ thư mục gốc, khi Supabase riêng của A.I.R đang chạy:

```powershell
npx --yes supabase migration up --local
pwsh -File scripts/start-gd6-preview.ps1 -Build -FreshCatalog
```

Helper xác minh nhãn project và thư mục của container trước khi lấy credentials local.
Service-role key và HMAC secret chỉ truyền qua biến môi trường của tiến trình preview.
Service-role key dùng cho hạn mức chat; truy vấn sản phẩm, lịch thuê và đơn vẫn dùng
anon key cùng phiên người dùng/RLS. Helper tắt LLM và không gọi API trả phí.

HMAC secret cố định trong helper chỉ phục vụ kiểm tra local. Deployment cần secret riêng
ít nhất 32 ký tự. `CHAT_TRUST_PROXY=false` bỏ qua header IP do client gửi, gom vào một hạn
mức chung. Chỉ bật trusted proxy khi ingress đã được xác minh loại bỏ header giả và đặt
địa chỉ client đáng tin cậy; cấu hình này chưa được kiểm tra trên hosting thật.

## Nghiệm thu

Chạy tuần tự từ repo root, với preview đang chạy:

```powershell
npx --yes supabase test db
node scripts/check-gd6-chat.mjs
```

Script trình duyệt tạo fixture bằng UUID riêng, dùng email magic link qua Mailpit local,
kiểm tra lịch trước/sau khi đặt thuê, phân quyền khách/nhân viên trong chat, request lỗi,
giới hạn byte kể cả chunked body, trang hướng dẫn, chat mobile và hạn mức HTTP.
Fixture được dọn trong `finally`. Nếu đã hết hạn mức, script chờ cửa sổ 60 giây tiếp theo.
Không đưa thông tin cá nhân hoặc giấy tờ thật vào fixture.

Các ảnh nghiệm thu được ghi vào `docs/gd6-*.png`. Kết quả và giới hạn cuối cùng nằm trong
[GD6-REVIEW.md](GD6-REVIEW.md); tài liệu này không thay thế kết luận review.

## Giới hạn

- LLM thật chưa được gọi trong nghiệm thu local; kiểm tra provider dùng phản hồi giả lập.
- Không có lịch sử hội thoại đồng bộ giữa thiết bị. Nội dung chat không được lưu vào DB.
- Hạn mức dùng hai khóa IP/tài khoản; với trusted proxy tắt, các khách chia sẻ khóa IP chung.
- Dữ liệu catalog mẫu vẫn mang nhãn mẫu và không được coi là thiết bị có thể đặt thuê.
- Ba bài hướng dẫn là nội dung tham khảo, không thay thế báo giá hay điều kiện thuê được xác nhận.
