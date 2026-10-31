// Định dạng hiển thị: tiền, ngày, giờ.

const nf = new Intl.NumberFormat('vi-VN')

/** 350000 -> "350.000 ₫" */
export const money = (value) => `${nf.format(Math.round(value || 0))} ₫`

/** "2026-10-30" (giá trị input date) -> "30/10/2026" */
export const dateVN = (iso) => {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export const nowTime = () =>
  new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
