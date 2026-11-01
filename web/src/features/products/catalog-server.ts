import 'server-only'
import { readCatalog } from './catalog-source.ts'

export async function getCatalog() {
  return readCatalog({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    nodeEnv: process.env.NODE_ENV,
  })
}
