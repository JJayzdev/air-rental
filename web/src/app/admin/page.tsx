import { redirect } from 'next/navigation'
import { getVerifiedAppRole } from '@/lib/supabase/auth'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { robots: { index: false, follow: false } }

export default async function AdminIndexPage() {
  const { user, role } = await getVerifiedAppRole()
  if (!user) redirect('/dang-nhap?next=%2Fadmin')
  if (role !== 'staff' && role !== 'admin') redirect('/don-thue')
  redirect('/quan-ly-don')
}
