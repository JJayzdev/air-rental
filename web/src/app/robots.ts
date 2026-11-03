import type { MetadataRoute } from 'next'
import { absoluteAppUrl } from '@/features/products/catalog-seo'

export const dynamic = 'force-dynamic'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/gio-thue',
          '/checkout',
          '/dang-nhap',
          '/tai-khoan',
          '/don-thue',
          '/quan-ly-don',
          '/demo',
          '/chinh-sach',
        ],
      },
    ],
    sitemap: absoluteAppUrl('/sitemap.xml'),
  }
}
