'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { withFlash } from './flash-path.ts'
import { requireVerifiedUser } from '@/lib/supabase/auth'
import { safeInternalPath } from '@/lib/safe-internal-path'

const favoriteInput = z.object({
  productId: z.string().uuid(),
  next: z.string().min(1),
})

function resolveNext(formData: FormData): string {
  return safeInternalPath(
    formData.get('next'),
    '/san-pham',
    process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  )
}

function revalidateFavorites(next: string) {
  revalidatePath(new URL(next, 'http://air.local').pathname)
  revalidatePath('/yeu-thich')
}

async function favoriteInputFrom(formData: FormData, next: string) {
  const parsed = favoriteInput.safeParse({
    productId: formData.get('productId'),
    next,
  })
  if (!parsed.success) redirect(withFlash(next, 'favorite', 'invalid'))
  return parsed.data
}

export async function addFavorite(formData: FormData): Promise<never> {
  const next = resolveNext(formData)
  const input = await favoriteInputFrom(formData, next)
  const { supabase, user } = await requireVerifiedUser(next)
  const { error } = await supabase
    .from('user_favorites')
    .insert({ user_id: user.id, product_id: input.productId })
  if (error && error.code !== '23505') redirect(withFlash(next, 'favorite', 'failed'))
  revalidateFavorites(next)
  redirect(withFlash(next, 'favorite', 'saved'))
}

export async function removeFavorite(formData: FormData): Promise<never> {
  const next = resolveNext(formData)
  const input = await favoriteInputFrom(formData, next)
  const { supabase, user } = await requireVerifiedUser(next)
  const { error } = await supabase
    .from('user_favorites')
    .delete()
    .eq('user_id', user.id)
    .eq('product_id', input.productId)
  if (error) redirect(withFlash(next, 'favorite', 'failed'))
  revalidateFavorites(next)
  redirect(withFlash(next, 'favorite', 'removed'))
}
