// GĐ5 phase B acceptance: discount codes, delivery zones, and the combined order total.
// Run from the repository root while the dedicated local preview is on port 3011.
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import {
  chromium,
  expect,
  sql,
  baseURL,
  emails,
  waitForMagicLink,
  cleanupFixtures,
} from './gd2-browser-support.mjs'

const cachedBrowser =
  'C:/Users/ASUS/AppData/Local/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-win64/chrome-headless-shell.exe'
const executablePath =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
  (existsSync(cachedBrowser) ? cachedBrowser : undefined)
const browser = await chromium.launch({ executablePath, headless: true })
const context = await browser.newContext({ viewport: { width: 1365, height: 1000 } })
const adminContext = await browser.newContext({ viewport: { width: 1365, height: 1000 } })
const page = await context.newPage()
const admin = await adminContext.newPage()
const browserErrors = []
page.on('pageerror', (error) => browserErrors.push(error.message))
admin.on('pageerror', (error) => browserErrors.push(error.message))

const run = randomUUID().slice(0, 8)
const productId = randomUUID()
const productSlug = `gd5-pricing-${run}`
const productName = 'Máy ảnh kiểm thử GĐ5'
const unitIds = Array.from({ length: 5 }, () => randomUUID())
const zoneId = sql(`select id from public.delivery_zones where name='Nội thành Hà Nội'`)

const day = (offset = 0) => {
  const value = new Date(Date.now() + offset * 86400000)
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(value)
}
const start = day(0)
const end = day(2)

async function signIn(target, email, next) {
  await target.goto(`${baseURL}/dang-nhap?next=${encodeURIComponent(next)}`)
  await target.getByLabel('Email', { exact: true }).fill(email)
  await target.getByRole('button', { name: 'Gửi liên kết đăng nhập' }).click()
  await target.getByText('Nếu email hợp lệ, chúng tôi đã gửi liên kết đăng nhập.').waitFor()
  await target.goto(await waitForMagicLink(email))
  await target.waitForURL(`${baseURL}${next}`)
}

function setupFixture() {
  sql(`insert into public.products(id,category_id,slug,name,description,price_per_day_vnd,deposit_vnd,state,is_sample)
    values ('${productId}',(select id from public.categories where slug='camera'),'${productSlug}','${productName}','Chỉ dùng kiểm thử local, không phải thiết bị kinh doanh.',700000,500000,'active',false);
    insert into public.product_units(id,product_id,asset_tag)
    values ${unitIds.map((id, index) => `('${id}','${productId}','GD5-${run}-${index + 1}')`).join(',')};`)
  // Never leak a stale test code from an interrupted run.
  sql(`delete from public.discount_codes where code='GD5TEST'`)
}

function cleanupFixture() {
  const owned = `select id from public.orders where user_id in (select id from auth.users where email in ('${emails.join("','")}'))`
  sql(`delete from public.reservations where order_id in (${owned});
    delete from public.order_items where order_id in (${owned});
    delete from public.order_events where order_id in (${owned});
    delete from public.orders where id in (${owned});
    delete from public.product_units where product_id='${productId}';
    delete from public.products where id='${productId}';
    delete from public.discount_codes where code='GD5TEST';`)
}

