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
