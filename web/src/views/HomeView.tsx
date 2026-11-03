import ProductCard from '@/components/ui/ProductCard'
import Link from 'next/link'
import { ArrowRight, Check, Calendar, Search } from '@/components/ui/Icons'
import Mascot from '@/components/ui/Mascot'
import { CATEGORIES, HERO, HERO_IMAGE } from '@/data/products'
import type { NavOptions, Product, View } from '@/types'

interface HomeViewProps {
  products: Product[]
  favorites: number[]
  onNavigate: (view: View, options?: NavOptions) => void
  onDetail: (product: Product) => void
  onRent: (product: Product) => void
  onToggleFavorite: (product: Product) => void
  onOpenChat: (promptKey?: 'support' | 'contact' | 'consult') => void
}

export default function HomeView({
  products,
  favorites,
  onNavigate,
  onDetail,
  onRent,
  onToggleFavorite,
  onOpenChat,
}: HomeViewProps) {
  return (
    <main>
      <section className="hero">
        <div className="orb orb-a" />
        <div className="orb orb-b" />
        <div className="shell hero-grid">
          <div className="hero-copy">
            <span className="eyebrow">Prototype giao diện • Dữ liệu giả lập</span>
            <h1>
              Trải nghiệm một luồng thuê thiết bị, <em>trong phạm vi đồ án.</em>
            </h1>
            <p>
              Bản prototype này minh họa giao diện và tương tác lưu trong trình duyệt. Sản phẩm, số
              liệu, khách hàng và đơn ở đây là dữ liệu mẫu; không có giao dịch hoặc thiết bị thật.
            </p>
            <div className="hero-actions">
              <button className="primary" onClick={() => onNavigate('products')}>
                Xem sản phẩm giả lập <ArrowRight />
              </button>
              <Link className="secondary" href="/san-pham">
                Xem toàn bộ thiết bị <ArrowRight />
              </Link>
              <button className="secondary" onClick={() => onNavigate('home', { anchor: 'how' })}>
                Cách thức thuê
              </button>
            </div>
            <p className="catalog-sample-note" role="note">
              Các số liệu và giá trong prototype chỉ minh họa cách trình bày; không phải đánh giá,
              lượng khách, thời hạn giao hay báo giá thật.
            </p>
          </div>

          <div className="hero-visual">
            <div className="hero-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt="Laptop hiện đại"
                src={HERO.image}
                srcSet={HERO_IMAGE.srcSet}
                sizes={HERO_IMAGE.sizes}
                fetchPriority="high"
              />
              <span className="price-chip">
                Chỉ từ <b>350K/ngày</b>
              </span>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="floating-product phone" alt="Điện thoại" src={HERO.phone} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="floating-product camera" alt="Máy ảnh" src={HERO.camera} />
          </div>
        </div>
      </section>

      <section className="categories shell">
        <div className="category-row">
          {CATEGORIES.map((category) => (
            <button
              key={category.id}
              onClick={() => onNavigate('products', { category: category.id })}
            >
              <span>{category.icon}</span>
              {category.label}
            </button>
          ))}
        </div>
      </section>

      <section className="section shell">
        <div className="section-head">
          <div>
            <span className="eyebrow">Catalog minh họa</span>
            <h2>Sản phẩm mẫu trong prototype</h2>
          </div>
          <button onClick={() => onNavigate('products')}>
            Xem tất cả <ArrowRight />
          </button>
        </div>

        <div className="product-grid">
          {products.slice(0, 4).map((product) => (
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
      </section>

      <section className="benefits">
        <div className="shell benefits-grid">
          <div className="benefit">
            <span>✓</span>
            <div>
              <h3>Dữ liệu catalog</h3>
              <p>Thẻ sản phẩm và thông số minh họa</p>
            </div>
          </div>
          <div className="benefit">
            <span>↻</span>
            <div>
              <h3>Chọn lịch trong UI</h3>
              <p>Điều khiển trình diễn trong prototype</p>
            </div>
          </div>
          <div className="benefit">
            <span>♢</span>
            <div>
              <h3>Giá minh họa</h3>
              <p>Không phải báo giá hoặc khoản thanh toán</p>
            </div>
          </div>
          <div className="benefit">
            <span>◉</span>
            <div>
              <h3>FAQ local</h3>
              <p>Trợ lý rule-based trong phạm vi demo</p>
            </div>
          </div>
        </div>
      </section>

      <section id="how" className="section shell how">
        <div className="section-head">
          <div>
            <span className="eyebrow">Kịch bản giao diện</span>
            <h2>Luồng thuê được mô phỏng qua 3 bước</h2>
          </div>
        </div>

        <div className="steps">
          <div className="step">
            <span>01</span>
            <div className="step-icon">
              <Search size={28} />
            </div>
            <h3>Chọn thiết bị</h3>
            <p>Tìm sản phẩm phù hợp và chọn thời gian thuê.</p>
          </div>
          <div className="step">
            <span>02</span>
            <div className="step-icon">
              <Calendar size={28} />
            </div>
            <h3>Màn hình checkout</h3>
            <p>Prototype cũ lưu dữ liệu giả lập trong trình duyệt.</p>
          </div>
          <div className="step">
            <span>03</span>
            <div className="step-icon">
              <Check size={28} />
            </div>
            <h3>Xem kết quả demo</h3>
            <p>Đơn prototype không tạo giao nhận hoặc giao dịch.</p>
          </div>
        </div>
      </section>

      <section id="about" className="support shell">
        <div>
          <span className="eyebrow">Bài tập tương tác</span>
          <h2>Thử FAQ local trong prototype</h2>
          <p>
            Câu trả lời được tạo tại trình duyệt từ các quy tắc mẫu; không có nhân viên hỗ trợ thật.
          </p>
          <button className="primary" onClick={() => onOpenChat('consult')}>
            Mở FAQ local
          </button>
        </div>
        <Mascot />
      </section>
    </main>
  )
}
