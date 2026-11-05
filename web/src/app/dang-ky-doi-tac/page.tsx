import Link from 'next/link'
import { redirect } from 'next/navigation'
import { PartnerRegisterForm } from './PartnerRegisterForm'
import { getVerifiedAppRole } from '@/lib/supabase/auth'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: 'Đăng ký đối tác',
}

export default async function PartnerRegisterPage() {
  const { user } = await getVerifiedAppRole().catch(() => ({ user: null }))
  if (user) redirect('/partner')

  return (
    <main className="shell rental-page">
      <nav className="rental-breadcrumb">
        <Link href="/">Trang chủ</Link>
        <span> / Đăng ký đối tác</span>
      </nav>
      <section className="rental-panel rental-auth-panel rental-register-panel">
        <p className="eyebrow">Đăng ký đối tác A.I.R</p>
        <h1>Đăng ký trở thành đối tác</h1>
        <p>
          Bạn có thiết bị rảnh rỗi (laptop, máy ảnh, điện thoại, tablet, phụ kiện…)? Đăng ký đối tác
          để đưa thiết bị của bạn lên sàn cho thuê A.I.R và nhận doanh thu từ mỗi đơn thuê.
        </p>
        <PartnerRegisterForm />
      </section>
    </main>
  )
}
