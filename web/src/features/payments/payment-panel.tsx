import Link from 'next/link'
import { money } from '@/lib/format'
import type { RentalOrderView } from '@/features/orders/server-data'
import {
  PAYMENT_KIND_LABELS,
  PAYMENT_STATE_HINTS,
  PAYMENT_STATE_LABELS,
  PAYMENT_STATUS_LABELS,
} from './state-labels'
import { transferMemo, type BankTransferInfo } from './sepay'

interface PaymentPanelProps {
  order: RentalOrderView
  bank: BankTransferInfo | null
  paymentsEnabled: boolean
}

/** Customer-facing payment summary, bank-transfer instructions, and the transaction history. */
export function PaymentPanel({ order, bank, paymentsEnabled }: PaymentPanelProps) {
  const collected = order.payments
    .filter((payment) => payment.direction === 'in' && payment.status === 'succeeded')
    .reduce((sum, payment) => sum + payment.amountVnd, 0)
  const total = order.totalVnd + order.depositVnd
  const remaining = Math.max(total - collected, 0)
  const depositDue = Math.max(order.depositVnd - collected, 0)
  const amountDueNow = depositDue > 0 ? depositDue : remaining
  const closed = ['cancelled', 'expired'].includes(order.state)
  const showBankInstructions =
    paymentsEnabled &&
    bank !== null &&
    amountDueNow > 0 &&
    !closed &&
    !['refund_pending', 'refunded'].includes(order.paymentState)

  return (
    <section className="rental-panel rental-payment-panel" data-testid="order-payment">
      <header>
        <h2>Thanh toán</h2>
        <span className={`rental-payment-badge is-${order.paymentState}`}>
          {PAYMENT_STATE_LABELS[order.paymentState]}
        </span>
      </header>
      <p>{PAYMENT_STATE_HINTS[order.paymentState]}</p>
      <dl className="rental-order-totals">
        <div>
          <dt>Tổng đơn (thuê + cọc)</dt>
          <dd>{money(total)}</dd>
        </div>
        <div>
          <dt>Đã nhận</dt>
          <dd data-testid="payment-collected">{money(collected)}</dd>
        </div>
        <div>
          <dt>Còn lại</dt>
          <dd>{money(remaining)}</dd>
        </div>
      </dl>
      {showBankInstructions && (
        <div className="rental-bank-card" data-testid="bank-instructions">
          <h3>Chuyển khoản {money(amountDueNow)}</h3>
          <dl>
            <div>
              <dt>Ngân hàng</dt>
              <dd>{bank.bankName}</dd>
            </div>
            <div>
              <dt>Số tài khoản</dt>
              <dd>{bank.accountNumber}</dd>
            </div>
            <div>
              <dt>Chủ tài khoản</dt>
              <dd>{bank.accountName}</dd>
            </div>
            <div>
              <dt>Nội dung chuyển khoản</dt>
              <dd>
                <code>{transferMemo(order.code)}</code>
              </dd>
            </div>
          </dl>
          <p className="rental-notice">
            Ghi đúng nội dung chuyển khoản để hệ thống tự đối chiếu. Tiền vào sẽ được cập nhật trong
            ít phút sau khi ngân hàng báo giao dịch.
          </p>
        </div>
      )}
      {paymentsEnabled && bank === null && amountDueNow > 0 && !closed && (
        <p className="rental-notice">
          Cửa hàng chưa cấu hình tài khoản nhận tiền. Vui lòng liên hệ để thanh toán.
        </p>
      )}
      {order.payments.length > 0 && (
        <ul className="rental-payment-list" data-testid="order-payments">
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
              <b className={payment.direction === 'out' ? 'is-out' : undefined}>
                {payment.direction === 'out' ? '−' : '+'}
                {money(payment.amountVnd)}
              </b>
            </li>
          ))}
        </ul>
      )}
      <Link className="rental-invoice-link" href={`/don-thue/${order.id}/hoa-don`}>
        Xem hoá đơn
      </Link>
    </section>
  )
}
