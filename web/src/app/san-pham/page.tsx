import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { FavoriteToggle } from '@/features/favorites/favorite-toggle'
import { readViewerFavorites } from '@/features/favorites/server-data'
import { getCatalog } from '@/features/products/catalog-server'
import {
  CATALOG_CATEGORIES,
  filterCatalogProducts,
  parseCatalogFilters,
  type CatalogSearchParams,
} from '@/features/products/catalog-data'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Thiết bị cho thuê',
    description:
      'Khám phá laptop, điện thoại, máy ảnh, tablet và phụ kiện công nghệ cho thuê theo ngày tại A.I.R.',
    alternates: { canonical: '/san-pham' },
    openGraph: {
      title: 'Thiết bị cho thuê | A.I.R',
      description: 'Laptop, máy ảnh, điện thoại và phụ kiện cho thuê theo ngày.',
      url: '/san-pham',
      images: [{ url: '/images/catalog-placeholder.svg', alt: 'Thiết bị cho thuê tại A.I.R' }],
      type: 'website',
    },
  }
}

function catalogHref(filters: { category: string; sort: string; query: string }) {
  const params = new URLSearchParams()
  if (filters.category !== 'all') params.set('danh-muc', filters.category)
  if (filters.sort !== 'popular')
    params.set('sap-xep', filters.sort === 'price-asc' ? 'gia-tang' : 'gia-giam')
  if (filters.query) params.set('q', filters.query)
  const query = params.toString()
  return query ? `/san-pham?${query}` : '/san-pham'
}

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<CatalogSearchParams>
}) {
  const params = await searchParams
  const filters = parseCatalogFilters(params)
  const [catalog, viewer] = await Promise.all([getCatalog(), readViewerFavorites()])
  const products = filterCatalogProducts(catalog.products, filters)
  const hasSamples = products.some((product) => product.isSample)
  const pageHref = catalogHref(filters)

  return (
    <main>
      <section className="section shell page-section">
        <nav className="catalog-breadcrumb" aria-label="Breadcrumb">
          <Link href="/">Trang chủ</Link>
          <span aria-hidden="true">/</span>
          <span>Sản phẩm</span>
        </nav>
        <div className="page-heading">
          <div>
            <span className="eyebrow">Danh mục thiết bị</span>
            <h1>Thuê thiết bị công nghệ</h1>
            <p>{products.length} thiết bị phù hợp với lựa chọn của bạn</p>
          </div>
        </div>

        {params.favorite === 'saved' && (
          <p className="rental-message" role="status">
            Đã lưu thiết bị vào danh sách yêu thích.
          </p>
        )}
        {params.favorite === 'removed' && (
          <p className="rental-message" role="status">
            Đã bỏ thiết bị khỏi danh sách yêu thích.
          </p>
        )}
        {params.favorite === 'failed' && (
          <p className="rental-error" role="alert">
            Chưa cập nhật được danh sách yêu thích. Vui lòng thử lại.
          </p>
        )}

        {(catalog.mode === 'local-sample' || hasSamples) && (
          <aside className="catalog-sample-note" role="note">
            <strong>
              {catalog.mode === 'local-sample'
                ? 'Chế độ xem trước cục bộ'
                : 'Một số thiết bị đang ở chế độ xem trước'}
            </strong>
            <span>
              {catalog.mode === 'local-sample'
                ? 'Danh mục đang hiển thị dữ liệu mẫu để xem trước giao diện và quy trình thuê. Giá, cọc và tình trạng máy không phải cam kết cung cấp.'
                : 'Các thiết bị có nhãn Tham khảo chỉ để xem thông tin. Thiết bị còn lại có thể đặt thuê và được kiểm tra tồn kho khi xác nhận.'}
            </span>
          </aside>
        )}

        <form className="catalog-filters" action="/san-pham" method="get">
          <label>
            Từ khoá
            <input
              name="q"
              defaultValue={filters.query}
              maxLength={100}
              placeholder="Tên hoặc cấu hình"
            />
          </label>
          <label>
            Danh mục
            <select name="danh-muc" defaultValue={filters.category}>
              {CATALOG_CATEGORIES.map((category) => (
                <option key={category.slug} value={category.slug}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Sắp xếp
            <select
              name="sap-xep"
              defaultValue={
                filters.sort === 'popular'
                  ? 'pho-bien'
                  : filters.sort === 'price-asc'
                    ? 'gia-tang'
                    : 'gia-giam'
              }
            >
              <option value="pho-bien">Thứ tự mặc định</option>
              <option value="gia-tang">Giá thấp đến cao</option>
              <option value="gia-giam">Giá cao đến thấp</option>
            </select>
          </label>
          <button className="primary" type="submit">
            Lọc sản phẩm
          </button>
          {filters.category !== 'all' || filters.sort !== 'popular' || filters.query ? (
            <Link className="catalog-reset" href="/san-pham">
              Xoá bộ lọc
            </Link>
          ) : null}
        </form>

        <div className="catalog-category-links" aria-label="Danh mục sản phẩm">
          {CATALOG_CATEGORIES.map((category) => (
            <Link
              key={category.slug}
              className={filters.category === category.slug ? 'active' : ''}
              href={catalogHref({ ...filters, category: category.slug })}
              aria-current={filters.category === category.slug ? 'page' : undefined}
            >
              {category.name}
            </Link>
          ))}
        </div>

        {products.length ? (
          <div className="product-grid catalog-grid">
            {products.map((product) => (
              <article className="product-card" key={product.id}>
                <Link
                  className="catalog-product-image"
                  href={`/san-pham/${encodeURIComponent(product.slug)}`}
                >
                  <Image
                    src={product.imageUrls[0]}
                    alt={product.imageAlt || product.name}
                    fill
                    sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 33vw"
                  />
                  <span className={product.isSample ? 'catalog-sample-badge' : 'available'}>
                    {product.isSample ? 'Tham khảo' : 'Có sẵn'}
                  </span>
                </Link>
                {product.imageCredit && (
                  <p className="catalog-image-credit catalog-image-credit-card">
                    Ảnh © {product.imageCredit.author} ·{' '}
                    <a
                      href={product.imageCredit.licenseUrl}
                      target="_blank"
                      rel="license noreferrer"
                    >
                      {product.imageCredit.license}
                    </a>{' '}
                    ·{' '}
                    <a href={product.imageCredit.sourceUrl} target="_blank" rel="noreferrer">
                      Nguồn
                    </a>{' '}
                    · Ảnh hiển thị có thể được tối ưu kích thước/định dạng
                  </p>
                )}
                <div className="product-content">
                  <span className="product-category">{product.categoryName}</span>
                  <h2 className="catalog-card-heading">
                    <Link href={`/san-pham/${encodeURIComponent(product.slug)}`}>
                      {product.name}
                    </Link>
                  </h2>
                  <p>
                    {Object.entries(product.specifications)
                      .slice(0, 3)
                      .map(([key, value]) => `${key.replaceAll('_', ' ')} ${value}`)
                      .join(' · ')}
                  </p>
                  <div className="product-price">
                    <strong>{product.pricePerDayVnd.toLocaleString('vi-VN')} ₫</strong>
                    <span>/ ngày</span>
                  </div>
                </div>
                <div className="card-actions">
                  <Link className="primary" href={`/san-pham/${encodeURIComponent(product.slug)}`}>
                    Chi tiết
                  </Link>
                  <FavoriteToggle
                    productId={product.id}
                    next={pageHref}
                    signedIn={viewer.signedIn}
                    favorited={viewer.productIds.has(product.id)}
                    compact
                  />
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty">
            <div aria-hidden="true" style={{ fontSize: 30 }}>
              ⌕
            </div>
            <h2>Không tìm thấy thiết bị</h2>
            <p>
              {filters.query
                ? `Không có kết quả cho “${filters.query}”. Thử từ khóa khác nhé.`
                : 'Danh mục này hiện chưa có thiết bị.'}
            </p>
            <Link className="primary" href="/san-pham">
              Xem tất cả thiết bị
            </Link>
          </div>
        )}

        <p className="catalog-footer-note">
          Cần tư vấn chọn máy? Xem <Link href="/huong-dan">hướng dẫn thuê</Link> hoặc mở chat để
          được gợi ý theo nhu cầu.
        </p>
      </section>
    </main>
  )
}
