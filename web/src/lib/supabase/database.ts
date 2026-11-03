export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

type Table<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row
  Insert: Insert
  Update: Update
  Relationships: []
}

export type OrderState =
  | 'pending'
  | 'confirmed'
  | 'delivering'
  | 'active'
  | 'returning'
  | 'completed'
  | 'cancelled'
  | 'expired'
  | 'overdue'

export type OrderPaymentState = 'unpaid' | 'deposit_paid' | 'paid' | 'refund_pending' | 'refunded'

export type PaymentKind = 'payment' | 'deposit_refund'

export type MaintenanceReason = 'scheduled' | 'repair' | 'inspection'

export type DiscountKind = 'percent' | 'fixed'

export type DiscountCodeRow = {
  id: string
  code: string
  description: string
  kind: DiscountKind
  value: number
  min_subtotal_vnd: number
  max_uses: number | null
  used_count: number
  starts_on: string | null
  ends_on: string | null
  active: boolean
  created_at: string
  updated_at: string
}

export type DeliveryZoneRow = {
  id: string
  name: string
  fee_vnd: number
  free_from_vnd: number | null
  notes: string
  sort_order: number
  active: boolean
  created_at: string
  updated_at: string
}

export type UnitMaintenanceRow = {
  id: string
  unit_id: string
  reason: MaintenanceReason
  notes: string
  started_on: string
  expected_end_on: string
  completed_on: string | null
  created_by: string | null
  created_at: string
}

export type AdminDashboardRow = {
  pending_orders: number
  confirmed_orders: number
  active_rentals: number
  overdue_orders: number
  refunds_pending: number
  month_revenue_vnd: number
  month_refunds_vnd: number
  available_units: number
  maintenance_units: number
  pending_identity_documents: number
}

export type IdentityDocumentStatus =
  'requested' | 'pending_review' | 'approved' | 'rejected' | 'cancelled'

export type CustomerAddressRow = {
  id: string
  user_id: string
  label: string
  recipient_name: string
  phone: string
  address_line: string
  ward: string
  district: string
  province: string
  is_default: boolean
  created_at: string
  updated_at: string
}

export type IdentityDocumentRequestRow = {
  id: string
  user_id: string
  requested_by: string
  status: IdentityDocumentStatus
  created_at: string
  updated_at: string
  reviewed_at: string | null
  reviewed_by: string | null
}

export type PaymentRow = {
  id: string
  order_id: string
  provider: 'sepay' | 'manual'
  external_id: string | null
  direction: 'in' | 'out'
  kind: PaymentKind
  amount_vnd: number
  status: 'pending' | 'succeeded' | 'cancelled'
  transfer_content: string | null
  payload: Json
  created_at: string
  updated_at: string
}

