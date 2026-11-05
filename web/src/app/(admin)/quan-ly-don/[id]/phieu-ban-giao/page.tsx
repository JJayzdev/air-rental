import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { z } from 'zod'
import { getRentalOrder, listAssignedUnitsForOrders } from '@/features/orders/server-data'
import { ORDER_STATE_LABELS } from '@/features/orders/state-labels'
import { PrintInvoiceButton } from '@/features/payments/print-button'
import { getVerifiedAppRole } from '@/lib/supabase/auth'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: 'Phiếu bàn giao thiết bị',
}

export default async function HandoverSheetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!z.string().uuid().safeParse(id).success) notFound()
  const { user, role, supabase } = await getVerifiedAppRole()
  if (!user) redirect(`/dang-nhap?next=${encodeURIComponent(`/quan-ly-don/${id}/phieu-ban-giao`)}`)
  if (role !== 'staff' && role !== 'admin') redirect(`/don-thue/${id}`)
  const order = await getRentalOrder(supabase, id)
  if (!order) notFound()
  const units = await listAssignedUnitsForOrders(supabase, [order.id])

  return (
    <main className="admin-page rental-invoice rental-handover">
      <nav className="rental-breadcrumb rental-no-print">
        <Link href="/quan-ly-don">Quản lý đơn</Link>
        <span> / Phiếu bàn giao</span>
      </nav>
      <article className="rental-panel rental-invoice-sheet">
        <header className="rental-invoice-header">
          <div>
            <p className="eyebrow">A.I.R — Thiết bị công nghệ cho thuê</p>
            <h1>Phiếu bàn giao thiết bị</h1>
            <p>Mã đơn: {order.code}</p>
          </div>
          <div className="rental-invoice-meta">
            <span>{ORDER_STATE_LABELS[order.state]}</span>
            <time dateTime={order.createdAt}>
              Lập ngày{' '}
              {new Date(order.createdAt).toLocaleDateString('vi-VN', {
                timeZone: 'Asia/Ho_Chi_Minh',
              })}
            </time>
          </div>
        </header>

        <section className="rental-invoice-customer">
          <h2>Khách nhận thiết bị</h2>
          <p>{order.customerName}</p>
          <p>{order.customerPhone}</p>
          <p>{order.fulfillment === 'delivery' ? order.deliveryAddress : 'Nhận tại cửa hàng'}</p>
          {order.fulfillment === 'delivery' && order.deliveryZoneName && (
            <p>Khu vực giao: {order.deliveryZoneName}</p>
          )}
        </section>

        <table className="rental-invoice-table">
          <caption className="sr-only">Thiết bị bàn giao</caption>
          <thead>
            <tr>
              <th scope="col">Thiết bị</th>
              <th scope="col">Mã máy</th>
              <th scope="col">Thời gian thuê</th>
              <th scope="col">Tình trạng khi giao</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => {
              const unit = units.get(item.id)
              return (
                <tr key={item.id}>
                  <td>{item.productName}</td>
                  <td>{unit?.assetTag ?? 'Chưa gán máy'}</td>
                  <td>
                    {formatDate(item.rentalStart)} – {formatDate(item.rentalEnd)}
                  </td>
                  <td>…………………………………</td>
                </tr>
              )
            })}
          </tbody>
        </table>

        <section className="rental-handover-checklist">
          <h2>Kiểm tra khi bàn giao</h2>
          <ul>
            <li>Ngoại hình: không móp, không nứt, không trầy sâu.</li>
            <li>Màn hình / ống kính: không điểm chết, không xước.</li>
            <li>Phụ kiện: sạc, cáp, pin, túi đựng đủ theo sản phẩm.</li>
            <li>
              Khách đã kiểm tra máy và đồng ý tình trạng ghi trong phiếu; tiền cọc đã được xác nhận
              theo đơn.
            </li>
          </ul>
        </section>

        <section className="rental-handover-signatures">
          <div>
            <span>Khách hàng</span>
            <small>Ký, ghi rõ họ tên</small>
          </div>
          <div>
            <span>Nhân viên bàn giao</span>
            <small>Ký, ghi rõ họ tên</small>
          </div>
        </section>

        <p className="rental-notice">
          Phiếu bàn giao giấy tờ nội bộ. Tiền cọc được hoàn sau khi cửa hàng kiểm tra thiết bị khi
          nhận lại.
        </p>
      </article>
      <div className="rental-invoice-actions rental-no-print">
        <PrintInvoiceButton />
        <Link className="secondary" href="/quan-ly-don">
          Quay lại hàng đợi
        </Link>
      </div>
    </main>
  )
}

function formatDate(value: string) {
  if (!value) return 'Ngày không khả dụng'
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    dateStyle: 'medium',
  }).format(new Date(`${value}T12:00:00+07:00`))
}
