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

const optionalDate = z
  .union([z.literal(''), z.string().regex(datePattern)])
  .transform((value) => value || null)

const optionalVnd = (min: number, max: number) =>
  z
    .union([
      z.literal(''),
      z
        .string()
        .trim()
        .regex(/^\d{1,12}$/)
        .transform(Number)
        .refine((value) => value >= min && value <= max),
    ])
    .transform((value) => (value === '' ? null : value))

const optionalCount = z
  .union([
    z.literal(''),
    z
      .string()
      .trim()
      .regex(/^\d{1,6}$/)
      .transform(Number),
  ])
  .transform((value) => (value === '' ? null : value))

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

export const adminDiscountCodeSchema = z
  .object({
    discountId: z.union([z.literal(''), z.string().uuid()]).transform((value) => value || null),
    code: z
      .string()
      .trim()
      .regex(/^[A-Za-z0-9][A-Za-z0-9_-]{2,31}$/)
      .transform((value) => value.toUpperCase()),
    description: z.string().trim().max(200),
    kind: z.enum(['percent', 'fixed']),
    value: z
      .string()
      .trim()
      .regex(/^\d{1,9}$/)
      .transform(Number),
    minSubtotalVnd: vndAmount(0, 1_000_000_000),
    maxUses: optionalCount,
    startsOn: optionalDate,
    endsOn: optionalDate,
    active: z.boolean(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.kind === 'percent' && (value.value < 1 || value.value > 100)) {
      context.addIssue({
        code: 'custom',
        path: ['value'],
        message: 'Percent discount must be between 1 and 100',
      })
    }
    if (value.kind === 'fixed' && (value.value < 1000 || value.value > 100_000_000)) {
      context.addIssue({
        code: 'custom',
        path: ['value'],
        message: 'Fixed discount must be between 1,000 and 100,000,000 VND',
      })
    }
    if (value.maxUses !== null && value.maxUses < 1) {
      context.addIssue({ code: 'custom', path: ['maxUses'], message: 'Usage limit is invalid' })
    }
    if (value.startsOn && value.endsOn && value.endsOn < value.startsOn) {
      context.addIssue({
        code: 'custom',
        path: ['endsOn'],
        message: 'End date precedes start date',
      })
    }
  })

export const adminDeliveryZoneSchema = z
  .object({
    zoneId: z.union([z.literal(''), z.string().uuid()]).transform((value) => value || null),
    name: z.string().trim().min(2).max(80),
    feeVnd: vndAmount(0, 10_000_000),
    freeFromVnd: optionalVnd(0, 1_000_000_000),
    notes: z.string().trim().max(200),
    sortOrder: z
      .string()
      .trim()
      .regex(/^\d{1,4}$/)
      .transform(Number),
    active: z.boolean(),
  })
  .strict()

export type AdminDiscountCodeInput = z.infer<typeof adminDiscountCodeSchema>
export type AdminDeliveryZoneInput = z.infer<typeof adminDeliveryZoneSchema>
