import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { absoluteAppUrl } from '@/features/products/catalog-seo'
import { guides } from '../content'

export function generateStaticParams() {
  return guides.map(({ slug }) => ({ slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const guide = guides.find((item) => item.slug === slug)
  if (!guide) return { title: 'Không tìm thấy hướng dẫn', robots: { index: false } }
  return {
    title: `${guide.title}`,
    description: guide.description,
    alternates: { canonical: `/huong-dan/${guide.slug}` },
    openGraph: {
      title: guide.title,
      description: guide.description,
      url: `/huong-dan/${guide.slug}`,
      type: 'article',
      publishedTime: guide.updated,
      modifiedTime: guide.updated,
    },
  }
}

export default async function GuideArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const guide = guides.find((item) => item.slug === slug)
  if (!guide) notFound()

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: guide.title,
    description: guide.description,
    dateModified: guide.updated,
    inLanguage: 'vi',
    mainEntityOfPage: absoluteAppUrl(`/huong-dan/${guide.slug}`),
    publisher: { '@type': 'Organization', name: 'A.I.R' },
  }

  return (
    <main>
      <article className="section shell page-section guide-article">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
        <nav className="catalog-breadcrumb" aria-label="Breadcrumb">
          <Link href="/">Trang chủ</Link>
          <span aria-hidden="true">/</span>
          <Link href="/huong-dan">Hướng dẫn</Link>
          <span aria-hidden="true">/</span>
          <span>{guide.title}</span>
        </nav>
        <header className="guide-article-heading">
          <span className="eyebrow">{guide.category}</span>
          <h1>{guide.title}</h1>
          <p>{guide.description}</p>
          <time dateTime={guide.updated}>
            Cập nhật{' '}
            {new Date(`${guide.updated}T00:00:00Z`).toLocaleDateString('vi-VN', {
              timeZone: 'UTC',
            })}
          </time>
        </header>
        <div className="guide-prose">{guide.body}</div>
        <p className="guide-back">
          <Link href="/huong-dan">← Tất cả hướng dẫn</Link>
        </p>
      </article>
    </main>
  )
}
