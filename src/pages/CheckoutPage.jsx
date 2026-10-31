import { useMemo, useState } from 'react'
import { addDays, daysBetween, todayISO } from '../lib/dates.js'
import { money } from '../lib/format.js'
import { lineTotal } from '../lib/pricing.js'

const SHIPPING = 50000

export default function CheckoutPage({ items, initialDays, user, onBack, onSubmit }) {
  const today = todayISO()
  const maxQty = Math.min(...items.map((item) => item.product.available), 10)

  const [start, setStart] = useState(today)
  const [end, setEnd] = useState(addDays(today, Math.max(0, (initialDays || 1) - 1)))
  const [quantity, setQuantity] = useState(Math.min(...items.map((item) => item.quantity)))
  const [method, setMethod] = useState('delivery')
  const [name, setName] = useState(user?.name || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [address, setAddress] = useState('')
  const [errors, setErrors] = useState({})

  const days = daysBetween(start, end)
  const shipping = method === 'delivery' ? SHIPPING : 0
  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + lineTotal(item.product.price, days, quantity), 0),
    [items, days, quantity],
  )

  const changeStart = (value) => {
    setStart(value)
    if (value > end) setEnd(value)
  }

  const validate = () => {
    const next = {}
    if (!name.trim()) next.name = 'Vui lòng nhập họ và tên'
    if (!/^0\d{9}$/.test(phone.replace(/[\s.-]/g, ''))) next.phone = 'Số điện thoại chưa hợp lệ'
    if (method === 'delivery' && !address.trim()) next.address = 'Vui lòng nhập địa chỉ giao hàng'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const submit = (event) => {
    event.preventDefault()
    if (!validate()) return

    onSubmit({
      start,
      end,
      days,
      quantity,
      method,
      name: name.trim(),
      phone: phone.replace(/[\s.-]/g, ''),
      address: method === 'delivery' ? address.trim() : '',
      items: items.map((item) => ({
        id: item.product.id,
        name: item.product.name,
        image: item.product.image,
        price: item.product.price,
        quantity,
      })),
      subtotal,
      shipping,
      total: subtotal + shipping,
    })
  }

  return (
    <main>
      <section className="section shell page-section">
        <button className="back" onClick={onBack}>
          ← Quay lại giỏ thuê
        </button>

        <div className="page-heading">
          <div>
            <span className="eyebrow">Đặt thuê an toàn</span>
            <h1>Hoàn tất thông tin thuê</h1>
            <p>Đây là đơn demo, không phát sinh giao dịch thật.</p>
          </div>
        </div>

        <form className="booking-layout" onSubmit={submit} noValidate>
          <div className="form-card">
            <h3>Thời gian và nhận thiết bị</h3>

            <div className="form-grid">
              <label className="field">
                <span>Ngày bắt đầu thuê</span>
                <input
                  type="date"
                  min={today}
                  value={start}
                  onChange={(e) => changeStart(e.target.value)}
                />
              </label>

              <label className="field">
                <span>Ngày kết thúc thuê</span>
                <input
                  type="date"
                  min={start}
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                />
              </label>

              <label className="field">
                <span>Số lượng bộ đơn</span>
                <input
                  type="number"
                  min="1"
                  max={maxQty}
                  value={quantity}
                  onChange={(e) =>
                    setQuantity(Math.min(maxQty, Math.max(1, Number(e.target.value) || 1)))
                  }
                />
              </label>

              <label className="field">
                <span>Hình thức nhận thiết bị</span>
                <select value={method} onChange={(e) => setMethod(e.target.value)}>
                  <option value="delivery">Giao hàng</option>
                  <option value="store">Nhận tại cửa hàng</option>
                </select>
              </label>
            </div>

            <h3>Thông tin người thuê</h3>

            <div className="form-grid">
              <label className="field">
                <span>Họ và tên</span>
                <input
                  placeholder="Nguyễn Văn An"
                  value={name}
                  autoComplete="name"
                  onChange={(e) => setName(e.target.value)}
                />
                {errors.name && <small>{errors.name}</small>}
              </label>

              <label className="field">
                <span>Số điện thoại</span>
                <input
                  placeholder="0912 345 678"
                  value={phone}
                  inputMode="tel"
                  autoComplete="tel"
                  onChange={(e) => setPhone(e.target.value)}
                />
                {errors.phone && <small>{errors.phone}</small>}
              </label>

              {method === 'delivery' && (
                <label className="field wide">
                  <span>Địa chỉ giao hàng</span>
                  <input
                    placeholder="Số nhà, đường, quận/huyện, tỉnh/thành"
                    value={address}
                    autoComplete="street-address"
                    onChange={(e) => setAddress(e.target.value)}
                  />
                  {errors.address && <small>{errors.address}</small>}
                </label>
              )}
            </div>
          </div>

          <aside className="summary">
            <h3>Chi tiết thanh toán demo</h3>

            {items.map((item) => (
              <div key={item.product.id}>
                <span>
                  {item.product.name} × {quantity}
                </span>
                <b>{money(item.product.price * days * quantity)}</b>
              </div>
            ))}

            <div>
              <span>{days} ngày thuê</span>
              <b>{money(subtotal)}</b>
            </div>
            <div>
              <span>Phí giao hàng</span>
              <b>{money(shipping)}</b>
            </div>

            <hr />

            <div className="total">
              <span>Tổng cộng</span>
              <strong>{money(subtotal + shipping)}</strong>
            </div>

            <button className="primary full" type="submit">
              Xác nhận đặt thuê
            </button>
            <small>Bằng cách tiếp tục, bạn xác nhận đây là thao tác thử nghiệm.</small>
          </aside>
        </form>
      </section>
    </main>
  )
}
