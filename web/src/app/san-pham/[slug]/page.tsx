import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { AddRentalButton } from '@/features/cart/add-rental-button'
import { FavoriteToggle } from '@/features/favorites/favorite-toggle'
import { readViewerFavorites } from '@/features/favorites/server-data'
import { notFound } from 'next/navigation'
import { getCatalog } from '@/features/products/catalog-server'
import { findCatalogProduct, jsonLdScript } from '@/features/products/catalog-data'
import { absoluteAppUrl } from '@/features/products/catalog-seo'

export const dynamic = 'force-dynamic'

type ProductPageProps = { params: Promise<{ slug: string }> }

async function findProduct(slug: string) {
  const catalog = await getCatalog()
  return findCatalogProduct(catalog.products, slug)
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params
  const product = await findProduct(slug)
  if (!product)
    return { title: 'Không tìm thấy sản phẩm | A.I.R', robots: { index: false, follow: true } }
  const url = `/san-pham/${encodeURIComponent(product.slug)}`
  const description = `${product.name} — giá tham khảo ${product.pricePerDayVnd.toLocaleString('vi-VN')} ₫/ngày. ${product.description}`
  return {
    title: `${product.name} | A.I.R`,
    description,
    alternates: { canonical: url },
    robots: product.isSample ? { index: false, follow: true } : undefined,
    openGraph: {
      title: `${product.name} | A.I.R`,
      description,
      url,
      type: 'website',
      images: [{ url: product.imageUrls[0], alt: product.imageAlt || product.name }],
    },
  }
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params
  const [product, viewer] = await Promise.all([findProduct(slug), readViewerFavorites()])
  if (!product) notFound()
  const detailHref = `/san-pham/${encodeURIComponent(product.slug)}`

  const canonical = absoluteAppUrl(`/san-pham/${encodeURIComponent(product.slug)}`)
  const structuredData: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    sku: product.slug,
    category: product.categoryName,
    image: product.imageUrls.map((image) => new URL(image, absoluteAppUrl('/')).toString()),
    url: canonical,
  }
  if (!product.isSample) {
    structuredData.offers = {
      '@type': 'Offer',
      priceCurrency: 'VND',
      price: product.pricePerDayVnd,
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        priceCurrency: 'VND',
        price: product.pricePerDayVnd,
        unitText: 'DAY',
      },
      url: canonical,
      description: product.isSample
        ? 'Giá minh hoạ, không phải báo giá thuê.'
        : 'Giá tham khảo theo ngày.',
    }
  }

  return (
    <main>
      <section className="section shell page-section">
        <nav className="catalog-breadcrumb" aria-label="Breadcrumb">
          <Link href="/">Trang chủ</Link>
          <span aria-hidden="true">/</span>
          <Link href="/san-pham">Sản phẩm</Link>
          <span aria-hidden="true">/</span>
          <span>{product.name}</span>
        </nav>
        {product.isSample && (
          <aside className="catalog-sample-note" role="note">
            <strong>Sản phẩm tham khảo • giá và kho là dữ liệu mẫu</strong>
            <span>
              Thông số liên kết tới nhà sản xuất; chưa có xác nhận máy này sẵn sàng cho thuê.
            </span>
          </aside>
        )}
        <div className="catalog-detail">
          <div className="catalog-detail-image">
            <Image
              src={product.imageUrls[0]}
              alt={product.imageAlt || product.name}
              fill
              priority
              sizes="(max-width: 760px) 100vw, 55vw"
            />
            {product.isSample && (
              <span className="catalog-sample-badge">
                {product.imageCredit ? 'ẢNH THAM KHẢO' : 'ẢNH MẪU'}
              </span>
            )}
          </div>
          {product.imageCredit && (
            <p className="catalog-image-credit">
              Ảnh tham khảo © {product.imageCredit.author} ·{' '}
              <a href={product.imageCredit.licenseUrl} target="_blank" rel="license noreferrer">
                {product.imageCredit.license}
              </a>{' '}
              ·{' '}
              <a href={product.imageCredit.sourceUrl} target="_blank" rel="noreferrer">
                Nguồn ảnh
              </a>
              . {product.imageCredit.modificationNote}
            </p>
          )}
          <article className="catalog-detail-info">
            <span className="eyebrow">{product.categoryName}</span>
            <h1>{product.name}</h1>
            <p className="specs">{product.description}</p>
            {product.sourceUrl && (
              <p className="catalog-source-link">
                <a href={product.sourceUrl} target="_blank" rel="noreferrer">
                  Thông số nhà sản xuất ↗
                </a>
              </p>
            )}
            <div className="detail-price">
              {product.pricePerDayVnd.toLocaleString('vi-VN')} ₫{' '}
              <small>/ ngày · giá tham khảo</small>
            </div>
            <p className="catalog-deposit">
              Tiền cọc tham khảo: {product.depositVnd.toLocaleString('vi-VN')} ₫
            </p>
            <h2>Thông số</h2>
            <dl className="catalog-spec-list">
              {Object.entries(product.specifications).map(([key, value]) => (
                <div key={key}>
                  <dt>{key.replaceAll('_', ' ')}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
            <div className="catalog-boundary-note">
              {product.isSample
                ? 'Sản phẩm mẫu chỉ để xem; không thể đặt thuê. Giá và cọc là số liệu minh họa.'
                : 'Sản phẩm này có trong backend catalog. Bước đặt thuê cần tài khoản và unit fixture khả dụng trên Supabase local; không tạo giao dịch hay giao nhận thật.'}
            </div>
            <div className="detail-actions">
              <Link className="secondary" href="/san-pham">
                Quay lại danh mục
              </Link>
              {product.isSample ? (
                <span className="sample-booking-disabled">Mẫu tham khảo — chưa nhận đặt thuê</span>
              ) : (
                <AddRentalButton productId={product.id} />
              )}
              <FavoriteToggle
                productId={product.id}
                next={detailHref}
                signedIn={viewer.signedIn}
                favorited={viewer.productIds.has(product.id)}
              />
            </div>
          </article>
        </div>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdScript(structuredData) }}
        />
      </section>
    </main>
  )
}
