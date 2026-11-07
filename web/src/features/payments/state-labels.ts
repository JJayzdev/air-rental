import type { OrderPaymentState, PaymentKind } from '@/lib/supabase/database'

export const PAYMENT_STATE_LABELS: Record<OrderPaymentState, string> = {
  unpaid: 'Chưa thanh toán',
  deposit_paid: 'Đã cọc',
  paid: 'Đã thanh toán đủ',
  refund_pending: 'Chờ hoàn tiền',
  refunded: 'Đã hoàn tiền',
}

export const PAYMENT_STATE_HINTS: Record<OrderPaymentState, string> = {
  unpaid: 'Chuyển khoản tiền cọc để giữ máy, phần còn lại thanh toán khi nhận máy.',
  deposit_paid: 'Đã nhận tiền cọc. Phần tiền thuê còn lại thanh toán khi nhận máy.',
  paid: 'Đã nhận đủ tiền cọc và tiền thuê.',
  refund_pending:
    'Cửa hàng đang hoàn tiền cho bạn: tiền cọc khi đơn hoàn thành, hoặc toàn bộ số đã chuyển nếu đơn bị huỷ hay hết hạn.',
  refunded: 'Khoản hoàn tiền đã được chuyển lại cho bạn.',
}

export const PAYMENT_KIND_LABELS: Record<PaymentKind, string> = {
  payment: 'Thu tiền',
  deposit_refund: 'Hoàn cọc',
  cancellation_refund: 'Hoàn tiền huỷ đơn',
}

export const PAYMENT_STATUS_LABELS: Record<'pending' | 'succeeded' | 'cancelled', string> = {
  pending: 'Đang chờ',
  succeeded: 'Thành công',
  cancelled: 'Đã hủy',
}
