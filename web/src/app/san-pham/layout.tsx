import Link from 'next/link'
import { BrandMark } from '@/components/ui/Icons'
import ChatAssistant from '@/components/chat/ChatAssistant'
import { getChatConfiguration } from '@/lib/chat-config'

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
            <Link href="/">Giới thiệu đồ án</Link>
            <Link href="/san-pham" aria-current="page">
              Catalog
            </Link>
            <Link href="/huong-dan">Hướng dẫn</Link>
            <Link href="/gio-thue">Giỏ thuê</Link>
            <Link href="/demo">Prototype cũ</Link>
            <Link href="/chinh-sach">Kịch bản</Link>
          </nav>
        </div>
      </header>
      {children}
      <ChatAssistant {...getChatConfiguration()} />
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
              Catalog và giá là nội dung học tập. Bài checkout chỉ dùng fixture local, không giao
              dịch hoặc giao nhận thật.
            </p>
          </div>
          <div>
            <b>Khám phá</b>
            <Link href="/san-pham">Tất cả sản phẩm</Link>
            <Link href="/huong-dan">Hướng dẫn thuê</Link>
            <Link href="/demo">Prototype local</Link>
          </div>
          <div>
            <b>Thông tin</b>
            <p>Thông số và ảnh tham khảo có liên kết nguồn trên từng sản phẩm.</p>
          </div>
        </div>
        <div className="shell copyright">
          A.I.R — Prototype UI/UX phi thương mại · Dữ liệu minh họa
        </div>
      </footer>
    </>
  )
}
