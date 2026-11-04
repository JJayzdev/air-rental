import type { Metadata } from 'next'
import Link from 'next/link'
import ClientApp from '../client-app'

export const metadata: Metadata = {
  title: 'Bản thử nghiệm tương tác',
  robots: { index: false, follow: false },
}

export default function PrototypeDemoPage() {
  return (
    <>
      <aside className="catalog-sample-note prototype-boundary shell" role="note">
        <strong>Bản thử nghiệm tương tác</strong>
        <span>
          Giỏ, hồ sơ và đơn trong trang này được lưu cục bộ trên trình duyệt để bạn thử nhanh giao
          diện. Dữ liệu không được gửi lên hệ thống đặt thuê.
        </span>
        <Link href="/">Về trang chủ A.I.R</Link>
      </aside>
      <ClientApp llmEnabled={false} offlineFaq />
    </>
  )
}
