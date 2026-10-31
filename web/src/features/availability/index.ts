import { z } from 'zod'

export const availabilityQuerySchema = z.object({
  productId: z.number().int().positive(),
  startDate: z.string().date(),
  endDate: z.string().date(),
})

export type AvailabilityQuery = z.infer<typeof availabilityQuerySchema>

export interface AvailabilityResult {
  available: boolean
  remainingUnits: number
  bufferDays: number
}
