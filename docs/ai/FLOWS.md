# Luồng nghiệp vụ A.I.R

Mỗi luồng ghi rõ: bước → file/RPC tham gia → điều kiện quan trọng. Bản đồ thư mục xem
[ARCHITECTURE.md](ARCHITECTURE.md).

## 1. Đăng ký và đăng nhập

```text
/dang-ky (register-form.tsx)
  → registerAccount()            features/auth/actions.ts
      signInWithOtp(shouldCreateUser: true, data: họ tên, SĐT, địa chỉ, terms)
  → email chứa link + mã 6 số
/dang-nhap (login-form.tsx)
  → requestEmailOtp()            (email demo → không gửi mail, báo dùng mã cố định)
  → verifyEmailOtp()             verifyOtp type 'email', lỗi thì thử 'signup'
      → syncRegistrationProfile() chép metadata vào profiles + customer_addresses (1 lần)
      → redirect ?next= (safeInternalPath) hoặc defaultLandingPath(role)
          admin/staff → /admin · partner → /partner · customer → /don-thue
Link trong email → /auth/callback (exchangeCodeForSession | verifyOtp token_hash) → như trên
```

- Demo login: `features/auth/demo-accounts.ts` — `customer@air.com`, `partner@air.com`,
  `admin@air.com`; mã `AIR_DEMO_OTP` (mặc định `111111`); tạo phiên thật qua
  `auth.admin.generateLink` (cần service role).
- SMS OTP chỉ khi `AIR_ENABLE_PHONE_OTP=true`.

## 2. Duyệt danh mục

```text
/san-pham, /san-pham/[slug], trang chủ
  → getCatalog()                 features/products/catalog-server.ts
  → fetchSupabaseCatalog()       REST /rest/v1/products?state=eq.active (anon key, cache 300s, tag 'catalog')
  → mapSupabaseCatalogRow()      validate từng dòng; dòng lỗi bị bỏ qua (log warn)
Không cấu hình Supabase + không phải production → SAMPLE_CATALOG cục bộ.
```

Sau mọi thay đổi sản phẩm phải `revalidateTag('catalog')`.

## 3. Giỏ thuê → báo giá → đặt đơn (luồng cốt lõi)

```text
Trang sản phẩm: AddRentalButton → localStorage 'air-uuid-rental-cart-v1' {items[productId,quantity], start, end}
/gio-thue  RentalCartPanel
  ├─ chọn ngày: getBookingCalendar() → RPC booking_calendar(items, from, to, start?)
  │     ngày khả dụng khi MỌI dòng có đủ máy: product active, không sample, unit available,
  │     ready_on ≤ ngày bắt đầu, không trùng reservation còn hiệu lực, máy không đang bị giữ ngoài
  ├─ báo giá: features/pricing/actions.ts → RPC preview_booking_quote → quote_booking
  │     tiền thuê/máy = floor(giá_ngày × số_ngày × (100 − %tier) / 100)
  │     giảm mã: percent → floor(subtotal × % / 100) | fixed → min(value, subtotal)
  │     phí giao: theo delivery_zone; miễn phí nếu (subtotal − giảm) ≥ free_from_vnd
  │     total = subtotal − giảm + phí giao; cọc tính riêng, không bị giảm
/checkout (yêu cầu đăng nhập)
  → createRentalBooking()        features/booking/actions.ts
      zod multiBookingRequestSchema (≤20 máy, ≤90 ngày, delivery ⇔ có zone)
  → RPC create_multi_product_booking (supabase/migrations/*_pricing.sql)
      1. validate, gộp dòng trùng productId, advisory lock (user, idempotency_key)
      2. đã có đơn cùng key → trả lại đơn cũ (hash khác → lỗi "Idempotency key")
      3. quote_booking (khoá dòng discount FOR UPDATE)
      4. insert orders (state pending, expires_at = now + 30 phút), used_count += 1 (bộ đếm lịch sử;
         giới hạn max_uses so với số đơn còn sống — discount_code_active_uses)
      5. expire các đơn pending quá hạn (giải phóng reservation)
      6. với mỗi sản phẩm: chọn máy rảnh FOR UPDATE SKIP LOCKED, insert order_items + reservations
         thiếu máy → raise "Not enough available units" → rollback toàn bộ
  → client xoá giỏ (localStorage) + xoá idempotency key (sessionStorage), chuyển tới /don-thue/[id]
     (đổi nội dung giỏ trước khi đặt → rotateBookingKey tạo key mới)
```

Lỗi mạng/5xx được báo "chưa xác định" và **giữ nguyên idempotency key** để thử lại an toàn.

## 4. Vòng đời đơn

```text
pending ──confirm──► confirmed ──► delivering ──► active ──► returning ──► completed
   │                    │                           │                         ▲
   ├─cancel (khách/NV)  └─cancel (NV)               └─► overdue ──────────────┘ (hoặc → returning)
   └─expire (quá 30 phút, tự động khi có đơn mới hoặc NV bấm "giải phóng")
```

