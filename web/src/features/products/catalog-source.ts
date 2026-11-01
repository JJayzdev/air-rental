import { SAMPLE_CATALOG, mapSupabaseCatalogRow, type CatalogProduct } from './catalog-data.ts'

export type CatalogMode = 'local-sample' | 'supabase'

export class CatalogSourceError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CatalogSourceError'
  }
}

export function catalogModeForConfig(
  url: string | undefined,
  anonKey: string | undefined,
  nodeEnv: string,
): CatalogMode {
  if (url && anonKey) return 'supabase'
  if (url || anonKey) {
    throw new CatalogSourceError('Supabase catalog configuration is incomplete.')
  }
  if (nodeEnv === 'production') {
    throw new CatalogSourceError('Supabase catalog configuration is required in production.')
  }
  return 'local-sample'
}

export async function fetchSupabaseCatalog(
  supabaseUrl: string,
  anonKey: string,
  fetcher: typeof fetch = fetch,
): Promise<CatalogProduct[]> {
  const base = supabaseUrl.replace(/\/$/, '')
  const url = new URL(`${base}/rest/v1/products`)
  url.searchParams.set(
    'select',
    'id,slug,name,description,price_per_day_vnd,deposit_vnd,specifications,image_urls,image_alt,sort_order,is_sample,source_url,image_credit_author,image_license,image_license_url,image_source_url,image_modification_note,category:categories!inner(slug,name)',
  )
  url.searchParams.set('state', 'eq.active')
  url.searchParams.set('order', 'sort_order.asc,name.asc')
  let response: Response
  try {
    response = await fetcher(url, {
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}`, Accept: 'application/json' },
      next: { revalidate: 300 },
    })
  } catch {
    throw new CatalogSourceError('Supabase catalog request failed. Check the backend connection.')
  }
  if (!response.ok) {
    throw new CatalogSourceError(`Supabase catalog request failed (HTTP ${response.status}).`)
  }
  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    throw new CatalogSourceError('Supabase catalog returned an unreadable response.')
  }
  if (!Array.isArray(payload))
    throw new CatalogSourceError('Supabase catalog returned an invalid response.')
  try {
    return payload.map((row) => mapSupabaseCatalogRow(row, base))
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown catalog data error'
    throw new CatalogSourceError(`Supabase catalog data is invalid: ${message}`)
  }
}

export async function readCatalog(config: {
  url?: string
  anonKey?: string
  nodeEnv?: string
  fetcher?: typeof fetch
}): Promise<{ mode: CatalogMode; products: CatalogProduct[] }> {
  const mode = catalogModeForConfig(
    config.url,
    config.anonKey,
    config.nodeEnv ?? process.env.NODE_ENV ?? 'development',
  )
  if (mode === 'local-sample') return { mode, products: SAMPLE_CATALOG }
  return {
    mode,
    products: await fetchSupabaseCatalog(config.url!, config.anonKey!, config.fetcher),
  }
}
