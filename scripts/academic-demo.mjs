// Guarded lifecycle for the persistent A.I.R academic demo fixtures.
// All writes are restricted to this repository's Supabase CLI project and exact fixture markers.
import { execFileSync, spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)))
const PROJECT_ID = 'air-rental'
const API_URL = 'http://127.0.0.1:55321'
const DB_CONTAINER = 'supabase_db_air-rental'
const FIXTURE_MARKER = 'air_academic_demo'
const FIXTURE_VERSION = 'v1'
const PRODUCT_SLUG = 'academic-demo-laptop'
const PRODUCT_DESCRIPTION = 'ACADEMIC DEMO FIXTURE ONLY — fictitious coursework product; not physical inventory.'
const ASSET_TAG = 'ACADEMIC-DEMO-UNIT-001'
const ROLE_USERS = [
  { email: 'academic-student@example.invalid', role: 'customer', fullName: 'Học viên mô phỏng A.I.R' },
  { email: 'academic-staff@example.invalid', role: 'staff', fullName: 'Nhân viên test A.I.R' },
  { email: 'academic-admin@example.invalid', role: 'admin', fullName: 'Quản trị test A.I.R' },
]
const require = createRequire(new URL('../web/package.json', import.meta.url))
const { createClient } = require('@supabase/supabase-js')

function fail(message) {
  console.error(message)
  process.exitCode = 1
}

function runSupabaseStatus() {
  const candidates = process.platform === 'win32'
    ? [{ command: 'supabase', shell: false }, { command: 'npx.cmd', shell: true }]
    : [{ command: 'supabase', shell: false }, { command: 'npx', shell: false }]
  for (const candidate of candidates) {
    const args = candidate.command === 'npx' || candidate.command === 'npx.cmd'
      ? ['--yes', 'supabase', 'status', '-o', 'json']
      : ['status', '-o', 'json']
    const result = spawnSync(candidate.command, args, {
      cwd: ROOT,
      encoding: 'utf8',
      windowsHide: true,
      shell: candidate.shell,
      timeout: 20_000,
    })
    if (result.error?.code === 'ENOENT') continue
    if (result.status !== 0) throw new Error('Supabase local status failed; verify the dedicated local stack is running.')
    try {
      return JSON.parse(result.stdout)
    } catch {
      throw new Error('Supabase CLI did not return status JSON.')
    }
  }
  throw new Error('Supabase CLI was not found. Install it or run this script with the CLI available on PATH.')
}

function checkedLocalStatus() {
  const config = execFileSync('docker', ['inspect', DB_CONTAINER, '--format', '{{json .Config.Labels}}'], {
    cwd: ROOT,
    encoding: 'utf8',
    windowsHide: true,
    timeout: 10_000,
  })
  const labels = JSON.parse(config)
  const workdir = resolve(labels['com.supabase.cli.workdir'] ?? '')
  const expectedRoot = resolve(ROOT)
  const samePath = process.platform === 'win32'
    ? workdir.toLowerCase() === expectedRoot.toLowerCase()
    : workdir === expectedRoot
  if (labels['com.supabase.cli.project'] !== PROJECT_ID || !samePath) {
    throw new Error('Refusing fixture access: Docker labels do not match this repository and Supabase project.')
  }
  const status = runSupabaseStatus()
  if (status.API_URL !== API_URL || !status.ANON_KEY || !status.SERVICE_ROLE_KEY) {
    throw new Error('Refusing fixture access: expected local A.I.R API/keys are unavailable.')
  }
  const toml = awaitConfigText
  return { status, toml }
}

// Loaded lazily to keep the guard checks synchronous and all mutations after validation.
let awaitConfigText = ''
async function validateProjectConfig() {
  awaitConfigText = await readFile(resolve(ROOT, 'supabase/config.toml'), 'utf8')
  const project = awaitConfigText.match(/^project_id\s*=\s*"([^"]+)"/m)?.[1]
  if (project !== PROJECT_ID) throw new Error('Refusing fixture access: Supabase config project_id is not air-rental.')
}

