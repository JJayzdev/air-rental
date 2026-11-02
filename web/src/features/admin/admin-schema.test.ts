import assert from 'node:assert/strict'
import test from 'node:test'
import {
  adminDeliveryZoneSchema,
  adminDiscountCodeSchema,
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

const discount = {
  discountId: '',
  code: 'welcome10',
  description: 'Giam 10% cho don tu 500.000 VND',
  kind: 'percent',
  value: '10',
  minSubtotalVnd: '500000',
  maxUses: '500',
  startsOn: '',
  endsOn: '',
  active: true,
}

test('discount schema normalises codes and enforces percent or fixed limits', () => {
  const parsed = adminDiscountCodeSchema.parse(discount)
  assert.equal(parsed.code, 'WELCOME10')
  assert.equal(parsed.discountId, null)
  assert.equal(parsed.value, 10)
  assert.equal(parsed.maxUses, 500)
  assert.equal(parsed.startsOn, null)
  assert.equal(adminDiscountCodeSchema.safeParse({ ...discount, value: '101' }).success, false)
  assert.equal(adminDiscountCodeSchema.safeParse({ ...discount, value: '0' }).success, false)
  assert.equal(
    adminDiscountCodeSchema.safeParse({ ...discount, kind: 'fixed', value: '999' }).success,
    false,
  )
  assert.equal(
    adminDiscountCodeSchema.safeParse({ ...discount, kind: 'fixed', value: '50000' }).success,
    true,
  )
  assert.equal(
    adminDiscountCodeSchema.safeParse({
      ...discount,
      startsOn: '2026-11-10',
      endsOn: '2026-11-01',
    }).success,
    false,
  )
})

const zone = {
  zoneId: '',
  name: 'Noi thanh Ha Noi',
  feeVnd: '30000',
  freeFromVnd: '2000000',
  notes: '',
  sortOrder: '1',
  active: true,
}

test('delivery zone schema converts fees and allows no free threshold', () => {
  const parsed = adminDeliveryZoneSchema.parse(zone)
  assert.equal(parsed.zoneId, null)
  assert.equal(parsed.feeVnd, 30000)
  assert.equal(parsed.freeFromVnd, 2000000)
  assert.equal(parsed.sortOrder, 1)
  assert.equal(adminDeliveryZoneSchema.parse({ ...zone, freeFromVnd: '' }).freeFromVnd, null)
  assert.equal(adminDeliveryZoneSchema.safeParse({ ...zone, feeVnd: '-1' }).success, false)
  assert.equal(adminDeliveryZoneSchema.safeParse({ ...zone, name: 'A' }).success, false)
  assert.equal(adminDeliveryZoneSchema.safeParse({ ...zone, sortOrder: '10000' }).success, false)
})
