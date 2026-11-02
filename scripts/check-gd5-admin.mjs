// Run from the repository root while the dedicated local preview is on port 3011.
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { chromium, expect, sql, baseURL, waitForMagicLink } from './gd2-browser-support.mjs'

const cachedBrowser =
  'C:/Users/ASUS/AppData/Local/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-win64/chrome-headless-shell.exe'
const executablePath =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
  (existsSync(cachedBrowser) ? cachedBrowser : undefined)

const run = randomUUID()
const short = run.slice(0, 8)
const staffEmail = `gd5-staff-${run}@example.invalid`
const adminEmail = `gd5-admin-${run}@example.invalid`
const slug = `gd5-test-camera-${short}`
const productName = `GD5 test camera ${short}`
const assetTag = `GD5-${short}`
const orderId = randomUUID()
const orderItemId = randomUUID()
const orderCode = `AIR-GD5-${short.toUpperCase()}`
const today = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Ho_Chi_Minh',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date())

function addDays(value, days) {
  const date = new Date(`${value}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

const expectedEndOn = addDays(today, 3)

async function assertNoOverflow(page, width) {
  try {
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
      .toBeLessThanOrEqual(width)
  } catch (error) {
    const offenders = await page.evaluate(() =>
      Array.from(document.querySelectorAll('*'))
        .filter((element) => element.getBoundingClientRect().right > innerWidth + 1)
        .slice(0, 8)
        .map(
          (element) =>
            `${element.tagName}.${element.className}:${Math.round(element.getBoundingClientRect().right)}`,
        ),
    )
    console.log('OVERFLOW', JSON.stringify(offenders))
    throw error
  }
}

async function signIn(target, email, next) {
  await target.goto(`${baseURL}/dang-nhap?next=${encodeURIComponent(next)}`)
  await target.getByLabel('Email', { exact: true }).fill(email)
  await target.getByRole('button', { name: 'Gửi liên kết đăng nhập' }).click()
  await target.goto(await waitForMagicLink(email))
  await target.waitForURL(`${baseURL}${next}`)
}

function cleanup() {
  sql(`delete from public.order_events where order_id = '${orderId}';
    delete from public.order_items where order_id = '${orderId}';
    delete from public.orders where id = '${orderId}';
    delete from public.unit_maintenance where unit_id in (select id from public.product_units where asset_tag = '${assetTag}');
    delete from public.product_units where asset_tag = '${assetTag}';
    delete from public.products where slug = '${slug}';
    delete from auth.users where email in ('${staffEmail}', '${adminEmail}');`)
}

const browser = await chromium.launch({ executablePath, headless: true })
const adminContext = await browser.newContext({ viewport: { width: 1365, height: 1000 } })
const staffContext = await browser.newContext({ viewport: { width: 1365, height: 1000 } })
const admin = await adminContext.newPage()
const staff = await staffContext.newPage()
const browserErrors = []
admin.on('pageerror', (error) => browserErrors.push(error.message))
staff.on('pageerror', (error) => browserErrors.push(error.message))

try {
  await signIn(admin, adminEmail, '/don-thue')
  await signIn(staff, staffEmail, '/don-thue')
  sql(`update public.profiles set role = 'admin' where id = (select id from auth.users where email = '${adminEmail}');
    update public.profiles set role = 'staff' where id = (select id from auth.users where email = '${staffEmail}');`)

  await admin.goto(`${baseURL}/admin`)
  await expect(admin.locator('h1')).toBeVisible()
  await expect(admin.getByRole('link', { name: 'Sản phẩm', exact: true })).toBeVisible()
  await assertNoOverflow(admin, 1365)
  console.log('PASS admin dashboard renders operational metrics without horizontal overflow')

  await admin.goto(`${baseURL}/admin/san-pham`)
  const productForm = admin.getByTestId('admin-product-form')
  await productForm.getByLabel('Danh mục').selectOption({ label: 'Máy ảnh' })
  await productForm.getByLabel('Đường dẫn').fill(slug)
  await productForm.getByLabel('Tên sản phẩm').fill(productName)
  await productForm
    .getByLabel('Mô tả')
    .fill('Fixture kiểm thử GĐ5, không phải thiết bị kinh doanh.')
  await productForm.getByLabel('Giá thuê / ngày (VND)').fill('150000')
  await productForm.getByLabel('Tiền cọc (VND)').fill('500000')
  await productForm.getByLabel('Trạng thái').selectOption('active')
  await productForm.getByRole('button', { name: 'Tạo sản phẩm' }).click()
  await admin.waitForURL(/san-pham\?product=saved/)
  assert.equal(
    sql(
      `select price_per_day_vnd || ',' || deposit_vnd || ',' || state from public.products where slug = '${slug}'`,
    ),
    '150000,500000,active',
  )
  await admin.goto(`${baseURL}/san-pham`)
  await expect(admin.getByText(productName, { exact: true })).toBeVisible()
  console.log('PASS admin creates an active product and the public catalog revalidates it')

  await admin.goto(`${baseURL}/admin/kho`)
  const unitForm = admin.getByTestId('admin-unit-form')
  await unitForm.getByLabel('Sản phẩm').selectOption({ label: productName })
  await unitForm.getByLabel('Mã máy').fill(assetTag)
  await unitForm.getByLabel('Sẵn sàng từ ngày').fill(today)
  await unitForm.getByRole('button', { name: 'Thêm máy' }).click()
  await admin.waitForURL(/kho\?unit=added/)
  assert.equal(
    sql(`select state from public.product_units where asset_tag = '${assetTag}'`),
    'available',
  )
  const unitCard = admin.locator('article').filter({ hasText: assetTag })
  await unitCard.getByRole('button', { name: 'Ngừng sử dụng' }).click()
  await admin.waitForURL(/kho\?unit=updated/)
  assert.equal(
    sql(`select state from public.product_units where asset_tag = '${assetTag}'`),
    'retired',
  )
  await unitCard.getByRole('button', { name: 'Đưa lại vào kho' }).click()
  await admin.waitForURL(/kho\?unit=updated/)
  assert.equal(
    sql(`select state from public.product_units where asset_tag = '${assetTag}'`),
    'available',
  )
  console.log('PASS admin adds a unit and toggles it out of and back into the rental pool')

  await admin.goto(`${baseURL}/admin/bao-tri`)
  const maintenanceForm = admin.getByTestId('admin-maintenance-form')
  await maintenanceForm.getByLabel('Máy').selectOption({ label: `${assetTag} · ${productName}` })
  await maintenanceForm.getByLabel('Lý do').selectOption('repair')
  await maintenanceForm.getByLabel('Dự kiến xong').fill(expectedEndOn)
  await maintenanceForm.getByLabel('Ghi chú').fill('Fixture kiểm thử GĐ5')
  await maintenanceForm.getByRole('button', { name: 'Mở phiếu' }).click()
  await admin.waitForURL(/bao-tri\?maintenance=opened/)
  assert.equal(
    sql(
      `select state || ',' || ready_on from public.product_units where asset_tag = '${assetTag}'`,
    ),
    `maintenance,${expectedEndOn}`,
  )
  assert.equal(
    sql(
      `select count(*) from public.unit_maintenance where completed_on is null and unit_id = (select id from public.product_units where asset_tag = '${assetTag}')`,
    ),
    '1',
  )
  await admin.setViewportSize({ width: 390, height: 844 })
  await assertNoOverflow(admin, 390)
  await admin.setViewportSize({ width: 1365, height: 1000 })
  const openCard = admin.getByTestId('admin-maintenance-open').locator('article').filter({
    hasText: assetTag,
  })
  await openCard.getByTestId('admin-close-maintenance').getByRole('button').click()
  await admin.waitForURL(/bao-tri\?maintenance=closed/)
  assert.equal(
    sql(`select state from public.product_units where asset_tag = '${assetTag}'`),
    'available',
  )
  assert.equal(
    sql(
      `select count(*) from public.unit_maintenance where completed_on is null and unit_id = (select id from public.product_units where asset_tag = '${assetTag}')`,
    ),
    '0',
  )
  console.log('PASS staff maintenance RPC parks the unit, blocks its calendar, and returns it')

  const adminId = sql(`select id from auth.users where email = '${adminEmail}'`)
  const productId = sql(`select id from public.products where slug = '${slug}'`)
  const unitId = sql(`select id from public.product_units where asset_tag = '${assetTag}'`)
  sql(`insert into public.orders(id, code, user_id, state, fulfillment, customer_name, customer_phone,
      delivery_address, subtotal_vnd, deposit_vnd, idempotency_key, request_hash)
    values ('${orderId}', '${orderCode}', '${adminId}', 'confirmed', 'pickup',
      'GD5 Handover ${short}', '0912345678', 'Nhận tại cửa hàng', 150000, 500000,
      gen_random_uuid(), 'gd5-handover');
    insert into public.order_items(id, order_id, unit_id, product_id, rental_period,
      price_per_day_vnd, rental_days, line_total_vnd)
    values ('${orderItemId}', '${orderId}', '${unitId}', '${productId}',
      daterange('${today}', '${addDays(today, 2)}', '[)'), 150000, 1, 150000);
    insert into public.order_events(order_id, actor_id, from_state, to_state)
    values ('${orderId}', '${adminId}', 'pending', 'confirmed');`)

  await staff.goto(`${baseURL}/quan-ly-don`)
  const orderCard = staff.locator('article').filter({ hasText: orderCode })
  await expect(orderCard).toContainText(assetTag)
  await orderCard.getByRole('link', { name: 'Phiếu bàn giao' }).click()
  await staff.waitForURL(`${baseURL}/quan-ly-don/${orderId}/phieu-ban-giao`)
  await expect(staff.getByText(orderCode, { exact: false })).toBeVisible()
  await expect(staff.getByText(assetTag, { exact: true })).toBeVisible()
  await staff.setViewportSize({ width: 390, height: 844 })
  await assertNoOverflow(staff, 390)
  console.log('PASS handover sheet prints the assigned unit and fits a 390px viewport')

  await staff.setViewportSize({ width: 1365, height: 1000 })
  await staff.goto(`${baseURL}/admin/san-pham`)
  await staff.waitForURL(`${baseURL}/admin?denied=admin`)
  assert.equal(sql(`select count(*) from public.products where slug = '${slug}'`), '1')
  await staff.goto(`${baseURL}/admin/nhat-ky`)
  await expect(staff.getByTestId('admin-audit')).toBeVisible()
  await expect(staff.getByTestId('admin-audit')).toContainText(orderCode)
  console.log('PASS staff keeps read-only admin access and cannot open catalog writes')

  assert.deepEqual(browserErrors, [])
  console.log('PASS no uncaught browser errors during the admin walkthrough')
} finally {
  await browser.close()
  cleanup()
}
