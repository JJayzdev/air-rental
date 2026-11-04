import { SiteFooter } from '@/components/layout/site-footer'
import { SiteHeader } from '@/components/layout/site-header'

export default function GuideLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader active="guides" />
      {children}
      <SiteFooter />
    </>
  )
}
