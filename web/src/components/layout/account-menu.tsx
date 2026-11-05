'use client'

import Link from 'next/link'
import { useState } from 'react'
import { signOut } from '@/features/auth/actions'

interface AccountMenuProps {
  email: string
  name: string
  role: string | null
}

export function AccountMenu({ email, name, role }: AccountMenuProps) {
  const [open, setOpen] = useState(false)
  const displayName = name.trim() || email
  const initial = displayName.charAt(0).toUpperCase() || '?'
  const isAdmin = role === 'admin' || role === 'staff' || role === 'partner'

  return (
    <div className="account-menu">
      <button
        aria-expanded={open}
        aria-label="Tài khoản"
        className="account-avatar"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        {initial}
      </button>
      {open && (
        <div className="account-dropdown">
          <div className="account-dropdown-head">
            <strong>{displayName}</strong>
            <small>{email}</small>
          </div>
          <Link href="/tai-khoan" onClick={() => setOpen(false)}>
            Tài khoản của tôi
          </Link>
          {isAdmin && (
            <Link href="/admin" onClick={() => setOpen(false)}>
              Bảng điều khiển
            </Link>
          )}
          <form action={signOut}>
            <button type="submit">Đăng xuất</button>
          </form>
        </div>
      )}
    </div>
  )
}
