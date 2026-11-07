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
          '/dang-ky',
          '/tai-khoan',
          '/don-thue',
          '/yeu-thich',
          '/quan-ly-don',
          '/quan-ly-giay-to',
          '/admin',
          '/partner',
          '/dang-ky-doi-tac',
          '/demo',
        ],
      },
    ],
    sitemap: absoluteAppUrl('/sitemap.xml'),
  }
}
