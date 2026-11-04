import Link from 'next/link'
import { RentalCartPanel } from '@/features/cart/rental-cart-panel'
import { getCatalog } from '@/features/products/catalog-server'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: 'Giỏ thuê',
}

export default async function RentalCartPage() {
  const catalog = await getCatalog()
  const bookableProducts = catalog.products.filter((product) => !product.isSample)
  return (
    <main className="shell rental-page">
      <nav className="rental-breadcrumb">
        <Link href="/san-pham">Sản phẩm</Link>
        <span> / Giỏ thuê</span>
      </nav>
      <div className="rental-heading">
        <p className="eyebrow">Giỏ thiết bị A.I.R</p>
        <h1>Chọn lịch thuê</h1>
        <p>Kiểm tra thiết bị, chọn ngày nhận trả và xem báo giá trước khi xác nhận.</p>
      </div>
      {catalog.mode === 'local-sample' && (
        <p className="rental-notice">
          Danh mục đang ở chế độ xem trước cục bộ. Kết nối Supabase để nhận đặt thuê và kiểm tra tồn
          kho thật.
        </p>
      )}
      {bookableProducts.length === 0 && catalog.mode !== 'local-sample' && (
        <p className="rental-notice">
          Các thiết bị hiện tại đang được bảo trì hoặc chưa mở nhận đặt thuê. Vui lòng chọn thiết bị
          khác.
        </p>
      )}
      <RentalCartPanel products={catalog.products} />
    </main>
  )
}