- Khách huỷ: `cancelOwnBooking` → RPC `cancel_booking` (chỉ `pending`).
- Nhân viên: `/quan-ly-don` → `transitionBooking` → RPC `transition_booking`
  (`supabase/migrations/*_multi_product_booking.sql`).
  - `pending → confirmed` bị chặn nếu đã quá `expires_at`.
  - `→ delivering/active` yêu cầu mọi máy `available`, `ready_on ≤ hôm nay`, hôm nay nằm trong kỳ
    thuê, và máy không đang ở đơn khác chưa trả.
  - `→ cancelled` giải phóng reservation.
  - `→ completed` đặt `ready_on = hôm nay + 2` (1 ngày vệ sinh) và trigger tạo khoản hoàn cọc.
- Mọi đổi state ghi vào `order_events` (trigger) → hiện ở "Lịch sử đơn" và `/admin/nhat-ky`.
- Bảng chuyển trạng thái phía TS (`features/orders/status.ts`) phải khớp RPC.

## 5. Thanh toán (chuyển khoản SePay) và hoàn cọc

```text
/don-thue/[id] PaymentPanel: hiện tài khoản AIR_BANK_* + nội dung "THANH TOAN AIR-YYMMDD-XXXXXXXX"
Ngân hàng → SePay → POST /api/webhooks/sepay (Authorization: Apikey <SEPAY_WEBHOOK_SECRET>)
  → paymentsEnabled? → so khớp secret (constant-time) → parseSePayWebhook (chỉ transferType 'in')
  → RPC apply_sepay_payment (service role)
      ghi payment_webhook_events (unique external_id → lặp thì trả 'duplicate')
      tìm mã đơn trong nội dung → insert payments(in) → tổng đã trả:
        ≥ cọc + total → 'paid' · ≥ cọc → 'deposit_paid' · còn lại 'unpaid'
        (không ghi đè refund_pending/refunded)
Đơn → completed: trigger create_deposit_refund_on_completion
      refund = min(cọc, tổng đã trả) > 0 → payments(out, deposit_refund, pending), payment_state = refund_pending
Đơn → cancelled/expired: trigger create_refund_on_cancellation
      số dư đã nhận > 0 → payments(out, cancellation_refund, pending), payment_state = refund_pending
      tiền đến SAU khi đơn huỷ/hết hạn → apply_sepay_payment tạo ngay cancellation_refund
Nhân viên chuyển tiền thủ công → bấm "Xác nhận đã hoàn tiền" → completeDepositRefund → RPC complete_deposit_refund → refunded
```

## 6. Kho và bảo trì (admin/staff)

- `/admin/kho`: thêm máy (`addAdminUnit`, admin), đổi state máy (`updateAdminUnitState`) — trigger
  `guard_product_unit_state_change` chặn retire khi còn đơn sống, chặn bypass bảo trì.
- `/admin/bao-tri`: `open_unit_maintenance` (từ chối nếu trùng reservation pending/confirmed trong
  cửa sổ bảo trì) và `close_unit_maintenance` (trả máy về available khi không còn record mở).

## 7. Đối tác

```text
Khách đăng nhập → /dang-ky-doi-tac → registerPartner()      features/partner/actions.ts
   service role: insert partners(status 'pending', commission 15%) → profiles.role = 'partner' (chỉ từ customer)
Admin /admin/doi-tac → approvePartner (status 'active') | rejectPartner (status 'rejected',
   archive sản phẩm active, role về customer)
Đối tác active → /partner/san-pham/them → savePartnerProduct()
   insert products (RLS is_active_partner_owner; trigger guard_partner_product_columns ép is_sample=false…)
   → service role tạo N product_units (asset_tag từ slug) → lỗi thì xoá product
   → revalidateTag('catalog')  (state 'active' = hiện ngay trên catalog)
/partner/don-thue, /partner/doanh-thue → loadPartnerOrders()  features/partner/server-data.ts
   service role đọc order_items theo product_id của đối tác (chỉ phần của họ)
   doanh thu = Σ line_total_vnd của đơn completed; phí = commission_rate%; tháng theo giờ VN (ngày completed)
```

Khách đặt sản phẩm đối tác đi qua **đúng luồng §3** như sản phẩm A.I.R; vận hành giao/nhận do
staff/admin thực hiện.

## 8. Trợ lý chat

```text
ChatAssistant (components/chat) → POST /api/chat
  kiểm tra content-type, ≤8KB, cùng origin → zod chatRequestSchema
  → consume_chat_rate_limit (12 req/phút/IP và /user; bắt buộc CHAT_RATE_LIMIT_SECRET)
  → action: searchProducts | checkAvailability (booking_calendar) | getOrderStatus/latestOrder (RLS)
     message: inferChatAction → FAQ (chat-engine) → OpenAI tool-choice (nếu AIR_ENABLE_CHAT_LLM) → FAQ
```

## 9. Tài khoản

- Hồ sơ: `features/account/actions.ts` (cập nhật `full_name`, `phone`).
- Sổ địa chỉ: RPC `save_customer_address` / `delete_customer_address` (một địa chỉ mặc định).
- Giấy tờ định danh (tắt mặc định): staff yêu cầu → khách upload (server kiểm tra byte ảnh, service
  role ghi Storage private) → `submit_identity_document` → staff `review_identity_document`.
