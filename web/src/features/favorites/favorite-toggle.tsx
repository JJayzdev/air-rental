import Link from 'next/link'
import { addFavorite, removeFavorite } from './actions'

interface FavoriteToggleProps {
  productId: string
  next: string
  signedIn: boolean
  favorited: boolean
  compact?: boolean
}

export function FavoriteToggle({
  productId,
  next,
  signedIn,
  favorited,
  compact = false,
}: FavoriteToggleProps) {
  if (!signedIn) {
    return (
      <Link
        className={compact ? 'favorite-toggle compact' : 'favorite-toggle'}
        href={`/dang-nhap?next=${encodeURIComponent(next)}`}
      >
        ♡ Đăng nhập để lưu
      </Link>
    )
  }
  return (
    <form
      action={favorited ? removeFavorite : addFavorite}
      className={compact ? 'favorite-toggle compact' : 'favorite-toggle'}
    >
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="next" value={next} />
      <button
        type="submit"
        className={favorited ? 'favorite-button saved' : 'favorite-button'}
        aria-pressed={favorited}
      >
        {favorited ? '♥ Đã lưu' : '♡ Lưu yêu thích'}
      </button>
    </form>
  )
}
