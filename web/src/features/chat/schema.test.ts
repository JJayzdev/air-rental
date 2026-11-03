import assert from 'node:assert/strict'
import test from 'node:test'
import { chatRequestSchema, inferChatAction, validAvailabilityRange } from './schema.ts'

test('chat actions have bounded, strict shapes', () => {
  assert.equal(
    chatRequestSchema.safeParse({ action: 'searchProducts', message: ' laptop ' }).success,
    true,
  )
  assert.equal(
    chatRequestSchema.safeParse({ action: 'searchProducts', message: 'x'.repeat(501) }).success,
    false,
  )
  assert.equal(
    chatRequestSchema.safeParse({
      action: 'getOrderStatus',
      orderCode: 'AIR-261102-ABCD',
      userId: 'another-user',
    }).success,
    false,
  )
  assert.equal(
    chatRequestSchema.safeParse({
      action: 'checkAvailability',
      productId: 'invalid',
      startDate: '2026-11-02',
      endDate: '2026-11-03',
    }).success,
    false,
  )
})

test('availability dates follow Vietnam today and booking_calendar 62-day limit', () => {
  const now = new Date('2026-11-02T18:00:00.000Z') // 2026-11-03 in Vietnam
  assert.equal(validAvailabilityRange('2026-11-02', '2026-11-02', now), false)
  assert.equal(validAvailabilityRange('2026-11-03', '2027-01-04', now), true)
  assert.equal(validAvailabilityRange('2026-11-03', '2027-01-05', now), false)
})

test('FAQ questions stay local while explicit intents select tools', () => {
  assert.deepEqual(inferChatAction('Kiểm tra đơn thuê AIR-261102-ABCD'), {
    action: 'getOrderStatus',
    orderCode: 'AIR-261102-ABCD',
  })
  assert.deepEqual(inferChatAction('Cách thuê thiết bị'), null)
  assert.deepEqual(inferChatAction('Tìm máy ảnh Sony'), {
    action: 'searchProducts',
    message: 'Tìm máy ảnh Sony',
  })
})
