import { useState } from 'react'
import { BrandMark, Search, User, Cart } from '../ui/Icons.jsx'

export default function Header({ cartCount, user, onNavigate, onSearch }) {
  const [term, setTerm] = useState('')

  const submit = (event) => {
    event.preventDefault()
    onSearch(term)
  }

  const searchInput = (
    <label className="header-search">
      <Search />
      <input
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit(e)
        }}
        placeholder="Bạn muốn thuê thiết bị nào?"
        aria-label="Tìm thiết bị"
      />
    </label>
  )

  return (
    <header className="header">
      <div className="shell header-inner">
        <button
          className="plain logo-button"
          aria-label="Về trang chủ"
          onClick={() => onNavigate('home')}
        >
          <div className="brand">
            <span className="brand-mark">
              <BrandMark />
            </span>
            <strong>A.I.R</strong>
          </div>
        </button>

        <nav className="desktop-nav" aria-label="Điều hướng chính">
          <button onClick={() => onNavigate('home')}>Trang chủ</button>
          <button onClick={() => onNavigate('products')}>Sản phẩm</button>
          <button onClick={() => onNavigate('home', { anchor: 'how' })}>Cách thức thuê</button>
          <button onClick={() => onNavigate('home', { anchor: 'about' })}>Về chúng tôi</button>
        </nav>

        {searchInput}

        <button
          className="icon-button"
          aria-label="Tài khoản"
          onClick={() => onNavigate('account')}
        >
          <User />
        </button>

        <button
          className="icon-button cart-icon"
          aria-label="Giỏ thuê"
          onClick={() => onNavigate('cart')}
        >
          <Cart />
          {cartCount > 0 && <span>{cartCount}</span>}
        </button>

        {!user && (
          <button className="login desktop-only" onClick={() => onNavigate('account')}>
            Đăng nhập
          </button>
        )}
      </div>

      <div className="mobile-search shell">{searchInput}</div>
    </header>
  )
}
