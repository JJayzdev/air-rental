const VN_TIME_ZONE = 'Asia/Ho_Chi_Minh'

/** Ngày theo giờ Việt Nam, không phụ thuộc múi giờ của máy chủ (Vercel chạy UTC). */
export function formatVietnamDate(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString('vi-VN', { timeZone: VN_TIME_ZONE })
}

/** Khóa tháng `YYYY-MM` theo giờ Việt Nam. */
export function vietnamMonthKey(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value)
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: VN_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(date)
  const year = parts.find((part) => part.type === 'year')?.value ?? '0000'
  const month = parts.find((part) => part.type === 'month')?.value ?? '00'
  return `${year}-${month}`
}

/**
 * Hiển thị khoảng thuê từ daterange của Postgres. Cận trên là exclusive (`p_end + 1`), nên
 * `[2026-11-10,2026-11-13)` nghĩa là thuê từ 10/11 đến hết 12/11.
 */
export function formatRentalPeriod(period: string): string {
  const match = period.match(/^\[(\d{4}-\d{2}-\d{2}),(\d{4}-\d{2}-\d{2})\)$/)
  if (!match) return period
  const format = (value: string, offsetDays = 0) => {
    const [year, month, day] = value.split('-').map(Number)
    const date = new Date(Date.UTC(year, month - 1, day + offsetDays))
    return Number.isNaN(date.getTime())
      ? value
      : date.toLocaleDateString('vi-VN', { timeZone: 'UTC' })
  }
  return `${format(match[1])} → ${format(match[2], -1)}`
}
