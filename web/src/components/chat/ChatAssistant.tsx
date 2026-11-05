'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import ChatLauncher from '@/components/layout/ChatLauncher'
import ChatWidget from './ChatWidget'
import type { View } from '@/types'

const nextPath: Record<View, string> = {
  home: '/',
  products: '/san-pham',
  detail: '/san-pham',
  cart: '/gio-thue',
  checkout: '/gio-thue',
  success: '/don-thue',
  orders: '/don-thue',
  account: '/tai-khoan',
}

/** Khu quản trị dùng giao diện riêng nên không hiển thị trợ lý của khách hàng. */
function isAdminArea(pathname: string | null) {
  if (!pathname) return false
  return (
    pathname === '/admin' ||
    pathname.startsWith('/admin/') ||
    pathname === '/quan-ly-don' ||
    pathname.startsWith('/quan-ly-don/') ||
    pathname === '/quan-ly-giay-to' ||
    pathname.startsWith('/quan-ly-giay-to/')
  )
}

export default function ChatAssistant({
  llmEnabled = false,
  offlineFaq = false,
}: {
  llmEnabled?: boolean
  offlineFaq?: boolean
}) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  if (isAdminArea(pathname)) return null
  return (
    <>
      {!open && <ChatLauncher onOpen={() => setOpen(true)} />}
      <ChatWidget
        open={open}
        onClose={() => setOpen(false)}
        seed={null}
        onNavigate={(view) => router.push(nextPath[view])}
        llmEnabled={llmEnabled}
        offlineFaq={offlineFaq}
      />
    </>
  )
}
