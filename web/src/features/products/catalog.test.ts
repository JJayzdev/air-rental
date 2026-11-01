import assert from 'node:assert/strict'
import test from 'node:test'
import {
  SAMPLE_CATALOG,
  filterCatalogProducts,
  findCatalogProduct,
  jsonLdScript,
  mapSupabaseCatalogRow,
  parseCatalogFilters,
} from './catalog-data.ts'
import {
  CatalogSourceError,
  catalogModeForConfig,
  fetchSupabaseCatalog,
  readCatalog,
} from './catalog-source.ts'

const row = {
  id: '10000000-0000-4000-8000-000000000001',
  slug: 'sample-camera',
  name: 'Sample camera',
  description: 'Illustrative product only',
  price_per_day_vnd: 100000,
  deposit_vnd: 500000,
  specifications: { sensor: '24 MP' },
  image_urls: ['/images/catalog-placeholder.svg'],
  image_alt: 'Illustrative placeholder',
  sort_order: 1,
  is_sample: true,
  source_url: 'https://manufacturer.example/product',
  image_credit_author: null,
  image_license: null,
  image_license_url: null,
  image_source_url: null,
  image_modification_note: null,
  category: { slug: 'camera', name: 'Máy ảnh' },
}

test('catalog URL parser validates category/sort and trims bounded search terms', () => {
  assert.deepEqual(
    parseCatalogFilters({ 'danh-muc': 'camera', 'sap-xep': 'gia-tang', q: '  sony  ' }),
    { category: 'camera', sort: 'price-asc', query: 'sony' },
  )
  assert.deepEqual(parseCatalogFilters({ 'danh-muc': 'unknown', 'sap-xep': 'oops' }), {
    category: 'all',
    sort: 'popular',
    query: '',
  })
})

test('filtering and sorting operate on URL-backed catalog state', () => {
  const filters = parseCatalogFilters({ 'danh-muc': 'laptop', 'sap-xep': 'gia-giam', q: 'm3' })
  const results = filterCatalogProducts(SAMPLE_CATALOG, filters)
  assert.equal(results.length, 3)
  assert.equal(results[0].slug, 'macbook-pro-16-m3')
  assert.equal(findCatalogProduct(results, 'not-here'), null)
})

test('catalog mapper validates fields and only allows local placeholders or its Supabase storage', () => {
  assert.equal(mapSupabaseCatalogRow(row, 'https://catalog.example').slug, 'sample-camera')
  assert.equal(mapSupabaseCatalogRow(row, 'https://catalog.example').sourceUrl, row.source_url)
  assert.equal(
    mapSupabaseCatalogRow(
      {
        ...row,
        image_urls: ['https://catalog.example/storage/v1/object/public/products/camera.jpg'],
      },
      'https://catalog.example',
    ).imageUrls[0],
    'https://catalog.example/storage/v1/object/public/products/camera.jpg',
  )
  assert.throws(() =>
    mapSupabaseCatalogRow(
      { ...row, image_urls: ['https://elsewhere.example/photo.jpg'] },
      'https://catalog.example',
    ),
  )
})

test('missing slugs return no product and invalid backend rows fail explicitly', () => {
  assert.equal(findCatalogProduct(SAMPLE_CATALOG, 'missing-model'), null)
  assert.throws(() =>
    mapSupabaseCatalogRow({ ...row, slug: 'bad/slug' }, 'https://catalog.example'),
  )
  assert.throws(() =>
    mapSupabaseCatalogRow({ ...row, specifications: null }, 'https://catalog.example'),
  )
  assert.throws(() =>
    mapSupabaseCatalogRow(
      { ...row, specifications: { camera: { resolution: 24 } } },
      'https://catalog.example',
    ),
  )
})

test('JSON-LD serialization escapes script-breaking characters', () => {
  const encoded = jsonLdScript({ name: '</script><script>alert(1)</script>', value: 'a&b' })
  assert.equal(encoded.includes('</script>'), false)
  assert.equal(encoded.includes('\\u003c/script\\u003e'), true)
  assert.equal(encoded.includes('\\u0026'), true)
})

test('catalog source uses labeled samples only when no backend is configured locally', async () => {
  assert.equal(catalogModeForConfig(undefined, undefined, 'development'), 'local-sample')
  assert.throws(() => catalogModeForConfig(undefined, undefined, 'production'), CatalogSourceError)
  assert.throws(
    () => catalogModeForConfig('https://project.example', undefined, 'development'),
    CatalogSourceError,
  )
  const result = await readCatalog({ nodeEnv: 'development' })
  assert.equal(result.mode, 'local-sample')
  assert.equal(result.products.length, 24)
  assert.ok(result.products.every((product) => product.isSample))
  assert.deepEqual(
    result.products.filter((product) => product.imageCredit).map((product) => product.slug),
    ['iphone-16-pro', 'sony-a6400', 'canon-eos-r50'],
  )
})

test('configured backend errors never fall back to sample products', async () => {
  const fetcher: typeof fetch = async () => new Response('unavailable', { status: 503 })
  await assert.rejects(
    () =>
      readCatalog({
        url: 'https://project.example',
        anonKey: 'public-anon-key',
        nodeEnv: 'development',
        fetcher,
      }),
    /HTTP 503/,
  )
  await assert.rejects(
    () => fetchSupabaseCatalog('https://project.example', 'public-anon-key', fetcher),
    /HTTP 503/,
  )
  const networkFailure: typeof fetch = async () => {
    throw new Error('network detail must not be returned to the page')
  }
  await assert.rejects(
    () => fetchSupabaseCatalog('https://project.example', 'public-anon-key', networkFailure),
    /Check the backend connection/,
  )
  const malformedResponse: typeof fetch = async () => new Response('{}', { status: 200 })
  await assert.rejects(
    () => fetchSupabaseCatalog('https://project.example', 'public-anon-key', malformedResponse),
    /invalid response/,
  )
})

test('Supabase reader uses only anon credentials and selects public catalog fields', async () => {
  const anonKey = 'test-public-anon-key'
  const requests: Array<{ url: URL; headers: Headers }> = []
  const fetcher: typeof fetch = async (input, init) => {
    requests.push({ url: new URL(String(input)), headers: new Headers(init?.headers) })
    return new Response(JSON.stringify([row]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  const result = await fetchSupabaseCatalog('https://project.example', anonKey, fetcher)
  const request = requests[0]
  assert.ok(request)
  assert.equal(result[0].slug, 'sample-camera')
  assert.equal(request.url.searchParams.get('state'), 'eq.active')
  assert.equal(request.url.searchParams.get('order'), 'sort_order.asc,name.asc')
  const select = request.url.searchParams.get('select') ?? ''
  assert.ok(select.includes('category:categories!inner(slug,name)'))
  assert.equal(/unit_id|asset_tag|order_items|orders|customer_|phone|address/i.test(select), false)
  assert.equal(request.headers.get('apikey'), anonKey)
  assert.equal(request.headers.get('Authorization'), `Bearer ${anonKey}`)
})
