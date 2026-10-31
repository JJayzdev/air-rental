import { Check } from '@/components/ui/Icons'
import { dateVN, money } from '@/lib/format'
import type { Order } from '@/types'

interface CheckoutSuccessViewProps {
  order: Order | null
  onOrders: () => void
  onHome: () => void
}

export default function CheckoutSuccessView({ order, onOrders, onHome }: CheckoutSuccessViewProps) {
  if (!order) {
    return (
      <main>
        <section className="section shell page-section">
          <div className="empty">
            <h2>Chưa có đơn nào</h2>
            <p>Hãy chọn thiết bị và đặt thuê để xem xác nhận tại đây.</p>
            <button className="primary" onClick={onHome}>
              Về trang chủ
            </button>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main>
      <section className="section shell page-section">
        <div className="confirmation">
          <div className="success-icon">
            <Check size={34} />
          </div>
          <span className="eyebrow">Đặt thuê demo thành công</span>
          <h1>Cảm ơn bạn, {order.name}!</h1>
          <p>
            Yêu cầu thuê đã được tạo trong phiên demo. Không có khoản thanh toán thực tế nào được
            thực hiện.
          </p>

          <div className="reference">
            <span>Mã đơn demo</span>
            <strong>{order.code}</strong>
          </div>

          <div className="confirm-details">
            <span>
              Thời gian
              <b>
                {dateVN(order.start)} → {dateVN(order.end)}
              </b>
            </span>
            <span>
              Số ngày<b>{order.days} ngày</b>
            </span>
            <span>
              Tổng dự kiến<b>{money(order.total)}</b>
            </span>
          </div>

          <div className="hero-actions">
            <button className="primary" onClick={onOrders}>
              Xem đơn thuê
            </button>
            <button className="secondary" onClick={onHome}>
              Về trang chủ
            </button>
          </div>
        </div>
      </section>
    </main>
  )
}
