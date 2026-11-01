'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { normalizeIdentityImage } from './identity-image.ts'
import { getVerifiedAppRole, requireVerifiedUser } from '@/lib/supabase/auth'
import { createSupabaseServiceClient, identityDocumentsEnabled } from '@/lib/supabase/service'

const requestIdSchema = z.string().uuid()
const identityBucket = 'identity-documents'

export async function requestIdentityDocumentForOrder(formData: FormData): Promise<never> {
  const userId = z.string().uuid().safeParse(formData.get('userId'))
  const returnPath = '/quan-ly-don?identity=requested'
  const { supabase, user, role } = await getVerifiedAppRole().catch(() => ({
    supabase: null,
    user: null,
    role: null,
  }))
  if (!user || !supabase || (role !== 'staff' && role !== 'admin'))
    redirect('/dang-nhap?next=%2Fquan-ly-don')
  if (!identityDocumentsEnabled()) redirect('/quan-ly-don?identity=disabled')
  if (!userId.success) redirect('/quan-ly-don?identity=failed')
  const { error } = await supabase.rpc('request_identity_document', { p_user_id: userId.data })
  if (error) redirect('/quan-ly-don?identity=failed')
  revalidatePath('/quan-ly-don')
  revalidatePath('/quan-ly-giay-to')
  redirect(returnPath)
}

export async function uploadOwnIdentityDocument(formData: FormData): Promise<never> {
  const requestId = requestIdSchema.safeParse(formData.get('requestId'))
  if (!requestId.success) redirect('/tai-khoan/giay-to?document=invalid')
  if (!identityDocumentsEnabled()) redirect('/tai-khoan/giay-to?document=disabled')
  const file = formData.get('document')
  if (!(file instanceof File) || file.size === 0) redirect('/tai-khoan/giay-to?document=missing')
  const { supabase, user } = await requireVerifiedUser('/tai-khoan/giay-to')
  const { data: request, error: requestError } = await supabase
    .from('identity_document_requests')
    .select('id,status')
    .eq('id', requestId.data)
    .eq('user_id', user.id)
    .maybeSingle()
  if (requestError || !request || request.status !== 'requested')
    redirect('/tai-khoan/giay-to?document=unavailable')

  let normalized: Awaited<ReturnType<typeof normalizeIdentityImage>>
  try {
    normalized = await normalizeIdentityImage(file)
  } catch {
    redirect('/tai-khoan/giay-to?document=invalid-file')
  }

  const path = `${user.id}/${request.id}`
  const service = createSupabaseServiceClient()
  const { error: uploadError } = await service.storage
    .from(identityBucket)
    .upload(path, normalized.bytes, {
      contentType: normalized.mimeType,
      upsert: false,
    })
  if (uploadError) redirect('/tai-khoan/giay-to?document=upload-failed')
  const { error: submitError } = await supabase.rpc('submit_identity_document', {
    p_request_id: request.id,
  })
  if (submitError) {
    await service.storage.from(identityBucket).remove([path])
    redirect('/tai-khoan/giay-to?document=submit-failed')
  }
  revalidatePath('/tai-khoan/giay-to')
  revalidatePath('/quan-ly-giay-to')
  redirect('/tai-khoan/giay-to?document=submitted')
}

export async function deleteOwnIdentityDocument(formData: FormData): Promise<never> {
  const requestId = requestIdSchema.safeParse(formData.get('requestId'))
  if (!requestId.success) redirect('/tai-khoan/giay-to?document=invalid')
  if (!identityDocumentsEnabled()) redirect('/tai-khoan/giay-to?document=disabled')
  const { supabase, user } = await requireVerifiedUser('/tai-khoan/giay-to')
  const { data: request, error: requestError } = await supabase
    .from('identity_document_requests')
    .select('id,status')
    .eq('id', requestId.data)
    .eq('user_id', user.id)
    .maybeSingle()
  if (
    requestError ||
    !request ||
    !['requested', 'pending_review', 'cancelled'].includes(request.status)
  ) {
    redirect('/tai-khoan/giay-to?document=unavailable')
  }
  if (request.status !== 'cancelled') {
    const { error } = await supabase.rpc('delete_identity_document_request', {
      p_request_id: request.id,
    })
    if (error) redirect('/tai-khoan/giay-to?document=delete-failed')
  }
  const service = createSupabaseServiceClient()
  const { error: removeError } = await service.storage
    .from(identityBucket)
    .remove([`${user.id}/${request.id}`])
  if (removeError) redirect('/tai-khoan/giay-to?document=delete-failed')
  revalidatePath('/tai-khoan/giay-to')
  revalidatePath('/quan-ly-giay-to')
  redirect('/tai-khoan/giay-to?document=deleted')
}

export async function reviewIdentityDocument(formData: FormData): Promise<never> {
  const requestId = requestIdSchema.safeParse(formData.get('requestId'))
  const decision = z.enum(['approved', 'rejected']).safeParse(formData.get('decision'))
  const { supabase, user, role } = await getVerifiedAppRole().catch(() => ({
    supabase: null,
    user: null,
    role: null,
  }))
  if (!user || !supabase || (role !== 'staff' && role !== 'admin'))
    redirect('/dang-nhap?next=%2Fquan-ly-giay-to')
  if (!identityDocumentsEnabled()) redirect('/quan-ly-giay-to?identity=disabled')
  if (!requestId.success || !decision.success) redirect('/quan-ly-giay-to?identity=invalid')
  const { error } = await supabase.rpc('review_identity_document', {
    p_request_id: requestId.data,
    p_decision: decision.data,
  })
  if (error) redirect('/quan-ly-giay-to?identity=failed')
  revalidatePath('/quan-ly-giay-to')
  revalidatePath('/tai-khoan/giay-to')
  redirect('/quan-ly-giay-to?identity=reviewed')
}
