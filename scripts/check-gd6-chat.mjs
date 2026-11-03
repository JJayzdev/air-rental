// Local integration acceptance. Run only against the dedicated A.I.R preview on 3011.
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { request as httpRequest } from 'node:http'
import {
  chromium, expect, sql, baseURL, emails, productIds, slugs,
  setupFixtures, cleanupFixtures, waitForMagicLink,
} from './gd2-browser-support.mjs'

const cachedBrowser = 'C:/Users/ASUS/AppData/Local/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-win64/chrome-headless-shell.exe'
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || (existsSync(cachedBrowser) ? cachedBrowser : undefined) })
const owner = await browser.newContext({ viewport: { width: 1365, height: 1000 } })
const other = await browser.newContext()
const page = await owner.newPage()
const second = await other.newPage()
const errors = []
page.on('pageerror', error => errors.push(error.message))
const today = sql("select (now() at time zone 'Asia/Ho_Chi_Minh')::date")

async function chat(context, data) {
  let response = await context.request.post(`${baseURL}/api/chat`, { data, headers: { Origin: baseURL } })
  if (response.status() === 429) {
    console.log('Quota reached as expected; waiting for the fixed window before continuing.')
    await new Promise(resolve => setTimeout(resolve, 60000))
    response = await context.request.post(`${baseURL}/api/chat`, { data, headers: { Origin: baseURL } })
  }
  assert.equal(response.status(), 200, await response.text())
  assert.match(response.headers()['cache-control'] ?? '', /no-store/)
  return response.json()
}
async function signIn(target, email) {
  await target.goto(`${baseURL}/dang-nhap?next=/don-thue`)
  await target.getByLabel('Email', { exact: true }).fill(email)
  await target.getByRole('button', { name: 'Gửi liên kết đăng nhập' }).click()
  await target.getByText('Nếu email hợp lệ, chúng tôi đã gửi liên kết đăng nhập.').waitFor()
  await target.goto(await waitForMagicLink(email))
  await target.waitForURL(`${baseURL}/don-thue`)
}

