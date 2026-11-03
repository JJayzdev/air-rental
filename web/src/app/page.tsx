import Link from 'next/link'
import type { Metadata } from 'next'
import { BrandMark } from '@/components/ui/Icons'

export const metadata: Metadata = {
  title: 'A.I.R — đồ án mô phỏng cho thuê thiết bị',
  description: 'Đồ án học tập về giao diện và luồng phần mềm mô phỏng cho thuê thiết bị công nghệ.',
}

export default function HomePage() {
  return (
    <>
      <header className="header">
        <div className="shell header-inner catalog-header-inner">
          <Link className="plain logo-button" href="/" aria-label="A.I.R — giới thiệu đồ án">
            <span className="brand">
              <span className="brand-mark">
                <BrandMark />
              </span>
              <strong>A.I.R</strong>
            </span>
          </Link>
          <nav className="desktop-nav catalog-site-nav" aria-label="Điều hướng đồ án">
            <Link href="/san-pham">Catalog</Link>
            <Link href="/huong-dan">Hướng dẫn</Link>
            <Link href="/chinh-sach">Kịch bản</Link>
            <Link href="/demo">Prototype cũ</Link>
          </nav>
        </div>
      </header>
      <main className="shell rental-page academic-home">
        <section className="academic-hero">
          <p className="eyebrow">Đồ án học tập · Prototype UI/UX</p>
          <h1>A.I.R — mô phỏng luồng thuê thiết bị công nghệ</h1>
          <p className="academic-lead">
            Khám phá cách một giao diện có thể dẫn người dùng từ catalog đến giỏ thuê và tài khoản.
            Bản trình bày chính dùng Next.js; các bước backend chỉ chạy với fixture Supabase local.
          </p>
          <p className="rental-notice" role="note">
            Đây là sản phẩm học tập. Catalog mặc định dùng dữ liệu mẫu; không có thiết bị, giao
            dịch, khách hàng hay dịch vụ thương mại được xác nhận. Sản phẩm sample không thể đặt
            thuê.
          </p>
          <div className="academic-hero-actions">
            <Link className="primary" href="/san-pham">
              Khám phá catalog mẫu
            </Link>
            <Link className="secondary" href="/huong-dan">
              Cách demo đồ án
            </Link>
          </div>
        </section>

        <nav aria-label="Các khu vực của đồ án" className="academic-demo-grid">
          <Link className="rental-panel" href="/san-pham">
            <span className="eyebrow">Catalog chính</span>
            <h2>Khám phá thiết bị mẫu</h2>
            <p>Tìm kiếm, lọc danh mục và xem thông tin tham khảo. Sample không bookable.</p>
            <span className="guide-read-more">Mở catalog →</span>
          </Link>
          <Link className="rental-panel" href="/gio-thue">
            <span className="eyebrow">Luồng thuê</span>
            <h2>Giỏ thuê</h2>
            <p>Giỏ Next.js tách riêng; checkout cần tài khoản, sản phẩm test và Supabase local.</p>
            <span className="guide-read-more">Xem giỏ →</span>
          </Link>
          <Link className="rental-panel" href="/don-thue">
            <span className="eyebrow">Tài khoản</span>
            <h2>Đơn thuê test</h2>
            <p>Đăng nhập local để xem đơn fixture thuộc tài khoản đó.</p>
            <span className="guide-read-more">Mở đơn thuê →</span>
          </Link>
          <Link className="rental-panel" href="/huong-dan">
            <span className="eyebrow">Tài liệu</span>
            <h2>Hướng dẫn đồ án</h2>
            <p>Xem cách demo, các giả định và giới hạn dữ liệu.</p>
            <span className="guide-read-more">Đọc hướng dẫn →</span>
          </Link>
          <Link className="rental-panel" href="/chinh-sach">
            <span className="eyebrow">Tình huống học tập</span>
            <h2>Chính sách mô phỏng</h2>
            <p>Năm kịch bản cho bài tập, không phải điều kiện kinh doanh thật.</p>
            <span className="guide-read-more">Xem kịch bản →</span>
          </Link>
          <Link className="rental-panel" href="/demo">
            <span className="eyebrow">Prototype cũ</span>
            <h2>Bản demo giao diện local</h2>
            <p>Trải nghiệm riêng dùng localStorage và dữ liệu hư cấu trong trình duyệt.</p>
            <span className="guide-read-more">Mở prototype →</span>
          </Link>
        </nav>
      </main>
      <footer className="catalog-site-footer">
        <div className="shell copyright">
          A.I.R · Prototype UI/UX phi thương mại · Dữ liệu minh họa
        </div>
      </footer>
    </>
  )
}
