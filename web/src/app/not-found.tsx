import Link from 'next/link'
import type { Metadata } from 'next'
import { SiteFooter } from '@/components/layout/site-footer'
import { SiteHeader } from '@/components/layout/site-header'

export const metadata: Metadata = {
  title: 'Không tìm thấy trang',
  robots: { index: false, follow: true },
}

/** Trang 404 chung. Trước đây là trang mặc định tiếng Anh của Next, không có header hay lối về. */
export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="shell rental-page">
        <section className="rental-panel rental-empty" role="status">
          <p className="eyebrow">Lỗi 404</p>
          <h1>Không tìm thấy trang</h1>
          <p>Đường dẫn có thể đã thay đổi hoặc trang không còn tồn tại.</p>
          <Link className="primary" href="/san-pham">
            Xem thiết bị cho thuê
          </Link>
          <Link href="/">Về trang chủ</Link>
        </section>
      </main>
      <SiteFooter />
    </>
  )
}
