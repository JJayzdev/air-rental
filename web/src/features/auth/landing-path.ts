import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database'

export function landingPathForRole(role: string | null | undefined): string {
  return role === 'admin' || role === 'staff' ? '/admin' : '/don-thue'
}

export async function defaultLandingPath(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<string> {
  const { data } = await supabase.from('profiles').select('role').eq('id', userId).maybeSingle()
  return landingPathForRole(data?.role)
}
