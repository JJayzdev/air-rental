import { useState } from 'react'
import { ArrowRight, Check } from '@/components/ui/Icons'
import { money } from '@/lib/format'
import { lineTotal } from '@/lib/pricing'
import type { Product } from '@/types'

const DURATIONS = [1, 3, 7, 14]

interface ProductDetailViewProps {
  product: Product
  onBack: () => void
  onAdd: (product: Product, days: number, quantity: number) => void
  onRentNow: (product: Product, days: number, quantity: number) => void
}

export default function ProductDetailView({
  product,
  onBack,
  onAdd,
  onRentNow,
}: ProductDetailViewProps) {
  const [days, setDays] = useState(3)
  const [quantity, setQuantity] = useState(1)

  const max = product.available
  const total = lineTotal(product.price, days, quantity)

  const changeQty = (delta: number) => {
    setQuantity((current) => Math.min(max, Math.max(1, current + delta)))
  }

  return (
    <main>
      <section className="section shell page-section">
        <button className="back" onClick={onBack}>
          ← Quay lại sản phẩm
        </button>

        <div className="detail">
          <div className="detail-image">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt={product.name} src={product.image} />
            <span className="available">Sẵn sàng cho thuê</span>
          </div>

          <div className="detail-info">
            <span className="eyebrow">{product.category}</span>
            <h1>{product.name}</h1>
            <p className="specs">{product.specs}</p>
            <div className="detail-price">
              {money(product.price)} <small>/ ngày</small>
            </div>

            <div className="spec-list">
              <span>
                <Check /> Thiết bị đã kiểm định
              </span>
              <span>
                <Check /> Hỗ trợ kỹ thuật miễn phí
              </span>
              <span>
                <Check /> Còn {product.available} thiết bị
              </span>
            </div>

            <div className="selectors">
              <label>
                Thời gian thuê
                <select
                  value={days}
                  onChange={(event) => setDays(Number(event.target.value))}
                  aria-label="Thời gian thuê"
                >
                  {DURATIONS.map((value) => (
                    <option key={value} value={value}>
                      {value} ngày
                    </option>
                  ))}
                </select>
              </label>

              <div className="field" role="group" aria-label="Số lượng">
                <span>Số lượng</span>
                <div className="quantity">
                  <button type="button" aria-label="Giảm số lượng" onClick={() => changeQty(-1)}>
                    −
                  </button>
                  <b aria-live="polite">{quantity}</b>
                  <button type="button" aria-label="Tăng số lượng" onClick={() => changeQty(1)}>
                    +
                  </button>
                </div>
              </div>
            </div>

            <div className="cost-box">
              <span>Tạm tính</span>
              <strong>{money(total)}</strong>
              <small>
                {days} ngày × {quantity} thiết bị
              </small>
            </div>

            <div className="detail-actions">
              <button className="secondary" onClick={() => onAdd(product, days, quantity)}>
                Thêm vào giỏ
              </button>
              <button className="primary" onClick={() => onRentNow(product, days, quantity)}>
                Thuê ngay <ArrowRight />
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
