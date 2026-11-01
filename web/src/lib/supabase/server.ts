import 'server-only'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from './database.ts'

export function supabaseIsConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}

export async function createSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) throw new Error('Tạm thời chưa kết nối được hệ thống đặt thuê.')
  const cookieStore = await cookies()
  const secure = process.env.NODE_ENV === 'production'
  return createServerClient<Database>(url, anonKey, {
    cookieOptions: { httpOnly: true, sameSite: 'lax', secure },
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, { ...options, httpOnly: true, sameSite: 'lax', secure })
          }
        } catch {
          // Server Components cannot write cookies; middleware refreshes sessions on requests.
        }
      },
    },
  })
}
