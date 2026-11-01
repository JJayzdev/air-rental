import type { OrderState } from '@/lib/supabase/database'

export const ORDER_STATE_LABELS: Record<OrderState, string> = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  delivering: 'Đang bàn giao',
  active: 'Đang thuê',
  returning: 'Đang kiểm tra khi trả',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
  expired: 'Hết thời gian giữ máy',
  overdue: 'Quá hạn',
}
