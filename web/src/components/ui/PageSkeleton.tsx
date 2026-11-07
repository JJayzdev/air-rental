/**
 * Khung chờ khi chuyển trang. Các trang đều là `force-dynamic` và gọi Supabase, nên không có
 * `loading.tsx` thì bấm link xong màn hình đứng yên tới khi server trả lời.
 */
export function PageSkeleton({
  label = 'Đang tải…',
  cards = 3,
}: {
  label?: string
  cards?: number
}) {
  return (
    <main className="shell page-skeleton" aria-busy="true">
      <p className="sr-only" role="status">
        {label}
      </p>
      <div className="page-skeleton-line page-skeleton-eyebrow" />
      <div className="page-skeleton-line page-skeleton-title" />
      <div className="page-skeleton-grid">
        {Array.from({ length: cards }, (_, index) => (
          <div className="page-skeleton-card" key={index} />
        ))}
      </div>
    </main>
  )
}
