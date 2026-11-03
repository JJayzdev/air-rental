'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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

export default function ChatAssistant({
  llmEnabled = false,
  offlineFaq = false,
}: {
  llmEnabled?: boolean
  offlineFaq?: boolean
}) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
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
