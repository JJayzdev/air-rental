# GĐ 3 — Tài khoản, yêu thích và giấy tờ tùy chọn

**Trạng thái:** xong phần code và unit test local. 48 pgTAP của tài khoản đã viết nhưng **chưa chạy
lại** vì Docker Desktop tắt; chưa xác minh OTP với SMS provider thật.

## Phạm vi đã làm

| Hạng mục | Nơi triển khai | Ghi chú |
| --- | --- | --- |
| Hồ sơ liên hệ | `/tai-khoan`, `features/account/actions.ts` | RLS + column grant chỉ cho sửa `full_name`, `phone`; `role` bất biến |
| Sổ địa chỉ | `/tai-khoan/dia-chi`, RPC `save_customer_address` / `delete_customer_address` | Một địa chỉ mặc định nhờ unique index; xóa địa chỉ mặc định tự chuyển sang địa chỉ cũ nhất |
| Yêu thích đồng bộ | `/yeu-thich`, `features/favorites/*`, bảng `user_favorites` | Server action thêm/bỏ, nút lưu ở catalog và trang chi tiết, owner-scoped RLS |
| OTP điện thoại | `/dang-nhap`, `features/auth/actions.ts` | Opt-in `AIR_ENABLE_PHONE_OTP`; session refresh trong `middleware.ts` |
| Giấy tờ định danh tùy chọn | `/tai-khoan/giay-to`, `/quan-ly-giay-to`, `features/account/identity-*` | Gate `AIR_ENABLE_IDENTITY_DOCUMENTS` + service role; bucket private, sharp chuẩn hoá ảnh |
| Guard theo role | `/admin`, `/quan-ly-don`, `/quan-ly-giay-to` | Chặn ở server component/route, không phải middleware |

## Quyết định kỹ thuật

- **Middleware chỉ refresh session.** Việc phân quyền nằm ở page/route để tránh phụ thuộc thứ tự
  middleware và để mỗi trang tự redirect về đúng luồng.
- **Favorites cho phép sản phẩm `active`, kể cả `is_sample`.** Catalog local chỉ có dữ liệu mẫu;
  giữ điều kiện `not is_sample` sẽ khiến tính năng không thể dùng thử. `is_sample` chỉ là nhãn dữ
  liệu, không phải ranh giới bảo mật. Sản phẩm `draft`/`archived` vẫn bị RLS chặn.
- **Giấy tờ mặc định tắt.** `identity_document_settings.enabled = false`; bật cả cờ môi trường và
  bản ghi DB mới hoạt động. Không bắt buộc để đặt thuê.
- **Fixture SMS đã khôi phục.** `supabase/config.toml` trở về bản trước GĐ 3 (không còn `test_otp`
  và Twilio giả) sau khi chạy thử OTP local.

## Kiểm thử

| Lệnh | Kết quả hiện tại |
| --- | --- |
| `cd web && npm test` | 29/29 pass (11 file, gồm 2 test flash-path favorites) |
| `cd web && npm run lint` | sạch |
| `cd web && npm run typecheck` | sạch |
| `supabase test db` | **chưa chạy** — cần Docker; tổng 140 assertion (34 + 9 + 49 + 48) |
| `scripts/check-booking-concurrency.mjs` | **chưa chạy** — cần Docker |

## Cách bật local

1. `supabase start` rồi `supabase db reset` (migrations + seed 24 sản phẩm mẫu).
2. Tạo `web/.env.local` từ `web/.env.example` với URL/anon key local.
3. OTP điện thoại: đặt `AIR_ENABLE_PHONE_OTP=true` **và** cấu hình SMS provider trong
   `supabase/config.toml`; nếu không, dùng magic link email.
4. Giấy tờ: đặt `AIR_ENABLE_IDENTITY_DOCUMENTS=true`, cung cấp `SUPABASE_SERVICE_ROLE_KEY`, rồi
   `update public.identity_document_settings set enabled = true`.

## Giới hạn còn lại

- Chưa có SMS provider thật; local từng dùng `test_otp` tạm và đã gỡ.
- Ảnh giấy tờ lưu ở bucket private, chỉ staff/admin xem qua signed URL; chưa có quy trình xóa theo
  thời hạn lưu trữ.
- `npm audit` còn 1 high (postcss qua `next`) và 16 moderate (chuỗi ESLint/minimatch); xem
  `docs/gd3-npm-audit.json`.
- Deploy preview bỏ qua theo quyết định; nghiệm thu bằng `npm run build && npm start` local.
