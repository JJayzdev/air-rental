import Link from 'next/link'
import { RentalCartPanel } from '@/features/cart/rental-cart-panel'
import { getCatalog } from '@/features/products/catalog-server'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: 'Giỏ thuê — A.I.R',
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
        <p>Giỏ thuê này được lưu riêng trên trình duyệt và tách khỏi giỏ demo.</p>
      </div>
      {catalog.mode === 'local-sample' && (
        <p className="rental-notice">
          Danh mục đang dùng dữ liệu mẫu. Chưa có thiết bị thật để nhận đặt thuê.
        </p>
      )}
      {bookableProducts.length === 0 && catalog.mode !== 'local-sample' && (
        <p className="rental-notice">
          Hiện chưa có thiết bị nào được xác nhận sẵn sàng nhận đặt thuê.
        </p>
      )}
      <RentalCartPanel products={catalog.products} />
    </main>
  )
}
