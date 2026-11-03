'use server'

import { rentalQuotePreviewSchema } from './schema.ts'
import { deliveryErrorMessage, discountErrorMessage } from './pricing.ts'
import { getVerifiedUser } from '@/lib/supabase/auth'
import { createSupabaseServerClient, supabaseIsConfigured } from '@/lib/supabase/server'

export interface RentalQuotePreview {
  pricedItems: Array<{
    productId: string
    quantity: number
    pricePerDay: number
    discountPercent: number
    depositPerUnit: number
    lineTotalPerUnit: number
  }>
  subtotalVnd: number
  depositVnd: number
  discountVnd: number
  discountCode: string
  deliveryZoneId: string | null
  deliveryZoneName: string
  deliveryFeeVnd: number
  totalVnd: number
  rentalDays: number
  description: string
}

export interface RentalQuotePreviewResult {
  quote?: RentalQuotePreview
  error?: string
}

/** Quotes the complete checkout basket using the same database function as booking creation. */
export async function previewRentalQuote(input: unknown): Promise<RentalQuotePreviewResult> {
  const parsed = rentalQuotePreviewSchema.safeParse(input)
  if (!parsed.success) return { error: 'Giỏ thuê, ngày thuê hoặc cách nhận thiết bị không hợp lệ.' }
  if (!supabaseIsConfigured()) return { error: 'Chức năng đặt thuê chưa được kết nối.' }
  if (parsed.data.code) {
    const { user } = await getVerifiedUser().catch(() => ({ user: null }))
    if (!user) return { error: 'Đăng nhập để kiểm tra mã giảm giá.' }
  }
  try {
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase.rpc('preview_booking_quote', {
      p_items: parsed.data.items,
      p_start: parsed.data.dates.start,
      p_end: parsed.data.dates.end,
      p_fulfillment: parsed.data.fulfillment,
      p_discount_code: parsed.data.code,
      p_delivery_zone_id: parsed.data.deliveryZoneId,
    })
    if (error) {
      if (error.message.includes('Authentication required to preview discount codes')) {
        return { error: 'Đăng nhập để kiểm tra mã giảm giá.' }
      }
      const message = discountErrorMessage(error.message)
      return {
        error:
          message !== 'Chưa áp dụng được mã giảm giá. Vui lòng kiểm tra lại.'
            ? message
            : deliveryErrorMessage(error.message),
      }
    }
    const row = data as unknown as Record<string, unknown> | null
    if (!row) return { error: 'Chưa tính được giá thuê. Vui lòng thử lại.' }
    const quote: RentalQuotePreview = {
      pricedItems: Array.isArray(row.pricedItems)
        ? row.pricedItems.map((item) => {
            const priced = item as Record<string, unknown>
            return {
              productId: String(priced.productId),
              quantity: Number(priced.quantity),
              pricePerDay: Number(priced.pricePerDay),
              discountPercent: Number(priced.discountPercent),
              depositPerUnit: Number(priced.depositPerUnit),
              lineTotalPerUnit: Number(priced.lineTotalPerUnit),
            }
          })
        : [],
      subtotalVnd: Number(row.subtotalVnd),
      depositVnd: Number(row.depositVnd),
      discountVnd: Number(row.discountVnd),
      discountCode: String(row.discountCode ?? ''),
      deliveryZoneId: typeof row.deliveryZoneId === 'string' ? row.deliveryZoneId : null,
      deliveryZoneName: String(row.deliveryZoneName ?? ''),
      deliveryFeeVnd: Number(row.deliveryFeeVnd),
      totalVnd: Number(row.totalVnd),
      rentalDays: Number(row.rentalDays),
      description: String(row.description ?? ''),
    }
    return { quote }
  } catch {
    return { error: 'Chưa tính được giá thuê. Vui lòng thử lại.' }
  }
}
