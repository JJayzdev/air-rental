import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/lib/supabase/database'
import { applyAuthCookieUpdates } from '@/lib/supabase/cookie-updates'

export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) return NextResponse.next({ request })

  let response = NextResponse.next({ request })
  const secure = process.env.NODE_ENV === 'production'
  const supabase = createServerClient<Database>(url, anonKey, {
    cookieOptions: { httpOnly: true, sameSite: 'lax', secure },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        response = applyAuthCookieUpdates(
          cookiesToSet,
          ({ name, value }) => request.cookies.set(name, value),
          () => NextResponse.next({ request }),
          (target, { name, value, options }) => {
            target.cookies.set(name, value, { ...options, httpOnly: true, sameSite: 'lax', secure })
          },
        )
      },
    },
  })
  await supabase.auth.getClaims()
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp)$).*)'],
}
