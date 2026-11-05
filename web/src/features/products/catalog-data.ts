export const CATALOG_PLACEHOLDER = '/images/catalog-placeholder.svg'

export const CATALOG_CATEGORIES = [
  { slug: 'all', name: 'Tất cả' },
  { slug: 'laptop', name: 'Laptop' },
  { slug: 'phone', name: 'Điện thoại' },
  { slug: 'camera', name: 'Máy ảnh' },
  { slug: 'tablet', name: 'Tablet' },
  { slug: 'accessory', name: 'Phụ kiện' },
] as const

export type CatalogCategory = (typeof CATALOG_CATEGORIES)[number]['slug']
export type CatalogSort = 'popular' | 'price-asc' | 'price-desc'

export interface CatalogImageCredit {
  author: string
  license: string
  licenseUrl: string
  sourceUrl: string
  modificationNote: string
}

export interface CatalogProduct {
  id: string
  slug: string
  name: string
  description: string
  categorySlug: Exclude<CatalogCategory, 'all'>
  categoryName: string
  pricePerDayVnd: number
  depositVnd: number
  specifications: Record<string, string>
  sourceUrl: string | null
  imageUrls: string[]
  imageAlt: string
  imageCredit: CatalogImageCredit | null
  sortOrder: number
  isSample: boolean
}

export interface CatalogFilters {
  category: CatalogCategory
  sort: CatalogSort
  query: string
}

export interface CatalogSearchParams {
  'danh-muc'?: string | string[]
  'sap-xep'?: string | string[]
  q?: string | string[]
  favorite?: string
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const first = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value

export function parseCatalogFilters(params: CatalogSearchParams): CatalogFilters {
  const category = first(params['danh-muc'])
  const sort = first(params['sap-xep'])
  const query = (first(params.q) ?? '').trim().slice(0, 100)
  const categories = CATALOG_CATEGORIES.map((item) => item.slug) as string[]
  return {
    category: categories.includes(category ?? '') ? (category as CatalogCategory) : 'all',
    sort: sort === 'gia-tang' ? 'price-asc' : sort === 'gia-giam' ? 'price-desc' : 'popular',
    query,
  }
}

export function filterCatalogProducts(
  products: CatalogProduct[],
  filters: CatalogFilters,
): CatalogProduct[] {
  const query = filters.query.toLocaleLowerCase('vi')
  const result = products.filter((product) => {
    if (filters.category !== 'all' && product.categorySlug !== filters.category) return false
    if (!query) return true
    return `${product.name} ${product.categoryName} ${Object.values(product.specifications).join(' ')}`
      .toLocaleLowerCase('vi')
      .includes(query)
  })
  if (filters.sort === 'price-asc') result.sort((a, b) => a.pricePerDayVnd - b.pricePerDayVnd)
  if (filters.sort === 'price-desc') result.sort((a, b) => b.pricePerDayVnd - a.pricePerDayVnd)
  if (filters.sort === 'popular') result.sort((a, b) => a.sortOrder - b.sortOrder)
  return result
}

export function findCatalogProduct(
  products: CatalogProduct[],
  slug: string,
): CatalogProduct | null {
  return products.find((product) => product.slug === slug) ?? null
}

function safeImageUrl(value: unknown, supabaseUrl: string): string | null {
  if (typeof value !== 'string') return null
  if (value.startsWith('/images/') && !value.includes('..')) return value
  try {
    const candidate = new URL(value, supabaseUrl)
    const base = new URL(supabaseUrl)
    if (
      candidate.origin === base.origin &&
      candidate.pathname.startsWith('/storage/v1/object/public/')
    ) {
      return candidate.href
    }
  } catch {
    return null
  }
  return null
}

export function mapSupabaseCatalogRow(value: unknown, supabaseUrl: string): CatalogProduct {
  if (!isRecord(value)) throw new Error('Catalog backend returned an invalid product row.')
  const category = value.category
  if (!isRecord(category)) throw new Error('Catalog backend returned a product without a category.')
  if (!isRecord(value.specifications)) {
    throw new Error('Catalog backend returned invalid product specifications.')
  }
  const imageValues = Array.isArray(value.image_urls) ? value.image_urls : []
  const imageUrls = imageValues.map((item) => safeImageUrl(item, supabaseUrl))
  if (imageUrls.length === 0 || imageUrls.some((item) => item === null)) {
    throw new Error('Catalog backend returned an invalid product image URL.')
  }
  const categorySlug = category.slug
  const price = value.price_per_day_vnd
  const deposit = value.deposit_vnd
  const sortOrder = value.sort_order
  const sourceUrl = value.source_url
  const creditAuthor = value.image_credit_author
  const creditLicense = value.image_license
  const creditLicenseUrl = value.image_license_url
  const creditSourceUrl = value.image_source_url
  const modificationNote = value.image_modification_note
  const hasCredit = [creditAuthor, creditLicense, creditLicenseUrl, creditSourceUrl].some(
    (item) => item !== null && item !== undefined,
  )
  const validHttpsUrl = (input: unknown) => {
    if (typeof input !== 'string') return false
    try {
      return new URL(input).protocol === 'https:'
    } catch {
      return false
    }
  }
  if (
    typeof value.id !== 'string' ||
    typeof value.slug !== 'string' ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.slug) ||
    typeof value.name !== 'string' ||
    typeof value.description !== 'string' ||
    typeof categorySlug !== 'string' ||
    !['laptop', 'phone', 'camera', 'tablet', 'accessory'].includes(categorySlug) ||
    typeof category.name !== 'string' ||
    typeof price !== 'number' ||
    !Number.isSafeInteger(price) ||
    price <= 0 ||
    typeof deposit !== 'number' ||
    !Number.isSafeInteger(deposit) ||
    deposit < 0 ||
    typeof sortOrder !== 'number' ||
    !Number.isSafeInteger(sortOrder) ||
    typeof value.image_alt !== 'string' ||
    typeof value.is_sample !== 'boolean' ||
    (sourceUrl !== null && !validHttpsUrl(sourceUrl)) ||
    (value.is_sample && !validHttpsUrl(sourceUrl)) ||
    (hasCredit &&
      (typeof creditAuthor !== 'string' ||
        typeof creditLicense !== 'string' ||
        !validHttpsUrl(creditLicenseUrl) ||
        !validHttpsUrl(creditSourceUrl) ||
        typeof modificationNote !== 'string'))
  ) {
    throw new Error('Catalog backend returned invalid product data.')
  }
  const specEntries = Object.entries(value.specifications)
  if (specEntries.some(([, item]) => !['string', 'number', 'boolean'].includes(typeof item))) {
    throw new Error('Catalog backend returned unsupported product specification values.')
  }
  const specifications = Object.fromEntries(specEntries.map(([key, item]) => [key, String(item)]))
  return {
    id: value.id,
    slug: value.slug,
    name: value.name,
    description: value.description,
    categorySlug: categorySlug as CatalogProduct['categorySlug'],
    categoryName: category.name,
    pricePerDayVnd: price,
    depositVnd: deposit,
    specifications,
    sourceUrl: typeof sourceUrl === 'string' ? sourceUrl : null,
    imageUrls: imageUrls as string[],
    imageAlt: value.image_alt,
    imageCredit: hasCredit
      ? {
          author: creditAuthor as string,
          license: creditLicense as string,
          licenseUrl: creditLicenseUrl as string,
          sourceUrl: creditSourceUrl as string,
          modificationNote: modificationNote as string,
        }
      : null,
    sortOrder,
    isSample: value.is_sample,
  }
}

