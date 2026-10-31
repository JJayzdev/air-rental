import type { OrderStatus } from './schema'

/**
 * Vòng đời đơn theo §3.3 ROADMAP.md
 */
export const ORDER_FLOW: Record<OrderStatus, OrderStatus[]> = {
  'Chờ xác nhận': ['Đã xác nhận', 'Đã hủy'],
  'Đã xác nhận': ['Đang giao', 'Đã hủy'],
  'Đang giao': ['Đang thuê'],
  'Đang thuê': ['Đang trả', 'Quá hạn'],
  'Đang trả': ['Hoàn thành'],
  'Hoàn thành': [],
  'Đã hủy': [],
  'Quá hạn': ['Đang trả', 'Hoàn thành'],
}

export function canTransitionOrder(current: OrderStatus, next: OrderStatus): boolean {
  return ORDER_FLOW[current]?.includes(next) ?? false
}
