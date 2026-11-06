# Tài khoản demo A.I.R

Ba tài khoản dùng chung cho trình diễn, mỗi tài khoản vào đúng khu vực theo vai trò.

| Email               | Vai trò   | Trang mặc định sau đăng nhập |
| ------------------- | --------- | ---------------------------- |
| `customer@air.com`  | Khách hàng | `/don-thue`                  |
| `partner@air.com`   | Đối tác    | `/partner`                   |
| `admin@air.com`     | Quản trị   | `/admin`                     |

Mã OTP cố định: **`111111`**.

## Cách hoạt động

- Khi nhập email demo, form đăng nhập không gửi email thật mà báo dùng mã `111111`.
- Server xác minh mã demo, sau đó tạo phiên đăng nhập thật qua Supabase Admin API.
- Chỉ đúng 3 email trên được hưởng luồng demo.

## Biến môi trường

```env
# Bật tài khoản demo. Ở production phải đặt true.
AIR_DEMO_LOGIN=true
# Có thể đổi mã, mặc định là 111111.
AIR_DEMO_OTP=111111
# Bắt buộc để tạo phiên đăng nhập demo.
SUPABASE_SERVICE_ROLE_KEY=<service role key>
```

Đặt `AIR_DEMO_LOGIN=false` để tắt hoàn toàn luồng demo.

## Tạo hoặc cập nhật tài khoản

```powershell
$env:NEXT_PUBLIC_SUPABASE_URL="https://<project>.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="<service role key>"
node scripts/seed-demo-accounts.mjs
```

Script tạo/cập nhật 3 tài khoản, hồ sơ vai trò, hồ sơ đối tác đang hoạt động và 2 sản
phẩm demo cho `partner@air.com`. Chạy lại nhiều lần vẫn an toàn.

## Kiểm tra nhanh

```powershell
node scripts/check-demo-accounts.mjs
```

Lệnh này kiểm tra mỗi tài khoản có tạo được phiên đăng nhập từ mã OTP cố định hay không.

> **Lưu ý bảo mật:** đây là tài khoản công khai có mã cố định, không dùng cho dữ liệu thật.
> Chỉ bật `AIR_DEMO_LOGIN=true` trên môi trường trình diễn và tắt khi không cần.
