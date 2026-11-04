import type { MetadataRoute } from 'next'
import { getCatalog } from '@/features/products/catalog-server'
import { absoluteAppUrl } from '@/features/products/catalog-seo'
import { guides } from './huong-dan/content'
import { policyDocuments } from './chinh-sach/content'

export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { products } = await getCatalog()
  const now = new Date()
  return [
    { url: absoluteAppUrl('/'), lastModified: now, changeFrequency: 'weekly', priority: 1 },
    {
      url: absoluteAppUrl('/san-pham'),
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: absoluteAppUrl('/huong-dan'),
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    ...guides.map((guide) => ({
      url: absoluteAppUrl(`/huong-dan/${guide.slug}`),
      lastModified: new Date(`${guide.updated}T00:00:00Z`),
      changeFrequency: 'yearly' as const,
      priority: 0.6,
    })),
    {
      url: absoluteAppUrl('/chinh-sach'),
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    ...policyDocuments.map((policy) => ({
      url: absoluteAppUrl(`/chinh-sach/${policy.slug}`),
      lastModified: now,
      changeFrequency: 'yearly' as const,
      priority: 0.5,
    })),
    ...products
      .filter((product) => !product.isSample)
      .map((product) => ({
        url: absoluteAppUrl(`/san-pham/${encodeURIComponent(product.slug)}`),
        lastModified: now,
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      })),
  ]
}
