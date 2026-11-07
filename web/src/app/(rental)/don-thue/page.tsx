import Link from 'next/link'
import { requireVerifiedUser } from '@/lib/supabase/auth'
import { listRentalOrders } from '@/features/orders/server-data'
import { ORDER_STATE_LABELS } from '@/features/orders/state-labels'
import { PAYMENT_STATE_LABELS } from '@/features/payments/state-labels'
import { money } from '@/lib/format'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: 'Đơn thuê',
}

export default async function MyRentalOrdersPage() {
  const { supabase, user } = await requireVerifiedUser('/don-thue')
  const orders = await listRentalOrders(supabase, user.id)
  return (
    <main className="shell rental-page">
      <div className="rental-heading">
        <p className="eyebrow">Tài khoản</p>
        <h1>Đơn thuê của tôi</h1>
      </div>
      {orders.length === 0 ? (
        <section className="rental-panel rental-empty">
          <p>Bạn chưa có đơn thuê nào.</p>
          <Link href="/san-pham">Xem thiết bị</Link>
        </section>
      ) : (
        <div className="rental-order-list" data-testid="customer-orders">
          {orders.map((order) => (
            <Link
              className="rental-panel rental-order-card"
              href={`/don-thue/${order.id}`}
              key={order.id}
            >
              <span>
                <b>{order.code}</b>
                <span className="rental-status">{ORDER_STATE_LABELS[order.state]}</span>
                <span className={`rental-payment-badge is-${order.paymentState}`}>
                  {PAYMENT_STATE_LABELS[order.paymentState]}
                </span>
              </span>
              <span>
                {order.items.length} máy · {money(order.totalVnd)}
              </span>
              <small>
                {new Date(order.createdAt).toLocaleDateString('vi-VN', {
                  timeZone: 'Asia/Ho_Chi_Minh',
                })}
              </small>
            </Link>
          ))}
        </div>
      )}
    </main>
  )
}
