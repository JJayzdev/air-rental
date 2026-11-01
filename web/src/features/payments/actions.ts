'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { getVerifiedAppRole } from '@/lib/supabase/auth'

/**
 * Staff confirms that the deposit has actually been returned to the customer. The transfer itself
 * happens outside the app; this only settles the ledger row the completion trigger created.
 */
export async function completeDepositRefund(formData: FormData): Promise<never> {
  const paymentId = z.string().uuid().safeParse(formData.get('paymentId'))
  if (!paymentId.success) redirect('/quan-ly-don?refund=invalid')
  const { supabase, user, role } = await getVerifiedAppRole().catch(() => ({
    supabase: null,
    user: null,
    role: null,
  }))
  if (!user || !supabase || (role !== 'staff' && role !== 'admin'))
    redirect('/dang-nhap?next=%2Fquan-ly-don')
  const { error } = await supabase.rpc('complete_deposit_refund', {
    p_payment_id: paymentId.data,
  })
  revalidatePath('/quan-ly-don')
  revalidatePath('/don-thue')
  if (error) redirect('/quan-ly-don?refund=failed')
  redirect('/quan-ly-don?refund=paid')
}
