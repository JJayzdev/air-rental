// Tính toán ngày thuê. Mọi ngày dùng dạng ISO "YYYY-MM-DD" (không kèm giờ).
// Khi chuyển sang backend, các hàm này dùng chung được với server.

export const toISO = (date) => {
  const d = new Date(date)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export const todayISO = () => toISO(new Date())

export const addDays = (iso, days) => {
  const d = new Date(`${iso}T00:00:00`)
  d.setDate(d.getDate() + days)
  return toISO(d)
}

/** Số ngày thuê, tính cả ngày bắt đầu và kết thúc. Tối thiểu 1. */
export const daysBetween = (start, end) => {
  if (!start || !end) return 1
  const a = new Date(`${start}T00:00:00`).getTime()
  const b = new Date(`${end}T00:00:00`).getTime()
  if (Number.isNaN(a) || Number.isNaN(b)) return 1
  const diff = Math.round((b - a) / 86400000) + 1
  return Math.max(1, diff)
}
