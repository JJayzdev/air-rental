/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getVerifiedAppRole } from '@/lib/supabase/auth'
import { formatRentalPeriod, loadPartnerOrders } from '@/features/partner/server-data'
import { ORDER_STATE_LABELS } from '@/features/orders/state-labels'
import { PAYMENT_STATE_LABELS } from '@/features/payments/state-labels'
import { money } from '@/lib/format'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: 'Đơn thuê',
}

export default async function PartnerDonThuePage() {
  const { user, role, supabase } = await getVerifiedAppRole()
  if (!user) redirect('/dang-nhap?next=%2Fpartner%2Fdon-thue')
  if (role !== 'partner') redirect('/don-thue')

  const { data: partner } = (await supabase
    .from('partners')
    .select('id, status')
    .eq('user_id', user.id)
    .maybeSingle()) as any

  if (!partner) {
    return (
      <main className="partner-page">
        <header className="partner-page-head">
          <div>
            <p className="partner-eyebrow">Quản lý đơn thuê</p>
            <h1>Đơn thuê</h1>
          </div>
        </header>
        <p className="partner-notice partner-notice-wait">
          Bạn chưa có hồ sơ đối tác. <Link href="/dang-ky-doi-tac">Đăng ký trở thành đối tác</Link>{' '}
          để bắt đầu cho thuê.
        </p>
      </main>
    )
  }

  const { orders, unavailable } = await loadPartnerOrders(supabase, partner.id)
  const activeOrders = orders.filter(
    (order) => !['completed', 'cancelled', 'expired'].includes(order.state),
  )
  const completedOrders = orders.filter((order) => order.state === 'completed')

  return (
    <main className="partner-page">
      <header className="partner-page-head">
        <div>
          <p className="partner-eyebrow">Quản lý đơn thuê</p>
          <h1>Đơn thuê</h1>
          <p className="partner-page-sub">
            Theo dõi các đơn có thiết bị của bạn, từ lúc khách đặt tới khi hoàn tất.
          </p>
        </div>
      </header>

      {partner.status !== 'active' && (
        <p className="partner-notice partner-notice-wait">
          Hồ sơ đối tác đang chờ duyệt. Đơn thuê sẽ hiển thị sau khi quản trị viên kích hoạt.
        </p>
      )}

      {unavailable && (
        <p className="partner-notice partner-notice-wait">
          Chưa đọc được dữ liệu đơn thuê. Vui lòng kiểm tra cấu hình máy chủ rồi thử lại.
        </p>
      )}

      <section className="partner-block">
        <div className="partner-stat-grid">
          <div className="partner-stat">
            <div className="partner-stat-body">
              <span>Tổng đơn</span>
              <b>{orders.length}</b>
            </div>
            <span aria-hidden>→</span>
          </div>
          <div className="partner-stat">
            <div className="partner-stat-body">
              <span>Đang xử lý</span>
              <b>{activeOrders.length}</b>
            </div>
            <span aria-hidden>→</span>
          </div>
          <div className="partner-stat">
            <div className="partner-stat-body">
              <span>Đã hoàn thành</span>
              <b>{completedOrders.length}</b>
            </div>
            <span aria-hidden>→</span>
          </div>
        </div>
      </section>

      <section className="partner-block">
        <div className="partner-block-head">
          <div>
            <h2>Danh sách đơn</h2>
            <p>Mỗi dòng là một đơn có ít nhất một thiết bị của bạn.</p>
          </div>
        </div>

        {orders.length === 0 ? (
          <p className="partner-empty">
            Chưa có đơn thuê nào. <Link href="/partner/san-pham">Thêm sản phẩm</Link> để bắt đầu
            nhận đơn.
          </p>
        ) : (
          <div className="partner-table-wrap">
            <table className="partner-table">
              <thead>
                <tr>
                  <th scope="col">Mã đơn</th>
                  <th scope="col">Khách hàng</th>
                  <th scope="col">Thiết bị</th>
                  <th scope="col">Thời gian thuê</th>
                  <th scope="col">Trạng thái</th>
                  <th scope="col">Tổng đơn</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <b>{order.code}</b>
                      <br />
                      <small className={`partner-payment is-${order.paymentState}`}>
                        {PAYMENT_STATE_LABELS[order.paymentState]}
                      </small>
                    </td>
                    <td>
                      {order.customerName}
                      <br />
                      <small>{order.customerPhone}</small>
                    </td>
                    <td>{order.items.map((item) => item.productName).join(', ')}</td>
                    <td>
                      {order.items[0] ? formatRentalPeriod(order.items[0].rentalPeriod) : '—'}
                    </td>
                    <td>
                      <span className={`partner-state is-${order.state}`}>
                        {ORDER_STATE_LABELS[order.state]}
                      </span>
                    </td>
                    <td>{money(order.totalVnd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  )
}
