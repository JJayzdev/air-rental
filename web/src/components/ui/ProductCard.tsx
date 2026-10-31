import type { KeyboardEvent } from 'react'
import { Heart } from './Icons'
import { money } from '@/lib/format'
import type { Product } from '@/types'

interface ProductCardProps {
  product: Product
  favorite: boolean
  onDetail: (product: Product) => void
  onRent: (product: Product) => void
  onToggleFavorite: (product: Product) => void
}

export default function ProductCard({
  product,
  favorite,
  onDetail,
  onRent,
  onToggleFavorite,
}: ProductCardProps) {
  const openDetail = () => onDetail(product)

  // Vùng ảnh và vùng thông tin đều bấm được, nên phải dùng được bằng bàn phím.
  const openDetailOnKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onDetail(product)
    }
  }

  return (
    <article className="product-card">
      <div
        className="product-image"
        role="button"
        tabIndex={0}
        aria-label={`Xem chi tiết ${product.name}`}
        onClick={openDetail}
        onKeyDown={openDetailOnKey}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img alt={product.name} src={product.image} loading="lazy" />
        <span className="available">Còn hàng</span>
        <button
          type="button"
          className={`favorite ${favorite ? 'active' : ''}`}
          aria-label={favorite ? 'Bỏ yêu thích' : 'Yêu thích'}
          aria-pressed={favorite}
          onClick={(event) => {
            event.stopPropagation()
            onToggleFavorite(product)
          }}
        >
          <Heart />
        </button>
      </div>

      <div
        className="product-content"
        role="button"
        tabIndex={0}
        onClick={openDetail}
        onKeyDown={openDetailOnKey}
      >
        <span className="product-category">{product.category}</span>
        <h3>{product.name}</h3>
        <p>{product.specs}</p>
        <div className="product-price">
          <strong>{money(product.price)}</strong>
          <span>/ ngày</span>
        </div>
      </div>

      <div className="card-actions">
        <button className="secondary" onClick={() => onDetail(product)}>
          Chi tiết
        </button>
        <button className="primary" onClick={() => onRent(product)}>
          Thuê ngay
        </button>
      </div>
    </article>
  )
}
