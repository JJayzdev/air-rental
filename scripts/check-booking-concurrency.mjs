// Integration check against ONLY the local Supabase project owned by this repository.
// Run from the repository root: node scripts/check-booking-concurrency.mjs
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { resolve } from 'node:path'

const container = 'supabase_db_air-rental'
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
const user = randomUUID(), otherUser = randomUUID(), category = randomUUID()
const products = [randomUUID(), randomUUID()]
const units = [randomUUID(), randomUUID()]
const items = products.map(productId => ({ productId, quantity: 1 }))
const keys = Array.from({ length: 8 }, randomUUID)
function booking(key, lines, offset = 30, actor = user) {
  return sql(`begin; set local role authenticated; set local request.jwt.claim.sub = '${actor}';
    select row_to_json(b) from public.create_multi_product_booking(
      '${key}', '${JSON.stringify(lines)}'::jsonb, current_date + ${offset}, current_date + ${offset},
      'pickup', 'Concurrency Test', '0912345678', 'Pickup at store') b; commit;`).then(JSON.parse)
}
let passed = 0
function pass(name) { passed++; console.log(`PASS ${name}`) }
try {
  await sql(`insert into auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
    values ('${user}','authenticated','authenticated','${user}@example.invalid','{}','{}',now(),now()),
      ('${otherUser}','authenticated','authenticated','${otherUser}@example.invalid','{}','{}',now(),now());
    insert into public.categories(id,slug,name) values ('${category}','concurrency-${category}','Local concurrency fixture');
    insert into public.products(id,category_id,slug,name,price_per_day_vnd,deposit_vnd,state,is_sample)
    values ${products.map((id, i) => `('${id}','${category}','concurrency-${id}','Local concurrency ${i}',${(i + 1) * 10000},50000,'active',false)`).join(',')};
    insert into public.product_units(id,product_id,asset_tag)
    values ${units.map((id, i) => `('${id}','${products[i]}','TEST-${id}')`).join(',')};`)

  const lastUnit = await Promise.allSettled([booking(keys[0], [items[0]]), booking(keys[1], [items[0]])])
  assert.equal(lastUnit.filter(r => r.status === 'fulfilled').length, 1)
  assert.match(lastUnit.find(r => r.status === 'rejected').reason.message, /available|availability|stock|unit|overlap/i)
  assert.equal(await sql(`select count(*) from public.orders where user_id='${user}'`), '1')
  pass('two sessions compete for last unit: exactly one order survives')

  const replay = await Promise.all([booking(keys[2], items, 40), booking(keys[2], [...items].reverse(), 40)])
  assert.equal(replay[0].order_id, replay[1].order_id)
  assert.equal(replay[0].subtotal_vnd, 30000)
  assert.equal(replay[0].deposit_vnd, 100000)
  assert.equal(await sql(`select count(*) from public.order_items where order_id='${replay[0].order_id}'`), '2')
  pass('concurrent canonical replay returns one two-product order with trusted totals')

  const mismatch = await Promise.allSettled([booking(keys[3], [items[0]], 50), booking(keys[3], [items[1]], 50)])
  assert.equal(mismatch.filter(r => r.status === 'fulfilled').length, 1)
  assert.match(mismatch.find(r => r.status === 'rejected').reason.message, /idempot|payload|different|reus/i)
  pass('same key and different payload cannot create two orders')

  const before = await sql(`select count(*) from public.orders where user_id='${user}'`)
  await assert.rejects(booking(keys[4], [items[0], { ...items[1], quantity: 2 }], 60))
  assert.equal(await sql(`select count(*) from public.orders where user_id='${user}'`), before)
  const afterFailure = await booking(keys[5], items, 60)
  assert.equal(afterFailure.subtotal_vnd, 30000)
  pass('shortage on one line rolls back all lines and releases allocated capacity')

  const privateRows = await sql(`begin; set local role authenticated; set local request.jwt.claim.sub='${otherUser}';
    select count(*) from public.orders where id='${replay[0].order_id}'; commit;`)
  assert.equal(privateRows, '0')
  await assert.rejects(sql(`begin; set local role authenticated; set local request.jwt.claim.sub='${otherUser}';
    select public.cancel_booking('${replay[0].order_id}'); commit;`))
  pass('another customer cannot read or cancel an order')

  await sql(`update public.profiles set role='staff' where id='${otherUser}';
    update public.orders set expires_at=now()-interval '1 minute' where id='${afterFailure.order_id}';`)
  const staff = query => sql(`begin; set local role authenticated; set local request.jwt.claim.sub='${otherUser}'; ${query}; commit;`)
  const race = await Promise.allSettled([
    staff(`select public.expire_pending_bookings()`),
    staff(`select public.transition_booking('${afterFailure.order_id}', 'confirmed')`),
  ])
  assert.equal(race[0].status, 'fulfilled')
  assert.equal(race[1].status, 'rejected')
  assert.equal(await sql(`select state from public.orders where id='${afterFailure.order_id}'`), 'expired')
  assert.equal(await sql(`select count(*) from public.reservations where order_id='${afterFailure.order_id}' and released_at is null`), '0')
  pass('expiry versus confirmation: expired hold cannot be confirmed or retain inventory')
  console.log(`${passed}/${passed} integration checks passed`)
} finally {
  // Only rows linked to fresh random fixture IDs are removed; never reset the database.
  await sql(`delete from public.reservations where order_id in (select id from public.orders where user_id='${user}');
    delete from public.order_items where order_id in (select id from public.orders where user_id='${user}');
    delete from public.order_events where order_id in (select id from public.orders where user_id='${user}');
    delete from public.orders where user_id='${user}';
    delete from public.product_units where id in ('${units.join("','")}');
    delete from public.products where id in ('${products.join("','")}');
    delete from public.categories where id='${category}';
    delete from auth.users where id in ('${user}','${otherUser}');`)
}
