import Link from 'next/link'
import { redirect } from 'next/navigation'
import { registerPartner } from '@/features/partner/actions'
import { getVerifiedAppRole } from '@/lib/supabase/auth'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: 'Đăng ký đối tác',
}

export default async function PartnerRegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>
}) {
  const { user } = await getVerifiedAppRole().catch(() => ({ user: null }))
  if (user) redirect('/partner')
  const params = await searchParams
  return (
    <main className="shell rental-page">
      <nav className="rental-breadcrumb">
        <Link href="/">Trang chủ</Link>
        <span> / Đăng ký đối tác</span>
      </nav>
      <section className="rental-panel rental-auth-panel rental-register-panel">
        <p className="eyebrow">Đăng ký đối tác A.I.R</p>
        <h1>Đăng ký trở thành đối tác</h1>
        <p>
          Bạn có thiết bị rảnh rỗi (laptop, máy ảnh, điện thoại, tablet, phụ kiện…)? Đăng ký đối tác
          để đưa thiết bị của bạn lên sàn cho thuê A.I.R và nhận doanh thu từ mỗi đơn thuê.
        </p>
        {params.sent === '1' && (
          <p className="rental-message" role="status">
            Đã gửi yêu cầu đăng ký đối tác. Chúng tôi sẽ duyệt hồ sơ và liên hệ bạn qua email trong
            thời gian sớm nhất.
          </p>
        )}
        {params.error === 'invalid' && (
          <p className="rental-error" role="alert">
            Vui lòng kiểm tra lại thông tin đăng ký.
          </p>
        )}
        {params.error === 'auth' && (
          <p className="rental-error" role="alert">
            Không tạo được tài khoản. Email có thể đã được sử dụng.
          </p>
        )}
        {params.error === 'db' && (
          <p className="rental-error" role="alert">
            Lưu hồ sơ đối tác không thành công. Vui lòng thử lại sau.
          </p>
        )}
        <form action={registerPartner} className="rental-form rental-register-form">
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
          <label>
            Mật khẩu
            <input name="password" type="password" required minLength={6} maxLength={128} />
          </label>
          <div className="rental-admin-check">
            <input name="acceptedTerms" type="checkbox" required />
            <span>
              Tôi đồng ý với <Link href="/chinh-sach">điều khoản thuê</Link> và{' '}
              <Link href="/chinh-sach">chính sách bảo mật</Link>.
            </span>
          </div>
          <button className="primary" type="submit">
            Gửi yêu cầu đăng ký
          </button>
        </form>
        <p className="rental-auth-switch">
          Đã có tài khoản? <Link href="/dang-nhap">Đăng nhập</Link>
        </p>
      </section>
    </main>
  )
}
