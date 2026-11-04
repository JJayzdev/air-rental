import Link from 'next/link'
import {
  deleteOwnIdentityDocument,
  uploadOwnIdentityDocument,
} from '@/features/account/identity-actions'
import { requireVerifiedUser } from '@/lib/supabase/auth'
import { identityDocumentsEnabled } from '@/lib/supabase/service'
import type { IdentityDocumentRequestRow } from '@/lib/supabase/database'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Giấy tờ định danh',
  robots: { index: false, follow: false },
}

const STATUS_LABELS = {
  requested: 'Nhân viên đã yêu cầu giấy tờ',
  pending_review: 'Đang chờ nhân viên xem',
  approved: 'Đã xem xong',
  rejected: 'Cần gửi lại theo hướng dẫn của cửa hàng',
  cancelled: 'Đã hủy yêu cầu',
} as const

export default async function OwnIdentityDocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ document?: string }>
}) {
  const { supabase, user } = await requireVerifiedUser('/tai-khoan/giay-to')
  const { data, error } = await supabase
    .from('identity_document_requests')
    .select('id,user_id,requested_by,status,created_at,updated_at,reviewed_at,reviewed_by')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
  if (error) throw new Error('Không tải được trạng thái giấy tờ. Vui lòng thử lại.')
  const requests = (data ?? []) as IdentityDocumentRequestRow[]
  const enabled = identityDocumentsEnabled()
  const params = await searchParams
  const requestViews = await Promise.all(
    requests.map(async (request) => ({
      request,
      signedUrl:
        enabled && request.status === 'pending_review'
          ? (
              await supabase.storage
                .from('identity-documents')
                .createSignedUrl(`${user.id}/${request.id}`, 60)
            ).data?.signedUrl
          : undefined,
    })),
  )
  return (
    <main className="shell rental-page">
      <nav className="rental-breadcrumb">
        <Link href="/tai-khoan">Tài khoản</Link>
        <span> / Giấy tờ định danh</span>
      </nav>
      <div className="rental-heading">
        <p className="eyebrow">Tùy chọn</p>
        <h1>Giấy tờ định danh</h1>
      </div>
      <p className="rental-notice">
        Chỉ gửi khi nhân viên yêu cầu cho đơn cụ thể. Không bắt buộc để tạo đơn thuê; nhân viên xem
        thủ công, không xác minh tự động với cơ quan nhà nước.
      </p>
      {params.document && <DocumentMessage value={params.document} />}
      {!enabled && <p className="rental-notice">Tính năng lưu giấy tờ hiện chưa được bật.</p>}
      {requests.length === 0 && (
        <section className="rental-panel">
          <p>Chưa có yêu cầu giấy tờ.</p>
        </section>
      )}
      {requestViews.map(({ request, signedUrl }) => {
        return (
          <section className="rental-panel rental-document-panel" key={request.id}>
            <h2>{STATUS_LABELS[request.status]}</h2>
            <p>Yêu cầu ngày {formatDate(request.created_at)}</p>
            {request.status === 'requested' && enabled && (
              <form action={uploadOwnIdentityDocument} className="rental-form">
                <input type="hidden" name="requestId" value={request.id} />
                <label>
                  Ảnh giấy tờ (JPEG hoặc PNG, tối đa 5 MB)
                  <input name="document" type="file" accept="image/jpeg,image/png" required />
                </label>
                <button className="primary" type="submit">
                  Gửi để nhân viên xem
                </button>
              </form>
            )}
            {request.status === 'pending_review' && (
              <>
                <p>Nhân viên sẽ xem tài liệu riêng tư trong cửa hàng.</p>
                {signedUrl && (
                  <a href={signedUrl} target="_blank" rel="noreferrer">
                    Mở ảnh đã gửi (liên kết hết hạn sau 1 phút)
                  </a>
                )}
              </>
            )}
            {request.status === 'approved' && (
              <p>Đã xem ngày {request.reviewed_at ? formatDate(request.reviewed_at) : '—'}.</p>
            )}
            {request.status === 'rejected' && (
              <p>Liên hệ cửa hàng để biết hướng dẫn trước khi gửi lại.</p>
            )}
            {enabled && ['requested', 'pending_review'].includes(request.status) && (
              <form action={deleteOwnIdentityDocument} className="rental-delete-address">
                <input type="hidden" name="requestId" value={request.id} />
                <button className="secondary" type="submit">
                  Hủy và xóa giấy tờ
                </button>
              </form>
            )}
          </section>
        )
      })}
    </main>
  )
}

function DocumentMessage({ value }: { value: string }) {
  const messages: Record<string, { text: string; error?: boolean }> = {
    submitted: { text: 'Đã gửi ảnh riêng tư cho nhân viên xem.' },
    deleted: { text: 'Đã hủy yêu cầu và xóa ảnh.' },
    disabled: { text: 'Tính năng lưu giấy tờ hiện chưa được bật.', error: true },
    invalid: { text: 'Yêu cầu giấy tờ không hợp lệ.', error: true },
    missing: { text: 'Chọn ảnh JPEG hoặc PNG để gửi.', error: true },
    'invalid-file': { text: 'Ảnh không đúng định dạng hoặc vượt quá giới hạn 5 MB.', error: true },
    unavailable: { text: 'Yêu cầu này không còn nhận ảnh.', error: true },
    'upload-failed': { text: 'Chưa tải được ảnh lên. Vui lòng thử lại.', error: true },
    'submit-failed': { text: 'Chưa gửi được ảnh để nhân viên xem. Vui lòng thử lại.', error: true },
    'delete-failed': { text: 'Chưa xóa được ảnh. Có thể thử lại.', error: true },
  }
  const message = messages[value]
  return message ? (
    <p className={message.error ? 'rental-error' : 'rental-message'} role="status">
      {message.text}
    </p>
  ) : null
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    dateStyle: 'medium',
  }).format(new Date(value))
}
