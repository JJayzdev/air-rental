import Link from 'next/link'
import { redirect } from 'next/navigation'
import { defaultLandingPath } from '@/features/auth/landing-path'
import { getVerifiedAppRole } from '@/lib/supabase/auth'
import { safeInternalPath } from '@/lib/safe-internal-path'
import { RegisterForm } from './register-form'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: 'Đăng ký',
}

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const params = await searchParams
  const next = safeInternalPath(
    params.next,
    '',
    process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  )
  const { supabase, user } = await getVerifiedAppRole().catch(() => ({
    supabase: null,
    user: null,
  }))
  if (user && supabase) redirect(next || (await defaultLandingPath(supabase, user.id)))
  return (
    <main className="shell rental-page">
      <nav className="rental-breadcrumb">
        <Link href="/san-pham">Sản phẩm</Link>
        <span> / Đăng ký</span>
      </nav>
      <section className="rental-panel rental-auth-panel rental-register-panel">
        <p className="eyebrow">Tài khoản A.I.R</p>
        <h1>Tạo tài khoản khách thuê</h1>
        <p>
          Điền thông tin khách hàng để A.I.R chuẩn bị hợp đồng, giao máy và hỗ trợ bạn nhanh hơn.
          Sau khi gửi, bạn sẽ nhận email xác nhận kèm mã OTP để đăng nhập.
        </p>
        <ol className="rental-auth-steps">
          <li>Điền thông tin khách hàng</li>
          <li>Xác nhận email bằng liên kết hoặc mã OTP</li>
          <li>Đặt thuê thiết bị và theo dõi đơn</li>
        </ol>
        <RegisterForm next={next} />
      </section>
    </main>
  )
}
