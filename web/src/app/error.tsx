'use client'

import Link from 'next/link'

/**
 * Lỗi chung cho các trang chưa có error.tsx riêng (trang chủ, quản trị, đối tác, nội dung…).
 * Trước đây rơi vào trang lỗi mặc định tiếng Anh của Next.
 */
export default function AppError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="shell rental-page">
      <section className="rental-panel rental-empty" role="alert">
        <h1>Tạm thời chưa tải được trang</h1>
        <p>Hệ thống đang bận hoặc mất kết nối. Bạn có thể thử lại sau ít phút.</p>
        <button className="primary" type="button" onClick={() => reset()}>
          Thử lại
        </button>
        <Link href="/">Về trang chủ</Link>
      </section>
    </main>
  )
}
