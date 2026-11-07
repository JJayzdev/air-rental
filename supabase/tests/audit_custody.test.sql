-- Nhật ký expire ghi "Hệ thống" và bảo trì không mở được cho máy đang ở nhà khách
-- (202611080002_audit_actor_and_custody_guard).
create extension if not exists pgtap with schema extensions;
begin;
select plan(5);
set local role postgres;

insert into public.categories(id, slug, name)
values ('f2000000-0000-4000-8000-000000000001', 'audit-custody-test', 'Audit custody test');
insert into public.products(id, category_id, slug, name, price_per_day_vnd, deposit_vnd, state, is_sample)
values ('f2100000-0000-4000-8000-000000000001', 'f2000000-0000-4000-8000-000000000001',
  'audit-custody-unit', 'Audit custody unit', 100000, 0, 'active', false);
insert into public.product_units(id, product_id, asset_tag)
values
  ('f2200000-0000-4000-8000-000000000001', 'f2100000-0000-4000-8000-000000000001', 'AUD-001'),
  ('f2200000-0000-4000-8000-000000000002', 'f2100000-0000-4000-8000-000000000001', 'AUD-002'),
  ('f2200000-0000-4000-8000-000000000003', 'f2100000-0000-4000-8000-000000000001', 'AUD-003');

insert into auth.users(id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('f2300000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
    'audit-customer@example.invalid', '', now(), '{}', '{}', now(), now()),
  ('f2300000-0000-4000-8000-000000000002', 'authenticated', 'authenticated',
    'audit-other@example.invalid', '', now(), '{}', '{}', now(), now()),
  ('f2300000-0000-4000-8000-000000000003', 'authenticated', 'authenticated',
    'audit-staff@example.invalid', '', now(), '{}', '{}', now(), now());
update public.profiles set role = 'staff' where id = 'f2300000-0000-4000-8000-000000000003';

-- An overdue rental whose contractual (blocked) period is already over: the unit is still out.
insert into public.orders(id, code, user_id, state, fulfillment, customer_name, customer_phone,
    delivery_address, subtotal_vnd, deposit_vnd, idempotency_key, request_hash)
values ('f2400000-0000-4000-8000-000000000001', 'AIR-AUDIT-OVERDUE',
  'f2300000-0000-4000-8000-000000000001', 'overdue', 'pickup', 'Audit Customer', '0912345678',
  'Pickup at store', 300000, 0, gen_random_uuid(), 'audit-overdue');
insert into public.order_items(id, order_id, unit_id, product_id, rental_period,
    price_per_day_vnd, rental_days, line_total_vnd)
values ('f2500000-0000-4000-8000-000000000001', 'f2400000-0000-4000-8000-000000000001',
  'f2200000-0000-4000-8000-000000000001', 'f2100000-0000-4000-8000-000000000001',
  daterange(current_date - 10, current_date - 7, '[)'), 100000, 3, 300000);
insert into public.reservations(order_id, order_item_id, unit_id, state, blocked_period)
values ('f2400000-0000-4000-8000-000000000001', 'f2500000-0000-4000-8000-000000000001',
  'f2200000-0000-4000-8000-000000000001', 'confirmed',
  daterange(current_date - 10, current_date - 6, '[)'));

-- A pending hold from the first customer that has already lapsed.
insert into public.orders(id, code, user_id, state, fulfillment, customer_name, customer_phone,
    delivery_address, subtotal_vnd, deposit_vnd, idempotency_key, request_hash, expires_at)
values ('f2400000-0000-4000-8000-000000000002', 'AIR-AUDIT-LAPSED',
  'f2300000-0000-4000-8000-000000000001', 'pending', 'pickup', 'Audit Customer', '0912345678',
  'Pickup at store', 100000, 0, gen_random_uuid(), 'audit-lapsed', now() - interval '1 minute');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'f2300000-0000-4000-8000-000000000003', true);
select throws_ok($$select public.open_unit_maintenance('f2200000-0000-4000-8000-000000000001',
    'inspection', current_date + 2, 'Máy chưa trả')$$,
  'P0001', 'Unit is still with a customer',
  'maintenance cannot start while an overdue customer still has the unit');
select lives_ok($$select public.open_unit_maintenance('f2200000-0000-4000-8000-000000000002',
    'inspection', current_date + 2, 'Máy trong kho')$$,
  'maintenance still opens for a unit that is in stock');

-- Another customer's booking expires the lapsed hold inside its own transaction.
select set_config('request.jwt.claim.sub', 'f2300000-0000-4000-8000-000000000002', true);
create temporary table other_booking on commit drop as
select * from public.create_multi_product_booking(
  'f2600000-0000-4000-8000-000000000001',
  jsonb_build_array(jsonb_build_object('productId', 'f2100000-0000-4000-8000-000000000001', 'quantity', 1)),
  current_date + 30, current_date + 30, 'pickup', 'Other Customer', '0912345679', 'Pickup at store',
  '', null);
select isnt((select order_id from other_booking), null, 'the other customer books the free unit');

set local role postgres;
select is((select state from public.orders where id = 'f2400000-0000-4000-8000-000000000002'),
  'expired'::public.order_state, 'the booking swept the lapsed hold');
select ok(exists (
    select 1 from public.order_events e
    where e.order_id = 'f2400000-0000-4000-8000-000000000002'
      and e.to_state = 'expired' and e.actor_id is null)
  and not exists (
    select 1 from public.order_events e
    where e.order_id = 'f2400000-0000-4000-8000-000000000002'
      and e.actor_id = 'f2300000-0000-4000-8000-000000000002'),
  'the expiry is recorded as a system action, not attributed to the other customer');

select * from finish();
rollback;
