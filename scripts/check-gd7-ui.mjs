// Production-local UI acceptance; no external services or real customer data.
import assert from 'node:assert/strict'
import { existsSync, writeFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { chromium, expect, baseURL } from './gd2-browser-support.mjs'

const cached = 'C:/Users/ASUS/AppData/Local/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-win64/chrome-headless-shell.exe'
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || (existsSync(cached) ? cached : undefined) })
const results = { measuredAt: new Date().toISOString(), environment: 'Local production build; CDP simulated network/CPU, not deployed or real-user 4G', profile: { latencyMs: 150, downloadBps: 1600000, uploadBps: 750000, cpuSlowdown: 4, viewport: '390x844', browserCache: 'disabled' }, contrast: {}, performance: [] }

async function contrast(locator) {
  return locator.evaluate(element => {
    const rgba = value => { const n = value.match(/[\d.]+/g)?.map(Number) ?? []; return [n[0] ?? 0, n[1] ?? 0, n[2] ?? 0, n[3] ?? 1] }
    const blend = (top, bottom) => top.slice(0, 3).map((v, i) => v * top[3] + bottom[i] * (1 - top[3]))
    const ancestors = []; for (let node = element; node; node = node.parentElement) ancestors.unshift(node)
    let background = [255, 255, 255]
    for (const node of ancestors) background = blend(rgba(getComputedStyle(node).backgroundColor), background)
    const style = getComputedStyle(element)
    const foreground = blend(rgba(style.color), background)
    const luminance = c => c.map(v => v / 255).map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0)
    const [a, b] = [luminance(foreground), luminance(background)].sort((x, y) => y - x)
    return { ratio: (a + 0.05) / (b + 0.05), fontPx: parseFloat(style.fontSize), color: style.color, background }
  })
}
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  for (const route of ['/', '/san-pham']) {
    await page.goto(baseURL + route)
    const launcher = page.getByRole('button', { name: 'Mở trợ lý A.I.R' })
    await expect(launcher).toBeVisible()
    const duration = await launcher.evaluate(el => parseFloat(getComputedStyle(el).animationDuration))
    assert.ok(duration <= 0.01, 'Reduced motion stops launcher animation')
    await launcher.focus()
    const focus = await launcher.evaluate(el => ({ width: parseFloat(getComputedStyle(el).outlineWidth), style: getComputedStyle(el).outlineStyle }))
    assert.ok(focus.width >= 2 && focus.style !== 'none', 'Visible keyboard focus outline')
    await page.keyboard.press('Enter')
    const dialog = page.getByRole('dialog', { name: 'Trợ lý A.I.R' })
    await expect(dialog).toBeVisible()
    await expect(page.getByLabel('Tin nhắn', { exact: true })).toBeFocused()
    const close = dialog.getByRole('button', { name: 'Đóng', exact: true })
    const clear = dialog.getByRole('button', { name: 'Xóa cuộc trò chuyện' })
    await clear.focus(); await page.keyboard.press('Tab'); await expect(close).toBeFocused()
    await close.focus(); await page.keyboard.press('Shift+Tab'); await expect(clear).toBeFocused()
    await page.getByLabel('Tin nhắn', { exact: true }).fill('Cách tính giá thuê')
    await page.keyboard.press('Enter')
    await expect(dialog.locator('.message-row.bot').last()).toContainText('Giá thuê được tính')
    for (const role of ['user', 'bot']) {
      const value = await contrast(dialog.locator(`.message-row.${role} time`).last())
      results.contrast[`${route}:${role}-timestamp`] = value
      assert.ok(value.ratio >= 4.5, `${role} timestamp contrast ${value.ratio}`)
      assert.ok(value.fontPx >= 12, `${role} timestamp readable size`)
    }
    assert.ok(await dialog.locator('[aria-live="polite"]').count() > 0, 'Chat messages have live announcements')
    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
    await expect(launcher).toBeFocused()
    if (route === '/') {
      const badge = page.locator('.available').first()
      results.contrast.available = await contrast(badge)
      assert.ok(results.contrast.available.ratio >= 4.5)
      for (const state of ['.active', ':not(.active)']) {
        const target = page.locator(`.bottom-nav button${state} span`).first()
        const value = await contrast(target)
        results.contrast[`bottom-nav${state}`] = value
        assert.ok(value.ratio >= 4.5)
        assert.ok(value.fontPx >= 12)
      }
    }
  }
  await page.goto(`${baseURL}/chinh-sach`)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  for (const slug of ['dieu-khoan-thue', 'huy-don-hoan-coc', 'bao-mat-du-lieu']) {
    const response = await page.goto(`${baseURL}/chinh-sach/${slug}`)
    assert.equal(response.status(), 200)
    await expect(page.locator('main')).toContainText(/Dự thảo/i)
    assert.match(await page.locator('meta[name="robots"]').getAttribute('content'), /noindex/)
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
  }
  await page.screenshot({ path: 'docs/gd7-policy-mobile.png', fullPage: true })
  const sitemap = await (await context.request.get(`${baseURL}/sitemap.xml`)).text()
  assert.ok(!sitemap.includes('/chinh-sach'), 'Draft policies excluded from sitemap')
  assert.deepEqual(errors, [])
  await context.close()
  console.log('PASS keyboard focus/trap/return, contrast, reduced motion and draft policy pages')

  for (const route of ['/', '/san-pham', '/huong-dan']) {
    for (let run = 1; run <= 3; run++) {
      const perfContext = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' })
      const perfPage = await perfContext.newPage()
      const client = await perfContext.newCDPSession(perfPage)
      await client.send('Network.enable')
      await client.send('Network.setCacheDisabled', { cacheDisabled: true })
      await client.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1_600_000 / 8, uploadThroughput: 750_000 / 8, connectionType: 'cellular4g' })
      await client.send('Emulation.setCPUThrottlingRate', { rate: 4 })
      await perfPage.addInitScript(() => {
        window.__airLcp = 0
        new PerformanceObserver(list => { for (const entry of list.getEntries()) window.__airLcp = entry.startTime }).observe({ type: 'largest-contentful-paint', buffered: true })
      })
      const scripts = new Set()
      perfPage.on('request', request => { if (request.resourceType() === 'script' && request.url().startsWith(baseURL)) scripts.add(request.url()) })
      await perfPage.goto(baseURL + route, { waitUntil: 'networkidle' })
      await perfPage.waitForTimeout(1000)
      const lcpMs = await perfPage.evaluate(() => window.__airLcp)
      assert.ok(lcpMs > 0, 'LCP captured')
      let jsGzipBytes = 0
      for (const url of scripts) {
        const response = await perfContext.request.get(url)
        assert.equal(response.status(), 200)
        jsGzipBytes += gzipSync(await response.body()).byteLength
      }
      results.performance.push({ route, run, lcpMs, jsGzipBytes, scriptCount: scripts.size })
      console.log(JSON.stringify(results.performance.at(-1)))
      await perfContext.close()
    }
  }
  writeFileSync('docs/gd7-ui-measurements.json', JSON.stringify(results, null, 2) + '\n')
  for (const route of ['/', '/san-pham', '/huong-dan']) {
    const runs = results.performance.filter(row => row.route === route)
    assert.ok(runs.every(row => row.jsGzipBytes < 200000), `Initial JS gzip budget of 200 kB on ${route}`)
    const medianLcpMs = runs.map(r => r.lcpMs).sort((a,b)=>a-b)[1]
    console.log(`MEASURE ${route}: median simulated LCP ${medianLcpMs}ms; target <2500ms`)
    assert.ok(medianLcpMs < 2500, `Simulated LCP budget on ${route}; this is not a production 4G claim`)
  }
} finally {
  writeFileSync('docs/gd7-ui-measurements.json', JSON.stringify(results, null, 2) + '\n')
  await browser.close()
}
