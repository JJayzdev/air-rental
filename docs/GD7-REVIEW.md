# Review độc lập GĐ 7 — Hoàn thiện local và điều kiện ra mắt

**Kết luận reviewer Sol 6.1 ngày 02/11/2026: chấp nhận phạm vi local đã triển khai và kiểm chứng bên dưới, gồm transport cảnh báo tùy chọn đã kiểm tra bằng mock; không còn phát hiện P0/P1/P2 chưa xử lý trong phạm vi đó. GĐ 7 chưa hoàn tất các điều kiện ra mắt trên môi trường thật.** Luna triển khai, parent nghiệm thu runtime. Reviewer chỉ sửa tài liệu này, giữ nguyên worktree có thay đổi GĐ 5/GĐ 6; không reset/dừng Docker, không commit và không gọi dịch vụ trả phí.

## Phạm vi cần chứng minh

- Luồng đặt thuê qua trình duyệt, webhook thanh toán giả lập local, tra cứu đơn và chống replay; fixture và cleanup chỉ tác động dữ liệu của lần chạy.
- Badge, bottom navigation, timestamp chat có contrast đo từ màu thực; focus ring hiển thị, mở/gửi/đóng chat và vòng Tab/Shift+Tab hoạt động, trả focus về launcher.
- Budget JS đo các asset thực đã tải của production build; phép đo LCP local có mô tả điều kiện, không suy ra LCP dưới 2,5 giây trên 4G production.
- Backup có phạm vi rõ, không ghi secret vào log; chỉ tuyên bố khôi phục đã kiểm chứng khi có roundtrip trên database cô lập và kiểm tra dữ liệu.
- Alert có đường đi và giới hạn rõ; lỗi được ghi bằng trường allowlist, không gửi raw Error/context, thông tin khách hoặc credentials.
- Các trang pháp lý chưa có quyết định doanh nghiệp phải được đánh dấu bản dự thảo. Không tự xác nhận VAT, điều kiện hoàn cọc/hủy hoặc tuân thủ pháp luật.

## Phát hiện đã chuyển cho người triển khai

1. Focus restoration giữ tham chiếu launcher đã unmount nên không trả focus khi đóng. Đã sửa kiểm tra `isConnected`, fallback launcher mới và guard lần mở thật; handler sử dụng callback mới qua ref để rerender không tự kéo focus về input. Parent đã xác minh input focus, vòng Tab/Shift+Tab, Escape và focus quay về launcher trên `/` và `/san-pham`.
2. Helper observability cũ gửi raw Error/context tới console/Sentry; webhook còn log `error.message`. Đã thay bằng event có trường allowlist kiểm tra tại runtime, bỏ helper message không dùng và xác minh payload nhạy cảm không xuất hiện trong log.
3. E2E được giới hạn loopback/port 3011 và project Docker đúng repo; fixture coupon riêng tránh dùng quota coupon chung. Cleanup xóa payment/event trước order và báo lỗi thay vì vẫn kết thúc thành công khi dọn thất bại.
4. Backup đã sửa tên mặc định không khớp validation; chuyển sang archive toàn DB có Auth và metadata Storage. Restore sửa quote SQL PowerShell, kiểm tra exit code từng lệnh và chỉ drop DB tạm có marker đúng. Parent đã chạy roundtrip thành công; role toàn cluster, blob Storage và cấu hình/secrets deployment nằm ngoài phạm vi.
5. Runbook đã có bước xử lý webhook lỗi, chênh lệch thanh toán, đơn trùng, DB gián đoạn và nghi lộ thông tin. Đã bổ sung transport cảnh báo HTTPS tùy chọn, tắt mặc định, timeout 2,5 giây, chặn redirect/userinfo/fragment, cooldown 60 giây bắt đầu trước await để gộp request đồng thời trong một process. Payload được dựng lại theo allowlist ở transport thay vì tin type TypeScript. Không phải hạn mức phân tán hay hàng đợi bền vững; endpoint thật và việc người trực nhận cảnh báo vẫn cần xác minh ngoài local.

## Kiểm tra reviewer tự thực hiện

