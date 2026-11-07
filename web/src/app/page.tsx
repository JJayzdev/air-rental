import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowRight, Calendar, Check, Search } from '@/components/ui/Icons'
import { SiteFooter } from '@/components/layout/site-footer'
import Mascot from '@/components/ui/Mascot'
import { SiteHeader } from '@/components/layout/site-header'
import { CatalogProductCard } from '@/features/products/catalog-product-card'
import { getCatalog } from '@/features/products/catalog-server'
import { CATALOG_CATEGORIES } from '@/features/products/catalog-data'

const unsplash = (id: string) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=900&q=85`

const HERO = {
  image: unsplash('1565630916779-e303be97b6f5'),
  phone: unsplash('1711967299865-c88350fddb70'),
  camera: unsplash('1516035069371-29a1b244cc32'),
}

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'A.I.R — Thuê thiết bị công nghệ theo ngày',
  description:
    'Thuê laptop, điện thoại, máy ảnh, tablet và phụ kiện công nghệ theo ngày. Đặt lịch trực tuyến, nhận máy linh hoạt, không cần mua.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'A.I.R — Thuê thiết bị công nghệ theo ngày',
    description:
      'Laptop, máy ảnh, điện thoại và phụ kiện cho công việc, sự kiện và chuyến đi. Đặt thuê theo ngày.',
    url: '/',
    type: 'website',
  },
}

function CategoryIcon({ slug }: { slug: string }) {
  const common = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }
  if (slug === 'all') {
    return (
      <svg {...common}>
        <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" />
        <path d="M19 16v4M17 18h4" />
      </svg>
    )
  }
  if (slug === 'laptop') {
    return (
      <svg {...common}>
        <rect x="3" y="4" width="18" height="12" rx="2" />
        <path d="M2 19h20" />
      </svg>
    )
  }
  if (slug === 'phone') {
    return (
      <svg {...common}>
        <rect x="7" y="3" width="10" height="18" rx="2" />
        <path d="M11 18h2" />
      </svg>
    )
  }
  if (slug === 'camera') {
    return (
      <svg {...common}>
        <path d="M4 7h4l2-3h4l2 3h4v11H4z" />
        <circle cx="12" cy="13" r="3.5" />
      </svg>
    )
  }
  if (slug === 'tablet') {
    return (
      <svg {...common}>
        <rect x="5" y="3" width="14" height="18" rx="2" />
        <path d="M11 18h2" />
      </svg>
    )
  }
  if (slug === 'accessory') {
    return (
      <svg {...common}>
        <path d="M8 7V5a4 4 0 0 1 8 0v2" />
        <rect x="3" y="7" width="18" height="13" rx="2" />
        <circle cx="12" cy="13.5" r="2.5" />
      </svg>
    )
  }
  return <span aria-hidden>+</span>
}

const BENEFITS = [
  {
    icon: '✓',
    title: 'Thiết bị được kiểm tra',
    text: 'Mỗi máy được vệ sinh và kiểm tra trước khi bàn giao.',
  },
  {
    icon: '↻',
    title: 'Linh hoạt theo ngày',
    text: 'Thuê ngắn ngày cho công việc, sự kiện hoặc chuyến đi.',
  },
  {
    icon: '♢',
    title: 'Giá minh bạch',
    text: 'Báo giá theo ngày, ưu đãi dài ngày và phí giao rõ ràng.',
  },
  {
    icon: '◉',
    title: 'Hỗ trợ nhanh',
    text: 'Trợ lý trực tuyến và đội ngũ hỗ trợ trong giờ hoạt động.',
  },
]

const STEPS = [
  {
    icon: <Search size={28} />,
    title: 'Chọn thiết bị',
    text: 'Tìm theo danh mục, so sánh cấu hình và thêm máy phù hợp vào giỏ thuê.',
  },
  {
    icon: <Calendar size={28} />,
    title: 'Chọn ngày nhận',
    text: 'Chọn lịch nhận, trả và hình thức nhận máy. Giá được tính ngay khi chọn ngày.',
  },
  {
    icon: <Check size={28} />,
    title: 'Xác nhận và nhận máy',
    text: 'Hoàn tất thông tin liên hệ, nhận xác nhận đơn và theo dõi trạng thái thuê.',
  },
]

export default async function HomePage() {
  const catalog = await getCatalog()
  // Số liệu ở hero chỉ tính hàng đặt thuê được; sản phẩm mẫu chỉ dùng khi chưa có hàng thật
  // (bản xem trước cục bộ). Trước đây "34+ thiết bị" và "Giá từ" tính cả 24 mẫu không đặt được.
  const bookable = catalog.products.filter((product) => !product.isSample)
  const listed = bookable.length ? bookable : catalog.products
  const featured = bookable.slice(0, 4)
  const showcase = featured.length ? featured : catalog.products.slice(0, 4)
  const minPrice = listed.length ? Math.min(...listed.map((product) => product.pricePerDayVnd)) : 0
  const priceLabel = minPrice > 0 ? `${Math.round(minPrice / 1000)}K/ngày` : ''

  return (
    <>
      <SiteHeader active="home" />

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
                <Link className="primary" href="/san-pham">
                  Khám phá thiết bị <ArrowRight />
                </Link>
                <Link className="secondary" href="/huong-dan">
                  Cách thức thuê
                </Link>
              </div>
              <div className="trust">
                <span>
                  <b>{listed.length}</b> thiết bị
                </span>
                <span>
                  <b>30 phút</b> giữ máy khi đặt
                </span>
              </div>
            </div>

            <div className="hero-visual">
              <div className="hero-card">
                <Image
                  src={HERO.image}
                  alt="Laptop và thiết bị công nghệ cho thuê"
                  fill
                  priority
                  sizes="(max-width: 900px) 80vw, 480px"
                />
                {priceLabel && (
                  <span className="price-chip">
                    Chỉ từ <b>{priceLabel}</b>
                  </span>
                )}
              </div>
              <Image
                className="floating-product phone"
                src={HERO.phone}
                alt="Điện thoại thông minh"
                sizes="105px"
                width={210}
                height={250}
              />
              <Image
                className="floating-product camera"
                src={HERO.camera}
                alt="Máy ảnh"
                sizes="105px"
                width={210}
                height={250}
              />
            </div>
          </div>
        </section>

        <section className="categories shell" aria-label="Danh mục thiết bị">
          <div className="category-row">
            {CATALOG_CATEGORIES.map((category) => (
              <Link
                className="category-chip"
                key={category.slug}
                href={category.slug === 'all' ? '/san-pham' : `/san-pham?danh-muc=${category.slug}`}
              >
                <CategoryIcon slug={category.slug} />
                {category.name}
              </Link>
            ))}
          </div>
        </section>

        <section className="section shell">
          <div className="section-head">
            <div>
              <span className="eyebrow">Sản phẩm nổi bật</span>
              <h2>Thiết bị được chọn nhiều</h2>
            </div>
            <Link href="/san-pham">
              Xem tất cả <ArrowRight />
            </Link>
          </div>
          <div className="product-grid">
            {showcase.map((product) => (
              <CatalogProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>

        <section className="benefits">
          <div className="shell benefits-grid">
            {BENEFITS.map((benefit) => (
              <div className="benefit" key={benefit.title}>
                <span>{benefit.icon}</span>
                <div>
                  <h3>{benefit.title}</h3>
                  <p>{benefit.text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="how" className="section shell how">
          <div className="section-head">
            <div>
              <span className="eyebrow">Quy trình thuê</span>
              <h2>Ba bước để nhận thiết bị</h2>
            </div>
          </div>
          <div className="steps">
            {STEPS.map((step, index) => (
              <div className="step" key={step.title}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <div className="step-icon">{step.icon}</div>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="subsection shell home-cta">
          <div>
            <span className="eyebrow">Sẵn sàng cho kế hoạch tiếp theo</span>
            <h2>Chọn thiết bị phù hợp và giữ lịch ngay hôm nay</h2>
            <p>
              Giỏ thuê được lưu trên trình duyệt. Bạn có thể chọn ngày, xem báo giá và hoàn tất
              thông tin nhận máy trong vài phút.
            </p>
          </div>
          <div className="home-cta-actions">
            <Link className="primary" href="/san-pham">
              Bắt đầu chọn máy
            </Link>
            <Link className="secondary" href="/gio-thue">
              Mở giỏ thuê
            </Link>
          </div>
        </section>

        <section className="support shell">
          <div>
            <span className="eyebrow">A.I.R luôn bên bạn</span>
            <h2>Cần tư vấn thiết bị phù hợp?</h2>
            <p>
              Đội ngũ hỗ trợ và trợ lý A.I.R sẵn sàng giải đáp về sản phẩm, giá và quy trình thuê.
            </p>
            <Link className="primary" href="/huong-dan">
              Xem hướng dẫn thuê
            </Link>
          </div>
          <Mascot />
        </section>
      </main>

      <SiteFooter />
    </>
  )
}
