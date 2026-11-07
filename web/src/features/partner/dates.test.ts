import assert from 'node:assert/strict'
import test from 'node:test'
import { formatRentalPeriod, formatVietnamDate, vietnamMonthKey } from './dates.ts'

test('rental period shows the inclusive last day, independent of server time zone', () => {
  assert.equal(formatRentalPeriod('[2026-11-10,2026-11-13)'), '10/11/2026 → 12/11/2026')
  assert.equal(formatRentalPeriod('[2026-11-30,2026-12-01)'), '30/11/2026 → 30/11/2026')
  assert.equal(formatRentalPeriod('not-a-range'), 'not-a-range')
})

test('month and date keys use Vietnam time, not UTC', () => {
  // 00:30 ngày 1/12 giờ Việt Nam = 17:30 ngày 30/11 UTC.
  assert.equal(vietnamMonthKey('2026-11-30T17:30:00.000Z'), '2026-12')
  assert.equal(vietnamMonthKey('2026-11-30T16:59:00.000Z'), '2026-11')
  assert.equal(formatVietnamDate('2026-11-30T17:30:00.000Z'), '1/12/2026')
})
