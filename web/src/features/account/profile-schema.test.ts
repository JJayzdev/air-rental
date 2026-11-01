import assert from 'node:assert/strict'
import test from 'node:test'
import { ownProfileSchema } from './profile-schema.ts'

test('profile contact fields are validated and phone remains optional', () => {
  assert.deepEqual(ownProfileSchema.parse({ fullName: 'Nguyễn An', phone: '0912345678' }), {
    fullName: 'Nguyễn An',
    phone: '0912345678',
  })
  assert.deepEqual(ownProfileSchema.parse({ fullName: 'Nguyễn An', phone: '' }), {
    fullName: 'Nguyễn An',
    phone: null,
  })
  assert.equal(
    ownProfileSchema.safeParse({ fullName: 'Nguyễn An', phone: '+12125550000' }).success,
    false,
  )
  assert.equal(ownProfileSchema.safeParse({ fullName: 'A', phone: '' }).success, false)
  assert.equal(
    ownProfileSchema.safeParse({ fullName: 'Nguyễn An', phone: '', role: 'admin' }).success,
    false,
  )
})
