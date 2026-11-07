import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database'
import { getVerifiedUser } from '@/lib/supabase/auth'
import { supabaseIsConfigured } from '@/lib/supabase/server'

export interface ViewerFavorites {
  signedIn: boolean
  productIds: Set<string>
}

export async function listFavoriteProductIds(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('user_favorites')
    .select('product_id')
    .eq('user_id', userId)
  if (error) throw new Error('Không tải được danh sách thiết bị yêu thích. Vui lòng thử lại.')
  return new Set((data ?? []).map((row) => row.product_id))
}

/** Catalog pages stay public, so a missing session simply hides the save control. */
export async function readViewerFavorites(): Promise<ViewerFavorites> {
  if (!supabaseIsConfigured()) return { signedIn: false, productIds: new Set() }
  const { supabase, user } = await getVerifiedUser()
  if (!user) return { signedIn: false, productIds: new Set() }
  // Danh mục và trang sản phẩm là trang công khai: lỗi đọc yêu thích chỉ ẩn trạng thái đã lưu,
  // không được làm sập cả trang.
  try {
    return { signedIn: true, productIds: await listFavoriteProductIds(supabase, user.id) }
  } catch {
    return { signedIn: true, productIds: new Set() }
  }
}
