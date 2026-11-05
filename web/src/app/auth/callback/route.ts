import { NextResponse, type NextRequest } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { safeInternalPath } from '@/lib/safe-internal-path'

const EMAIL_OTP_TYPES = new Set<EmailOtpType>([
  'magiclink',
  'email',
  'signup',
  'recovery',
  'invite',
  'email_change',
])

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const tokenHash = request.nextUrl.searchParams.get('token_hash')
  const rawType = request.nextUrl.searchParams.get('type')
  const next = safeInternalPath(
    request.nextUrl.searchParams.get('next'),
    '/don-thue',
    request.nextUrl.origin,
  )
  if (!code && !tokenHash)
    return NextResponse.redirect(new URL('/dang-nhap?error=link', request.url))
  try {
    const supabase = await createSupabaseServerClient()
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (error) return NextResponse.redirect(new URL('/dang-nhap?error=link', request.url))
    } else {
      const type =
        rawType && EMAIL_OTP_TYPES.has(rawType as EmailOtpType) ? (rawType as EmailOtpType) : null
      if (!tokenHash || !type) {
        return NextResponse.redirect(new URL('/dang-nhap?error=link', request.url))
      }
      const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      if (error) return NextResponse.redirect(new URL('/dang-nhap?error=link', request.url))
    }
    return NextResponse.redirect(new URL(next, request.url))
  } catch {
    return NextResponse.redirect(new URL('/dang-nhap?error=unavailable', request.url))
  }
}
