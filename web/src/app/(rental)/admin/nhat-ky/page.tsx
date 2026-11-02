import Link from 'next/link'
import { redirect } from 'next/navigation'
import { listAdminAuditEvents } from '@/features/admin/server-data'
import { ORDER_STATE_LABELS } from '@/features/orders/state-labels'
import { getVerifiedAppRole } from '@/lib/supabase/auth'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: 'Nhật ký hoạt động — A.I.R',
}

export default async function AdminAuditPage() {
  const { user, role, supabase } = await getVerifiedAppRole()
  if (!user) redirect('/dang-nhap?next=%2Fadmin%2Fnhat-ky')
  if (role !== 'staff' && role !== 'admin') redirect('/don-thue')
  const events = await listAdminAuditEvents(supabase)

  return (
    <main className="shell rental-page rental-admin">
      <div className="rental-heading">
        <p className="eyebrow">Vận hành</p>
        <h1>Nhật ký hoạt động</h1>
        <p className="rental-notice">
          100 thay đổi trạng thái đơn gần nhất, mới nhất ở trên. Nhật ký chỉ ghi thêm, không sửa
          được.
        </p>
      </div>
      {events.length === 0 ? (
        <p className="rental-panel">Chưa có hoạt động nào.</p>
      ) : (
        <div className="rental-admin-table-wrap">
          <table className="rental-admin-table" data-testid="admin-audit">
            <caption className="sr-only">Nhật ký thay đổi trạng thái đơn thuê</caption>
            <thead>
              <tr>
                <th scope="col">Thời điểm</th>
                <th scope="col">Đơn</th>
                <th scope="col">Khách</th>
                <th scope="col">Thay đổi</th>
                <th scope="col">Người thao tác</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id}>
                  <td>
                    <time dateTime={event.createdAt}>
                      {new Date(event.createdAt).toLocaleString('vi-VN', {
                        timeZone: 'Asia/Ho_Chi_Minh',
                      })}
                    </time>
                  </td>
                  <td>
                    <Link href={`/don-thue/${event.orderId}`}>{event.orderCode}</Link>
                  </td>
                  <td>{event.customerName}</td>
                  <td>
                    {event.fromState ? `${ORDER_STATE_LABELS[event.fromState]} → ` : ''}
                    {ORDER_STATE_LABELS[event.toState]}
                  </td>
                  <td>{event.actorId ? event.actorId.slice(0, 8) : 'Hệ thống'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}
