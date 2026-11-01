import { z } from 'zod'

const vietnamesePhone = /^(0|\+84)(3|5|7|8|9)[0-9]{8}$/

export const ownProfileSchema = z
  .object({
    fullName: z.string().trim().min(2).max(120),
    phone: z
      .union([z.literal(''), z.string().trim().regex(vietnamesePhone)])
      .transform((value) => value || null),
  })
  .strict()

export type OwnProfileInput = z.infer<typeof ownProfileSchema>
