import { useState } from 'react'
import { User } from '../components/ui/Icons.jsx'

export default function AccountPage({
  user,
  favoritesCount,
  onLogin,
  onLogout,
  onOrders,
  onBrowse,
}) {
  const [contact, setContact] = useState('')
  const [error, setError] = useState('')

  const submit = (event) => {
    event.preventDefault()
    if (!contact.trim()) {
      setError('Vui lòng nhập số điện thoại hoặc email')
      return
    }
    setError('')
    onLogin(contact.trim())
  }

  if (user) {
    return (
      <main>
        <section className="section shell page-section">
          <div className="account-card">
            <div className="account-avatar">
              <User size={34} />
            </div>
            <span className="eyebrow">Tài khoản demo</span>
            <h1>Xin chào, {user.contact}</h1>
            <p>
              Bạn đang ở phiên demo. Đơn thuê và thiết bị yêu thích được lưu trên trình duyệt này.
            </p>
            <p>
              <b>{favoritesCount}</b> thiết bị yêu thích
            </p>

            <button className="primary full" onClick={onOrders}>
              Đơn thuê của tôi
            </button>
            <button className="secondary full" onClick={onBrowse}>
              Tiếp tục thuê thiết bị
            </button>
            <button className="secondary full" onClick={onLogout}>
              Đăng xuất
            </button>

            <small>Không lưu mật khẩu, không gửi dữ liệu ra ngoài trình duyệt.</small>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main>
      <section className="section shell page-section">
        <div className="account-card">
          <div className="account-avatar">
            <User size={34} />
          </div>
          <span className="eyebrow">Tài khoản demo</span>
          <h1>Chào mừng đến A.I.R</h1>
          <p>Đăng nhập demo để quản lý hồ sơ, đơn thuê và thiết bị yêu thích.</p>

          <form onSubmit={submit} noValidate>
            <label className="field">
              <span>Số điện thoại hoặc email</span>
              <input
                placeholder="you@example.com"
                value={contact}
                autoComplete="username"
                onChange={(e) => setContact(e.target.value)}
              />
              {error && <small>{error}</small>}
            </label>

            <button className="primary full" type="submit">
              Tiếp tục với tài khoản demo
            </button>
          </form>

          <small>Không yêu cầu mật khẩu hoặc lưu thông tin cá nhân.</small>
        </div>
      </section>
    </main>
  )
}
