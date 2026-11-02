-- GĐ5 phase B: discount codes, delivery zones, combined totals, idempotency, and payment state.
create extension if not exists pgtap with schema extensions;
begin;
select plan(53);
set local role postgres;

insert into public.categories(id, slug, name)
values ('a1000000-0000-4000-8000-000000000001', 'pricing-test', 'Pricing test');
insert into public.products(id, category_id, slug, name, price_per_day_vnd, deposit_vnd, state, is_sample)
values ('a1100000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001',
  'pricing-unit', 'Pricing unit', 100000, 50000, 'active', false);
insert into public.product_units(id, product_id, asset_tag)
select ('a1200000-0000-4000-8000-0000000000' || lpad(n::text, 2, '0'))::uuid,
  'a1100000-0000-4000-8000-000000000001', 'PRC-' || lpad(n::text, 2, '0')
from generate_series(1, 10) as n;

insert into auth.users(id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('a1300000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
    'pricing-customer@example.invalid', '', now(), '{}', '{}', now(), now()),
  ('a1300000-0000-4000-8000-000000000002', 'authenticated', 'authenticated',
    'pricing-admin@example.invalid', '', now(), '{}', '{}', now(), now());
update public.profiles set role = 'admin' where id = 'a1300000-0000-4000-8000-000000000002';

insert into public.delivery_zones(id, name, fee_vnd, free_from_vnd, notes, sort_order, active)
values
  ('a1500000-0000-4000-8000-000000000001', 'Pricing standard', 30000, 500000, 'Standard', 1, true),
  ('a1500000-0000-4000-8000-000000000002', 'Pricing premium', 60000, null, 'Premium', 2, true),
  ('a1500000-0000-4000-8000-000000000003', 'Pricing disabled', 10000, null, 'Disabled', 3, false);

insert into public.discount_codes(id, code, description, kind, value, min_subtotal_vnd, max_uses, used_count, active)
values
  ('a1400000-0000-4000-8000-000000000001', 'PERCENT10', 'Ten percent', 'percent', 10, 0, 100, 0, true),
  ('a1400000-0000-4000-8000-000000000002', 'FIXED200K', 'Fixed clamp', 'fixed', 200000, 0, null, 0, true),
  ('a1400000-0000-4000-8000-000000000003', 'MIN200K', 'Minimum subtotal', 'percent', 10, 200000, null, 0, true),
  ('a1400000-0000-4000-8000-000000000004', 'INACTIVE', 'Disabled code', 'percent', 10, 0, null, 0, false),
  ('a1400000-0000-4000-8000-000000000005', 'EXPIRED', 'Expired code', 'percent', 10, 0, null, 0, true),
  ('a1400000-0000-4000-8000-000000000006', 'FUTURE', 'Future code', 'percent', 10, 0, null, 0, true),
  ('a1400000-0000-4000-8000-000000000007', 'EXHAUSTED', 'Exhausted code', 'percent', 10, 0, 1, 1, true),
  ('a1400000-0000-4000-8000-000000000008', 'FREE10', 'Threshold code', 'percent', 10, 0, null, 0, true),
  ('a1400000-0000-4000-8000-000000000009', 'ALT10', 'Alternative code', 'percent', 10, 0, null, 0, true),
  ('a1400000-0000-4000-8000-000000000010', 'WRAP10', 'Wrapper code', 'percent', 10, 0, null, 0, true),
  ('a1400000-0000-4000-8000-000000000011', 'PAY10', 'Payment code', 'percent', 10, 0, null, 0, true);
update public.discount_codes
  set starts_on = current_date - 10, ends_on = current_date - 1
where code = 'EXPIRED';
update public.discount_codes set starts_on = current_date + 5 where code = 'FUTURE';

select ok(has_table_privilege('authenticated', 'public.delivery_zones', 'SELECT')
  and has_table_privilege('anon', 'public.delivery_zones', 'SELECT')
  and has_table_privilege('authenticated', 'public.discount_codes', 'SELECT')
  and not has_table_privilege('anon', 'public.discount_codes', 'SELECT'),
  'zones are public pricing data while discount codes stay behind authentication');
select ok(has_function_privilege('authenticated',
    'public.preview_booking_discount(jsonb,date,date,text)', 'EXECUTE')
  and not has_function_privilege('anon',
    'public.preview_booking_discount(jsonb,date,date,text)', 'EXECUTE'),
  'only signed-in shoppers can preview a discount');
select ok(not has_function_privilege('authenticated',
    'public.quote_booking(jsonb,date,date,public.fulfillment_method,text,uuid)', 'EXECUTE'),
  'the internal pricing engine is not callable from the client');
select ok(has_function_privilege('authenticated',
    'public.create_multi_product_booking(uuid,jsonb,date,date,public.fulfillment_method,text,text,text,text,uuid)',
    'EXECUTE'),
  'the booking RPC exposes the new discount and zone arguments');
select is(to_regprocedure(
    'public.create_multi_product_booking(uuid,jsonb,date,date,public.fulfillment_method,text,text,text)'),
  null::regprocedure, 'the old booking signature is gone rather than overloaded');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a1300000-0000-4000-8000-000000000001', true);
select is((select count(*) from public.discount_codes), 0::bigint,
  'customers cannot enumerate discount codes');
select throws_ok($$insert into public.discount_codes(code, description, kind, value)
  values ('CUSTOMER', '', 'percent', 10)$$, '42501', null,
  'customers cannot create discount codes');

set local role anon;
select is((select count(*) from public.delivery_zones where name like 'Pricing %'), 2::bigint,
  'shoppers only see active delivery zones');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a1300000-0000-4000-8000-000000000002', true);
select is((select count(*) from public.delivery_zones where not active), 1::bigint,
  'admins can read deactivated delivery zones');
select lives_ok($$insert into public.delivery_zones(name, fee_vnd, notes)
  values ('Admin new zone', 20000, 'Created by admin')$$,
  'admins can create a delivery zone');
select lives_ok($$insert into public.discount_codes(code, description, kind, value)
  values ('ADMINNEW', 'Created by admin', 'percent', 5)$$,
  'admins can create a discount code');

select set_config('request.jwt.claim.sub', 'a1300000-0000-4000-8000-000000000001', true);
select is((select subtotal_vnd from public.preview_booking_discount(
    jsonb_build_array(jsonb_build_object('productId', 'a1100000-0000-4000-8000-000000000001', 'quantity', 1)),
    '2099-07-01', '2099-07-01', 'PERCENT10')),
  100000::bigint, 'preview re-prices the cart from catalog data');
select is((select discount_vnd from public.preview_booking_discount(
    jsonb_build_array(jsonb_build_object('productId', 'a1100000-0000-4000-8000-000000000001', 'quantity', 1)),
    '2099-07-01', '2099-07-01', 'PERCENT10')),
  10000::bigint, 'preview returns the percent discount');
select throws_ok($$select * from public.preview_booking_discount(
    jsonb_build_array(jsonb_build_object('productId', 'a1100000-0000-4000-8000-000000000001', 'quantity', 1)),
    '2099-07-01', '2099-07-01', 'MISSING')$$,
  'P0001', 'Discount code was not found', 'preview reports an unknown code');
select throws_ok($$select * from public.preview_booking_discount(
    jsonb_build_array(jsonb_build_object('productId', 'a1100000-0000-4000-8000-000000000001', 'quantity', 1)),
    '2099-07-01', '2099-07-01', 'MIN200K')$$,
  'P0001', 'Order subtotal has not reached the discount minimum',
  'preview enforces the minimum subtotal');

create temporary table percent_booking on commit drop as
select * from public.create_multi_product_booking(
  'a1600000-0000-4000-8000-000000000001',
  jsonb_build_array(jsonb_build_object('productId', 'a1100000-0000-4000-8000-000000000001', 'quantity', 1)),
  '2099-07-01', '2099-07-01', 'pickup', 'Pricing Customer', '0912345678', 'Pricing address 123',
  'PERCENT10', null
);
select is((select subtotal_vnd from percent_booking), 100000::bigint,
  'percent booking keeps the catalog subtotal');
select is((select discount_vnd from percent_booking), 10000::bigint,
  'percent booking returns the discount');
select is((select delivery_fee_vnd from percent_booking), 0::bigint,
  'pickup booking has no delivery fee');
select is((select total_vnd from percent_booking), 90000::bigint,
  'pickup total subtracts the discount');
select is((select deposit_vnd from percent_booking), 50000::bigint,
  'discount never reduces the deposit');
select is((select discount_code from public.orders where id = (select order_id from percent_booking)),
  'PERCENT10', 'the order snapshots the discount code');
select is((select total_vnd from public.orders where id = (select order_id from percent_booking)),
  90000::bigint, 'the generated order total matches the quote');
-- used_count is hidden from customers by RLS, so read it as the table owner.
set local role postgres;
select is((select used_count from public.discount_codes where code = 'PERCENT10'), 1,
  'a successful booking increments used_count');
set local role authenticated;
select set_config('request.jwt.claim.sub', 'a1300000-0000-4000-8000-000000000001', true);

select is((select order_id from public.create_multi_product_booking(
    'a1600000-0000-4000-8000-000000000001',
    jsonb_build_array(jsonb_build_object('productId', 'a1100000-0000-4000-8000-000000000001', 'quantity', 1)),
    '2099-07-01', '2099-07-01', 'pickup', 'Pricing Customer', '0912345678', 'Pricing address 123',
    'PERCENT10', null)),
  (select order_id from percent_booking), 'replaying the same request returns the same order');
set local role postgres;
select is((select used_count from public.discount_codes where code = 'PERCENT10'), 1,
  'an idempotent replay does not consume another use');
set local role authenticated;
select set_config('request.jwt.claim.sub', 'a1300000-0000-4000-8000-000000000001', true);
select throws_ok($$select * from public.create_multi_product_booking(
    'a1600000-0000-4000-8000-000000000001',
    jsonb_build_array(jsonb_build_object('productId', 'a1100000-0000-4000-8000-000000000001', 'quantity', 1)),
    '2099-07-01', '2099-07-01', 'pickup', 'Pricing Customer', '0912345678', 'Pricing address 123',
    'ALT10', null)$$, 'P0001', 'Idempotency key was already used with different booking details',
  'changing the code with the same key is rejected');

create temporary table fixed_booking on commit drop as
select * from public.create_multi_product_booking(
  'a1600000-0000-4000-8000-000000000002',
  jsonb_build_array(jsonb_build_object('productId', 'a1100000-0000-4000-8000-000000000001', 'quantity', 1)),
  '2099-07-02', '2099-07-02', 'pickup', 'Pricing Customer', '0912345678', 'Pricing address 123',
  'FIXED200K', null
);
select is((select discount_vnd from fixed_booking), 100000::bigint,
  'a fixed discount is clamped to the rental subtotal');
select is((select total_vnd from fixed_booking), 0::bigint,
  'a fully discounted rental still keeps the deposit separate');

select throws_ok($$select * from public.create_multi_product_booking(
    'a1600000-0000-4000-8000-000000000003',
    jsonb_build_array(jsonb_build_object('productId', 'a1100000-0000-4000-8000-000000000001', 'quantity', 1)),
    '2099-07-03', '2099-07-03', 'pickup', 'Pricing Customer', '0912345678', 'Pricing address 123',
    'MIN200K', null)$$, 'P0001', 'Order subtotal has not reached the discount minimum',
  'the booking RPC enforces the minimum subtotal');
select throws_ok($$select * from public.create_multi_product_booking(
    'a1600000-0000-4000-8000-000000000004',
    jsonb_build_array(jsonb_build_object('productId', 'a1100000-0000-4000-8000-000000000001', 'quantity', 1)),
    '2099-07-03', '2099-07-03', 'pickup', 'Pricing Customer', '0912345678', 'Pricing address 123',
    'INACTIVE', null)$$, 'P0001', 'Discount code is not active',
  'inactive codes are rejected');
select throws_ok($$select * from public.create_multi_product_booking(
    'a1600000-0000-4000-8000-000000000005',
    jsonb_build_array(jsonb_build_object('productId', 'a1100000-0000-4000-8000-000000000001', 'quantity', 1)),
    '2099-07-03', '2099-07-03', 'pickup', 'Pricing Customer', '0912345678', 'Pricing address 123',
    'EXPIRED', null)$$, 'P0001', 'Discount code is outside its valid dates',
  'expired codes are rejected');
select throws_ok($$select * from public.create_multi_product_booking(
    'a1600000-0000-4000-8000-000000000006',
    jsonb_build_array(jsonb_build_object('productId', 'a1100000-0000-4000-8000-000000000001', 'quantity', 1)),
    '2099-07-03', '2099-07-03', 'pickup', 'Pricing Customer', '0912345678', 'Pricing address 123',
    'FUTURE', null)$$, 'P0001', 'Discount code is outside its valid dates',
  'codes that start later are rejected');
select throws_ok($$select * from public.create_multi_product_booking(
    'a1600000-0000-4000-8000-000000000007',
    jsonb_build_array(jsonb_build_object('productId', 'a1100000-0000-4000-8000-000000000001', 'quantity', 1)),
    '2099-07-03', '2099-07-03', 'pickup', 'Pricing Customer', '0912345678', 'Pricing address 123',
    'EXHAUSTED', null)$$, 'P0001', 'Discount code has reached its usage limit',
  'exhausted codes are rejected');

select throws_ok($$select * from public.create_multi_product_booking(
    'a1600000-0000-4000-8000-000000000008',
    jsonb_build_array(jsonb_build_object('productId', 'a1100000-0000-4000-8000-000000000001', 'quantity', 1)),
    '2099-07-04', '2099-07-04', 'delivery', 'Pricing Customer', '0912345678', 'Pricing address 123',
    '', null)$$, 'P0001', 'Delivery requires a delivery zone',
  'delivery without a zone is rejected');
select throws_ok($$select * from public.create_multi_product_booking(
    'a1600000-0000-4000-8000-000000000009',
    jsonb_build_array(jsonb_build_object('productId', 'a1100000-0000-4000-8000-000000000001', 'quantity', 1)),
    '2099-07-04', '2099-07-04', 'pickup', 'Pricing Customer', '0912345678', 'Pricing address 123',
    '', 'a1500000-0000-4000-8000-000000000001')$$, 'P0001',
  'Pickup orders cannot have a delivery zone', 'pickup with a zone is rejected');

create temporary table delivery_booking on commit drop as
select * from public.create_multi_product_booking(
  'a1600000-0000-4000-8000-000000000010',
  jsonb_build_array(jsonb_build_object('productId', 'a1100000-0000-4000-8000-000000000001', 'quantity', 1)),
  '2099-07-04', '2099-07-04', 'delivery', 'Pricing Customer', '0912345678', 'Pricing address 123',
  '', 'a1500000-0000-4000-8000-000000000001'
);
select is((select delivery_fee_vnd from delivery_booking), 30000::bigint,
  'delivery adds the zone fee');
select is((select delivery_zone_name from public.orders where id = (select order_id from delivery_booking)),
  'Pricing standard', 'the order snapshots the zone name');
select is((select total_vnd from delivery_booking), 130000::bigint,
  'delivery total adds the fee to the subtotal');

select throws_ok($$select * from public.create_multi_product_booking(
    'a1600000-0000-4000-8000-000000000011',
    jsonb_build_array(jsonb_build_object('productId', 'a1100000-0000-4000-8000-000000000001', 'quantity', 1)),
    '2099-07-04', '2099-07-04', 'delivery', 'Pricing Customer', '0912345678', 'Pricing address 123',
    '', 'a1500000-0000-4000-8000-000000000003')$$, 'P0001',
  'Delivery zone was not found or inactive', 'inactive zones are rejected');

create temporary table free_delivery on commit drop as
select * from public.create_multi_product_booking(
  'a1600000-0000-4000-8000-000000000012',
  jsonb_build_array(jsonb_build_object('productId', 'a1100000-0000-4000-8000-000000000001', 'quantity', 1)),
  '2099-07-05', '2099-07-09', 'delivery', 'Pricing Customer', '0912345678', 'Pricing address 123',
  '', 'a1500000-0000-4000-8000-000000000001'
);
select is((select subtotal_vnd from free_delivery), 500000::bigint,
  'a five-day rental reaches the catalog subtotal');
select is((select delivery_fee_vnd from free_delivery), 0::bigint,
  'delivery is free at the zone threshold');
select is((select total_vnd from free_delivery), 500000::bigint,
  'free delivery keeps the subtotal as the total');

create temporary table discounted_delivery on commit drop as
select * from public.create_multi_product_booking(
  'a1600000-0000-4000-8000-000000000013',
  jsonb_build_array(jsonb_build_object('productId', 'a1100000-0000-4000-8000-000000000001', 'quantity', 1)),
  '2099-07-10', '2099-07-11', 'delivery', 'Pricing Customer', '0912345678', 'Pricing address 123',
  'FREE10', 'a1500000-0000-4000-8000-000000000001'
);
select is((select subtotal_vnd from discounted_delivery), 200000::bigint,
  'the combined booking keeps its two-day subtotal');
select is((select discount_vnd from discounted_delivery), 20000::bigint,
  'the discount applies before the delivery fee');
select is((select delivery_fee_vnd from discounted_delivery), 30000::bigint,
  'the free threshold is measured after the discount');
select is((select total_vnd from discounted_delivery), 210000::bigint,
  'the combined total is subtotal minus discount plus fee');

create temporary table delivery_idempotent on commit drop as
select * from public.create_multi_product_booking(
  'a1600000-0000-4000-8000-000000000014',
  jsonb_build_array(jsonb_build_object('productId', 'a1100000-0000-4000-8000-000000000001', 'quantity', 1)),
  '2099-07-12', '2099-07-12', 'delivery', 'Pricing Customer', '0912345678', 'Pricing address 123',
  'ALT10', 'a1500000-0000-4000-8000-000000000001'
);
select is((select order_id from public.create_multi_product_booking(
    'a1600000-0000-4000-8000-000000000014',
    jsonb_build_array(jsonb_build_object('productId', 'a1100000-0000-4000-8000-000000000001', 'quantity', 1)),
    '2099-07-12', '2099-07-12', 'delivery', 'Pricing Customer', '0912345678', 'Pricing address 123',
    'ALT10', 'a1500000-0000-4000-8000-000000000001')),
  (select order_id from delivery_idempotent), 'the same delivery request replays cleanly');
select throws_ok($$select * from public.create_multi_product_booking(
    'a1600000-0000-4000-8000-000000000014',
    jsonb_build_array(jsonb_build_object('productId', 'a1100000-0000-4000-8000-000000000001', 'quantity', 1)),
    '2099-07-12', '2099-07-12', 'delivery', 'Pricing Customer', '0912345678', 'Pricing address 123',
    'ALT10', 'a1500000-0000-4000-8000-000000000002')$$, 'P0001',
  'Idempotency key was already used with different booking details',
  'changing the zone with the same key is rejected');

create temporary table wrapper_booking on commit drop as
select * from public.create_booking(
  'a1600000-0000-4000-8000-000000000015',
  'a1100000-0000-4000-8000-000000000001', 1,
  '2099-07-13', '2099-07-13', 'pickup', 'Pricing Customer', '0912345678', 'Pricing address 123',
  'WRAP10', null
);
select is((select discount_vnd from wrapper_booking), 10000::bigint,
  'the legacy single-product wrapper forwards the discount');
select is((select total_vnd from wrapper_booking), 90000::bigint,
  'the wrapper returns the discounted total');

create temporary table payment_booking on commit drop as
select * from public.create_multi_product_booking(
  'a1600000-0000-4000-8000-000000000016',
  jsonb_build_array(jsonb_build_object('productId', 'a1100000-0000-4000-8000-000000000001', 'quantity', 1)),
  '2099-07-14', '2099-07-14', 'pickup', 'Pricing Customer', '0912345678', 'Pricing address 123',
  'PAY10', null
);
set local role postgres;
select is((public.apply_sepay_payment('pricing-pay-1', 50000,
    'Thanh toan ' || (select code from public.orders where id = (select order_id from payment_booking)),
    '{}'::jsonb))->>'paymentState', 'deposit_paid',
  'the deposit threshold is still based on the deposit alone');
select is((public.apply_sepay_payment('pricing-pay-2', 90000,
    'Thanh toan ' || (select code from public.orders where id = (select order_id from payment_booking)),
    '{}'::jsonb))->>'paymentState', 'paid',
  'the paid threshold uses the discounted total');
select is((select payment_state from public.orders where id = (select order_id from payment_booking)),
  'paid'::public.payment_state, 'the order stores the paid state');

select * from finish();
rollback;