try {
  setupFixture()
  await page.goto(`${baseURL}/san-pham/${productSlug}`)
  await page.getByTestId('add-to-rental-cart').click()
  await expect(page.getByText('Đã thêm vào giỏ thuê')).toBeVisible()
  await page.goto(`${baseURL}/gio-thue`)
  await expect(page.getByText(productName, { exact: true })).toBeVisible()
  await expect(page.getByTestId('rental-start')).toBeEnabled()
  await page.getByTestId('rental-start').selectOption(start)
  await expect(page.getByTestId('rental-end')).toBeEnabled()
  await page.getByTestId('rental-end').selectOption(end)
  await expect(page.getByRole('link', { name: 'Tiếp tục đặt thuê' })).toHaveAttribute(
    'aria-disabled',
    'false',
  )
  await page.getByRole('link', { name: 'Tiếp tục đặt thuê' }).click()

  await page.waitForURL(/\/dang-nhap/)
  await signIn(page, emails[0], '/checkout')

  // Delivery without a code: a three-day rental at 700.000 ₫/day is 2.100.000 ₫, above the
  // 2.000.000 ₫ free-delivery threshold for the Hanoi zone.
  await page.getByLabel('Nhận thiết bị', { exact: true }).selectOption('delivery')
  await page.getByTestId('rental-zone').selectOption(zoneId)
  await expect(page.getByTestId('rental-estimate-total')).toHaveText('2.100.000 ₫')
  assert.equal(await page.getByText('Phí giao (Nội thành Hà Nội)', { exact: true }).count(), 1)
  assert.equal((await page.getByText('0 ₫', { exact: true }).count()) > 0, true)

  // Unknown codes are reported without a page reload.
  await page.getByTestId('rental-discount').fill('KHONGCO')
  await page.getByRole('button', { name: 'Áp dụng' }).click()
  await expect(page.getByText('Mã giảm giá không tồn tại.', { exact: true })).toBeVisible()

  // WELCOME10 gives 10% off, which drops the amount used for the free-delivery check below
  // the threshold, so the 30.000 ₫ fee comes back: 2.100.000 − 210.000 + 30.000 = 1.920.000.
  await page.getByTestId('rental-discount').fill('WELCOME10')
  await page.getByRole('button', { name: 'Áp dụng' }).click()
  await expect(page.getByText(/Đã áp dụng WELCOME10/)).toBeVisible()
  await expect(page.getByTestId('rental-estimate-total')).toHaveText('1.920.000 ₫')
  await expect(page.getByText('Giảm giá (WELCOME10)', { exact: true })).toBeVisible()
  await expect(page.getByText('Phí giao (Nội thành Hà Nội)', { exact: true })).toBeVisible()
  console.log(
    'PASS checkout preview re-prices on the server, rejects an unknown code, and measures free delivery after the discount',
  )

  // Switching to pickup removes the delivery fee but keeps the discount.
  await page.getByLabel('Nhận thiết bị', { exact: true }).selectOption('pickup')
  await expect(page.getByText('Phí giao (Nội thành Hà Nội)', { exact: true })).toHaveCount(0)
  await expect(page.getByTestId('rental-estimate-total')).toHaveText('1.890.000 ₫')
  await page.getByLabel('Nhận thiết bị', { exact: true }).selectOption('delivery')
  await expect(page.getByTestId('rental-estimate-total')).toHaveText('1.920.000 ₫')
  console.log('PASS pickup drops the zone fee while delivery restores it')

  await page.getByLabel('Họ và tên', { exact: true }).fill('Khách kiểm thử GĐ5')
  await page.getByLabel('Số điện thoại', { exact: true }).fill('0912345678')
  await page.getByLabel('Địa chỉ giao hàng', { exact: true }).fill('123 Đường kiểm thử, Hà Nội')
  await page.getByRole('button', { name: 'Tạo yêu cầu thuê' }).click()
  await page.waitForURL(/\/don-thue\/[0-9a-f-]{36}$/)
  const orderId = new URL(page.url()).pathname.split('/').at(-1)

  assert.equal(
    sql(
      `select subtotal_vnd||','||discount_vnd||','||delivery_fee_vnd||','||total_vnd||','||deposit_vnd||','||discount_code||','||delivery_zone_name from public.orders where id='${orderId}'`,
    ),
    '2100000,210000,30000,1920000,500000,WELCOME10,Nội thành Hà Nội',
  )
  assert.match(
    sql(`select request_hash from public.orders where id='${orderId}'`),
    /^[0-9a-f]{32}$/,
  )
  await expect(page.getByText('Giảm giá (WELCOME10)', { exact: true })).toBeVisible()
  await expect(page.getByText('Phí giao (Nội thành Hà Nội)', { exact: true })).toBeVisible()
  await expect(page.getByText('Tổng tiền thuê', { exact: true })).toBeVisible()
  await expect(page.getByText('1.920.000 ₫', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('2.420.000 ₫', { exact: true }).first()).toBeVisible()
  console.log(
    'PASS booking stores the server-computed discount, zone, fee, and total; deposit stays separate',
  )

  await page.screenshot({ path: 'docs/gd5-pricing-order.png', fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
  await page.screenshot({ path: 'docs/gd5-pricing-mobile.png', fullPage: true })
  await page.setViewportSize({ width: 1365, height: 1000 })
  console.log('PASS order receipt stays inside a 390px viewport')

  await signIn(admin, emails[1], '/don-thue')
  sql(
    `update public.profiles set role='admin' where id=(select id from auth.users where email='${emails[1]}')`,
  )
  await admin.goto(`${baseURL}/admin/ma-giam-gia`)
  await expect(admin.getByText('WELCOME10', { exact: true }).first()).toBeVisible()
  const form = admin.getByTestId('admin-discount-form')
  await form.getByLabel('Mã', { exact: true }).fill('GD5TEST')
  await form.getByLabel('Mô tả', { exact: true }).fill('Mã kiểm thử GĐ5')
  await form.getByLabel('Giá trị (%, hoặc VND)', { exact: true }).fill('5')
  await form.getByLabel('Tiền thuê tối thiểu (VND)', { exact: true }).fill('0')
  await form.getByLabel('Số lượt tối đa (bỏ trống = không giới hạn)', { exact: true }).fill('10')
  await form.getByRole('button', { name: 'Tạo mã' }).click()
  await expect(admin.getByText('Đã lưu mã giảm giá.')).toBeVisible()
  assert.equal(
    sql(`select kind||','||value||','||max_uses from public.discount_codes where code='GD5TEST'`),
    'percent,5,10',
  )

  await admin.goto(`${baseURL}/admin/khu-vuc-giao`)
  await expect(admin.getByText('Nội thành Hà Nội', { exact: true }).first()).toBeVisible()
  await expect(admin.getByText('Phí 30.000 ₫', { exact: false }).first()).toBeVisible()
  await admin.screenshot({ path: 'docs/gd5-pricing-admin.png', fullPage: true })
  console.log('PASS admins can create a discount code and review delivery zones')

  assert.deepEqual(browserErrors, [])
  console.log('PASS no uncaught browser errors across pricing and admin screens')
} finally {
  cleanupFixture()
  cleanupFixtures()
  await browser.close()
}
