import 'server-only'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from './server.ts'

export async function getVerifiedUser() {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) return { supabase, user: null }
  return { supabase, user: data.user }
}

export async function requireVerifiedUser(next = '/gio-thue') {
  const result = await getVerifiedUser()
  if (!result.user) redirect(`/dang-nhap?next=${encodeURIComponent(next)}`)
  return { supabase: result.supabase, user: result.user }
}

export async function getVerifiedAppRole() {
  const { supabase, user } = await getVerifiedUser()
  if (!user) return { supabase, user: null, role: null as 'customer' | 'staff' | 'admin' | null }
  const { data } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  return { supabase, user, role: data?.role ?? 'customer' }
}
