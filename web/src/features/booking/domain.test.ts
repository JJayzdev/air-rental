import assert from 'node:assert/strict'
import test from 'node:test'
import { blockedPeriod, rentalDays, rentalPrice, transitionReservation } from './domain.ts'
import { bookingRequestSchema } from './schema.ts'

test('calendar rental counts both selected dates, including same-day rental', () => {
  assert.equal(rentalDays({ start: '2026-11-01', end: '2026-11-01' }), 1)
  assert.equal(rentalDays({ start: '2026-11-01', end: '2026-11-03' }), 3)
})

test('rejects impossible dates and reversed ranges', () => {
  assert.throws(() => rentalDays({ start: '2026-02-30', end: '2026-03-01' }))
  assert.throws(() => rentalDays({ start: '2026-11-02', end: '2026-11-01' }))
})

test('blocked period includes one cleanup day after the inclusive rental period', () => {
  assert.deepEqual(blockedPeriod({ start: '2026-11-01', end: '2026-11-03' }), {
    start: '2026-11-01',
    endExclusive: '2026-11-05',
  })
  assert.deepEqual(blockedPeriod({ start: '2026-11-01', end: '2026-11-01' }), {
    start: '2026-11-01',
    endExclusive: '2026-11-03',
  })
})

test('prices inclusive days and applies a selected tier using integer VND', () => {
  const tiers = [{ minDays: 3, maxDays: 6, discountPercent: 10 }]
  assert.equal(rentalPrice(100_000, { start: '2026-11-01', end: '2026-11-01' }, tiers), 100_000)
  assert.equal(rentalPrice(100_000, { start: '2026-11-01', end: '2026-11-03' }, tiers), 270_000)
  assert.throws(() => rentalPrice(0, { start: '2026-11-01', end: '2026-11-01' }))
})

test('pending reservations can be cancelled or expired, terminal states cannot reopen', () => {
  assert.equal(transitionReservation('pending', 'released'), 'released')
  assert.equal(transitionReservation('pending', 'expired'), 'expired')
  assert.throws(() => transitionReservation('released', 'confirmed'))
})

test('booking request accepts product and quantity data, rejects untrusted prices', () => {
  const payload = {
    idempotencyKey: '40000000-0000-4000-8000-000000000001',
    productId: '10000000-0000-4000-8000-000000000001',
    quantity: 2,
    start: '2026-11-01',
    end: '2026-11-03',
    fulfillment: 'pickup',
    customer: { name: 'Test Customer', phone: '0912345678', address: 'Test address 123' },
  }
  const parsed = bookingRequestSchema.parse(payload)
  assert.equal(parsed.quantity, 2)
  assert.equal(
    bookingRequestSchema.safeParse({
      ...payload,
      unitId: '20000000-0000-0000-0000-000000000001',
      pricePerDay: 1,
      total: 1,
    }).success,
    false,
  )
})

test('booking request rejects impossible and reversed calendar dates', () => {
  const base = {
    idempotencyKey: '40000000-0000-4000-8000-000000000001',
    productId: '10000000-0000-4000-8000-000000000001',
    quantity: 1,
    start: '2026-11-01',
    end: '2026-11-03',
    fulfillment: 'pickup',
    customer: { name: 'Test Customer', phone: '0912345678', address: 'Test address 123' },
  }
  assert.equal(bookingRequestSchema.safeParse({ ...base, end: '2026-02-30' }).success, false)
  assert.equal(bookingRequestSchema.safeParse({ ...base, start: '2026-11-04' }).success, false)
})
