import Link from 'next/link'
import { redirect } from 'next/navigation'
import { LoginForm } from './login-form'
import { getVerifiedUser } from '@/lib/supabase/auth'
import { safeInternalPath } from '@/lib/safe-internal-path'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: 'Đăng nhập',
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const params = await searchParams
  const next = safeInternalPath(
    params.next,
    '/don-thue',
    process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  )
  const { user } = await getVerifiedUser().catch(() => ({ user: null }))
  if (user) redirect(next)
  return (
    <main className="shell rental-page">
      <nav className="rental-breadcrumb">
        <Link href="/san-pham">Sản phẩm</Link>
        <span> / Đăng nhập</span>
      </nav>
      <section className="rental-panel rental-auth-panel">
        <p className="eyebrow">Tài khoản A.I.R</p>
        <h1>Đăng nhập để đặt thuê</h1>
        <p>Dùng email đã đăng ký để nhận liên kết đăng nhập dùng một lần.</p>
        <LoginForm next={next} phoneOtpEnabled={process.env.AIR_ENABLE_PHONE_OTP === 'true'} />
      </section>
    </main>
  )
}