try {
  setupFixtures()
  const uniqueName = `ChatFixture${productIds[0].replaceAll('-', '')}`
  sql(`update products set name='${uniqueName}' where id='${productIds[0]}'`)
  const anonymous = await chat(owner, { action: 'getOrderStatus' })
  assert.match(anonymous.text, /đăng nhập/i)
  const sample = sql('select id from products where is_sample and state=\'active\' limit 1')
  const unavailable = await chat(owner, { action: 'checkAvailability', productId: sample, startDate: today, endDate: today })
  assert.match(unavailable.text, /chưa khả dụng|không.*khả dụng/i)
  const available = await chat(owner, { action: 'checkAvailability', productId: productIds[0], startDate: today, endDate: today })
  assert.match(available.text, /còn khả dụng/i)
  const result = await chat(owner, { action: 'searchProducts', message: uniqueName })
  assert.equal(result.products?.[0]?.id, productIds[0])
  assert.equal(result.products[0].slug, slugs[0])
  assert.equal(result.products[0].isSample, false)
  const cameras = await chat(owner, { action: 'message', message: 'Tìm máy ảnh' })
  assert.ok(cameras.products?.length > 0)
  for (const product of cameras.products) {
    assert.equal(sql(`select c.slug from products p join categories c on c.id=p.category_id where p.id='${product.id}'`), 'camera')
  }
  await signIn(page, emails[0])
  await signIn(second, emails[1])
  const userId = sql(`select id from auth.users where email='${emails[0]}'`)
  const booking = sql(`begin;
    set local role authenticated;
    select set_config('request.jwt.claim.sub','${userId}',true);
    select order_code from public.create_multi_product_booking(
      '${randomUUID()}', '[{"productId":"${productIds[0]}","quantity":1}]'::jsonb,
      '${today}', '${today}', 'pickup', 'Test Private Name', '0900000000', 'Test Private Address', null, null);
    commit;`).split('\n').find(line => line.startsWith('AIR-'))
  assert.ok(booking, 'Created real booking fixture')
  const status = await chat(owner, { action: 'getOrderStatus', orderCode: booking })
  assert.ok(status.text.includes(booking))
  assert.doesNotMatch(JSON.stringify(status), /0900000000|Test Private|BROWSER-/)
  const occupied = await chat(owner, { action: 'checkAvailability', productId: productIds[0], startDate: today, endDate: today })
  assert.match(occupied.text, /chưa khả dụng|không.*khả dụng/i)
  const privateResult = await chat(other, { action: 'getOrderStatus', orderCode: booking })
  assert.ok(!JSON.stringify(privateResult).includes(booking), 'Other customer cannot retrieve owner order')
  sql(`update public.profiles set role='staff' where id=(select id from auth.users where email='${emails[1]}')`)
  const staffResult = await chat(other, { action: 'getOrderStatus', orderCode: booking })
  assert.ok(!JSON.stringify(staffResult).includes(booking), 'Staff chat still restricted to own orders')
  console.log('PASS real catalog availability, owner status, customer/staff privacy')

  const crossOrigin = await owner.request.post(`${baseURL}/api/chat`, { data: { action: 'message', message: 'Xin chào' }, headers: { Origin: 'https://example.invalid' } })
  assert.equal(crossOrigin.status(), 403)
  const invalid = await owner.request.post(`${baseURL}/api/chat`, { data: { action: 'checkAvailability', productId: 'wrong', startDate: today, endDate: today }, headers: { Origin: baseURL } })
  assert.equal(invalid.status(), 400)
  const oversized = await owner.request.post(`${baseURL}/api/chat`, { data: { action: 'message', message: 'x'.repeat(20000) }, headers: { Origin: baseURL } })
  assert.ok([400, 413].includes(oversized.status()))
  const chunkedStatus = await new Promise((resolve, reject) => {
    const request = httpRequest(`${baseURL}/api/chat`, {
      method: 'POST', headers: { Origin: baseURL, 'Content-Type': 'application/json', 'Transfer-Encoding': 'chunked' },
    }, response => { response.resume(); response.on('end', () => resolve(response.statusCode)) })
    request.on('error', reject)
    request.write('{"action":"message","message":"')
    request.write('x'.repeat(10000))
    request.end('"}')
  })
  assert.equal(chunkedStatus, 413)
  console.log('PASS malformed input, body bound and cross-origin rejection')

  await page.goto(`${baseURL}/huong-dan`)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  const articles = page.locator('a[href^="/huong-dan/"]')
  assert.ok(await articles.count() >= 3)
  await articles.first().click()
  await page.waitForURL(/\/huong-dan\/[^/]+$/)
  await page.locator('article script[type="application/ld+json"]').waitFor({ state: 'attached' })
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', page.url())
  assert.ok(!(await page.locator('meta[name="robots"]').evaluateAll(nodes => nodes.map(node => node.content).join(' '))).includes('noindex'))
  const jsonLd = await page.locator('script[type="application/ld+json"]').allTextContents()
  assert.ok(jsonLd.some(text => JSON.parse(text)['@type'] === 'Article'))
  await page.screenshot({ path: 'docs/gd6-guide-desktop.png', fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
  await page.screenshot({ path: 'docs/gd6-guide-mobile.png', fullPage: true })
  await page.goto(`${baseURL}/san-pham`)
  await page.getByRole('button', { name: 'Mở trợ lý A.I.R' }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog', { name: 'Trợ lý A.I.R' })).toBeVisible()
  await page.getByLabel('Tin nhắn', { exact: true }).fill('Cách tính giá thuê')
  await page.getByRole('button', { name: 'Gửi', exact: true }).click()
  await expect(page.locator('.message-row.bot')).toHaveCount(2)
  await expect(page.locator('.message-row.bot').last()).toContainText('Giá thuê được tính')
  await page.getByLabel('Tin nhắn', { exact: true }).fill('Tìm máy ảnh')
  await page.getByRole('button', { name: 'Gửi', exact: true }).click()
  await expect(page.locator('.chat-catalog-product')).toHaveCount(3)
  await page.getByRole('button', { name: 'Kiểm tra lịch', exact: true }).first().click()
  await page.getByLabel('Ngày bắt đầu', { exact: true }).fill(today)
  await page.getByLabel('Ngày kết thúc', { exact: true }).fill(today)
  await page.getByRole('button', { name: 'Kiểm tra', exact: true }).click()
  await expect(page.locator('.message-row.bot')).toHaveCount(4)
  await expect(page.locator('.message-row.bot').last()).toContainText('khả dụng')
  await page.screenshot({ path: 'docs/gd6-chat-mobile.png' })
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: 'Trợ lý A.I.R' })).toHaveCount(0)
  console.log('PASS guides metadata/navigation/mobile and chat keyboard flow')

  let limited = false
  for (let i = 0; i < 14; i++) {
    const response = await owner.request.post(`${baseURL}/api/chat`, { data: { action: 'message', message: 'Xin chào' }, headers: { Origin: baseURL, 'X-Forwarded-For': `192.0.2.${i + 1}` } })
    if (response.status() === 429) { limited = true; break }
    assert.equal(response.status(), 200)
  }
  assert.ok(limited, 'Quota cannot be bypassed by spoofing forwarded IP headers by default')
  assert.deepEqual(errors, [])
  console.log('PASS HTTP rate limit and no browser exceptions')
} finally {
  await browser.close()
  cleanupFixtures()
}
