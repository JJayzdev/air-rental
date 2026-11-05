/* eslint-disable @typescript-eslint/no-explicit-any */
'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import {
  adminDeliveryZoneSchema,
  adminDiscountCodeSchema,
  adminProductSchema,
  adminUnitSchema,
  adminUnitStateSchema,
  closeMaintenanceSchema,
  maintenanceSchema,
} from './admin-schema.ts'
import { getVerifiedAppRole } from '@/lib/supabase/auth'
function valueOf(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === 'string' ? value : ''
}

function parseAdminProductImages(value: string): string[] {
  const urls = value
    .split(/[\r\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean)
  const result = urls.length > 0 ? urls : ['/images/catalog-placeholder.svg']
  for (const url of result) {
    if (url.startsWith('/images/') && !url.includes('..')) continue
    let parsedUrl: URL
    try {
      parsedUrl = new URL(url)
    } catch {
      throw new Error('invalid image url')
    }
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      throw new Error('invalid image url')
    }
  }
  return result
}

async function requireRole(roles: Array<'staff' | 'admin'>, next: string) {
  const result = await getVerifiedAppRole().catch(() => ({
    supabase: null,
    user: null,
    role: null,
  }))
  if (!result.user || !result.supabase) redirect(`/dang-nhap?next=${encodeURIComponent(next)}`)
  const role = result.role
  const allowed = role === 'staff' || role === 'admin' ? roles.includes(role) : false
  return { supabase: result.supabase, user: result.user, role: allowed ? role : null }
}

function refreshCatalog(path: string) {
  revalidateTag('catalog')
  revalidatePath('/admin')
  revalidatePath(path)
  revalidatePath('/san-pham')
  revalidatePath('/admin/san-pham')
  revalidatePath('/admin/kho')
}

export async function saveAdminProduct(formData: FormData): Promise<never> {
  const parsed = adminProductSchema.safeParse({
    productId: valueOf(formData, 'productId'),
    categoryId: valueOf(formData, 'categoryId'),
    slug: valueOf(formData, 'slug'),
    name: valueOf(formData, 'name'),
    description: valueOf(formData, 'description'),
    imageUrls: valueOf(formData, 'imageUrls'),
    pricePerDayVnd: valueOf(formData, 'pricePerDayVnd'),
    depositVnd: valueOf(formData, 'depositVnd'),
    state: valueOf(formData, 'state'),
  })
  const { supabase, user, role } = await requireRole(['admin'], '/admin/san-pham')
  if (!user || !supabase) redirect('/dang-nhap?next=%2Fadmin%2Fsan-pham')
  if (!role) redirect('/admin?denied=admin')
  if (!parsed.success) redirect('/admin/san-pham?product=invalid')

  let imageUrls: string[]
  try {
    imageUrls = parseAdminProductImages(parsed.data.imageUrls)
  } catch {
    redirect('/admin/san-pham?product=invalid')
  }

  const payload = {
    category_id: parsed.data.categoryId,
    slug: parsed.data.slug,
    name: parsed.data.name,
    description: parsed.data.description,
    image_urls: imageUrls,
    price_per_day_vnd: parsed.data.pricePerDayVnd,
    deposit_vnd: parsed.data.depositVnd,
    state: parsed.data.state,
  }
  const { error } = parsed.data.productId
    ? await supabase.from('products').update(payload).eq('id', parsed.data.productId)
    : await supabase.from('products').insert(payload)
  refreshCatalog('/admin/san-pham')
  if (error) redirect('/admin/san-pham?product=failed')
  redirect('/admin/san-pham?product=saved')
}

export async function addAdminUnit(formData: FormData): Promise<never> {
  const parsed = adminUnitSchema.safeParse({
    productId: valueOf(formData, 'productId'),
    assetTag: valueOf(formData, 'assetTag'),
    readyOn: valueOf(formData, 'readyOn'),
  })
  const { supabase, user, role } = await requireRole(['admin'], '/admin/kho')
  if (!user || !supabase) redirect('/dang-nhap?next=%2Fadmin%2Fkho')
  if (!role) redirect('/admin?denied=admin')
  if (!parsed.success) redirect('/admin/kho?unit=invalid')

  const { error } = await supabase.from('product_units').insert({
    product_id: parsed.data.productId,
    asset_tag: parsed.data.assetTag,
    ready_on: parsed.data.readyOn,
  })
  if (!error) refreshCatalog('/admin/kho')
  if (error) redirect('/admin/kho?unit=failed')
  redirect('/admin/kho?unit=added')
}

