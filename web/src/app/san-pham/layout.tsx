import Link from 'next/link'
import { BrandMark } from '@/components/ui/Icons'

export default function CatalogLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="header">
        <div className="shell header-inner catalog-header-inner">
          <Link className="plain logo-button" href="/" aria-label="A.I.R — trang chủ demo">
            <span className="brand">
              <span className="brand-mark">
                <BrandMark />
              </span>
              <strong>A.I.R</strong>
            </span>
          </Link>
          <nav className="desktop-nav catalog-site-nav" aria-label="Điều hướng chính">
            <Link href="/">Trang chủ</Link>
            <Link href="/san-pham" aria-current="page">
              Sản phẩm
            </Link>
            <Link href="/gio-thue">Giỏ thuê</Link>
            <Link href="/">Mở bản demo</Link>
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
              Giá và số lượng mẫu chỉ để tham khảo. Chỉ sản phẩm đã xác nhận có hàng mới nhận đặt
              thuê.
            </p>
          </div>
          <div>
            <b>Khám phá</b>
            <Link href="/san-pham">Tất cả sản phẩm</Link>
            <Link href="/">Mở bản demo</Link>
          </div>
          <div>
            <b>Thông tin</b>
            <p>Thông số và ảnh tham khảo có liên kết nguồn trên từng sản phẩm.</p>
          </div>
        </div>
        <div className="shell copyright">© 2025 A.I.R — Prototype UI/UX phi thương mại.</div>
      </footer>
    </>
  )
}
