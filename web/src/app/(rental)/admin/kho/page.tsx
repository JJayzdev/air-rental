import Link from 'next/link'
import { redirect } from 'next/navigation'
import { addAdminUnit, updateAdminUnitState } from '@/features/admin/actions'
import { listAdminProducts, listAdminUnits } from '@/features/admin/server-data'
import { UNIT_STATE_LABELS } from '@/features/admin/labels'
import { getVerifiedAppRole } from '@/lib/supabase/auth'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: 'Kho thiết bị',
}

export default async function AdminUnitsPage({
  searchParams,
}: {
  searchParams: Promise<{ unit?: string }>
}) {
  const { user, role, supabase } = await getVerifiedAppRole()
  if (!user) redirect('/dang-nhap?next=%2Fadmin%2Fkho')
  if (role !== 'admin') redirect('/admin?denied=admin')
  const [units, products] = await Promise.all([
    listAdminUnits(supabase),
    listAdminProducts(supabase),
  ])
  const params = await searchParams

  return (
    <main className="shell rental-page rental-admin">
      <div className="rental-heading">
        <p className="eyebrow">Quản trị</p>
        <h1>Kho thiết bị</h1>
        <p className="rental-notice">
          Mỗi máy là một đơn vị cho thuê riêng. Đưa máy vào bảo trì ở trang Bảo trì để hệ thống giữ
          chỗ và chặn đơn trùng lịch.
        </p>
      </div>
      {params.unit === 'added' && (
        <p className="rental-message" role="status">
          Đã thêm máy vào kho.
        </p>
      )}
      {params.unit === 'updated' && (
        <p className="rental-message" role="status">
          Đã cập nhật tình trạng máy.
        </p>
      )}
      {(params.unit === 'failed' || params.unit === 'invalid') && (
        <p className="rental-error" role="alert">
          Chưa cập nhật được kho. Mã máy không được trùng hoặc dữ liệu chưa hợp lệ.
        </p>
      )}

      <section className="rental-panel rental-admin-panel" aria-labelledby="admin-new-unit">
        <h2 id="admin-new-unit">Thêm máy</h2>
        <form
          action={addAdminUnit}
          className="rental-form rental-admin-form"
          data-testid="admin-unit-form"
        >
          <label>
            Sản phẩm
            <select defaultValue={products[0]?.id ?? ''} name="productId" required>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Mã máy
            <input name="assetTag" placeholder="AIR-CAM-007" required />
          </label>
          <label>
            Sẵn sàng từ ngày
            <input defaultValue={todayInVietnam()} name="readyOn" type="date" required />
          </label>
          <button className="primary" type="submit">
            Thêm máy
          </button>
        </form>
      </section>

      <section aria-labelledby="admin-unit-list" className="rental-admin-section">
        <h2 id="admin-unit-list">Danh sách ({units.length})</h2>
        {units.length === 0 ? (
          <p className="rental-panel">Kho chưa có máy nào.</p>
        ) : (
          <div className="rental-admin-list" data-testid="admin-units">
            {units.map((unit) => (
              <article className="rental-panel rental-admin-item" key={unit.id}>
                <header>
                  <div>
                    <h3>{unit.assetTag}</h3>
                    <p className="rental-admin-meta">
                      {unit.productName} · sẵn sàng từ {unit.readyOn}
                      {unit.openMaintenanceEndOn
                        ? ` · bảo trì đến ${unit.openMaintenanceEndOn}`
                        : ''}
                    </p>
                  </div>
                  <span className={`rental-payment-badge is-${unit.state}`}>
                    {UNIT_STATE_LABELS[unit.state]}
                  </span>
                </header>
                <div className="rental-admin-actions">
                  {unit.state === 'maintenance' ? (
                    <Link className="secondary" href="/admin/bao-tri">
                      Xem bảo trì
                    </Link>
                  ) : (
                    <form action={updateAdminUnitState}>
                      <input name="unitId" type="hidden" value={unit.id} />
                      <input
                        name="state"
                        type="hidden"
                        value={unit.state === 'available' ? 'retired' : 'available'}
                      />
                      <button className="secondary" type="submit">
                        {unit.state === 'available' ? 'Ngừng sử dụng' : 'Đưa lại vào kho'}
                      </button>
                    </form>
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

function todayInVietnam() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date())
}
