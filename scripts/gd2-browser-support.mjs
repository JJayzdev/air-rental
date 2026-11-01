import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import assert from 'node:assert/strict'

const require = createRequire(new URL('../web/package.json', import.meta.url))
export const { chromium, expect } = require('@playwright/test')
const container = 'supabase_db_air-rental'
const labels = JSON.parse(execFileSync('docker', ['inspect', container, '--format', '{{json .Config.Labels}}'], { encoding: 'utf8', windowsHide: true }))
assert.equal(labels['com.supabase.cli.project'], 'air-rental')
assert.equal(resolve(labels['com.supabase.cli.workdir']).toLowerCase(), resolve('.').toLowerCase())
export function sql(query) {
  return execFileSync('docker', ['exec', '-i', container, 'psql', '-U', 'postgres', '-d', 'postgres', '-XAtq', '-v', 'ON_ERROR_STOP=1'], { input: query, encoding: 'utf8', windowsHide: true }).trim()
}
export const baseURL = 'http://localhost:3011'
const run = randomUUID()
export const emails = [`gd2-${run}@example.invalid`, `gd2-other-${run}@example.invalid`]
export const productIds = [randomUUID(), randomUUID()]
export const slugs = productIds.map(id => `gd2-browser-${id}`)
export const names = ['Máy ảnh kiểm thử GĐ2', 'Ống kính kiểm thử GĐ2']
export function setupFixtures() {
  sql(`insert into public.products(id,category_id,slug,name,description,price_per_day_vnd,deposit_vnd,state,is_sample)
    values ${productIds.map((id, i) => `('${id}',(select id from public.categories where slug='camera'),'${slugs[i]}','${names[i]}','Chỉ dùng kiểm thử local, không phải thiết bị kinh doanh.',${(i + 1) * 10000},50000,'active',false)`).join(',')};
    insert into public.product_units(product_id,asset_tag)
    values ${productIds.map(id => `('${id}','BROWSER-${id}')`).join(',')};`)
}
export function cleanupFixtures() {
  const owned = `select id from public.orders where user_id in (select id from auth.users where email in ('${emails.join("','")}'))`
  sql(`delete from public.reservations where order_id in (${owned});
    delete from public.order_items where order_id in (${owned});
    delete from public.order_events where order_id in (${owned});
    delete from public.orders where id in (${owned});
    delete from public.product_units where product_id in ('${productIds.join("','")}');
    delete from public.products where id in ('${productIds.join("','")}');
    delete from auth.users where email in ('${emails.join("','")}');`)
}
export async function waitForMagicLink(email) {
  const deadline = Date.now() + 20000
  while (Date.now() < deadline) {
    const response = await fetch('http://127.0.0.1:55324/api/v1/messages')
    assert.equal(response.ok, true)
    const list = await response.json()
    const found = list.messages.find(message => message.To?.some(to => to.Address === email))
    if (found) {
      const message = await (await fetch(`http://127.0.0.1:55324/api/v1/message/${found.ID}`)).json()
      const link = `${message.Text}\n${message.HTML}`.match(/https?:\/\/[^\s"<>]*\/auth\/v1\/verify\?[^\s"<>]+/)
      assert.ok(link, 'Local login mail contains a verification link')
      const url = link[0].replaceAll('&amp;', '&')
      assert.equal(new URL(url).origin, 'http://127.0.0.1:55321')
      return url
    }
    await new Promise(done => setTimeout(done, 250))
  }
  throw new Error('No login mail appeared in the local mailbox')
}
