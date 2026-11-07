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
import { previewRentalQuote, type RentalQuotePreview } from '@/features/pricing/actions'
import { rentalQuoteKey } from '@/features/pricing/pricing.ts'
import type { DeliveryZoneView } from '@/features/pricing/types.ts'
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

type CurrentQuote = RentalQuotePreview & { pricingKey: string }

export function RentalCartPanel({
  products,
  checkout = false,
  deliveryZones = [],
  contactPrefill = { name: '', phone: '', address: '' },
}: {
  products: CatalogProduct[]
  checkout?: boolean
  deliveryZones?: DeliveryZoneView[]
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
  const [fulfillment, setFulfillment] = useState<'pickup' | 'delivery'>('pickup')
  const [deliveryZoneId, setDeliveryZoneId] = useState('')
  const [discountCode, setDiscountCode] = useState('')
  const [quoteResult, setQuoteResult] = useState<CurrentQuote | null>(null)
  const [quoteError, setQuoteError] = useState<{ pricingKey: string; message: string } | null>(null)

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
      // Chỉ ghi và báo khi nội dung thật sự đổi: sự kiện này cũng kích hoạt `sync` ở trên, nên
      // ghi vô điều kiện sẽ tạo vòng lặp setCart → ghi → sync → setCart.
      const serialized = JSON.stringify(cart)
      if (localStorage.getItem(RENTAL_CART_STORAGE_KEY) !== serialized) {
        localStorage.setItem(RENTAL_CART_STORAGE_KEY, serialized)
        // Số trên biểu tượng giỏ ở header nghe sự kiện này; `storage` chỉ bắn ở tab khác.
        window.dispatchEvent(new Event('air-rental-cart-change'))
      }
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
  const selectedZone = deliveryZones.find((zone) => zone.id === deliveryZoneId) ?? null
  const code = discountCode.trim().toUpperCase()
  const quoteInput = {
    items: validItems,
    dates: { start: cart.start ?? '', end: cart.end ?? '' },
    fulfillment,
    deliveryZoneId: fulfillment === 'delivery' ? deliveryZoneId || null : null,
    code,
  }
  const pricingFingerprint = rentalQuoteKey({
    items: validItems,
    start: cart.start ?? '',
    end: cart.end ?? '',
    fulfillment,
    deliveryZoneId: quoteInput.deliveryZoneId,
    code,
  })
  const activeQuote = quoteResult?.pricingKey === pricingFingerprint ? quoteResult : null
  const activeQuoteError = quoteError?.pricingKey === pricingFingerprint ? quoteError.message : ''
  const quoteEligible =
    hydrated &&
    Boolean(cart.start && cart.end) &&
    validItems.length > 0 &&
    (fulfillment !== 'delivery' || Boolean(deliveryZoneId))
  const pendingQuote = quoteEligible && !activeQuote && !activeQuoteError
  const estimatedDays =
    activeQuote?.rentalDays ??
    (cart.start && cart.end ? rentalDays({ start: cart.start, end: cart.end }) : 0)
  const estimatedSubtotal = activeQuote?.subtotalVnd ?? 0
  const estimatedDeposit = activeQuote?.depositVnd ?? 0
  const estimatedDeliveryFee = activeQuote?.deliveryFeeVnd ?? 0
  const estimatedTotal = activeQuote?.totalVnd ?? 0

  useEffect(() => {
    if (
      !hydrated ||
      !cart.start ||
      !cart.end ||
      validItems.length === 0 ||
      (fulfillment === 'delivery' && !deliveryZoneId)
    ) {
      return
    }
    let cancelled = false
    void previewRentalQuote(quoteInput)
      .then((result) => {
        if (cancelled) return
        if (result.error || !result.quote) {
          setQuoteResult(null)
          setQuoteError({
            pricingKey: pricingFingerprint,
            message: result.error ?? 'Chưa tính được giá thuê.',
          })
          return
        }
        setQuoteResult({ ...result.quote, pricingKey: pricingFingerprint })
        setQuoteError(null)
      })
      .catch(() => {
        if (cancelled) return
        setQuoteResult(null)
        setQuoteError({
          pricingKey: pricingFingerprint,
          message: 'Chưa kết nối được để tính báo giá.',
        })
      })
    return () => {
      cancelled = true
    }
    // The key captures all amount-affecting values, including normalized code and zone.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, pricingFingerprint])

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
        window.dispatchEvent(new Event('air-rental-cart-change'))
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
    (fulfillment === 'pickup' || Boolean(deliveryZoneId)) &&
    Boolean(cart.start && cart.end && currentEndDates.includes(cart.end)) &&
    Boolean(activeQuote) &&
    !pendingQuote

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
                    onChange={(event) => {
                      // Ô trống khi đang xoá để gõ số mới: Number('') = 0 sẽ xoá luôn dòng
                      // khỏi giỏ. Chỉ xoá khi người dùng thật sự nhập 0.
                      if (event.target.value.trim() === '') return
                      const quantity = Number(event.target.value)
                      updateCart((current) => setRentalQuantity(current, item.productId, quantity))
                    }}
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
              <dt>Tiền thuê theo báo giá</dt>
              <dd>{activeQuote ? money(estimatedSubtotal) : pendingQuote ? 'Đang tính…' : '—'}</dd>
            </div>
            {activeQuote && activeQuote.discountVnd > 0 && (
              <div>
                <dt>Giảm giá ({activeQuote.discountCode})</dt>
                <dd>−{money(activeQuote.discountVnd)}</dd>
              </div>
            )}
            {fulfillment === 'delivery' && selectedZone && activeQuote && (
              <div>
                <dt>Phí giao ({activeQuote.deliveryZoneName})</dt>
                <dd>{money(estimatedDeliveryFee)}</dd>
              </div>
            )}
            <div>
              <dt>Tổng tạm tính</dt>
              <dd data-testid="rental-estimate-total">
                {activeQuote ? money(estimatedTotal) : pendingQuote ? 'Đang tính…' : '—'}
              </dd>
            </div>
            <div>
              <dt>Ước tính tiền cọc</dt>
              <dd>{activeQuote ? money(estimatedDeposit) : '—'}</dd>
            </div>
            <small>
              Báo giá được tính từ bảng giá, bậc thuê, mã giảm và khu vực nhận đang chọn.
            </small>
          </dl>
        )}
        {pendingQuote && <p role="status">Đang tính lại báo giá…</p>}
        {activeQuoteError && (
          <p className="rental-error" role="alert">
            {activeQuoteError}
          </p>
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
                fulfillment,
                customer: { name: '', phone: '', address: '' },
              })}
            />
            <input type="hidden" name="discountCode" value={activeQuote?.discountCode ?? ''} />
            <input
              type="hidden"
              name="deliveryZoneId"
              value={fulfillment === 'delivery' ? deliveryZoneId : ''}
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
            <select
              id="rental-fulfillment"
              name="fulfillment"
              value={fulfillment}
              onChange={(event) =>
                setFulfillment(event.target.value === 'delivery' ? 'delivery' : 'pickup')
              }
            >
              <option value="pickup">Nhận tại cửa hàng</option>
              <option value="delivery">Giao hàng</option>
            </select>
            {fulfillment === 'delivery' && (
              <>
                <label htmlFor="rental-zone">Khu vực giao</label>
                <select
                  id="rental-zone"
                  value={deliveryZoneId}
                  onChange={(event) => setDeliveryZoneId(event.target.value)}
                  required
                  data-testid="rental-zone"
                >
                  <option value="">Chọn khu vực giao hàng</option>
                  {deliveryZones.map((zone) => (
                    <option key={zone.id} value={zone.id}>
                      {zone.name} —{' '}
                      {zone.freeFromVnd !== null
                        ? `miễn phí từ ${money(zone.freeFromVnd)}`
                        : money(zone.feeVnd)}
                    </option>
                  ))}
                </select>
                {selectedZone && (
                  <small>
                    Phí giao {activeQuote ? money(estimatedDeliveryFee) : 'đang chờ báo giá'}
                    {selectedZone.freeFromVnd !== null &&
                      ` · miễn phí khi tiền thuê sau giảm đạt ${money(selectedZone.freeFromVnd)}`}
                    .
                  </small>
                )}
              </>
            )}
            <label htmlFor="rental-discount">Mã giảm giá (không bắt buộc)</label>
            <div className="rental-discount-row">
              <input
                id="rental-discount"
                value={discountCode}
                onChange={(event) => {
                  setDiscountCode(event.target.value)
                }}
                maxLength={32}
                placeholder="WELCOME10"
                autoComplete="off"
                data-testid="rental-discount"
              />
              {activeQuote?.discountCode && (
                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    setDiscountCode('')
                  }}
                >
                  Bỏ mã
                </button>
              )}
            </div>
            {activeQuote?.discountCode && activeQuote.discountVnd > 0 && (
              <p className="rental-message" role="status">
                Đã áp dụng {activeQuote.discountCode}: giảm {money(activeQuote.discountVnd)}.
                {activeQuote.description ? ` ${activeQuote.description}` : ''}
              </p>
            )}
            <label htmlFor="rental-address">
              {fulfillment === 'delivery' ? 'Địa chỉ giao hàng' : 'Ghi chú nhận máy'}
            </label>
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