type SampleRow = [string, string, string, string, number, number, Record<string, string>, string]

const SAMPLE_ROWS: SampleRow[] = [
  [
    'macbook-air-m3',
    'laptop',
    'Laptop',
    'MacBook Air 13-inch M3 (2024)',
    350000,
    5000000,
    { Chip: 'Apple M3', Màn_hình: '13.6 inch' },
    'https://support.apple.com/en-au/118551',
  ],
  [
    'macbook-pro-14-m3',
    'laptop',
    'Laptop',
    'MacBook Pro 14-inch M3 Pro (2023)',
    520000,
    8000000,
    { Chip: 'Apple M3 Pro', Màn_hình: '14.2 inch' },
    'https://support.apple.com/en-us/117736',
  ],
  [
    'macbook-pro-16-m3',
    'laptop',
    'Laptop',
    'MacBook Pro 16-inch M3 Pro (2023)',
    680000,
    10000000,
    { Chip: 'Apple M3 Pro', Màn_hình: '16.2 inch' },
    'https://support.apple.com/en-gb/117737',
  ],
  [
    'dell-xps-13',
    'laptop',
    'Laptop',
    'Dell XPS 13 9340',
    310000,
    5000000,
    { Màn_hình: '13.4 inch', Bộ_xử_lý_hỗ_trợ: 'Core Ultra 7 155H (một cấu hình)' },
    'https://www.dell.com/support/manuals/en-us/xps-13-9340-laptop/xps-13-9340_owners_manual/processor?guid=guid-b426df85-6237-4365-b1fc-c3bb6e190257&lang=en-us',
  ],
  [
    'thinkpad-x1-carbon',
    'laptop',
    'Laptop',
    'Lenovo ThinkPad X1 Carbon Gen 12',
    330000,
    5000000,
    { Màn_hình: '14 inch', Bộ_xử_lý_hỗ_trợ: 'Core Ultra 5/7 Series 1 (tuỳ cấu hình)' },
    'https://psref.lenovo.com/Product/ThinkPad_X1_Carbon_Gen_12?tab=spec',
  ],
  [
    'asus-zenbook-14',
    'laptop',
    'Laptop',
    'ASUS Zenbook 14 OLED UX3405',
    280000,
    4000000,
    { Màn_hình: 'OLED 14 inch', Bộ_xử_lý_hỗ_trợ: 'Core Ultra 7 155H (một cấu hình)' },
    'https://press.asus.com/news/press-releases/asus-zenbook-14-oled-ux3405-laptop-announced/',
  ],
  [
    'iphone-16',
    'phone',
    'Điện thoại',
    'Apple iPhone 16',
    250000,
    4000000,
    { Màn_hình: 'OLED 6.1 inch', Chip: 'A18' },
    'https://support.apple.com/en-euro/121029',
  ],
  [
    'iphone-16-pro',
    'phone',
    'Điện thoại',
    'Apple iPhone 16 Pro',
    330000,
    5000000,
    { Chip: 'A18 Pro' },
    'https://support.apple.com/es-es/121031',
  ],
  [
    'galaxy-s25',
    'phone',
    'Điện thoại',
    'Samsung Galaxy S25',
    260000,
    4000000,
    { Màn_hình: '6.2 inch', Chip: 'Snapdragon 8 Elite for Galaxy', Camera_chính: '50 MP' },
    'https://images.samsung.com/is/content/samsung/assets/us/business/mobile/phones/galaxy-s25/02052025/S25_Series_B2B_Spec_Sheet_HRc.pdf',
  ],
  [
    'pixel-9',
    'phone',
    'Điện thoại',
    'Google Pixel 9',
    240000,
    3500000,
    { Màn_hình: '6.3 inch', Chip: 'Google Tensor G4' },
    'https://support.google.com/pixelphone/answer/7158570?hl=en',
  ],
  [
    'galaxy-z-fold6',
    'phone',
    'Điện thoại',
    'Samsung Galaxy Z Fold6',
    420000,
    7000000,
    { Màn_hình_chính: '7.6 inch', Chip: 'Snapdragon 8 Gen 3 for Galaxy' },
    'https://www.samsung.com/ie/support/mobile-devices/what-is-the-difference-between-the-galaxy-z-fold6-and-z-fold5/',
  ],
  [
    'sony-a6400',
    'camera',
    'Máy ảnh',
    'Sony Alpha a6400 / ILCE-6400',
    400000,
    6000000,
    { Cảm_biến: 'APS-C 24.2 MP', Ngàm: 'E' },
    'https://www.sony.com/electronics/support/e-mount-body/ilce-6400/specifications',
  ],
  [
    'canon-eos-r50',
    'camera',
    'Máy ảnh',
    'Canon EOS R50',
    390000,
    6000000,
    { Cảm_biến: 'APS-C 24.2 MP', Ngàm: 'RF' },
    'https://cam.start.canon/en/C011/manual/html/UG-11_Reference_0090.html',
  ],
  [
    'sony-zv-e10-ii',
    'camera',
    'Máy ảnh',
    'Sony ZV-E10 II / ZV-E10M2',
    440000,
    6500000,
    { Cảm_biến: 'APS-C 26 MP', Video: '4K đến 59.94p/50p' },
    'https://www.sony.com/electronics/support/e-mount-body-zv-e-series/zv-e10m2/specifications',
  ],
  [
    'fujifilm-x-t5',
    'camera',
    'Máy ảnh',
    'Fujifilm X-T5',
    590000,
    9000000,
    { Cảm_biến: 'APS-C 40.2 MP' },
    'https://shopusa.fujifilm-x.com/x-t5-x-t5/',
  ],
  [
    'gopro-hero-13',
    'camera',
    'Máy ảnh',
    'GoPro HERO13 Black',
    220000,
    3500000,
    { Video: '5.3K60', Chống_rung: 'HyperSmooth 6.0' },
    'https://gopro.com/en/is/news/hero13-black-specialty-bundles',
  ],
  [
    'ipad-air-m2',
    'tablet',
    'Tablet',
    'iPad Air 11-inch M2 (2024)',
    180000,
    3000000,
    { Chip: 'Apple M2', Màn_hình: 'Tên model 11 inch' },
    'https://support.apple.com/en-gb/119894',
  ],
  [
    'ipad-pro-m4',
    'tablet',
    'Tablet',
    'iPad Pro 11-inch M4 (2024)',
    320000,
    5000000,
    { Chip: 'Apple M4', Màn_hình: 'Model 11 inch' },
    'https://support.apple.com/es-es/119892',
  ],
  [
    'galaxy-tab-s10',
    'tablet',
    'Tablet',
    'Samsung Galaxy Tab S10+',
    230000,
    3500000,
    { Màn_hình: '12.4 inch', Chip: 'MediaTek Dimensity 9300+' },
    'https://image-us.samsung.com/SamsungUS/home/tablets/galaxy-tab-s10/09232024/NCM812352_Tab-S10-B2B-Tablet-Portfolio-Flyer_c.pdf',
  ],
  [
    'remarkable-2',
    'tablet',
    'Tablet',
    'reMarkable 2',
    150000,
    2500000,
    { Màn_hình: 'E-ink đơn sắc 10.3 inch', Bộ_nhớ_trong: '8 GB' },
    'https://support.remarkable.com/articles/Knowledge/About-reMarkable-2',
  ],
  [
    'sony-wh1000xm5',
    'accessory',
    'Phụ kiện',
    'Sony WH-1000XM5',
    90000,
    1200000,
    { Loại: 'Tai nghe chụp tai', Kết_nối: 'Bluetooth 5.2', Chống_ồn: 'Chủ động' },
    'https://www.sony.com/electronics/support/wireless-headphones-bluetooth-headphones/wh-1000xm5/specifications',
  ],
  [
    'airpods-pro-2',
    'accessory',
    'Phụ kiện',
    'AirPods Pro 2 USB-C (2023)',
    80000,
    1000000,
    { Chip: 'H2', Chống_ồn: 'Chủ động', Hộp_sạc: 'USB-C' },
    'https://support.apple.com/en-us/111834',
  ],
  [
    'dji-mic-2',
    'accessory',
    'Phụ kiện',
    'DJI Mic 2',
    120000,
    1500000,
    { Loại: 'Micro không dây', Bộ_2: '2 TX + 1 RX', Ghi_âm: 'Nội bộ 32-bit float' },
    'https://www.dji.com/mic-2/faq',
  ],
  [
    'dji-osmo-mobile-7',
    'accessory',
    'Phụ kiện',
    'DJI Osmo Mobile 7',
    100000,
    1500000,
    { Loại: 'Gimbal điện thoại', Chống_rung: '3 trục' },
    'https://store.dji.com/product/osmo-mobile-7',
  ],
]

