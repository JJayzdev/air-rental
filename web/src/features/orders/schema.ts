import { z } from 'zod'
import { cartItemSchema } from '../cart/schema'

export const orderStatusSchema = z.enum([
  'Chờ xác nhận',
  'Đã xác nhận',
  'Đang giao',
  'Đang thuê',
  'Đang trả',
  'Hoàn thành',
  'Đã hủy',
  'Quá hạn',
])

export type OrderStatus = z.infer<typeof orderStatusSchema>

export const orderSchema = z.object({
  code: z.string(),
  status: orderStatusSchema,
  createdAt: z.string(),
  name: z.string(),
  phone: z.string(),
  address: z.string(),
  method: z.string(),
  start: z.string(),
  end: z.string(),
  days: z.number().int().positive(),
  items: z.array(cartItemSchema),
  subtotal: z.number().int().nonnegative(),
  shipping: z.number().int().nonnegative(),
  total: z.number().int().positive(),
})

export type Order = z.infer<typeof orderSchema>
