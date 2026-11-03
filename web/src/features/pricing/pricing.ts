import type { DeliveryZoneView } from './types.ts'

/** Delivery is free once the rental amount after discount reaches the zone threshold. */
export function deliveryFeeFor(
  zone: Pick<DeliveryZoneView, 'feeVnd' | 'freeFromVnd'> | null,
  subtotalAfterDiscountVnd: number,
): number {
  if (!zone) return 0
  if (zone.freeFromVnd !== null && subtotalAfterDiscountVnd >= zone.freeFromVnd) return 0
  return zone.feeVnd
}

/** Stable identity for an asynchronous quote; every amount-affecting input is represented. */
export function rentalQuoteKey(input: {
  items: Array<{ productId: string; quantity: number }>
  start: string
  end: string
  fulfillment: 'pickup' | 'delivery'
  deliveryZoneId: string | null
  code: string
}) {
  return JSON.stringify({
    items: [...input.items].sort((a, b) => a.productId.localeCompare(b.productId)),
    start: input.start,
    end: input.end,
    fulfillment: input.fulfillment,
    deliveryZoneId: input.deliveryZoneId,
    code: input.code.trim().toUpperCase(),
  })
}

/** Turns the database error text into a customer-facing message. */
export function discountErrorMessage(message: string): string {
  if (message.includes('Discount code was not found')) return 'Mã giảm giá không tồn tại.'
  if (message.includes('Discount code is not active')) return 'Mã giảm giá hiện đang tắt.'
  if (message.includes('outside its valid dates'))
    return 'Mã giảm giá chưa đến thời gian dùng hoặc đã hết hạn.'
  if (message.includes('reached its usage limit'))
    return 'Mã giảm giá đã hết lượt sử dụng. Vui lòng chọn mã khác.'
  if (message.includes('discount minimum'))
    return 'Đơn thuê chưa đạt giá trị tối thiểu để dùng mã này.'
  if (message.includes('not available for rental'))
    return 'Một số sản phẩm không còn nhận đặt thuê.'
  return 'Chưa áp dụng được mã giảm giá. Vui lòng kiểm tra lại.'
}

/** Order-level message when the booking RPC rejects the delivery configuration. */
export function deliveryErrorMessage(message: string): string {
  if (message.includes('Delivery requires a delivery zone'))
    return 'Vui lòng chọn khu vực giao hàng.'
  if (message.includes('Delivery zone was not found or inactive'))
    return 'Khu vực giao hàng không còn hoạt động. Vui lòng chọn khu vực khác.'
  if (message.includes('Pickup orders cannot have a delivery zone'))
    return 'Đơn nhận tại cửa hàng không có phí giao hàng.'
  return 'Chưa xác định được phí giao hàng. Vui lòng chọn lại khu vực.'
}
