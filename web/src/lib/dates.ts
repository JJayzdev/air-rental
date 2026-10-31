/** Tính toán ngày thuê. Mọi ngày dùng dạng ISO "YYYY-MM-DD" (không kèm giờ). */

export const toISO = (date: Date): string => {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export const todayISO = (): string => toISO(new Date())

export const addDays = (iso: string, days: number): string => {
  const date = new Date(`${iso}T00:00:00`)
  date.setDate(date.getDate() + days)
  return toISO(date)
}

/** Số ngày thuê, tính cả ngày bắt đầu và kết thúc. Tối thiểu 1. */
export const daysBetween = (start: string, end: string): number => {
  if (!start || !end) return 1
  const a = new Date(`${start}T00:00:00`).getTime()
  const b = new Date(`${end}T00:00:00`).getTime()
  if (Number.isNaN(a) || Number.isNaN(b)) return 1
  const diff = Math.round((b - a) / 86_400_000) + 1
  return Math.max(1, diff)
}
