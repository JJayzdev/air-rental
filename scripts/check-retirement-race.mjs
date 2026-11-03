#!/usr/bin/env node
import { randomUUID } from 'node:crypto'
import { spawn } from 'node:child_process'

const databaseUrl = process.env.AIR_LOCAL_DATABASE_URL
if (!databaseUrl) {
  throw new Error('Set AIR_LOCAL_DATABASE_URL to the local A.I.R PostgreSQL connection string.')
}
const parsedUrl = new URL(databaseUrl)
const hostname = parsedUrl.hostname.replace(/^\[|\]$/g, '')
if (!['localhost', '127.0.0.1', '::1'].includes(hostname) || parsedUrl.port !== '55322' || parsedUrl.pathname !== '/postgres') {
  throw new Error('Use the A.I.R local Supabase database on loopback port 55322 and database postgres.')
}
const pgEnv = {
  ...process.env,
  PGHOST: hostname,
  PGPORT: parsedUrl.port,
  PGDATABASE: decodeURIComponent(parsedUrl.pathname.slice(1)),
  PGUSER: decodeURIComponent(parsedUrl.username),
  PGPASSWORD: decodeURIComponent(parsedUrl.password),
  PGSSLMODE: parsedUrl.searchParams.get('sslmode') ?? 'disable',
}

const runId = randomUUID().replaceAll('-', '').slice(0, 12)
const categoryId = randomUUID()
const productId = randomUUID()
const unitId = randomUUID()
const secondProductId = randomUUID()
const secondUnitId = randomUUID()
const userId = randomUUID()
const bookingKey = randomUUID()
const slug = `race-${runId}`
const tag = `RACE-${runId}`
const email = `retirement-race-${runId}@example.invalid`

function psql(sql, applicationName = `air-retirement-race-${runId}`) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      'psql',
      ['--no-psqlrc', '-X', '-v', 'ON_ERROR_STOP=1', '-q', '-tA', '-c', sql],
      { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true, env: { ...pgEnv, PGAPPNAME: applicationName } },
    )
    let stdout = ''
    let stderr = ''
    child.stdout.setEncoding('utf8').on('data', (chunk) => (stdout += chunk))
    child.stderr.setEncoding('utf8').on('data', (chunk) => (stderr += chunk))
    child.on('error', reject)
    child.on('close', (code) => resolve({ code, stdout, stderr }))
  })
}

function startPsql(sql, applicationName) {
  const child = spawn(
    'psql',
    ['--no-psqlrc', '-X', '-v', 'ON_ERROR_STOP=1', '-q', '-tA', '-f', '-'],
    { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true, env: { ...pgEnv, PGAPPNAME: applicationName } },
  )
  let stdout = ''
  let stderr = ''
  child.stdout.setEncoding('utf8').on('data', (chunk) => (stdout += chunk))
  child.stderr.setEncoding('utf8').on('data', (chunk) => (stderr += chunk))
  const result = new Promise((resolve, reject) => {
    child.on('error', reject)
    child.on('close', (code) => resolve({ code, stdout, stderr }))
  })
  child.stdin.end(sql)
  const locked = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timed out waiting for the booking transaction lock.')), 15000)
    const check = () => {
      if (stdout.includes('UNIT_LOCKED')) {
        clearTimeout(timeout)
        resolve()
      }
    }
    child.stdout.on('data', check)
    result.then(({ code }) => {
      if (code !== 0 && !stdout.includes('UNIT_LOCKED')) {
        clearTimeout(timeout)
        reject(new Error(`Booking transaction exited early: ${stderr}`))
      }
    })
  })
  return { locked, result }
}

