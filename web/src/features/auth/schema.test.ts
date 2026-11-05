import assert from 'node:assert/strict'
import test from 'node:test'
import {
  emailOtpRequestSchema,
  emailOtpVerifySchema,
  registerAccountSchema,
  registrationMetadataSchema,
} from './schema.ts'

const validRegistration = {
  fullName: 'Nguyễn Văn An',
  email: 'an@example.com',
  phone: '0912345678',
  addressLine: '12 Nguyễn Huệ',
  ward: 'Bến Nghé',
  district: 'Quận 1',
  province: 'TP. Hồ Chí Minh',
  acceptedTerms: 'on',
}

test('registration requires customer details and compliance consent', () => {
  assert.equal(registerAccountSchema.safeParse(validRegistration).success, true)
  assert.equal(
    registerAccountSchema.safeParse({ ...validRegistration, acceptedTerms: undefined }).success,
    false,
  )
  assert.equal(
    registerAccountSchema.safeParse({ ...validRegistration, phone: '+12125550000' }).success,
    false,
  )
  assert.equal(
    registerAccountSchema.safeParse({ ...validRegistration, addressLine: '12' }).success,
    false,
  )
  assert.equal(
    registerAccountSchema.safeParse({ ...validRegistration, role: 'admin' }).success,
    false,
  )
})

test('email OTP accepts only a six digit sign-in code', () => {
  assert.equal(emailOtpRequestSchema.safeParse({ email: 'an@example.com' }).success, true)
  assert.equal(emailOtpRequestSchema.safeParse({ email: 'not-an-email' }).success, false)
  assert.equal(
    emailOtpVerifySchema.safeParse({ email: 'an@example.com', token: '123456' }).success,
    true,
  )
  assert.equal(
    emailOtpVerifySchema.safeParse({ email: 'an@example.com', token: '12345' }).success,
    false,
  )
  assert.equal(
    emailOtpVerifySchema.safeParse({ email: 'an@example.com', token: '1234567' }).success,
    false,
  )
})

test('registration metadata maps into a customer address', () => {
  const parsed = registrationMetadataSchema.safeParse({
    full_name: 'Nguyễn Văn An',
    phone: '0912345678',
    registration_address: {
      label: 'Nhà riêng',
      address_line: '12 Nguyễn Huệ',
      ward: 'Bến Nghé',
      district: 'Quận 1',
      province: 'TP. Hồ Chí Minh',
    },
  })
  assert.equal(parsed.success, true)
  assert.equal(registrationMetadataSchema.safeParse({ full_name: 'A' }).success, false)
})
