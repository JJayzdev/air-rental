'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { BrandMark } from '@/components/ui/Icons'
import { signOut } from '@/features/auth/actions'

type AdminRole = 'admin' | 'staff'
type IconName =
  | 'dashboard'
  | 'orders'
  | 'documents'
  | 'products'
  | 'warehouse'
  | 'maintenance'
  | 'discount'
  | 'zones'
  | 'audit'
  | 'partner'

interface NavItem {
  href: string
  label: string
  icon: IconName
  adminOnly?: boolean
}

const NAV_GROUPS: Array<{ label: string; items: NavItem[] }> = [
  {
    label: 'Bán hàng',
    items: [
      { href: '/admin', label: 'Tổng quan', icon: 'dashboard' },
      { href: '/quan-ly-don', label: 'Đơn thuê', icon: 'orders' },
      { href: '/quan-ly-giay-to', label: 'Giấy tờ', icon: 'documents' },
    ],
  },
  {
    label: 'Kho và giá',
    items: [
      { href: '/admin/san-pham', label: 'Sản phẩm', icon: 'products', adminOnly: true },
      { href: '/admin/kho', label: 'Kho thiết bị', icon: 'warehouse', adminOnly: true },
      { href: '/admin/bao-tri', label: 'Bảo trì', icon: 'maintenance' },
      { href: '/admin/ma-giam-gia', label: 'Mã giảm giá', icon: 'discount', adminOnly: true },
      { href: '/admin/khu-vuc-giao', label: 'Khu vực giao', icon: 'zones', adminOnly: true },
      { href: '/admin/doi-tac', label: 'Đối tác', icon: 'partner', adminOnly: true },
    ],
  },
  {
    label: 'Hệ thống',
    items: [{ href: '/admin/nhat-ky', label: 'Nhật ký hoạt động', icon: 'audit' }],
  },
]

function isActive(pathname: string, href: string) {
  if (href === '/admin') return pathname === '/admin'
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function AdminShell({
  role,
  name,
  email,
  children,
}: {
  role: AdminRole
  name: string
  email: string
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isAdmin = role === 'admin'
  const displayName = name.trim() || email
  const initial = displayName.charAt(0).toUpperCase()
  const [accountOpen, setAccountOpen] = useState(false)

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Link className="admin-brand" href="/admin" aria-label="A.I.R Admin — tổng quan">
          <span className="admin-brand-mark">
            <BrandMark />
          </span>
          <span>
            <strong>A.I.R</strong>
            <small>Quản trị</small>
          </span>
        </Link>

        <div className="admin-profile-wrap">
          <button
            aria-expanded={accountOpen}
            className="admin-profile"
            onClick={() => setAccountOpen((value) => !value)}
            type="button"
          >
            <span className="admin-avatar" aria-hidden>
              {initial}
            </span>
            <div>
              <strong>{displayName}</strong>
              <small>{isAdmin ? 'Quản trị viên' : 'Nhân viên'}</small>
            </div>
          </button>
          {accountOpen && (
            <div className="admin-account-menu">
              <Link href="/admin" onClick={() => setAccountOpen(false)}>
                Bảng điều khiển
              </Link>
              <Link href="/tai-khoan" onClick={() => setAccountOpen(false)}>
                Tài khoản của tôi
              </Link>
              <form action={signOut}>
                <button type="submit">Đăng xuất</button>
              </form>
            </div>
          )}
        </div>

        <nav className="admin-nav" aria-label="Điều hướng quản trị">
          {NAV_GROUPS.map((group) => {
            const items = group.items.filter((item) => !item.adminOnly || isAdmin)
            if (items.length === 0) return null
            return (
              <div className="admin-nav-group" key={group.label}>
                <p className="admin-nav-label">{group.label}</p>
                {items.map((item) => (
                  <Link
                    className="admin-nav-link"
                    href={item.href}
                    key={item.href}
                    aria-current={isActive(pathname, item.href) ? 'page' : undefined}
                  >
                    <AdminNavIcon name={item.icon} />
                    <span>{item.label}</span>
                  </Link>
                ))}
              </div>
            )
          })}
        </nav>

        <div className="admin-sidebar-foot">
          <Link className="admin-store-link" href="/">
            <AdminNavIcon name="external" />
            <span>Về trang khách</span>
          </Link>
          <form action={signOut}>
            <button type="submit">Đăng xuất</button>
          </form>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <div className="admin-topbar-title">
            <span>Khu quản trị</span>
            <strong>A.I.R Rental</strong>
          </div>
          <div className="admin-topbar-actions">
            <Link href="/">Trang khách</Link>
            <form action={signOut}>
              <button type="submit">Đăng xuất</button>
            </form>
          </div>
        </header>
        <div className="admin-content">{children}</div>
      </div>
    </div>
  )
}

function AdminNavIcon({ name }: { name: IconName | 'external' }) {
  return (
    <svg
      aria-hidden
      className="admin-nav-icon"
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
      {name === 'orders' && (
        <>
          <path d="M6 3h9l3 3v15H6z" />
          <path d="M9 10h6M9 14h6M9 18h4" />
        </>
      )}
      {name === 'documents' && (
        <>
          <rect x="5" y="3" width="14" height="18" rx="2" />
          <path d="M9 8h6M9 12h6M9 16h3" />
        </>
      )}
      {name === 'products' && (
        <>
          <path d="M12 3 3 8l9 5 9-5-9-5Z" />
          <path d="M3 8v8l9 5 9-5V8" />
        </>
      )}
      {name === 'warehouse' && (
        <>
          <path d="M3 21V8l9-5 9 5v13" />
          <path d="M8 21v-7h8v7" />
        </>
      )}
      {name === 'maintenance' && (
        <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.3 2.3-2-2 2.3-2.3Z" />
      )}
      {name === 'discount' && (
        <>
          <path d="M20 12 12 20 4 12V4h8l8 8Z" />
          <circle cx="8.5" cy="8.5" r="1.2" />
        </>
      )}
      {name === 'zones' && (
        <>
          <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z" />
          <circle cx="12" cy="10" r="2.5" />
        </>
      )}
      {name === 'audit' && (
        <>
          <path d="M3 12a9 9 0 1 0 3-6.7" />
          <path d="M3 4v5h5" />
          <path d="M12 8v4l3 2" />
        </>
      )}
      {name === 'partner' && (
        <>
          <path d="M19 21V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v16" />
          <polyline points="17 21 17 14 7 14 7 21" />
          <polyline points="7 9 3 9 3 15" />
          <line x1="7" y1="9" x2="7" y2="15" />
        </>
      )}
      {name === 'external' && (
        <>
          <path d="M14 4h6v6" />
          <path d="M20 4 10 14" />
          <path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
        </>
      )}
    </svg>
  )
}
