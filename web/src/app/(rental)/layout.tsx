import ChatAssistant from '@/components/chat/ChatAssistant'
import { SiteFooter } from '@/components/layout/site-footer'
import { SiteHeader } from '@/components/layout/site-header'
import { getChatConfiguration } from '@/lib/chat-config'
import type { Metadata } from 'next'

export const metadata: Metadata = { robots: { index: false, follow: false } }

export default function RentalLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      {children}
      <ChatAssistant {...getChatConfiguration()} />
      <SiteFooter />
    </>
  )
}
