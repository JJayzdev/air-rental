import type { Metadata } from 'next'
import Link from 'next/link'
import { policyDocuments } from './content'

export const metadata: Metadata = {
  title: 'Chính sách thuê thiết bị',
  description:
    'Điều khoản thuê, hủy đơn và hoàn tiền, giao nhận, bảo mật dữ liệu và hỗ trợ khách hàng tại A.I.R.',
  alternates: { canonical: '/chinh-sach' },
  openGraph: {
    title: 'Chính sách thuê thiết bị | A.I.R',
    description:
      'Điều khoản thuê, hủy đơn và hoàn tiền, giao nhận, bảo mật dữ liệu và hỗ trợ khách hàng.',
    url: '/chinh-sach',
    type: 'website',
  },
}

export default function PolicyIndexPage() {
  return (
    <main className="shell guide-article">
      <header className="guide-article-heading">
        <p className="eyebrow">Trung tâm chính sách</p>
        <h1>Chính sách thuê thiết bị</h1>
        <p>
          Các điều khoản áp dụng khi bạn đặt và sử dụng thiết bị tại A.I.R. Nếu có điểm chưa rõ, hãy
          liên hệ hỗ trợ trước khi xác nhận đơn thuê.
        </p>
      </header>

      <nav className="guide-grid" aria-label="Các chính sách">
        {policyDocuments.map((policy) => (
          <article className="guide-card" key={policy.slug}>
            <p className="eyebrow">Chính sách</p>
            <h2>
              <Link href={`/chinh-sach/${policy.slug}`}>{policy.title}</Link>
            </h2>
            <p>{policy.description}</p>
            <Link className="guide-read-more" href={`/chinh-sach/${policy.slug}`}>
              Đọc chi tiết →
            </Link>
          </article>
        ))}
      </nav>

      <section className="policy-pending" aria-labelledby="policy-contact-title">
        <h2 id="policy-contact-title">Cần hỗ trợ thêm?</h2>
        <p>
          Mở trợ lý trực tuyến trên website hoặc xem{' '}
          <Link href="/chinh-sach/phan-anh">hướng dẫn phản ánh và hỗ trợ</Link> để biết thời gian
          phản hồi và quy trình xử lý.
        </p>
      </section>
    </main>
  )
}
