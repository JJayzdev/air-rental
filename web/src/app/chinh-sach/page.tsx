import type { Metadata } from 'next'
import Link from 'next/link'
import { policyDrafts } from './content'

export const metadata: Metadata = {
  title: 'Chính sách mô phỏng — A.I.R',
  description: 'Năm kịch bản học tập trong đồ án A.I.R; không phải chính sách doanh nghiệp.',
  robots: { index: false, follow: false },
}

export default function PolicyIndexPage() {
  return (
    <main className="shell guide-article">
      <header className="guide-article-heading">
        <p className="eyebrow">Đồ án học tập</p>
        <h1>Kịch bản chính sách mô phỏng</h1>
        <p>
          <strong>Không phải chính sách doanh nghiệp.</strong> Năm tài liệu dưới đây mô tả tình
          huống giả lập để học và đánh giá đồ án. Tên, thiết bị, giá, đơn và thanh toán đều là dữ
          liệu thử; không tạo cam kết hoặc giao dịch thật.
        </p>
      </header>

      <section className="policy-pending" aria-labelledby="policy-pending-title">
        <h2 id="policy-pending-title">Ranh giới bài tập</h2>
        <p>
          Catalog sample không thể đặt thuê. Checkout, đơn, tài khoản và ledger chỉ chạy với fixture
          Supabase local phù hợp; thao tác đó vẫn là thử nghiệm phần mềm, không có thiết bị bàn giao
          hoặc tiền chuyển qua ngân hàng.
        </p>
      </section>

      <nav className="guide-grid" aria-label="Các chính sách dự thảo">
        {policyDrafts.map((policy) => (
          <article className="guide-card" key={policy.slug}>
            <p className="eyebrow">Tình huống học tập</p>
            <h2>
              <Link href={`/chinh-sach/${policy.slug}`}>{policy.title}</Link>
            </h2>
            <p>{policy.description}</p>
            <Link className="guide-read-more" href={`/chinh-sach/${policy.slug}`}>
              Đọc kịch bản →
            </Link>
          </article>
        ))}
      </nav>
    </main>
  )
}
