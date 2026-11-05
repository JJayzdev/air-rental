import { redirect } from 'next/navigation'
import { PartnerShell } from '@/components/layout/partner-shell'
import { getVerifiedAppRole } from '@/lib/supabase/auth'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: { default: 'Đối tác', template: '%s | A.I.R Partner' },
  robots: { index: false, follow: false },
}

export default async function PartnerLayout({ children }: { children: React.ReactNode }) {
  const { user, role } = await getVerifiedAppRole()
  if (!user) redirect('/dang-nhap?next=%2Fpartner')
  if (role !== 'partner') redirect('/don-thue')
  const metadataName = user.user_metadata?.full_name
  return (
    <PartnerShell
      email={user.email ?? ''}
      name={typeof metadataName === 'string' ? metadataName : ''}
    >
      {children}
    </PartnerShell>
  )
}
