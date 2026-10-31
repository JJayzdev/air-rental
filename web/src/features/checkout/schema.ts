import { z } from 'zod'
import { cartItemSchema } from '../cart/schema'

export const checkoutFormSchema = z.object({
  name: z.string().trim().min(2, 'Vui lòng nhập họ và tên hợp lệ'),
  phone: z
    .string()
    .trim()
    .regex(/^(0|\+84)(3|5|7|8|9)[0-9]{8}$/, 'Số điện thoại không hợp lệ (10 chữ số)'),
  address: z.string().trim().min(5, 'Vui lòng nhập địa chỉ nhận máy cụ thể'),
  method: z.enum(['cod', 'transfer', 'card']),
  start: z.string().min(1, 'Vui lòng chọn ngày nhận máy'),
  end: z.string().min(1, 'Vui lòng chọn ngày trả máy'),
  days: z.number().int().positive(),
  items: z.array(cartItemSchema).min(1, 'Giỏ hàng đang trống'),
  subtotal: z.number().int().nonnegative(),
  shipping: z.number().int().nonnegative(),
  total: z.number().int().positive(),
})

export type CheckoutInput = z.infer<typeof checkoutFormSchema>
