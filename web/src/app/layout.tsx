import type { Metadata, Viewport } from 'next'
import './globals.css'

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  applicationName: 'A.I.R Rental',
  title: {
    default: 'A.I.R — Thuê thiết bị công nghệ theo ngày',
    template: '%s | A.I.R',
  },
  description:
    'Thuê laptop, điện thoại, máy ảnh, tablet và phụ kiện công nghệ theo ngày. Đặt lịch trực tuyến, nhận máy linh hoạt, không cần mua.',
  keywords: [
    'thuê laptop',
    'thuê máy ảnh',
    'thuê thiết bị',
    'cho thuê điện thoại',
    'thuê tablet',
    'thuê thiết bị công nghệ',
  ],
  icons: { icon: '/favicon.svg' },
  openGraph: {
    siteName: 'A.I.R Rental',
    locale: 'vi_VN',
    type: 'website',
    title: 'A.I.R — Thuê thiết bị công nghệ theo ngày',
    description:
      'Laptop, máy ảnh, điện thoại và phụ kiện cho công việc, sự kiện và chuyến đi. Đặt thuê theo ngày.',
    url: '/',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'A.I.R — Thuê thiết bị công nghệ theo ngày',
    description: 'Laptop, máy ảnh, điện thoại và phụ kiện cho công việc, sự kiện và chuyến đi.',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#1769ff',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  )
}
