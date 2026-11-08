/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getVerifiedAppRole } from '@/lib/supabase/auth'
import {
  formatRentalPeriod,
  formatVietnamDate,
  loadPartnerOrders,
  partnerGrossTotal,
  vietnamMonthKey,
} from '@/features/partner/server-data'
import { ORDER_STATE_LABELS } from '@/features/orders/state-labels'
import { money } from '@/lib/format'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: 'Doanh thu',
}

export default async function PartnerDoanhThuPage() {
  const { user, role, supabase } = await getVerifiedAppRole()
  if (!user) redirect('/dang-nhap?next=%2Fpartner%2Fdoanh-thu')
  if (role !== 'partner') redirect('/don-thue')

  const { data: partner } = (await supabase
    .from('partners')
    .select('id, status, commission_rate')
    .eq('user_id', user.id)
    .maybeSingle()) as any

  if (!partner) {
    return (
      <main className="partner-page">
        <header className="partner-page-head">
          <div>
            <p className="partner-eyebrow">Doanh thu</p>
            <h1>Doanh thu</h1>
          </div>
        </header>
        <p className="partner-notice partner-notice-wait">
          Bạn chưa có hồ sơ đối tác. <Link href="/dang-ky-doi-tac">Đăng ký trở thành đối tác</Link>{' '}
          để bắt đầu nhận doanh thu.
        </p>
      </main>
    )
  }

  const { orders, unavailable } = await loadPartnerOrders(supabase, partner.id)
  const commissionRate = Number(partner.commission_rate ?? 15)
  const completedOrders = orders.filter((order) => order.state === 'completed')
  const activeOrders = orders.filter(
    (order) => !['completed', 'cancelled', 'expired'].includes(order.state),
  )
  const grossRevenue = partnerGrossTotal(completedOrders)
  const platformFee = Math.round((grossRevenue * commissionRate) / 100)
  const netRevenue = grossRevenue - platformFee

  // Doanh thu được ghi nhận theo tháng hoàn thành đơn, tính theo giờ Việt Nam.
  const currentMonth = vietnamMonthKey(new Date())
  const monthRevenue = partnerGrossTotal(
    completedOrders.filter(
      (order) => vietnamMonthKey(order.completedAt ?? order.createdAt) === currentMonth,
    ),
  )

  return (
    <main className="partner-page">
      <header className="partner-page-head">
        <div>
          <p className="partner-eyebrow">Doanh thu</p>
          <h1>Doanh thu</h1>
          <p className="partner-page-sub">
            Doanh thu gộp từ các đơn hoàn thành, phí hệ thống và số tiền thực nhận của bạn.
          </p>
        </div>
      </header>

      {partner.status !== 'active' && (
        <p className="partner-notice partner-notice-wait">
          Hồ sơ đối tác đang chờ duyệt. Doanh thu sẽ được ghi nhận sau khi quản trị viên kích hoạt.
        </p>
      )}

      {unavailable && (
        <p className="partner-notice partner-notice-wait">
          Chưa đọc được dữ liệu doanh thu. Vui lòng kiểm tra cấu hình máy chủ rồi thử lại.
        </p>
      )}

      <section className="partner-block">
        <div className="partner-stat-grid">
          <div className="partner-stat">
            <div className="partner-stat-body">
              <span>Doanh thu gộp</span>
              <b>{money(grossRevenue)}</b>
              <small>Từ {completedOrders.length} đơn đã hoàn thành</small>
            </div>
            <span aria-hidden>→</span>
          </div>
          <div className="partner-stat">
            <div className="partner-stat-body">
              <span>Phí hệ thống ({commissionRate.toFixed(0)}%)</span>
              <b>{money(platformFee)}</b>
              <small>Phí duy trì nền tảng A.I.R</small>
            </div>
            <span aria-hidden>→</span>
          </div>
          <div className="partner-stat">
            <div className="partner-stat-body">
              <span>Thực nhận</span>
              <b>{money(netRevenue)}</b>
              <small>Sau khi trừ phí hệ thống</small>
            </div>
            <span aria-hidden>→</span>
          </div>
          <div className="partner-stat">
            <div className="partner-stat-body">
              <span>Tháng này</span>
              <b>{money(monthRevenue)}</b>
              <small>{activeOrders.length} đơn đang xử lý</small>
            </div>
            <span aria-hidden>→</span>
          </div>
        </div>
      </section>

      <section className="partner-block">
        <div className="partner-block-head">
          <div>
            <h2>Đơn đã hoàn thành</h2>
            <p>Doanh thu tính trên phần thiết bị của bạn. Đơn hủy hoặc hết hạn không được tính.</p>
          </div>
        </div>

        {completedOrders.length === 0 ? (
          <p className="partner-empty">
            Chưa có đơn hoàn thành nào. Khi khách trả máy và đơn chuyển sang trạng thái hoàn thành,
            doanh thu sẽ xuất hiện tại đây.
          </p>
        ) : (
          <div className="partner-table-wrap">
            <table className="partner-table">
              <thead>
                <tr>
                  <th scope="col">Mã đơn</th>
                  <th scope="col">Hoàn thành</th>
                  <th scope="col">Thiết bị</th>
                  <th scope="col">Thời gian thuê</th>
                  <th scope="col">Doanh thu gộp</th>
                  <th scope="col">Thực nhận</th>
                </tr>
              </thead>
              <tbody>
                {completedOrders.map((order) => {
                  const orderGross = orderGrossTotal(order.items)
                  const orderNet = Math.round(orderGross * (1 - commissionRate / 100))
                  return (
                    <tr key={order.id}>
                      <td>
                        <b>{order.code}</b>
                        <br />
                        <small>{ORDER_STATE_LABELS[order.state]}</small>
                      </td>
                      <td>{formatVietnamDate(order.completedAt ?? order.createdAt)}</td>
                      <td>{order.items.map((item) => item.productName).join(', ')}</td>
                      <td>
                        {order.items[0] ? formatRentalPeriod(order.items[0].rentalPeriod) : '—'}
                      </td>
                      <td>{money(orderGross)}</td>
                      <td>
                        <b>{money(orderNet)}</b>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  )
}

function orderGrossTotal(items: { lineTotalVnd: number }[]): number {
  return items.reduce((sum, item) => sum + item.lineTotalVnd, 0)
}
