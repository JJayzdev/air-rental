// Local-only end-to-end acceptance: rental checkout -> SePay-shaped mock webhook -> owner lookup.
// Never points at hosted Supabase and never reads or prints a real bank secret.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(new URL('../web/package.json', import.meta.url))
const { chromium, expect } = require('@playwright/test')
const baseURL = process.env.AIR_PREVIEW_URL || 'http://localhost:3011'
const target = new URL(baseURL)
assert.ok(['localhost', '127.0.0.1', '::1'].includes(target.hostname), 'Preview must be local.')
assert.equal(target.port || '80', '3011', 'Use the dedicated local preview on port 3011.')
const projectRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const labelsText = execFileSync('docker', ['inspect', 'supabase_db_air-rental', '--format', '{{json .Config.Labels}}'], { encoding: 'utf8', windowsHide: true })
const labels = JSON.parse(labelsText)
assert.equal(labels['com.supabase.cli.project'], 'air-rental')
assert.equal(resolve(labels['com.supabase.cli.workdir']).toLowerCase(), projectRoot.toLowerCase())
const sql = (query) => execFileSync('docker', ['exec', '-i', 'supabase_db_air-rental', 'psql', '-U', 'postgres', '-d', 'postgres', '-XAtq', '-v', 'ON_ERROR_STOP=1'], { input: query, encoding: 'utf8', windowsHide: true }).trim()
const cachedBrowser = 'C:/Users/ASUS/AppData/Local/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-win64/chrome-headless-shell.exe'
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || (existsSync(cachedBrowser) ? cachedBrowser : undefined)
const secret = 'air-local-gd7-webhook-only-55321-3011'
const run = randomUUID().replaceAll('-', '').slice(0, 10)
const productId = randomUUID()
const unitId = randomUUID()
const discountId = randomUUID()
const tierId = randomUUID()
const zoneId = randomUUID()
const email = `gd7-${run}@example.invalid`
const otherEmail = `gd7-other-${run}@example.invalid`
const productSlug = `gd7-${run}`
const productName = `Máy ảnh kiểm thử GĐ7 ${run}`
const discountCode = `GD7${run.toUpperCase()}`
const startDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
const endDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(Date.now() + 2 * 86400000))
const browser = await chromium.launch({ executablePath, headless: true })
const context = await browser.newContext({ viewport: { width: 1365, height: 1000 } })
const page = await context.newPage()
const otherContext = await browser.newContext({ viewport: { width: 1365, height: 1000 } })
const otherPage = await otherContext.newPage()
let userId
let fixtureCleanupError

async function signIn(targetPage, next, loginEmail = email) {
  await targetPage.goto(`${baseURL}/dang-nhap?next=${encodeURIComponent(next)}`)
  await targetPage.getByLabel('Email', { exact: true }).fill(loginEmail)
  await targetPage.getByRole('button', { name: 'Gửi liên kết đăng nhập' }).click()
  await targetPage.getByText('Nếu email hợp lệ, chúng tôi đã gửi liên kết đăng nhập.').waitFor()
  const deadline = Date.now() + 20000
  let magicLink
  while (Date.now() < deadline && !magicLink) {
    const messages = await (await fetch('http://127.0.0.1:55324/api/v1/messages')).json()
    const message = messages.messages.find((item) => item.To?.some((to) => to.Address === loginEmail))
    if (message) {
      const details = await (await fetch(`http://127.0.0.1:55324/api/v1/message/${message.ID}`)).json()
      const match = `${details.Text}\n${details.HTML}`.match(/https?:\/\/[^\s"<>]*\/auth\/v1\/verify\?[^\s"<>]+/)
      assert.ok(match, 'Local mail has a magic link.')
      magicLink = match[0].replaceAll('&amp;', '&')
      assert.equal(new URL(magicLink).origin, 'http://127.0.0.1:55321')
    } else await new Promise((done) => setTimeout(done, 250))
  }
  assert.ok(magicLink, 'Magic link arrived in local mail.')
  await targetPage.goto(magicLink)
  await targetPage.waitForURL(`${baseURL}${next}`)
}

async function webhook(body, authorization = `Apikey ${secret}`) {
  const response = await fetch(`${baseURL}/api/webhooks/sepay`, {
    method: 'POST', headers: { 'content-type': 'application/json', authorization }, body: JSON.stringify(body),
  })
  return { status: response.status, body: await response.json() }
}

