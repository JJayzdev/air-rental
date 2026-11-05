/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from 'next/navigation'
import { getVerifiedAppRole } from '@/lib/supabase/auth'
import type { Order } from '@/types'
import OrdersView from '@/views/OrdersView'

export const dynamic = 'force-dynamic'

export default async function PartnerDonThuePage() {
  const { user, role, supabase } = await getVerifiedAppRole()
  if (!user) redirect('/dang-nhap?next=%2Fpartner%2Fdon-thue')
  if (role !== 'partner') redirect('/don-thue')

  // Lấy đơn thuê của partner dựa trên partner_id
  const partnerResult = await supabase
    .from('partners')
    .select('id, display_name')
    .eq('user_id', user.id)
    .maybeSingle()
  const partner = (partnerResult as any).data

  // Fetch rental orders for this partner's products
  // Orders are linked to products via product_id, and products belong to partner
  let orders: Order[] = []
  if (partner?.id) {
    const ordersResult = await supabase
      .from('rental_orders')
      .select(
        `
        id,
        code,
        product_id,
        user_id,
        start_date,
        end_date,
        total_amount,
        status,
        created_at
      `,
      )
      .eq('product_id', partner.id) // This might need adjustment based on actual schema
      .order('start_date', { ascending: false })

    // Transform to Order type format
    const rawOrders = (ordersResult as any).data ?? []
    orders = rawOrders.map((o: any) => ({
      code: o.code,
      status: o.status,
      start: o.start_date,
      end: o.end_date,
      total: o.total_amount ?? 0,
      items: [], // Items would need separate fetch; placeholder for now
    }))
  }

  return (
    <main className="partner-page">
      <header className="partner-page-head">
        <div>
          <p className="partner-eyebrow">Quản lý đơn thuê</p>
          <h1>Đơn thuê của tôi</h1>
          <p className="partner-page-sub">
            Xem và quản lý các đơn thuê của sản phẩm bạn đang cho thuê.
          </p>
        </div>
      </header>

      <section className="partner-block">
        <OrdersView orders={orders} onBrowse={() => {}} />
      </section>
    </main>
  )
}
