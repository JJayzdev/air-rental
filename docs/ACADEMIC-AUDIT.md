# Kiểm tra và hướng phát triển đồ án A.I.R

Ngày 02/11/2026. Phạm vi học tập, không kinh doanh; GĐ8 vẫn tạm bỏ qua. Luna khảo sát luồng, Sol 6.1 review độc lập, parent đối chiếu nguồn và chạy kiểm tra mã. Đợt này không sửa logic ứng dụng, chạy migration hoặc thay đổi dữ liệu Docker.

## Kiểm tra mới

- 62/62 unit test đạt.
- ESLint và TypeScript kiểm tra không phát sinh lỗi.
- Build Next.js đạt. Lần đầu bị EPERM khi tạo thư mục `.next`; chạy lại ngoài sandbox thành công. Còn cảnh báo Autoprefixer về `end` thay vì `flex-end` và cache webpack; không phải lỗi build.
- Không chạy lại pgTAP, browser E2E, hiệu năng hoặc phục hồi database. Kết quả 270 pgTAP ở hồ sơ GĐ7 là bằng chứng lịch sử, không phải kết quả mới.

## Phát hiện cần sửa

### P2 Giá dự kiến trong giỏ không theo bậc giá

Tại `web/src/features/cart/rental-cart-panel.tsx:131–149`, subtotal được lấy từ giá cơ bản nhân số ngày; phí giao được tính trên subtotal này. Kết quả preview từ server có `subtotalVnd` được lưu tại dòng 259 nhưng không dùng trong phép tính hiển thị. Khi mức giá dài ngày thấp hơn giá cơ bản, giỏ có thể báo tổng tiền cao hơn và đạt ngưỡng miễn phí giao dù kết quả database không đạt ngưỡng.

Đây là phát hiện từ đọc mã, chưa tái hiện trong trình duyệt ở đợt này. Giá tạo đơn vẫn do DB quyết định; chưa có bằng chứng thu sai tiền ở server. Cách sửa đề xuất: một luồng báo giá phía server cho toàn bộ giỏ/ngày/mã giảm/vùng giao, dùng cùng quy tắc với tạo đơn; loại bỏ kết quả cũ khi đầu vào thay đổi. Test bậc giá dài ngày, ngưỡng phí giao sau giảm, đổi ngày và phản hồi đến sai thứ tự.

### P2 Có thể ngừng sử dụng máy đang được giữ cho đơn

`web/src/features/admin/actions.ts:110–113` cập nhật trạng thái `product_units` trực tiếp. Policy tại `supabase/migrations/202611010001_booking_foundation.sql:365–366` chỉ kiểm tra admin; không có trigger bảo vệ việc retire máy đã được cấp. Trong khi đó, `supabase/migrations/202611010003_multi_product_booking.sql:308–318` kiểm tra trạng thái máy khi bàn giao và từ chối máy không còn available. Admin có thể khiến đơn đã xác nhận không bàn giao được bằng thao tác retire.

Đây là phát hiện từ mã/RLS, chưa chạy lại tình huống DB. Cần ràng buộc ở database, có khóa hàng và kiểm tra reservation/custody đang hiệu lực; không chỉ khóa nút ở UI. Nếu dùng RPC thay thế, hạn chế đường UPDATE trực tiếp để tránh bỏ qua quy tắc. Kiểm thử máy rảnh, giữ chỗ, đơn xác nhận/đang thuê, hold hết hạn và cuộc đua booking với retire.

## Các khoảng trống trải nghiệm và bảo trì

Các phát hiện bổ sung từ khảo sát Luna được parent kiểm tra lại trong nguồn:

