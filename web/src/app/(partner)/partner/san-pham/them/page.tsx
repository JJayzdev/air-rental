import Link from 'next/link'
import { redirect } from 'next/navigation'
import { savePartnerProduct } from '@/features/partner/actions'
import { getVerifiedAppRole } from '@/lib/supabase/auth'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: 'Thêm sản phẩm',
}

export default async function PartnerAddProductPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { user, role, supabase } = await getVerifiedAppRole()
  if (!user) redirect('/dang-nhap?next=%2Fpartner%2Fsan-pham%2Fthem')
  if (role !== 'partner') redirect('/don-thue')

  const params = await searchParams
  const showError = ['invalid', 'no-partner', 'failed'].includes(params.error ?? '')

  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, sort_order')
    .order('sort_order', { ascending: true })

  return (
    <main className="partner-page">
      <header className="partner-page-head">
        <div>
          <p className="partner-eyebrow">Sản phẩm của tôi</p>
          <h1>Thêm sản phẩm mới</h1>
          <p className="partner-page-sub">
            Nhập thông tin thiết bị bạn muốn cho thuê. Sản phẩm sẽ hiển thị trên trang khách sau khi
            duyệt.
          </p>
        </div>
        <Link className="partner-button" href="/partner/san-pham">
          Quay lại danh sách
        </Link>
      </header>

      {showError && (
        <p className="partner-message partner-message-error">
          Chưa lưu được sản phẩm. Vui lòng kiểm tra lại thông tin.
        </p>
      )}

      <section className="partner-block">
        <form action={savePartnerProduct} className="partner-form">
          <label>
            Tên sản phẩm
            <input name="name" required minLength={3} maxLength={120} />
            <small>Đường dẫn sản phẩm do hệ thống tự tạo từ tên, bạn không cần nhập.</small>
          </label>
          <label>
            Danh mục
            <select name="categoryId" defaultValue="" required>
              <option value="" disabled>
                Chọn danh mục
              </option>
              {(categories ?? []).map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Mô tả
            <textarea name="description" rows={3} />
          </label>
          <label>
            Link ảnh (mỗi link một dòng)
            <textarea name="imageUrls" rows={3} />
          </label>
          <label>
            Giá thuê / ngày (VND)
            <input inputMode="numeric" name="pricePerDayVnd" required />
          </label>
          <label>
            Tiền cọc (VND)
            <input defaultValue="0" inputMode="numeric" name="depositVnd" required />
          </label>
          <label>
            Số lượng thiết bị
            <input
              defaultValue="1"
              inputMode="numeric"
              min={1}
              max={100}
              name="quantity"
              required
              type="number"
            />
            <small>Mỗi thiết bị tương ứng một máy trong kho để khách đặt thuê.</small>
          </label>
          <label>
            Trạng thái
            <select name="state" defaultValue="draft">
              <option value="draft">Bản nháp</option>
              <option value="active">Đang cho thuê</option>
              <option value="archived">Đã lưu trữ</option>
            </select>
          </label>
          <button className="partner-button partner-button-primary" type="submit">
            Lưu sản phẩm
          </button>
        </form>
      </section>
    </main>
  )
}
