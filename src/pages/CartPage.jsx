import { ArrowRight, Cart as CartIcon, Trash } from '../components/ui/Icons.jsx'
import { money } from '../lib/format.js'
import { cartSubtotal } from '../lib/pricing.js'

export default function CartPage({ items, onChangeQty, onRemove, onCheckout, onBrowse }) {
  const count = items.reduce((sum, item) => sum + item.quantity, 0)
  const total = cartSubtotal(items)

  return (
    <main>
      <section className="section shell page-section">
        <div className="page-heading">
          <div>
            <span className="eyebrow">Giỏ thuê</span>
            <h1>Thiết bị của bạn</h1>
            <p>{count} thiết bị đang chờ đặt thuê</p>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="empty">
            <div>
              <CartIcon size={30} />
            </div>
            <h2>Giỏ thuê đang trống</h2>
            <p>Hãy chọn thiết bị phù hợp để bắt đầu.</p>
            <button className="primary" onClick={onBrowse}>
              Khám phá sản phẩm
            </button>
          </div>
        ) : (
          <div className="cart-layout">
            <div className="cart-list">
              {items.map(({ product, quantity, days }) => (
                <div className="cart-item" key={product.id}>
                  <img alt={product.name} src={product.image} />
                  <div className="cart-main">
                    <span>{product.category}</span>
                    <h3>{product.name}</h3>
                    <p>
                      {money(product.price)} / ngày • {days} ngày
                    </p>
                  </div>

                  <div className="quantity">
                    <button
                      type="button"
                      aria-label="Giảm số lượng"
                      onClick={() => onChangeQty(product.id, -1)}
                    >
                      −
                    </button>
                    <b>{quantity}</b>
                    <button
                      type="button"
                      aria-label="Tăng số lượng"
                      onClick={() => onChangeQty(product.id, 1)}
                    >
                      +
                    </button>
                  </div>

                  <strong>{money(product.price * days * quantity)}</strong>

                  <button
                    type="button"
                    className="plain remove"
                    aria-label={`Xóa ${product.name} khỏi giỏ`}
                    onClick={() => onRemove(product.id)}
                  >
                    <Trash />
                  </button>
                </div>
              ))}
            </div>

            <aside className="summary">
              <h3>Tóm tắt giỏ thuê</h3>
              <div>
                <span>Tạm tính</span>
                <b>{money(total)}</b>
              </div>
              <div>
                <span>Phí giao hàng</span>
                <span>Tính ở bước sau</span>
              </div>
              <hr />
              <div className="total">
                <span>Dự kiến</span>
                <strong>{money(total)}</strong>
              </div>
              <button className="primary full" onClick={onCheckout}>
                Tiến hành đặt thuê <ArrowRight />
              </button>
              <button className="secondary full" onClick={onBrowse}>
                Thuê thêm thiết bị
              </button>
            </aside>
          </div>
        )}
      </section>
    </main>
  )
}
