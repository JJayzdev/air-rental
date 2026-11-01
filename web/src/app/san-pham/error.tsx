'use client'

export default function CatalogError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main>
      <section className="section shell page-section">
        <div className="empty" role="alert">
          <h1>Tạm thời chưa tải được danh mục</h1>
          <p>Danh sách thiết bị hiện chưa sẵn sàng. Bạn có thể thử lại.</p>
          <button className="primary" onClick={() => reset()}>
            Thử lại
          </button>
        </div>
      </section>
    </main>
  )
}
