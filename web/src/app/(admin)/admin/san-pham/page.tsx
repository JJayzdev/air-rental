import { redirect } from 'next/navigation'
import { saveAdminProduct } from '@/features/admin/actions'
import { listAdminCategories, listAdminProducts } from '@/features/admin/server-data'
import { PRODUCT_STATE_LABELS } from '@/features/admin/labels'
import { getVerifiedAppRole } from '@/lib/supabase/auth'
import { money } from '@/lib/format'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: 'Quản lý sản phẩm',
}

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string }>
}) {
  const { user, role, supabase } = await getVerifiedAppRole()
  if (!user) redirect('/dang-nhap?next=%2Fadmin%2Fsan-pham')
  if (role !== 'admin') redirect('/admin?denied=admin')
  const [products, categories] = await Promise.all([
    listAdminProducts(supabase),
    listAdminCategories(supabase),
  ])
  const params = await searchParams

  return (
    <main className="admin-page rental-admin">
      <div className="rental-heading">
        <p className="eyebrow">Quản trị</p>
        <h1>Sản phẩm</h1>
        <p className="rental-notice">
          Giá và tiền cọc áp dụng cho đơn mới. Sản phẩm chỉ hiện trên trang bán khi ở trạng thái
          “Đang cho thuê”.
        </p>
      </div>
      {params.product === 'saved' && (
        <p className="rental-message" role="status">
          Đã lưu sản phẩm.
        </p>
      )}
      {(params.product === 'failed' || params.product === 'invalid') && (
        <p className="rental-error" role="alert">
          Chưa lưu được sản phẩm. Kiểm tra đường dẫn, giá và danh mục.
        </p>
      )}

      <section className="rental-panel rental-admin-panel" aria-labelledby="admin-new-product">
        <h2 id="admin-new-product">Thêm sản phẩm</h2>
        <form
          action={saveAdminProduct}
          className="rental-form rental-admin-form"
          data-testid="admin-product-form"
        >
          <input name="productId" type="hidden" value="" />
          <label>
            Danh mục
            <select defaultValue={categories[0]?.id ?? ''} name="categoryId" required>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Đường dẫn
            <input name="slug" placeholder="may-anh-sony-a7" required />
          </label>
          <label>
            Tên sản phẩm
            <input name="name" required />
          </label>
          <label>
            Mô tả
            <textarea name="description" rows={2} />
          </label>
          <label>
            Link ảnh (mỗi link một dòng)
            <textarea
              name="imageUrls"
              placeholder="/images/catalog/may-anh.jpg&#10;https://..."
              rows={3}
            />
          </label>
          <label>
            Giá thuê / ngày (VND)
            <input inputMode="numeric" name="pricePerDayVnd" required />
          </label>
          <label>
            Tiền cọc (VND)
            <input defaultValue="0" inputMode="numeric" name="depositVnd" required />
          </label>
          <label>
            Trạng thái
            <select defaultValue="draft" name="state">
              {Object.entries(PRODUCT_STATE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <button className="primary" type="submit">
            Tạo sản phẩm
          </button>
        </form>
      </section>

      <section aria-labelledby="admin-product-list" className="rental-admin-section">
        <h2 id="admin-product-list">Danh sách ({products.length})</h2>
        {products.length === 0 ? (
          <p className="rental-panel">Chưa có sản phẩm.</p>
        ) : (
          <div className="rental-admin-list" data-testid="admin-products">
            {products.map((product) => (
              <article className="rental-panel rental-admin-item" key={product.id}>
                <header>
                  <div className="admin-product-head">
                    {product.imageUrls[0] && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img alt="" className="admin-product-thumb" src={product.imageUrls[0]} />
                    )}
                    <div>
                      <h3>{product.name}</h3>
                      <p className="rental-admin-meta">
                        {product.categoryName} · {product.slug} · {product.availableUnits}/
                        {product.unitCount} máy sẵn sàng
                        {product.isSample ? ' · dữ liệu mẫu' : ''}
                      </p>
                    </div>
                  </div>
                  <span className={`rental-payment-badge is-${product.state}`}>
                    {PRODUCT_STATE_LABELS[product.state]}
                  </span>
                </header>
                <p>
                  {money(product.pricePerDayVnd)} / ngày · cọc {money(product.depositVnd)}
                </p>
                <details className="rental-admin-details">
                  <summary>Chỉnh sửa</summary>
                  <form action={saveAdminProduct} className="rental-form rental-admin-form">
                    <input name="productId" type="hidden" value={product.id} />
                    <label>
                      Danh mục
                      <select defaultValue={product.categoryId} name="categoryId" required>
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Đường dẫn
                      <input defaultValue={product.slug} name="slug" required />
                    </label>
                    <label>
                      Tên sản phẩm
                      <input defaultValue={product.name} name="name" required />
                    </label>
                    <label>
                      Mô tả
                      <textarea defaultValue={product.description} name="description" rows={2} />
                    </label>
                    <label>
                      Link ảnh (mỗi link một dòng)
                      <textarea
                        defaultValue={product.imageUrls.join('\\n')}
                        name="imageUrls"
                        rows={3}
                      />
                    </label>
                    <label>
                      Giá thuê / ngày (VND)
                      <input
                        defaultValue={String(product.pricePerDayVnd)}
                        inputMode="numeric"
                        name="pricePerDayVnd"
                        required
                      />
                    </label>
                    <label>
                      Tiền cọc (VND)
                      <input
                        defaultValue={String(product.depositVnd)}
                        inputMode="numeric"
                        name="depositVnd"
                        required
                      />
                    </label>
                    <label>
                      Trạng thái
                      <select defaultValue={product.state} name="state">
                        {Object.entries(PRODUCT_STATE_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button className="primary" type="submit">
                      Lưu thay đổi
                    </button>
                  </form>
                </details>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
