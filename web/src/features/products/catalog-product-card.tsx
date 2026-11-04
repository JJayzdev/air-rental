import Image from 'next/image'
import Link from 'next/link'
import type { CatalogProduct } from './catalog-data'

function specsSummary(product: CatalogProduct) {
  return Object.entries(product.specifications)
    .slice(0, 3)
    .map(([key, value]) => `${key.replaceAll('_', ' ')} ${value}`)
    .join(' · ')
}

export function CatalogProductCard({ product }: { product: CatalogProduct }) {
  const href = `/san-pham/${encodeURIComponent(product.slug)}`
  return (
    <article className="product-card">
      <Link className="catalog-product-image" href={href}>
        <Image
          src={product.imageUrls[0]}
          alt={product.imageAlt || product.name}
          fill
          sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 25vw"
        />
        <span className="available">Có sẵn</span>
      </Link>
      <div className="product-content">
        <span className="product-category">{product.categoryName}</span>
        <h3 className="catalog-card-heading">
          <Link href={href}>{product.name}</Link>
        </h3>
        <p>{specsSummary(product)}</p>
        <div className="product-price">
          <strong>{product.pricePerDayVnd.toLocaleString('vi-VN')} ₫</strong>
          <span>/ ngày</span>
        </div>
      </div>
      <div className="card-actions">
        <Link className="primary" href={href}>
          Xem chi tiết
        </Link>
      </div>
    </article>
  )
}
