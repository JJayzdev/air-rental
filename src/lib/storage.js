// Toàn bộ state được lưu localStorage để reload không mất dữ liệu.
// Bản gốc chỉ lưu giỏ hàng; ở đây lưu thêm đơn thuê, yêu thích và phiên đăng nhập demo.

const KEY = {
  cart: 'air-cart',
  orders: 'air-orders',
  favorites: 'air-favorites',
  user: 'air-user',
}

export function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* bỏ qua: chế độ riêng tư có thể chặn localStorage */
  }
}

export const storageKeys = KEY
