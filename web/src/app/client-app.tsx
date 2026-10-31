'use client'

import dynamic from 'next/dynamic'

/**
 * GĐ 0: toàn bộ app chạy client-side.
 * App đọc localStorage ngay trong lần render đầu, nên render phía server sẽ lệch
 * với client (hydration mismatch). Tắt SSR ở đây là cách rẻ nhất để giữ parity
 * với bản Vite; GĐ 1 sẽ chuyển sang server component + URL routing.
 */
const AppShell = dynamic(() => import('@/components/app-shell'), {
  ssr: false,
  loading: () => (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: 'grid',
        placeItems: 'center',
        minHeight: '100vh',
        fontFamily: 'inherit',
        color: '#5b6478',
      }}
    >
      Đang tải A.I.R…
    </div>
  ),
})

export default function ClientApp() {
  return <AppShell />
}
