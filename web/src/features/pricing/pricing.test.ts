import assert from 'node:assert/strict'
import test from 'node:test'
import { deliveryFeeFor, deliveryErrorMessage, discountErrorMessage } from './pricing.ts'
import { discountPreviewSchema } from './schema.ts'

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
