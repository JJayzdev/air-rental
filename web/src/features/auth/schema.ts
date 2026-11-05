import { z } from 'zod'

const vnPhone = /^(0|\+84)(3|5|7|8|9)[0-9]{8}$/

export const loginSchema = z.object({
  contact: z.string().trim().min(3, 'Vui lòng nhập số điện thoại hoặc email'),
})

export const otpSchema = z.object({
  phone: z
    .string()
    .trim()
    .regex(/^(0|\+84)(3|5|7|8|9)[0-9]{8}$/, 'Số điện thoại không hợp lệ'),
  code: z.string().length(6, 'Mã OTP gồm 6 chữ số'),
})

export const phoneOtpRequestSchema = z
  .object({
    phone: z
      .string()
      .trim()
      .regex(/^(0|\+84)(3|5|7|8|9)[0-9]{8}$/),
  })
  .strict()

export const emailOtpRequestSchema = z
  .object({
    email: z.string().trim().email().max(254),
  })
  .strict()

export const emailOtpVerifySchema = z
  .object({
    email: z.string().trim().email().max(254),
    token: z
      .string()
      .trim()
      .regex(/^[0-9]{6}$/, 'Mã OTP gồm 6 chữ số'),
  })
  .strict()

export const registrationAddressSchema = z.object({
  label: z.string().trim().min(1).max(40),
  address_line: z.string().trim().min(5).max(180),
  ward: z.string().trim().min(1).max(100),
  district: z.string().trim().min(1).max(100),
  province: z.string().trim().min(1).max(100),
})

export const registrationMetadataSchema = z.object({
  full_name: z.string().trim().min(2).max(120),
  phone: z.string().trim().regex(vnPhone),
  registration_address: registrationAddressSchema,
})

export const registerAccountSchema = z
  .object({
    fullName: z.string().trim().min(2).max(120),
    email: z.string().trim().email().max(254),
    phone: z.string().trim().regex(vnPhone),
    addressLine: z.string().trim().min(5).max(180),
    ward: z.string().trim().min(1).max(100),
    district: z.string().trim().min(1).max(100),
    province: z.string().trim().min(1).max(100),
    acceptedTerms: z.literal('on'),
  })
  .strict()

export type LoginInput = z.infer<typeof loginSchema>
export type OtpInput = z.infer<typeof otpSchema>
export type RegisterAccountInput = z.infer<typeof registerAccountSchema>
