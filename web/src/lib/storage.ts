/** localStorage có guard cho SSR (Next render phía server không có window). */

export const storageKeys = {
  cart: 'air-cart',
  orders: 'air-orders',
  favorites: 'air-favorites',
  user: 'air-user',
} as const

export function load<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function save(key: string, value: unknown): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* bỏ qua: chế độ riêng tư có thể chặn localStorage */
  }
}
