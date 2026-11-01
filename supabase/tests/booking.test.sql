-- Run against Supabase local: supabase start && supabase test db
create extension if not exists pgtap with schema extensions;
begin;
select plan(34);

select ok(has_table_privilege('anon', 'public.categories', 'SELECT')
  and has_table_privilege('anon', 'public.products', 'SELECT')
  and has_table_privilege('anon', 'public.price_tiers', 'SELECT'),
  'anonymous role has only the intended catalog read entry points');
select ok(has_table_privilege('authenticated', 'public.profiles', 'SELECT')
  and has_table_privilege('authenticated', 'public.orders', 'SELECT')
  and has_table_privilege('authenticated', 'public.order_items', 'SELECT')
  and has_table_privilege('authenticated', 'public.order_events', 'SELECT')
  and has_table_privilege('authenticated', 'public.reservations', 'SELECT')
  and has_table_privilege('authenticated', 'public.product_units', 'SELECT'),
  'authenticated role has read privileges required by row policies');
select ok(has_table_privilege('authenticated', 'public.products', 'INSERT')
  and has_table_privilege('authenticated', 'public.products', 'UPDATE')
  and has_table_privilege('authenticated', 'public.products', 'DELETE')
  and has_table_privilege('authenticated', 'public.product_units', 'INSERT')
  and has_table_privilege('authenticated', 'public.product_units', 'UPDATE')
  and has_table_privilege('authenticated', 'public.product_units', 'DELETE'),
  'admin-managed catalog DML is granted and remains gated by RLS');
select ok(has_column_privilege('authenticated', 'public.profiles', 'full_name', 'UPDATE')
  and has_column_privilege('authenticated', 'public.profiles', 'phone', 'UPDATE')
  and not has_column_privilege('authenticated', 'public.profiles', 'role', 'UPDATE'),
  'profile contact columns are writable but role is not');
select ok(not exists (
  select 1 from unnest(array[
    'public.profiles', 'public.categories', 'public.products', 'public.product_units',
    'public.price_tiers', 'public.orders', 'public.order_items', 'public.reservations', 'public.order_events'
  ]) as tables(table_name)
  where has_table_privilege('anon', table_name, 'TRUNCATE')
    or has_table_privilege('anon', table_name, 'TRIGGER')
    or has_table_privilege('anon', table_name, 'REFERENCES')
    or has_table_privilege('authenticated', table_name, 'TRUNCATE')
    or has_table_privilege('authenticated', table_name, 'TRIGGER')
    or has_table_privilege('authenticated', table_name, 'REFERENCES')
), 'table grants exclude truncate, trigger, and references privileges on all new tables');
select ok(not has_sequence_privilege('authenticated', 'public.order_events_id_seq', 'USAGE')
  and not has_sequence_privilege('authenticated', 'public.order_events_id_seq', 'SELECT')
  and not has_sequence_privilege('authenticated', 'public.order_events_id_seq', 'UPDATE'),
  'authenticated role has no direct access to the audit identity sequence');

