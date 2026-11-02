-- GĐ5 admin dashboard, fleet maintenance, and admin catalog write tests.
create extension if not exists pgtap with schema extensions;
begin;
select plan(38);
set local role postgres;

select ok(has_table_privilege('authenticated', 'public.unit_maintenance', 'SELECT')
  and not has_table_privilege('authenticated', 'public.unit_maintenance', 'INSERT')
  and not has_table_privilege('authenticated', 'public.unit_maintenance', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.unit_maintenance', 'DELETE')
  and not has_table_privilege('anon', 'public.unit_maintenance', 'SELECT'),
  'maintenance records are readable but only writable through the guarded RPCs');
select ok(has_function_privilege('authenticated', 'public.admin_dashboard()', 'EXECUTE')
  and not has_function_privilege('anon', 'public.admin_dashboard()', 'EXECUTE'),
  'only signed-in users can ask for dashboard aggregates');
select ok(has_function_privilege('authenticated',
    'public.open_unit_maintenance(uuid,public.maintenance_reason,date,text)', 'EXECUTE')
  and has_function_privilege('authenticated',
    'public.close_unit_maintenance(uuid,date)', 'EXECUTE')
  and not has_function_privilege('anon',
    'public.open_unit_maintenance(uuid,public.maintenance_reason,date,text)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.close_unit_maintenance(uuid,date)', 'EXECUTE'),
  'maintenance RPCs are exposed to signed-in users only');

insert into public.categories(id, slug, name)
values ('87000000-0000-0000-0000-000000000001', 'admin-test', 'Admin test');
insert into public.products(id, category_id, slug, name, price_per_day_vnd, deposit_vnd, state, is_sample)
values ('87000000-0000-0000-0000-000000000002', '87000000-0000-0000-0000-000000000001',
  'admin-test-product', 'Admin test product', 50000, 30000, 'active', false);
insert into public.product_units(id, product_id, asset_tag)
values ('87000000-0000-0000-0000-000000000003', '87000000-0000-0000-0000-000000000002', 'ADM-001'),
  ('87000000-0000-0000-0000-000000000004', '87000000-0000-0000-0000-000000000002', 'ADM-002'),
  ('87000000-0000-0000-0000-000000000005', '87000000-0000-0000-0000-000000000002', 'ADM-003');
insert into auth.users(id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('88000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'admin-customer@example.invalid', '', now(), '{}', '{}', now(), now()),
  ('88000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'admin-staff@example.invalid', '', now(), '{}', '{}', now(), now()),
  ('88000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'admin-owner@example.invalid', '', now(), '{}', '{}', now(), now());
update public.profiles set role = 'staff' where id = '88000000-0000-0000-0000-000000000002';
update public.profiles set role = 'admin' where id = '88000000-0000-0000-0000-000000000003';

insert into public.orders(id, code, user_id, state, fulfillment, customer_name, customer_phone,
    delivery_address, subtotal_vnd, deposit_vnd, idempotency_key, request_hash)
values
  ('89000000-0000-0000-0000-000000000001', 'AIR-261101-ADMIN001',
    '88000000-0000-0000-0000-000000000001', 'pending', 'pickup', 'Admin Customer', '0912345678',
    'Pickup at store', 100000, 30000, gen_random_uuid(), 'admin-pending'),
  ('89000000-0000-0000-0000-000000000002', 'AIR-261101-ADMIN002',
    '88000000-0000-0000-0000-000000000001', 'delivering', 'pickup', 'Admin Customer', '0912345678',
    'Pickup at store', 100000, 30000, gen_random_uuid(), 'admin-delivering'),
  ('89000000-0000-0000-0000-000000000003', 'AIR-261101-ADMIN003',
    '88000000-0000-0000-0000-000000000001', 'overdue', 'pickup', 'Admin Customer', '0912345678',
    'Pickup at store', 100000, 30000, gen_random_uuid(), 'admin-overdue');

-- A confirmed future booking pins ADM-002 so maintenance must refuse it.
insert into public.order_items(id, order_id, unit_id, product_id, rental_period,
    price_per_day_vnd, rental_days, line_total_vnd)
values ('8a000000-0000-0000-0000-000000000001', '89000000-0000-0000-0000-000000000001',
  '87000000-0000-0000-0000-000000000004', '87000000-0000-0000-0000-000000000002',
  daterange((now() at time zone 'Asia/Ho_Chi_Minh')::date + 1,
    (now() at time zone 'Asia/Ho_Chi_Minh')::date + 4, '[)'), 50000, 3, 150000);
insert into public.reservations(order_id, order_item_id, unit_id, state, blocked_period)
values ('89000000-0000-0000-0000-000000000001', '8a000000-0000-0000-0000-000000000001',
  '87000000-0000-0000-0000-000000000004', 'confirmed',
  daterange((now() at time zone 'Asia/Ho_Chi_Minh')::date + 1,
    (now() at time zone 'Asia/Ho_Chi_Minh')::date + 6, '[)'));

insert into public.payments(order_id, provider, direction, kind, amount_vnd, status, created_at)
values
  ('89000000-0000-0000-0000-000000000002', 'sepay', 'in', 'payment', 200000, 'succeeded', now()),
  ('89000000-0000-0000-0000-000000000002', 'manual', 'out', 'deposit_refund', 30000, 'succeeded', now()),
  ('89000000-0000-0000-0000-000000000002', 'sepay', 'in', 'payment', 999000, 'succeeded',
    now() - interval '2 months'),
  ('89000000-0000-0000-0000-000000000003', 'manual', 'out', 'deposit_refund', 30000, 'pending', now());

insert into public.identity_document_requests(id, user_id, requested_by, status)
values ('8b000000-0000-0000-0000-000000000001', '88000000-0000-0000-0000-000000000001',
  '88000000-0000-0000-0000-000000000002', 'pending_review');

set local role authenticated;
select set_config('request.jwt.claim.sub', '88000000-0000-0000-0000-000000000001', true);
select throws_ok($$select public.admin_dashboard()$$, '42501', null,
  'customers cannot read operational aggregates');
select throws_ok($$select public.open_unit_maintenance('87000000-0000-0000-0000-000000000003',
    'scheduled', current_date + 2)$$, '42501', null,
  'customers cannot schedule maintenance');

select set_config('request.jwt.claim.sub', '88000000-0000-0000-0000-000000000002', true);
create temporary table admin_baseline on commit drop as select * from public.admin_dashboard();
select is((select pending_orders from public.admin_dashboard()), 1::bigint,
  'dashboard counts orders waiting for confirmation');
select is((select confirmed_orders from public.admin_dashboard()), 0::bigint,
  'dashboard counts confirmed orders');
select is((select active_rentals from public.admin_dashboard()), 1::bigint,
  'dashboard counts units currently handed over');
select is((select overdue_orders from public.admin_dashboard()), 1::bigint,
  'dashboard counts overdue rentals');
select is((select refunds_pending from public.admin_dashboard()), 1::bigint,
  'dashboard counts refunds still to pay out');
select is((select month_revenue_vnd from public.admin_dashboard()), 200000::bigint,
  'month revenue counts only successful incoming transfers of this month');
select is((select month_refunds_vnd from public.admin_dashboard()), 30000::bigint,
  'month refunds count only successful outgoing transfers of this month');
select is((select pending_identity_documents from public.admin_dashboard()), 1::bigint,
  'dashboard counts identity documents waiting for review');

select lives_ok($$select public.open_unit_maintenance('87000000-0000-0000-0000-000000000005',
    'repair', current_date + 3, 'Thay bàn phím')$$,
  'staff can schedule maintenance for a free unit');
select is((select state from public.product_units where id = '87000000-0000-0000-0000-000000000005'),
  'maintenance', 'scheduling maintenance removes the unit from the rental pool');
select is((select reason from public.unit_maintenance
    where unit_id = '87000000-0000-0000-0000-000000000005'), 'repair'::public.maintenance_reason,
  'the maintenance record keeps the reason');
select is((select notes from public.unit_maintenance
    where unit_id = '87000000-0000-0000-0000-000000000005'), 'Thay bàn phím',
  'the maintenance record keeps the operator notes');
select is((select ready_on from public.product_units where id = '87000000-0000-0000-0000-000000000005'),
  current_date + 3, 'the unit is not ready before the expected end date');
select is((select maintenance_units from public.admin_dashboard())
    - (select maintenance_units from admin_baseline), 1::bigint,
  'dashboard maintenance count grows by the scheduled unit');
select throws_ok($$select public.open_unit_maintenance('87000000-0000-0000-0000-000000000005',
    'scheduled', current_date + 4)$$, 'P0001',
  'Unit already has an open maintenance record',
  'a unit cannot have two open maintenance records');
select throws_ok($$select public.open_unit_maintenance('87000000-0000-0000-0000-000000000004',
    'scheduled', current_date + 2)$$, 'P0001',
  'Unit has a reservation inside the maintenance window',
  'maintenance refuses to collide with a live reservation');
select throws_ok($$select public.open_unit_maintenance('87000000-0000-0000-0000-000000000003',
    'scheduled', current_date - 1)$$, 'P0001',
  'Maintenance end date must be today or later',
  'maintenance cannot end in the past');

select set_config('request.jwt.claim.sub', '88000000-0000-0000-0000-000000000001', true);
select throws_ok($$select public.close_unit_maintenance(
    (select id from public.unit_maintenance where unit_id = '87000000-0000-0000-0000-000000000005'))$$,
  '42501', null, 'customers cannot close maintenance');

select set_config('request.jwt.claim.sub', '88000000-0000-0000-0000-000000000002', true);
select lives_ok($$select public.close_unit_maintenance(
    (select id from public.unit_maintenance where unit_id = '87000000-0000-0000-0000-000000000005'))$$,
  'staff can close maintenance');
select is((select state from public.product_units where id = '87000000-0000-0000-0000-000000000005'),
  'available', 'closing maintenance returns the unit to the pool');
select is((select completed_on from public.unit_maintenance
    where unit_id = '87000000-0000-0000-0000-000000000005'),
  (now() at time zone 'Asia/Ho_Chi_Minh')::date, 'the record keeps the completion date');
select is((select maintenance_units from public.admin_dashboard())
    - (select maintenance_units from admin_baseline), 0::bigint,
  'dashboard maintenance count returns to its baseline');
select throws_ok($$select public.close_unit_maintenance(
    (select id from public.unit_maintenance where unit_id = '87000000-0000-0000-0000-000000000005'))$$,
  'P0001', 'Open maintenance record was not found',
  'a closed record cannot be closed twice');
select ok((select count(*) from public.unit_maintenance) >= 1,
  'staff can read the maintenance history');

set local role postgres;
select set_config('request.jwt.claim.sub', '88000000-0000-0000-0000-000000000003', true);
set local role authenticated;
select lives_ok($$insert into public.products(category_id, slug, name, price_per_day_vnd, deposit_vnd, state)
    values ('87000000-0000-0000-0000-000000000001', 'admin-created', 'Admin created', 70000, 40000, 'active')$$,
  'admins can create catalog products');
select lives_ok($$update public.products set price_per_day_vnd = 75000 where slug = 'admin-created'$$,
  'admins can update a product price');
select is((select price_per_day_vnd from public.products where slug = 'admin-created'), 75000::bigint,
  'the updated price is visible to the admin session');
select lives_ok($$insert into public.product_units(product_id, asset_tag)
    select id, 'ADM-004' from public.products where slug = 'admin-test-product'$$,
  'admins can add physical units');

select set_config('request.jwt.claim.sub', '88000000-0000-0000-0000-000000000002', true);
select throws_ok($$insert into public.products(category_id, slug, name, price_per_day_vnd)
    values ('87000000-0000-0000-0000-000000000001', 'staff-created', 'Staff created', 70000)$$,
  '42501', null, 'staff cannot create catalog products');
select lives_ok($$update public.products set price_per_day_vnd = 1 where slug = 'admin-created'$$,
  'staff price updates do not raise but match no row');
select is((select price_per_day_vnd from public.products where slug = 'admin-created'), 75000::bigint,
  'staff cannot change prices');
select throws_ok($$insert into public.product_units(product_id, asset_tag)
    select id, 'ADM-005' from public.products where slug = 'admin-test-product'$$,
  '42501', null, 'staff cannot add physical units');

set local role anon;
select throws_ok($$select count(*) from public.unit_maintenance$$, '42501', null,
  'anonymous visitors cannot read maintenance history');

select * from finish();
rollback;
