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
