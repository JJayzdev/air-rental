import { z } from 'zod'
import { calendarDay } from './domain.ts'

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày phải theo dạng YYYY-MM-DD')

export const bookingRequestSchema = z
  .object({
    idempotencyKey: z.string().uuid(),
    productId: z.string().uuid(),
    quantity: z.number().int().min(1).max(20),
    start: isoDate,
    end: isoDate,
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
  .superRefine((booking, context) => {
    try {
      if (calendarDay(booking.end) < calendarDay(booking.start)) {
        context.addIssue({
          code: 'custom',
          path: ['end'],
          message: 'Ngày trả phải từ ngày nhận trở đi',
        })
      }
    } catch {
      context.addIssue({ code: 'custom', path: ['start'], message: 'Ngày thuê không hợp lệ' })
    }
  })

export type BookingRequest = z.infer<typeof bookingRequestSchema>
