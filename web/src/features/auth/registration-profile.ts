import 'server-only'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database'
import { registrationAddressSchema } from './schema.ts'

const vnPhone = /^(0|\+84)(3|5|7|8|9)[0-9]{8}$/

/**
 * Copies the customer details collected on the registration form from the auth
 * user metadata into the profile and address book. Safe to call after every
 * login: a sync marker keeps it idempotent.
 */
export async function syncRegistrationProfile(
  supabase: SupabaseClient<Database>,
  user: User,
): Promise<void> {
  const metadata = user.user_metadata ?? {}
  if (metadata.registration_synced === true) return

  const fullName = typeof metadata.full_name === 'string' ? metadata.full_name.trim() : ''
  const phone = typeof metadata.phone === 'string' ? metadata.phone.trim() : ''
  const address = registrationAddressSchema.safeParse(metadata.registration_address)
  const hasName = fullName.length >= 2 && fullName.length <= 120
  const hasPhone = vnPhone.test(phone)
  if (!hasName) return

  try {
    if (hasName) {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName, phone: hasPhone ? phone : null })
        .eq('id', user.id)
      if (error) return
    }

    if (address.success && hasName && hasPhone) {
      const { data: existing } = await supabase
        .from('customer_addresses')
        .select('id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle()
      if (!existing) {
        const { error } = await supabase.rpc('save_customer_address', {
          p_address_id: null,
          p_label: address.data.label,
          p_recipient_name: fullName,
          p_phone: phone,
          p_address_line: address.data.address_line,
          p_ward: address.data.ward,
          p_district: address.data.district,
          p_province: address.data.province,
          p_is_default: true,
        })
        if (error) return
      }
    }

    await supabase.auth.updateUser({ data: { registration_synced: true } })
  } catch {
    // A profile sync failure must never block a successful sign-in.
  }
}
