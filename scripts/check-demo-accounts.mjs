// Kiểm tra nhanh 3 tài khoản demo có thể tạo phiên đăng nhập từ mã OTP cố định.
// Chạy cùng biến môi trường như scripts/seed-demo-accounts.mjs.
import { createRequire } from 'node:module'

const require = createRequire(new URL('../web/package.json', import.meta.url))
const { createClient } = require('@supabase/supabase-js')

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !anonKey || !serviceKey) {
  console.error('Thiếu NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY hoặc SUPABASE_SERVICE_ROLE_KEY.')
  process.exit(1)
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
})
const client = createClient(url, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
})

let failed = false
for (const email of ['customer@air.com', 'partner@air.com', 'admin@air.com']) {
  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  })
  const hashedToken = link?.properties?.hashed_token
  if (linkError || !hashedToken) {
    console.log(`- ${email}: FAIL (không tạo được link)`)
    failed = true
    continue
  }
  let verified = await client.auth.verifyOtp({ token_hash: hashedToken, type: 'magiclink' })
  if (verified.error) {
    verified = await client.auth.verifyOtp({ token_hash: hashedToken, type: 'email' })
  }
  if (verified.error || !verified.data.user) {
    console.log(`- ${email}: FAIL (${verified.error?.message ?? 'không có user'})`)
    failed = true
    continue
  }
  console.log(`- ${email}: OK (${verified.data.user.email})`)
  if (verified.data.session) await client.auth.signOut()
}

process.exitCode = failed ? 1 : 0
