import { z } from 'zod'

const vnPhone = /^(0|\+84)(3|5|7|8|9)[0-9]{8}$/

export const customerAddressSchema = z
  .object({
    addressId: z.union([z.literal(''), z.string().uuid()]).transform((value) => value || null),
    label: z.string().trim().min(1).max(40),
    recipientName: z.string().trim().min(2).max(120),
    phone: z.string().trim().regex(vnPhone),
    addressLine: z.string().trim().min(5).max(180),
    ward: z.string().trim().min(1).max(100),
    district: z.string().trim().min(1).max(100),
    province: z.string().trim().min(1).max(100),
    isDefault: z.enum(['true', 'false']).transform((value) => value === 'true'),
  })
  .strict()

export type CustomerAddressInput = z.infer<typeof customerAddressSchema>
