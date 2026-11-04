import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { policyDocuments } from '../content'

interface PolicyPageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PolicyPageProps): Promise<Metadata> {
  const { slug } = await params
  const policy = policyDocuments.find((item) => item.slug === slug)
  return {
    title: policy ? policy.title : 'Chính sách thuê thiết bị',
    description: policy?.description,
    alternates: policy ? { canonical: `/chinh-sach/${policy.slug}` } : undefined,
  }
}

export default async function PolicyDraftPage({ params }: PolicyPageProps) {
  const { slug } = await params
  const policy = policyDocuments.find((item) => item.slug === slug)
  if (!policy) notFound()

  return (
    <main className="shell guide-article">
      <nav className="rental-breadcrumb" aria-label="Đường dẫn">
        <Link href="/chinh-sach">Chính sách</Link>
        <span> / {policy.title}</span>
      </nav>
      <article>
        <header className="guide-article-heading">
          <p className="eyebrow">A.I.R Rental</p>
          <h1>{policy.title}</h1>
          <p>{policy.description}</p>
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
        <Link href="/chinh-sach">← Xem tất cả chính sách</Link>
      </p>
    </main>
  )
}
