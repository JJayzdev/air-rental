import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { FavoriteToggle } from '@/features/favorites/favorite-toggle'
import { listFavoriteProductIds } from '@/features/favorites/server-data'
import { getCatalog } from '@/features/products/catalog-server'
import { requireVerifiedUser } from '@/lib/supabase/auth'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Thiết bị yêu thích',
  robots: { index: false, follow: false },
}

export default async function FavoritesPage({
  searchParams,
}: {
  searchParams: Promise<{ favorite?: string }>
}) {
  const { supabase, user } = await requireVerifiedUser('/yeu-thich')
  const [favoriteIds, catalog, params] = await Promise.all([
    listFavoriteProductIds(supabase, user.id),
    getCatalog(),
    searchParams,
  ])
  const products = catalog.products.filter((product) => favoriteIds.has(product.id))

  return (
    <main className="shell rental-page">
      <div className="rental-heading">
        <p className="eyebrow">Tài khoản</p>
        <h1>Thiết bị yêu thích</h1>
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
      {params.favorite === 'invalid' && (
        <p className="rental-error" role="alert">
          Thiết bị không hợp lệ. Vui lòng thử lại từ trang sản phẩm.
        </p>
      )}
      {params.favorite === 'failed' && (
        <p className="rental-error" role="alert">
          Chưa cập nhật được danh sách yêu thích. Vui lòng thử lại.
        </p>
      )}
      {products.length === 0 ? (
        <p className="rental-panel">
          Chưa có thiết bị yêu thích. <Link href="/san-pham">Khám phá danh mục</Link> để lưu thiết
          bị bạn quan tâm.
        </p>
      ) : (
        <div className="rental-favorite-list" data-testid="favorite-products">
          {products.map((product) => (
            <article className="rental-panel rental-favorite-card" key={product.id}>
              <Link
                className="rental-favorite-image"
                href={`/san-pham/${encodeURIComponent(product.slug)}`}
              >
                <Image
                  src={product.imageUrls[0]}
                  alt={product.imageAlt || product.name}
                  fill
                  sizes="(max-width: 700px) 100vw, 180px"
                />
              </Link>
              <div className="rental-favorite-body">
                <span className="product-category">{product.categoryName}</span>
                <h2>
                  <Link href={`/san-pham/${encodeURIComponent(product.slug)}`}>{product.name}</Link>
                </h2>
                <p>
                  {product.pricePerDayVnd.toLocaleString('vi-VN')} ₫ / ngày · cọc{' '}
                  {product.depositVnd.toLocaleString('vi-VN')} ₫
                </p>
                <div className="rental-favorite-actions">
                  <Link
                    className="secondary"
                    href={`/san-pham/${encodeURIComponent(product.slug)}`}
                  >
                    Xem chi tiết
                  </Link>
                  <FavoriteToggle
                    productId={product.id}
                    next="/yeu-thich"
                    signedIn
                    favorited
                    compact
                  />
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  )
}
