'use client'

import { useEffect, useState } from 'react'
import { readRentalCartFromStorage, RENTAL_CART_STORAGE_KEY } from '@/features/cart/rental-cart'

function readCount(): number {
  try {
    const { cart } = readRentalCartFromStorage(window.localStorage)
    return cart.items.reduce((sum, item) => sum + item.quantity, 0)
  } catch {
    return 0
  }
}

export function CartBadge() {
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    const update = () => setCount(readCount())
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === RENTAL_CART_STORAGE_KEY) update()
    }
    update()
    window.addEventListener('storage', onStorage)
    window.addEventListener('air-rental-cart-change', update)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('air-rental-cart-change', update)
    }
  }, [])

  if (!count) return null
  return <span role="img" aria-label={`${count} thiết bị trong giỏ`}>
      {count > 99 ? '99+' : count}
    </span>
}
