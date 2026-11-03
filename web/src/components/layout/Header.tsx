import { useState } from 'react'
import Link from 'next/link'
import { BrandMark, Search, User, Cart } from '../ui/Icons'
import type { NavOptions, User as AppUser, View } from '@/types'

interface HeaderProps {
  cartCount: number
  user: AppUser | null
  onNavigate: (view: View, options?: NavOptions) => void
  onSearch: (term: string) => void
}

export default function Header({ cartCount, user, onNavigate, onSearch }: HeaderProps) {
  const [term, setTerm] = useState('')

  const submit = (event: { preventDefault: () => void }) => {
    event.preventDefault()
    onSearch(term)
  }

  const searchInput = (
    <label className="header-search">
      <Search />
      <input
        value={term}
        onChange={(event) => setTerm(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') submit(event)
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
          <Link href="/" aria-label="Giới thiệu đồ án">
            Giới thiệu
          </Link>
          <Link href="/san-pham">Sản phẩm</Link>
          <Link href="/huong-dan">Hướng dẫn</Link>
          <Link href="/chinh-sach">Kịch bản</Link>
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
