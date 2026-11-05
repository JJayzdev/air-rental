/* eslint-disable @typescript-eslint/no-explicit-any */
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { getVerifiedAppRole } from '@/lib/supabase/auth'
import { createSupabaseServerClient } from '@/lib/supabase/server'

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

const registerPartnerSchema = z
  .object({
    fullName: z.string().trim().min(2).max(120),
    email: z.string().email(),
    phone: z.string().trim().min(6).max(20),
    companyName: z.string().trim().min(2).max(120),
    taxCode: z.string().trim().max(30).optional().default(''),
    description: z.string().trim().max(1000).optional().default(''),
    password: z.string().min(6).max(128),
    acceptedTerms: z.literal('on'),
  })
  .strict()

export async function registerPartner(formData: FormData): Promise<never> {
  const parsed = registerPartnerSchema.safeParse({
    fullName: formData.get('fullName'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    companyName: formData.get('companyName'),
    taxCode: formData.get('taxCode'),
    description: formData.get('description'),
    password: formData.get('password'),
    acceptedTerms: formData.get('acceptedTerms'),
  })
  if (!parsed.success) redirect('/dang-ky-doi-tac?error=invalid')

  const supabase = await createSupabaseServerClient()
  const { error: authError, data } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        full_name: parsed.data.fullName,
        phone: parsed.data.phone,
        role: 'partner',
        partner_company: parsed.data.companyName,
        partner_tax_code: parsed.data.taxCode,
        partner_description: parsed.data.description,
      },
    },
  })
  if (authError || !data?.user) redirect('/dang-ky-doi-tac?error=auth')
  const userId = (data.user as any).id

  const { error } = await (supabase as any).from('partners').insert([
    {
      user_id: userId,
      display_name: parsed.data.fullName,
      email: parsed.data.email,
      phone: parsed.data.phone,
      tax_code: parsed.data.taxCode || null,
      commission_rate: 15,
      status: 'pending',
    },
  ])
  if (error) redirect('/dang-ky-doi-tac?error=db')
  redirect('/dang-ky-doi-tac?sent=1')
}
