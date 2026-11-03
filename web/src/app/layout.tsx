import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: 'A.I.R — đồ án mô phỏng cho thuê thiết bị',
  description:
    'Prototype học tập mô phỏng catalog và luồng thuê thiết bị công nghệ bằng dữ liệu giả lập.',
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
