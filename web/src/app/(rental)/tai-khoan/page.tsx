import Link from 'next/link'
import { requireVerifiedUser } from '@/lib/supabase/auth'
import { updateOwnProfile } from '@/features/account/actions'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Tài khoản',
  robots: { index: false, follow: false },
}

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ profile?: string }>
}) {
  const { supabase, user } = await requireVerifiedUser('/tai-khoan')
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('full_name,phone')
    .eq('id', user.id)
    .maybeSingle()
  if (error) throw new Error('Không tải được hồ sơ tài khoản. Vui lòng thử lại.')
  const params = await searchParams

  return (
    <main className="shell rental-page">
      <div className="rental-heading">
        <p className="eyebrow">Tài khoản</p>
        <h1>Thông tin của tôi</h1>
      </div>
      {params.profile === 'saved' && (
        <p className="rental-message" role="status">
          Đã cập nhật thông tin liên hệ.
        </p>
      )}
      {params.profile === 'invalid' && (
        <p className="rental-error" role="alert">
          Tên hoặc số điện thoại chưa hợp lệ.
        </p>
      )}
      {params.profile === 'failed' && (
        <p className="rental-error" role="alert">
          Chưa cập nhật được hồ sơ. Vui lòng thử lại.
        </p>
      )}
      <section className="rental-panel rental-account-panel">
        <h2>Thông tin liên hệ</h2>
        <form className="rental-form" action={updateOwnProfile} data-testid="profile-form">
          <label htmlFor="profile-name">Họ và tên</label>
          <input
            id="profile-name"
            name="fullName"
            autoComplete="name"
            required
            minLength={2}
            maxLength={120}
            defaultValue={profile?.full_name ?? ''}
          />
          <label htmlFor="profile-phone">Số điện thoại liên hệ (chưa xác minh)</label>
          <input
            id="profile-phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            defaultValue={profile?.phone ?? ''}
          />
          <small>
            Số điện thoại này chỉ dùng làm thông tin liên hệ; tài khoản hiện đăng nhập bằng email.
          </small>
          <button className="primary" type="submit">
            Lưu thông tin
          </button>
        </form>
      </section>
      <section className="rental-panel rental-account-panel">
        <h2>Địa chỉ nhận hàng</h2>
        <p>Quản lý địa chỉ giao máy và chọn địa chỉ mặc định cho lần đặt thuê tiếp theo.</p>
        <Link href="/tai-khoan/dia-chi">Quản lý sổ địa chỉ</Link>
      </section>
      <section className="rental-panel rental-account-panel">
        <h2>Yêu thích</h2>
        <p>Xem thiết bị đã lưu.</p>
        <Link href="/yeu-thich">Mở danh sách yêu thích</Link>
      </section>
      <section className="rental-panel rental-account-panel">
        <h2>Giấy tờ định danh (tùy chọn)</h2>
        <p>Chỉ tải giấy tờ lên nếu nhân viên cửa hàng yêu cầu. Không bắt buộc để đặt thuê.</p>
        <Link href="/tai-khoan/giay-to">Quản lý giấy tờ định danh</Link>
      </section>
      <section className="rental-panel rental-account-panel">
        <h2>Đơn thuê</h2>
        <p>Xem trạng thái và lịch sử các yêu cầu của bạn.</p>
        <Link href="/don-thue">Mở đơn thuê</Link>
      </section>
    </main>
  )
}
