'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { multiBookingRequestSchema, rentalCalendarSchema } from './request-schema.ts'
import { getVerifiedAppRole, getVerifiedUser } from '@/lib/supabase/auth'
import { createSupabaseServerClient, supabaseIsConfigured } from '@/lib/supabase/server'
import { calendarDay } from './domain.ts'

export interface BookingActionState {
  error?: string
  orderId?: string
  uncertain?: boolean
  requiresOrderCheck?: boolean
}

export async function getBookingCalendar(
  input: unknown,
): Promise<{ dates: string[]; error?: string }> {
  const parsed = rentalCalendarSchema.safeParse(input)
  if (!parsed.success) return { dates: [], error: 'Giỏ thuê hoặc ngày cần kiểm tra không hợp lệ.' }
  if (!supabaseIsConfigured())
    return { dates: [], error: 'Chưa có thiết bị thật để kiểm tra lịch thuê.' }
  const start = parsed.data.start ?? vietnamToday()
  const end = addDays(start, 62)
  try {
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase.rpc('booking_calendar', {
      p_items: parsed.data.items,
      p_from: start,
      p_to: end,
      p_start: parsed.data.start ?? null,
    })
    if (error) return { dates: [], error: 'Chưa kiểm tra được ngày trống. Vui lòng thử lại.' }
    return { dates: (data ?? []).filter((row) => row.available).map((row) => row.rental_date) }
  } catch {
    return { dates: [], error: 'Chưa kiểm tra được ngày trống. Vui lòng thử lại.' }
  }
}

export async function createRentalBooking(
  _state: BookingActionState,
  formData: FormData,
): Promise<BookingActionState> {
  const payload = formData.get('booking')
  if (typeof payload !== 'string') return { error: 'Thông tin đặt thuê chưa đầy đủ.' }
  let details: unknown
  try {
    details = JSON.parse(payload)
  } catch {
    return { error: 'Thông tin đặt thuê không hợp lệ.' }
  }
  const parsed = multiBookingRequestSchema.safeParse({
    ...asRecord(details),
    idempotencyKey: formData.get('idempotencyKey'),
    fulfillment: formData.get('fulfillment'),
    customer: {
      name: formData.get('customerName'),
      phone: formData.get('customerPhone'),
      address: formData.get('customerAddress'),
    },
  })
  if (!parsed.success)
    return { error: 'Vui lòng kiểm tra ngày thuê, số lượng và thông tin liên hệ.' }
  if (!supabaseIsConfigured()) return { error: 'Chức năng đặt thuê chưa được kết nối.' }
  const { user } = await getVerifiedUser().catch(() => ({ user: null }))
  if (!user) return { error: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' }
  try {
    const supabase = await createSupabaseServerClient()
    const { data, error, status } = await supabase.rpc('create_multi_product_booking', {
      p_idempotency_key: parsed.data.idempotencyKey,
      p_items: parsed.data.items,
      p_start: parsed.data.dates.start,
      p_end: parsed.data.dates.end,
      p_fulfillment: parsed.data.fulfillment,
      p_customer_name: parsed.data.customer.name,
      p_customer_phone: parsed.data.customer.phone,
      p_delivery_address: parsed.data.customer.address,
    })
    if (error || !data?.[0]?.order_id) {
      if (!error || status === 0 || status >= 500) {
        return {
          uncertain: true,
          error:
            'Chưa xác định được trạng thái mới nhất. Kiểm tra “Đơn của tôi” trước khi gửi lại yêu cầu.',
        }
      }
      const message = error?.message ?? ''
      if (message.includes('Not enough available units')) {
        return {
          error: 'Một số thiết bị vừa hết lịch. Hãy kiểm tra lại ngày hoặc số lượng trong giỏ.',
        }
      }
      if (message.includes('Idempotency key')) {
        return {
          requiresOrderCheck: true,
          error:
            'Yêu cầu trước có thể đã được tạo. Hãy kiểm tra “Đơn của tôi” trước khi gửi yêu cầu mới.',
        }
      }
      if (message.includes('not available for rental')) {
        return { error: 'Một số sản phẩm chưa nhận đặt thuê.' }
      }
      return { error: 'Chưa tạo được đơn thuê. Vui lòng thử lại.' }
    }
    revalidatePath('/don-thue')
    return { orderId: data[0].order_id }
  } catch {
    return {
      uncertain: true,
      error:
        'Chưa xác định được kết quả. Giữ nguyên thông tin và thử lại bằng cùng yêu cầu; hoặc kiểm tra “Đơn của tôi”.',
    }
  }
}

export async function cancelOwnBooking(formData: FormData): Promise<never> {
  const orderId = z.string().uuid().safeParse(formData.get('orderId'))
  if (!orderId.success) redirect('/don-thue')
  const { supabase, user } = await getVerifiedUser().catch(() => ({ supabase: null, user: null }))
  if (!user || !supabase) redirect('/dang-nhap?next=%2Fdon-thue')
  const { error } = await supabase.rpc('cancel_booking', { p_order_id: orderId.data })
  if (error) redirect(`/don-thue/${orderId.data}?cancel=failed`)
  revalidatePath('/don-thue')
  revalidatePath(`/don-thue/${orderId.data}`)
  redirect(`/don-thue/${orderId.data}`)
}

export async function transitionBooking(formData: FormData): Promise<never> {
  const orderId = z.string().uuid().safeParse(formData.get('orderId'))
  const next = z
    .enum(['confirmed', 'cancelled', 'delivering', 'active', 'returning', 'overdue', 'completed'])
    .safeParse(formData.get('next'))
  if (!orderId.success || !next.success) redirect('/quan-ly-don?error=request')
  const { supabase, user, role } = await getVerifiedAppRole().catch(() => ({
    supabase: null,
    user: null,
    role: null,
  }))
  if (!user || !supabase || (role !== 'staff' && role !== 'admin'))
    redirect('/dang-nhap?next=%2Fquan-ly-don')
  const { error } = await supabase.rpc('transition_booking', {
    p_order_id: orderId.data,
    p_next: next.data,
  })
  revalidatePath('/quan-ly-don')
  if (error) redirect('/quan-ly-don?error=transition')
  redirect('/quan-ly-don?updated=1')
}

export async function releaseExpiredBookings(): Promise<never> {
  const { supabase, user, role } = await getVerifiedAppRole().catch(() => ({
    supabase: null,
    user: null,
    role: null,
  }))
  if (!user || !supabase || (role !== 'staff' && role !== 'admin'))
    redirect('/dang-nhap?next=%2Fquan-ly-don')
  const { error } = await supabase.rpc('expire_pending_bookings')
  revalidatePath('/quan-ly-don')
  if (error) redirect('/quan-ly-don?error=expiry')
  redirect('/quan-ly-don?expired=1')
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function vietnamToday(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}`
}

function addDays(date: string, days: number): string {
  return new Date((calendarDay(date) + days) * 86_400_000).toISOString().slice(0, 10)
}
