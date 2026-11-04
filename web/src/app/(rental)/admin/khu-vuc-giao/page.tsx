import { redirect } from 'next/navigation'
import { saveAdminDeliveryZone } from '@/features/admin/actions'
import { listAdminDeliveryZones } from '@/features/admin/server-data'
import { getVerifiedAppRole } from '@/lib/supabase/auth'
import { money } from '@/lib/format'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: 'Khu vực giao hàng',
}

export default async function AdminDeliveryZonesPage({
  searchParams,
}: {
  searchParams: Promise<{ zone?: string }>
}) {
  const { user, role, supabase } = await getVerifiedAppRole()
  if (!user) redirect('/dang-nhap?next=%2Fadmin%2Fkhu-vuc-giao')
  if (role !== 'admin') redirect('/admin?denied=admin')
  const zones = await listAdminDeliveryZones(supabase)
  const params = await searchParams

  return (
    <main className="shell rental-page rental-admin">
      <div className="rental-heading">
        <p className="eyebrow">Quản trị</p>
        <h1>Khu vực giao hàng</h1>
        <p className="rental-notice">
          Phí giao cộng sau khi trừ mã giảm giá. Ngưỡng miễn phí so với tiền thuê còn lại sau giảm;
          đơn nhận tại cửa hàng không có phí giao.
        </p>
      </div>
      {params.zone === 'saved' && (
        <p className="rental-message" role="status">
          Đã lưu khu vực giao hàng.
        </p>
      )}
      {(params.zone === 'failed' || params.zone === 'invalid') && (
        <p className="rental-error" role="alert">
          Chưa lưu được khu vực. Kiểm tra tên trùng, phí giao và ngưỡng miễn phí.
        </p>
      )}

      <section className="rental-panel rental-admin-panel" aria-labelledby="admin-new-zone">
        <h2 id="admin-new-zone">Thêm khu vực</h2>
        <form
          action={saveAdminDeliveryZone}
          className="rental-form rental-admin-form"
          data-testid="admin-zone-form"
        >
          <input name="zoneId" type="hidden" value="" />
          <label>
            Tên khu vực
            <input name="name" maxLength={80} required />
          </label>
          <label>
            Phí giao (VND)
            <input defaultValue="0" inputMode="numeric" name="feeVnd" required />
          </label>
          <label>
            Miễn phí giao từ (VND, bỏ trống = không miễn)
            <input inputMode="numeric" name="freeFromVnd" />
          </label>
          <label>
            Ghi chú
            <input maxLength={200} name="notes" />
          </label>
          <label>
            Thứ tự
            <input defaultValue="0" inputMode="numeric" name="sortOrder" required />
          </label>
          <label className="rental-admin-check">
            <input defaultChecked name="active" type="checkbox" />
            Đang dùng
          </label>
          <button className="primary" type="submit">
            Tạo khu vực
          </button>
        </form>
      </section>

      <section aria-labelledby="admin-zone-list" className="rental-admin-section">
        <h2 id="admin-zone-list">Danh sách ({zones.length})</h2>
        {zones.length === 0 ? (
          <p className="rental-panel">Chưa có khu vực giao hàng.</p>
        ) : (
          <div className="rental-admin-list" data-testid="admin-zones">
            {zones.map((zone) => (
              <article className="rental-panel rental-admin-item" key={zone.id}>
                <header>
                  <div>
                    <h3>{zone.name}</h3>
                    <p className="rental-admin-meta">
                      Phí {money(zone.feeVnd)} ·{' '}
                      {zone.freeFromVnd === null
                        ? 'không miễn phí'
                        : `miễn phí từ ${money(zone.freeFromVnd)}`}{' '}
                      · thứ tự {zone.sortOrder}
                    </p>
                  </div>
                  <span
                    className={`rental-payment-badge is-${zone.active ? 'active' : 'archived'}`}
                  >
                    {zone.active ? 'Đang dùng' : 'Đang tắt'}
                  </span>
                </header>
                {zone.notes && <p>{zone.notes}</p>}
                <details className="rental-admin-details">
                  <summary>Chỉnh sửa</summary>
                  <form action={saveAdminDeliveryZone} className="rental-form rental-admin-form">
                    <input name="zoneId" type="hidden" value={zone.id} />
                    <label>
                      Tên khu vực
                      <input defaultValue={zone.name} name="name" maxLength={80} required />
                    </label>
                    <label>
                      Phí giao (VND)
                      <input
                        defaultValue={String(zone.feeVnd)}
                        inputMode="numeric"
                        name="feeVnd"
                        required
                      />
                    </label>
                    <label>
                      Miễn phí giao từ (VND)
                      <input
                        defaultValue={zone.freeFromVnd === null ? '' : String(zone.freeFromVnd)}
                        inputMode="numeric"
                        name="freeFromVnd"
                      />
                    </label>
                    <label>
                      Ghi chú
                      <input defaultValue={zone.notes} maxLength={200} name="notes" />
                    </label>
                    <label>
                      Thứ tự
                      <input
                        defaultValue={String(zone.sortOrder)}
                        inputMode="numeric"
                        name="sortOrder"
                        required
                      />
                    </label>
                    <label className="rental-admin-check">
                      <input defaultChecked={zone.active} name="active" type="checkbox" />
                      Đang dùng
                    </label>
                    <button className="primary" type="submit">
                      Lưu thay đổi
                    </button>
                  </form>
                </details>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
