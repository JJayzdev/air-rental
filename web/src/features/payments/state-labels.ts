import type { OrderPaymentState, PaymentKind } from '@/lib/supabase/database'

export const PAYMENT_STATE_LABELS: Record<OrderPaymentState, string> = {
  unpaid: 'Chưa thanh toán',
  deposit_paid: 'Đã cọc',
  paid: 'Đã thanh toán đủ',
  refund_pending: 'Chờ hoàn cọc',
  refunded: 'Đã hoàn cọc',
}

export const PAYMENT_STATE_HINTS: Record<OrderPaymentState, string> = {
  unpaid: 'Chuyển khoản tiền cọc để giữ máy, phần còn lại thanh toán khi nhận máy.',
  deposit_paid: 'Đã nhận tiền cọc. Phần tiền thuê còn lại thanh toán khi nhận máy.',
  paid: 'Đã nhận đủ tiền cọc và tiền thuê.',
  refund_pending: 'Đơn đã hoàn thành. Cửa hàng đang hoàn lại tiền cọc cho bạn.',
  refunded: 'Tiền cọc đã được hoàn lại.',
}

export const PAYMENT_KIND_LABELS: Record<PaymentKind, string> = {
  payment: 'Thu tiền',
  deposit_refund: 'Hoàn cọc',
}

export const PAYMENT_STATUS_LABELS: Record<'pending' | 'succeeded' | 'cancelled', string> = {
  pending: 'Đang chờ',
  succeeded: 'Thành công',
  cancelled: 'Đã hủy',
}
