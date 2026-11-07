/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from 'next/navigation'
import { approvePartner, rejectPartner } from '@/features/admin/actions'
import { getVerifiedAppRole } from '@/lib/supabase/auth'
import { money } from '@/lib/format'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: 'Đối tác',
}

export default async function AdminPartnersPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>
}) {
  const { user, role, supabase } = await getVerifiedAppRole()
  if (!user) redirect('/dang-nhap?next=%2Fadmin%2Fdoi-tac')
  if (role !== 'admin') redirect('/admin?denied=admin')
  const params = await searchParams

  const { data: partners } = (await supabase
    .from('partners')
    .select(
      'id, display_name, contact_name, description, email, phone, tax_code, commission_rate, status, created_at',
    )
    .order('created_at', { ascending: false })) as { data: any[] }

  return (
    <main className="admin-page rental-admin">
      <div className="rental-heading">
        <p className="eyebrow">Quản trị</p>
        <h1>Đối tác</h1>
        <p className="rental-notice">
          Duyệt hoặc từ chối yêu cầu đăng ký đối tác. Đối tác được phép thêm sản phẩm của bản thân
          và nhận doanh thu theo quy tắc hoa hồng.
        </p>
      </div>

      {params.saved === 'approved' && (
        <p className="rental-message" role="status">
          Đã duyệt đối tác.
        </p>
      )}
      {params.saved === 'rejected' && (
        <p className="rental-message" role="status">
          Đã từ chối đối tác.
        </p>
      )}
      {params.error && (
        <p className="rental-error" role="alert">
          Không xử lý được yêu cầu. Vui lòng thử lại.
        </p>
      )}

      <section aria-labelledby="admin-partners" className="rental-admin-section">
        <h2 id="admin-partners">Danh sách đối tác</h2>
        {partners.length === 0 ? (
          <p className="rental-panel">Chưa có đối tác nào đăng ký.</p>
        ) : (
          <div className="rental-admin-list" data-testid="admin-partners">
            {partners.map((partner: any) => (
              <article className="rental-panel rental-admin-item" key={partner.id}>
                <header>
                  <div>
                    <h3>{partner.display_name}</h3>
                    <p className="rental-admin-meta">
                      {partner.contact_name ? `${partner.contact_name} · ` : ''}
                      {partner.email} · {partner.phone ?? '—'}
                      {partner.tax_code ? ` · MST: ${partner.tax_code}` : ''}
                    </p>
                  </div>
                  <span
                    className={`rental-payment-badge is-${partner.status === 'active' ? 'active' : partner.status === 'rejected' ? 'archived' : 'draft'}`}
                  >
                    {partner.status === 'active'
                      ? 'Đang hoạt động'
                      : partner.status === 'rejected'
                        ? 'Từ chối'
                        : 'Chờ duyệt'}
                  </span>
                </header>
                {partner.description ? <p>{partner.description}</p> : null}
                <p>
                  Hoa hồng hệ thống: {money(partner.commission_rate)}% · Đối tác nhận{' '}
                  {100 - Number(partner.commission_rate)}%
                </p>
                <div className="rental-admin-actions">
                  {partner.status === 'pending' && (
                    <>
                      <form
                        action={approvePartner}
                        className="rental-admin-form"
                        style={{ display: 'inline' }}
                      >
                        <input name="partnerId" type="hidden" value={partner.id} />
                        <button className="primary" type="submit">
                          Duyệt
                        </button>
                      </form>
                      <form
                        action={rejectPartner}
                        className="rental-admin-form"
                        style={{ display: 'inline' }}
                      >
                        <input name="partnerId" type="hidden" value={partner.id} />
                        <button type="submit">Từ chối</button>
                      </form>
                    </>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
