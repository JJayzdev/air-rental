import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { policyDrafts } from '../content'

interface PolicyPageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PolicyPageProps): Promise<Metadata> {
  const { slug } = await params
  const policy = policyDrafts.find((item) => item.slug === slug)
  return {
    title: policy ? `${policy.title} | A.I.R` : 'Chính sách mô phỏng — A.I.R',
    description: policy?.description,
    robots: { index: false, follow: false },
  }
}

export default async function PolicyDraftPage({ params }: PolicyPageProps) {
  const { slug } = await params
  const policy = policyDrafts.find((item) => item.slug === slug)
  if (!policy) notFound()

  return (
    <main className="shell guide-article">
      <nav className="rental-breadcrumb" aria-label="Đường dẫn">
        <Link href="/chinh-sach">Kịch bản mô phỏng</Link>
        <span> / {policy.title}</span>
      </nav>
      <article>
        <header className="guide-article-heading">
          <p className="eyebrow">Tài liệu học tập · không phải chính sách doanh nghiệp</p>
          <h1>{policy.title}</h1>
          <p>
            Chỉ dùng để trình bày/đánh giá đồ án với dữ liệu giả lập. Không dùng như điều kiện thuê,
            cam kết cung cấp dịch vụ hoặc hướng dẫn giao dịch thật.
          </p>
        </header>
        <div className="guide-prose">
          {policy.sections.map((section) => (
            <section key={section.title}>
              <h2>{section.title}</h2>
              {section.paragraphs.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </section>
          ))}
        </div>
      </article>
      <p className="guide-back">
        <Link href="/chinh-sach">← Xem các kịch bản mô phỏng</Link>
      </p>
    </main>
  )
}
