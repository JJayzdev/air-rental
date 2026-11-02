/** Shared pricing shapes. Kept free of server-only imports so checkout can use them. */
export interface DeliveryZoneView {
  id: string
  name: string
  feeVnd: number
  freeFromVnd: number | null
  notes: string
}

export interface AppliedDiscount {
  code: string
  subtotalVnd: number
  discountVnd: number
  description: string
}
