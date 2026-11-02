import assert from 'node:assert/strict'
import test from 'node:test'
import {
  adminProductSchema,
  adminUnitSchema,
  adminUnitStateSchema,
  closeMaintenanceSchema,
  maintenanceSchema,
} from './admin-schema.ts'

const product = {
  productId: '',
  categoryId: '87000000-0000-4000-8000-000000000001',
  slug: 'may-anh-moi',
  name: 'MÃ¡y áº£nh má»›i',
  description: 'MÃ¡y áº£nh cho thuÃª theo ngÃ y.',
  pricePerDayVnd: '120000',
  depositVnd: '500000',
  state: 'draft',
}

test('product schema converts VND inputs and rejects unsafe catalog data', () => {
  const parsed = adminProductSchema.parse(product)
  assert.equal(parsed.productId, null)
  assert.equal(parsed.pricePerDayVnd, 120000)
  assert.equal(parsed.depositVnd, 500000)
  assert.equal(parsed.state, 'draft')

  assert.equal(adminProductSchema.safeParse({ ...product, slug: 'MÃ¡y áº¢nh' }).success, false)
  assert.equal(adminProductSchema.safeParse({ ...product, pricePerDayVnd: '0' }).success, false)
  assert.equal(adminProductSchema.safeParse({ ...product, pricePerDayVnd: '12.5' }).success, false)
  assert.equal(adminProductSchema.safeParse({ ...product, depositVnd: '-1' }).success, false)
  assert.equal(adminProductSchema.safeParse({ ...product, state: 'deleted' }).success, false)
  assert.equal(adminProductSchema.safeParse({ ...product, is_sample: 'true' }).success, false)
})

test('product schema keeps an existing product id for updates', () => {
  const parsed = adminProductSchema.parse({
    ...product,
    productId: '87000000-0000-4000-8000-000000000002',
    depositVnd: '0',
  })
  assert.equal(parsed.productId, '87000000-0000-4000-8000-000000000002')
  assert.equal(parsed.depositVnd, 0)
})

test('unit schema validates asset tags and ready dates', () => {
  const unit = {
    productId: '87000000-0000-4000-8000-000000000002',
    assetTag: 'ADM-004',
    readyOn: '2026-11-01',
  }
  assert.deepEqual(adminUnitSchema.parse(unit), unit)
  assert.equal(adminUnitSchema.safeParse({ ...unit, assetTag: 'a' }).success, false)
  assert.equal(adminUnitSchema.safeParse({ ...unit, assetTag: 'cÃ³ dáº¥u' }).success, false)
  assert.equal(adminUnitSchema.safeParse({ ...unit, readyOn: '01/11/2026' }).success, false)
  assert.equal(adminUnitSchema.safeParse({ ...unit, state: 'retired' }).success, false)
})

test('unit state schema only allows returning to the pool or retiring', () => {
  assert.equal(
    adminUnitStateSchema.safeParse({
      unitId: '87000000-0000-4000-8000-000000000003',
      state: 'available',
    }).success,
    true,
  )
  assert.equal(
    adminUnitStateSchema.safeParse({
      unitId: '87000000-0000-4000-8000-000000000003',
      state: 'maintenance',
    }).success,
    false,
  )
})

test('maintenance schema validates the scheduling window', () => {
  const record = {
    unitId: '87000000-0000-4000-8000-000000000003',
    reason: 'repair',
    expectedEndOn: '2026-11-05',
    notes: 'Thay bÃ n phÃ­m',
  }
  assert.deepEqual(maintenanceSchema.parse(record), record)
  assert.equal(maintenanceSchema.safeParse({ ...record, reason: 'cleaning' }).success, false)
  assert.equal(
    maintenanceSchema.safeParse({ ...record, expectedEndOn: '05-11-2026' }).success,
    false,
  )
  assert.equal(maintenanceSchema.safeParse({ ...record, notes: 'x'.repeat(501) }).success, false)
})

test('closing maintenance accepts an empty or explicit completion date', () => {
  const base = { maintenanceId: '87000000-0000-4000-8000-000000000004', completedOn: '' }
  assert.equal(closeMaintenanceSchema.parse(base).completedOn, null)
  assert.equal(
    closeMaintenanceSchema.parse({ ...base, completedOn: '2026-11-06' }).completedOn,
    '2026-11-06',
  )
  assert.equal(
    closeMaintenanceSchema.safeParse({ ...base, completedOn: '06/11/2026' }).success,
    false,
  )
})
