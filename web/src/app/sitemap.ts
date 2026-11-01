import type { MetadataRoute } from 'next'
import { getCatalog } from '@/features/products/catalog-server'
import { absoluteAppUrl } from '@/features/products/catalog-seo'

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
