import { redirect } from 'next/navigation'
import { saveAdminDiscountCode } from '@/features/admin/actions'
import { listAdminDiscountCodes } from '@/features/admin/server-data'
import { DISCOUNT_KIND_LABELS, discountCodeState } from '@/features/admin/labels'
import { getVerifiedAppRole } from '@/lib/supabase/auth'
import { dateVN, money } from '@/lib/format'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: 'Mã giảm giá',
}

export default async function AdminDiscountsPage({
  searchParams,
}: {
  searchParams: Promise<{ discount?: string }>
}) {
  const { user, role, supabase } = await getVerifiedAppRole()
  if (!user) redirect('/dang-nhap?next=%2Fadmin%2Fma-giam-gia')
  if (role !== 'admin') redirect('/admin?denied=admin')
  const codes = await listAdminDiscountCodes(supabase)
  const params = await searchParams

  return (
    <main className="admin-page rental-admin">
      <div className="rental-heading">
        <p className="eyebrow">Quản trị</p>
        <h1>Mã giảm giá</h1>
        <p className="rental-notice">
          Mã chỉ áp lên tiền thuê, không giảm tiền cọc. Mỗi đơn dùng một mã; lượt dùng tăng khi đơn
          được giữ thiết bị thành công.
        </p>
      </div>
      {params.discount === 'saved' && (
        <p className="rental-message" role="status">
          Đã lưu mã giảm giá.
        </p>
      )}
      {(params.discount === 'failed' || params.discount === 'invalid') && (
        <p className="rental-error" role="alert">
          Chưa lưu được mã. Kiểm tra mã trùng, giá trị giảm, ngày hiệu lực và số lượt.
        </p>
      )}

      <section className="rental-panel rental-admin-panel" aria-labelledby="admin-new-discount">
        <h2 id="admin-new-discount">Thêm mã</h2>
        <form
          action={saveAdminDiscountCode}
          className="rental-form rental-admin-form"
          data-testid="admin-discount-form"
        >
          <input name="discountId" type="hidden" value="" />
          <label>
            Mã
            <input name="code" placeholder="WELCOME10" maxLength={32} required />
          </label>
          <label>
            Mô tả
            <input name="description" maxLength={200} />
          </label>
          <label>
            Kiểu giảm
            <select defaultValue="percent" name="kind">
              {Object.entries(DISCOUNT_KIND_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Giá trị (%, hoặc VND)
            <input inputMode="numeric" name="value" required />
          </label>
          <label>
            Tiền thuê tối thiểu (VND)
            <input defaultValue="0" inputMode="numeric" name="minSubtotalVnd" required />
          </label>
          <label>
            Số lượt tối đa (bỏ trống = không giới hạn)
            <input inputMode="numeric" name="maxUses" />
          </label>
          <label>
            Bắt đầu
            <input name="startsOn" type="date" />
          </label>
          <label>
            Kết thúc
            <input name="endsOn" type="date" />
          </label>
          <label className="rental-admin-check">
            <input defaultChecked name="active" type="checkbox" />
            Đang bật
          </label>
          <button className="primary" type="submit">
            Tạo mã
          </button>
        </form>
      </section>

      <section aria-labelledby="admin-discount-list" className="rental-admin-section">
        <h2 id="admin-discount-list">Danh sách ({codes.length})</h2>
        {codes.length === 0 ? (
          <p className="rental-panel">Chưa có mã giảm giá.</p>
        ) : (
          <div className="rental-admin-list" data-testid="admin-discounts">
            {codes.map((code) => {
              const state = discountCodeState(code)
              return (
                <article className="rental-panel rental-admin-item" key={code.id}>
                  <header>
                    <div>
                      <h3>{code.code}</h3>
                      <p className="rental-admin-meta">
                        {DISCOUNT_KIND_LABELS[code.kind]} ·{' '}
                        {code.kind === 'percent' ? `${code.value}%` : money(code.value)} · đơn từ{' '}
                        {money(code.minSubtotalVnd)} · đã dùng {code.usedCount}/
                        {code.maxUses ?? '∞'}
                      </p>
                    </div>
                    <span className={`rental-payment-badge is-${state.tone}`}>{state.label}</span>
                  </header>
                  {code.description && <p>{code.description}</p>}
                  <p className="rental-admin-meta">
                    {code.startsOn ? `Từ ${dateVN(code.startsOn)}` : 'Không giới hạn ngày bắt đầu'}{' '}
                    · {code.endsOn ? `đến ${dateVN(code.endsOn)}` : 'không có ngày kết thúc'}
                  </p>
                  <details className="rental-admin-details">
                    <summary>Chỉnh sửa</summary>
                    <form action={saveAdminDiscountCode} className="rental-form rental-admin-form">
                      <input name="discountId" type="hidden" value={code.id} />
                      <label>
                        Mã
                        <input defaultValue={code.code} name="code" maxLength={32} required />
                      </label>
                      <label>
                        Mô tả
                        <input defaultValue={code.description} name="description" maxLength={200} />
                      </label>
                      <label>
                        Kiểu giảm
                        <select defaultValue={code.kind} name="kind">
                          {Object.entries(DISCOUNT_KIND_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Giá trị (%, hoặc VND)
                        <input
                          defaultValue={String(code.value)}
                          inputMode="numeric"
                          name="value"
                          required
                        />
                      </label>
                      <label>
                        Tiền thuê tối thiểu (VND)
                        <input
                          defaultValue={String(code.minSubtotalVnd)}
                          inputMode="numeric"
                          name="minSubtotalVnd"
                          required
                        />
                      </label>
                      <label>
                        Số lượt tối đa
                        <input
                          defaultValue={code.maxUses === null ? '' : String(code.maxUses)}
                          inputMode="numeric"
                          name="maxUses"
                        />
                      </label>
                      <label>
                        Bắt đầu
                        <input defaultValue={code.startsOn ?? ''} name="startsOn" type="date" />
                      </label>
                      <label>
                        Kết thúc
                        <input defaultValue={code.endsOn ?? ''} name="endsOn" type="date" />
                      </label>
                      <label className="rental-admin-check">
                        <input defaultChecked={code.active} name="active" type="checkbox" />
                        Đang bật
                      </label>
                      <button className="primary" type="submit">
                        Lưu thay đổi
                      </button>
                    </form>
                  </details>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}
