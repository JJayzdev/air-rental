'use server'

import { discountPreviewSchema } from './schema.ts'
import { discountErrorMessage } from './pricing.ts'
import type { AppliedDiscount } from './types.ts'
import { getVerifiedUser } from '@/lib/supabase/auth'
import { createSupabaseServerClient, supabaseIsConfigured } from '@/lib/supabase/server'

export interface DiscountPreviewResult extends Partial<AppliedDiscount> {
  error?: string
}

/** Re-prices the cart on the server before showing a discount preview at checkout. */
export async function previewRentalDiscount(input: unknown): Promise<DiscountPreviewResult> {
  const parsed = discountPreviewSchema.safeParse(input)
  if (!parsed.success) return { error: 'Mã giảm giá hoặc giỏ thuê không hợp lệ.' }
  if (!supabaseIsConfigured()) return { error: 'Chức năng đặt thuê chưa được kết nối.' }
  const { user } = await getVerifiedUser().catch(() => ({ user: null }))
  if (!user) return { error: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' }
  try {
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase.rpc('preview_booking_discount', {
      p_items: parsed.data.items,
      p_start: parsed.data.dates.start,
      p_end: parsed.data.dates.end,
      p_discount_code: parsed.data.code,
    })
    if (error) return { error: discountErrorMessage(error.message) }
    const row = data?.[0]
    if (!row) return { error: 'Chưa áp dụng được mã giảm giá. Vui lòng thử lại.' }
    return {
      code: parsed.data.code,
      subtotalVnd: Number(row.subtotal_vnd),
      discountVnd: Number(row.discount_vnd),
      description: row.description,
    }
  } catch {
    return { error: 'Chưa áp dụng được mã giảm giá. Vui lòng thử lại.' }
  }
}
