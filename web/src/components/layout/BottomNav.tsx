import { Home, Grid, Calendar, User } from '../ui/Icons'
import type { NavOptions, View } from '@/types'

const ITEMS = [
  { id: 'home', label: 'Trang chủ', icon: Home },
  { id: 'products', label: 'Danh mục', icon: Grid },
  { id: 'orders', label: 'Đơn thuê', icon: Calendar },
  { id: 'account', label: 'Tài khoản', icon: User },
] as const

interface BottomNavProps {
  view: View
  onNavigate: (view: View, options?: NavOptions) => void
}

export default function BottomNav({ view, onNavigate }: BottomNavProps) {
  const active = (id: (typeof ITEMS)[number]['id']) => {
    if (id === 'home') return view === 'home'
    if (id === 'products') return view === 'products' || view === 'detail'
    return view === id
  }

  return (
    <nav className="bottom-nav" aria-label="Điều hướng nhanh">
      {ITEMS.map(({ id, label, icon: Icon }) => (
        <button key={id} className={active(id) ? 'active' : ''} onClick={() => onNavigate(id)}>
          <Icon />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  )
}
