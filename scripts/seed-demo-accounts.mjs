// Tạo 3 tài khoản demo A.I.R trên Supabase (production hoặc local).
//
// Cách chạy:
//   $env:NEXT_PUBLIC_SUPABASE_URL="https://<project>.supabase.co"
//   $env:SUPABASE_SERVICE_ROLE_KEY="<service_role_key>"
//   node scripts/seed-demo-accounts.mjs
//
// Script chỉ tạo/cập nhật đúng 3 email demo và các sản phẩm mẫu gắn với đối tác
// demo. Không in ra khóa bí mật. Chạy lại nhiều lần vẫn an toàn (idempotent).
import { createRequire } from 'node:module'
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)))
const require = createRequire(new URL('../web/package.json', import.meta.url))
const { createClient } = require('@supabase/supabase-js')

const DEMO_MARKER = 'air_demo'
const DEMO_VERSION = 'v1'
const ACCOUNTS = [
  {
    email: 'customer@air.com',
    role: 'customer',
    fullName: 'Khách hàng Demo A.I.R',
    phone: '0900000001',
  },
  {
    email: 'partner@air.com',
    role: 'partner',
    fullName: 'Đối tác Demo A.I.R',
    phone: '0900000002',
  },
  {
    email: 'admin@air.com',
    role: 'admin',
    fullName: 'Quản trị Demo A.I.R',
    phone: '0900000003',
  },
]

const PARTNER_PRODUCTS = [
  {
    slug: 'demo-doi-tac-laptop',
    name: 'Laptop đối tác demo',
    category: 'laptop',
    price: 320_000,
    deposit: 5_000_000,
    quantity: 2,
    specifications: { 'màn hình': '14 inch', ram: '16 GB', 'ghi chú': 'Sản phẩm demo của đối tác' },
  },
  {
    slug: 'demo-doi-tac-may-anh',
    name: 'Máy ảnh đối tác demo',
    category: 'camera',
    price: 450_000,
    deposit: 7_000_000,
    quantity: 2,
    specifications: { 'cảm biến': 'APS-C', video: '4K', 'ghi chú': 'Sản phẩm demo của đối tác' },
  },
]

async function loadEnvFiles() {
  for (const file of [
    resolve(ROOT, 'web/.env.local'),
    resolve(ROOT, 'web/.env'),
    resolve(ROOT, '.env.local'),
    resolve(ROOT, '.env'),
  ]) {
    if (!existsSync(file)) continue
    const text = await readFile(file, 'utf8')
    for (const line of text.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (!match) continue
      const [, key, rawValue] = match
      if (process.env[key]) continue
      process.env[key] = rawValue.replace(/^['"]|['"]$/g, '')
    }
  }
}

function requiredEnv(name) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`Thiếu biến môi trường ${name}.`)
  return value
}

async function listAllUsers(admin) {
  const users = []
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw new Error('Không đọc được danh sách người dùng Supabase.')
    users.push(...data.users)
    if (data.users.length < 1000) return users
  }
  throw new Error('Danh sách người dùng vượt quá giới hạn an toàn.')
}

async function seedPartnerProducts(admin, partnerId) {
  const { data: categories, error } = await admin.from('categories').select('id, slug')
  if (error) throw new Error('Không đọc được danh mục sản phẩm.')
  const categoryBySlug = new Map((categories ?? []).map((category) => [category.slug, category.id]))

  for (const product of PARTNER_PRODUCTS) {
    const categoryId = categoryBySlug.get(product.category)
    if (!categoryId) {
      console.warn(`- Bỏ qua ${product.slug}: thiếu danh mục ${product.category}.`)
      continue
    }
    const { data: saved, error: productError } = await admin
      .from('products')
      .upsert(
        {
          partner_id: partnerId,
          category_id: categoryId,
          slug: product.slug,
          name: product.name,
          description: 'Sản phẩm demo thuộc tài khoản đối tác A.I.R.',
          price_per_day_vnd: product.price,
          deposit_vnd: product.deposit,
          state: 'active',
          specifications: product.specifications,
          image_urls: ['/images/catalog-placeholder.svg'],
          image_alt: 'Ảnh minh họa sản phẩm demo đối tác',
          sort_order: 900,
          is_sample: false,
        },
        { onConflict: 'slug' },
      )
      .select('id')
      .single()
    if (productError || !saved) throw new Error(`Không tạo được sản phẩm demo ${product.slug}.`)
    await seedProductUnits(admin, saved.id, product.slug, product.quantity)
  }
}

