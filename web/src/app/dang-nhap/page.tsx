import Link from 'next/link'
import { redirect } from 'next/navigation'
import { LoginForm } from './login-form'
import { defaultLandingPath } from '@/features/auth/landing-path'
import { getVerifiedAppRole } from '@/lib/supabase/auth'
import { safeInternalPath } from '@/lib/safe-internal-path'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: 'Đăng nhập',
}

const ERROR_MESSAGES: Record<string, string> = {
  link: 'Liên kết đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng gửi mã OTP mới.',
  unavailable: 'Chưa kết nối được hệ thống đăng nhập. Vui lòng thử lại sau.',
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>
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
  const errorMessage = params.error ? ERROR_MESSAGES[params.error] : undefined
  return (
    <main className="shell rental-page">
      <nav className="rental-breadcrumb">
        <Link href="/san-pham">Sản phẩm</Link>
        <span> / Đăng nhập</span>
      </nav>
      <section className="rental-panel rental-auth-panel">
        <p className="eyebrow">Tài khoản A.I.R</p>
        <h1>Đăng nhập để đặt thuê</h1>
        <p>Nhập email đã đăng ký để nhận mã OTP, sau đó nhập mã để đăng nhập.</p>
        {errorMessage && <p className="rental-error">{errorMessage}</p>}
        <LoginForm next={next} phoneOtpEnabled={process.env.AIR_ENABLE_PHONE_OTP === 'true'} />
      </section>
    </main>
  )
}
