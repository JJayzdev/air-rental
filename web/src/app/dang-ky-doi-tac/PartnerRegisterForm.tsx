'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { registerPartner } from '@/features/partner/actions'

export function PartnerRegisterForm() {
  const [state, formAction, isPending] = useActionState(registerPartner, {
    success: false,
    error: null,
  })

  return (
    <>
      {state?.success && (
        <p className="rental-message" role="status">
          Đã gửi yêu cầu đăng ký đối tác. Chúng tôi sẽ duyệt hồ sơ và liên hệ bạn qua email trong
          thời gian sớm nhất. <Link href="/partner">Mở khu vực đối tác</Link> để theo dõi trạng thái
          duyệt.
        </p>
      )}

      {state?.error && (
        <p className="rental-error" role="alert">
          {state.error}
        </p>
      )}

      {!state?.success && (
        <form action={formAction} className="rental-form rental-register-form">
          <label>
            Họ và tên
            <input
              name="fullName"
              type="text"
              placeholder="Nguyễn Văn A"
              required
              minLength={2}
              maxLength={120}
            />
          </label>
          <label>
            Email
            <input
              name="email"
              type="email"
              placeholder="ban@example.com"
              required
              maxLength={254}
            />
          </label>
          <label>
            Số điện thoại
            <input
              name="phone"
              type="tel"
              placeholder="0901234567"
              required
              minLength={6}
              maxLength={20}
            />
          </label>
          <label>
            Tên doanh nghiệp / cá nhân
            <input
              name="companyName"
              type="text"
              placeholder="Cửa hàng thiết bị ABC"
              required
              minLength={2}
              maxLength={120}
            />
          </label>
          <label>
            Mã số thuế (tùy chọn)
            <input name="taxCode" type="text" placeholder="0123456789" maxLength={30} />
          </label>
          <label>
            Mô tả đồ sở hữu muốn cho thuê
            <textarea
              name="description"
              rows={3}
              placeholder="Ví dụ: 2 máy MacBook Air M3, 1 máy ảnh Sony A6400…"
              maxLength={1000}
            />
          </label>
          <button className="primary" type="submit" disabled={isPending}>
            {isPending ? 'Đang gửi…' : 'Gửi yêu cầu đăng ký'}
          </button>
        </form>
      )}
    </>
  )
}
