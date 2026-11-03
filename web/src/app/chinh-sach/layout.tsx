import Link from 'next/link'
import type { Metadata } from 'next'
import { BrandMark } from '@/components/ui/Icons'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function PolicyLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="header">
        <div className="shell header-inner catalog-header-inner">
          <Link className="plain logo-button" href="/san-pham" aria-label="A.I.R — sản phẩm">
            <span className="brand">
              <span className="brand-mark">
                <BrandMark />
              </span>
              <strong>A.I.R</strong>
            </span>
          </Link>
          <nav
            className="desktop-nav catalog-site-nav guide-site-nav"
            aria-label="Điều hướng chính"
          >
            <Link href="/">Giới thiệu đồ án</Link>
            <Link href="/demo">Prototype cũ</Link>
            <Link href="/san-pham">Sản phẩm</Link>
            <Link href="/huong-dan">Hướng dẫn</Link>
            <Link href="/gio-thue">Giỏ thuê</Link>
          </nav>
        </div>
      </header>
      {children}
      <footer className="catalog-site-footer">
        <div className="shell footer-grid catalog-footer-grid">
          <div>
            <div className="brand brand-light">
              <span className="brand-mark">
                <BrandMark />
              </span>
              <strong>A.I.R</strong>
            </div>
            <p>Các kịch bản chính sách chỉ phục vụ học tập; không phải nội dung doanh nghiệp.</p>
          </div>
          <div>
            <b>Khám phá</b>
            <Link href="/san-pham">Danh mục sản phẩm</Link>
            <Link href="/gio-thue">Luồng đặt thuê</Link>
            <Link href="/">Bản demo</Link>
          </div>
          <div>
            <b>Kịch bản mô phỏng</b>
            <Link href="/chinh-sach">Tổng quan</Link>
            <Link href="/chinh-sach/dieu-khoan-thue">Điều khoản thuê</Link>
            <Link href="/chinh-sach/huy-don-hoan-coc">Hủy và hoàn tiền</Link>
            <Link href="/chinh-sach/giao-nhan-kiem-tra">Giao nhận</Link>
            <Link href="/chinh-sach/bao-mat-du-lieu">Quyền riêng tư và AI</Link>
            <Link href="/chinh-sach/phan-anh">Phản ánh lỗi</Link>
          </div>
        </div>
        <div className="shell copyright">© 2026 A.I.R — Prototype UI/UX phi thương mại.</div>
      </footer>
    </>
  )
}
