'use server'

import { absoluteAppUrl } from '@/features/products/catalog-seo'
import { createSupabaseServerClient, supabaseIsConfigured } from '@/lib/supabase/server'
import { createSupabaseServiceClient } from '@/lib/supabase/service'
import { safeInternalPath } from '@/lib/safe-internal-path'
import { redirect } from 'next/navigation'
import { demoLoginEnabled, demoOtp, findDemoAccount, type DemoAccount } from './demo-accounts.ts'
import { defaultLandingPath } from './landing-path.ts'
import { syncRegistrationProfile } from './registration-profile.ts'
import {
  emailOtpRequestSchema,
  emailOtpVerifySchema,
  otpSchema,
  phoneOtpRequestSchema,
  registerAccountSchema,
} from './schema.ts'

export interface EmailOtpActionState {
  message: string
  error?: boolean
  sent?: boolean
  email?: string
}

function appBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
}

function emailSendErrorMessage(message: string): string | null {
  const wait = message.match(/after (\d+) seconds?/i)
  if (wait) return `Vui lòng chờ ${wait[1]} giây trước khi yêu cầu mã mới.`
  if (/rate limit/i.test(message)) {
    return 'Bạn đã yêu cầu quá nhiều mã. Vui lòng thử lại sau ít phút.'
  }
  return null
}

function authCallbackUrl(value: FormDataEntryValue | null): string {
  if (typeof value !== 'string' || !value) return absoluteAppUrl('/auth/callback')
  const next = safeInternalPath(value, '', appBaseUrl())
  return next
    ? absoluteAppUrl(`/auth/callback?next=${encodeURIComponent(next)}`)
    : absoluteAppUrl('/auth/callback')
}

export async function registerAccount(
  _state: EmailOtpActionState,
  formData: FormData,
): Promise<EmailOtpActionState> {
  if (!supabaseIsConfigured()) {
    return { error: true, message: 'Chức năng đăng ký hiện chưa được kết nối.' }
  }
  const parsed = registerAccountSchema.safeParse({
    fullName: formData.get('fullName'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    addressLine: formData.get('addressLine'),
    ward: formData.get('ward'),
    district: formData.get('district'),
    province: formData.get('province'),
    acceptedTerms: formData.get('acceptedTerms'),
  })
  if (!parsed.success) {
    return {
      error: true,
      message:
        formData.get('acceptedTerms') !== 'on'
          ? 'Bạn cần đồng ý với điều khoản thuê và chính sách bảo mật để tạo tài khoản.'
          : 'Vui lòng kiểm tra lại họ tên, email, số điện thoại và địa chỉ nhận máy.',
    }
  }
  try {
    const callback = authCallbackUrl(formData.get('next'))
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.auth.signInWithOtp({
      email: parsed.data.email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: callback,
        data: {
          full_name: parsed.data.fullName,
          phone: parsed.data.phone,
          registration_address: {
            label: 'Nhà riêng',
            address_line: parsed.data.addressLine,
            ward: parsed.data.ward,
            district: parsed.data.district,
            province: parsed.data.province,
          },
          registration_synced: false,
          terms_accepted: true,
          terms_accepted_at: new Date().toISOString(),
        },
      },
    })
    if (error) {
      const friendly = emailSendErrorMessage(error.message)
      if (friendly) return { error: true, message: friendly }
      return { error: true, message: 'Chưa gửi được email xác nhận. Vui lòng thử lại.' }
    }
    return {
      sent: true,
      email: parsed.data.email,
      message: `Đã gửi email xác nhận tới ${parsed.data.email}.`,
    }
  } catch {
    return { error: true, message: 'Chức năng đăng ký hiện chưa được kết nối.' }
  }
}

export async function requestEmailOtp(
  _state: EmailOtpActionState,
  formData: FormData,
): Promise<EmailOtpActionState> {
  if (!supabaseIsConfigured()) {
    return { error: true, message: 'Chức năng đăng nhập hiện chưa được kết nối.' }
  }
  const parsed = emailOtpRequestSchema.safeParse({ email: formData.get('email') })
  if (!parsed.success) return { error: true, message: 'Vui lòng nhập địa chỉ email hợp lệ.' }

  const demo = demoLoginEnabled() ? findDemoAccount(parsed.data.email) : null
  if (demo) {
    return {
      sent: true,
      email: demo.email,
      message: `Tài khoản demo ${demo.roleLabel}. Nhập mã ${demoOtp()} để đăng nhập (không cần mở email).`,
    }
  }

  try {
    const callback = authCallbackUrl(formData.get('next'))
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.auth.signInWithOtp({
      email: parsed.data.email,
      options: { shouldCreateUser: false, emailRedirectTo: callback },
    })
    if (error) {
      const friendly = emailSendErrorMessage(error.message)
      if (friendly) return { error: true, message: friendly }
      if (/signups? not allowed|user not found/i.test(error.message)) {
        return {
          error: true,
          message: 'Email này chưa có tài khoản A.I.R. Vui lòng đăng ký trước.',
        }
      }
      return { error: true, message: 'Chưa gửi được mã OTP. Vui lòng thử lại.' }
    }
    return {
      sent: true,
      email: parsed.data.email,
      message: `Mã OTP đã được gửi tới ${parsed.data.email}.`,
    }
  } catch {
    return { error: true, message: 'Chức năng đăng nhập hiện chưa được kết nối.' }
  }
}

