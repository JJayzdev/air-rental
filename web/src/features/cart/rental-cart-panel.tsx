'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useActionState, useEffect, useMemo, useState, useTransition } from 'react'
import type { CatalogProduct } from '@/features/products/catalog-data'
import {
  getBookingCalendar,
  createRentalBooking,
  type BookingActionState,
} from '@/features/booking/actions'
import { rentalDays } from '@/features/booking/domain.ts'
import {
  clearBookingKey,
  getOrCreateBookingKey,
  rotateBookingKey,
} from '@/features/booking/idempotency-key.ts'
import { money } from '@/lib/format'
import {
  EMPTY_RENTAL_CART,
  readRentalCartFromStorage,
  RENTAL_CART_STORAGE_KEY,
  setRentalDates,
  setRentalQuantity,
  type RentalCart,
} from './rental-cart.ts'

const INITIAL_ACTION: BookingActionState = {}

export function RentalCartPanel({
  products,
  checkout = false,
  contactPrefill = { name: '', phone: '', address: '' },
}: {
  products: CatalogProduct[]
  checkout?: boolean
  contactPrefill?: { name: string; phone: string; address: string }
}) {
  const router = useRouter()
  const [cart, setCart] = useState<RentalCart>(EMPTY_RENTAL_CART)
  const [hydrated, setHydrated] = useState(false)
  const [startDates, setStartDates] = useState<string[]>([])
  const [endDates, setEndDates] = useState<string[]>([])
  const [calendarItemsKey, setCalendarItemsKey] = useState('')
  const [endCalendarKey, setEndCalendarKey] = useState('')
  const [calendarError, setCalendarError] = useState('')
  const [storageError, setStorageError] = useState('')
  const [acknowledgedNewAttempt, setAcknowledgedNewAttempt] = useState(false)
  const [pendingCalendar, startTransition] = useTransition()
  const [idempotencyKey, setIdempotencyKey] = useState('')
  const [attemptStorageReady, setAttemptStorageReady] = useState(false)
  const [actionState, action, submitting] = useActionState(createRentalBooking, INITIAL_ACTION)

  useEffect(() => {
    let active = true
    Promise.resolve().then(() => {
      if (!active) return
      try {
        const stored = readRentalCartFromStorage(localStorage)
        setCart(stored.cart)
        if (stored.error) setStorageError(stored.error)
      } catch {
        setCart(EMPTY_RENTAL_CART)
        setStorageError('Trình duyệt chưa cho phép đọc giỏ thuê đã lưu.')
      }
      try {
        setIdempotencyKey(getOrCreateBookingKey(sessionStorage))
        setAttemptStorageReady(true)
      } catch {
        setStorageError(
          'Trình duyệt chưa lưu được mã yêu cầu. Hãy bật lưu trữ phiên để đặt thuê an toàn.',
        )
      }
      setHydrated(true)
    })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!hydrated) return
    const sync = () => {
      const stored = readRentalCartFromStorage(localStorage)
      setCart(stored.cart)
      if (stored.error) setStorageError(stored.error)
    }
    window.addEventListener('air-rental-cart-change', sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener('air-rental-cart-change', sync)
      window.removeEventListener('storage', sync)
    }
  }, [hydrated])

  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem(RENTAL_CART_STORAGE_KEY, JSON.stringify(cart))
    } catch {
      queueMicrotask(() => setStorageError('Trình duyệt chưa lưu được thay đổi trong giỏ thuê.'))
    }
  }, [cart, hydrated])

  const productsById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  )
  const validItems = cart.items.filter((item) => {
    const product = productsById.get(item.productId)
    return product && !product.isSample
  })
  const unknownItemCount = cart.items.length - validItems.length
  const itemFingerprint = JSON.stringify(validItems)
  const estimatedDays =
    cart.start && cart.end ? rentalDays({ start: cart.start, end: cart.end }) : 0
  const estimatedSubtotal =
    estimatedDays *
    validItems.reduce((sum, item) => {
      return sum + (productsById.get(item.productId)?.pricePerDayVnd ?? 0) * item.quantity
    }, 0)
  const estimatedDeposit = validItems.reduce((sum, item) => {
    return sum + (productsById.get(item.productId)?.depositVnd ?? 0) * item.quantity
  }, 0)

  useEffect(() => {
    if (!hydrated || validItems.length === 0) return
    let cancelled = false
    startTransition(async () => {
      const result = await getBookingCalendar({ items: validItems })
      if (cancelled) return
      setStartDates(result.dates)
      setCalendarItemsKey(itemFingerprint)
      setCalendarError(result.error ?? '')
      if (cart.start && result.dates.length && !result.dates.includes(cart.start)) {
        setCart((current) => setRentalDates(current))
      }
    })
    return () => {
      cancelled = true
    }
    // The date list is recalculated whenever products or quantities change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, itemFingerprint])

  useEffect(() => {
    if (!hydrated || !cart.start || validItems.length === 0) return
    let cancelled = false
    startTransition(async () => {
      const result = await getBookingCalendar({ items: validItems, start: cart.start })
      if (cancelled) return
      setEndDates(result.dates)
      setEndCalendarKey(`${itemFingerprint}:${cart.start}`)
      setCalendarError(result.error ?? '')
      if (cart.end && result.dates.length && !result.dates.includes(cart.end)) {
        setCart((current) => setRentalDates(current, current.start))
      }
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, itemFingerprint, cart.start])

  useEffect(() => {
    if (actionState.orderId) {
      try {
        localStorage.removeItem(RENTAL_CART_STORAGE_KEY)
      } catch {
        /* Still open the saved order. */
      }
      try {
        clearBookingKey(sessionStorage)
      } catch {
        /* Still open the saved order. */
      }
      router.push(`/don-thue/${actionState.orderId}`)
    }
  }, [actionState.orderId, router])

  function rotateIdempotencyKey() {
    try {
      setIdempotencyKey(rotateBookingKey(sessionStorage))
      setAttemptStorageReady(true)
      setStorageError('')
      setAcknowledgedNewAttempt(true)
    } catch {
      setAttemptStorageReady(false)
      setStorageError('Không lưu được mã yêu cầu mới trong phiên này.')
    }
  }

  function updateCart(update: (current: RentalCart) => RentalCart) {
    setCart((current) => update(current))
  }

  const hasAllProducts =
    hydrated && cart.items.length > 0 && unknownItemCount === 0 && validItems.length > 0
  const currentStartDates = calendarItemsKey === itemFingerprint ? startDates : []
  const currentEndDates = endCalendarKey === `${itemFingerprint}:${cart.start}` ? endDates : []
  const canContinue =
    hasAllProducts &&
    attemptStorageReady &&
    !storageError &&
    Boolean(cart.start && cart.end && currentEndDates.includes(cart.end))

  if (!hydrated)
    return (
      <div className="rental-panel" aria-busy="true">
        Đang mở giỏ thuê…
      </div>
    )
  if (cart.items.length === 0) {
    return (
      <section className="rental-panel rental-empty" data-testid="rental-cart-empty">
        <p>Giỏ thuê đang trống.</p>
        <Link className="primary" href="/san-pham">
          Xem thiết bị
        </Link>
      </section>
    )
  }

  return (
    <div className="rental-cart-layout" data-testid="rental-cart-panel">
      {storageError && (
        <p className="rental-error" role="alert">
          {storageError}
        </p>
      )}
      <section className="rental-panel">
        <h2>Thiết bị trong giỏ</h2>
        <div className="rental-cart-lines">
          {cart.items.map((item) => {
            const product = productsById.get(item.productId)
            const sample = product?.isSample ?? true
            return (
              <article className="rental-cart-line" key={item.productId}>
                <div>
                  <b>{product?.name ?? 'Sản phẩm không còn trong danh mục'}</b>
                  <p>
                    {sample
                      ? 'Mẫu tham khảo — không nhận đặt thuê'
                      : `${product?.pricePerDayVnd.toLocaleString('vi-VN')} ₫ / ngày · giá tham khảo`}
                  </p>
                </div>
                <label>
                  <span>Số lượng</span>
                  <input
                    aria-label={`Số lượng ${product?.name ?? 'sản phẩm'}`}
                    type="number"
                    min={0}
                    max={20}
                    value={item.quantity}
                    onChange={(event) =>
                      updateCart((current) =>
                        setRentalQuantity(current, item.productId, Number(event.target.value)),
                      )
                    }
                  />
                </label>
              </article>
            )
          })}
        </div>
        {unknownItemCount > 0 && (
          <p className="rental-error">
            Một số sản phẩm mẫu hoặc đã bị gỡ khỏi danh mục nên chưa thể đặt thuê.
          </p>
        )}
      </section>

      <section className="rental-panel rental-calendar-panel">
        <h2>Chọn ngày thuê</h2>
        <p>
          Lịch chỉ hiển thị ngày có đủ máy cho toàn bộ giỏ. Đơn sẽ kiểm tra lại tồn kho khi xác
          nhận.
        </p>
        <label htmlFor="rental-start">Ngày nhận</label>
        <select
          id="rental-start"
          value={cart.start ?? ''}
          disabled={!hasAllProducts || pendingCalendar}
          onChange={(event) =>
            updateCart((current) => setRentalDates(current, event.target.value || undefined))
          }
          data-testid="rental-start"
        >
          <option value="">Chọn ngày nhận</option>
          {currentStartDates.map((date) => (
            <option key={date} value={date}>
              {formatDate(date)}
            </option>
          ))}
        </select>
        <label htmlFor="rental-end">Ngày trả</label>
        <select
          id="rental-end"
          value={cart.end ?? ''}
          disabled={!cart.start || pendingCalendar}
          onChange={(event) =>
            updateCart((current) =>
              setRentalDates(current, current.start, event.target.value || undefined),
            )
          }
          data-testid="rental-end"
        >
          <option value="">Chọn ngày trả</option>
          {currentEndDates.map((date) => (
            <option key={date} value={date}>
              {formatDate(date)}
            </option>
          ))}
        </select>
        {calendarError && (
          <p className="rental-error" role="status">
            {calendarError}
          </p>
        )}
        {pendingCalendar && <p role="status">Đang kiểm tra ngày trống…</p>}
        {cart.start && cart.end && (
          <p>
            {rentalDays({ start: cart.start, end: cart.end })} ngày thuê, tính cả ngày nhận và ngày
            trả.
          </p>
        )}
        {estimatedDays > 0 && validItems.length > 0 && (
          <dl className="rental-estimate" data-testid="rental-estimate">
            <div>
              <dt>Ước tính tiền thuê</dt>
              <dd>{money(estimatedSubtotal)}</dd>
            </div>
            <div>
              <dt>Ước tính tiền cọc</dt>
              <dd>{money(estimatedDeposit)}</dd>
            </div>
            <small>
              Ước tính chưa áp dụng giảm giá theo kỳ hoặc phí giao hàng. Hệ thống tính lại từ bảng
              giá khi giữ thiết bị.
            </small>
          </dl>
        )}
      </section>

      {checkout ? (
        <section className="rental-panel rental-checkout-panel">
          <h2>Thông tin người thuê</h2>
          <form className="rental-form" action={action} data-testid="rental-checkout-form">
            <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
            <input
              type="hidden"
              name="booking"
              value={JSON.stringify({
                items: validItems,
                dates: { start: cart.start, end: cart.end },
                fulfillment: 'pickup',
                customer: { name: '', phone: '', address: '' },
              })}
            />
            <label htmlFor="rental-name">Họ và tên</label>
            <input
              id="rental-name"
              name="customerName"
              autoComplete="name"
              required
              minLength={2}
              maxLength={120}
              defaultValue={contactPrefill.name}
            />
            <label htmlFor="rental-phone">Số điện thoại</label>
            <input
              id="rental-phone"
              name="customerPhone"
              type="tel"
              autoComplete="tel"
              required
              defaultValue={contactPrefill.phone}
            />
            <label htmlFor="rental-fulfillment">Nhận thiết bị</label>
            <select id="rental-fulfillment" name="fulfillment" defaultValue="pickup">
              <option value="pickup">Nhận tại cửa hàng</option>
              <option value="delivery">Giao hàng</option>
            </select>
            <label htmlFor="rental-address">Địa chỉ giao hoặc ghi chú nhận máy</label>
            <textarea
              id="rental-address"
              name="customerAddress"
              required
              minLength={5}
              maxLength={500}
              defaultValue={contactPrefill.address}
            />
            <button
              className="primary"
              type="submit"
              disabled={
                !canContinue ||
                !idempotencyKey ||
                !attemptStorageReady ||
                storageError !== '' ||
                submitting
              }
            >
              {submitting ? 'Đang giữ thiết bị…' : 'Tạo yêu cầu thuê'}
            </button>
            {actionState.error && (
              <p className="rental-error" role="alert">
                {actionState.error}
              </p>
            )}
            {actionState.requiresOrderCheck && <Link href="/don-thue">Mở danh sách đơn thuê</Link>}
            {actionState.uncertain && <Link href="/don-thue">Kiểm tra đơn trước khi gửi lại</Link>}
            {actionState.requiresOrderCheck && !acknowledgedNewAttempt && (
              <button type="button" className="secondary" onClick={rotateIdempotencyKey}>
                Tôi đã kiểm tra đơn; bắt đầu yêu cầu mới
              </button>
            )}
            <small>
              Giá được tính lại từ bảng giá; tồn kho được giữ cùng lúc cho toàn bộ giỏ. Chưa nhận
              thanh toán.
            </small>
          </form>
        </section>
      ) : (
        <section className="rental-panel rental-cart-next">
          <p>Giá và tiền cọc cuối cùng do hệ thống tính từ bảng giá tại thời điểm giữ thiết bị.</p>
          <Link
            className={`primary${canContinue ? '' : ' is-disabled'}`}
            aria-disabled={!canContinue}
            href={canContinue ? '/checkout' : '/gio-thue'}
          >
            Tiếp tục đặt thuê
          </Link>
          <Link href="/san-pham">Thêm thiết bị</Link>
        </section>
      )}
    </div>
  )
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    dateStyle: 'medium',
  }).format(new Date(`${value}T12:00:00+07:00`))
}
