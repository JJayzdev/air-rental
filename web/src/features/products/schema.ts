import { z } from 'zod'

export const productCategorySchema = z.enum([
  'all',
  'laptop',
  'phone',
  'camera',
  'tablet',
  'accessory',
])

export type ProductCategory = z.infer<typeof productCategorySchema>

export const productSchema = z.object({
  id: z.number().int().positive(),
  slug: z.string().min(1),
  name: z.string().min(1),
  category: z.string().min(1),
  price: z.number().int().positive(),
  originalPrice: z.number().int().positive().optional(),
  available: z.number().int().nonnegative(),
  specs: z.string(),
  badge: z.string().optional(),
  image: z.string(),
  rating: z.number().min(0).max(5),
  reviews: z.number().int().nonnegative(),
  deposit: z.number().int().nonnegative(),
  description: z.string().optional(),
})

export type Product = z.infer<typeof productSchema>