- `web/src/components/chat/ChatAssistant.tsx:16` truyền callback điều hướng rỗng; `ChatWidget.tsx:216` gọi callback khi bấm nút hành động rồi đóng chat. Trên luồng Next, một số nút hành động không đi tới trang nào. Cần ánh xạ hành động sang route Next hoặc ẩn hành động chưa hỗ trợ.
- `web/src/features/orders/server-data.ts:90` giới hạn 50 đơn mới nhất, chưa phân trang. Khi có nhiều đơn, đơn cũ còn cần xử lý có thể không xuất hiện trong danh sách quản lý. Bổ sung lọc trạng thái và phân trang; kiểm thử hơn 50 đơn với một đơn cũ chưa hoàn tất.
- `web/src/app/san-pham/[slug]/page.tsx:152` luôn ghi chưa hỗ trợ đặt thuê trực tuyến, kể cả sản phẩm fixture đủ điều kiện có nút thêm vào giỏ. Cần điều kiện hóa nội dung theo trạng thái sample; kiểm tra cả lời nhắc tương tự ở trang danh sách.

Các điểm trên mới được kiểm tra nguồn, chưa được tái hiện trình duyệt trong lần audit này.

1. Trang chủ đi vào prototype dùng localStorage, còn catalog/checkout Supabase dùng luồng và giỏ riêng. CTA chính tại `web/src/views/HomeView.tsx:43` mở danh sách cũ, CTA phụ dòng 46 mới dẫn `/san-pham`. Điều này khiến người xem khó theo một hành trình đồ án đầy đủ.
2. Hồ sơ đã là học tập nhưng `web/src/app/chinh-sach/page.tsx:17–22` vẫn yêu cầu thông tin trước giao dịch thương mại. Trang chủ còn đánh giá `4.9/5` và `1.200+ khách hàng` tại `HomeView.tsx:55` mà không gắn nhãn minh họa tại chỗ.
3. Catalog mẫu bị chặn checkout đúng thiết kế. Demo đầy đủ cần fixture local riêng; chưa có bộ dữ liệu trình diễn bền vững và thao tác chuẩn bị/dọn dành cho người bảo vệ đồ án.
4. `.github/workflows/ci.yml` có unit/lint/typecheck/build nhưng chưa chạy pgTAP hoặc browser E2E. Các lỗi liên quan trạng thái DB có thể lọt qua dù 62 unit test vẫn đạt.

## Thứ tự phát triển đề xuất

| Đợt | Công việc | Điều kiện hoàn thành |
|---|---|---|
| A Sửa nghiệp vụ | Thống nhất báo giá server; bảo vệ retire máy ở DB | Test hồi quy hai phát hiện và race test đạt; UI/DB không lệch tổng |
| B Thống nhất demo | Một luồng điều hướng chính; chuyển prototype sang khu minh họa riêng nếu cần; đồng bộ chính sách học tập và nhãn dữ liệu mẫu | Từ trang chủ đi xuyên suốt catalog → giỏ → đơn mà không đổi hệ lưu trữ ngoài ý muốn |
| C Bộ demo local | Fixture riêng, tài khoản theo vai trò, trạng thái kịch bản, hướng dẫn khởi tạo/dọn đúng project | Người khác chuẩn bị và demo đơn/thanh toán giả lập theo hướng dẫn; không dùng dữ liệu thật, không reset diện rộng |
| D Tự động nghiệm thu | CI pgTAP và E2E local; môi trường cô lập và artifact khi lỗi | Một thay đổi vi phạm quyền/giá/tồn kho làm pipeline thất bại; dữ liệu test được dọn |
| E Bảo vệ đồ án | Cập nhật sơ đồ dữ liệu/sequence theo mã cuối, video demo và báo cáo bằng chứng | Hồ sơ khớp phiên bản trình bày; giới hạn được nêu rõ |

Ưu tiên A → B → C → D → E. Chưa cần thêm đa chi nhánh, giới thiệu bạn bè, thanh toán thật hoặc AI trả phí. Nếu muốn mở rộng sau đó, chọn một tính năng gắn với mục tiêu môn học và tiêu chí đo được, thay vì mở đồng thời toàn bộ GĐ8.
