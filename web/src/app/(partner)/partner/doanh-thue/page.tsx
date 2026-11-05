/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from 'next/navigation'
import { getVerifiedAppRole } from '@/lib/supabase/auth'
import { money } from '@/lib/format'

export const dynamic = 'force-dynamic'

export default async function PartnerDoanhThuPage() {
  const { user, role, supabase } = await getVerifiedAppRole()
  if (!user) redirect('/dang-nhap?next=%2Fpartner%2Fdoanh-thue')
  if (role !== 'partner') redirect('/don-thue')

  // Lấy partner info
  const partnerResult = await supabase
    .from('partners')
    .select('id, commission_rate, status')
    .eq('user_id', user.id)
    .maybeSingle()
  const partner = (partnerResult as any).data

  // Lấy tất cả đơn thuê thành công của partner's products
  let totalRevenue = 0
  let completedOrders = 0
  let pendingOrders = 0

  if (partner?.id) {
    const ordersResult = await supabase
      .from('rental_orders')
      .select(
        `
        id,
        code,
        total_amount,
        status,
        payment_state,
        created_at
      `,
      )
      .eq('product_id', partner.id)
      .order('created_at', { ascending: false })

    const rawOrders = (ordersResult as any).data ?? []
    completedOrders = rawOrders.filter((o: any) => o.status === 'completed').length
    pendingOrders = rawOrders.filter((o: any) => o.status !== 'completed').length

    totalRevenue = rawOrders
      .filter((o: any) => o.payment_state === 'paid' || o.status === 'completed')
      .reduce((sum: number, o: any) => sum + (o.total_amount ?? 0), 0)
  }

  return (
    <main className="partner-page">
      <header className="partner-page-head">
        <div>
          <p className="partner-eyebrow">Doanh thu</p>
          <h1>Doanh thu của tôi</h1>
          <p className="partner-page-sub">Tổng quan về thu nhập từ các đơn thuê thành công.</p>
        </div>
      </header>

      <section className="partner-block">
        <div className="partner-block-head">
          <div>
            <h2>Tổng quan doanh thu</h2>
            <p>Thu nhập từ các đơn thuê thành công của bạn</p>
          </div>
        </div>

        <div className="partner-stat-grid">
          <div className="partner-stat">
            <div className="partner-stat-body">
              <span>Tổng doanh thu</span>
              <b>{money(totalRevenue)}</b>
            </div>
            <span aria-hidden>→</span>
          </div>

          <div className="partner-stat">
            <div className="partner-stat-body">
              <span>Đơn hoàn thành</span>
              <b>{String(completedOrders)}</b>
            </div>
            <span aria-hidden>→</span>
          </div>

          <div className="partner-stat">
            <div className="partner-stat-body">
              <span>Đơn đang chờ</span>
              <b>{String(pendingOrders)}</b>
            </div>
            <span aria-hidden>→</span>
          </div>
        </div>
      </section>
    </main>
  )
}
