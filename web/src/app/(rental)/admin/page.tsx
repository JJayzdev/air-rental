import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAdminDashboard } from '@/features/admin/server-data'
import { getVerifiedAppRole } from '@/lib/supabase/auth'
import { money } from '@/lib/format'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: 'Bảng điều khiển — A.I.R',
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string }>
}) {
  const { user, role, supabase } = await getVerifiedAppRole()
  if (!user) redirect('/dang-nhap?next=%2Fadmin')
  if (role !== 'staff' && role !== 'admin') redirect('/don-thue')
  const dashboard = await getAdminDashboard(supabase)
  const params = await searchParams

  return (
    <main className="shell rental-page rental-admin">
      <div className="rental-heading">
        <p className="eyebrow">Quản trị</p>
        <h1>Bảng điều khiển</h1>
        <p className="rental-notice">
          Số liệu tính theo giờ Việt Nam. Doanh thu chỉ gồm giao dịch đã nhận tiền thành công trong
          tháng này.
        </p>
      </div>
      {params.denied && (
        <p className="rental-error" role="alert">
          Chỉ quản trị viên mới được sửa sản phẩm và kho thiết bị.
        </p>
      )}

      <section aria-labelledby="admin-orders" className="rental-admin-section">
        <h2 id="admin-orders">Đơn thuê</h2>
        <div className="rental-admin-metrics">
          <Metric
            href="/quan-ly-don"
            label="Chờ xác nhận"
            value={String(dashboard.pending_orders)}
          />
          <Metric label="Đã xác nhận" value={String(dashboard.confirmed_orders)} />
          <Metric label="Đang giao / đang thuê" value={String(dashboard.active_rentals)} />
          <Metric
            alarm={dashboard.overdue_orders > 0}
            href="/quan-ly-don"
            label="Quá hạn trả"
            value={String(dashboard.overdue_orders)}
          />
        </div>
      </section>

      <section aria-labelledby="admin-money" className="rental-admin-section">
        <h2 id="admin-money">Dòng tiền</h2>
        <div className="rental-admin-metrics">
          <Metric label="Doanh thu tháng" value={money(dashboard.month_revenue_vnd)} />
          <Metric label="Đã hoàn trong tháng" value={money(dashboard.month_refunds_vnd)} />
          <Metric
            alarm={dashboard.refunds_pending > 0}
            href="/quan-ly-don"
            label="Cọc chờ hoàn"
            value={String(dashboard.refunds_pending)}
          />
        </div>
      </section>

      <section aria-labelledby="admin-fleet" className="rental-admin-section">
        <h2 id="admin-fleet">Kho thiết bị</h2>
        <div className="rental-admin-metrics">
          <Metric
            href="/admin/kho"
            label="Máy sẵn sàng"
            value={String(dashboard.available_units)}
          />
          <Metric
            alarm={dashboard.maintenance_units > 0}
            href="/admin/bao-tri"
            label="Máy đang bảo trì"
            value={String(dashboard.maintenance_units)}
          />
          <Metric
            alarm={dashboard.pending_identity_documents > 0}
            href="/quan-ly-giay-to"
            label="Giấy tờ chờ duyệt"
            value={String(dashboard.pending_identity_documents)}
          />
        </div>
      </section>

      <nav aria-label="Lối tắt quản trị" className="rental-admin-links">
        <Link className="secondary" href="/admin/san-pham">
          Sản phẩm
        </Link>
        <Link className="secondary" href="/admin/kho">
          Kho thiết bị
        </Link>
        <Link className="secondary" href="/admin/bao-tri">
          Bảo trì
        </Link>
        <Link className="secondary" href="/admin/nhat-ky">
          Nhật ký hoạt động
        </Link>
      </nav>
    </main>
  )
}

function Metric({
  label,
  value,
  href,
  alarm = false,
}: {
  label: string
  value: string
  href?: string
  alarm?: boolean
}) {
  const content = (
    <>
      <span>{label}</span>
      <b>{value}</b>
    </>
  )
  const className = `rental-admin-metric${alarm ? ' is-alarm' : ''}`
  return href ? (
    <Link className={className} href={href}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  )
}