export interface Database {
  public: {
    Tables: {
      profiles: Table<{
        id: string
        role: 'customer' | 'staff' | 'admin'
        full_name: string | null
        phone: string | null
      }>
      customer_addresses: Table<CustomerAddressRow>
      categories: Table<{ id: string; slug: string; name: string; sort_order: number }>
      products: Table<{
        id: string
        slug: string
        name: string
        description: string
        category_id: string
        image_urls: string[]
        state: 'draft' | 'active' | 'archived'
        is_sample: boolean
        price_per_day_vnd: number
        deposit_vnd: number
      }>
      product_units: Table<{
        id: string
        product_id: string
        asset_tag: string
        state: 'available' | 'maintenance' | 'retired'
        ready_on: string
      }>
      unit_maintenance: Table<UnitMaintenanceRow>
      discount_codes: Table<DiscountCodeRow>
      delivery_zones: Table<DeliveryZoneRow>
      orders: Table<{
        id: string
        code: string
        user_id: string
        state: OrderState
        fulfillment: 'pickup' | 'delivery'
        customer_name: string
        customer_phone: string
        delivery_address: string
        subtotal_vnd: number
        discount_code_id: string | null
        discount_code: string
        discount_vnd: number
        delivery_zone_id: string | null
        delivery_zone_name: string
        delivery_fee_vnd: number
        total_vnd: number
        deposit_vnd: number
        payment_state: OrderPaymentState
        created_at: string
        expires_at: string
      }>
      order_items: Table<{
        id: string
        order_id: string
        unit_id: string
        product_id: string
        product_name_snapshot: string
        rental_period: string
        price_per_day_vnd: number
        rental_days: number
        line_total_vnd: number
      }>
      order_events: Table<{
        id: number
        order_id: string
        actor_id: string | null
        from_state: OrderState | null
        to_state: OrderState
        created_at: string
      }>
      user_favorites: Table<{ user_id: string; product_id: string; created_at: string }>
      payments: Table<PaymentRow>
      payment_webhook_events: Table<{
        id: number
        provider: 'sepay'
        external_id: string
        payload: Json
        outcome: 'applied' | 'ignored' | 'duplicate'
        order_id: string | null
        payment_id: string | null
        received_at: string
      }>
      identity_document_requests: Table<IdentityDocumentRequestRow>
      identity_document_events: Table<{
        id: number
        request_id: string
        actor_id: string | null
        from_status: IdentityDocumentStatus | null
        to_status: IdentityDocumentStatus
        created_at: string
      }>
    }
    Views: Record<string, never>
    Functions: {
      consume_chat_rate_limit: {
        Args: { p_ip_hash: string; p_user_hash: string | null }
        Returns: boolean
      }
      booking_calendar: {
        Args: { p_items: Json; p_from: string; p_to: string; p_start: string | null }
        Returns: { rental_date: string; available: boolean }[]
      }
      create_multi_product_booking: {
        Args: {
          p_idempotency_key: string
          p_items: Json
          p_start: string
          p_end: string
          p_fulfillment: 'pickup' | 'delivery'
          p_customer_name: string
          p_customer_phone: string
          p_delivery_address: string
          p_discount_code?: string
          p_delivery_zone_id?: string | null
        }
        Returns: {
          order_id: string
          order_code: string
          subtotal_vnd: number
          discount_vnd: number
          delivery_fee_vnd: number
          deposit_vnd: number
          total_vnd: number
          rental_days: number
        }[]
      }
      create_booking: {
        Args: {
          p_idempotency_key: string
          p_product_id: string
          p_quantity: number
          p_start: string
          p_end: string
          p_fulfillment: 'pickup' | 'delivery'
          p_customer_name: string
          p_customer_phone: string
          p_delivery_address: string
          p_discount_code?: string
          p_delivery_zone_id?: string | null
        }
        Returns: {
          order_id: string
          order_code: string
          subtotal_vnd: number
          discount_vnd: number
          delivery_fee_vnd: number
          deposit_vnd: number
          total_vnd: number
          rental_days: number
        }[]
      }
      preview_booking_discount: {
        Args: { p_items: Json; p_start: string; p_end: string; p_discount_code: string }
        Returns: { subtotal_vnd: number; discount_vnd: number; description: string }[]
      }
      preview_booking_quote: {
        Args: {
          p_items: Json
          p_start: string
          p_end: string
          p_fulfillment: 'pickup' | 'delivery'
          p_discount_code?: string
          p_delivery_zone_id?: string | null
        }
        Returns: Json
      }
      cancel_booking: { Args: { p_order_id: string }; Returns: undefined }
      expire_pending_bookings: { Args: Record<PropertyKey, never>; Returns: number }
      transition_booking: { Args: { p_order_id: string; p_next: OrderState }; Returns: undefined }
      current_app_role: {
        Args: Record<PropertyKey, never>
        Returns: 'customer' | 'staff' | 'admin'
      }
      save_customer_address: {
        Args: {
          p_address_id: string | null
          p_label: string
          p_recipient_name: string
          p_phone: string
          p_address_line: string
          p_ward: string
          p_district: string
          p_province: string
          p_is_default: boolean
        }
        Returns: CustomerAddressRow[]
      }
      delete_customer_address: { Args: { p_address_id: string }; Returns: undefined }
      request_identity_document: {
        Args: { p_user_id: string }
        Returns: IdentityDocumentRequestRow[]
      }
      submit_identity_document: {
        Args: { p_request_id: string }
        Returns: IdentityDocumentRequestRow[]
      }
      delete_identity_document_request: { Args: { p_request_id: string }; Returns: undefined }
      review_identity_document: {
        Args: { p_request_id: string; p_decision: 'approved' | 'rejected' }
        Returns: IdentityDocumentRequestRow[]
      }
      identity_documents_enabled: { Args: Record<PropertyKey, never>; Returns: boolean }
      apply_sepay_payment: {
        Args: {
          p_external_id: string
          p_amount_vnd: number
          p_content: string
          p_payload: Json
        }
        Returns: Json
      }
      complete_deposit_refund: { Args: { p_payment_id: string }; Returns: undefined }
      admin_dashboard: { Args: Record<PropertyKey, never>; Returns: AdminDashboardRow[] }
      open_unit_maintenance: {
        Args: {
          p_unit_id: string
          p_reason: MaintenanceReason
          p_expected_end_on: string
          p_notes?: string
        }
        Returns: UnitMaintenanceRow[]
      }
      close_unit_maintenance: {
        Args: { p_maintenance_id: string; p_completed_on?: string | null }
        Returns: UnitMaintenanceRow[]
      }
    }
    Enums: {
      app_role: 'customer' | 'staff' | 'admin'
      fulfillment_method: 'pickup' | 'delivery'
      order_state: OrderState
      payment_state: OrderPaymentState
      maintenance_reason: MaintenanceReason
      discount_kind: DiscountKind
    }
    CompositeTypes: Record<string, never>
  }
}
