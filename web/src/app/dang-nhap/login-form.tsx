'use client'

import { useActionState } from 'react'
import { requestLoginLink, type AuthActionState } from '@/features/auth/actions'
import { PhoneOtpForm } from './phone-otp-form'

const initialState: AuthActionState = { message: '' }

export function LoginForm({
  next,
  phoneOtpEnabled = false,
}: {
  next: string
  phoneOtpEnabled?: boolean
}) {
  const [state, action, pending] = useActionState(requestLoginLink, initialState)
  return (
    <>
      <form className="rental-form" action={action}>
        <input type="hidden" name="next" value={next} />
        <label htmlFor="login-email">Email</label>
        <input
          id="login-email"
          type="email"
          name="email"
          autoComplete="email"
          required
          maxLength={254}
        />
        <button className="primary" type="submit" disabled={pending}>
          {pending ? 'Đang gửi…' : 'Gửi liên kết đăng nhập'}
        </button>
        <p aria-live="polite" className={state.error ? 'rental-error' : 'rental-message'}>
          {state.message}
        </p>
        <small>Đăng nhập bằng liên kết dùng một lần gửi tới email.</small>
      </form>
      {phoneOtpEnabled && <PhoneOtpForm next={next} />}
    </>
  )
}
