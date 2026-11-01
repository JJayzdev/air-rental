'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { ownProfileSchema } from './profile-schema.ts'
import { customerAddressSchema } from './address-schema.ts'
import { requireVerifiedUser } from '@/lib/supabase/auth'

export async function updateOwnProfile(formData: FormData): Promise<never> {
  const parsed = ownProfileSchema.safeParse({
    fullName: formData.get('fullName'),
    phone: formData.get('phone'),
  })
  if (!parsed.success) redirect('/tai-khoan?profile=invalid')
  const { supabase, user } = await requireVerifiedUser('/tai-khoan')
  const { error } = await supabase
    .from('profiles')
    .update({ full_name: parsed.data.fullName, phone: parsed.data.phone })
    .eq('id', user.id)
    .select('id')
    .single()
  if (error) redirect('/tai-khoan?profile=failed')
  revalidatePath('/tai-khoan')
  redirect('/tai-khoan?profile=saved')
}

export async function saveOwnAddress(formData: FormData): Promise<never> {
  const parsed = customerAddressSchema.safeParse({
    addressId: formData.get('addressId'),
    label: formData.get('label'),
    recipientName: formData.get('recipientName'),
    phone: formData.get('phone'),
    addressLine: formData.get('addressLine'),
    ward: formData.get('ward'),
    district: formData.get('district'),
    province: formData.get('province'),
    isDefault: formData.get('isDefault'),
  })
  if (!parsed.success) redirect('/tai-khoan/dia-chi?address=invalid')
  const { supabase } = await requireVerifiedUser('/tai-khoan/dia-chi')
  const { addressId, ...address } = parsed.data
  const { error } = await supabase.rpc('save_customer_address', {
    p_address_id: addressId,
    p_label: address.label,
    p_recipient_name: address.recipientName,
    p_phone: address.phone,
    p_address_line: address.addressLine,
    p_ward: address.ward,
    p_district: address.district,
    p_province: address.province,
    p_is_default: address.isDefault,
  })
  if (error) redirect('/tai-khoan/dia-chi?address=failed')
  revalidatePath('/tai-khoan/dia-chi')
  revalidatePath('/checkout')
  redirect('/tai-khoan/dia-chi?address=saved')
}

export async function deleteOwnAddress(formData: FormData): Promise<never> {
  const addressId = z.string().uuid().safeParse(formData.get('addressId'))
  if (!addressId.success) redirect('/tai-khoan/dia-chi?address=invalid')
  const { supabase } = await requireVerifiedUser('/tai-khoan/dia-chi')
  const { error } = await supabase.rpc('delete_customer_address', { p_address_id: addressId.data })
  if (error) redirect('/tai-khoan/dia-chi?address=failed')
  revalidatePath('/tai-khoan/dia-chi')
  revalidatePath('/checkout')
  redirect('/tai-khoan/dia-chi?address=deleted')
}