- `npm test`: **62/62 đạt**, đã chạy lại sau delta cảnh báo; gồm 6 test mock về event an toàn, tắt mặc định/destination, HTTPS/redirect, runtime re-sanitize, lỗi HTTP/fetch/timeout và cooldown/concurrent send.
- `npm run lint`: **đạt, không warning**; `npx tsc --noEmit --incremental false` và `git diff --check`: **đạt**.
- Đọc roadmap GĐ 7, luồng SePay/RPC, helper fixture/cleanup, chat lifecycle và CSS, unit giá/ngày và CI hiện có.
- Kiểm tra động trực tiếp nguồn `observability.ts` bằng transpile trong bộ nhớ, chạy lại sau delta cuối: raw message/details, token và trường context lạ không được ghi; operation/outcome/name/code sai bị bỏ, SQLSTATE hợp lệ được giữ, context null không làm lỗi. Không sửa nguồn hoặc gọi dịch vụ ngoài.
- Sau refactor cảnh báo, chạy độc lập nguồn thật `POST` SePay + `observability` + event sanitizer + transport trong VM, chỉ mock NextResponse, Supabase RPC và fetch. Cả 6 trường hợp tắt cảnh báo, URL HTTP sai, HTTP 204, HTTP 503, fetch throw và abort đều trả **500 `{ok:false,error:'apply-failed'}`**; xác minh route await hoàn tất alert, deadline cấu hình 2.500 ms, `redirect:error`/`no-store`, payload chỉ có trường cho phép, log/payload không chứa lỗi SQL thô, thông tin khách hoặc secret URL. Timeout được rút ngắn bằng mock signal trong VM; không gửi mạng hay sửa DB.
- PowerShell parser kiểm tra cả ba helper preview/backup/restore: **0 lỗi cú pháp**. Điều này không thay thế kiểm tra lệnh SQL và roundtrip runtime.
- Đọc delta cuối responsive hero: preload phía server và ảnh thật chia sẻ đúng `src/srcSet/sizes`; ưu tiên ảnh hero và nguồn 480w trên mobile, không thay đổi nội dung hay ảnh của thiết kế. Đọc delta restore sử dụng `supabase_admin`: chỉ create/restore/drop database tạm UUID thuộc lần chạy, không đổi quyền role toàn cluster, giữ ownership/ACL/default privileges; lỗi restore giữ riêng trong thư mục backup thay vì in nội dung có thể nhạy cảm.
- Xem ảnh receipt đã thu đủ trên mobile và trang bảo mật dự thảo trên mobile: tiền thuê/cọc/lịch sử đúng với bằng chứng test, nội dung và điều hướng nằm trong viewport, nhãn dự thảo rõ ràng.

## Bằng chứng runtime do parent cung cấp

Reviewer không chạy lại database/browser song song benchmark. Các kết quả này do parent chạy trên Supabase local của project `air-rental` và production build local:

- Build cuối **đạt**; **270/270 pgTAP đạt**.
- `node scripts/check-gd7-rental-payment.mjs`: **exit 0**. Checkout tạo subtotal 2.100.000 ₫, giảm 210.000 ₫, giao 30.000 ₫, tiền thuê 1.920.000 ₫ và cọc 500.000 ₫. Webhook giả lập thu cọc, replay trả duplicate với một ledger row; số dư chuyển trạng thái paid, receipt đã thu 2.420.000 ₫. Tài khoản khác nhận 404, fixture được dọn theo lần chạy.
- Backup archive và restore thực vào database tạm **đạt**: RLS/ACL count, dữ liệu orders/payments/Auth/metadata Storage và quyền đọc authenticated khớp; không còn database restore tạm sau chạy. Đây là kiểm tra cùng cluster với role có sẵn, không phải diễn tập phục hồi toàn hệ thống.
- UI xác minh focus vòng bàn phím, focus-visible, gửi chat, reduced motion, các trang dự thảo `noindex`/không trong sitemap. Contrast đo được: badge **7,007:1**, timestamp **5,879:1**, nav active **4,666:1**, nav inactive **6,200:1**; timestamp/nav **12 px**.
- `node scripts/check-gd7-ui.mjs` lần cuối **exit 0**. Báo cáo `gd7-ui-measurements.json` lúc `2026-11-02T09:49:07.757Z`: ba context lạnh mỗi route, viewport 390×844, cache tắt, latency 150 ms, download 1,6 Mbps, upload 0,75 Mbps, CPU ×4. Median LCP `/`: **2.116 ms**, `/san-pham`: **1.368 ms**, `/huong-dan`: **1.108 ms**. JS gzip dedupe lần lượt **120.972 / 116.588 / 106.701 byte**, đều dưới 200.000 byte. Root trước tối ưu median 3.252 ms; đo lại sau tối ưu đã dưới 2.500 ms. Không dùng lượt catalog bị tranh chấp tài nguyên lúc chạy DB test làm phép đo độc lập.

Ảnh: [receipt mobile](gd7-paid-order-mobile.png), [receipt desktop](gd7-paid-order-desktop.png), [bảo mật dự thảo mobile](gd7-policy-mobile.png).

## Điều kiện ngoài local

Transport cảnh báo đã có code và mock; **chưa cấu hình/gửi đến endpoint thật hoặc xác nhận người trực nhận cảnh báo**. Local preview buộc tắt cảnh báo và bỏ URL đích khỏi environment trong lần chạy, sau đó khôi phục environment. Các trang chính sách là **bản dự thảo theo yêu cầu người dùng**, không phải chính sách đã ban hành; VAT, đơn vị vận hành và điều kiện thương mại chưa được xác nhận. Homepage vẫn là demo client/localStorage, có nội dung mẫu và ảnh Unsplash; cần thay hoặc tách rõ trước khi vận hành thương mại.

Nghiệm thu local không xác nhận dịch vụ ngân hàng/SMS/LLM thật, khôi phục toàn bộ môi trường production, LCP trên hosting/4G thật hoặc pháp lý/VAT đã được doanh nghiệp phê duyệt. Fleet, giá thật, pilot vận hành, cơ chế cảnh báo đến người trực và credentials live vẫn cần được xác nhận riêng. Chỉ số LCP ở trên là mô phỏng local; khả năng khôi phục được chứng minh chỉ với database và role có sẵn trong cùng cluster, không gồm Storage blob hoặc cấu hình deployment.
