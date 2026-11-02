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
