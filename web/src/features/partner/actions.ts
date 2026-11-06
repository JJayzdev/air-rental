/* eslint-disable @typescript-eslint/no-explicit-any */
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { getVerifiedAppRole } from '@/lib/supabase/auth'
import { createSupabaseServiceClient } from '@/lib/supabase/service'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database'
import { slugifyProductName, uniqueSlug } from './slug.ts'

const vndAmount = (min: number, max: number) =>
  z
    .string()
    .trim()
    .regex(/^\d{1,12}$/)
    .transform(Number)
    .refine((value) => value >= min && value <= max)

const savePartnerProductSchema = z
  .object({
    name: z.string().trim().min(3).max(120),
    categoryId: z.string().trim().uuid(),
    description: z.string().trim().max(2000),
    pricePerDayVnd: vndAmount(1000, 100_000_000),
    depositVnd: vndAmount(0, 200_000_000),
    imageUrls: z.string().trim().optional().default(''),
    state: z.enum(['draft', 'active', 'archived']),
  })
  .strict()

export async function savePartnerProduct(formData: FormData): Promise<never> {
  const parsed = savePartnerProductSchema.safeParse({
    name: formData.get('name'),
    categoryId: formData.get('categoryId'),
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

  // Danh mục là bắt buộc ở tầng dữ liệu, nên phải xác minh trước khi ghi.
  const { data: category } = await supabase
    .from('categories')
    .select('id')
    .eq('id', parsed.data.categoryId)
    .maybeSingle()
  if (!category) redirect('/partner/san-pham/them?error=invalid')

  const imageUrls = parsed.data.imageUrls
    ? parsed.data.imageUrls
        .split(/[\r\n,]+/)
        .map((item) => item.trim())
        .filter(Boolean)
    : ['/images/catalog-placeholder.svg']

  const baseSlug = slugifyProductName(parsed.data.name)
  const taken = await existingSlugs(baseSlug, supabase)

  let slug = uniqueSlug(baseSlug, taken)
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { error } = await supabase.from('products').insert({
      partner_id: partner.id,
      category_id: category.id,
      slug,
      name: parsed.data.name,
      description: parsed.data.description,
      image_urls: imageUrls,
      price_per_day_vnd: parsed.data.pricePerDayVnd,
      deposit_vnd: parsed.data.depositVnd,
      state: parsed.data.state,
    })
    if (!error) {
      revalidatePath('/partner/san-pham')
      redirect('/partner/san-pham?saved=saved')
    }
    // 23505 = trùng slug (có thể do đối tác khác vừa lưu cùng tên).
    if (error.code !== '23505') break
    taken.push(slug)
    slug = uniqueSlug(baseSlug, taken)
  }

  redirect('/partner/san-pham/them?error=failed')
}

/**
 * Đọc các slug đã dùng để tránh trùng. Dùng service role vì RLS chỉ cho đối tác
 * thấy sản phẩm của mình; nếu thiếu khóa thì vẫn còn vòng thử lại khi insert.
 */
async function existingSlugs(
  baseSlug: string,
  supabase: Awaited<ReturnType<typeof getVerifiedAppRole>>['supabase'],
): Promise<string[]> {
  const prefix = baseSlug.slice(0, 40)
  try {
    const service = createSupabaseServiceClient()
    const { data } = await service.from('products').select('slug').like('slug', `${prefix}%`)
    return (data ?? []).map((row) => row.slug)
  } catch {
    const { data } = await supabase.from('products').select('slug').like('slug', `${prefix}%`)
    return (data ?? []).map((row) => row.slug)
  }
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
