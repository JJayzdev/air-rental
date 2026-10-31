import ProductCard from '../components/ui/ProductCard.jsx'
import { CATEGORIES } from '../data/products.js'

const EMPTY_ICON = '⌕'

export default function ProductsPage({
  products,
  favorites,
  category,
  sort,
  query,
  onCategory,
  onSort,
  onDetail,
  onRent,
  onToggleFavorite,
  onReset,
}) {
  return (
    <main>
      <section className="section shell page-section">
        <div className="page-heading">
          <div>
            <span className="eyebrow">Kho thiết bị</span>
            <h1>Khám phá sản phẩm</h1>
            <p>{products.length} thiết bị phù hợp với lựa chọn của bạn</p>
          </div>

          <select aria-label="Sắp xếp" value={sort} onChange={(e) => onSort(e.target.value)}>
            <option value="popular">Phổ biến nhất</option>
            <option value="low">Giá thấp đến cao</option>
            <option value="high">Giá cao đến thấp</option>
          </select>
        </div>

        <div className="categories category-compact">
          <div className="category-row">
            {CATEGORIES.map((item) => (
              <button
                key={item.id}
                className={category === item.id ? 'active' : ''}
                onClick={() => onCategory(item.id)}
              >
                <span>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {products.length > 0 ? (
          <div className="product-grid catalog-grid">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                favorite={favorites.includes(product.id)}
                onDetail={onDetail}
                onRent={onRent}
                onToggleFavorite={onToggleFavorite}
              />
            ))}
          </div>
        ) : (
          <div className="empty">
            <div aria-hidden="true" style={{ fontSize: 30 }}>
              {EMPTY_ICON}
            </div>
            <h2>Không tìm thấy thiết bị</h2>
            <p>
              {query
                ? `Không có kết quả cho “${query}”. Thử từ khóa khác nhé.`
                : 'Danh mục này hiện chưa có thiết bị.'}
            </p>
            <button className="primary" onClick={onReset}>
              Xem tất cả thiết bị
            </button>
          </div>
        )}
      </section>
    </main>
  )
}
