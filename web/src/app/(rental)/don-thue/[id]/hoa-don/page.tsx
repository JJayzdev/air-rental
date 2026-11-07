import Link from 'next/link'
import { notFound } from 'next/navigation'
import { z } from 'zod'
import { getRentalOrder } from '@/features/orders/server-data'
import { ORDER_STATE_LABELS } from '@/features/orders/state-labels'
import { PrintInvoiceButton } from '@/features/payments/print-button'
import {
  PAYMENT_KIND_LABELS,
  PAYMENT_STATE_LABELS,
  PAYMENT_STATUS_LABELS,
} from '@/features/payments/state-labels'
import { requireVerifiedUser } from '@/lib/supabase/auth'
import { money } from '@/lib/format'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: 'Hoá đơn thuê',
}

export default async function RentalInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!z.string().uuid().safeParse(id).success) notFound()
  const { supabase } = await requireVerifiedUser(`/don-thue/${id}/hoa-don`)
  const order = await getRentalOrder(supabase, id)
  if (!order) notFound()

  const collected = order.payments
    .filter((payment) => payment.direction === 'in' && payment.status === 'succeeded')
    .reduce((sum, payment) => sum + payment.amountVnd, 0)
  const refunded = order.payments
    .filter((payment) => payment.direction === 'out' && payment.status === 'succeeded')
    .reduce((sum, payment) => sum + payment.amountVnd, 0)
  const total = order.totalVnd + order.depositVnd
  // Đơn đã huỷ/hết hạn không còn khoản phải trả; tiền đã nhận (nếu có) được hoàn.
  const closed = order.state === 'cancelled' || order.state === 'expired'
  const remaining = closed ? 0 : Math.max(total - collected, 0)

  return (
    <main className="shell rental-page rental-invoice">
      <nav className="rental-breadcrumb rental-no-print">
        <Link href={`/don-thue/${order.id}`}>Đơn {order.code}</Link>
        <span> / Hoá đơn</span>
      </nav>
      <article className="rental-panel rental-invoice-sheet">
        <header className="rental-invoice-header">
          <div>
            <p className="eyebrow">A.I.R — Thiết bị công nghệ cho thuê</p>
            <h1>Hoá đơn thuê thiết bị</h1>
            <p>Mã đơn: {order.code}</p>
          </div>
          <div className="rental-invoice-meta">
            <span>{ORDER_STATE_LABELS[order.state]}</span>
            <span>{PAYMENT_STATE_LABELS[order.paymentState]}</span>
            <time dateTime={order.createdAt}>
              Lập ngày{' '}
              {new Date(order.createdAt).toLocaleDateString('vi-VN', {
                timeZone: 'Asia/Ho_Chi_Minh',
              })}
            </time>
          </div>
        </header>

        <section className="rental-invoice-customer">
          <h2>Khách hàng</h2>
          <p>{order.customerName}</p>
          <p>{order.customerPhone}</p>
          <p>{order.deliveryAddress}</p>
          <p>{order.fulfillment === 'pickup' ? 'Nhận tại cửa hàng' : 'Giao hàng'}</p>
          {order.fulfillment === 'delivery' && order.deliveryZoneName && (
            <p>Khu vực giao: {order.deliveryZoneName}</p>
          )}
        </section>

        <table className="rental-invoice-table">
          <caption className="sr-only">Thiết bị thuê</caption>
          <thead>
            <tr>
              <th scope="col">Thiết bị</th>
              <th scope="col">Thời gian thuê</th>
              <th scope="col">Giá/ngày</th>
              <th scope="col">Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id}>
                <td>{item.productName}</td>
                <td>
                  {formatDate(item.rentalStart)} – {formatDate(item.rentalEnd)}
                </td>
                <td>{money(item.pricePerDayVnd)}</td>
                <td>{money(item.lineTotalVnd)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <dl className="rental-order-totals rental-invoice-totals">
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
            <dd>{money(total)}</dd>
          </div>
          <div>
            <dt>Đã nhận</dt>
            <dd>{money(collected)}</dd>
          </div>
          {refunded > 0 && (
            <div>
              <dt>Đã hoàn tiền</dt>
              <dd>{money(refunded)}</dd>
            </div>
          )}
          <div>
            <dt>Còn lại</dt>
            <dd>{money(remaining)}</dd>
          </div>
        </dl>

        <section className="rental-invoice-payments">
          <h2>Giao dịch</h2>
          {order.payments.length === 0 ? (
            <p>Chưa có giao dịch nào được ghi nhận.</p>
          ) : (
            <ul className="rental-payment-list">
              {order.payments.map((payment) => (
                <li key={payment.id}>
                  <span>
                    {PAYMENT_KIND_LABELS[payment.kind]} · {PAYMENT_STATUS_LABELS[payment.status]}
                  </span>
                  <time dateTime={payment.createdAt}>
                    {new Date(payment.createdAt).toLocaleString('vi-VN', {
                      timeZone: 'Asia/Ho_Chi_Minh',
                    })}
                  </time>
                  <b>{money(payment.amountVnd)}</b>
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className="rental-notice">
          Hoá đơn tham chiếu, không phải hoá đơn giá trị gia tăng. Tiền cọc được hoàn sau khi cửa
          hàng kiểm tra thiết bị khi nhận lại.
        </p>
      </article>
      <div className="rental-invoice-actions rental-no-print">
        <PrintInvoiceButton />
        <Link className="secondary" href={`/don-thue/${order.id}`}>
          Quay lại đơn
        </Link>
      </div>
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
