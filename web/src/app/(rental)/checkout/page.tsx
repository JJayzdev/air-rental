import Link from 'next/link'
import { RentalCartPanel } from '@/features/cart/rental-cart-panel'
import { requireVerifiedUser } from '@/lib/supabase/auth'
import { getCatalog } from '@/features/products/catalog-server'
import { supabaseIsConfigured } from '@/lib/supabase/server'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: 'Xác nhận thuê — A.I.R',
}

export default async function CheckoutPage() {
  if (!supabaseIsConfigured()) {
    return (
      <main className="shell rental-page">
        <h1>Đặt thuê chưa được kết nối</h1>
        <p className="rental-notice">Hiện chưa thể đăng nhập hoặc tạo đơn thuê.</p>
        <Link href="/san-pham">Quay lại thiết bị</Link>
      </main>
    )
  }
  const { supabase, user } = await requireVerifiedUser('/checkout')
  const catalog = await getCatalog()
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('full_name,phone')
    .eq('id', user.id)
    .maybeSingle()
  if (profileError) throw new Error('Không tải được thông tin liên hệ đã lưu. Vui lòng thử lại.')
  return (
    <main className="shell rental-page">
      <nav className="rental-breadcrumb">
        <Link href="/gio-thue">Giỏ thuê</Link>
        <span> / Xác nhận</span>
      </nav>
      <div className="rental-heading">
        <p className="eyebrow">Đơn thuê</p>
        <h1>Thông tin nhận thiết bị</h1>
      </div>
      <p className="rental-notice">
        Yêu cầu thuê sẽ giữ thiết bị trong 30 phút để chờ xác nhận. Chưa thu tiền trực tuyến.
      </p>
      <RentalCartPanel
        products={catalog.products}
        checkout
        contactPrefill={{
          name: profile?.full_name ?? '',
          phone: profile?.phone ?? '',
          address: '',
        }}
      />
    </main>
  )
}
