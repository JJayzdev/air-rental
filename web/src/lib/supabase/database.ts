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
        }
        Returns: {
          order_id: string
          order_code: string
          subtotal_vnd: number
          deposit_vnd: number
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
        }
        Returns: {
          order_id: string
          order_code: string
          subtotal_vnd: number
          deposit_vnd: number
          rental_days: number
        }[]
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
    }
    Enums: {
      app_role: 'customer' | 'staff' | 'admin'
      fulfillment_method: 'pickup' | 'delivery'
      order_state: OrderState
      payment_state: OrderPaymentState
    }
    CompositeTypes: Record<string, never>
  }
}
