import Link from 'next/link'
import { deleteOwnAddress, saveOwnAddress } from '@/features/account/actions'
import { requireVerifiedUser } from '@/lib/supabase/auth'
import type { CustomerAddressRow } from '@/lib/supabase/database'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Sổ địa chỉ — A.I.R',
  robots: { index: false, follow: false },
}

export default async function CustomerAddressesPage({
  searchParams,
}: {
  searchParams: Promise<{ address?: string }>
}) {
  const { supabase, user } = await requireVerifiedUser('/tai-khoan/dia-chi')
  const { data, error } = await supabase
    .from('customer_addresses')
    .select(
      'id,user_id,label,recipient_name,phone,address_line,ward,district,province,is_default,created_at,updated_at',
    )
    .eq('user_id', user.id)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw new Error('Không tải được sổ địa chỉ. Vui lòng thử lại.')
  const addresses = (data ?? []) as CustomerAddressRow[]
  const params = await searchParams

  return (
    <main className="shell rental-page">
      <nav className="rental-breadcrumb">
        <Link href="/tai-khoan">Tài khoản</Link>
        <span> / Sổ địa chỉ</span>
      </nav>
      <div className="rental-heading">
        <p className="eyebrow">Tài khoản</p>
        <h1>Sổ địa chỉ</h1>
      </div>
      {params.address === 'saved' && (
        <p className="rental-message" role="status">
          Đã lưu địa chỉ.
        </p>
      )}
      {params.address === 'deleted' && (
        <p className="rental-message" role="status">
          Đã xóa địa chỉ.
        </p>
      )}
      {params.address === 'invalid' && (
        <p className="rental-error" role="alert">
          Vui lòng kiểm tra thông tin địa chỉ.
        </p>
      )}
      {params.address === 'failed' && (
        <p className="rental-error" role="alert">
          Chưa thể cập nhật địa chỉ. Vui lòng thử lại.
        </p>
      )}
      {addresses.map((address) => (
        <AddressForm key={address.id} address={address} />
      ))}
      <AddressForm />
    </main>
  )
}

function AddressForm({ address }: { address?: CustomerAddressRow }) {
  return (
    <section className="rental-panel rental-address-panel">
      <h2>{address ? address.label : 'Thêm địa chỉ'}</h2>
      {address?.is_default && <span className="rental-status">Mặc định</span>}
      <form action={saveOwnAddress} className="rental-form">
        <input type="hidden" name="addressId" value={address?.id ?? ''} />
        <label>
          Tên gợi nhớ
          <input name="label" required maxLength={40} defaultValue={address?.label ?? ''} />
        </label>
        <label>
          Người nhận
          <input
            name="recipientName"
            autoComplete="name"
            required
            maxLength={120}
            defaultValue={address?.recipient_name ?? ''}
          />
        </label>
        <label>
          Số điện thoại liên hệ
          <input
            name="phone"
            type="tel"
            autoComplete="tel"
            required
            defaultValue={address?.phone ?? ''}
          />
        </label>
        <label>
          Địa chỉ cụ thể
          <input
            name="addressLine"
            autoComplete="address-line1"
            required
            maxLength={180}
            defaultValue={address?.address_line ?? ''}
          />
        </label>
        <label>
          Phường/xã
          <input
            name="ward"
            autoComplete="address-level3"
            required
            maxLength={100}
            defaultValue={address?.ward ?? ''}
          />
        </label>
        <label>
          Quận/huyện
          <input
            name="district"
            autoComplete="address-level2"
            required
            maxLength={100}
            defaultValue={address?.district ?? ''}
          />
        </label>
        <label>
          Tỉnh/thành
          <input
            name="province"
            autoComplete="address-level1"
            required
            maxLength={100}
            defaultValue={address?.province ?? ''}
          />
        </label>
        <label className="rental-checkbox">
          <input
            type="checkbox"
            name="isDefault"
            value="true"
            defaultChecked={address?.is_default ?? !address}
          />{' '}
          Đặt làm địa chỉ mặc định
        </label>
        <input type="hidden" name="isDefault" value="false" />
        <button className="primary" type="submit">
          {address ? 'Lưu thay đổi' : 'Thêm địa chỉ'}
        </button>
      </form>
      {address && (
        <form action={deleteOwnAddress} className="rental-delete-address">
          <input type="hidden" name="addressId" value={address.id} />
          <button className="secondary" type="submit">
            Xóa địa chỉ
          </button>
        </form>
      )}
    </section>
  )
}
