import Link from 'next/link'
import { BrandMark } from '@/components/ui/Icons'

export default function GuideLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="header">
        <div className="shell header-inner catalog-header-inner">
          <Link className="plain logo-button" href="/" aria-label="A.I.R — trang chủ">
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
            <Link href="/">Trang chủ</Link>
            <Link href="/san-pham">Sản phẩm</Link>
            <Link href="/huong-dan" aria-current="page">
              Hướng dẫn
            </Link>
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
            <p>
              Hướng dẫn tham khảo chung. Thông tin thiết bị, giá và khả năng cung cấp cần được xác
              nhận theo từng sản phẩm.
            </p>
          </div>
          <div>
            <b>Khám phá</b>
            <Link href="/san-pham">Danh mục sản phẩm</Link>
            <Link href="/huong-dan">Tất cả hướng dẫn</Link>
          </div>
        </div>
        <div className="shell copyright">© 2026 A.I.R — Prototype UI/UX phi thương mại.</div>
      </footer>
    </>
  )
}
