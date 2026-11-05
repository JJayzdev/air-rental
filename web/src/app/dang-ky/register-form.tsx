'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { registerAccount, type EmailOtpActionState } from '@/features/auth/actions'

const initialState: EmailOtpActionState = { message: '' }

export function RegisterForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(registerAccount, initialState)
  const nextQuery = next ? `?next=${encodeURIComponent(next)}` : ''

  if (state.sent && state.email) {
    return (
      <div className="rental-otp-status">
        <h2>Kiểm tra email của bạn</h2>
        <p>
          Đã gửi email xác nhận tới <strong>{state.email}</strong>.
        </p>
        <p>
          Mở email xác nhận từ <strong>A.I.R</strong> và bấm nút xác nhận, hoặc dùng mã OTP 6 chữ số
          trong email để đăng nhập.
        </p>
        <p className="rental-auth-actions">
          <Link className="primary" href={`/dang-nhap${nextQuery}`}>
            Nhập mã OTP để hoàn tất
          </Link>
        </p>
        <small>
          Không thấy email? Kiểm tra thư mục Spam hoặc Quảng cáo, sau đó đánh dấu “Không phải thư
          rác”.
        </small>
      </div>
    )
  }

  return (
    <form className="rental-form rental-register-form" action={action}>
      <input type="hidden" name="next" value={next} />

      <label htmlFor="register-name">Họ và tên</label>
      <input
        id="register-name"
        name="fullName"
        type="text"
        autoComplete="name"
        placeholder="Nguyễn Văn A"
        required
        minLength={2}
        maxLength={120}
      />

      <div className="rental-form-row">
        <div>
          <label htmlFor="register-email">Email</label>
          <input
            id="register-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="ban@example.com"
            required
            maxLength={254}
          />
        </div>
        <div>
          <label htmlFor="register-phone">Số điện thoại</label>
          <input
            id="register-phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            placeholder="0912345678"
            pattern="(0|\+84)(3|5|7|8|9)[0-9]{8}"
            required
          />
        </div>
      </div>

      <label htmlFor="register-address">Địa chỉ nhận máy</label>
      <input
        id="register-address"
        name="addressLine"
        type="text"
        autoComplete="street-address"
        placeholder="Số nhà, tên đường, tòa nhà"
        required
        minLength={5}
        maxLength={180}
      />

      <div className="rental-form-row rental-form-row-3">
        <div>
          <label htmlFor="register-ward">Phường / Xã</label>
          <input
            id="register-ward"
            name="ward"
            type="text"
            autoComplete="address-level3"
            required
            maxLength={100}
          />
        </div>
        <div>
          <label htmlFor="register-district">Quận / Huyện</label>
          <input
            id="register-district"
            name="district"
            type="text"
            autoComplete="address-level2"
            required
            maxLength={100}
          />
        </div>
        <div>
          <label htmlFor="register-province">Tỉnh / Thành phố</label>
          <input
            id="register-province"
            name="province"
            type="text"
            autoComplete="address-level1"
            required
            maxLength={100}
          />
        </div>
      </div>

      <div className="rental-checkbox">
        <input id="register-terms" name="acceptedTerms" type="checkbox" required />
        <label htmlFor="register-terms">
          Tôi đã đọc và đồng ý với{' '}
          <Link href="/chinh-sach/dieu-khoan-thue" target="_blank">
            Điều khoản thuê
          </Link>
          ,{' '}
          <Link href="/chinh-sach/bao-mat-du-lieu" target="_blank">
            Chính sách bảo mật
          </Link>{' '}
          và quy định xác minh danh tính của A.I.R.
        </label>
      </div>

      <button className="primary" type="submit" disabled={pending}>
        {pending ? 'Đang tạo tài khoản…' : 'Tạo tài khoản và gửi email xác nhận'}
      </button>

      {state.message && (
        <p aria-live="polite" className={state.error ? 'rental-error' : 'rental-message'}>
          {state.message}
        </p>
      )}

      <p className="rental-auth-switch">
        Đã có tài khoản? <Link href={`/dang-nhap${nextQuery}`}>Đăng nhập bằng OTP</Link>
      </p>
    </form>
  )
}
