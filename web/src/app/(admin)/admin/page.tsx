import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAdminDashboard } from '@/features/admin/server-data'
import { listStaffRentalOrders } from '@/features/orders/server-data'
import { ORDER_STATE_LABELS } from '@/features/orders/state-labels'
import { getVerifiedAppRole } from '@/lib/supabase/auth'
import { money } from '@/lib/format'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: 'Bảng điều khiển',
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string }>
}) {
  const { user, role, supabase } = await getVerifiedAppRole()
  if (!user) redirect('/dang-nhap?next=%2Fadmin')
  if (role !== 'staff' && role !== 'admin') redirect('/don-thue')
  const params = await searchParams
  const [dashboard, recent] = await Promise.all([
    getAdminDashboard(supabase),
    listStaffRentalOrders(supabase, { page: 1 }),
  ])
  const latestOrders = recent.orders.slice(0, 6)
  const needsAttention =
    dashboard.pending_orders +
    dashboard.overdue_orders +
    dashboard.refunds_pending +
    dashboard.pending_identity_documents

  return (
    <main className="admin-page">
      <header className="admin-page-head">
        <div>
          <p className="admin-eyebrow">Tổng quan vận hành</p>
          <h1>Bảng điều khiển</h1>
          <p className="admin-page-sub">
            Số liệu theo giờ Việt Nam. Doanh thu chỉ tính giao dịch đã nhận tiền thành công trong
            tháng này.
          </p>
        </div>
        <div className="admin-head-actions">
          <Link className="admin-button admin-button-primary" href="/quan-ly-don">
            Xử lý đơn thuê
          </Link>
          <Link className="admin-button" href="/admin/nhat-ky">
            Nhật ký hoạt động
          </Link>
        </div>
      </header>

      {params.denied && (
        <p className="rental-error" role="alert">
          Chỉ quản trị viên mới được sửa sản phẩm, kho thiết bị, mã giảm giá và khu vực giao hàng.
        </p>
      )}

      <section aria-labelledby="admin-attention" className="admin-block">
        <div className="admin-block-head">
          <div>
            <h2 id="admin-attention">Cần xử lý</h2>
            <p>
              {needsAttention > 0
                ? `${needsAttention} việc đang chờ đội vận hành xử lý.`
                : 'Không có việc nào đang chờ. Mọi thứ đã được xử lý.'}
            </p>
          </div>
          <span className={`admin-pill${needsAttention > 0 ? ' is-alarm' : ' is-ok'}`}>
            {needsAttention > 0 ? `${needsAttention} việc` : 'Đã sạch việc'}
          </span>
        </div>
        <div className="admin-stat-grid">
          <Stat
            alarm={dashboard.pending_orders > 0}
            href="/quan-ly-don?state=pending"
            icon="orders"
            label="Đơn chờ xác nhận"
            value={String(dashboard.pending_orders)}
          />
          <Stat
            alarm={dashboard.overdue_orders > 0}
            href="/quan-ly-don?state=overdue"
            icon="clock"
            label="Đơn quá hạn trả"
            value={String(dashboard.overdue_orders)}
          />
          <Stat
            alarm={dashboard.refunds_pending > 0}
            href="/quan-ly-don"
            icon="refund"
            label="Cọc chờ hoàn"
            value={String(dashboard.refunds_pending)}
          />
          <Stat
            alarm={dashboard.pending_identity_documents > 0}
            href="/quan-ly-giay-to"
            icon="documents"
            label="Giấy tờ chờ duyệt"
            value={String(dashboard.pending_identity_documents)}
          />
        </div>
      </section>

      <section aria-labelledby="admin-today" className="admin-block">
        <div className="admin-block-head">
          <div>
            <h2 id="admin-today">Vận hành thiết bị</h2>
            <p>Tình trạng đơn thuê và kho máy đang ghi nhận trên hệ thống.</p>
          </div>
        </div>
        <div className="admin-stat-grid">
          <Stat
            href="/quan-ly-don?state=confirmed"
            icon="check"
            label="Đã xác nhận"
            value={String(dashboard.confirmed_orders)}
          />
          <Stat
            href="/quan-ly-don?state=active"
            icon="rental"
            label="Đang giao / đang thuê"
            value={String(dashboard.active_rentals)}
          />
          <Stat
            href="/admin/kho"
            icon="warehouse"
            label="Máy sẵn sàng"
            value={String(dashboard.available_units)}
          />
          <Stat
            alarm={dashboard.maintenance_units > 0}
            href="/admin/bao-tri"
            icon="maintenance"
            label="Máy đang bảo trì"
            value={String(dashboard.maintenance_units)}
          />
        </div>
      </section>

      <section aria-labelledby="admin-money" className="admin-block">
        <div className="admin-block-head">
          <div>
            <h2 id="admin-money">Dòng tiền tháng này</h2>
            <p>Tổng hợp doanh thu đã nhận và tiền cọc đã hoàn cho khách.</p>
          </div>
        </div>
        <div className="admin-money-grid">
          <div className="admin-money-card">
            <span>Doanh thu đã nhận</span>
            <strong>{money(dashboard.month_revenue_vnd)}</strong>
            <small>Giao dịch thành công trong tháng</small>
          </div>
          <div className="admin-money-card">
            <span>Đã hoàn tiền</span>
            <strong>{money(dashboard.month_refunds_vnd)}</strong>
            <small>Hoàn tiền thành công trong tháng</small>
          </div>
        </div>
      </section>

      <div className="admin-split">
        <section aria-labelledby="admin-recent" className="admin-block">
          <div className="admin-block-head">
            <div>
              <h2 id="admin-recent">Đơn thuê gần đây</h2>
              <p>6 đơn mới nhất trên toàn hệ thống.</p>
            </div>
            <Link className="admin-link" href="/quan-ly-don">
              Xem tất cả
            </Link>
          </div>
          {latestOrders.length === 0 ? (
            <p className="admin-empty">Chưa có đơn thuê nào.</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th scope="col">Đơn</th>
                    <th scope="col">Khách</th>
                    <th scope="col">Trạng thái</th>
                    <th scope="col">Tổng tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {latestOrders.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <Link href={`/quan-ly-don/${order.id}/phieu-ban-giao`}>{order.code}</Link>
                        <small>{formatDateTime(order.createdAt)}</small>
                      </td>
                      <td>
                        {order.customerName}
                        <small>{order.customerPhone}</small>
                      </td>
                      <td>
                        <span className={`admin-order-state is-${order.state}`}>
                          {ORDER_STATE_LABELS[order.state]}
                        </span>
                      </td>
                      <td>{money(order.totalVnd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <aside aria-labelledby="admin-actions" className="admin-block">
          <div className="admin-block-head">
            <div>
              <h2 id="admin-actions">Lối tắt</h2>
              <p>Mở nhanh các khu vực thường dùng.</p>
            </div>
          </div>
          <nav aria-label="Lối tắt quản trị" className="admin-action-list">
            <ActionLink
              href="/quan-ly-don"
              label="Quản lý đơn thuê"
              hint="Xác nhận, giao máy, thu hồi"
            />
            <ActionLink href="/quan-ly-giay-to" label="Duyệt giấy tờ" hint="CCCD/CMND của khách" />
            <ActionLink href="/admin/san-pham" label="Sản phẩm" hint="Giá thuê, mô tả, danh mục" />
            <ActionLink href="/admin/kho" label="Kho thiết bị" hint="Mã máy, trạng thái sẵn sàng" />
            <ActionLink
              href="/admin/ma-giam-gia"
              label="Mã giảm giá"
              hint="Chương trình và hạn dùng"
            />
            <ActionLink
              href="/admin/khu-vuc-giao"
              label="Khu vực giao"
              hint="Phí giao theo tỉnh/thành"
            />
          </nav>
        </aside>
      </div>
    </main>
  )
}

function Stat({
  label,
  value,
  href,
  icon,
  alarm = false,
}: {
  label: string
  value: string
  href: string
  icon: IconName
  alarm?: boolean
}) {
  return (
    <Link className={`admin-stat${alarm ? ' is-alarm' : ''}`} href={href}>
      <span className="admin-stat-icon">
        <StatIcon name={icon} />
      </span>
      <span className="admin-stat-body">
        <span>{label}</span>
        <b>{value}</b>
      </span>
      <span className="admin-stat-arrow" aria-hidden>
        →
      </span>
    </Link>
  )
}

function ActionLink({ href, label, hint }: { href: string; label: string; hint: string }) {
  return (
    <Link className="admin-action" href={href}>
      <span>
        <strong>{label}</strong>
        <small>{hint}</small>
      </span>
      <span aria-hidden>→</span>
    </Link>
  )
}

function formatDateTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

type IconName =
  'orders' | 'clock' | 'refund' | 'documents' | 'check' | 'rental' | 'warehouse' | 'maintenance'

function StatIcon({ name }: { name: IconName }) {
  return (
    <svg
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      viewBox="0 0 24 24"
    >
      {name === 'orders' && (
        <>
          <path d="M6 3h9l3 3v15H6z" />
          <path d="M9 10h6M9 14h6M9 18h4" />
        </>
      )}
      {name === 'clock' && (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </>
      )}
      {name === 'refund' && (
        <>
          <path d="M3 12a9 9 0 1 0 3-6.7" />
          <path d="M3 4v5h5" />
          <path d="M12 8v8M9 10h4a2 2 0 0 1 0 4H9" />
        </>
      )}
      {name === 'documents' && (
        <>
          <rect x="5" y="3" width="14" height="18" rx="2" />
          <path d="M9 8h6M9 12h6M9 16h3" />
        </>
      )}
      {name === 'check' && (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="m8 12 3 3 5-6" />
        </>
      )}
      {name === 'rental' && (
        <>
          <path d="M3 17h18" />
          <path d="M5 17V9l4-4h6l4 4v8" />
          <circle cx="8" cy="17" r="2" />
          <circle cx="16" cy="17" r="2" />
        </>
      )}
      {name === 'warehouse' && (
        <>
          <path d="M3 21V8l9-5 9 5v13" />
          <path d="M8 21v-7h8v7" />
        </>
      )}
      {name === 'maintenance' && (
        <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.3 2.3-2-2 2.3-2.3Z" />
      )}
    </svg>
  )
}
