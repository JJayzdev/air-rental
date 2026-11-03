import { BrandMark } from '../ui/Icons'
import Link from 'next/link'
import type { NavOptions, View } from '@/types'

interface FooterProps {
  onNavigate: (view: View, options?: NavOptions) => void
  onOpenChat: (promptKey?: 'support' | 'contact' | 'consult') => void
}

export default function Footer({ onNavigate, onOpenChat }: FooterProps) {
  return (
    <footer>
      <div className="shell footer-grid">
        <div>
          <div className="brand brand-light">
            <span className="brand-mark">
              <BrandMark />
            </span>
            <strong>A.I.R</strong>
          </div>
          <p>
            Prototype UI/UX cho đồ án học tập.
            <br />
            Dữ liệu trong bản này là giả lập.
          </p>
        </div>

        <div>
          <b>Khám phá</b>
          <button onClick={() => onNavigate('products')}>Sản phẩm</button>
          <Link href="/huong-dan">Hướng dẫn</Link>
          <button onClick={() => onNavigate('orders')}>Đơn thuê</button>
        </div>

        <div>
          <b>FAQ local</b>
          <button onClick={() => onOpenChat('support')}>Hỏi về dữ liệu mẫu</button>
          <button onClick={() => onOpenChat('consult')}>Hỏi về giới hạn demo</button>
        </div>

        <div>
          <b>Thông tin đồ án</b>
          <Link href="/">Giới thiệu</Link>
          <Link href="/chinh-sach">Kịch bản mô phỏng</Link>
          <Link href="/demo">Prototype local</Link>
        </div>
      </div>

      <div className="shell copyright">A.I.R — Prototype UI/UX phi thương mại · Không có giao dịch thật</div>
    </footer>
  )
}
