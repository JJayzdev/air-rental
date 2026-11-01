'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  addRentalProduct,
  readRentalCartFromStorage,
  RENTAL_CART_STORAGE_KEY,
} from './rental-cart.ts'

export function AddRentalButton({ productId }: { productId: string }) {
  const [added, setAdded] = useState(false)
  const [full, setFull] = useState(false)
  const [storageError, setStorageError] = useState('')
  function add() {
    try {
      const result = readRentalCartFromStorage(localStorage)
      if (result.error) {
        setAdded(false)
        setStorageError(result.error)
        return
      }
      const current = result.cart
      const next = addRentalProduct(current, productId)
      if (next === current) {
        setAdded(false)
        setFull(true)
        return
      }
      localStorage.setItem(RENTAL_CART_STORAGE_KEY, JSON.stringify(next))
      window.dispatchEvent(new Event('air-rental-cart-change'))
      setAdded(true)
      setFull(false)
      setStorageError('')
    } catch {
      setAdded(false)
      setStorageError('Không lưu được giỏ thuê trên trình duyệt này. Vui lòng thử lại.')
    }
  }
  return (
    <div className="rental-add-control">
      <button type="button" className="primary" onClick={add} data-testid="add-to-rental-cart">
        {added ? 'Đã thêm vào giỏ thuê' : 'Thêm vào giỏ thuê'}
      </button>
      {added && <Link href="/gio-thue">Mở giỏ thuê</Link>}
      {full && <span role="status">Giỏ thuê đã đạt tối đa 20 máy.</span>}
      {storageError && <span role="alert">{storageError}</span>}
    </div>
  )
}
