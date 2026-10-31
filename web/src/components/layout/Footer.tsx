import { BrandMark } from '../ui/Icons'
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
            Công nghệ trong tầm tay.
            <br />
            Thuê thông minh, sống linh hoạt.
          </p>
        </div>

        <div>
          <b>Khám phá</b>
          <button onClick={() => onNavigate('products')}>Sản phẩm</button>
          <button onClick={() => onNavigate('orders')}>Đơn thuê</button>
        </div>

        <div>
          <b>Hỗ trợ</b>
          <button onClick={() => onOpenChat('support')}>Trung tâm trợ giúp</button>
          <button onClick={() => onOpenChat('contact')}>Liên hệ A.I.R</button>
        </div>

        <div>
          <b>Hotline</b>
          <strong>1900 6868</strong>
          <p>08:00–21:00, Thứ 2–CN</p>
        </div>
      </div>

      <div className="shell copyright">© 2025 A.I.R — Prototype UI/UX phi thương mại.</div>
    </footer>
  )
}
