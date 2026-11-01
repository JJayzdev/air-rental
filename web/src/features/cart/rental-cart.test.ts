import assert from 'node:assert/strict'
import test from 'node:test'
import {
  addRentalProduct,
  EMPTY_RENTAL_CART,
  parseRentalCart,
  readRentalCartFromStorage,
  rentalCartSchema,
  setRentalQuantity,
} from './rental-cart.ts'

const PRODUCT_A = '10000000-0000-4000-8000-000000000001'
const PRODUCT_B = '10000000-0000-4000-8000-000000000002'

test('rental cart persists only UUIDs, quantities, and rental dates', () => {
  const parsed = parseRentalCart({
    items: [{ productId: PRODUCT_A, quantity: 2 }],
    start: '2099-05-10',
    end: '2099-05-11',
  })
  assert.deepEqual(parsed, {
    items: [{ productId: PRODUCT_A, quantity: 2 }],
    start: '2099-05-10',
    end: '2099-05-11',
  })
  assert.deepEqual(
    parseRentalCart({ items: [{ productId: PRODUCT_A, quantity: 1, price: 1000 }] }),
    EMPTY_RENTAL_CART,
  )
  assert.deepEqual(
    parseRentalCart({
      items: [{ productId: PRODUCT_A, quantity: 1 }],
      start: '2099-05-11',
      end: '2099-05-10',
    }),
    EMPTY_RENTAL_CART,
  )
})

test('cart-wide quantity limit cannot silently create 21 units', () => {
  const cart = {
    items: [
      { productId: PRODUCT_A, quantity: 19 },
      { productId: PRODUCT_B, quantity: 1 },
    ],
  }
  assert.equal(addRentalProduct(cart, PRODUCT_A), cart)
  assert.equal(
    rentalCartSchema.safeParse({
      items: [
        { productId: PRODUCT_A, quantity: 19 },
        { productId: PRODUCT_B, quantity: 2 },
      ],
    }).success,
    false,
  )
  assert.equal(setRentalQuantity(cart, PRODUCT_B, 2), cart)
})

test('empty and corrupted cart data safely becomes an empty cart', () => {
  assert.deepEqual(parseRentalCart(null), EMPTY_RENTAL_CART)
  assert.deepEqual(parseRentalCart({ items: 'broken' }), EMPTY_RENTAL_CART)
  assert.deepEqual(
    parseRentalCart({ items: [{ productId: 'not-a-uuid', quantity: 1 }] }),
    EMPTY_RENTAL_CART,
  )
  assert.deepEqual(readRentalCartFromStorage({ getItem: () => '{', removeItem: () => {} }), {
    cart: EMPTY_RENTAL_CART,
  })
  assert.equal(
    readRentalCartFromStorage({
      getItem: () => {
        throw new Error('denied')
      },
      removeItem: () => {},
    }).error !== undefined,
    true,
  )
})
