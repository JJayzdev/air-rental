import { z } from 'zod'
import { rentalCartLineSchema } from '../booking/request-schema.ts'
import { calendarDay } from '../booking/domain.ts'

export const RENTAL_CART_STORAGE_KEY = 'air-uuid-rental-cart-v1'

export const rentalCartSchema = z
  .object({
    items: z.array(rentalCartLineSchema).max(20),
    start: z.string().date().optional(),
    end: z.string().date().optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.items.reduce((sum, item) => sum + item.quantity, 0) > 20) {
      context.addIssue({ code: 'custom', path: ['items'], message: 'Rental cart exceeds 20 units' })
    }
    if (value.end && !value.start) {
      context.addIssue({
        code: 'custom',
        path: ['end'],
        message: 'A rental end date requires a start date',
      })
    }
    if (value.start && value.end) {
      try {
        const start = calendarDay(value.start)
        const end = calendarDay(value.end)
        if (end < start)
          context.addIssue({ code: 'custom', path: ['end'], message: 'Rental end precedes start' })
        if (end - start + 1 > 90)
          context.addIssue({ code: 'custom', path: ['end'], message: 'Rental exceeds 90 days' })
      } catch {
        context.addIssue({ code: 'custom', path: ['start'], message: 'Invalid rental date' })
      }
    }
  })

export type RentalCart = z.infer<typeof rentalCartSchema>
export const EMPTY_RENTAL_CART: RentalCart = { items: [] }

export interface RentalCartStorageLike {
  getItem(key: string): string | null
  removeItem(key: string): void
}

export function readRentalCartFromStorage(storage: RentalCartStorageLike): {
  cart: RentalCart
  error?: string
} {
  let raw: string | null
  try {
    raw = storage.getItem(RENTAL_CART_STORAGE_KEY)
  } catch {
    return { cart: EMPTY_RENTAL_CART, error: 'Trình duyệt chưa cho phép đọc giỏ thuê đã lưu.' }
  }
  if (!raw) return { cart: EMPTY_RENTAL_CART }
  try {
    return { cart: parseRentalCart(JSON.parse(raw)) }
  } catch {
    try {
      storage.removeItem(RENTAL_CART_STORAGE_KEY)
    } catch {
      /* Ignore failed cleanup of corrupt local state. */
    }
    return { cart: EMPTY_RENTAL_CART }
  }
}

export function parseRentalCart(value: unknown): RentalCart {
  const parsed = rentalCartSchema.safeParse(value)
  return parsed.success ? parsed.data : EMPTY_RENTAL_CART
}

export function addRentalProduct(cart: RentalCart, productId: string): RentalCart {
  if (cart.items.reduce((sum, item) => sum + item.quantity, 0) >= 20) return cart
  const existing = cart.items.find((item) => item.productId === productId)
  if (existing) {
    if (existing.quantity >= 20) return cart
    return {
      ...cart,
      items: cart.items.map((item) =>
        item.productId === productId ? { ...item, quantity: item.quantity + 1 } : item,
      ),
      end: undefined,
    }
  }
  if (cart.items.reduce((sum, item) => sum + item.quantity, 0) >= 20) return cart
  return { ...cart, items: [...cart.items, { productId, quantity: 1 }], end: undefined }
}

export function setRentalQuantity(
  cart: RentalCart,
  productId: string,
  quantity: number,
): RentalCart {
  if (!Number.isInteger(quantity) || quantity < 0 || quantity > 20) return cart
  const items =
    quantity === 0
      ? cart.items.filter((item) => item.productId !== productId)
      : cart.items.map((item) => (item.productId === productId ? { ...item, quantity } : item))
  if (items.reduce((sum, item) => sum + item.quantity, 0) > 20) return cart
  return { ...cart, items, end: undefined }
}

export function setRentalDates(cart: RentalCart, start?: string, end?: string): RentalCart {
  const next = { items: cart.items, ...(start ? { start } : {}), ...(end ? { end } : {}) }
  const parsed = rentalCartSchema.safeParse(next)
  return parsed.success ? parsed.data : { ...cart, end: undefined }
}
