import { Calendar } from '../components/ui/Icons.jsx'
import { dateVN, money } from '../lib/format.js'

export default function OrdersPage({ orders, onBrowse }) {
  return (
    <main>
      <section className="section shell page-section">
        <div className="page-heading">
          <div>
            <span className="eyebrow">Quản lý thuận tiện</span>
            <h1>Đơn thuê của tôi</h1>
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="empty">
            <div>
              <Calendar size={30} />
            </div>
            <h2>Chưa có đơn thuê</h2>
            <p>Đơn demo sau khi xác nhận sẽ hiển thị tại đây.</p>
            <button className="primary" onClick={onBrowse}>
              Khám phá sản phẩm
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {orders.map((order) => (
              <div className="order-card" key={order.code}>
                <div>
                  <span className="status">Đơn demo • {order.status}</span>
                  <h3>{order.code}</h3>
                  <p>{order.items.map((item) => `${item.name} × ${item.quantity}`).join(' • ')}</p>
                </div>
                <div>
                  <span>
                    {dateVN(order.start)} — {dateVN(order.end)}
                  </span>
                  <strong>{money(order.total)}</strong>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