function adminClient(status) {
  return createClient(status.API_URL, status.SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

async function listAllUsers(client) {
  const users = []
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw new Error('Unable to inspect local Auth users.')
    users.push(...data.users)
    if (data.users.length < 1000) return users
  }
  throw new Error('Local Auth user listing exceeded its safety limit.')
}

function hasFixtureMarker(user) {
  return user?.app_metadata?.[FIXTURE_MARKER] === FIXTURE_VERSION
}

async function readProduct(client) {
  const { data, error } = await client.from('products')
    .select('id,slug,name,description,state,is_sample,price_per_day_vnd,deposit_vnd')
    .eq('slug', PRODUCT_SLUG)
    .maybeSingle()
  if (error) throw new Error('Unable to inspect academic demo product.')
  return data
}

async function ensureFixtures() {
  await validateProjectConfig()
  const { status } = checkedLocalStatus()
  const client = adminClient(status)
  const initialUsers = await listAllUsers(client)
  const usersByEmail = new Map(initialUsers.map((user) => [user.email, user]))
  for (const fixture of ROLE_USERS) {
    const existing = usersByEmail.get(fixture.email)
    if (existing && !hasFixtureMarker(existing)) {
      throw new Error(`Refusing to modify ${fixture.email}: account does not carry the academic-demo ownership marker.`)
    }
  }
  let product = await readProduct(client)
  if (product && product.description !== PRODUCT_DESCRIPTION) {
    throw new Error(`Refusing to modify ${PRODUCT_SLUG}: product does not carry the academic-demo ownership marker.`)
  }
  const { data: category, error: categoryError } = await client.from('categories')
    .select('id')
    .eq('slug', 'laptop')
    .maybeSingle()
  if (categoryError || !category) throw new Error('The local seed is missing the laptop category.')
  const { data: zone, error: zoneError } = await client.from('delivery_zones')
    .select('id')
    .eq('active', true)
    .limit(1)
    .maybeSingle()
  if (zoneError || !zone) throw new Error('The local seed is missing an active demo delivery zone.')

  const createdUsers = []
  let createdProduct = false
  let createdUnit = false
  try {
    for (const fixture of ROLE_USERS) {
      let user = usersByEmail.get(fixture.email)
      if (!user) {
        const { data, error } = await client.auth.admin.createUser({
          email: fixture.email,
          email_confirm: true,
          app_metadata: { [FIXTURE_MARKER]: FIXTURE_VERSION },
          user_metadata: { display_name: fixture.fullName },
        })
        if (error || !data.user) throw new Error(`Unable to create local fixture account ${fixture.role}.`)
        user = data.user
        createdUsers.push(user.id)
      }
      if (!hasFixtureMarker(user)) throw new Error(`Ownership marker missing for fixture role ${fixture.role}.`)
      const { error: profileError } = await client.from('profiles').upsert({
        id: user.id,
        role: fixture.role,
        full_name: fixture.fullName,
        phone: null,
      }, { onConflict: 'id' })
      if (profileError) throw new Error(`Unable to configure local ${fixture.role} profile.`)
      usersByEmail.set(fixture.email, user)
    }

    const productPayload = {
      category_id: category.id,
      slug: PRODUCT_SLUG,
      name: 'Laptop fixture giả lập A.I.R',
      description: PRODUCT_DESCRIPTION,
      price_per_day_vnd: 350000,
      deposit_vnd: 500000,
      state: 'active',
      specifications: { demo: 'Hư cấu; chỉ dùng trong đồ án' },
      image_urls: ['/images/catalog-placeholder.svg'],
      image_alt: 'Ảnh placeholder — không phải tài sản thật',
      sort_order: 999,
      is_sample: false,
    }
    if (product) {
      const { data, error } = await client.from('products').update(productPayload)
        .eq('id', product.id)
        .select('id,slug,name,description,state,is_sample,price_per_day_vnd,deposit_vnd')
        .single()
      if (error) throw new Error('Unable to refresh the owned academic demo product.')
      product = data
    } else {
      const { data, error } = await client.from('products').insert(productPayload)
        .select('id,slug,name,description,state,is_sample,price_per_day_vnd,deposit_vnd')
        .single()
      if (error) throw new Error('Unable to create the academic demo product.')
      product = data
      createdProduct = true
    }

    const { data: unit, error: unitLookupError } = await client.from('product_units')
      .select('id,product_id,asset_tag')
      .eq('asset_tag', ASSET_TAG)
      .maybeSingle()
    if (unitLookupError) throw new Error('Unable to inspect the academic demo unit.')
    if (unit && unit.product_id !== product.id) {
      throw new Error(`Refusing to modify ${ASSET_TAG}: it is attached to a different product.`)
    }
    const unitPayload = {
      product_id: product.id,
      asset_tag: ASSET_TAG,
      state: 'available',
      ready_on: new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
      }).format(new Date()),
    }
    if (unit) {
      const { error } = await client.from('product_units').update(unitPayload).eq('id', unit.id)
      if (error) throw new Error('Unable to refresh the owned academic demo unit.')
    } else {
      const { error } = await client.from('product_units').insert(unitPayload)
      if (error) throw new Error('Unable to create the academic demo unit.')
      createdUnit = true
    }
    console.log('Academic demo fixtures ready (local only):')
    console.log(`- product slug: ${PRODUCT_SLUG} (fictitious test fixture)`)
    console.log(`- unit tag: ${ASSET_TAG} (not a physical asset)`)
    for (const fixture of ROLE_USERS) console.log(`- ${fixture.role} sign-in: ${fixture.email} (magic link in local Mailpit)`)
    console.log('- no passwords or provider credentials were created or printed')
  } catch (error) {
    // Roll back only rows newly created during this invocation. Never clean pre-existing fixtures here.
    if (createdUnit) await client.from('product_units').delete().eq('asset_tag', ASSET_TAG).eq('product_id', product?.id)
    if (createdProduct && product?.id) await client.from('products').delete().eq('id', product.id)
    for (const id of createdUsers) await client.auth.admin.deleteUser(id)
    throw error
  }
}

