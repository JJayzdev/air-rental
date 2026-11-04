import Link from 'next/link'
import { BrandMark } from '@/components/ui/Icons'

export function SiteFooter() {
  return (
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
            Thuê laptop, điện thoại, máy ảnh, tablet và phụ kiện công nghệ theo ngày. Đặt lịch trực
            tuyến, nhận máy linh hoạt, không cần mua.
          </p>
        </div>
        <div>
          <b>Khám phá</b>
          <Link href="/san-pham">Tất cả thiết bị</Link>
          <Link href="/san-pham?danh-muc=laptop">Laptop</Link>
          <Link href="/san-pham?danh-muc=camera">Máy ảnh</Link>
          <Link href="/huong-dan">Hướng dẫn chọn máy</Link>
        </div>
        <div>
          <b>Hỗ trợ</b>
          <Link href="/gio-thue">Giỏ thuê</Link>
          <Link href="/don-thue">Đơn thuê của tôi</Link>
          <Link href="/chinh-sach">Điều khoản và chính sách</Link>
          <Link href="/chinh-sach/phan-anh">Gửi phản ánh</Link>
        </div>
      </div>
      <div className="shell copyright">
        © 2026 A.I.R Rental · Thiết bị công nghệ cho thuê theo ngày
      </div>
    </footer>
  )
}
