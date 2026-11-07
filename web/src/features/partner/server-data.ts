/* eslint-disable @typescript-eslint/no-explicit-any */
import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, OrderPaymentState, OrderState } from '@/lib/supabase/database'
import { createSupabaseServiceClient } from '@/lib/supabase/service'

export { formatRentalPeriod, formatVietnamDate, vietnamMonthKey } from './dates.ts'

export interface PartnerOrderItem {
  orderId: string
  productId: string
  productName: string
  rentalPeriod: string
  lineTotalVnd: number
}

export interface PartnerOrder {
  id: string
  code: string
  state: OrderState
  paymentState: OrderPaymentState
  customerName: string
  customerPhone: string
  /** Chỉ phần tiền thuê của thiết bị thuộc đối tác; không lộ tổng đơn có hàng của bên khác. */
  partnerTotalVnd: number
  createdAt: string
  /** Thời điểm đơn chuyển sang `completed` (từ order_events), null nếu chưa hoàn thành. */
  completedAt: string | null
  items: PartnerOrderItem[]
}

export interface PartnerOrdersResult {
  orders: PartnerOrder[]
  unavailable: boolean
}

/**
 * Đọc các đơn có sản phẩm thuộc đối tác. Đơn hàng/chi tiết đơn không mở RLS cho
 * đối tác, nên phần đọc dùng service role ở server và luôn lọc theo danh sách
 * product_id đã xác minh thuộc chính đối tác đang đăng nhập.
 */
export async function loadPartnerOrders(
  supabase: SupabaseClient<Database>,
  partnerId: string,
): Promise<PartnerOrdersResult> {
  const { data: productRows, error: productError } = await supabase
    .from('products')
    .select('id')
    .eq('partner_id', partnerId)
  if (productError) return { orders: [], unavailable: true }

  const productIds = (productRows ?? []).map((product) => product.id)
  if (productIds.length === 0) return { orders: [], unavailable: false }

  let itemRows: any[] = []
  let orderRows: any[] = []
  const completedAtByOrder = new Map<string, string>()
  try {
    const service = createSupabaseServiceClient()
    const { data: items, error: itemError } = await service
      .from('order_items')
      .select('order_id, product_id, product_name_snapshot, rental_period, line_total_vnd')
      .in('product_id', productIds)
    if (itemError) return { orders: [], unavailable: true }
    itemRows = items ?? []

    const orderIds = Array.from(new Set(itemRows.map((item) => item.order_id)))
    if (orderIds.length === 0) return { orders: [], unavailable: false }

    const { data: orders, error: orderError } = await service
      .from('orders')
      .select('id, code, state, payment_state, customer_name, customer_phone, created_at')
      .in('id', orderIds)
      .order('created_at', { ascending: false })
    if (orderError) return { orders: [], unavailable: true }
    orderRows = orders ?? []

    const { data: events, error: eventError } = await service
      .from('order_events')
      .select('order_id, created_at')
      .in('order_id', orderIds)
      .eq('to_state', 'completed')
    if (eventError) return { orders: [], unavailable: true }
    for (const event of events ?? []) {
      const previous = completedAtByOrder.get(event.order_id)
      if (!previous || event.created_at > previous) {
        completedAtByOrder.set(event.order_id, event.created_at)
      }
    }
  } catch {
    return { orders: [], unavailable: true }
  }

  const itemsByOrder = new Map<string, PartnerOrderItem[]>()
  for (const item of itemRows) {
    const list = itemsByOrder.get(item.order_id) ?? []
    list.push({
      orderId: item.order_id,
      productId: item.product_id,
      productName: item.product_name_snapshot,
      rentalPeriod: item.rental_period,
      lineTotalVnd: Number(item.line_total_vnd ?? 0),
    })
    itemsByOrder.set(item.order_id, list)
  }

  return {
    unavailable: false,
    orders: orderRows.map((order) => {
      const items = itemsByOrder.get(order.id) ?? []
      return {
        id: order.id,
        code: order.code,
        state: order.state,
        paymentState: order.payment_state,
        customerName: order.customer_name,
        customerPhone: order.customer_phone,
        partnerTotalVnd: items.reduce((sum, item) => sum + item.lineTotalVnd, 0),
        createdAt: order.created_at,
        completedAt: completedAtByOrder.get(order.id) ?? null,
        items,
      }
    }),
  }
}

export function partnerGrossTotal(orders: PartnerOrder[]): number {
  return orders.reduce(
    (sum, order) => sum + order.items.reduce((inner, item) => inner + item.lineTotalVnd, 0),
    0,
  )
}
