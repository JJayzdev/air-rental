/**
 * Sinh đường dẫn (slug) cho sản phẩm đối tác.
 *
 * Đối tác chỉ nhập tên sản phẩm; hệ thống tự chuyển tên tiếng Việt thành slug
 * ASCII và tự thêm hậu tố khi bị trùng, nên không cần (và không nên) cho đối tác
 * tự đặt slug.
 */

const MAX_SLUG_LENGTH = 80
const FALLBACK_SLUG = 'san-pham'

/** "Máy ảnh Sony A7" → "may-anh-sony-a7" */
export function slugifyProductName(name: string): string {
  const base = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/g, '')
  return base.length >= 3 ? base : FALLBACK_SLUG
}

/** "may-anh" đã tồn tại → "may-anh-2"; tiếp tục trùng → "may-anh-3"... */
export function uniqueSlug(base: string, taken: Iterable<string>): string {
  const used = new Set(taken)
  const candidate = fitSlug(base)
  if (!used.has(candidate)) return candidate

  for (let index = 2; index < 10_000; index += 1) {
    const suffix = `-${index}`
    const next = `${fitSlug(base)
      .slice(0, MAX_SLUG_LENGTH - suffix.length)
      .replace(/-+$/g, '')}${suffix}`
    if (!used.has(next)) return next
  }
  throw new Error('Không tạo được đường dẫn duy nhất cho sản phẩm.')
}

function fitSlug(value: string): string {
  const trimmed = value.slice(0, MAX_SLUG_LENGTH).replace(/-+$/g, '')
  return trimmed.length >= 3 ? trimmed : FALLBACK_SLUG
}
