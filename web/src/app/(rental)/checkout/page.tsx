import Link from 'next/link'
import { RentalCartPanel } from '@/features/cart/rental-cart-panel'
import { requireVerifiedUser } from '@/lib/supabase/auth'
import { getCatalog } from '@/features/products/catalog-server'
import { listActiveDeliveryZones } from '@/features/pricing/server-data'
import { supabaseIsConfigured } from '@/lib/supabase/server'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: 'Xác nhận thuê',
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
  const [profileResult, addressResult, deliveryZones] = await Promise.all([
    supabase.from('profiles').select('full_name,phone').eq('id', user.id).maybeSingle(),
    // Sổ địa chỉ (/tai-khoan/dia-chi): ưu tiên địa chỉ mặc định, sau đó địa chỉ cũ nhất.
    supabase
      .from('customer_addresses')
      .select('recipient_name,phone,address_line,ward,district,province')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle(),
    listActiveDeliveryZones(supabase),
  ])
  const { data: profile, error: profileError } = profileResult
  if (profileError) throw new Error('Không tải được thông tin liên hệ đã lưu. Vui lòng thử lại.')
  // Địa chỉ chỉ dùng để điền sẵn; lỗi đọc không chặn việc đặt thuê.
  const savedAddress = addressResult.error ? null : addressResult.data
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
        Yêu cầu thuê sẽ giữ thiết bị trong 30 phút để A.I.R xác nhận tồn kho và liên hệ với bạn.
      </p>
      <p className="rental-policy-note">
        Bằng việc gửi yêu cầu, bạn đồng ý với{' '}
        <Link href="/chinh-sach/dieu-khoan-thue">điều khoản thuê</Link> và{' '}
        <Link href="/chinh-sach/huy-don-hoan-coc">chính sách hủy đơn, hoàn cọc</Link>.
      </p>
      <RentalCartPanel
        products={catalog.products}
        checkout
        deliveryZones={deliveryZones}
        contactPrefill={{
          name: profile?.full_name || savedAddress?.recipient_name || '',
          phone: profile?.phone || savedAddress?.phone || '',
          address: savedAddress
            ? [
                savedAddress.address_line,
                savedAddress.ward,
                savedAddress.district,
                savedAddress.province,
              ].join(', ')
            : '',
        }}
      />
    </main>
  )
}
