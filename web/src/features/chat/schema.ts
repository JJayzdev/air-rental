import { z } from 'zod'

const isoDate = z.string().date()

export const chatRequestSchema = z.discriminatedUnion('action', [
  z
    .object({ action: z.literal('searchProducts'), message: z.string().trim().min(1).max(500) })
    .strict(),
  z
    .object({
      action: z.literal('checkAvailability'),
      productId: z.string().uuid(),
      startDate: isoDate,
      endDate: isoDate,
    })
    .strict(),
  z
    .object({
      action: z.literal('getOrderStatus'),
      orderCode: z.string().trim().min(8).max(32).optional(),
    })
    .strict(),
  z.object({ action: z.literal('message'), message: z.string().trim().min(1).max(500) }).strict(),
])

export type ChatRequest = z.infer<typeof chatRequestSchema>

export function inferChatAction(message: string): ChatRequest | null {
  const text = message.toLocaleLowerCase('vi')
  const orderCode = message.match(/AIR-[A-Z0-9-]{8,}/i)?.[0]
  if (/(đơn thuê|trạng thái đơn|kiểm tra đơn|đơn của tôi|mã đơn)/i.test(text)) {
    return { action: 'getOrderStatus', ...(orderCode ? { orderCode } : {}) }
  }
  const knownQuestion =
    /(cách|quy trình|giá thuê|tính giá|bao nhiêu|đặt cọc|thanh toán|giao nhận|vận chuyển|hoàn trả|xin chào|chào bạn)/i.test(
      text,
    )
  if (
    !knownQuestion &&
    /(tìm|gợi ý|laptop|máy ảnh|điện thoại|iphone|macbook|ipad|thiết bị)/i.test(text)
  ) {
    return { action: 'searchProducts', message }
  }
  return null
}

export function validAvailabilityRange(startDate: string, endDate: string, today = new Date()) {
  const start = new Date(`${startDate}T00:00:00Z`)
  const end = new Date(`${endDate}T00:00:00Z`)
  const todayLocal = new Date(today.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }))
  const todayVietnam = new Date(
    Date.UTC(todayLocal.getFullYear(), todayLocal.getMonth(), todayLocal.getDate()),
  )
  return (
    start >= todayVietnam && end >= start && (end.getTime() - start.getTime()) / 86_400_000 <= 62
  )
}
