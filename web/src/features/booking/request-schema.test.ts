import assert from 'node:assert/strict'
import test from 'node:test'
import { multiBookingRequestSchema } from './request-schema.ts'

const productId = '10000000-0000-4000-8000-000000000001'
const base = {
  idempotencyKey: '20000000-0000-4000-8000-000000000001',
  items: [{ productId, quantity: 2 }],
  dates: { start: '2099-05-10', end: '2099-05-11' },
  fulfillment: 'pickup',
  customer: { name: 'Rental Customer', phone: '0912345678', address: '123 Example street' },
}

test('multi-product booking input accepts only product IDs, quantities, dates, and contact details', () => {
  assert.equal(multiBookingRequestSchema.safeParse(base).success, true)
  assert.equal(multiBookingRequestSchema.safeParse({ ...base, total: 1 }).success, false)
  assert.equal(
    multiBookingRequestSchema.safeParse({ ...base, items: [{ ...base.items[0], price: 1 }] })
      .success,
    false,
  )
  assert.equal(
    multiBookingRequestSchema.safeParse({
      ...base,
      customer: { ...base.customer, userId: productId },
    }).success,
    false,
  )
})

test('multi-product schema rejects impossible dates, reversed ranges, and carts over the cap', () => {
  assert.equal(
    multiBookingRequestSchema.safeParse({
      ...base,
      dates: { start: '2099-02-29', end: '2099-03-01' },
    }).success,
    false,
  )
  assert.equal(
    multiBookingRequestSchema.safeParse({
      ...base,
      dates: { start: '2099-05-11', end: '2099-05-10' },
    }).success,
    false,
  )
  assert.equal(
    multiBookingRequestSchema.safeParse({
      ...base,
      items: [
        { productId, quantity: 20 },
        { productId, quantity: 1 },
      ],
    }).success,
    false,
  )
})

test('discount codes are normalised and invalid formats are rejected', () => {
  assert.equal(multiBookingRequestSchema.parse(base).discountCode, '')
  assert.equal(
    multiBookingRequestSchema.parse({ ...base, discountCode: ' welcome10 ' }).discountCode,
    'WELCOME10',
  )
  assert.equal(multiBookingRequestSchema.safeParse({ ...base, discountCode: 'a' }).success, false)
  assert.equal(
    multiBookingRequestSchema.safeParse({ ...base, discountCode: 'bad code' }).success,
    false,
  )
})

test('delivery needs a zone while pickup cannot carry one', () => {
  const zoneId = '20000000-0000-4000-8000-000000000001'
  const delivery = { ...base, fulfillment: 'delivery' as const }
  assert.equal(multiBookingRequestSchema.safeParse(delivery).success, false)
  assert.equal(
    multiBookingRequestSchema.safeParse({ ...delivery, deliveryZoneId: zoneId }).success,
    true,
  )
  assert.equal(
    multiBookingRequestSchema.safeParse({ ...base, deliveryZoneId: zoneId }).success,
    false,
  )
})
