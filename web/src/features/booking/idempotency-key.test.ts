import assert from 'node:assert/strict'
import test from 'node:test'
import {
  BOOKING_ATTEMPT_STORAGE_KEY,
  clearBookingKey,
  getOrCreateBookingKey,
  rotateBookingKey,
} from './idempotency-key.ts'

test('same browser session reuses its booking attempt key across reloads', () => {
  const data = new Map<string, string>()
  const storage = {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value)
    },
    removeItem: (key: string) => {
      data.delete(key)
    },
  }
  const first = getOrCreateBookingKey(storage, () => '20000000-0000-4000-8000-000000000001')
  const afterReload = getOrCreateBookingKey(storage, () => '20000000-0000-4000-8000-000000000002')
  assert.equal(first, afterReload)
  assert.equal(data.size, 1)
  assert.equal(data.has(BOOKING_ATTEMPT_STORAGE_KEY), true)
  const next = rotateBookingKey(storage, () => '20000000-0000-4000-8000-000000000003')
  assert.notEqual(next, first)
  clearBookingKey(storage)
  assert.equal(data.size, 0)
})
