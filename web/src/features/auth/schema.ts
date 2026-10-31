import { z } from 'zod'

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

export type LoginInput = z.infer<typeof loginSchema>
export type OtpInput = z.infer<typeof otpSchema>
