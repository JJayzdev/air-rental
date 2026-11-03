import 'server-only'
import { createHmac } from 'node:crypto'
import { createSupabaseServiceClient } from '@/lib/supabase/service'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getCatalog } from '@/features/products/catalog-server'
import { ORDER_STATE_LABELS } from '@/features/orders/state-labels'
import { PAYMENT_STATE_LABELS } from '@/features/payments/state-labels'
import { searchCatalogProducts } from './product-search'
import type { ChatRequest } from './schema'

export async function allowChatRequest(ip: string, userId?: string) {
  const secret = process.env.CHAT_RATE_LIMIT_SECRET
  if (!secret || secret.length < 32) throw new Error('Chat rate limit is not configured.')
  const client = createSupabaseServiceClient()
  const hashIdentity = (scope: string, value: string) =>
    createHmac('sha256', secret).update(`air-chat:${scope}:${value}`).digest('hex')
  const { data, error } = await client.rpc('consume_chat_rate_limit', {
    p_ip_hash: hashIdentity('ip', ip),
    p_user_hash: userId ? hashIdentity('user', userId) : null,
  })
  if (error || data === null) throw new Error('Chat quota check failed.')
  return data
}

export async function runChatAction(input: ChatRequest, userId?: string) {
  if (input.action === 'searchProducts') {
    const { products } = await getCatalog()
    const matches = searchCatalogProducts(products, input.message)
    return {
      text: matches.length
        ? 'Mình tìm thấy các thiết bị phù hợp trong danh mục:'
        : 'Chưa tìm thấy thiết bị phù hợp. Thử tên sản phẩm hoặc loại thiết bị khác nhé.',
      products: matches.map(({ id, slug, name, pricePerDayVnd, imageUrls, isSample }) => ({
        id,
        slug,
        name,
        pricePerDayVnd,
        imageUrl: imageUrls[0] ?? null,
        isSample,
      })),
    }
  }

  const supabase = await createSupabaseServerClient()
  if (input.action === 'checkAvailability') {
    const { data, error } = await supabase.rpc('booking_calendar', {
      p_items: [{ productId: input.productId, quantity: 1 }],
      p_from: input.startDate,
      p_to: input.endDate,
      p_start: input.startDate,
    })
    if (error)
      return { text: 'Mình chưa thể kiểm tra lịch thiết bị lúc này. Vui lòng thử lại sau.' }
    const lastDay = data?.find((row) => row.rental_date === input.endDate)
    return {
      text: lastDay?.available
        ? 'Thiết bị còn khả dụng cho toàn bộ khoảng ngày đã chọn. Tình trạng có thể đổi trước khi đặt thuê.'
        : 'Thiết bị chưa khả dụng cho toàn bộ khoảng ngày đã chọn. Bạn có thể chọn ngày khác.',
    }
  }

  if (!userId) return { text: 'Để kiểm tra đơn thuê, vui lòng đăng nhập trước nhé.' }
  let query = supabase
    .from('orders')
    .select('code,state,payment_state,created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
  if (input.action === 'getOrderStatus' && input.orderCode)
    query = query.eq('code', input.orderCode.toUpperCase())
  const { data, error } = await query.maybeSingle()
  if (error) return { text: 'Mình chưa thể tải trạng thái đơn lúc này. Vui lòng thử lại sau.' }
  if (!data) return { text: 'Mình không tìm thấy đơn thuê phù hợp trong tài khoản của bạn.' }
  return {
    text: `Đơn ${data.code} hiện ở trạng thái “${ORDER_STATE_LABELS[data.state]}” (thanh toán: ${PAYMENT_STATE_LABELS[data.payment_state]}).`,
  }
}

export function clientIpFromRequest(request: Request) {
  // The deployment ingress must remove user-provided forwarded headers before setting this one.
  if (process.env.CHAT_TRUST_PROXY !== 'true') return 'untrusted-proxy-shared-bucket'
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return forwarded && forwarded.length <= 64 ? forwarded : 'missing-trusted-client-ip'
}
