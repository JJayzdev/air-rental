# Hướng dẫn demo đồ án A.I.R

## Mục tiêu buổi demo

Trình bày catalog, tìm/lọc, trang chi tiết, nhãn sample, thiết kế giao diện và giới hạn dữ liệu mẫu.
Kịch bản mặc định là **chỉ xem**. Nó không tạo đơn thuê, không gửi thông báo, không gọi ngân hàng
hoặc dịch vụ trả phí.

## Chạy catalog mẫu

Yêu cầu Node.js/dependencies đã cài theo quy trình lớp học. Từ PowerShell:

```powershell
cd web
npm run dev
```

Mở `http://localhost:3000/san-pham`. Khi `NEXT_PUBLIC_SUPABASE_URL` và
`NEXT_PUBLIC_SUPABASE_ANON_KEY` không có giá trị ở môi trường local, ứng dụng dùng catalog sample
nội bộ và gắn nhãn mẫu. Nếu Supabase credentials đã có trong `.env.local`, app sẽ đọc project đó;
chỉ tiếp tục nếu project là sandbox local phù hợp với bài tập. Khi chỉ có một trong hai
biến Supabase, ứng dụng báo lỗi cấu hình; không tự điền credentials. Production mode yêu cầu Supabase
catalog đã cấu hình.

Kịch bản dẫn demo:

1. Mở `/san-pham`, đọc thông báo về dữ liệu mẫu.
2. Dùng tìm kiếm, danh mục và sắp xếp; giải thích mỗi sản phẩm có nhãn `MẪU`.
3. Mở một chi tiết, chỉ ra giá/cấu hình là tham khảo và nút đặt thuê bị vô hiệu cho sample.
4. Mở trang hướng dẫn/chính sách để phân biệt nội dung đồ án/dự thảo với quy trình đã triển khai.
5. Thử thao tác bằng bàn phím; quan sát focus, nhãn điều khiển, alt text và bố cục responsive.
6. Kết thúc bằng giới hạn: sample không phải inventory, không thể checkout, và backend chưa được
   kiểm chứng bởi việc xem trang.

Không nhấn đặt thuê hoặc thử gửi thông tin thật. Không yêu cầu người học nhập điện thoại, địa chỉ,
giấy tờ, email cá nhân hoặc tài khoản thanh toán vào môi trường demo.

## Checkout và bài tập backend

Checkout của Next app cần Supabase được cấu hình, tài khoản đã xác thực, sản phẩm `active` không phải
sample, một unit khả dụng trong database fixture, và vùng giao hàng fixture phù hợp với bài tập. Fixture
đơn vị không cần đại diện tài sản vật lý. Khi Supabase chưa cấu hình, trang checkout báo chưa kết nối.
Sample products không thể đặt thuê. Vì vậy không hứa rằng checkout hoạt động trong demo catalog mặc định.

Repo có kịch bản browser/booking/payment dùng fixture trong tài liệu [`../GD2-LOCAL.md`](../GD2-LOCAL.md)
và [`../GD7-OPERATIONS.md`](../GD7-OPERATIONS.md). Các script này tạo và dọn dữ liệu fixture trên
Supabase local; chúng không phải kịch bản chỉ đọc. Chỉ chọn bài fixture nếu muốn trình diễn backend
và đang dùng project Supabase local cô lập riêng cho bài đó; nếu môn học có quy định riêng, làm theo
giảng viên. Không chạy `supabase reset`, không trỏ script vào hosted project, và không chạy trên
database có dữ liệu cần giữ. Không có demo checkout không-mutating được xác nhận trong repo.

## Kiểm tra source không tạo giao dịch

Từ `web/`, các lệnh sau chạy kiểm tra source-level hiện có:

```powershell
npm test
npm run lint
npm run typecheck
```

Đây là kiểm tra mã, không chứng minh môi trường production hay checkout thật. Kịch bản chỉ xem catalog
không cần chạy build, Docker, Supabase hoặc script fixture.

## Kết thúc buổi

- Dừng dev server bằng `Ctrl+C`.
- Ghi kết quả vào [`templates/pilot-acceptance.md`](./templates/pilot-acceptance.md) bằng mã tham
  chiếu, không lưu dữ liệu nhạy cảm.
- Nếu bài học có dùng sandbox fixture theo chỉ định, làm theo cleanup trong đúng runbook và để người
  chấm xác nhận trạng thái cuối; không xóa dữ liệu thủ công diện rộng.