insert into public.categories(slug, name) values ('test-equipment', 'Test equipment');
insert into public.products(id, category_id, slug, name, price_per_day_vnd, deposit_vnd, state)
select '10000000-0000-0000-0000-000000000001', id, 'test-camera', 'Test camera', 10000, 50000, 'active'
from public.categories where slug = 'test-equipment';
insert into public.product_units(id, product_id, asset_tag)
values ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'TEST-CAM-01');
insert into auth.users(id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values ('30000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'booking-test@example.invalid', '', now(), '{}', '{}', now(), now());

select set_config('request.jwt.claim.sub', '30000000-0000-0000-0000-000000000001', true);
set local role authenticated;
create temporary table first_booking on commit drop as
select * from public.create_booking(
  '40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 1,
  '2099-05-10', '2099-05-10', 'pickup', 'Test Customer', '0912345678', 'Test address 123'
);
select is((select rental_days from first_booking), 1, 'same-day rental charges one calendar day');
select is((select subtotal_vnd from first_booking), 10000::bigint, 'price comes from the database catalog');
select is((select deposit_vnd from first_booking), 50000::bigint, 'deposit comes from database catalog');
select is((select count(*)::integer from public.order_items), 1, 'one order item is assigned to one physical unit');
select is((select count(*)::integer from public.reservations), 0, 'customer cannot see active reservation rows');
select is((select count(*)::integer from public.product_units), 0, 'customer cannot see physical unit inventory');
select throws_ok($$select public.transition_booking((select order_id from first_booking), 'confirmed')$$,
  '42501', 'Staff access required', 'customer cannot call staff transition RPC');

select is((select order_code from public.create_booking(
  '40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 1,
  '2099-05-10', '2099-05-10', 'pickup', 'Test Customer', '0912345678', 'Test address 123'
)), (select order_code from first_booking), 'same idempotency key returns the original order');
select throws_ok($$select * from public.create_booking(
  '40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 2,
  '2099-05-10', '2099-05-10', 'pickup', 'Test Customer', '0912345678', 'Test address 123'
)$$, 'P0001', 'Idempotency key was already used with different booking details', 'same key with changed payload is rejected');
select throws_ok($$select * from public.create_booking(
  '40000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 1,
  '2099-05-11', '2099-05-11', 'pickup', 'Test Customer', '0912345678', 'Test address 123'
)$$, 'P0001', 'Not enough available units for all products and dates', 'cleanup buffer prevents next-day rebooking');

select lives_ok($$select public.cancel_booking((select order_id from first_booking))$$, 'customer can cancel own pending order');
select is((select state::text from public.orders where id = (select order_id from first_booking)), 'cancelled', 'cancellation changes the customer order state');
create temporary table third_booking on commit drop as
select * from public.create_booking(
  '40000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 1,
  '2099-05-10', '2099-05-10', 'pickup', 'Test Customer', '0912345678', 'Test address 123'
);
select is((select count(*)::integer from third_booking), 1, 'released unit can be allocated again');

set local role postgres;
insert into auth.users(id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values ('30000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'staff-test@example.invalid', '', now(), '{}', '{}', now(), now());
set local role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-0000-0000-000000000002', true);
create temporary table second_booking on commit drop as
select * from public.create_booking(
  '40000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', 1,
  '2099-05-12', '2099-05-12', 'pickup', 'Second Customer', '0912345679', 'Another test address'
);
select set_config('request.jwt.claim.sub', '30000000-0000-0000-0000-000000000001', true);
select is((select count(*)::integer from public.orders where user_id = '30000000-0000-0000-0000-000000000001'),
  2, 'customer row policy shows only their own orders');
select is((select count(*)::integer from public.orders where id = (select order_id from second_booking)),
  0, 'customer cannot read another customer order details');
select throws_ok($$update public.profiles set role = 'admin' where id = '30000000-0000-0000-0000-000000000001'$$,
  '42501', null, 'customer cannot grant themselves a privileged role');

set local role postgres;
update public.profiles set role = 'staff' where id = '30000000-0000-0000-0000-000000000002';
set local role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-0000-0000-000000000002', true);
select is((select count(*)::integer from public.orders where user_id in (
  '30000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002'
)), 3, 'staff row policy can see customer orders');
select is((select count(*)::integer from public.product_units where product_id = '10000000-0000-0000-0000-000000000001'),
  1, 'staff can read fixture physical unit inventory');
select is((select released_at is not null from public.reservations where order_id = (select order_id from first_booking)),
  true, 'cancelled reservation is released while its history remains visible to staff');
select lives_ok($$select public.transition_booking((select order_id from second_booking), 'confirmed')$$,
  'staff can advance an order through the state RPC');
select is((select state::text from public.orders where id = (select order_id from second_booking)),
  'confirmed', 'staff transition updates order state');
select is((select count(*)::integer from public.order_events where order_id = (select order_id from second_booking) and to_state = 'confirmed'),
  1, 'state changes are retained in the order event history');
set local role postgres;
update public.orders set expires_at = now() - interval '1 minute' where id = (select order_id from third_booking);
set local role authenticated;
select throws_ok($$select public.transition_booking((select order_id from third_booking), 'confirmed')$$,
  'P0001', 'Pending booking has expired', 'expired pending booking cannot be confirmed');
select is(public.expire_pending_bookings(), 1, 'staff expiry job expires stale pending bookings');
select is((select state::text from public.orders where id = (select order_id from third_booking)),
  'expired', 'expired order state is retained');
select is((select released_at is not null from public.reservations where order_id = (select order_id from third_booking)),
  true, 'expiry releases current reservation');
select lives_ok($$select * from public.create_booking(
  '40000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001', 1,
  '2099-05-10', '2099-05-10', 'pickup', 'Test Customer', '0912345678', 'Test address 123'
)$$, 'expired unit can be allocated again');
set local role postgres;
update public.profiles set role = 'admin' where id = '30000000-0000-0000-0000-000000000002';
set local role authenticated;
select is((select count(*)::integer from public.orders where user_id in (
  '30000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002'
)), 4, 'admin can read customer orders');

select * from finish();
rollback;
