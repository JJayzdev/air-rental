import Link from 'next/link'
import { notFound } from 'next/navigation'
import { z } from 'zod'
import { cancelOwnBooking } from '@/features/booking/actions'
import { getRentalOrder } from '@/features/orders/server-data'
import { ORDER_STATE_LABELS } from '@/features/orders/state-labels'
import { PaymentPanel } from '@/features/payments/payment-panel'
import { bankTransferInfo, paymentsEnabled } from '@/features/payments/sepay'
import { requireVerifiedUser } from '@/lib/supabase/auth'
import { money } from '@/lib/format'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: 'Chi tiết đơn thuê — A.I.R',
}

export default async function RentalOrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ cancel?: string }>
}) {
  const { id } = await params
  if (!z.string().uuid().safeParse(id).success) notFound()
  const { supabase } = await requireVerifiedUser(`/don-thue/${id}`)
  const order = await getRentalOrder(supabase, id)
  if (!order) notFound()
  const query = await searchParams
  const holdExpired = order.state === 'pending' && Date.parse(order.expiresAt) <= getServerNow()
  return (
    <main className="shell rental-page">
      <nav className="rental-breadcrumb">
        <Link href="/don-thue">Đơn của tôi</Link>
        <span> / {order.code}</span>
      </nav>
      <div className="rental-heading">
        <p className="eyebrow">{ORDER_STATE_LABELS[order.state]}</p>
        <h1>Đơn {order.code}</h1>
        <p>Đơn chỉ hiển thị khi tài khoản của bạn có quyền truy cập.</p>
      </div>
      {query.cancel === 'failed' && (
        <p className="rental-error" role="alert">
          Không thể hủy đơn này. Đơn có thể đã được xác nhận hoặc đã đổi trạng thái.
        </p>
      )}
      {order.state === 'pending' &&
        (holdExpired ? (
          <p className="rental-error" role="status">
            Thời hạn giữ máy đã qua. Trạng thái đơn đang chờ được giải phóng; vui lòng kiểm tra lại
            với cửa hàng trước khi đến nhận.
          </p>
        ) : (
          <p className="rental-notice">
            Giữ máy đến{' '}
            {new Date(order.expiresAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}.
          </p>
        ))}
      <section className="rental-panel">
        <h2>Thiết bị và thời gian thuê</h2>
        <ul className="rental-order-items">
          {order.items.map((item) => (
            <li key={item.id}>
              <span>{item.productName}</span>
              <small>
                {formatDate(item.rentalStart)} – {formatDate(item.rentalEnd)} ·{' '}
                {money(item.lineTotalVnd)}
              </small>
            </li>
          ))}
        </ul>
        <dl className="rental-order-totals">
          <div>
            <dt>Tiền thuê</dt>
            <dd>{money(order.subtotalVnd)}</dd>
          </div>
          {order.discountVnd > 0 && (
            <div>
              <dt>Giảm giá ({order.discountCode})</dt>
              <dd>−{money(order.discountVnd)}</dd>
            </div>
          )}
          {order.deliveryFeeVnd > 0 && (
            <div>
              <dt>Phí giao ({order.deliveryZoneName})</dt>
              <dd>{money(order.deliveryFeeVnd)}</dd>
            </div>
          )}
          <div>
            <dt>Tổng tiền thuê</dt>
            <dd>{money(order.totalVnd)}</dd>
          </div>
          <div>
            <dt>Tiền cọc</dt>
            <dd>{money(order.depositVnd)}</dd>
          </div>
          <div>
            <dt>Tổng cộng</dt>
            <dd>{money(order.totalVnd + order.depositVnd)}</dd>
          </div>
        </dl>
      </section>
      <section className="rental-panel rental-order-customer">
        <h2>Thông tin nhận máy</h2>
        <p>{order.customerName}</p>
        <p>{order.customerPhone}</p>
        <p>{order.deliveryAddress}</p>
        <p>{order.fulfillment === 'pickup' ? 'Nhận tại cửa hàng' : 'Giao hàng'}</p>
        {order.fulfillment === 'delivery' && order.deliveryZoneName && (
          <p>Khu vực giao: {order.deliveryZoneName}</p>
        )}
      </section>
      <PaymentPanel order={order} bank={bankTransferInfo()} paymentsEnabled={paymentsEnabled()} />
      <section className="rental-panel rental-order-history">
        <h2>Lịch sử đơn</h2>
        <ol>
          {order.events.map((event, index) => (
            <li key={`${event.createdAt}-${index}`}>
              <span>{ORDER_STATE_LABELS[event.state]}</span>
              <time dateTime={event.createdAt}>
                {new Date(event.createdAt).toLocaleString('vi-VN')}
              </time>
            </li>
          ))}
        </ol>
      </section>
      {order.state === 'pending' && (
        <form action={cancelOwnBooking} className="rental-cancel-form">
          <input type="hidden" name="orderId" value={order.id} />
          <button className="secondary" type="submit">
            Hủy yêu cầu thuê
          </button>
        </form>
      )}
      <p className="rental-notice">
        Yêu cầu đã lưu. Email/SMS tự động chưa được cấu hình; thanh toán được đối chiếu qua chuyển
        khoản ngân hàng.
      </p>
    </main>
  )
}

function formatDate(value: string) {
  if (!value) return 'Ngày không khả dụng'
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    dateStyle: 'medium',
  }).format(new Date(`${value}T12:00:00+07:00`))
}

function getServerNow() {
  return Date.now()
}
