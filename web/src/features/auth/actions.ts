'use server'

import { z } from 'zod'
import { absoluteAppUrl } from '@/features/products/catalog-seo'
import { createSupabaseServerClient, supabaseIsConfigured } from '@/lib/supabase/server'
import { safeInternalPath } from '@/lib/safe-internal-path'
import { redirect } from 'next/navigation'
import { otpSchema, phoneOtpRequestSchema } from './schema.ts'

export interface AuthActionState {
  message: string
  error?: boolean
}

const emailSchema = z.string().trim().email().max(254)

export async function requestLoginLink(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (!supabaseIsConfigured()) {
    return { error: true, message: 'Chức năng đăng nhập hiện chưa được kết nối.' }
  }
  const email = emailSchema.safeParse(formData.get('email'))
  if (!email.success) return { error: true, message: 'Vui lòng nhập địa chỉ email hợp lệ.' }
  try {
    const next = safeInternalPath(
      formData.get('next'),
      '/don-thue',
      process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
    )
    const callback = absoluteAppUrl(`/auth/callback?next=${encodeURIComponent(next)}`)
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.auth.signInWithOtp({
      email: email.data,
      options: { emailRedirectTo: callback },
    })
    if (error)
      return { error: true, message: 'Chưa gửi được liên kết đăng nhập. Vui lòng thử lại.' }
    return { message: 'Nếu email hợp lệ, chúng tôi đã gửi liên kết đăng nhập.' }
  } catch {
    return { error: true, message: 'Chức năng đăng nhập hiện chưa được kết nối.' }
  }
}

export async function signOut() {
  if (supabaseIsConfigured()) {
    const supabase = await createSupabaseServerClient()
    await supabase.auth.signOut()
  }
  redirect('/dang-nhap')
}

export interface PhoneOtpActionState {
  message: string
  error?: boolean
  sent?: boolean
}

const PHONE_OTP_ENABLED = process.env.AIR_ENABLE_PHONE_OTP === 'true'

export async function requestPhoneOtp(
  _state: PhoneOtpActionState,
  formData: FormData,
): Promise<PhoneOtpActionState> {
  if (!PHONE_OTP_ENABLED) return { error: true, message: 'Đăng nhập bằng SMS hiện chưa được bật.' }
  if (!supabaseIsConfigured())
    return { error: true, message: 'Chức năng đăng nhập hiện chưa được kết nối.' }
  const parsed = phoneOtpRequestSchema.safeParse({ phone: formData.get('phone') })
  if (!parsed.success) return { error: true, message: 'Vui lòng nhập số điện thoại hợp lệ.' }
  try {
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.auth.signInWithOtp({ phone: parsed.data.phone })
    if (error) return { error: true, message: 'Chưa gửi được mã đăng nhập. Vui lòng thử lại.' }
    return { sent: true, message: 'Nếu số điện thoại hợp lệ, mã đăng nhập đã được gửi.' }
  } catch {
    return { error: true, message: 'Chức năng đăng nhập hiện chưa được kết nối.' }
  }
}

export async function verifyPhoneOtp(
  _state: PhoneOtpActionState,
  formData: FormData,
): Promise<never | PhoneOtpActionState> {
  if (!PHONE_OTP_ENABLED) return { error: true, message: 'Đăng nhập bằng SMS hiện chưa được bật.' }
  if (!supabaseIsConfigured())
    return { error: true, message: 'Chức năng đăng nhập hiện chưa được kết nối.' }
  const parsed = otpSchema.safeParse({ phone: formData.get('phone'), code: formData.get('code') })
  if (!parsed.success)
    return { error: true, message: 'Số điện thoại hoặc mã đăng nhập chưa hợp lệ.' }
  let verified = false
  try {
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase.auth.verifyOtp({
      phone: parsed.data.phone,
      token: parsed.data.code,
      type: 'sms',
    })
    if (error || !data.user)
      return { error: true, message: 'Mã đăng nhập không đúng hoặc đã hết hạn.' }
    verified = true
  } catch {
    return { error: true, message: 'Chưa xác minh được mã đăng nhập. Vui lòng thử lại.' }
  }
  if (!verified)
    return { error: true, message: 'Chưa xác minh được mã đăng nhập. Vui lòng thử lại.' }
  const next = safeInternalPath(
    formData.get('next'),
    '/don-thue',
    process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  )
  redirect(next)
}
