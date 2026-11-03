import Link from 'next/link'
import { BrandMark } from '@/components/ui/Icons'
import { signOut } from '@/features/auth/actions'
import { getVerifiedAppRole } from '@/lib/supabase/auth'
import type { Metadata } from 'next'
import ChatAssistant from '@/components/chat/ChatAssistant'
import { getChatConfiguration } from '@/lib/chat-config'

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
            <Link href="/san-pham">Catalog</Link>
            <Link href="/huong-dan">Hướng dẫn</Link>
            <Link href="/gio-thue">Giỏ thuê</Link>
            {user && <Link href="/tai-khoan">Tài khoản</Link>}
            {user && <Link href="/don-thue">Đơn của tôi</Link>}
            {user && <Link href="/yeu-thich">Yêu thích</Link>}
            {(role === 'staff' || role === 'admin') && <Link href="/quan-ly-don">Quản lý đơn</Link>}
            {(role === 'staff' || role === 'admin') && (
              <Link href="/quan-ly-giay-to">Giấy tờ cần xem</Link>
            )}
            {(role === 'staff' || role === 'admin') && <Link href="/admin">Quản trị</Link>}
            <Link href="/">Giới thiệu đồ án</Link>
            <Link href="/demo">Prototype cũ</Link>
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
      <ChatAssistant {...getChatConfiguration()} />
      <footer className="rental-footer">
        <div className="shell rental-footer-inner">
          <span>A.I.R — Prototype đồ án · Dữ liệu và luồng thuê giả lập.</span>
          <nav aria-label="Thông tin và điều hướng">
            <Link href="/san-pham">Danh mục</Link>
            <Link href="/gio-thue">Giỏ thuê</Link>
            <Link href="/">Giới thiệu đồ án</Link>
            <Link href="/chinh-sach">Kịch bản mô phỏng</Link>
          </nav>
        </div>
      </footer>
    </>
  )
}
