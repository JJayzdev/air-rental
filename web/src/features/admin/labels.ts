export const PRODUCT_STATE_LABELS = {
  draft: 'Nháp',
  active: 'Đang cho thuê',
  archived: 'Lưu trữ',
} as const

export const UNIT_STATE_LABELS = {
  available: 'Sẵn sàng',
  maintenance: 'Đang bảo trì',
  retired: 'Ngừng dùng',
} as const

export const MAINTENANCE_REASON_LABELS = {
  scheduled: 'Bảo dưỡng định kỳ',
  repair: 'Sửa chữa',
  inspection: 'Kiểm tra',
} as const

export const DISCOUNT_KIND_LABELS = {
  percent: 'Phần trăm',
  fixed: 'Số tiền cố định',
} as const

/** Display-only state; the database still stores active as a boolean. */
export function discountCodeState(input: {
  active: boolean
  startsOn: string | null
  endsOn: string | null
  maxUses: number | null
  usedCount: number
  today?: string
}): { tone: string; label: string } {
  const today =
    input.today ??
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date())
  if (!input.active) return { tone: 'archived', label: 'Đang tắt' }
  if (input.startsOn && today < input.startsOn) return { tone: 'draft', label: 'Chưa bắt đầu' }
  if (input.endsOn && today > input.endsOn) return { tone: 'retired', label: 'Đã hết hạn' }
  if (input.maxUses !== null && input.usedCount >= input.maxUses)
    return { tone: 'retired', label: 'Hết lượt' }
  return { tone: 'active', label: 'Đang dùng' }
}