/**
 * Only the safe manual transitions are exposed here. Moving a unit into maintenance always goes
 * through open_unit_maintenance so a live reservation can never lose its machine.
 */
export async function updateAdminUnitState(formData: FormData): Promise<never> {
  const parsed = adminUnitStateSchema.safeParse({
    unitId: valueOf(formData, 'unitId'),
    state: valueOf(formData, 'state'),
  })
  const { supabase, user, role } = await requireRole(['admin'], '/admin/kho')
  if (!user || !supabase) redirect('/dang-nhap?next=%2Fadmin%2Fkho')
  if (!role) redirect('/admin?denied=admin')
  if (!parsed.success) redirect('/admin/kho?unit=invalid')

  const { error } = await supabase
    .from('product_units')
    .update({ state: parsed.data.state })
    .eq('id', parsed.data.unitId)
  if (!error) refreshCatalog('/admin/kho')
  if (error) redirect('/admin/kho?unit=failed')
  redirect('/admin/kho?unit=updated')
}

export async function openMaintenance(formData: FormData): Promise<never> {
  const parsed = maintenanceSchema.safeParse({
    unitId: valueOf(formData, 'unitId'),
    reason: valueOf(formData, 'reason'),
    expectedEndOn: valueOf(formData, 'expectedEndOn'),
    notes: valueOf(formData, 'notes'),
  })
  const { supabase, user, role } = await requireRole(['staff', 'admin'], '/admin/bao-tri')
  if (!user || !supabase) redirect('/dang-nhap?next=%2Fadmin%2Fbao-tri')
  if (!role) redirect('/admin?denied=maintenance')
  if (!parsed.success) redirect('/admin/bao-tri?maintenance=invalid')

  const { error } = await supabase.rpc('open_unit_maintenance', {
    p_unit_id: parsed.data.unitId,
    p_reason: parsed.data.reason,
    p_expected_end_on: parsed.data.expectedEndOn,
    p_notes: parsed.data.notes,
  })
  if (!error) refreshCatalog('/admin/bao-tri')
  if (error) redirect('/admin/bao-tri?maintenance=failed')
  redirect('/admin/bao-tri?maintenance=opened')
}

export async function closeMaintenance(formData: FormData): Promise<never> {
  const parsed = closeMaintenanceSchema.safeParse({
    maintenanceId: valueOf(formData, 'maintenanceId'),
    completedOn: valueOf(formData, 'completedOn'),
  })
  const { supabase, user, role } = await requireRole(['staff', 'admin'], '/admin/bao-tri')
  if (!user || !supabase) redirect('/dang-nhap?next=%2Fadmin%2Fbao-tri')
  if (!role) redirect('/admin?denied=maintenance')
  if (!parsed.success) redirect('/admin/bao-tri?maintenance=invalid')

  const { error } = await supabase.rpc('close_unit_maintenance', {
    p_maintenance_id: parsed.data.maintenanceId,
    p_completed_on: parsed.data.completedOn,
  })
  if (!error) refreshCatalog('/admin/bao-tri')
  if (error) redirect('/admin/bao-tri?maintenance=failed')
  redirect('/admin/bao-tri?maintenance=closed')
}

