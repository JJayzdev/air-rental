'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function RentalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Rental page could not load', error.digest)
  }, [error.digest])
  return (
    <main className="shell rental-page">
      <section className="rental-panel" role="alert">
        <h1>Chưa xác định được trạng thái mới nhất</h1>
        <p>Kiểm tra danh sách đơn trước khi gửi lại yêu cầu để tránh tạo đơn trùng.</p>
        <button className="primary" type="button" onClick={reset}>
          Thử lại
        </button>
        <Link href="/don-thue">Mở danh sách đơn thuê</Link>
      </section>
    </main>
  )
}
