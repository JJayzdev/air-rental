import { z } from 'zod'
import { calendarDay } from './domain.ts'

export const rentalCartLineSchema = z
  .object({ productId: z.string().uuid(), quantity: z.number().int().min(1).max(20) })
  .strict()

const rentalDates = z.object({
  start: z.string().date(),
  end: z.string().date(),
})

export const rentalCalendarSchema = z
  .object({
    items: z.array(rentalCartLineSchema).min(1).max(20),
    start: z.string().date().optional(),
  })
  .strict()
  .superRefine((value, context) => {
    const total = value.items.reduce((sum, item) => sum + item.quantity, 0)
    if (total > 20)
      context.addIssue({ code: 'custom', path: ['items'], message: 'Cart exceeds 20 units' })
  })

export const multiBookingRequestSchema = z
  .object({
    idempotencyKey: z.string().uuid(),
    items: z.array(rentalCartLineSchema).min(1).max(20),
    dates: rentalDates,
    fulfillment: z.enum(['pickup', 'delivery']),
    customer: z
      .object({
        name: z.string().trim().min(2).max(120),
        phone: z
          .string()
          .trim()
          .regex(/^(0|\+84)(3|5|7|8|9)[0-9]{8}$/),
        address: z.string().trim().min(5).max(500),
      })
      .strict(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.items.reduce((sum, item) => sum + item.quantity, 0) > 20) {
      context.addIssue({ code: 'custom', path: ['items'], message: 'Cart exceeds 20 units' })
    }
    try {
      if (calendarDay(value.dates.end) < calendarDay(value.dates.start)) {
        context.addIssue({ code: 'custom', path: ['dates', 'end'], message: 'End precedes start' })
      }
      if (calendarDay(value.dates.end) - calendarDay(value.dates.start) + 1 > 90) {
        context.addIssue({
          code: 'custom',
          path: ['dates', 'end'],
          message: 'Rental exceeds 90 days',
        })
      }
    } catch {
      context.addIssue({ code: 'custom', path: ['dates'], message: 'Invalid rental dates' })
    }
  })

export type MultiBookingRequest = z.infer<typeof multiBookingRequestSchema>
