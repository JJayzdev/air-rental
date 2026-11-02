import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  AdminDashboardRow,
  Database,
  MaintenanceReason,
  OrderState,
} from '@/lib/supabase/database'

export interface AdminProductView {
  id: string
  slug: string
  name: string
  description: string
  categoryId: string
  categoryName: string
  state: 'draft' | 'active' | 'archived'
  isSample: boolean
  pricePerDayVnd: number
  depositVnd: number
  unitCount: number
  availableUnits: number
}

export interface AdminUnitView {
  id: string
  productId: string
  productName: string
  assetTag: string
  state: 'available' | 'maintenance' | 'retired'
  readyOn: string
  openMaintenanceId: string | null
  openMaintenanceEndOn: string | null
}

export interface AdminMaintenanceView {
  id: string
  unitId: string
  assetTag: string
  productName: string
  reason: MaintenanceReason
  notes: string
  startedOn: string
  expectedEndOn: string
  completedOn: string | null
}

export interface AdminAuditEventView {
  id: number
  orderId: string
  orderCode: string
  customerName: string
  actorId: string | null
  fromState: OrderState | null
  toState: OrderState
  createdAt: string
}

export interface AdminCategoryView {
  id: string
  name: string
}

export interface AdminDiscountCodeView {
  id: string
  code: string
  description: string
  kind: 'percent' | 'fixed'
  value: number
  minSubtotalVnd: number
  maxUses: number | null
  usedCount: number
  startsOn: string | null
  endsOn: string | null
  active: boolean
}

export interface AdminDeliveryZoneView {
  id: string
  name: string
  feeVnd: number
  freeFromVnd: number | null
  notes: string
  sortOrder: number
  active: boolean
}

type ServerDbClient = SupabaseClient<Database>

export async function getAdminDashboard(supabase: ServerDbClient): Promise<AdminDashboardRow> {
  const { data, error } = await supabase.rpc('admin_dashboard')
  if (error) throw new Error('Không tải được số liệu tổng quan. Vui lòng thử lại.')
  const row = data?.[0]
  if (!row) throw new Error('Không tải được số liệu tổng quan. Vui lòng thử lại.')
  return {
    pending_orders: Number(row.pending_orders),
    confirmed_orders: Number(row.confirmed_orders),
    active_rentals: Number(row.active_rentals),
    overdue_orders: Number(row.overdue_orders),
    refunds_pending: Number(row.refunds_pending),
    month_revenue_vnd: Number(row.month_revenue_vnd),
    month_refunds_vnd: Number(row.month_refunds_vnd),
    available_units: Number(row.available_units),
    maintenance_units: Number(row.maintenance_units),
    pending_identity_documents: Number(row.pending_identity_documents),
  }
}

export async function listAdminCategories(supabase: ServerDbClient): Promise<AdminCategoryView[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('id,name')
    .order('sort_order', { ascending: true })
  if (error || !data) throw new Error('Không tải được danh mục sản phẩm. Vui lòng thử lại.')
  return data.map((row) => ({ id: row.id, name: row.name }))
}

export async function listAdminProducts(supabase: ServerDbClient): Promise<AdminProductView[]> {
  const { data: products, error } = await supabase
    .from('products')
    .select('id,slug,name,description,category_id,state,is_sample,price_per_day_vnd,deposit_vnd')
    .order('name', { ascending: true })
  if (error || !products) throw new Error('Không tải được danh sách sản phẩm. Vui lòng thử lại.')
  const [{ data: categories, error: categoriesError }, { data: units, error: unitsError }] =
    await Promise.all([
      supabase.from('categories').select('id,name'),
      supabase.from('product_units').select('id,product_id,state'),
    ])
  if (categoriesError || !categories)
    throw new Error('Không tải được danh mục sản phẩm. Vui lòng thử lại.')
  if (unitsError || !units) throw new Error('Không tải được tồn kho. Vui lòng thử lại.')
  const categoryById = new Map(categories.map((row) => [row.id, row.name]))
  return products.map((product) => {
    const owned = units.filter((unit) => unit.product_id === product.id)
    return {
      id: product.id,
      slug: product.slug,
      name: product.name,
      description: product.description,
      categoryId: product.category_id,
      categoryName: categoryById.get(product.category_id) ?? 'Không xác định',
      state: product.state,
      isSample: product.is_sample,
      pricePerDayVnd: Number(product.price_per_day_vnd),
      depositVnd: Number(product.deposit_vnd),
      unitCount: owned.length,
      availableUnits: owned.filter((unit) => unit.state === 'available').length,
    }
  })
}

export async function listAdminUnits(supabase: ServerDbClient): Promise<AdminUnitView[]> {
  const { data: units, error } = await supabase
    .from('product_units')
    .select('id,product_id,asset_tag,state,ready_on')
    .order('asset_tag', { ascending: true })
  if (error || !units) throw new Error('Không tải được danh sách thiết bị. Vui lòng thử lại.')
  const productIds = Array.from(new Set(units.map((unit) => unit.product_id)))
  const [{ data: products, error: productsError }, { data: openMaintenance, error: openError }] =
    await Promise.all([
      productIds.length
        ? supabase.from('products').select('id,name').in('id', productIds)
        : Promise.resolve({ data: [], error: null }),
      supabase
        .from('unit_maintenance')
        .select('id,unit_id,expected_end_on')
        .is('completed_on', null),
    ])
  if (productsError || !products) throw new Error('Không tải được sản phẩm. Vui lòng thử lại.')
  if (openError || !openMaintenance)
    throw new Error('Không tải được lịch bảo trì. Vui lòng thử lại.')
  const productById = new Map(products.map((product) => [product.id, product.name]))
  const maintenanceByUnit = new Map(openMaintenance.map((record) => [record.unit_id, record]))
  return units.map((unit) => {
    const open = maintenanceByUnit.get(unit.id)
    return {
      id: unit.id,
      productId: unit.product_id,
      productName: productById.get(unit.product_id) ?? 'Không xác định',
      assetTag: unit.asset_tag,
      state: unit.state,
      readyOn: unit.ready_on,
      openMaintenanceId: open?.id ?? null,
      openMaintenanceEndOn: open?.expected_end_on ?? null,
    }
  })
}

