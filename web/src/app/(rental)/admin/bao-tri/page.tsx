import { redirect } from 'next/navigation'
import { closeMaintenance, openMaintenance } from '@/features/admin/actions'
import { listAdminMaintenance, listAdminUnits } from '@/features/admin/server-data'
import { MAINTENANCE_REASON_LABELS, UNIT_STATE_LABELS } from '@/features/admin/labels'
import { getVerifiedAppRole } from '@/lib/supabase/auth'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: 'Bảo trì thiết bị — A.I.R',
}

export default async function AdminMaintenancePage({
  searchParams,
}: {
  searchParams: Promise<{ maintenance?: string }>
}) {
  const { user, role, supabase } = await getVerifiedAppRole()
  if (!user) redirect('/dang-nhap?next=%2Fadmin%2Fbao-tri')
  if (role !== 'staff' && role !== 'admin') redirect('/don-thue')
  const [units, records] = await Promise.all([
    listAdminUnits(supabase),
    listAdminMaintenance(supabase),
  ])
  const params = await searchParams
  const openRecords = records.filter((record) => record.completedOn === null)
  const eligibleUnits = units.filter(
    (unit) => unit.state === 'available' && unit.openMaintenanceId === null,
  )

  return (
    <main className="shell rental-page rental-admin">
      <div className="rental-heading">
        <p className="eyebrow">Vận hành</p>
        <h1>Bảo trì thiết bị</h1>
        <p className="rental-notice">
          Máy đang bảo trì sẽ bị rút khỏi lịch cho thuê. Hệ thống từ chối lịch bảo trì trùng với đơn
          đã giữ máy.
        </p>
      </div>
      {params.maintenance === 'opened' && (
        <p className="rental-message" role="status">
          Đã mở phiếu bảo trì.
        </p>
      )}
      {params.maintenance === 'closed' && (
        <p className="rental-message" role="status">
          Đã đóng phiếu bảo trì và trả máy về kho.
        </p>
      )}
      {(params.maintenance === 'failed' || params.maintenance === 'invalid') && (
        <p className="rental-error" role="alert">
          Chưa cập nhật được bảo trì. Kiểm tra lịch đặt máy, ngày kết thúc và phiếu đang mở.
        </p>
      )}

      <section className="rental-panel rental-admin-panel" aria-labelledby="admin-open-maintenance">
        <h2 id="admin-open-maintenance">Mở phiếu bảo trì</h2>
        {eligibleUnits.length === 0 ? (
          <p className="rental-admin-meta">Không có máy nào đang rảnh để đưa vào bảo trì.</p>
        ) : (
          <form
            action={openMaintenance}
            className="rental-form rental-admin-form"
            data-testid="admin-maintenance-form"
          >
            <label>
              Máy
              <select defaultValue={eligibleUnits[0]?.id ?? ''} name="unitId" required>
                {eligibleUnits.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.assetTag} · {unit.productName}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Lý do
              <select defaultValue="scheduled" name="reason">
                {Object.entries(MAINTENANCE_REASON_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Dự kiến xong
              <input
                defaultValue={addDays(todayInVietnam(), 3)}
                name="expectedEndOn"
                type="date"
                required
              />
            </label>
            <label>
              Ghi chú
              <textarea maxLength={500} name="notes" rows={2} />
            </label>
            <button className="primary" type="submit">
              Mở phiếu
            </button>
          </form>
        )}
      </section>

      <section aria-labelledby="admin-open-record" className="rental-admin-section">
        <h2 id="admin-open-record">Đang bảo trì ({openRecords.length})</h2>
        {openRecords.length === 0 ? (
          <p className="rental-panel">Không có máy nào đang bảo trì.</p>
        ) : (
          <div className="rental-admin-list" data-testid="admin-maintenance-open">
            {openRecords.map((record) => (
              <article className="rental-panel rental-admin-item" key={record.id}>
                <header>
                  <div>
                    <h3>{record.assetTag}</h3>
                    <p className="rental-admin-meta">
                      {record.productName} · {MAINTENANCE_REASON_LABELS[record.reason]} · từ{' '}
                      {record.startedOn} đến {record.expectedEndOn}
                    </p>
                  </div>
                  <span className="rental-payment-badge is-maintenance">
                    {UNIT_STATE_LABELS.maintenance}
                  </span>
                </header>
                {record.notes && <p>{record.notes}</p>}
                <form
                  action={closeMaintenance}
                  className="rental-form rental-admin-form"
                  data-testid="admin-close-maintenance"
                >
                  <input name="maintenanceId" type="hidden" value={record.id} />
                  <label>
                    Ngày hoàn tất
                    <input defaultValue={todayInVietnam()} name="completedOn" type="date" />
                  </label>
                  <button className="secondary" type="submit">
                    Đóng phiếu, trả máy về kho
                  </button>
                </form>
              </article>
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="admin-maintenance-history" className="rental-admin-section">
        <h2 id="admin-maintenance-history">Lịch sử ({records.length})</h2>
        {records.length === 0 ? (
          <p className="rental-panel">Chưa có phiếu bảo trì nào.</p>
        ) : (
          <div className="rental-admin-table-wrap">
            <table className="rental-admin-table">
              <caption className="sr-only">Lịch sử bảo trì thiết bị</caption>
              <thead>
                <tr>
                  <th scope="col">Máy</th>
                  <th scope="col">Lý do</th>
                  <th scope="col">Bắt đầu</th>
                  <th scope="col">Dự kiến xong</th>
                  <th scope="col">Hoàn tất</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id}>
                    <td>
                      {record.assetTag}
                      <small> · {record.productName}</small>
                    </td>
                    <td>{MAINTENANCE_REASON_LABELS[record.reason]}</td>
                    <td>{record.startedOn}</td>
                    <td>{record.expectedEndOn}</td>
                    <td>{record.completedOn ?? 'Đang mở'}</td>
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

function todayInVietnam() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date())
}

function addDays(value: string, days: number) {
  const date = new Date(`${value}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}
