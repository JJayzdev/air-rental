import 'server-only'
import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.ts'

export function identityDocumentsEnabled(): boolean {
  return (
    process.env.AIR_ENABLE_IDENTITY_DOCUMENTS === 'true' &&
    Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL)
  )
}

export function createSupabaseServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) throw new Error('Protected document storage is unavailable.')
  return createClient<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  })
}
