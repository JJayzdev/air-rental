-- Mã giảm giá hoàn lượt khi đơn huỷ/hết hạn (202611070001_discount_usage_from_orders).
create extension if not exists pgtap with schema extensions;
begin;
select plan(13);
set local role postgres;

insert into public.categories(id, slug, name)
values ('d2000000-0000-4000-8000-000000000001', 'discount-usage-test', 'Discount usage test');
insert into public.products(id, category_id, slug, name, price_per_day_vnd, deposit_vnd, state, is_sample)
values ('d2100000-0000-4000-8000-000000000001', 'd2000000-0000-4000-8000-000000000001',
  'discount-usage-unit', 'Discount usage unit', 100000, 50000, 'active', false);
insert into public.product_units(id, product_id, asset_tag)
select ('d2200000-0000-4000-8000-0000000000' || lpad(n::text, 2, '0'))::uuid,
  'd2100000-0000-4000-8000-000000000001', 'DSU-' || lpad(n::text, 2, '0')
from generate_series(1, 5) as n;

insert into auth.users(id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('d2300000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
    'discount-usage-customer@example.invalid', '', now(), '{}', '{}', now(), now()),
  ('d2300000-0000-4000-8000-000000000002', 'authenticated', 'authenticated',
    'discount-usage-admin@example.invalid', '', now(), '{}', '{}', now(), now());
update public.profiles set role = 'admin' where id = 'd2300000-0000-4000-8000-000000000002';

insert into public.discount_codes(id, code, description, kind, value, max_uses, used_count, active)
values ('d2400000-0000-4000-8000-000000000001', 'ONCEONLY', 'Single use', 'percent', 10, 1, 0, true);

select ok(not has_function_privilege('authenticated', 'public.discount_code_active_uses(uuid)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.discount_code_active_uses(uuid)', 'EXECUTE'),
  'the usage counter is internal to the pricing engine');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'd2300000-0000-4000-8000-000000000001', true);

create temporary table first_booking on commit drop as
select * from public.create_multi_product_booking(
  'd2500000-0000-4000-8000-000000000001',
  jsonb_build_array(jsonb_build_object('productId', 'd2100000-0000-4000-8000-000000000001', 'quantity', 1)),
  '2099-08-01', '2099-08-01', 'pickup', 'Usage Customer', '0912345678', 'Usage address 123',
  'ONCEONLY', null);
select is((select discount_vnd from first_booking), 10000::bigint,
  'the first booking uses the single-use code');

select throws_ok($$select * from public.create_multi_product_booking(
    'd2500000-0000-4000-8000-000000000002',
    jsonb_build_array(jsonb_build_object('productId', 'd2100000-0000-4000-8000-000000000001', 'quantity', 1)),
    '2099-08-01', '2099-08-01', 'pickup', 'Usage Customer', '0912345678', 'Usage address 123',
    'ONCEONLY', null)$$, 'P0001', 'Discount code has reached its usage limit',
  'a live pending hold occupies the only use');

select lives_ok($$select public.cancel_booking((select order_id from first_booking))$$,
  'the customer cancels the pending hold');

create temporary table second_booking on commit drop as
select * from public.create_multi_product_booking(
  'd2500000-0000-4000-8000-000000000003',
  jsonb_build_array(jsonb_build_object('productId', 'd2100000-0000-4000-8000-000000000001', 'quantity', 1)),
  '2099-08-01', '2099-08-01', 'pickup', 'Usage Customer', '0912345678', 'Usage address 123',
  'ONCEONLY', null);
select is((select discount_vnd from second_booking), 10000::bigint,
  'cancelling a pending order gives the use back');

-- Simulate the 30-minute hold running out without any expiry job having run yet.
set local role postgres;
update public.orders set expires_at = now() - interval '1 minute'
where id = (select order_id from second_booking);
set local role authenticated;
select set_config('request.jwt.claim.sub', 'd2300000-0000-4000-8000-000000000001', true);

create temporary table third_booking on commit drop as
select * from public.create_multi_product_booking(
  'd2500000-0000-4000-8000-000000000004',
  jsonb_build_array(jsonb_build_object('productId', 'd2100000-0000-4000-8000-000000000001', 'quantity', 1)),
  '2099-08-01', '2099-08-01', 'pickup', 'Usage Customer', '0912345678', 'Usage address 123',
  'ONCEONLY', null);
select is((select discount_vnd from third_booking), 10000::bigint,
  'an overdue pending hold no longer occupies the use');

select throws_ok($$select public.preview_booking_quote(
    jsonb_build_array(jsonb_build_object('productId', 'd2100000-0000-4000-8000-000000000001', 'quantity', 1)),
    '2099-08-01', '2099-08-01', 'pickup', 'ONCEONLY', null)$$,
  'P0001', 'Discount code has reached its usage limit',
  'the preview applies the same live usage limit');

select throws_ok($$select * from public.discount_code_usage()$$, '42501', null,
  'customers cannot read discount usage');

set local role postgres;
select is((select state from public.orders where id = (select order_id from second_booking)),
  'expired'::public.order_state, 'the overdue hold was expired by the next booking');
select is((select used_count from public.discount_codes where code = 'ONCEONLY'), 3,
  'used_count keeps the lifetime history, even above max_uses');
select is(public.discount_code_active_uses('d2400000-0000-4000-8000-000000000001'), 1,
  'only the live order counts toward the limit');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'd2300000-0000-4000-8000-000000000002', true);
select is((select active_uses from public.discount_code_usage()
    where discount_code_id = 'd2400000-0000-4000-8000-000000000001'), 1,
  'admins see live usage per code');
select lives_ok($$update public.discount_codes set max_uses = 2, updated_at = now()
    where code = 'ONCEONLY'$$,
  'admins can edit max_uses even when the lifetime counter is higher');

select * from finish();
rollback;
