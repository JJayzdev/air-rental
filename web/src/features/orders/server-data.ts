import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, OrderPaymentState, OrderState, PaymentKind } from '@/lib/supabase/database'

export interface RentalOrderItemView {
  id: string
  productName: string
  productSlug: string | null
  rentalStart: string
  rentalEnd: string
  quantity: number
  pricePerDayVnd: number
  lineTotalVnd: number
}

export interface RentalOrderPaymentView {
  id: string
  kind: PaymentKind
  direction: 'in' | 'out'
  provider: 'sepay' | 'manual'
  amountVnd: number
  status: 'pending' | 'succeeded' | 'cancelled'
  createdAt: string
}

export interface RentalOrderView {
  id: string
  userId: string
  code: string
  state: OrderState
  paymentState: OrderPaymentState
  fulfillment: 'pickup' | 'delivery'
  customerName: string
  customerPhone: string
  deliveryAddress: string
  subtotalVnd: number
  discountCode: string
  discountVnd: number
  deliveryZoneName: string
  deliveryFeeVnd: number
  totalVnd: number
  depositVnd: number
  createdAt: string
  expiresAt: string
  items: RentalOrderItemView[]
  payments: RentalOrderPaymentView[]
  events: Array<{ state: OrderState; createdAt: string }>
}

export interface AssignedUnitView {
  assetTag: string
  state: 'available' | 'maintenance' | 'retired'
  readyOn: string
}

type ServerDbClient = SupabaseClient<Database>
type OrderRow = Pick<
  Database['public']['Tables']['orders']['Row'],
  | 'id'
  | 'user_id'
  | 'code'
  | 'state'
  | 'fulfillment'
  | 'customer_name'
  | 'customer_phone'
  | 'delivery_address'
  | 'subtotal_vnd'
  | 'discount_code'
  | 'discount_vnd'
  | 'delivery_zone_name'
  | 'delivery_fee_vnd'
  | 'total_vnd'
  | 'deposit_vnd'
  | 'payment_state'
  | 'created_at'
  | 'expires_at'
>

const ORDER_COLUMNS =
  'id,user_id,code,state,payment_state,fulfillment,customer_name,customer_phone,delivery_address,subtotal_vnd,discount_code,discount_vnd,delivery_zone_name,delivery_fee_vnd,total_vnd,deposit_vnd,created_at,expires_at'

export async function listRentalOrders(
  supabase: ServerDbClient,
  ownerId?: string,
): Promise<RentalOrderView[]> {
  let query = supabase
    .from('orders')
    .select(ORDER_COLUMNS)
    .order('created_at', { ascending: false })
    .limit(50)
  if (ownerId) query = query.eq('user_id', ownerId)
  const { data: rows, error } = await query
  if (error) throw new Error('Không tải được danh sách đơn thuê. Vui lòng thử lại.')
  if (!rows?.length) return []
  return mapOrders(supabase, rows)
}

export async function getRentalOrder(
  supabase: ServerDbClient,
  id: string,
): Promise<RentalOrderView | null> {
  const { data: row, error } = await supabase
    .from('orders')
    .select(ORDER_COLUMNS)
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error('Không tải được thông tin đơn thuê. Vui lòng thử lại.')
  if (!row) return null
  const [order] = await mapOrders(supabase, [row])
  return order ?? null
}

/** Staff-only view: RLS on both tables limits this lookup to verified staff/admin sessions. */
export async function listAssignedUnitsForOrders(
  supabase: ServerDbClient,
  orderIds: string[],
): Promise<Map<string, AssignedUnitView>> {
  if (!orderIds.length) return new Map()
  const { data: items, error: itemsError } = await supabase
    .from('order_items')
    .select('id,unit_id')
    .in('order_id', orderIds)
  if (itemsError || !items)
    throw new Error('Không tải được thông tin thiết bị đã cấp phát. Vui lòng thử lại.')
  const unitIds = Array.from(new Set(items.map((item) => item.unit_id)))
  if (!unitIds.length) return new Map()
  const { data: units, error: unitsError } = await supabase
    .from('product_units')
    .select('id,asset_tag,state,ready_on')
    .in('id', unitIds)
  if (unitsError || !units)
    throw new Error('Không tải được thông tin thiết bị đã cấp phát. Vui lòng thử lại.')
  const byUnit = new Map(
    units.map((unit) => [
      unit.id,
      {
        assetTag: unit.asset_tag,
        state: unit.state,
        readyOn: unit.ready_on,
      },
    ]),
  )
  return new Map(
    items.flatMap((item) => {
      const unit = byUnit.get(item.unit_id)
      return unit ? [[item.id, unit] as const] : []
    }),
  )
}

