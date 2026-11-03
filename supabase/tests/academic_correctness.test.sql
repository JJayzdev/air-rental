-- Regression coverage for full quotes and database guarded asset retirement.
create extension if not exists pgtap with schema extensions;
begin;
select plan(20);
set local role postgres;

insert into public.categories(id, slug, name)
values ('c1000000-0000-4000-8000-000000000001', 'academic-correctness', 'Academic correctness');
insert into public.products(id, category_id, slug, name, price_per_day_vnd, deposit_vnd, state, is_sample)
values ('c1100000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000001',
  'academic-tiered', 'Academic tiered item', 100000, 50000, 'active', false);
insert into public.price_tiers(product_id, min_days, max_days, discount_percent)
values ('c1100000-0000-4000-8000-000000000001', 7, 30, 20);
insert into public.product_units(id, product_id, asset_tag)
values ('c1200000-0000-4000-8000-000000000001', 'c1100000-0000-4000-8000-000000000001', 'ACAD-FREE'),
  ('c1200000-0000-4000-8000-000000000002', 'c1100000-0000-4000-8000-000000000001', 'ACAD-HELD'),
  ('c1200000-0000-4000-8000-000000000003', 'c1100000-0000-4000-8000-000000000001', 'ACAD-EXPIRED'),
  ('c1200000-0000-4000-8000-000000000004', 'c1100000-0000-4000-8000-000000000001', 'ACAD-CUSTODY');
insert into public.delivery_zones(id, name, fee_vnd, free_from_vnd, active)
values ('c1500000-0000-4000-8000-000000000001', 'Academic below threshold', 30000, 510000, true),
  ('c1500000-0000-4000-8000-000000000002', 'Academic above threshold', 30000, 500000, true);