let setupComplete = false
try {
  const setup = await psql(`
    begin;
    insert into public.categories(id, slug, name) values ('${categoryId}', '${slug}', 'Race test ${runId}');
    insert into public.products(id, category_id, slug, name, description, price_per_day_vnd,
      deposit_vnd, state, is_sample)
      values ('${productId}', '${categoryId}', '${slug}', 'Race test item', '', 1000, 0, 'active', false);
    insert into public.product_units(id, product_id, asset_tag)
      values ('${unitId}', '${productId}', '${tag}');
    insert into public.products(id, category_id, slug, name, description, price_per_day_vnd,
      deposit_vnd, state, is_sample)
      values ('${secondProductId}', '${categoryId}', '${slug}-second', 'Race test second item', '', 1000, 0, 'active', false);
    insert into public.product_units(id, product_id, asset_tag)
      values ('${secondUnitId}', '${secondProductId}', '${tag}-SECOND');
    insert into auth.users(id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
      values ('${userId}', 'authenticated', 'authenticated', '${email}', '', now(), '{}', '{}', now(), now());
    commit;
  `)
  if (setup.code !== 0) throw new Error(`Fixture setup failed: ${setup.stderr}`)
  setupComplete = true

  const bookingSql = `
    begin;
    select set_config('request.jwt.claim.sub', '${userId}', true);
    select id from public.product_units where id = '${unitId}' for update;
    \\echo UNIT_LOCKED
    select pg_sleep(1.5);
    select order_id from public.create_multi_product_booking(
      '${bookingKey}', '[{"productId":"${productId}","quantity":1}]'::jsonb,
      current_date + 30, current_date + 36, 'pickup', 'Race Test User', '0912345678', 'Campus pickup'
    );
    commit;
  `
  const bookingApp = `air-book-${runId}`
  const retireApp = `air-retire-${runId}`
  const booking = startPsql(bookingSql, bookingApp)
  await booking.locked
  const retirement = psql(`update public.product_units set state = 'retired' where id = '${unitId}';`, retireApp)
  let blockedByUnitLock = false
  for (let attempt = 0; attempt < 20; attempt++) {
    const activity = await psql(`select wait_event_type || ':' || coalesce(wait_event, '')
      from pg_stat_activity where application_name = '${retireApp}'
      and wait_event_type = 'Lock' limit 1;`)
    if (activity.stdout.trim().startsWith('Lock:')) {
      blockedByUnitLock = true
      break
    }
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  const [bookingResult, retirementResult] = await Promise.all([booking.result, retirement])
  if (!blockedByUnitLock) throw new Error('Retirement did not wait on the booking-held unit lock.')
  if (bookingResult.code !== 0 || !bookingResult.stdout.includes(unitId) && !bookingResult.stdout.match(/\n[0-9a-f-]{36}\n/)) {
    throw new Error(`Booking did not complete during the lock race: ${bookingResult.stderr || bookingResult.stdout}`)
  }
  if (retirementResult.code === 0 || !retirementResult.stderr.includes('Unit has a live reservation or custody')) {
    throw new Error(`Retirement was not rejected after the booking won the row lock: ${retirementResult.stderr}`)
  }
  const state = await psql(`select state::text || ':' || count(r.id)::text
    from public.product_units u left join public.reservations r on r.unit_id = u.id and r.released_at is null
    where u.id = '${unitId}' group by u.state;`)
  if (state.code !== 0 || !state.stdout.trim().endsWith('available:1')) {
    throw new Error(`Unexpected post-race state: ${state.stderr || state.stdout}`)
  }

  const retireFirstSql = `
    begin;
    update public.product_units set state = 'retired' where id = '${secondUnitId}';
    \\echo RETIRE_LOCKED
    select pg_sleep(1.5);
    commit;
  `
  const retireFirst = startPsql(retireFirstSql, `air-retire-first-${runId}`)
  await retireFirst.locked
  const competingBooking = await psql(`
    select set_config('request.jwt.claim.sub', '${userId}', false);
    select * from public.create_multi_product_booking(
      '${randomUUID()}', '[{"productId":"${secondProductId}","quantity":1}]'::jsonb,
      current_date + 30, current_date + 36, 'pickup', 'Race Test User', '0912345678', 'Campus pickup'
    );
  `, `air-book-after-retire-${runId}`)
  const retireFirstResult = await retireFirst.result
  if (retireFirstResult.code !== 0) throw new Error(`Retirement-first transaction failed: ${retireFirstResult.stderr}`)
  if (competingBooking.code === 0 || !competingBooking.stderr.includes('Not enough available units')) {
    throw new Error(`Booking was not rejected after retirement won: ${competingBooking.stderr}`)
  }
  process.stdout.write('PASS booking and retirement serialize in both lock orders.\n')
} finally {
  if (setupComplete) {
    const cleanup = await psql(`
      delete from public.reservations where unit_id = '${unitId}';
      delete from public.order_items where unit_id = '${unitId}';
      delete from public.order_events where order_id in (select id from public.orders where user_id = '${userId}');
      delete from public.payments where order_id in (select id from public.orders where user_id = '${userId}');
      delete from public.orders where user_id = '${userId}';
      delete from public.product_units where id = '${unitId}';
      delete from public.product_units where id = '${secondUnitId}';
      delete from public.products where id = '${productId}';
      delete from public.products where id = '${secondProductId}';
      delete from public.categories where id = '${categoryId}';
      delete from auth.users where id = '${userId}';
    `)
    if (cleanup.code !== 0) throw new Error(`Race fixture cleanup failed: ${cleanup.stderr}`)
  }
}
