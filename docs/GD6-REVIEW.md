# Review độc lập GĐ 6 — Chat AI & nội dung

**Kết luận reviewer Sol 6.1 ngày 02/11/2026: chấp nhận phạm vi GĐ 6 trên môi trường local đã thống nhất. Không còn phát hiện P0/P1/P2 chưa xử lý.** Parent thực hiện nghiệm thu cuối dựa trên review này và kiểm tra runtime bên dưới. Đây chưa phải xác nhận vận hành production hoặc tích hợp LLM thật.

Reviewer chỉ sửa tài liệu này; các thay đổi GĐ 5 có sẵn trong worktree được giữ nguyên. Không reset/dừng Docker, không commit và không gọi API trả phí.

## Phạm vi và các điểm đã sửa

- FAQ và intent xác định chạy trước LLM; bỏ cam kết phí/cọc cố định và khuyến nghị laptop cứng. Tìm sản phẩm ưu tiên tên/category, không trả laptop khi khách hỏi “Tìm máy ảnh” chỉ vì từ chung trong mô tả mẫu.
- `searchProducts` chỉ lấy catalog công khai, giữ nhãn mẫu; widget map đúng dữ liệu catalog, liên kết trang chi tiết và có form ngày. `checkAvailability` gọi `booking_calendar` cho cả khoảng thuê, giữ ngày Việt Nam, ngày đầu/cuối inclusive và buffer; không trả unit/customer.
- `getOrderStatus` dùng user đã xác minh ở server và session/RLS, thêm điều kiện owner kể cả với staff. Chỉ đọc mã/trạng thái/thời điểm, không trả tên, số điện thoại, địa chỉ, giấy tờ hay giao dịch thô.
- Quota bền vững 12 request/phút cho IP và user độc lập, tính nguyên tử. RPC quota chỉ service-role; các tool dữ liệu vẫn dùng session/RLS. Identity dùng HMAC có phân tách scope. Mặc định bỏ qua header IP không tin cậy; backend quota lỗi trả 503, hết quota trả 429.
- Body giới hạn 8 KiB kể cả chunked không có Content-Length; schema nghiêm ngặt, chặn cross-origin và trả `no-store`. Provider chỉ chọn tối đa một trong ba tool; chặn tên lạ, ghi đè action, unknown keys, args sai, nhiều tool và free text. Giới hạn 120 output token, 8 giây và 16 KiB response; lỗi dùng FAQ xác định.
- Không gửi lịch sử hoặc kết quả backend đến provider; không lưu transcript vào DB. Log chỉ có action đã validate, HTTP status và duration. UI hiển thị notice khi bật LLM; trang chủ render động để disclosure khớp cấu hình runtime. `store:false` không được diễn giải thành cam kết không lưu giữ ở nhà cung cấp.
- Clear chat tăng generation để phản hồi cũ không xuất hiện lại. Escape đóng được chat. Ba bài tiếng Việt có canonical/OG/Article JSON-LD, sitemap dùng chung slug/ngày cập nhật và shell điều hướng đọc được trên mobile.

## Kiểm tra reviewer tự thực hiện

- `npm test`: **56/56 đạt**, gồm 9 test chat về schema/intent, search và provider.
- `npm run lint`: **đạt, không warning** ở lần cuối; telemetry có ngoại lệ no-console tại đúng dòng, không tắt rule toàn file.
- `npx tsc --noEmit --incremental false` và `git diff --check`: **đạt**.
- Mock độc lập trong bộ nhớ trên nguồn provider thực: bật/tắt/thiếu key, endpoint/token/time/store, allowlist, action override, args sai, nhiều tool, free text, response quá 16 KiB, HTTP lỗi và abort. Bộ test lưu trong repo cũng kiểm tra timeout qua AbortController thật với 10 ms và fetch giả. Không dùng credentials/provider thật.
- Đọc migrations, RLS/session boundary, truy vấn owner, script local và fixture cleanup; đọc lại các sửa cuối về log tối thiểu, lỗi quota, runtime disclosure và wrap tên dài.
- Mở ảnh guide desktop/mobile và chat desktop/mobile để kiểm tra nội dung, điều hướng, nhãn mẫu, card và input. Nav mobile đã tăng kích thước; tên không có khoảng trắng đã được sửa wrap thay vì bị cắt.

## Bằng chứng runtime do parent cung cấp

Các kết quả dưới đây do parent chạy trên Supabase local riêng của project `air-rental` và build production local, không phải reviewer tự chạy database/browser:

- Áp dụng riêng migration 009, không reset DB; **270/270 pgTAP đạt**. Baseline booking có 6 bài concurrency đạt; GĐ 6 không thay đổi cấp phát booking.
- Build production cuối **đạt**, gồm trang chủ dynamic và bản CSS cuối.
- `node scripts/check-gd6-chat.mjs`: **exit 0**. Catalog thật qua API, sample không khả dụng, lịch trước/sau booking, owner/khách khác/staff privacy, malformed/body quá lớn/chunked/cross-origin, canonical/JSON-LD/mobile, FAQ, tìm máy ảnh, card/form ngày, keyboard, quota và chống spoof X-Forwarded-For mặc định đều đạt; không có page error.
- Log runtime chỉ hiện action/status/duration, không có PII. Fixture được dọn: không còn test user hoặc sản phẩm fixture.
- Sau delta chỉ thay CSS, parent rebuild và kiểm tra Chromium 390px với tên 168 ký tự không có khoảng trắng: nội dung không tràn card, panel nằm trong viewport. Ảnh cuối được chụp lại sau khi làm mới cache, không còn fixture.

Ảnh: [guide desktop](gd6-guide-desktop.png), [guide mobile](gd6-guide-mobile.png), [chat desktop](gd6-chat-desktop.png), [chat mobile](gd6-chat-mobile.png).

## Giới hạn nghiệm thu

LLM tắt mặc định và chỉ được kiểm tra bằng mock; chưa xác minh model/key/quota/độ trễ với OpenAI thật. Trusted proxy và hạn mức theo IP thật chưa được xác minh trên hosting production; khi tắt trust proxy, khách chia sẻ bucket IP chung. Nội dung chat không đồng bộ/lưu lâu dài; telemetry không phải lịch sử hội thoại. Catalog/fleet/giá thật vẫn cần xác nhận, sample không được coi là máy sẵn có. Các bài là hướng dẫn tham khảo, không thay thế báo giá hoặc điều kiện thuê đã xác nhận. Accessibility/performance/legal và pilot vận hành ngoài phạm vi GĐ 6 vẫn theo roadmap.
