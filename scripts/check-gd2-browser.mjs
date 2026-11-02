// Run from the repository root while the dedicated local preview is on port3011.
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import {
  chromium,
  expect,
  sql,
  baseURL,
  emails,
  slugs,
  names,
  productIds,
  setupFixtures,
  cleanupFixtures,
  waitForMagicLink,
} from './gd2-browser-support.mjs'

const cachedBrowser =
  'C:/Users/ASUS/AppData/Local/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-win64/chrome-headless-shell.exe'
const executablePath =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
  (existsSync(cachedBrowser) ? cachedBrowser : undefined)
const browser = await chromium.launch({ executablePath, headless: true })
const context = await browser.newContext({ viewport: { width: 1365, height: 1000 } })
const otherContext = await browser.newContext({ viewport: { width: 1365, height: 1000 } })
const page = await context.newPage()
const other = await otherContext.newPage()
const browserErrors = []
let droppingResponse = false
page.on('pageerror', (error) => {
  if (!(droppingResponse && /fetch|network/i.test(error.message))) browserErrors.push(error.message)
})
other.on('pageerror', (error) => browserErrors.push(error.message))
const today = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Ho_Chi_Minh',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date())
const legacyCart = JSON.stringify([{ productId: 1, quantity: 2, days: 3 }])
async function signIn(target, email, next = '/checkout') {
  if (!target.url().includes('/dang-nhap'))
    await target.goto(`${baseURL}/dang-nhap?next=${encodeURIComponent(next)}`)
  await target.getByLabel('Email', { exact: true }).fill(email)
  await target.getByRole('button', { name: 'Gửi liên kết đăng nhập' }).click()
  await target.getByText('Nếu email hợp lệ, chúng tôi đã gửi liên kết đăng nhập.').waitFor()
  await target.goto(await waitForMagicLink(email))
  await target.waitForURL(`${baseURL}${next}`)
}
async function prepareCart() {
  for (const slug of slugs) {
    await page.goto(`${baseURL}/san-pham/${slug}`)
    await page.getByTestId('add-to-rental-cart').click()
    await expect(page.getByText('Đã thêm vào giỏ thuê')).toBeVisible()
  }
  await page.goto(`${baseURL}/gio-thue`)
  for (const name of names) await expect(page.getByText(name, { exact: true })).toBeVisible()
  await expect(page.getByTestId('rental-start')).toBeEnabled()
  await page.getByTestId('rental-start').selectOption(today)
  await expect(page.getByTestId('rental-end')).toBeEnabled()
  await page.getByTestId('rental-end').selectOption(today)
  await page.reload()
  await expect(page.getByTestId('rental-start')).toHaveValue(today)
  await expect(page.getByTestId('rental-end')).toHaveValue(today)
  await expect(page.getByRole('link', { name: 'Tiếp tục đặt thuê' })).toHaveAttribute(
    'aria-disabled',
    'false',
  )
  await page.getByRole('link', { name: 'Tiếp tục đặt thuê' }).click()
}
async function submitCheckout(dropResponse = false) {
  await page.getByLabel('Họ và tên', { exact: true }).fill('Khách kiểm thử GĐ2')
  await page.getByLabel('Số điện thoại', { exact: true }).fill('0912345678')
  await page
    .getByLabel('Ghi chú nhận máy', { exact: true })
    .fill('Nhận máy tại cửa hàng — dữ liệu kiểm thử local')
  await expect(page.getByRole('button', { name: 'Tạo yêu cầu thuê' })).toBeEnabled()
  const originalKey = await page.locator('input[name="idempotencyKey"]').inputValue()
  if (dropResponse) {
    droppingResponse = true
    await page.route('**/checkout', async (route) => {
      const request = route.request()
      if (request.method() === 'POST' && request.postData()?.includes('customerName')) {
        await route.fetch()
        try {
          await route.abort('failed')
        } catch {
          // Newer Playwright marks the route handled once fetch() completes. The order is
          // already committed, which is all this scenario needs.
        }
      } else await route.continue()
    })
  }
  await page.getByRole('button', { name: 'Tạo yêu cầu thuê' }).click()
  if (dropResponse) {
    await expect
      .poll(
        () =>
          sql(
            `select count(*) from public.orders where user_id=(select id from auth.users where email='${emails[0]}') and state='pending'`,
          ),
        { timeout: 20000 },
      )
      .toBe('1')
    await page.unroute('**/checkout')
    await page.goto(`${baseURL}/checkout`)
    await expect(page.locator('input[name="idempotencyKey"]')).toHaveValue(originalKey)
    await page.getByLabel('Họ và tên', { exact: true }).fill('Khách kiểm thử GĐ2')
    await expect(page.locator('input[name="idempotencyKey"]')).toHaveValue(originalKey)
    await page.goto(`${baseURL}/don-thue`)
    const recoveredId = sql(
      `select id from public.orders where user_id=(select id from auth.users where email='${emails[0]}') and state='pending'`,
    )
    await page.locator(`a[href='/don-thue/${recoveredId}']`).click()
    await expect(page.getByText('Khách kiểm thử GĐ2', { exact: true })).toBeVisible()
    assert.equal(
      sql(
        `select count(*) from public.orders where user_id=(select id from auth.users where email='${emails[0]}') and state='pending'`,
      ),
      '1',
    )
    droppingResponse = false
    console.log(
      'PASS response lost after commit: reload retains original request key, refilling does not rotate it, own-order recovery finds exactly one order',
    )
    return recoveredId
  }
  await page.waitForURL(/\/don-thue\/[0-9a-f-]{36}$/)
  return new URL(page.url()).pathname.split('/').at(-1)
}
try {
  setupFixtures()
  await page.goto(`${baseURL}/san-pham/sony-a6400`)
  await expect(page.getByTestId('add-to-rental-cart')).toHaveCount(0)
  await page.evaluate((value) => localStorage.setItem('air-cart', value), legacyCart)
  await prepareCart()
  await page.waitForURL(/\/dang-nhap/)
  await signIn(page, emails[0])
  const orderId = await submitCheckout()
  const orderURL = page.url()
  assert.equal(
    sql(`select subtotal_vnd||','||deposit_vnd from public.orders where id='${orderId}'`),
    '30000,100000',
  )
  assert.equal(sql(`select count(*) from public.order_items where order_id='${orderId}'`), '2')
  for (const name of names) await expect(page.getByText(name, { exact: true })).toBeVisible()
  await expect(page.getByText('Khách kiểm thử GĐ2', { exact: true })).toBeVisible()
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
  assert.equal((await page.locator('body').innerText()).includes('BROWSER-'), false)
  await page.screenshot({ path: 'docs/gd2-order-desktop.png', fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
  await page.screenshot({ path: 'docs/gd2-order-mobile.png', fullPage: true })
  await page.setViewportSize({ width: 1365, height: 1000 })
  await page.reload()
  await expect(page.getByText('Khách kiểm thử GĐ2', { exact: true })).toBeVisible()
  assert.equal(await page.evaluate(() => localStorage.getItem('air-cart')), legacyCart)
  console.log(
    'PASS catalog → persisted two-product cart → real email login → cookie session → trusted checkout → responsive receipt',
  )

  await signIn(other, emails[1], '/don-thue')
  await other.goto(orderURL)
  await expect(other.getByText('Khách kiểm thử GĐ2', { exact: true })).toHaveCount(0)
  await expect(other.getByText('0912345678', { exact: true })).toHaveCount(0)
  await other.goto(`${baseURL}/quan-ly-don`)
  await other.waitForURL(`${baseURL}/don-thue`)
  console.log(
    'PASS second authenticated customer cannot view first customer receipt or staff workspace',
  )

  await page.goto(orderURL)
  await page.getByRole('button', { name: 'Hủy yêu cầu thuê' }).click()
  await expect
    .poll(() => sql(`select state from public.orders where id='${orderId}'`))
    .toBe('cancelled')
  assert.equal(
    sql(
      `select count(*) from public.reservations where order_id='${orderId}' and released_at is null`,
    ),
    '0',
  )
  console.log('PASS customer cancellation releases all held units')

  await prepareCart()
  const secondOrder = await submitCheckout(true)
  sql(
    `update public.profiles set role='staff' where id=(select id from auth.users where email='${emails[1]}')`,
  )
  await other.goto(`${baseURL}/quan-ly-don`)
  const card = other
    .locator('article')
    .filter({ has: other.locator(`a[href='/don-thue/${secondOrder}']`) })
  for (const id of productIds) await expect(card).toContainText(`BROWSER-${id}`)
  const states = [
    ['confirmed', 'Đã xác nhận'],
    ['delivering', 'Đang giao'],
    ['active', 'Đang thuê'],
    ['returning', 'Đang trả'],
    ['completed', 'Hoàn tất'],
  ]
  for (const [state] of states) {
    await card.locator(`form:has(input[name='next'][value='${state}']) button`).click()
    await expect
      .poll(() => sql(`select state from public.orders where id='${secondOrder}'`))
      .toBe(state)
    await other.waitForLoadState('networkidle')
  }
  await other.screenshot({ path: 'docs/gd2-staff-desktop.png', fullPage: true })
  assert.equal(
    sql(
      `select bool_and(ready_on >= (now() at time zone 'Asia/Ho_Chi_Minh')::date + 2) from public.product_units where id in (select unit_id from public.order_items where order_id='${secondOrder}')`,
    ),
    't',
  )
  console.log(
    'PASS staff confirmation → handover → rental → return → completed and actual-return cleaning buffer',
  )
  await page.getByRole('button', { name: 'Đăng xuất', exact: true }).click()
  await page.waitForURL(/\/dang-nhap/)
  await page.goto(`${baseURL}/don-thue`)
  await page.waitForURL(/\/dang-nhap/)
  await page.goto(`${baseURL}/gio-thue`)
  await page.addInitScript(() => localStorage.setItem('air-uuid-rental-cart-v1', '{broken'))
  await page.reload()
  await expect(page.getByTestId('rental-cart-empty')).toBeVisible()
  console.log(
    'PASS logout protects owner routes and corrupted cart storage recovers without crashing',
  )
  assert.deepEqual(browserErrors, [])
  console.log('PASS no uncaught browser errors; legacy demo cart unchanged')
} finally {
  await browser.close()
  cleanupFixtures()
}