insert into public.discount_codes(id, code, description, kind, value, used_count, active)
values ('c1400000-0000-4000-8000-000000000001', 'ACADEMIC10', 'Academic coupon', 'percent', 10, 0, true);
insert into auth.users(id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values ('c1300000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
  'academic-quote@example.invalid', '', now(), '{}', '{}', now(), now()),
  ('c1300000-0000-4000-8000-000000000002', 'authenticated', 'authenticated',
    'academic-staff@example.invalid', '', now(), '{}', '{}', now(), now());
update public.profiles set role = 'admin' where id = 'c1300000-0000-4000-8000-000000000002';
insert into public.orders(id, code, user_id, state, fulfillment, customer_name, customer_phone,
    delivery_address, subtotal_vnd, deposit_vnd, idempotency_key, request_hash, expires_at)
values
  ('c1600000-0000-4000-8000-000000000001', 'AIR-ACADEMIC-HELD',
    'c1300000-0000-4000-8000-000000000001', 'confirmed', 'pickup', 'Academic User', '0912345678',
    'Campus pickup', 560000, 50000, 'c1700000-0000-4000-8000-000000000001', 'held-order', now() + interval '1 day'),
  ('c1600000-0000-4000-8000-000000000002', 'AIR-ACADEMIC-EXPIRED',
    'c1300000-0000-4000-8000-000000000001', 'pending', 'pickup', 'Academic User', '0912345678',
    'Campus pickup', 560000, 50000, 'c1700000-0000-4000-8000-000000000002', 'expired-order', now() - interval '1 hour'),
  ('c1600000-0000-4000-8000-000000000003', 'AIR-ACADEMIC-CUSTODY',
    'c1300000-0000-4000-8000-000000000001', 'active', 'pickup', 'Academic User', '0912345678',
    'Campus pickup', 560000, 50000, 'c1700000-0000-4000-8000-000000000003', 'custody-order', now() + interval '1 day');
insert into public.order_items(id, order_id, unit_id, product_id, rental_period,
    price_per_day_vnd, rental_days, line_total_vnd)
values
  ('c1800000-0000-4000-8000-000000000001', 'c1600000-0000-4000-8000-000000000001',
    'c1200000-0000-4000-8000-000000000002', 'c1100000-0000-4000-8000-000000000001',
    daterange(current_date + 20, current_date + 27, '[)'), 100000, 7, 560000),
  ('c1800000-0000-4000-8000-000000000002', 'c1600000-0000-4000-8000-000000000002',
    'c1200000-0000-4000-8000-000000000003', 'c1100000-0000-4000-8000-000000000001',
    daterange(current_date + 30, current_date + 37, '[)'), 100000, 7, 560000),
  ('c1800000-0000-4000-8000-000000000003', 'c1600000-0000-4000-8000-000000000003',
    'c1200000-0000-4000-8000-000000000004', 'c1100000-0000-4000-8000-000000000001',
    daterange(current_date - 10, current_date - 3, '[)'), 100000, 7, 560000);
insert into public.reservations(id, order_id, order_item_id, unit_id, state, blocked_period)
values
  ('c1900000-0000-4000-8000-000000000001', 'c1600000-0000-4000-8000-000000000001',
    'c1800000-0000-4000-8000-000000000001', 'c1200000-0000-4000-8000-000000000002',
    'confirmed', daterange(current_date + 20, current_date + 28, '[)')),
  ('c1900000-0000-4000-8000-000000000002', 'c1600000-0000-4000-8000-000000000002',
    'c1800000-0000-4000-8000-000000000002', 'c1200000-0000-4000-8000-000000000003',
    'pending', daterange(current_date + 30, current_date + 38, '[)')),
  ('c1900000-0000-4000-8000-000000000003', 'c1600000-0000-4000-8000-000000000003',
    'c1800000-0000-4000-8000-000000000003', 'c1200000-0000-4000-8000-000000000004',
    'confirmed', daterange(current_date - 10, current_date - 2, '[)'));

select ok(has_function_privilege('anon',
    'public.preview_booking_quote(jsonb,date,date,public.fulfillment_method,text,uuid)', 'EXECUTE')
  and has_function_privilege('authenticated',
    'public.preview_booking_quote(jsonb,date,date,public.fulfillment_method,text,uuid)', 'EXECUTE'),
  'the quote preview is callable for public catalog prices and signed-in coupon checks');
select ok(not has_function_privilege('authenticated',
    'public.quote_booking(jsonb,date,date,public.fulfillment_method,text,uuid)', 'EXECUTE'),
  'the internal booking quote remains unavailable as a direct RPC');
set local role anon;
select throws_ok($$select public.preview_booking_quote(
  '[{"productId":"c1100000-0000-4000-8000-000000000001","quantity":1}]',
  current_date + 20, current_date + 26, 'pickup', 'ACADEMIC10', null)$$,
  '28000', 'Authentication required to preview discount codes',
  'anonymous users cannot validate a discount code');

select is((public.preview_booking_quote(
  '[{"productId":"c1100000-0000-4000-8000-000000000001","quantity":1}]',
  current_date + 20, current_date + 26, 'pickup', '', null)->>'subtotalVnd')::bigint,
  560000::bigint, 'anonymous code-free quote applies the seven-day tier price');
select throws_ok($$select public.preview_booking_quote(
  '[{"productId":"c1100000-0000-4000-8000-000000000001","quantity":11},
    {"productId":"c1100000-0000-4000-8000-000000000001","quantity":10}]',
  current_date + 20, current_date + 26, 'pickup', '', null)$$,
  'P0001', 'Cart quantity cannot exceed 20 units',
  'preview applies the same total quantity bound as booking creation');
set local role authenticated;
select set_config('request.jwt.claim.sub', 'c1300000-0000-4000-8000-000000000001', true);
select is((public.preview_booking_quote(
  '[{"productId":"c1100000-0000-4000-8000-000000000001","quantity":2}]',
  current_date + 20, current_date + 26, 'pickup', '', null)->>'depositVnd')::bigint,
  100000::bigint, 'quote includes deposit for every requested quantity');

