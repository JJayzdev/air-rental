'use client'

import { useActionState } from 'react'
import { requestPhoneOtp, verifyPhoneOtp, type PhoneOtpActionState } from '@/features/auth/actions'

const initialState: PhoneOtpActionState = { message: '' }

export function PhoneOtpForm({ next }: { next: string }) {
  const [state, sendAction, sending] = useActionState(requestPhoneOtp, initialState)
  const [verifyState, verifyAction, verifying] = useActionState(verifyPhoneOtp, initialState)
  return (
    <section className="rental-phone-otp">
      <h2>Đăng nhập bằng mã SMS</h2>
      <form action={sendAction} className="rental-form">
        <input type="hidden" name="next" value={next} />
        <label htmlFor="login-phone">Số điện thoại</label>
        <input id="login-phone" name="phone" type="tel" autoComplete="tel" required />
        <button className="secondary" type="submit" disabled={sending}>
          {sending ? 'Đang gửi mã…' : 'Gửi mã SMS'}
        </button>
        {state.message && (
          <p className={state.error ? 'rental-error' : 'rental-message'} role="status">
            {state.message}
          </p>
        )}
      </form>
      {state.sent && (
        <form action={verifyAction} className="rental-form">
          <input type="hidden" name="next" value={next} />
          <label htmlFor="verify-phone">Số điện thoại đã nhận mã</label>
          <input id="verify-phone" name="phone" type="tel" autoComplete="tel" required />
          <label htmlFor="verify-code">Mã đăng nhập</label>
          <input
            id="verify-code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            minLength={6}
            maxLength={6}
          />
          <button className="primary" type="submit" disabled={verifying}>
            {verifying ? 'Đang xác minh…' : 'Xác minh mã'}
          </button>
          {verifyState.message && (
            <p className={verifyState.error ? 'rental-error' : 'rental-message'} role="status">
              {verifyState.message}
            </p>
          )}
        </form>
      )}
      <small>Chỉ bật khi Supabase Auth và nhà cung cấp SMS đã được cấu hình.</small>
    </section>
  )
}
