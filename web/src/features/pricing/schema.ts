import { z } from 'zod'
import { rentalCartLineSchema } from '../booking/request-schema.ts'

export const discountPreviewSchema = z
  .object({
    code: z
      .string()
      .trim()
      .regex(/^[A-Za-z0-9][A-Za-z0-9_-]{2,31}$/)
      .transform((value) => value.toUpperCase()),
    items: z.array(rentalCartLineSchema).min(1).max(20),
    dates: z.object({ start: z.string().date(), end: z.string().date() }),
  })
  .strict()

export const rentalQuotePreviewSchema = z
  .object({
    code: z
      .string()
      .trim()
      .max(32)
      .refine((value) => value === '' || /^[A-Za-z0-9][A-Za-z0-9_-]{2,31}$/.test(value))
      .transform((value) => value.toUpperCase()),
    items: z.array(rentalCartLineSchema).min(1).max(20),
    dates: z.object({ start: z.string().date(), end: z.string().date() }),
    fulfillment: z.enum(['pickup', 'delivery']),
    deliveryZoneId: z.string().uuid().nullable(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.items.reduce((sum, item) => sum + item.quantity, 0) > 20) {
      context.addIssue({
        code: 'custom',
        path: ['items'],
        message: 'Cart quantity exceeds booking limit.',
      })
    }
    if (value.fulfillment === 'delivery' && !value.deliveryZoneId) {
      context.addIssue({
        code: 'custom',
        path: ['deliveryZoneId'],
        message: 'Required for delivery.',
      })
    }
    if (value.fulfillment === 'pickup' && value.deliveryZoneId) {
      context.addIssue({ code: 'custom', path: ['deliveryZoneId'], message: 'Pickup has no zone.' })
    }
  })
