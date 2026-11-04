import type { Metadata } from 'next'
import Link from 'next/link'
import { guides } from './content'

export const metadata: Metadata = {
  title: 'Hướng dẫn thuê và chọn thiết bị',
  description:
    'Kinh nghiệm chọn laptop, máy ảnh và cân nhắc thuê hay mua thiết bị công nghệ theo nhu cầu.',
  alternates: { canonical: '/huong-dan' },
  openGraph: {
    title: 'Hướng dẫn chọn và thuê thiết bị',
    description: 'Hướng dẫn thực tế để chọn thiết bị theo nhu cầu sử dụng.',
    url: '/huong-dan',
    type: 'website',
  },
}

export default function GuidesPage() {
  return (
    <main>
      <section className="section shell page-section guide-page">
        <nav className="catalog-breadcrumb" aria-label="Breadcrumb">
          <Link href="/">Trang chủ</Link>
          <span aria-hidden="true">/</span>
          <span>Hướng dẫn</span>
        </nav>
        <div className="page-heading">
          <div>
            <span className="eyebrow">Cẩm nang thiết bị</span>
            <h1>Hướng dẫn chọn và thuê thiết bị</h1>
            <p>
              Thông tin nền tảng để bạn xác định thiết bị phù hợp với công việc và thời gian sử
              dụng.
            </p>
          </div>
        </div>
        <p className="catalog-sample-note" role="note">
          Hướng dẫn mang tính tham khảo chung. Trước khi đặt thuê, hãy kiểm tra model, cấu hình,
          giá, tiền cọc và khả năng cung cấp trên trang từng thiết bị.
        </p>
        <div className="guide-grid">
          {guides.map((guide) => (
            <article className="guide-card" key={guide.slug}>
              <span className="eyebrow">{guide.category}</span>
              <h2>
                <Link href={`/huong-dan/${guide.slug}`}>{guide.title}</Link>
              </h2>
              <p>{guide.description}</p>
              <Link className="guide-read-more" href={`/huong-dan/${guide.slug}`}>
                Đọc hướng dẫn <span aria-hidden="true">→</span>
              </Link>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}
