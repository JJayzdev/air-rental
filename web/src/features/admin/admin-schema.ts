import { z } from 'zod'

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const assetTagPattern = /^[A-Za-z0-9][A-Za-z0-9._-]{1,39}$/
const datePattern = /^\d{4}-\d{2}-\d{2}$/

const vndAmount = (min: number, max: number) =>
  z
    .string()
    .trim()
    .regex(/^\d{1,12}$/)
    .transform(Number)
    .refine((value) => value >= min && value <= max)

export const adminProductSchema = z
  .object({
    productId: z.union([z.literal(''), z.string().uuid()]).transform((value) => value || null),
    categoryId: z.string().uuid(),
    slug: z.string().trim().min(3).max(80).regex(slugPattern),
    name: z.string().trim().min(3).max(120),
    description: z.string().trim().max(2000),
    pricePerDayVnd: vndAmount(1000, 100_000_000),
    depositVnd: vndAmount(0, 200_000_000),
    state: z.enum(['draft', 'active', 'archived']),
  })
  .strict()

export const adminUnitSchema = z
  .object({
    productId: z.string().uuid(),
    assetTag: z.string().trim().regex(assetTagPattern),
    readyOn: z.string().regex(datePattern),
  })
  .strict()

export const adminUnitStateSchema = z
  .object({
    unitId: z.string().uuid(),
    state: z.enum(['available', 'retired']),
  })
  .strict()

export const maintenanceSchema = z
  .object({
    unitId: z.string().uuid(),
    reason: z.enum(['scheduled', 'repair', 'inspection']),
    expectedEndOn: z.string().regex(datePattern),
    notes: z.string().trim().max(500),
  })
  .strict()

export const closeMaintenanceSchema = z
  .object({
    maintenanceId: z.string().uuid(),
    completedOn: z
      .union([z.literal(''), z.string().regex(datePattern)])
      .transform((value) => value || null),
  })
  .strict()

export type AdminProductInput = z.infer<typeof adminProductSchema>
export type AdminUnitInput = z.infer<typeof adminUnitSchema>
export type MaintenanceInput = z.infer<typeof maintenanceSchema>
