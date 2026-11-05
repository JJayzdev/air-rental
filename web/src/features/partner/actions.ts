/* eslint-disable @typescript-eslint/no-explicit-any */
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { getVerifiedAppRole } from '@/lib/supabase/auth'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database'

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
  })
  .strict()

export async function registerPartner(
  _prevState: { success: boolean; error: string | null } | null,
  formData: FormData,
): Promise<{ success: boolean; error: string | null }> {
  const parsed = registerPartnerSchema.safeParse({
    fullName: formData.get('fullName'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    companyName: formData.get('companyName'),
    taxCode: formData.get('taxCode'),
    description: formData.get('description'),
  })
  if (!parsed.success) {
    return { success: false, error: 'Vui lòng kiểm tra lại thông tin đăng ký.' }
  }

  const { user, role } = await getVerifiedAppRole()
  if (!user) {
    return { success: false, error: 'Vui lòng đăng nhập trước khi đăng ký đối tác.' }
  }
  if (role === 'partner') {
    return { success: false, error: 'Bạn đã là đối tác.' }
  }

  // Dùng service role key để viết database (bypass RLS)
  const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceUrl || !serviceKey) {
    return { success: false, error: 'Hệ thống chưa cấu hình khóa bảo mật.' }
  }
  const serviceSupabase = createClient<Database>(serviceUrl, serviceKey)

  // Kiểm tra xem đã có hồ sơ đối tác cho user này chưa
  const { data: existing } = await serviceSupabase
    .from('partners')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()
  if (existing) {
    return { success: false, error: 'Bạn đã có hồ sơ đối tác.' }
  }

  const { error } = await (serviceSupabase as any).from('partners').insert([
    {
      user_id: user.id,
      display_name: parsed.data.fullName,
      email: parsed.data.email,
      phone: parsed.data.phone,
      tax_code: parsed.data.taxCode || null,
      commission_rate: 15,
      status: 'pending',
    },
  ])
  if (error) {
    return { success: false, error: 'Lưu hồ sơ đối tác không thành công. Vui lòng thử lại sau.' }
  }

  await (serviceSupabase as any).from('profiles').update({ role: 'partner' }).eq('id', user.id)

  return { success: true, error: null }
}