export async function verifyEmailOtp(
  _state: EmailOtpActionState,
  formData: FormData,
): Promise<EmailOtpActionState> {
  if (!supabaseIsConfigured()) {
    return { error: true, message: 'Chức năng đăng nhập hiện chưa được kết nối.' }
  }
  const parsed = emailOtpVerifySchema.safeParse({
    email: formData.get('email'),
    token: formData.get('token'),
  })
  if (!parsed.success) return { error: true, message: 'Vui lòng nhập đủ 6 chữ số của mã OTP.' }

  const demo = demoLoginEnabled() ? findDemoAccount(parsed.data.email) : null
  if (demo && parsed.data.token === demoOtp()) {
    return verifyDemoOtp(demo, formData)
  }

  let verified = false
  let destination = ''
  try {
    const supabase = await createSupabaseServerClient()
    let result = await supabase.auth.verifyOtp({
      email: parsed.data.email,
      token: parsed.data.token,
      type: 'email',
    })
    if (result.error) {
      // New registrations may receive a signup confirmation code instead of a
      // magic-link code depending on the project's confirmation settings.
      result = await supabase.auth.verifyOtp({
        email: parsed.data.email,
        token: parsed.data.token,
        type: 'signup',
      })
    }
    if (result.error || !result.data.user) {
      return { error: true, message: 'Mã OTP không đúng hoặc đã hết hạn.' }
    }
    await syncRegistrationProfile(supabase, result.data.user)
    const requested = safeInternalPath(formData.get('next'), '', appBaseUrl())
    destination = requested || (await defaultLandingPath(supabase, result.data.user.id))
    verified = true
  } catch {
    return { error: true, message: 'Chưa xác minh được mã OTP. Vui lòng thử lại.' }
  }
  if (!verified || !destination) {
    return { error: true, message: 'Chưa xác minh được mã OTP. Vui lòng thử lại.' }
  }
  redirect(destination)
}

/**
 * Đăng nhập tài khoản demo bằng mã OTP cố định. Mã được xác minh ở server và
 * phiên đăng nhập thật được tạo qua Admin API, nên không cần gửi email.
 */
async function verifyDemoOtp(demo: DemoAccount, formData: FormData): Promise<EmailOtpActionState> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { error: true, message: 'Tài khoản demo chưa được cấu hình trên máy chủ.' }
  }

  let destination = ''
  try {
    const service = createSupabaseServiceClient()
    const { data: link, error: linkError } = await service.auth.admin.generateLink({
      type: 'magiclink',
      email: demo.email,
      options: { redirectTo: absoluteAppUrl('/auth/callback') },
    })
    const hashedToken = link?.properties?.hashed_token
    if (linkError || !hashedToken) {
      return {
        error: true,
        message: 'Tài khoản demo chưa sẵn sàng. Vui lòng chạy script tạo tài khoản demo.',
      }
    }

    const supabase = await createSupabaseServerClient()
    let result = await supabase.auth.verifyOtp({
      token_hash: hashedToken,
      type: 'magiclink',
    })
    if (result.error) {
      result = await supabase.auth.verifyOtp({ token_hash: hashedToken, type: 'email' })
    }
    if (result.error || !result.data.user) {
      return { error: true, message: 'Không đăng nhập được tài khoản demo. Vui lòng thử lại.' }
    }

    await syncRegistrationProfile(supabase, result.data.user)
    const requested = safeInternalPath(formData.get('next'), '', appBaseUrl())
    destination = requested || (await defaultLandingPath(supabase, result.data.user.id))
  } catch {
    return { error: true, message: 'Chưa xác minh được mã OTP demo. Vui lòng thử lại.' }
  }

  if (!destination) {
    return { error: true, message: 'Chưa xác minh được mã OTP demo. Vui lòng thử lại.' }
  }
  redirect(destination)
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
  let destination = ''
  try {
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase.auth.verifyOtp({
      phone: parsed.data.phone,
      token: parsed.data.code,
      type: 'sms',
    })
    if (error || !data.user)
      return { error: true, message: 'Mã đăng nhập không đúng hoặc đã hết hạn.' }
    const requested = safeInternalPath(formData.get('next'), '', appBaseUrl())
    destination = requested || (await defaultLandingPath(supabase, data.user.id))
    verified = true
  } catch {
    return { error: true, message: 'Chưa xác minh được mã đăng nhập. Vui lòng thử lại.' }
  }
  if (!verified || !destination)
    return { error: true, message: 'Chưa xác minh được mã đăng nhập. Vui lòng thử lại.' }
  redirect(destination)
}