/** Tạo đủ số thiết bị trong kho, bỏ qua mã tài sản đã tồn tại (idempotent). */
async function seedProductUnits(admin, productId, slug, quantity) {
  const { data: existing, error } = await admin
    .from('product_units')
    .select('asset_tag')
    .eq('product_id', productId)
  if (error) throw new Error(`Không đọc được thiết bị của ${slug}.`)

  const tags = new Set((existing ?? []).map((unit) => unit.asset_tag))
  const rows = []
  for (let index = 1; index <= quantity; index += 1) {
    const assetTag = `${slug.toUpperCase()}-${String(index).padStart(3, '0')}`
    if (!tags.has(assetTag)) rows.push({ product_id: productId, asset_tag: assetTag })
  }
  if (rows.length === 0) return

  const { error: insertError } = await admin.from('product_units').insert(rows)
  if (insertError) throw new Error(`Không tạo được thiết bị cho ${slug}.`)
}

async function main() {
  await loadEnvFiles()
  const url = requiredEnv('NEXT_PUBLIC_SUPABASE_URL')
  const serviceRoleKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY')
  const admin = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  })

  const existingUsers = await listAllUsers(admin)
  const byEmail = new Map(
    existingUsers
      .filter((user) => user.email)
      .map((user) => [user.email.toLowerCase(), user]),
  )

  const summary = []
  for (const account of ACCOUNTS) {
    let user = byEmail.get(account.email)
    if (!user) {
      const { data, error } = await admin.auth.admin.createUser({
        email: account.email,
        email_confirm: true,
        app_metadata: { [DEMO_MARKER]: DEMO_VERSION },
        user_metadata: { full_name: account.fullName, demo: true },
      })
      if (error || !data.user) {
        throw new Error(`Không tạo được tài khoản ${account.email}: ${error?.message ?? 'unknown'}`)
      }
      user = data.user
    } else {
      const { data, error } = await admin.auth.admin.updateUserById(user.id, {
        email_confirm: true,
        app_metadata: { ...(user.app_metadata ?? {}), [DEMO_MARKER]: DEMO_VERSION },
        user_metadata: { ...(user.user_metadata ?? {}), full_name: account.fullName, demo: true },
      })
      if (error || !data.user) {
        throw new Error(`Không cập nhật được tài khoản ${account.email}.`)
      }
      user = data.user
    }

    const { error: profileError } = await admin.from('profiles').upsert(
      {
        id: user.id,
        role: account.role,
        full_name: account.fullName,
        phone: account.phone,
      },
      { onConflict: 'id' },
    )
    if (profileError) throw new Error(`Không cập nhật được hồ sơ ${account.email}.`)

    if (account.role === 'partner') {
      const { data: partner, error: partnerError } = await admin
        .from('partners')
        .upsert(
          {
            user_id: user.id,
            display_name: account.fullName,
            email: account.email,
            phone: account.phone,
            commission_rate: 15,
            status: 'active',
          },
          { onConflict: 'user_id' },
        )
        .select('id')
        .single()
      if (partnerError || !partner) {
        throw new Error('Không tạo được hồ sơ đối tác demo. Hãy chắc chắn migration partners đã chạy.')
      }
      await seedPartnerProducts(admin, partner.id)
    }

    summary.push({ email: account.email, role: account.role })
  }

  console.log('Đã tạo/cập nhật tài khoản demo:')
  for (const item of summary) {
    console.log(`- ${item.email} → ${item.role} (OTP mặc định: 111111)`)
  }
  console.log('Sản phẩm demo của đối tác: demo-doi-tac-laptop, demo-doi-tac-may-anh')
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Tạo tài khoản demo thất bại.')
  process.exitCode = 1
})