select is((public.preview_booking_quote(
  '[{"productId":"c1100000-0000-4000-8000-000000000001","quantity":1}]',
  current_date + 20, current_date + 26, 'delivery', 'academic10',
  'c1500000-0000-4000-8000-000000000001')->>'subtotalVnd')::bigint,
  560000::bigint, 'coupon quote uses the same tier subtotal');
select is((public.preview_booking_quote(
  '[{"productId":"c1100000-0000-4000-8000-000000000001","quantity":1}]',
  current_date + 20, current_date + 26, 'delivery', 'academic10',
  'c1500000-0000-4000-8000-000000000001')->>'discountVnd')::bigint,
  56000::bigint, 'coupon discount is computed by the canonical database quote');
select is((public.preview_booking_quote(
  '[{"productId":"c1100000-0000-4000-8000-000000000001","quantity":1}]',
  current_date + 20, current_date + 26, 'delivery', 'academic10',
  'c1500000-0000-4000-8000-000000000001')->>'deliveryFeeVnd')::bigint,
  30000::bigint, 'shipping threshold uses tiered subtotal after coupon');
select is((public.preview_booking_quote(
  '[{"productId":"c1100000-0000-4000-8000-000000000001","quantity":1}]',
  current_date + 20, current_date + 26, 'delivery', 'academic10',
  'c1500000-0000-4000-8000-000000000002')->>'deliveryFeeVnd')::bigint,
  0::bigint, 'shipping becomes free when post-discount tier subtotal reaches zone threshold');
select is((public.preview_booking_quote(
  '[{"productId":"c1100000-0000-4000-8000-000000000001","quantity":1}]',
  current_date + 20, current_date + 26, 'delivery', 'academic10',
  'c1500000-0000-4000-8000-000000000001')->>'totalVnd')::bigint,
  534000::bigint, 'total includes tier subtotal less coupon plus delivery');
set local role postgres;
select is((select used_count from public.discount_codes where code = 'ACADEMIC10'),
  0, 'preview never consumes a coupon use');
select is((select count(*) from public.orders where user_id = 'c1300000-0000-4000-8000-000000000001'
    and request_hash not in ('held-order', 'expired-order', 'custody-order')),
  0::bigint,
  'preview never creates an order or reserves inventory');

set local role postgres;
select throws_ok($$update public.product_units set state = 'retired'
  where id = 'c1200000-0000-4000-8000-000000000002'$$,
  'P0001', 'Unit has a live reservation or custody', 'a confirmed future reservation blocks retirement');
select lives_ok($$update public.product_units set state = 'retired'
  where id = 'c1200000-0000-4000-8000-000000000001'$$,
  'a free unit can be retired directly');
select lives_ok($$update public.product_units set state = 'retired'
  where id = 'c1200000-0000-4000-8000-000000000003'$$,
  'a pending hold whose expiry has passed does not block retirement');
select throws_ok($$update public.product_units set state = 'maintenance'
  where id = 'c1200000-0000-4000-8000-000000000002'$$,
  'P0001', 'State maintenance requires an open maintenance record',
  'direct state changes cannot bypass the maintenance scheduling RPC');
select throws_ok($$update public.product_units set state = 'retired'
  where id = 'c1200000-0000-4000-8000-000000000004'$$,
  'P0001', 'Unit has a live reservation or custody', 'active custody blocks retirement past the contractual end date');

select set_config('request.jwt.claim.sub', 'c1300000-0000-4000-8000-000000000002', true);
select lives_ok($$select public.open_unit_maintenance(
  'c1200000-0000-4000-8000-000000000002', 'inspection', current_date + 1, 'Non-overlapping check')$$,
  'maintenance opens when its short window does not collide with a future booking');
select lives_ok($$select public.close_unit_maintenance(
  (select id from public.unit_maintenance where unit_id = 'c1200000-0000-4000-8000-000000000002'),
  current_date + 1)$$,
  'maintenance close returns the unit to the pool without rejecting its later reservation');

select * from finish();
rollback;
