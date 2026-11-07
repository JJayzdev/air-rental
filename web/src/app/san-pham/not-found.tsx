import Link from 'next/link'

/**
 * Thiết bị không còn trong danh mục (đã gỡ, lưu trữ hoặc link cũ). Nằm trong layout /san-pham nên
 * đã có header và footer.
 */
export default function ProductNotFound() {
  return (
    <main>
      <section className="section shell page-section">
        <div className="rental-panel rental-empty" role="status">
          <p className="eyebrow">Lỗi 404</p>
          <h1>Thiết bị không còn trong danh mục</h1>
          <p>Thiết bị này có thể đã ngừng cho thuê. Bạn có thể xem các thiết bị tương tự.</p>
          <Link className="primary" href="/san-pham">
            Xem thiết bị khác
          </Link>
        </div>
      </section>
    </main>
  )
}
