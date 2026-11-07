/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getVerifiedAppRole } from '@/lib/supabase/auth'
import { money } from '@/lib/format'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: 'Tổng quan',
}

export default async function PartnerDashboardPage() {
  const { user, role, supabase } = await getVerifiedAppRole()
  if (!user) redirect('/dang-nhap?next=%2Fpartner')
  if (role !== 'partner') redirect('/don-thue')

  const partnerResult = await supabase
    .from('partners')
    .select('id, display_name, commission_rate, status')
    .eq('user_id', user.id)
    .maybeSingle()
  const partner = (partnerResult as any).data

  // Tài khoản có role partner nhưng chưa có (hoặc mất) hồ sơ đối tác: không truy vấn sản phẩm
  // bằng partner_id rỗng (không phải uuid hợp lệ) và không đọc thuộc tính của null.
  const productsResult = partner
    ? await supabase
        .from('products')
        .select('id, name, state, price_per_day_vnd, deposit_vnd')
        .eq('partner_id', partner.id)
        .order('name', { ascending: true })
    : { data: [] }
  const products = (productsResult as any).data ?? []

  const productCount = products.length
  const activeCount = products.filter((p: any) => p.state === 'active').length

  return (
    <main className="partner-page">
      <header className="partner-page-head">
        <div>
          <p className="partner-eyebrow">Tổng quan đối tác</p>
          <h1>Tổng quan</h1>
          <p className="partner-page-sub">
            Quản lý sản phẩm cho thuê của bạn và theo dõi doanh thu nhận được.
          </p>
        </div>
        <div className="partner-head-actions">
          <Link className="partner-button partner-button-primary" href="/partner/san-pham">
            Thêm sản phẩm
          </Link>
        </div>
      </header>

      {!partner && (
        <p className="partner-notice partner-notice-wait">
          Bạn chưa có hồ sơ đối tác. <Link href="/dang-ky-doi-tac">Đăng ký trở thành đối tác</Link>{' '}
          để bắt đầu cho thuê.
        </p>
      )}
      {partner && partner.status !== 'active' && (
        <p className="partner-notice partner-notice-wait">
          Hồ sơ đối tác của bạn đang ở trạng thái “
          {PARTNER_STATUS_LABELS[partner.status] ?? 'Chờ duyệt'}”. Vui lòng đợi quản trị viên duyệt
          trước khi thêm sản phẩm.
        </p>
      )}

      <section className="partner-block">
        <div className="partner-stat-grid">
          <Stat label="Tổng sản phẩm" value={String(productCount)} href="/partner/san-pham" />
          <Stat
            label="Sản phẩm đang cho thuê"
            value={String(activeCount)}
            href="/partner/san-pham?state=active"
          />
          <Stat
            label="Phí hệ thống"
            value={`${Number(partner?.commission_rate ?? 15).toFixed(0)}%`}
            hint="Phí duy trì trang web trừ từ mỗi đơn"
          />
          <Stat
            label="Tỷ lệ nhận về"
            value={`${100 - Number(partner?.commission_rate ?? 15)}%`}
            hint="Số phần trăm bạn nhận từ mỗi đơn thành công"
          />
        </div>
      </section>

      <section className="partner-block">
        <div className="partner-block-head">
          <div>
            <h2>Sản phẩm của bạn</h2>
            <p>Danh sách thiết bị bạn đang cho thuê trên A.I.R.</p>
          </div>
        </div>
        {products.length === 0 ? (
          <p className="partner-empty">
            Chưa có sản phẩm nào. <Link href="/partner/san-pham">Thêm sản phẩm đầu tiên</Link>.
          </p>
        ) : (
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
                {products.map((p: any) => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  )
}

const PARTNER_STATUS_LABELS: Record<string, string> = {
  pending: 'Chờ duyệt',
  active: 'Đang hoạt động',
  suspended: 'Tạm ngưng',
  rejected: 'Bị từ chối',
}

function Stat({
  label,
  value,
  href,
  hint,
}: {
  label: string
  value: string
  href?: string
  hint?: string
}) {
  return (
    <Link className="partner-stat" href={href || '/'}>
      <div className="partner-stat-body">
        <span>{label}</span>
        <b>{value}</b>
        {hint && <small>{hint}</small>}
      </div>
      <span aria-hidden>→</span>
    </Link>
  )
}
