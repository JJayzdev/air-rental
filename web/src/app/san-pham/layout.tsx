import ChatAssistant from '@/components/chat/ChatAssistant'
import { getChatConfiguration } from '@/lib/chat-config'
import { SiteFooter } from '@/components/layout/site-footer'
import { SiteHeader } from '@/components/layout/site-header'

export default function CatalogLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader active="products" />
      {children}
      <ChatAssistant {...getChatConfiguration()} />
      <SiteFooter />
    </>
  )
}
