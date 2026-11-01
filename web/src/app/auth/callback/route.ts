import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { safeInternalPath } from '@/lib/safe-internal-path'

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const next = safeInternalPath(
    request.nextUrl.searchParams.get('next'),
    '/don-thue',
    request.nextUrl.origin,
  )
  if (!code) return NextResponse.redirect(new URL('/dang-nhap?error=link', request.url))
  try {
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) return NextResponse.redirect(new URL('/dang-nhap?error=link', request.url))
    return NextResponse.redirect(new URL(next, request.url))
  } catch {
    return NextResponse.redirect(new URL('/dang-nhap?error=unavailable', request.url))
  }
}
