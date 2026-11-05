import { SiteFooter } from '@/components/layout/site-footer'
import { SiteHeader } from '@/components/layout/site-header'
import type { Metadata } from 'next'

export const metadata: Metadata = { robots: { index: false, follow: false } }

export default function RentalLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      {children}
      <SiteFooter />
    </>
  )
}
