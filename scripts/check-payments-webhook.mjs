// Integration check for the SePay webhook against ONLY the local Supabase project owned by this repo.
// Requires the preview server running with AIR_ENABLE_PAYMENTS=true, SEPAY_WEBHOOK_SECRET set, and
// SUPABASE_SERVICE_ROLE_KEY pointing at the same local project.
// Run from the repository root: node scripts/check-payments-webhook.mjs
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { randomBytes, randomUUID } from 'node:crypto'
import { resolve } from 'node:path'

const container = 'supabase_db_air-rental'
const baseURL = process.env.AIR_PREVIEW_URL || 'http://localhost:3011'
const secret = process.env.SEPAY_WEBHOOK_SECRET
if (!secret) throw new Error('Set SEPAY_WEBHOOK_SECRET to the value the preview was started with.')

function command(args, input = '') {
  return new Promise((done, reject) => {
    const child = spawn('docker', args, { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] })
    let stdout = '', stderr = ''
    child.stdout.on('data', data => { stdout += data })
    child.stderr.on('data', data => { stderr += data })
    child.on('error', reject)
    child.on('close', code => code === 0 ? done(stdout.trim()) : reject(new Error(stderr.trim() || stdout.trim())))
    child.stdin.end(input)
  })
}
const labels = JSON.parse(await command(['inspect', container, '--format', '{{json .Config.Labels}}']))
assert.equal(labels['com.supabase.cli.project'], 'air-rental')
assert.equal(resolve(labels['com.supabase.cli.workdir']).toLowerCase(), resolve('.').toLowerCase())
const sql = text => command(['exec', '-i', container, 'psql', '-U', 'postgres', '-d', 'postgres', '-XAtq', '-v', 'ON_ERROR_STOP=1'], text)

const user = randomUUID()
const category = randomUUID()
const orderId = randomUUID()
const code = `AIR-261101-${randomBytes(4).toString('hex').toUpperCase()}`
const transactionBase = Number(`9${Date.now().toString().slice(-8)}`)

async function post(body, authorization = `Apikey ${secret}`) {
  const response = await fetch(`${baseURL}/api/webhooks/sepay`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization },
    body: JSON.stringify(body),
  })
  return { status: response.status, body: await response.json() }
}

let passed = 0
function pass(name) { passed++; console.log(`PASS ${name}`) }

try {
  await sql(`insert into auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
    values ('${user}','authenticated','authenticated','${user}@example.invalid','{}','{}',now(),now());
    insert into public.categories(id,slug,name) values ('${category}','payments-${category}','Local payments fixture');
    insert into public.orders(id,code,user_id,state,fulfillment,customer_name,customer_phone,
      delivery_address,subtotal_vnd,deposit_vnd,idempotency_key,request_hash)
    values ('${orderId}','${code}','${user}','pending','pickup','Webhook Test','0912345678',
      'Pickup at store',100000,30000,'${randomUUID()}','webhook-fixture');`)

  const deposit = await post({
    id: transactionBase,
    gateway: 'Vietcombank',
    transferType: 'in',
    transferAmount: 30000,
    content: `CK ${code} coc may anh`,
  })
  assert.equal(deposit.status, 200)
  assert.equal(deposit.body.status, 'applied')
  assert.equal(deposit.body.paymentState, 'deposit_paid')
  assert.equal(await sql(`select count(*) from public.payments where order_id='${orderId}'`), '1')
  pass('first transfer is applied once and moves the order to deposit_paid')

  const replay = await post({
    id: transactionBase,
    gateway: 'Vietcombank',
    transferType: 'in',
    transferAmount: 30000,
    content: `CK ${code} coc may anh`,
  })
  assert.equal(replay.status, 200)
  assert.equal(replay.body.status, 'duplicate')
  assert.equal(replay.body.paymentId, deposit.body.paymentId)
  assert.equal(await sql(`select count(*) from public.payments where order_id='${orderId}'`), '1')
  assert.equal(await sql(`select count(*) from public.payment_webhook_events where external_id='${transactionBase}'`), '1')
  pass('webhook replay returns the original payment and never creates a second row')

  const balance = await post({
    id: transactionBase + 1,
    gateway: 'Vietcombank',
    transferType: 'in',
    transferAmount: 100000,
    content: `Thanh toan ${code}`,
  })
  assert.equal(balance.body.status, 'applied')
  assert.equal(balance.body.paymentState, 'paid')
  assert.equal(await sql(`select payment_state from public.orders where id='${orderId}'`), 'paid')
  pass('the rental balance is recorded and the order reaches paid')

  const unauthorized = await post({ id: transactionBase + 2, transferType: 'in', transferAmount: 30000, content: code }, 'Apikey wrong')
  assert.equal(unauthorized.status, 401)
  assert.equal(await sql(`select count(*) from public.payments where order_id='${orderId}'`), '2')
  pass('a wrong API key is rejected without touching the ledger')

  const noCode = await post({ id: transactionBase + 3, transferType: 'in', transferAmount: 50000, content: 'Khach chuyen nham' })
  assert.equal(noCode.status, 200)
  assert.equal(noCode.body.status, 'ignored')
  assert.equal(await sql(`select count(*) from public.payments where order_id='${orderId}'`), '2')
  assert.equal(await sql(`select outcome from public.payment_webhook_events where external_id='${transactionBase + 3}'`), 'ignored')
  pass('a transfer without an order code is acknowledged, stored, and never applied')

  const outgoing = await post({ id: transactionBase + 4, transferType: 'out', transferAmount: 30000, content: code })
  assert.equal(outgoing.status, 200)
  assert.equal(outgoing.body.status, 'ignored')
  assert.equal(await sql(`select count(*) from public.payments where order_id='${orderId}'`), '2')
  pass('outgoing bank transfers are ignored')

  console.log(`${passed}/6 webhook checks passed`)
} finally {
  await sql(`delete from public.payment_webhook_events where order_id='${orderId}' or external_id like '${transactionBase}%';
    delete from public.order_events where order_id='${orderId}';
    delete from public.payments where order_id='${orderId}';
    delete from public.orders where id='${orderId}';
    delete from public.categories where id='${category}';
    delete from auth.users where id='${user}';`).catch(error => console.error('cleanup failed:', error.message))
}
