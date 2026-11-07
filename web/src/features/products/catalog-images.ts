import { CATALOG_PLACEHOLDER } from './catalog-data.ts'

const MAX_IMAGES = 8
const MAX_URL_LENGTH = 1000
const LOCAL_IMAGE = /^\/images\/[A-Za-z0-9/_.-]+$/

/**
 * Chuyển ô "link ảnh" (mỗi dòng hoặc dấu phẩy một link) thành danh sách ảnh catalog.
 *
 * Danh mục công khai (`mapSupabaseCatalogRow` → `safeImageUrl`) chỉ hiển thị ảnh trong `/images/`
 * của site hoặc Supabase Storage công khai; một link khác làm cả sản phẩm bị ẩn khỏi danh mục.
 * Vì vậy cả admin và đối tác phải được chặn ngay khi lưu bằng đúng quy tắc này.
 * Trả về null nếu có link không hợp lệ; để trống thì dùng ảnh mặc định.
 */
export function catalogImageUrlsFromInput(
  raw: string,
  supabaseUrl: string | undefined,
): string[] | null {
  const items = raw
    .split(/[\r\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean)
  if (items.length === 0) return [CATALOG_PLACEHOLDER]
  if (items.length > MAX_IMAGES) return null
  return items.every((item) => isCatalogImageUrl(item, supabaseUrl)) ? items : null
}

function isCatalogImageUrl(item: string, supabaseUrl: string | undefined): boolean {
  if (item.length > MAX_URL_LENGTH || item.includes('..')) return false
  if (LOCAL_IMAGE.test(item)) return true
  if (!supabaseUrl) return false
  try {
    const candidate = new URL(item)
    const base = new URL(supabaseUrl)
    return (
      candidate.origin === base.origin &&
      candidate.pathname.startsWith('/storage/v1/object/public/')
    )
  } catch {
    return false
  }
}