const SAMPLE_IMAGE_CREDITS: Record<string, CatalogImageCredit> = {
  'canon-eos-r50': {
    author: 'CNEcija12345',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Canon_EOS_R50_Black.jpg',
    modificationNote:
      'Ảnh gốc được giữ nguyên; bản hiển thị có thể được Next.js tối ưu kích thước hoặc định dạng.',
  },
  'sony-a6400': {
    author: '昼落ち',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Sony_ILCE-6400_27_Feb_2019a.jpg',
    modificationNote:
      'Ảnh gốc được giữ nguyên; bản hiển thị có thể được Next.js tối ưu kích thước hoặc định dạng.',
  },
  'iphone-16-pro': {
    author: 'Farragutful',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:IPhone_16_Pro_-_black.jpg',
    modificationNote:
      'Ảnh gốc được giữ nguyên; bản hiển thị có thể được Next.js tối ưu kích thước hoặc định dạng.',
  },
}

export const SAMPLE_CATALOG: CatalogProduct[] = SAMPLE_ROWS.map(
  (
    [slug, categorySlug, categoryName, name, pricePerDayVnd, depositVnd, specifications, sourceUrl],
    index,
  ) => ({
    id: `10000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
    slug,
    name,
    description: 'SAMPLE: giá thuê và cấu hình máy cần xác minh.',
    categorySlug: categorySlug as CatalogProduct['categorySlug'],
    categoryName,
    pricePerDayVnd,
    depositVnd,
    specifications,
    sourceUrl,
    imageUrls: [
      slug === 'canon-eos-r50'
        ? '/images/catalog/canon-eos-r50.jpg'
        : slug === 'sony-a6400'
          ? '/images/catalog/sony-a6400.jpg'
          : slug === 'iphone-16-pro'
            ? '/images/catalog/iphone-16-pro.jpg'
            : `/images/catalog/category-${categorySlug}.svg`,
    ],
    imageAlt: SAMPLE_IMAGE_CREDITS[slug]
      ? `Ảnh tham khảo ${name}; không phải máy bàn giao`
      : 'Ảnh minh hoạ catalog mẫu, chưa phải ảnh sản phẩm',
    imageCredit: SAMPLE_IMAGE_CREDITS[slug] ?? null,
    sortOrder: index + 1,
    isSample: true,
  }),
)

export function jsonLdScript(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
}
