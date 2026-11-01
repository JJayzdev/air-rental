export type RentalDates = { start: string; end: string }

const DAY_MS = 86_400_000
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/

/** Parse a real Gregorian calendar date as a UTC day number (timezone independent). */
export function calendarDay(iso: string): number {
  const match = DATE_RE.exec(iso)
  if (!match) throw new Error('Invalid calendar date')
  const [, y, m, d] = match
  const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)))
  if (
    date.getUTCFullYear() !== Number(y) ||
    date.getUTCMonth() !== Number(m) - 1 ||
    date.getUTCDate() !== Number(d)
  ) {
    throw new Error('Invalid calendar date')
  }
  return Math.floor(date.getTime() / DAY_MS)
}

export function rentalDays({ start, end }: RentalDates): number {
  const first = calendarDay(start)
  const last = calendarDay(end)
  if (last < first) throw new Error('End date must be on or after start date')
  return last - first + 1
}

/** Rental dates are inclusive; the blocked range is [start, end + buffer + 1). */
export function blockedPeriod(
  { start, end }: RentalDates,
  bufferDays = 1,
): { start: string; endExclusive: string } {
  if (!Number.isInteger(bufferDays) || bufferDays < 0)
    throw new Error('Buffer must be a non-negative integer')
  const first = calendarDay(start)
  const days = rentalDays({ start, end })
  const blockedEnd = new Date((first + days + bufferDays) * DAY_MS)
  return {
    start,
    endExclusive: `${blockedEnd.getUTCFullYear()}-${String(blockedEnd.getUTCMonth() + 1).padStart(2, '0')}-${String(blockedEnd.getUTCDate()).padStart(2, '0')}`,
  }
}

export type PriceTier = { minDays: number; maxDays: number | null; discountPercent: number }

/** Select one unambiguous tier and return integer VND for inclusive calendar-day billing. */
export function rentalPrice(
  pricePerDay: number,
  dates: RentalDates,
  tiers: PriceTier[] = [],
): number {
  if (!Number.isSafeInteger(pricePerDay) || pricePerDay <= 0)
    throw new Error('Daily price must be a positive integer')
  const days = rentalDays(dates)
  const tier = [...tiers]
    .filter((item) => days >= item.minDays && (item.maxDays === null || days <= item.maxDays))
    .sort((left, right) => right.minDays - left.minDays)[0]
  const discount = tier?.discountPercent ?? 0
  if (!Number.isInteger(discount) || discount < 0 || discount > 100)
    throw new Error('Invalid tier discount')
  const undiscounted = BigInt(pricePerDay) * BigInt(days)
  const discounted = (undiscounted * BigInt(100 - discount)) / 100n
  if (discounted > BigInt(Number.MAX_SAFE_INTEGER))
    throw new Error('Price exceeds safe integer range')
  return Number(discounted)
}

export type ReservationState = 'pending' | 'confirmed' | 'released' | 'expired' | 'completed'

export function transitionReservation(
  current: ReservationState,
  next: ReservationState,
): ReservationState {
  const allowed: Record<ReservationState, ReservationState[]> = {
    pending: ['confirmed', 'released', 'expired'],
    confirmed: ['released', 'completed'],
    released: [],
    expired: [],
    completed: [],
  }
  if (!allowed[current].includes(next))
    throw new Error(`Invalid reservation transition: ${current} -> ${next}`)
  return next
}
