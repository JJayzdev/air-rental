import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: 'A.I.R — Thuê thiết bị công nghệ',
  description:
    'Thuê laptop, điện thoại, máy ảnh, tablet và phụ kiện công nghệ theo ngày. Linh hoạt, tiết kiệm, giao nhanh nội thành.',
  icons: { icon: '/favicon.svg' },
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
