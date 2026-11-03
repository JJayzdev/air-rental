import assert from 'node:assert/strict'
import test from 'node:test'
import { clampStaffOrderPage, staffOrderRange } from './pagination.ts'

test('staff page three includes actionable orders beyond the former 50-row cutoff', () => {
  const descendingOrderIds = Array.from({ length: 73 }, (_, index) => `order-${73 - index}`)
  const [from, to] = staffOrderRange(3)
  const page = descendingOrderIds.slice(from, to + 1)
  assert.deepEqual([from, to], [40, 59])
  assert.equal(page.length, 20)
  assert.equal(page[0], 'order-33')
  assert.equal(page.at(-1), 'order-14')
})

test('staff order page clamps invalid and out-of-range page numbers', () => {
  assert.deepEqual(staffOrderRange(0), [0, 19])
  assert.equal(clampStaffOrderPage(-2, 73), 1)
  assert.equal(clampStaffOrderPage(99, 73), 4)
  assert.equal(clampStaffOrderPage(99, 0), 1)
})
