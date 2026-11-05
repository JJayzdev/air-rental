/* eslint-disable @typescript-eslint/no-explicit-any */
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { getVerifiedAppRole } from '@/lib/supabase/auth'

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const vndAmount = (min: number, max: number) =>
  z
    .string()
    .trim()
    .regex(/^\d{1,12}$/)
    .transform(Number)
    .refine((value) => value >= min && value <= max)

const savePartnerProductSchema = z
  .object({
    slug: z.string().trim().min(3).max(80).regex(slugPattern),
    name: z.string().trim().min(3).max(120),
    description: z.string().trim().max(2000),
    pricePerDayVnd: vndAmount(1000, 100_000_000),
    depositVnd: vndAmount(0, 200_000_000),
    imageUrls: z.string().trim().optional().default(''),
    state: z.enum(['draft', 'active', 'archived']),
  })
  .strict()

export async function savePartnerProduct(formData: FormData): Promise<never> {
  const parsed = savePartnerProductSchema.safeParse({
    slug: formData.get('slug'),
    name: formData.get('name'),
    description: formData.get('description'),
    pricePerDayVnd: formData.get('pricePerDayVnd'),
    depositVnd: formData.get('depositVnd'),
    imageUrls: formData.get('imageUrls'),
    state: formData.get('state'),
  })

  const { user, role, supabase } = await getVerifiedAppRole()
  if (!user || role !== 'partner') redirect('/dang-nhap?next=%2Fpartner%2Fsan-pham')
  if (!parsed.success) redirect('/partner/san-pham/them?error=invalid')

  const { data: partner } = (await supabase
    .from('partners')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()) as { data: any }
  if (!partner) redirect('/partner/san-pham/them?error=no-partner')

  const imageUrls = parsed.data.imageUrls
    ? parsed.data.imageUrls
        .split(/[\r\n,]+/)
        .map((item) => item.trim())
        .filter(Boolean)
    : ['/images/catalog-placeholder.svg']

  const payload = {
    partner_id: partner.id,
    slug: parsed.data.slug,
    name: parsed.data.name,
    description: parsed.data.description,
    image_urls: imageUrls,
    price_per_day_vnd: parsed.data.pricePerDayVnd,
    deposit_vnd: parsed.data.depositVnd,
    state: parsed.data.state,
  }

  const { error } = await supabase.from('products').insert(payload)
  revalidatePath('/partner/san-pham')
  if (error) redirect('/partner/san-pham/them?error=failed')
  redirect('/partner/san-pham?saved=saved')
}
