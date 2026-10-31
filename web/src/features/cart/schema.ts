import { z } from 'zod'
import { productSchema } from '../products/schema'

export const cartItemSchema = z.object({
  product: productSchema,
  quantity: z.number().int().positive(),
  days: z.number().int().positive(),
})

export type CartItem = z.infer<typeof cartItemSchema>
