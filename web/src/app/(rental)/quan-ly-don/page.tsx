import Link from 'next/link'
import { redirect } from 'next/navigation'
import { releaseExpiredBookings, transitionBooking } from '@/features/booking/actions'
import { listAssignedUnitsForOrders, listRentalOrders } from '@/features/orders/server-data'
import { ORDER_STATE_LABELS } from '@/features/orders/state-labels'
import { completeDepositRefund } from '@/features/payments/actions'
import { PAYMENT_STATE_LABELS } from '@/features/payments/state-labels'
import { getVerifiedAppRole } from '@/lib/supabase/auth'
import { money } from '@/lib/format'
import type { OrderState } from '@/lib/supabase/database'
import type { Metadata } from 'next'
import { requestIdentityDocumentForOrder } from '@/features/account/identity-actions'
import { identityDocumentsEnabled } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: 'Quản lý đơn — A.I.R',
}

const NEXT_STATES: Partial<Record<OrderState, OrderState[]>> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['delivering', 'cancelled'],
  delivering: ['active'],
  active: ['returning', 'overdue'],
  overdue: ['returning', 'completed'],
  returning: ['completed'],
}

export default async function StaffOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string
    updated?: string
    expired?: string
    identity?: string
    refund?: string
  }>
}) {
  const { user, role, supabase } = await getVerifiedAppRole()
  if (!user) redirect('/dang-nhap?next=%2Fquan-ly-don')
  if (role !== 'staff' && role !== 'admin') redirect('/don-thue')
  const orders = await listRentalOrders(supabase)
  const assignedUnits = await listAssignedUnitsForOrders(
    supabase,
    orders.map((order) => order.id),
  )
  const identityDocsEnabled = identityDocumentsEnabled()
  const now = getServerNow()
  const params = await searchParams
  return (
    <main className="shell rental-page">
      <div className="rental-heading">
        <p className="eyebrow">Nhân viên</p>
        <h1>Quản lý đơn thuê</h1>
      </div>
      {params.error && (
        <p className="rental-error" role="alert">
          Không thể cập nhật trạng thái. Kiểm tra hạn giữ máy, lịch thuê và tình trạng thiết bị.
        </p>
      )}
      {params.updated && (
        <p className="rental-message" role="status">
          Đã cập nhật trạng thái đơn.
        </p>
      )}
      {params.expired && (
        <p className="rental-message" role="status">
          Đã giải phóng các yêu cầu quá hạn.
        </p>
      )}
      {params.identity === 'requested' && (
        <p className="rental-message" role="status">
          Đã gửi yêu cầu giấy tờ tùy chọn cho khách.
        </p>
      )}
      {params.identity === 'disabled' && (
        <p className="rental-notice">Tính năng lưu giấy tờ hiện chưa được bật.</p>
      )}
      {params.identity === 'failed' && (
        <p className="rental-error" role="alert">
          Chưa gửi được yêu cầu. Kiểm tra xem khách đã có yêu cầu đang mở.
        </p>
      )}
      {params.refund === 'paid' && (
        <p className="rental-message" role="status">
          Đã ghi nhận hoàn cọc cho khách.
        </p>
      )}
      {(params.refund === 'failed' || params.refund === 'invalid') && (
        <p className="rental-error" role="alert">
          Không hoàn cọc được. Khoản hoàn có thể đã được xử lý hoặc không còn chờ.
        </p>
      )}
      {identityDocsEnabled && (
        <p className="rental-notice">
          Chỉ yêu cầu giấy tờ cho đơn cụ thể khi cần. Việc này không bắt buộc để đặt thuê.
        </p>
      )}
      <form action={releaseExpiredBookings} className="rental-expiry-action">
        <button className="secondary" type="submit">
          Giải phóng yêu cầu hết hạn
        </button>
      </form>
      {orders.length === 0 ? (
        <p className="rental-panel">Chưa có đơn thuê.</p>
      ) : (
        <div className="rental-order-list" data-testid="staff-orders">
          {orders.map((order) => (
            <article className="rental-panel rental-staff-order" key={order.id}>
              <header>
                <Link href={`/don-thue/${order.id}`}>
                  <b>{order.code}</b>
                </Link>
                <span className="rental-status">{ORDER_STATE_LABELS[order.state]}</span>
                <span className={`rental-payment-badge is-${order.paymentState}`}>
                  {PAYMENT_STATE_LABELS[order.paymentState]}
                </span>
              </header>
              <p>
                {order.customerName} · {order.customerPhone}
              </p>
              <p>
                {order.fulfillment === 'delivery' ? order.deliveryAddress : 'Nhận tại cửa hàng'}
              </p>
              {order.state === 'pending' && (
                <p
                  className={Date.parse(order.expiresAt) <= now ? 'rental-error' : 'rental-notice'}
                >
                  {Date.parse(order.expiresAt) <= now
                    ? 'Thời hạn giữ máy đã qua; cần giải phóng yêu cầu hết hạn trước khi nhận đơn mới.'
                    : `Giữ máy đến ${new Date(order.expiresAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}.`}
                </p>
              )}
              <ul>
                {order.items.map((item) => {
                  const unit = assignedUnits.get(item.id)
                  return (
                    <li key={item.id}>
                      {item.productName} · {item.rentalStart} – {item.rentalEnd} ·{' '}
                      {money(item.lineTotalVnd)}
                      {unit && (
                        <small className="rental-assigned-unit">
                          Máy: {unit.assetTag} · tình trạng:{' '}
                          {unit.state === 'available'
                            ? 'bình thường'
                            : unit.state === 'maintenance'
                              ? 'bảo trì'
                              : 'ngừng sử dụng'}{' '}
                          · mốc vệ sinh sớm nhất: {unit.readyOn}
                        </small>
                      )}
                    </li>
                  )
                })}
              </ul>
              <p>
                Tiền thuê {money(order.subtotalVnd)}
                {order.discountVnd > 0 &&
                  ` · Giảm ${money(order.discountVnd)} (${order.discountCode})`}
                {order.deliveryFeeVnd > 0 &&
                  ` · Giao ${money(order.deliveryFeeVnd)} (${order.deliveryZoneName})`}
                {` · Tổng thuê ${money(order.totalVnd)} · Cọc ${money(order.depositVnd)}`}
              </p>
              {(() => {
                const pendingRefund = order.payments.find(
                  (payment) => payment.kind === 'deposit_refund' && payment.status === 'pending',
                )
                return pendingRefund ? (
                  <form action={completeDepositRefund} className="rental-refund-form">
                    <input type="hidden" name="paymentId" value={pendingRefund.id} />
                    <span>Hoàn cọc {money(pendingRefund.amountVnd)} cho khách</span>
                    <button className="secondary" type="submit">
                      Xác nhận đã hoàn cọc
                    </button>
                  </form>
                ) : null
              })()}
              {identityDocsEnabled && (
                <form
                  action={requestIdentityDocumentForOrder}
                  className="rental-document-request-form"
                >
                  <input type="hidden" name="userId" value={order.userId} />
                  <button className="secondary" type="submit">
                    Yêu cầu giấy tờ (tùy chọn)
                  </button>
                </form>
              )}
              <div className="rental-transition-actions">
                {order.state !== 'pending' && order.state !== 'cancelled' && (
                  <Link className="secondary" href={`/quan-ly-don/${order.id}/phieu-ban-giao`}>
                    Phiếu bàn giao
                  </Link>
                )}
                {NEXT_STATES[order.state]
                  ?.filter(
                    (next) =>
                      !(
                        order.state === 'pending' &&
                        next === 'confirmed' &&
                        Date.parse(order.expiresAt) <= now
                      ),
                  )
                  .map((next) => (
                    <form action={transitionBooking} key={next}>
                      <input type="hidden" name="orderId" value={order.id} />
                      <input type="hidden" name="next" value={next} />
                      <button
                        className={next === 'cancelled' ? 'secondary' : 'primary'}
                        type="submit"
                      >
                        {next === 'cancelled' ? 'Hủy đơn' : ORDER_STATE_LABELS[next]}
                      </button>
                    </form>
                  ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  )
}

function getServerNow() {
  return Date.now()
}
