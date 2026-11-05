'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { BrandMark } from '@/components/ui/Icons'
import { signOut } from '@/features/auth/actions'

interface NavItem {
  href: string
  label: string
  icon: 'dashboard' | 'products' | 'orders' | 'earnings'
}

const NAV_ITEMS: NavItem[] = [
  { href: '/partner', label: 'Tổng quan', icon: 'dashboard' },
  { href: '/partner/san-pham', label: 'Sản phẩm của tôi', icon: 'products' },
  { href: '/partner/don-thue', label: 'Đơn thuê', icon: 'orders' },
  { href: '/partner/doanh-thu', label: 'Doanh thu', icon: 'earnings' },
]

function isActive(pathname: string, href: string) {
  if (href === '/partner') return pathname === '/partner'
  return pathname === href || pathname.startsWith(`${href}/`)
}

function PartnerNavIcon({ name }: { name: NavItem['icon'] }) {
  return (
    <svg
      aria-hidden
      className="partner-nav-icon"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      viewBox="0 0 24 24"
    >
      {name === 'dashboard' && (
        <>
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </>
      )}
      {name === 'products' && (
        <>
          <path d="M12 3 3 8l9 5 9-5-9-5Z" />
          <path d="M3 8v8l9 5 9-5V8" />
        </>
      )}
      {name === 'orders' && (
        <>
          <path d="M6 3h9l3 3v15H6z" />
          <path d="M9 10h6M9 14h6M9 18h4" />
        </>
      )}
      {name === 'earnings' && (
        <>
          <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20" />
          <path d="M12 12v4M12 16h.01M7 12h4.01M17 12h4.01" />
        </>
      )}
    </svg>
  )
}

export function PartnerShell({
  name,
  email,
  children,
}: {
  name: string
  email: string
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const displayName = name.trim() || email
  const initial = displayName.charAt(0).toUpperCase()
  const [accountOpen, setAccountOpen] = useState(false)

  return (
    <div className="partner-shell">
      <aside className="partner-sidebar">
        <Link className="partner-brand" href="/partner" aria-label="A.I.R Partner — tổng quan">
          <span className="partner-brand-mark">
            <BrandMark />
          </span>
          <span>
            <strong>A.I.R</strong>
            <small>Đối tác</small>
          </span>
        </Link>

        <div className="partner-profile-wrap">
          <button
            aria-expanded={accountOpen}
            className="partner-profile"
            onClick={() => setAccountOpen((value) => !value)}
            type="button"
          >
            <span className="partner-avatar" aria-hidden>
              {initial}
            </span>
            <div>
              <strong>{displayName}</strong>
              <small>Đối tác</small>
            </div>
          </button>
          {accountOpen && (
            <div className="partner-account-menu">
              <Link href="/tai-khoan" onClick={() => setAccountOpen(false)}>
                Tài khoản của tôi
              </Link>
              <form action={signOut}>
                <button type="submit">Đăng xuất</button>
              </form>
            </div>
          )}
        </div>

        <nav className="partner-nav" aria-label="Điều hướng đối tác">
          {NAV_ITEMS.map((item) => (
            <Link
              className="partner-nav-link"
              href={item.href}
              key={item.href}
              aria-current={isActive(pathname, item.href) ? 'page' : undefined}
            >
              <PartnerNavIcon name={item.icon} />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="partner-sidebar-foot">
          <Link className="partner-store-link" href="/">
            Về trang khách
          </Link>
        </div>
      </aside>

      <div className="partner-main">
        <header className="partner-topbar">
          <div className="partner-topbar-title">
            <span>Khu đối tác</span>
            <strong>A.I.R Rental</strong>
          </div>
          <div className="partner-topbar-actions">
            <Link href="/">Trang khách</Link>
            <form action={signOut}>
              <button type="submit">Đăng xuất</button>
            </form>
          </div>
        </header>
        <div className="partner-content">{children}</div>
      </div>
    </div>
  )
}
