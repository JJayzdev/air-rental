'use client'

import Link from 'next/link'
import { useActionState, useState } from 'react'
import { requestEmailOtp, verifyEmailOtp, type EmailOtpActionState } from '@/features/auth/actions'
import { PhoneOtpForm } from './phone-otp-form'

const initialState: EmailOtpActionState = { message: '' }

export function LoginForm({
  next,
  phoneOtpEnabled = false,
}: {
  next: string
  phoneOtpEnabled?: boolean
}) {
  // "Đổi email" trỏ về đúng URL đang mở nên Next giữ nguyên state; đổi key để làm mới form.
  const [attempt, setAttempt] = useState(0)
  return (
    <EmailOtpFlow
      key={attempt}
      next={next}
      phoneOtpEnabled={phoneOtpEnabled}
      onChangeEmail={() => setAttempt((value) => value + 1)}
    />
  )
}

function EmailOtpFlow({
  next,
  phoneOtpEnabled,
  onChangeEmail,
}: {
  next: string
  phoneOtpEnabled: boolean
  onChangeEmail: () => void
}) {
  const [sendState, sendAction, sending] = useActionState(requestEmailOtp, initialState)
  const [verifyState, verifyAction, verifying] = useActionState(verifyEmailOtp, initialState)
  // Nhớ email đã gửi mã thành công: nếu "Gửi lại mã" bị từ chối (ví dụ phải chờ 60 giây), khách
  // vẫn ở bước nhập mã và dùng được mã đã nhận thay vì bị đưa về bước nhập email.
  const [sentEmail, setSentEmail] = useState<string | null>(null)
  const [seenState, setSeenState] = useState(sendState)
  if (seenState !== sendState) {
    setSeenState(sendState)
    if (sendState.sent && sendState.email) setSentEmail(sendState.email)
  }
  const nextQuery = next ? `?next=${encodeURIComponent(next)}` : ''

  if (!sentEmail) {
    return (
      <>
        <form className="rental-form" action={sendAction}>
          <input type="hidden" name="next" value={next} />
          <label htmlFor="login-email">Email</label>
          <input
            id="login-email"
            type="email"
            name="email"
            autoComplete="email"
            placeholder="ban@example.com"
            required
            maxLength={254}
          />
          <button className="primary" type="submit" disabled={sending}>
            {sending ? 'Đang gửi mã…' : 'Gửi mã OTP'}
          </button>
          {sendState.message && (
            <p aria-live="polite" className={sendState.error ? 'rental-error' : 'rental-message'}>
              {sendState.message}
            </p>
          )}
        </form>
        <p className="rental-auth-switch">
          Chưa có tài khoản? <Link href={`/dang-ky${nextQuery}`}>Đăng ký ngay</Link>
        </p>
        {phoneOtpEnabled && <PhoneOtpForm next={next} />}
      </>
    )
  }

  return (
    <>
      <div className="rental-otp-status">
        <p>
          Đã gửi mã OTP tới <strong>{sentEmail}</strong>.
        </p>
        <p>
          Mở email <strong>Mã đăng nhập A.I.R</strong>, sau đó nhập mã gồm 6 chữ số bên dưới. Mã có
          hiệu lực trong 60 phút.
        </p>
      </div>
      <form className="rental-form" action={verifyAction}>
        <input type="hidden" name="email" value={sentEmail} />
        <input type="hidden" name="next" value={next} />
        <label htmlFor="login-otp">Mã OTP</label>
        <input
          id="login-otp"
          type="text"
          name="token"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          placeholder="123456"
          required
          minLength={6}
          maxLength={6}
        />
        <button className="primary" type="submit" disabled={verifying}>
          {verifying ? 'Đang xác minh…' : 'Đăng nhập'}
        </button>
        {verifyState.message && (
          <p aria-live="polite" className={verifyState.error ? 'rental-error' : 'rental-message'}>
            {verifyState.message}
          </p>
        )}
      </form>
      <div className="rental-otp-actions">
        <form action={sendAction}>
          <input type="hidden" name="email" value={sentEmail} />
          <input type="hidden" name="next" value={next} />
          <button className="rental-link-button" type="submit" disabled={sending}>
            {sending ? 'Đang gửi lại…' : 'Gửi lại mã'}
          </button>
        </form>
        <button className="rental-link-button" type="button" onClick={onChangeEmail}>
          Đổi email
        </button>
      </div>
      {sendState.message && (
        <p aria-live="polite" className={sendState.error ? 'rental-error' : 'rental-message'}>
          {sendState.message}
        </p>
      )}
      {phoneOtpEnabled && <PhoneOtpForm next={next} />}
    </>
  )
}