try {
  sql(`insert into public.products(id,category_id,slug,name,description,price_per_day_vnd,deposit_vnd,state,is_sample)
    values ('${productId}',(select id from public.categories where slug='camera'),'${productSlug}','${productName}','Local GĐ7 fixture only.',700000,500000,'active',false);
    insert into public.product_units(id,product_id,asset_tag) values ('${unitId}','${productId}','GD7-${run}');
    insert into public.price_tiers(id,product_id,min_days,max_days,discount_percent)
    values ('${tierId}','${productId}',3,null,10);
    insert into public.delivery_zones(id,name,fee_vnd,free_from_vnd,active)
    values ('${zoneId}','Academic delivery ${run}',30000,1800000,true);
    insert into public.discount_codes(id,code,description,kind,value,min_subtotal_vnd,max_uses,active)
    values ('${discountId}','${discountCode}','Ephemeral local GD7 fixture','percent',10,0,10,true);`)
  console.log(`GD7 fixture marker: ${run}`)

  await page.goto(`${baseURL}/san-pham/${productSlug}`)
  await page.getByTestId('add-to-rental-cart').click()
  await page.goto(`${baseURL}/gio-thue`)
  await page.getByTestId('rental-start').selectOption(startDate)
  await page.getByTestId('rental-end').selectOption(endDate)
  await page.getByRole('link', { name: 'Tiếp tục đặt thuê' }).click()
  await page.waitForURL(/\/dang-nhap/)
  await signIn(page, '/checkout')
  userId = sql(`select id from auth.users where email='${email}'`)
  assert.match(userId, /^[0-9a-f-]{36}$/)
  await page.getByLabel('Nhận thiết bị', { exact: true }).selectOption('delivery')
  await page.getByTestId('rental-zone').selectOption(zoneId)
  await expect(page.getByTestId('rental-estimate-total')).toHaveText('1.890.000 ₫')
  await page.getByTestId('rental-discount').fill(discountCode)
  await page.getByRole('button', { name: 'Áp dụng' }).click()
  // Tier: 2.1m -> 1.89m; coupon: 189k; 1.701m is below 1.8m free-delivery threshold.
  // The former client estimate used 2.1m - 189k and incorrectly waived the delivery fee.
  await expect(page.getByTestId('rental-estimate-total')).toHaveText('1.731.000 ₫')
  await page.getByLabel('Họ và tên', { exact: true }).fill('Khách kiểm thử GĐ7')
  await page.getByLabel('Số điện thoại', { exact: true }).fill('0912345678')
  await page.getByLabel('Địa chỉ giao hàng', { exact: true }).fill('123 Đường kiểm thử, Hà Nội')
  await page.getByRole('button', { name: 'Tạo yêu cầu thuê' }).click()
  await page.waitForURL(/\/don-thue\/[0-9a-f-]{36}$/)
  const orderId = new URL(page.url()).pathname.split('/').at(-1)
  const orderCode = sql(`select code from public.orders where id='${orderId}' and user_id='${userId}'`)
  assert.match(orderCode, /^AIR-\d{6}-[A-F0-9]{8}$/)
  assert.equal(sql(`select subtotal_vnd||','||discount_vnd||','||delivery_fee_vnd||','||total_vnd||','||deposit_vnd from public.orders where id='${orderId}'`), '1890000,189000,30000,1731000,500000')
  await expect(page.getByTestId('order-payment')).toBeVisible()
  await expect(page.getByText('Chưa thanh toán', { exact: true })).toBeVisible()
  console.log('PASS server quote and checkout agree on duration tier, coupon, free-shipping threshold and separate deposit')

  const depositId = Number(`8${Date.now().toString().slice(-8)}`)
  const deposit = { id: depositId, gateway: 'LOCAL MOCK', transferType: 'in', transferAmount: 500000, content: `THAN TOAN ${orderCode}` }
  const applied = await webhook(deposit)
  assert.equal(applied.status, 200)
  assert.equal(applied.body.status, 'applied')
  assert.equal(applied.body.paymentState, 'deposit_paid')
  const replay = await webhook(deposit)
  assert.equal(replay.body.status, 'duplicate')
  assert.equal(replay.body.paymentId, applied.body.paymentId)
  assert.equal(sql(`select count(*) from public.payments where order_id='${orderId}'`), '1')
  await page.reload()
  await expect(page.getByText('Đã cọc', { exact: true })).toBeVisible()
  await expect(page.getByTestId('payment-collected')).toHaveText('500.000 ₫')
  console.log('PASS mock deposit updates owner receipt and replay creates no second payment')

  const balance = await webhook({ id: depositId + 1, gateway: 'LOCAL MOCK', transferType: 'in', transferAmount: 1731000, content: orderCode })
  assert.equal(balance.body.status, 'applied')
  assert.equal(balance.body.paymentState, 'paid')
  assert.equal(sql(`select payment_state from public.orders where id='${orderId}'`), 'paid')
  await page.reload()
  await expect(page.getByText('Đã thanh toán đủ', { exact: true })).toBeVisible()
  await expect(page.getByTestId('payment-collected')).toHaveText('2.231.000 ₫')
  mkdirSync('docs/launch/evidence', { recursive: true })
  await page.screenshot({ path: 'docs/launch/evidence/academic-paid-order-desktop.png', fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
  await page.screenshot({ path: 'docs/launch/evidence/academic-paid-order-mobile.png', fullPage: true })
  await page.setViewportSize({ width: 1365, height: 1000 })
  console.log('PASS remaining transfer equals discounted rental total; deposit remains separately collected')

  await signIn(otherPage, `/don-thue/${orderId}`, otherEmail)
  // A different verified account must not see the customer's phone/address/payment data.
  const otherStatus = await otherPage.goto(`${baseURL}/don-thue/${orderId}`)
  assert.equal(otherStatus?.status(), 404)
  assert.equal(await otherPage.getByText('Khách kiểm thử GĐ7', { exact: true }).count(), 0)
  assert.equal(await otherPage.getByTestId('order-payment').count(), 0)
  console.log('PASS a different verified account cannot read owner contact or payment details')

  // Only this run's second test account becomes staff after its isolation assertion above.
  // 51 newer cancelled fixtures must not hide the older pending, paid order from management.
  sql(`update public.profiles set role='staff' where id=(select id from auth.users where email='${otherEmail}');
    update public.orders set created_at=now()-interval '3 days' where id='${orderId}';
    insert into public.orders(code,user_id,state,fulfillment,customer_name,customer_phone,
      delivery_address,subtotal_vnd,deposit_vnd,idempotency_key,request_hash,created_at)
    select 'ACA-${run}-'||n,'${userId}','cancelled','pickup','Pagination fixture','0900000000',
      'Local simulation only',1000,0,gen_random_uuid(),'pagination-${run}-'||n,
      now()-n*interval '1 minute' from generate_series(1,51) n;`)
  await otherPage.goto(`${baseURL}/quan-ly-don`)
  await expect(otherPage.getByRole('heading', { name: 'Quản lý đơn thuê' })).toBeVisible()
  await expect(otherPage.getByText(orderCode, { exact: true })).toHaveCount(0)
  await otherPage.goto(`${baseURL}/quan-ly-don?page=3`)
  await expect(otherPage.getByText(orderCode, { exact: true })).toBeVisible()
  await otherPage.goto(`${baseURL}/quan-ly-don?state=pending`)
  await expect(otherPage.getByText(orderCode, { exact: true })).toBeVisible()
  await expect(otherPage.getByText(`ACA-${run}-1`, { exact: true })).toHaveCount(0)
  await otherPage.goto(`${baseURL}/quan-ly-don?state=pending&page=999`)
  await expect(otherPage.getByText(orderCode, { exact: true })).toBeVisible()
  console.log('PASS staff can find an older actionable order beyond 50 rows, filter state and clamp page')
} finally {
  try {
    const owned = `select id from public.orders where user_id in (select id from auth.users where email='${email}')`
    sql(`delete from public.payment_webhook_events where order_id in (${owned});
      delete from public.reservations where order_id in (${owned});
      delete from public.order_items where order_id in (${owned});
      delete from public.order_events where order_id in (${owned});
      delete from public.payments where order_id in (${owned});
      delete from public.orders where id in (${owned});
      delete from public.product_units where id='${unitId}';
      delete from public.products where id='${productId}';
      delete from public.discount_codes where id='${discountId}';
      delete from public.delivery_zones where id='${zoneId}';
      delete from auth.users where email in ('${email}','${otherEmail}');`)
    const leftovers = sql(`select (select count(*) from public.products where id='${productId}') +
      (select count(*) from public.product_units where id='${unitId}') +
      (select count(*) from public.discount_codes where id='${discountId}') +
      (select count(*) from public.price_tiers where id='${tierId}') +
      (select count(*) from public.delivery_zones where id='${zoneId}') +
      (select count(*) from auth.users where email in ('${email}','${otherEmail}')) +
      (select count(*) from public.orders where user_id in (select id from auth.users where email in ('${email}','${otherEmail}')))`)
    assert.equal(leftovers, '0', 'GD7 run-owned fixtures were removed.')
  } catch (error) {
    fixtureCleanupError = error
  }
  await browser.close()
  if (fixtureCleanupError) throw new Error(`Cleanup failed for GD7 fixture ${run}; inspect only rows bearing this run marker before retrying.`, { cause: fixtureCleanupError })
}
