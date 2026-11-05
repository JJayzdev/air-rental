import Link from 'next/link'
import { BrandMark, Cart, Search, User } from '@/components/ui/Icons'
import { AccountMenu } from '@/components/layout/account-menu'
import { CartBadge } from '@/components/layout/cart-badge'
import { getVerifiedAppRole } from '@/lib/supabase/auth'
import { supabaseIsConfigured } from '@/lib/supabase/server'

export type SiteSection =
  'home' | 'products' | 'guides' | 'policies' | 'cart' | 'orders' | 'account'

const PRIMARY_LINKS: Array<{ href: string; label: string; section: SiteSection }> = [
  { href: '/', label: 'Trang chủ', section: 'home' },
  { href: '/san-pham', label: 'Sản phẩm', section: 'products' },
  { href: '/huong-dan', label: 'Cách thức thuê', section: 'guides' },
  { href: '/chinh-sach', label: 'Chính sách', section: 'policies' },
]

function SearchForm() {
  return (
    <form action="/san-pham" method="get" role="search" className="header-search-form">
      <label className="header-search">
        <Search />
        <input
          type="search"
          name="q"
          placeholder="Bạn muốn thuê thiết bị nào?"
          aria-label="Tìm thiết bị"
          maxLength={80}
        />
      </label>
    </form>
  )
}

export async function SiteHeader({ active }: { active?: SiteSection }) {
  const session = supabaseIsConfigured()
    ? await getVerifiedAppRole().catch(() => ({ user: null, role: null }))
    : { user: null, role: null }
  const { user, role } = session

  return (
    <header className="header site-header">
      <div className="shell header-inner site-header-inner">
        <Link className="plain logo-button" href="/" aria-label="A.I.R — trang chủ">
          <span className="brand">
            <span className="brand-mark">
              <BrandMark />
            </span>
            <strong>A.I.R</strong>
          </span>
        </Link>

        <nav className="desktop-nav catalog-site-nav site-nav" aria-label="Điều hướng chính">
          {PRIMARY_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active === link.section ? 'page' : undefined}
            >
              {link.label}
            </Link>
          ))}
          {user && (
            <>
              <Link href="/don-thue" aria-current={active === 'orders' ? 'page' : undefined}>
                Đơn của tôi
              </Link>
              {role === 'partner' && <Link href="/partner">Đối tác</Link>}
            </>
          )}
        </nav>

        <SearchForm />

        <div className="site-header-actions">
          {!user && (
            <Link
              className="icon-button"
              href="/tai-khoan"
              aria-label="Tài khoản"
              aria-current={active === 'account' ? 'page' : undefined}
            >
              <User />
            </Link>
          )}
          <Link
            className="icon-button cart-icon"
            href="/gio-thue"
            aria-label="Giỏ thuê"
            aria-current={active === 'cart' ? 'page' : undefined}
          >
            <Cart />
            <CartBadge />
          </Link>
          {user ? (
            <AccountMenu
              email={user.email ?? ''}
              name={
                typeof user.user_metadata?.full_name === 'string'
                  ? user.user_metadata.full_name
                  : ''
              }
              role={role}
            />
          ) : (
            <Link className="login desktop-only" href="/dang-nhap">
              Đăng nhập
            </Link>
          )}
        </div>
      </div>

      <div className="mobile-search shell">
        <SearchForm />
      </div>
    </header>
  )
}
