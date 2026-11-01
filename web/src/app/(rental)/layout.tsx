import Link from 'next/link'
import { BrandMark } from '@/components/ui/Icons'
import { signOut } from '@/features/auth/actions'
import { getVerifiedAppRole } from '@/lib/supabase/auth'
import type { Metadata } from 'next'

export const metadata: Metadata = { robots: { index: false, follow: false } }

export default async function RentalLayout({ children }: { children: React.ReactNode }) {
  const { user, role } = await getVerifiedAppRole().catch(() => ({ user: null, role: null }))
  return (
    <>
      <header className="header">
        <div className="shell header-inner rental-header-inner">
          <Link className="plain logo-button" href="/san-pham" aria-label="A.I.R — sản phẩm">
            <span className="brand">
              <span className="brand-mark">
                <BrandMark />
              </span>
              <strong>A.I.R</strong>
            </span>
          </Link>
          <nav className="desktop-nav rental-site-nav" aria-label="Điều hướng đặt thuê">
            <Link href="/san-pham">Thiết bị</Link>
            <Link href="/gio-thue">Giỏ thuê</Link>
            {user && <Link href="/tai-khoan">Tài khoản</Link>}
            {user && <Link href="/don-thue">Đơn của tôi</Link>}
            {user && <Link href="/yeu-thich">Yêu thích</Link>}
            {(role === 'staff' || role === 'admin') && <Link href="/quan-ly-don">Quản lý đơn</Link>}
            {(role === 'staff' || role === 'admin') && (
              <Link href="/quan-ly-giay-to">Giấy tờ cần xem</Link>
            )}
            <Link href="/">Bản demo</Link>
          </nav>
          {user ? (
            <form action={signOut} className="rental-signout">
              <button type="submit">Đăng xuất</button>
            </form>
          ) : (
            <Link className="rental-signout" href="/dang-nhap">
              Đăng nhập
            </Link>
          )}
        </div>
      </header>
      {children}
      <footer className="rental-footer">
        <div className="shell">A.I.R — Thiết bị công nghệ cho thuê.</div>
      </footer>
    </>
  )
}