async function mapOrders(supabase: ServerDbClient, rows: OrderRow[]): Promise<RentalOrderView[]> {
  const ids = rows.map((row) => row.id)
  const { data: items, error: itemsError } = await supabase
    .from('order_items')
    .select(
      'id,order_id,product_id,product_name_snapshot,rental_period,rental_days,price_per_day_vnd,line_total_vnd',
    )
    .in('order_id', ids)
  if (itemsError || !items) throw new Error('Không tải được chi tiết đơn thuê. Vui lòng thử lại.')
  const productIds = Array.from(new Set((items ?? []).map((item) => item.product_id)))
  const { data: products, error: productsError } = productIds.length
    ? await supabase.from('products').select('id,name,slug').in('id', productIds)
    : { data: [], error: null }
  if (productsError)
    throw new Error('Không tải được thông tin thiết bị trong đơn. Vui lòng thử lại.')
  const productById = new Map((products ?? []).map((product) => [product.id, product]))
  const { data: events, error: eventsError } = await supabase
    .from('order_events')
    .select('order_id,to_state,created_at')
    .in('order_id', ids)
    .order('created_at', { ascending: true })
  if (eventsError || !events) throw new Error('Không tải được lịch sử đơn thuê. Vui lòng thử lại.')
  const { data: payments, error: paymentsError } = await supabase
    .from('payments')
    .select('id,order_id,kind,direction,provider,amount_vnd,status,created_at')
    .in('order_id', ids)
    .order('created_at', { ascending: true })
  if (paymentsError || !payments)
    throw new Error('Không tải được lịch sử giao dịch. Vui lòng thử lại.')
  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    code: row.code,
    state: row.state,
    paymentState: row.payment_state,
    fulfillment: row.fulfillment,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    deliveryAddress: row.delivery_address,
    subtotalVnd: Number(row.subtotal_vnd),
    discountCode: row.discount_code,
    discountVnd: Number(row.discount_vnd),
    deliveryZoneName: row.delivery_zone_name,
    deliveryFeeVnd: Number(row.delivery_fee_vnd),
    totalVnd: Number(row.total_vnd),
    depositVnd: Number(row.deposit_vnd),
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    events: events
      .filter((event) => event.order_id === row.id)
      .map((event) => ({
        state: event.to_state,
        createdAt: event.created_at,
      })),
    payments: payments
      .filter((payment) => payment.order_id === row.id)
      .map((payment) => ({
        id: payment.id,
        kind: payment.kind,
        direction: payment.direction,
        provider: payment.provider,
        amountVnd: Number(payment.amount_vnd),
        status: payment.status,
        createdAt: payment.created_at,
      })),
    items: (items ?? [])
      .filter((item) => item.order_id === row.id)
      .map((item) => {
        const [rentalStart, exclusiveEnd] = parseDateRange(item.rental_period)
        return {
          id: item.id,
          productName: item.product_name_snapshot,
          productSlug: productById.get(item.product_id)?.slug ?? null,
          rentalStart,
          rentalEnd: addDays(exclusiveEnd, -1),
          quantity: 1,
          pricePerDayVnd: Number(item.price_per_day_vnd),
          lineTotalVnd: Number(item.line_total_vnd),
        }
      }),
  }))
}

function parseDateRange(value: string): [string, string] {
  const match = /^\[(\d{4}-\d{2}-\d{2}),(\d{4}-\d{2}-\d{2})\)$/.exec(value)
  return match ? [match[1], match[2]] : ['', '']
}

function addDays(value: string, days: number) {
  if (!value) return ''
  const date = new Date(`${value}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}
