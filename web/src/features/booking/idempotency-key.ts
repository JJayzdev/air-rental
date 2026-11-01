export const BOOKING_ATTEMPT_STORAGE_KEY = 'air-active-booking-idempotency-key-v1'

export interface SessionStorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export function getOrCreateBookingKey(
  storage: SessionStorageLike,
  createKey = () => crypto.randomUUID(),
): string {
  const existing = storage.getItem(BOOKING_ATTEMPT_STORAGE_KEY)
  if (
    existing &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(existing)
  ) {
    return existing
  }
  const key = createKey()
  storage.setItem(BOOKING_ATTEMPT_STORAGE_KEY, key)
  return key
}

export function rotateBookingKey(
  storage: SessionStorageLike,
  createKey = () => crypto.randomUUID(),
): string {
  const key = createKey()
  storage.setItem(BOOKING_ATTEMPT_STORAGE_KEY, key)
  return key
}

export function clearBookingKey(storage: SessionStorageLike): void {
  storage.removeItem(BOOKING_ATTEMPT_STORAGE_KEY)
}
