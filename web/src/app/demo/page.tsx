import type { Metadata } from 'next'
import Link from 'next/link'
import ClientApp from '../client-app'

export const metadata: Metadata = {
  title: 'Prototype giao diện local — A.I.R',
  robots: { index: false, follow: false },
}

export default function PrototypeDemoPage() {
  return (
    <>
      <aside className="catalog-sample-note prototype-boundary shell" role="note">
        <strong>Prototype local · dữ liệu giả lập</strong>
        <span>
          Giỏ, hồ sơ và đơn ở đây lưu trong localStorage của trình duyệt. Không nhập dữ liệu thật.
          Bản này tách riêng khỏi catalog Next.js chính.
        </span>
        <Link href="/">Về trang giới thiệu đồ án</Link>
      </aside>
      <ClientApp llmEnabled={false} offlineFaq />
    </>
  )
}