async function showStatus() {
  await validateProjectConfig()
  const { status } = checkedLocalStatus()
  const client = adminClient(status)
  const users = await listAllUsers(client)
  const product = await readProduct(client)
  let unitCount = 0
  let orderCount = 0
  if (product?.id) {
    const { count, error } = await client.from('product_units').select('id', { count: 'exact', head: true }).eq('product_id', product.id).eq('asset_tag', ASSET_TAG)
    if (error) throw new Error('Unable to inspect academic demo unit status.')
    unitCount = count ?? 0
  }
  const student = users.find((user) => user.email === ROLE_USERS[0].email)
  if (student && hasFixtureMarker(student)) {
    const { count, error } = await client.from('orders').select('id', { count: 'exact', head: true }).eq('user_id', student.id)
    if (error) throw new Error('Unable to inspect academic demo orders.')
    orderCount = count ?? 0
  }
  console.log(`Project guard: ${PROJECT_ID} at ${API_URL}`)
  console.log(`Product fixture: ${product?.description === PRODUCT_DESCRIPTION ? 'present' : 'missing'}`)
  console.log(`Unit fixture: ${unitCount === 1 ? 'present' : 'missing'}`)
  for (const fixture of ROLE_USERS) {
    const user = users.find((item) => item.email === fixture.email)
    const profile = user && (await client.from('profiles').select('role').eq('id', user.id).maybeSingle()).data
    console.log(`${fixture.role} fixture: ${hasFixtureMarker(user) && profile?.role === fixture.role ? 'present' : 'missing'}`)
  }
  console.log(`Orders owned by demo student fixture: ${orderCount}`)
}

function escapeSql(value) {
  return value.replaceAll("'", "''")
}

