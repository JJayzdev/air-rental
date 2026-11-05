import Link from 'next/link'
import { redirect } from 'next/navigation'
import { reviewIdentityDocument } from '@/features/account/identity-actions'
import { listRentalOrders } from '@/features/orders/server-data'
import { getVerifiedAppRole } from '@/lib/supabase/auth'
import { identityDocumentsEnabled } from '@/lib/supabase/service'
import type { IdentityDocumentRequestRow } from '@/lib/supabase/database'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Giấy tờ cần xem',
  robots: { index: false, follow: false },
}

export default async function StaffIdentityDocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ identity?: string }>
}) {
  const { supabase, user, role } = await getVerifiedAppRole()
  if (!user) redirect('/dang-nhap?next=%2Fquan-ly-giay-to')
  if (role !== 'staff' && role !== 'admin') redirect('/don-thue')
  const params = await searchParams
  if (!identityDocumentsEnabled())
    return (
      <main className="admin-page">
        <nav className="rental-breadcrumb">
          <Link href="/quan-ly-don">Quản lý đơn</Link>
          <span> / Giấy tờ</span>
        </nav>
        <h1>Giấy tờ cần xem</h1>
        <p className="rental-notice">Tính năng lưu giấy tờ hiện chưa được bật.</p>
      </main>
    )

  const { data, error } = await supabase
    .from('identity_document_requests')
    .select('id,user_id,requested_by,status,created_at,updated_at,reviewed_at,reviewed_by')
    .eq('status', 'pending_review')
    .order('created_at', { ascending: true })
  if (error) throw new Error('Không tải được danh sách giấy tờ cần xem. Vui lòng thử lại.')
  const requests = (data ?? []) as IdentityDocumentRequestRow[]
  const orders = await listRentalOrders(supabase)
  const requestViews = await Promise.all(
    requests.map(async (request) => {
      const recentOrder = orders.find((order) => order.userId === request.user_id)
      const signed = await supabase.storage
        .from('identity-documents')
        .createSignedUrl(`${request.user_id}/${request.id}`, 60)
      return { request, recentOrder, signedUrl: signed.data?.signedUrl }
    }),
  )

  return (
    <main className="admin-page">
      <nav className="rental-breadcrumb">
        <Link href="/quan-ly-don">Quản lý đơn</Link>
        <span> / Giấy tờ</span>
      </nav>
      <div className="rental-heading">
        <p className="eyebrow">Nhân viên</p>
        <h1>Giấy tờ cần xem</h1>
      </div>
      {params.identity === 'reviewed' && (
        <p className="rental-message" role="status">
          Đã lưu kết quả xem xét.
        </p>
      )}
      {params.identity === 'failed' && (
        <p className="rental-error" role="alert">
          Chưa cập nhật được kết quả. Yêu cầu có thể đã đổi trạng thái.
        </p>
      )}
      {params.identity === 'invalid' && (
        <p className="rental-error" role="alert">
          Yêu cầu xem xét không hợp lệ.
        </p>
      )}
      <p className="rental-notice">
        Xem thủ công để phục vụ đơn thuê; trạng thái này không xác minh tính xác thực của giấy tờ.
      </p>
      {requestViews.length === 0 ? (
        <section className="rental-panel">
          <p>Không có giấy tờ đang chờ.</p>
        </section>
      ) : (
        requestViews.map(({ request, recentOrder, signedUrl }) => (
          <section className="rental-panel rental-document-panel" key={request.id}>
            <h2>
              {recentOrder
                ? `${recentOrder.customerName} · ${recentOrder.customerPhone}`
                : 'Khách hàng có yêu cầu thuê'}
            </h2>
            <p>Được gửi ngày {formatDate(request.updated_at)}</p>
            {signedUrl ? (
              <a href={signedUrl} target="_blank" rel="noreferrer">
                Mở ảnh riêng tư (liên kết hết hạn sau 1 phút)
              </a>
            ) : (
              <p className="rental-error">Chưa mở được ảnh. Yêu cầu vẫn đang chờ.</p>
            )}
            <div className="rental-transition-actions">
              <form action={reviewIdentityDocument}>
                <input type="hidden" name="requestId" value={request.id} />
                <input type="hidden" name="decision" value="approved" />
                <button className="primary" type="submit">
                  Đã xem
                </button>
              </form>
              <form action={reviewIdentityDocument}>
                <input type="hidden" name="requestId" value={request.id} />
                <input type="hidden" name="decision" value="rejected" />
                <button className="secondary" type="submit">
                  Cần gửi lại
                </button>
              </form>
            </div>
          </section>
        ))
      )}
    </main>
  )
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}