export async function listAdminMaintenance(
  supabase: ServerDbClient,
): Promise<AdminMaintenanceView[]> {
  const { data: records, error } = await supabase
    .from('unit_maintenance')
    .select('id,unit_id,reason,notes,started_on,expected_end_on,completed_on')
    .order('started_on', { ascending: false })
    .limit(100)
  if (error || !records) throw new Error('Không tải được lịch bảo trì. Vui lòng thử lại.')
  const unitIds = Array.from(new Set(records.map((record) => record.unit_id)))
  const [unitsResult, productsResult] = await Promise.all([
    unitIds.length
      ? supabase.from('product_units').select('id,product_id,asset_tag').in('id', unitIds)
      : Promise.resolve({ data: [], error: null }),
    supabase.from('products').select('id,name'),
  ])
  if (unitsResult.error || !unitsResult.data)
    throw new Error('Không tải được thiết bị bảo trì. Vui lòng thử lại.')
  if (productsResult.error || !productsResult.data)
    throw new Error('Không tải được sản phẩm. Vui lòng thử lại.')
  const unitById = new Map(unitsResult.data.map((unit) => [unit.id, unit]))
  const productById = new Map(productsResult.data.map((product) => [product.id, product.name]))
  return records.map((record) => {
    const unit = unitById.get(record.unit_id)
    return {
      id: record.id,
      unitId: record.unit_id,
      assetTag: unit?.asset_tag ?? 'Không xác định',
      productName: (unit && productById.get(unit.product_id)) ?? 'Không xác định',
      reason: record.reason,
      notes: record.notes,
      startedOn: record.started_on,
      expectedEndOn: record.expected_end_on,
      completedOn: record.completed_on,
    }
  })
}

export async function listAdminDiscountCodes(
  supabase: ServerDbClient,
): Promise<AdminDiscountCodeView[]> {
  const { data, error } = await supabase
    .from('discount_codes')
    .select(
      'id,code,description,kind,value,min_subtotal_vnd,max_uses,used_count,starts_on,ends_on,active',
    )
    .order('active', { ascending: false })
    .order('code', { ascending: true })
  if (error || !data) throw new Error('Không tải được mã giảm giá. Vui lòng thử lại.')
  return data.map((row) => ({
    id: row.id,
    code: row.code,
    description: row.description,
    kind: row.kind,
    value: Number(row.value),
    minSubtotalVnd: Number(row.min_subtotal_vnd),
    maxUses: row.max_uses === null ? null : Number(row.max_uses),
    usedCount: Number(row.used_count),
    startsOn: row.starts_on,
    endsOn: row.ends_on,
    active: row.active,
  }))
}

export async function listAdminDeliveryZones(
  supabase: ServerDbClient,
): Promise<AdminDeliveryZoneView[]> {
  const { data, error } = await supabase
    .from('delivery_zones')
    .select('id,name,fee_vnd,free_from_vnd,notes,sort_order,active')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })
  if (error || !data) throw new Error('Không tải được khu vực giao hàng. Vui lòng thử lại.')
  return data.map((row) => ({
    id: row.id,
    name: row.name,
    feeVnd: Number(row.fee_vnd),
    freeFromVnd: row.free_from_vnd === null ? null : Number(row.free_from_vnd),
    notes: row.notes,
    sortOrder: Number(row.sort_order),
    active: row.active,
  }))
}

export async function listAdminAuditEvents(
  supabase: ServerDbClient,
): Promise<AdminAuditEventView[]> {
  const { data: events, error } = await supabase
    .from('order_events')
    .select('id,order_id,actor_id,from_state,to_state,created_at')
    .order('created_at', { ascending: false })
    .limit(100)
  if (error || !events) throw new Error('Không tải được nhật ký hoạt động. Vui lòng thử lại.')
  const orderIds = Array.from(new Set(events.map((event) => event.order_id)))
  const { data: orders, error: ordersError } = orderIds.length
    ? await supabase.from('orders').select('id,code,customer_name').in('id', orderIds)
    : { data: [], error: null }
  if (ordersError || !orders) throw new Error('Không tải được đơn thuê. Vui lòng thử lại.')
  const orderById = new Map(orders.map((order) => [order.id, order]))
  return events.map((event) => {
    const order = orderById.get(event.order_id)
    return {
      id: event.id,
      orderId: event.order_id,
      orderCode: order?.code ?? 'Không xác định',
      customerName: order?.customer_name ?? 'Không xác định',
      actorId: event.actor_id,
      fromState: event.from_state,
      toState: event.to_state,
      createdAt: event.created_at,
    }
  })
}
