import ProductCard from '@/components/ui/ProductCard'
import Link from 'next/link'
import { ArrowRight, Check, Calendar, Search } from '@/components/ui/Icons'
import Mascot from '@/components/ui/Mascot'
import { CATEGORIES, HERO } from '@/data/products'
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
            <span className="eyebrow">Thuê thông minh • Sống linh hoạt</span>
            <h1>
              Công nghệ trong tầm tay, <em>thuê dễ dàng.</em>
            </h1>
            <p>
              Thuê thiết bị công nghệ linh hoạt, tiết kiệm và nhanh chóng. Không cần mua, vẫn luôn
              được trải nghiệm mới nhất.
            </p>
            <div className="hero-actions">
              <button className="primary" onClick={() => onNavigate('products')}>
                Khám phá thiết bị <ArrowRight />
              </button>
              <Link className="secondary" href="/san-pham">
                Xem toàn bộ thiết bị <ArrowRight />
              </Link>
              <button className="secondary" onClick={() => onNavigate('home', { anchor: 'how' })}>
                Cách thức thuê
              </button>
            </div>
            <div className="trust">
              <span>
                <b>4.9/5</b> từ 1.200+ khách hàng
              </span>
              <span>
                <b>24h</b> giao nhanh nội thành
              </span>
            </div>
          </div>

          <div className="hero-visual">
            <div className="hero-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt="Laptop hiện đại" src={HERO.image} />
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
            <span className="eyebrow">Lựa chọn nổi bật</span>
            <h2>Thiết bị được thuê nhiều nhất</h2>
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
              <h3>Thiết bị chất lượng</h3>
              <p>Kiểm tra 12 bước trước khi giao</p>
            </div>
          </div>
          <div className="benefit">
            <span>↻</span>
            <div>
              <h3>Linh hoạt thời gian</h3>
              <p>Thuê từ 1 ngày, gia hạn dễ dàng</p>
            </div>
          </div>
          <div className="benefit">
            <span>♢</span>
            <div>
              <h3>Chi phí tối ưu</h3>
              <p>Tiết kiệm đến 70% so với mua</p>
            </div>
          </div>
          <div className="benefit">
            <span>◉</span>
            <div>
              <h3>Hỗ trợ tận tâm</h3>
              <p>Đồng hành kỹ thuật 7 ngày/tuần</p>
            </div>
          </div>
        </div>
      </section>

      <section id="how" className="section shell how">
        <div className="section-head">
          <div>
            <span className="eyebrow">Nhanh chóng &amp; minh bạch</span>
            <h2>Thuê thiết bị chỉ với 3 bước</h2>
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
            <h3>Đặt thuê online</h3>
            <p>Điền thông tin, địa chỉ và hình thức nhận.</p>
          </div>
          <div className="step">
            <span>03</span>
            <div className="step-icon">
              <Check size={28} />
            </div>
            <h3>Nhận &amp; trải nghiệm</h3>
            <p>Nhận thiết bị đã kiểm định và bắt đầu sử dụng.</p>
          </div>
        </div>
      </section>

      <section id="about" className="support shell">
        <div>
          <span className="eyebrow">A.I.R luôn bên bạn</span>
          <h2>Cần tư vấn thiết bị phù hợp?</h2>
          <p>
            Đội ngũ hỗ trợ và trợ lý A.I.R sẵn sàng giải đáp về sản phẩm, giá và quy trình thuê.
          </p>
          <button className="primary" onClick={() => onOpenChat('consult')}>
            Chat với A.I.R
          </button>
        </div>
        <Mascot />
      </section>
    </main>
  )
}
