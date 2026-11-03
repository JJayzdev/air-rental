import assert from 'node:assert/strict'
import test from 'node:test'
import {
  deliveryFeeFor,
  deliveryErrorMessage,
  discountErrorMessage,
  rentalQuoteKey,
} from './pricing.ts'
import { discountPreviewSchema, rentalQuotePreviewSchema } from './schema.ts'

const zone = { feeVnd: 30000, freeFromVnd: 2000000 }

test('delivery fee is waived only at or above the free threshold', () => {
  assert.equal(deliveryFeeFor(zone, 1999999), 30000)
  assert.equal(deliveryFeeFor(zone, 2000000), 0)
  assert.equal(deliveryFeeFor({ feeVnd: 30000, freeFromVnd: null }, 9999999), 30000)
  assert.equal(deliveryFeeFor(null, 9999999), 0)
})

test('delivery fee uses the rental amount after discount', () => {
  const subtotal = 2100000
  const discount = 150000
  assert.equal(deliveryFeeFor(zone, subtotal), 0)
  assert.equal(deliveryFeeFor(zone, subtotal - discount), 30000)
})

test('discount errors map to actionable Vietnamese messages', () => {
  assert.match(discountErrorMessage('Discount code was not found'), /không tồn tại/)
  assert.match(discountErrorMessage('Discount code is not active'), /đang tắt/)
  assert.match(discountErrorMessage('Discount code is outside its valid dates'), /hết hạn/)
  assert.match(discountErrorMessage('Discount code has reached its usage limit'), /hết lượt/)
  assert.match(
    discountErrorMessage('Order subtotal has not reached the discount minimum'),
    /tối thiểu/,
  )
  assert.match(deliveryErrorMessage('Delivery requires a delivery zone'), /khu vực giao/)
})

test('discount preview accepts normalised codes and a real cart', () => {
  const parsed = discountPreviewSchema.parse({
    code: ' welcome10 ',
    items: [{ productId: '10000000-0000-4000-8000-000000000001', quantity: 1 }],
    dates: { start: '2099-05-10', end: '2099-05-11' },
  })
  assert.equal(parsed.code, 'WELCOME10')
  assert.equal(discountPreviewSchema.safeParse({ ...parsed, code: 'x' }).success, false)
})

test('full quote schema supports a code-free pickup and requires a delivery zone', () => {
  const base = {
    code: '',
    items: [{ productId: '10000000-0000-4000-8000-000000000001', quantity: 1 }],
    dates: { start: '2099-05-10', end: '2099-05-11' },
  }
  assert.equal(
    rentalQuotePreviewSchema.parse({ ...base, fulfillment: 'pickup', deliveryZoneId: null }).code,
    '',
  )
  assert.equal(
    rentalQuotePreviewSchema.safeParse({ ...base, fulfillment: 'delivery', deliveryZoneId: null })
      .success,
    false,
  )
})

test('quote key invalidates stale responses for item, date, fulfillment, zone, and code changes', () => {
  const base = {
    items: [{ productId: 'p1', quantity: 1 }],
    start: '2099-05-10',
    end: '2099-05-11',
    fulfillment: 'pickup' as const,
    deliveryZoneId: null,
    code: '',
  }
  const key = rentalQuoteKey(base)
  assert.notEqual(rentalQuoteKey({ ...base, items: [{ productId: 'p1', quantity: 2 }] }), key)
  assert.notEqual(rentalQuoteKey({ ...base, start: '2099-05-12' }), key)
  assert.notEqual(rentalQuoteKey({ ...base, end: '2099-05-12' }), key)
  assert.notEqual(rentalQuoteKey({ ...base, fulfillment: 'delivery', deliveryZoneId: 'z1' }), key)
  assert.notEqual(rentalQuoteKey({ ...base, code: 'SAVE10' }), key)
  assert.equal(
    rentalQuoteKey({ ...base, code: ' save10 ' }),
    rentalQuoteKey({ ...base, code: 'SAVE10' }),
  )
})
