export const STAFF_ORDER_PAGE_SIZE = 20

export function staffOrderRange(page: number): [number, number] {
  const safePage = Number.isSafeInteger(page) && page > 0 ? page : 1
  const from = (safePage - 1) * STAFF_ORDER_PAGE_SIZE
  return [from, from + STAFF_ORDER_PAGE_SIZE - 1]
}

export function clampStaffOrderPage(page: number, totalCount: number): number {
  const safePage = Number.isSafeInteger(page) && page > 0 ? page : 1
  return Math.min(safePage, Math.max(1, Math.ceil(totalCount / STAFF_ORDER_PAGE_SIZE)))
}