export async function saveAdminDiscountCode(formData: FormData): Promise<never> {
  const parsed = adminDiscountCodeSchema.safeParse({
    discountId: valueOf(formData, 'discountId'),
    code: valueOf(formData, 'code'),
    description: valueOf(formData, 'description'),
    kind: valueOf(formData, 'kind'),
    value: valueOf(formData, 'value'),
    minSubtotalVnd: valueOf(formData, 'minSubtotalVnd'),
    maxUses: valueOf(formData, 'maxUses'),
    startsOn: valueOf(formData, 'startsOn'),
    endsOn: valueOf(formData, 'endsOn'),
    active: formData.get('active') !== null,
  })
  const { supabase, user, role } = await requireRole(['admin'], '/admin/ma-giam-gia')
  if (!user || !supabase) redirect('/dang-nhap?next=%2Fadmin%2Fma-giam-gia')
  if (!role) redirect('/admin?denied=admin')
  if (!parsed.success) redirect('/admin/ma-giam-gia?discount=invalid')

  const payload = {
    code: parsed.data.code,
    description: parsed.data.description,
    kind: parsed.data.kind,
    value: parsed.data.value,
    min_subtotal_vnd: parsed.data.minSubtotalVnd,
    max_uses: parsed.data.maxUses,
    starts_on: parsed.data.startsOn,
    ends_on: parsed.data.endsOn,
    active: parsed.data.active,
    updated_at: new Date().toISOString(),
  }
  const { error } = parsed.data.discountId
    ? await supabase.from('discount_codes').update(payload).eq('id', parsed.data.discountId)
    : await supabase.from('discount_codes').insert(payload)
  revalidatePath('/admin')
  revalidatePath('/admin/ma-giam-gia')
  revalidatePath('/checkout')
  if (error) redirect('/admin/ma-giam-gia?discount=failed')
  redirect('/admin/ma-giam-gia?discount=saved')
}

export async function saveAdminDeliveryZone(formData: FormData): Promise<never> {
  const parsed = adminDeliveryZoneSchema.safeParse({
    zoneId: valueOf(formData, 'zoneId'),
    name: valueOf(formData, 'name'),
    feeVnd: valueOf(formData, 'feeVnd'),
    freeFromVnd: valueOf(formData, 'freeFromVnd'),
    notes: valueOf(formData, 'notes'),
    sortOrder: valueOf(formData, 'sortOrder'),
    active: formData.get('active') !== null,
  })
  const { supabase, user, role } = await requireRole(['admin'], '/admin/khu-vuc-giao')
  if (!user || !supabase) redirect('/dang-nhap?next=%2Fadmin%2Fkhu-vuc-giao')
  if (!role) redirect('/admin?denied=admin')
  if (!parsed.success) redirect('/admin/khu-vuc-giao?zone=invalid')

  const payload = {
    name: parsed.data.name,
    fee_vnd: parsed.data.feeVnd,
    free_from_vnd: parsed.data.freeFromVnd,
    notes: parsed.data.notes,
    sort_order: parsed.data.sortOrder,
    active: parsed.data.active,
    updated_at: new Date().toISOString(),
  }
  const { error } = parsed.data.zoneId
    ? await supabase.from('delivery_zones').update(payload).eq('id', parsed.data.zoneId)
    : await supabase.from('delivery_zones').insert(payload)
  revalidatePath('/admin')
  revalidatePath('/admin/khu-vuc-giao')
  revalidatePath('/checkout')
  if (error) redirect('/admin/khu-vuc-giao?zone=failed')
  redirect('/admin/khu-vuc-giao?zone=saved')
}

const partnerIdSchema = z.object({
  partnerId: z.string().uuid(),
})

export async function approvePartner(formData: FormData): Promise<never> {
  const parsed = partnerIdSchema.safeParse({ partnerId: formData.get('partnerId') })
  if (!parsed.success) redirect('/admin/doi-tac?error=invalid')
  const { supabase, user, role } = await getVerifiedAppRole()
  if (!user || role !== 'admin') redirect('/dang-nhap?next=%2Fadmin%2Fdoi-tac')
  const { error } = await (supabase as any)
    .from('partners')
    .update({ status: 'active' })
    .eq('id', parsed.data.partnerId)
  revalidatePath('/admin/doi-tac')
  if (error) redirect('/admin/doi-tac?error=failed')
  redirect('/admin/doi-tac?saved=approved')
}

export async function rejectPartner(formData: FormData): Promise<never> {
  const parsed = partnerIdSchema.safeParse({ partnerId: formData.get('partnerId') })
  if (!parsed.success) redirect('/admin/doi-tac?error=invalid')
  const { supabase, user, role } = await getVerifiedAppRole()
  if (!user || role !== 'admin') redirect('/dang-nhap?next=%2Fadmin%2Fdoi-tac')
  const { error } = await (supabase as any)
    .from('partners')
    .update({ status: 'rejected' })
    .eq('id', parsed.data.partnerId)
  revalidatePath('/admin/doi-tac')
  if (error) redirect('/admin/doi-tac?error=failed')
  redirect('/admin/doi-tac?saved=rejected')
}
