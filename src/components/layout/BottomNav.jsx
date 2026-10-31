import { Home, Grid, Calendar, User } from '../ui/Icons.jsx'

const ITEMS = [
  { id: 'home', label: 'Trang chủ', icon: Home },
  { id: 'products', label: 'Danh mục', icon: Grid },
  { id: 'orders', label: 'Đơn thuê', icon: Calendar },
  { id: 'account', label: 'Tài khoản', icon: User },
]

export default function BottomNav({ view, onNavigate }) {
  const active = (id) => {
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