function runOwnedCleanupSql() {
  const emails = ROLE_USERS.map(({ email }) => `'${escapeSql(email)}'`).join(',')
  const sql = `
begin;
do $guard$
begin
  if exists (
    select 1 from auth.users
    where email in (${emails})
      and coalesce(raw_app_meta_data->>'${FIXTURE_MARKER}', '') <> '${FIXTURE_VERSION}'
  ) then
    raise exception 'academic-demo ownership marker mismatch; cleanup refused';
  end if;
  if exists (
    select 1 from public.products
    where slug = '${PRODUCT_SLUG}' and description <> '${escapeSql(PRODUCT_DESCRIPTION)}'
  ) then
    raise exception 'academic-demo product marker mismatch; cleanup refused';
  end if;
  if exists (
    select 1 from public.product_units
    where asset_tag = '${ASSET_TAG}'
      and product_id not in (select id from public.products where slug = '${PRODUCT_SLUG}' and description = '${escapeSql(PRODUCT_DESCRIPTION)}')
  ) then
    raise exception 'academic-demo asset marker mismatch; cleanup refused';
  end if;
end
$guard$;
with owned_orders as (
  select id from public.orders
  where user_id in (
    select id from auth.users where email in (${emails})
      and raw_app_meta_data->>'${FIXTURE_MARKER}' = '${FIXTURE_VERSION}'
  )
), deleted_events as (
  delete from public.payment_webhook_events where order_id in (select id from owned_orders) returning 1
)
delete from public.reservations where order_id in (select id from owned_orders);
delete from public.order_items where order_id in (
  select id from public.orders where user_id in (select id from auth.users where email in (${emails}) and raw_app_meta_data->>'${FIXTURE_MARKER}'='${FIXTURE_VERSION}')
);
delete from public.order_events where order_id in (
  select id from public.orders where user_id in (select id from auth.users where email in (${emails}) and raw_app_meta_data->>'${FIXTURE_MARKER}'='${FIXTURE_VERSION}')
);
delete from public.payments where order_id in (
  select id from public.orders where user_id in (select id from auth.users where email in (${emails}) and raw_app_meta_data->>'${FIXTURE_MARKER}'='${FIXTURE_VERSION}')
);
delete from public.orders where user_id in (
  select id from auth.users where email in (${emails}) and raw_app_meta_data->>'${FIXTURE_MARKER}'='${FIXTURE_VERSION}'
);
delete from public.product_units where asset_tag = '${ASSET_TAG}' and product_id in (
  select id from public.products where slug = '${PRODUCT_SLUG}' and description = '${escapeSql(PRODUCT_DESCRIPTION)}'
);
delete from public.products where slug = '${PRODUCT_SLUG}' and description = '${escapeSql(PRODUCT_DESCRIPTION)}';
delete from auth.users where email in (${emails}) and raw_app_meta_data->>'${FIXTURE_MARKER}'='${FIXTURE_VERSION}';
commit;
`
  execFileSync('docker', ['exec', '-i', DB_CONTAINER, 'psql', '-X', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'postgres'], {
    cwd: ROOT,
    input: sql,
    stdio: ['pipe', 'ignore', 'pipe'],
    windowsHide: true,
    timeout: 30_000,
  })
}

async function cleanupFixtures() {
  await validateProjectConfig()
  checkedLocalStatus()
  runOwnedCleanupSql()
  console.log('Removed only academic-demo owned orders, product/unit markers, and marked example.invalid Auth users.')
}

const command = process.argv[2]
try {
  if (command === 'setup') await ensureFixtures()
  else if (command === 'status') await showStatus()
  else if (command === 'cleanup') await cleanupFixtures()
  else {
    console.log('Usage: node scripts/academic-demo.mjs <setup|status|cleanup>')
    process.exitCode = 2
  }
} catch (error) {
  const message = error instanceof Error ? error.message : 'Academic demo operation failed.'
  fail(message)
}
