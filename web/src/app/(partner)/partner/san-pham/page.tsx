/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getVerifiedAppRole } from '@/lib/supabase/auth'
import { money } from '@/lib/format'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: 'Sản phẩm của tôi',
}

export default async function PartnerProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; state?: string }>
}) {
  const { user, role, supabase } = await getVerifiedAppRole()
  if (!user) redirect('/dang-nhap?next=%2Fpartner%2Fsan-pham')
  if (role !== 'partner') redirect('/don-thue')

  const params = await searchParams
  const partnerResult = await supabase
    .from('partners')
    .select('id, status')
    .eq('user_id', user.id)
    .maybeSingle()
  const partner = (partnerResult as any).data

  if (!partner || partner.status !== 'active') {
    return (
      <main className="partner-page">
        <header className="partner-page-head">
          <div>
            <p className="partner-eyebrow">Sản phẩm của tôi</p>
            <h1>Sản phẩm</h1>
          </div>
        </header>
        <p className="partner-notice partner-notice-wait">
          Hồ sơ đối tác của bạn chưa được duyệt. Vui lòng đợi quản trị viên kích hoạt trước khi thêm
          sản phẩm.
        </p>
      </main>
    )
  }

  const productsResult = await supabase
    .from('products')
    .select('id, slug, name, description, state, price_per_day_vnd, deposit_vnd, image_urls')
    .eq('partner_id', partner.id)
    .order('name', { ascending: true })
  const products = (productsResult as any).data ?? []

  return (
    <main className="partner-page">
      <header className="partner-page-head">
        <div>
          <p className="partner-eyebrow">Sản phẩm của tôi</p>
          <h1>Sản phẩm</h1>
          <p className="partner-page-sub">Thêm và quản lý thiết bị bạn đang cho thuê trên A.I.R.</p>
        </div>
        <Link className="partner-button partner-button-primary" href="/partner/san-pham/them">
          Thêm sản phẩm mới
        </Link>
      </header>

      {params.saved === 'saved' && (
        <p className="partner-message" role="status">
          Đã lưu sản phẩm.
        </p>
      )}

      <section className="partner-block">
        <div className="partner-table-wrap">
          <table className="partner-table">
            <thead>
              <tr>
                <th scope="col">Sản phẩm</th>
                <th scope="col">Giá / ngày</th>
                <th scope="col">Tiền cọc</th>
                <th scope="col">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr>
                  <td colSpan={4} className="partner-empty-cell">
                    Chưa có sản phẩm nào.{' '}
                    <Link href="/partner/san-pham/them">Thêm sản phẩm đầu tiên</Link>
                  </td>
                </tr>
              ) : (
                products.map((p: any) => (
                  <tr key={p.id}>
                    <td>
                      <Link
                        href={`/san-pham/${encodeURIComponent(String(p.slug ?? p.id))}`}
                        className="partner-product-link"
                      >
                        {p.name}
                      </Link>
                    </td>
                    <td>{money(p.price_per_day_vnd)}</td>
                    <td>{money(p.deposit_vnd)}</td>
                    <td>
                      <span className={`partner-state is-${p.state}`}>
                        {p.state === 'active'
                          ? 'Đang cho thuê'
                          : p.state === 'draft'
                            ? 'Bản nháp'
                            : 'Đã lưu trữ'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}
