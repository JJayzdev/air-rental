import { redirect } from 'next/navigation'
import { AdminShell } from '@/components/layout/admin-shell'
import { getVerifiedAppRole } from '@/lib/supabase/auth'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: { default: 'Quản trị', template: '%s | A.I.R Admin' },
  robots: { index: false, follow: false },
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, role } = await getVerifiedAppRole()
  if (!user) redirect('/dang-nhap?next=%2Fadmin')
  if (role !== 'staff' && role !== 'admin') redirect('/don-thue')
  const metadataName = user.user_metadata?.full_name
  return (
    <AdminShell
      email={user.email ?? ''}
      name={typeof metadataName === 'string' ? metadataName : ''}
      role={role}
    >
      {children}
    </AdminShell>
  )
}
