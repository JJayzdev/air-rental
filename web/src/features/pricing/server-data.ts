import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database'
import type { DeliveryZoneView } from './types.ts'

type ServerDbClient = SupabaseClient<Database>

/** Active zones only; the RLS policy on delivery_zones also hides inactive rows from shoppers. */
export async function listActiveDeliveryZones(
  supabase: ServerDbClient,
): Promise<DeliveryZoneView[]> {
  const { data, error } = await supabase
    .from('delivery_zones')
    .select('id,name,fee_vnd,free_from_vnd,notes')
    .eq('active', true)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })
  if (error || !data) throw new Error('Không tải được khu vực giao hàng. Vui lòng thử lại.')
  return data.map((zone) => ({
    id: zone.id,
    name: zone.name,
    feeVnd: Number(zone.fee_vnd),
    freeFromVnd: zone.free_from_vnd === null ? null : Number(zone.free_from_vnd),
    notes: zone.notes,
  }))
}
