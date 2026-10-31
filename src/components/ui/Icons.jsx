// Bộ icon dùng chung (lấy đúng path từ bản gốc).

const base = (size) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
})

export const BrandMark = (props) => (
  <svg viewBox="0 0 42 34" {...props}>
    <path
      d="M4 24C13 23 15 13 20 5c2 8 8 12 18 13-6 3-10 7-12 12-4-4-8-6-13-5l5-7C12 21 8 23 4 24Z"
      fill="currentColor"
    />
    <circle cx="24" cy="10" r="1.5" fill="white" />
  </svg>
)

export const Search = ({ size = 20 }) => (
  <svg {...base(size)}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-4-4" />
  </svg>
)

export const User = ({ size = 20 }) => (
  <svg {...base(size)}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </svg>
)

export const Cart = ({ size = 20 }) => (
  <svg {...base(size)}>
    <path d="M3 4h2l2.2 10h10.7l2-7H7" />
    <circle cx="9" cy="19" r="1" />
    <circle cx="18" cy="19" r="1" />
  </svg>
)

export const ArrowRight = ({ size = 20 }) => (
  <svg {...base(size)}>
    <path d="M5 12h14" />
    <path d="m13 6 6 6-6 6" />
  </svg>
)

export const Heart = ({ size = 20 }) => (
  <svg {...base(size)}>
    <path d="M20.8 4.7a5.5 5.5 0 0 0-7.8 0L12 5.8l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.4 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />
  </svg>
)

export const Check = ({ size = 20 }) => (
  <svg {...base(size)}>
    <path d="m5 12 4 4L19 6" />
  </svg>
)

export const Calendar = ({ size = 20 }) => (
  <svg {...base(size)}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M16 3v4M8 3v4M3 10h18" />
  </svg>
)

export const Trash = ({ size = 20 }) => (
  <svg {...base(size)}>
    <path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14" />
  </svg>
)

export const Close = ({ size = 20 }) => (
  <svg {...base(size)}>
    <path d="m6 6 12 12M18 6 6 18" />
  </svg>
)

export const Send = ({ size = 20 }) => (
  <svg {...base(size)}>
    <path d="m22 2-7 20-4-9-9-4Z" />
    <path d="M22 2 11 13" />
  </svg>
)

export const Home = ({ size = 20 }) => (
  <svg {...base(size)}>
    <path d="m3 11 9-8 9 8" />
    <path d="M5 10v11h14V10M9 21v-7h6v7" />
  </svg>
)

export const Grid = ({ size = 20 }) => (
  <svg {...base(size)}>
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
)

export const Sparkle = ({ size = 20 }) => (
  <svg {...base(size)}>
    <path d="M12 3v6M12 15v6M3 12h6M15 12h6" />
  </svg>
)
