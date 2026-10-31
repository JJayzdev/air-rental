import type { CartItem } from '@/types'

/** Công thức giá dùng chung cho giỏ, chi tiết sản phẩm và checkout. */
export const lineTotal = (price: number, days: number, quantity = 1): number =>
  price * days * quantity

/** Tổng tạm tính của giỏ: mỗi dòng giữ số ngày riêng. */
export const cartSubtotal = (items: CartItem[]): number =>
  items.reduce((sum, item) => sum + lineTotal(item.product.price, item.days, item.quantity), 0)
