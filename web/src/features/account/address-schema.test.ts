import assert from 'node:assert/strict'
import test from 'node:test'
import { customerAddressSchema } from './address-schema.ts'

const address = {
  addressId: '',
  label: 'Nhà riêng',
  recipientName: 'Nguyễn An',
  phone: '0912345678',
  addressLine: '12 Đường A',
  ward: 'Phường 1',
  district: 'Quận 1',
  province: 'TP Hồ Chí Minh',
  isDefault: 'true',
}

test('address schema validates contact and location fields without accepting owner IDs', () => {
  assert.deepEqual(customerAddressSchema.parse(address), {
    ...address,
    addressId: null,
    isDefault: true,
  })
  assert.equal(customerAddressSchema.safeParse({ ...address, phone: 'abc' }).success, false)
  assert.equal(customerAddressSchema.safeParse({ ...address, isDefault: 'yes' }).success, false)
  assert.equal(customerAddressSchema.safeParse({ ...address, userId: 'forged' }).success, false)
})
