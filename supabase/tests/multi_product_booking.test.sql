-- GĐ2 integration tests. Uses only this file's fixture UUIDs and the seeded SAMPLE sentinel.
create extension if not exists pgtap with schema extensions;
begin;
select plan(49);

select is((
  select bool_and(not available) from public.booking_calendar(
    jsonb_build_array(jsonb_build_object('productId', (select id from public.products where slug = 'sony-a6400'), 'quantity', 1)),
    '2099-07-01', '2099-07-03', null
  )
), true, 'sample products always report unavailable in the public calendar');

insert into public.categories(id, slug, name) values ('50000000-0000-0000-0000-000000000001', 'gd2-test', 'GĐ2 test');
insert into public.products(id, category_id, slug, name, price_per_day_vnd, deposit_vnd, state)
values
  ('51000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'gd2-a', 'GĐ2 A', 10000, 50000, 'active'),
  ('51000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000001', 'gd2-b', 'GĐ2 B', 20000, 30000, 'active'),
  ('51000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000001', 'gd2-empty', 'GĐ2 empty', 15000, 25000, 'active'),
  ('51000000-0000-0000-0000-000000000004', '50000000-0000-0000-0000-000000000001', 'gd2-calendar', 'GĐ2 calendar', 12000, 35000, 'active');
insert into public.product_units(id, product_id, asset_tag)
values
  ('52000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000001', 'GD2-A-01'),
  ('52000000-0000-0000-0000-000000000002', '51000000-0000-0000-0000-000000000001', 'GD2-A-02'),
  ('52000000-0000-0000-0000-000000000003', '51000000-0000-0000-0000-000000000002', 'GD2-B-01'),
  ('52000000-0000-0000-0000-000000000004', '51000000-0000-0000-0000-000000000004', 'GD2-CAL-01'),
  ('52000000-0000-0000-0000-000000000005', '51000000-0000-0000-0000-000000000004', 'GD2-CAL-02');
insert into auth.users(id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('53000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'gd2-customer1@example.invalid', '', now(), '{}', '{}', now(), now()),
  ('53000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'gd2-customer2@example.invalid', '', now(), '{}', '{}', now(), now()),
  ('53000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'gd2-staff@example.invalid', '', now(), '{}', '{}', now(), now());

set local role anon;
select throws_ok($$select * from public.booking_calendar('null'::jsonb, '2099-07-01', '2099-07-01', null)$$,
  'P0001', 'Booking calendar requires a JSON array of cart lines', 'calendar rejects JSON null cart input');
select throws_ok($$select * from public.booking_calendar(null, '2099-07-01', '2099-07-01', null)$$,
  'P0001', 'Booking calendar requires a JSON array of cart lines', 'calendar rejects SQL null cart input');
set local role postgres;
set local role authenticated;
select set_config('request.jwt.claim.sub', '53000000-0000-0000-0000-000000000001', true);
create temporary table primary_booking on commit drop as
select * from public.create_multi_product_booking(
  '54000000-0000-0000-0000-000000000001',
  jsonb_build_array(
    jsonb_build_object('productId', '51000000-0000-0000-0000-000000000001', 'quantity', 1),
    jsonb_build_object('productId', '51000000-0000-0000-0000-000000000002', 'quantity', 1),
    jsonb_build_object('productId', '51000000-0000-0000-0000-000000000001', 'quantity', 1)
  ),
  '2099-07-01', '2099-07-01', 'pickup', 'Customer One', '0912345678', 'Test address 123'
);
select is((select rental_days from primary_booking), 1, 'multi-product same-day booking bills one inclusive day');
select is((select subtotal_vnd from primary_booking), 40000::bigint, 'subtotal uses database prices for every item');
select is((select deposit_vnd from primary_booking), 130000::bigint, 'deposit uses database values for every item');
select is((select count(*)::integer from public.order_items where order_id = (select order_id from primary_booking)), 3,
  'quantities allocate one historical item per physical unit');
select is((select count(distinct product_id)::integer from public.order_items where order_id = (select order_id from primary_booking)), 2,
  'duplicate product ids are aggregated while retaining both products');
select is((select bool_and(product_name_snapshot = 'GĐ2 A') from public.order_items
  where order_id = (select order_id from primary_booking) and product_id = '51000000-0000-0000-0000-000000000001'),
  true, 'new booking lines snapshot the catalog product name');
select is((select order_id from public.create_multi_product_booking(
  '54000000-0000-0000-0000-000000000001',
  jsonb_build_array(
    jsonb_build_object('productId', '51000000-0000-0000-0000-000000000001', 'quantity', 2),
    jsonb_build_object('productId', '51000000-0000-0000-0000-000000000002', 'quantity', 1)
  ), '2099-07-01', '2099-07-01', 'pickup', 'Customer One', '0912345678', 'Test address 123'
)), (select order_id from primary_booking), 'retry returns the original multi-product order');
select is((select order_id from public.create_multi_product_booking(
  '54000000-0000-0000-0000-000000000001',
  jsonb_build_array(
    jsonb_build_object('productId', '51000000-0000-0000-0000-000000000002', 'quantity', 1),
    jsonb_build_object('productId', '51000000-0000-0000-0000-000000000001', 'quantity', 1),
    jsonb_build_object('productId', '51000000-0000-0000-0000-000000000001', 'quantity', 1)
  ), '2099-07-01', '2099-07-01', 'pickup', 'Customer One', '0912345678', 'Test address 123'
)), (select order_id from primary_booking), 'line order and duplicate representation do not change the idempotency fingerprint');
select throws_ok($$select * from public.create_multi_product_booking(
  '54000000-0000-0000-0000-000000000001',
  jsonb_build_array(jsonb_build_object('productId', '51000000-0000-0000-0000-000000000001', 'quantity', 1)),
  '2099-07-01', '2099-07-01', 'pickup', 'Customer One', '0912345678', 'Test address 123'
)$$, 'P0001', 'Idempotency key was already used with different booking details', 'same key with a changed cart is rejected');
select throws_ok($$select * from public.create_multi_product_booking(
  '54000000-0000-0000-0000-000000000002',
  jsonb_build_array(jsonb_build_object('productId', (select id from public.products where slug='sony-a6400'), 'quantity', 1)),
  '2099-07-01', '2099-07-01', 'pickup', 'Customer One', '0912345678', 'Test address 123'
)$$, 'P0001', 'One or more products are not available for rental', 'sample products are rejected at the booking boundary');
select throws_ok($$select * from public.create_booking(
  '54000000-0000-0000-0000-000000000003', (select id from public.products where slug='sony-a6400'), 1,
  '2099-07-01', '2099-07-01', 'pickup', 'Customer One', '0912345678', 'Test address 123'
)$$, 'P0001', 'One or more products are not available for rental', 'legacy single-product RPC cannot bypass sample gating');
select is((select bool_and(not available) from public.booking_calendar(
  jsonb_build_array(
    jsonb_build_object('productId', '51000000-0000-0000-0000-000000000001', 'quantity', 2),
    jsonb_build_object('productId', '51000000-0000-0000-0000-000000000002', 'quantity', 1)
  ), '2099-07-01', '2099-07-03', '2099-07-01'
)), true, 'calendar checks every product for the entire selected rental and cleanup interval');
select throws_ok($$select * from public.create_multi_product_booking(
  '54000000-0000-0000-0000-000000000004',
  jsonb_build_array(
    jsonb_build_object('productId', '51000000-0000-0000-0000-000000000001', 'quantity', 1),
    jsonb_build_object('productId', '51000000-0000-0000-0000-000000000003', 'quantity', 1)
  ), '2099-09-12', '2099-09-12', 'pickup', 'Customer One', '0912345678', 'Test address 123'
)$$, 'P0001', 'Not enough available units for all products and dates', 'an unavailable line fails the complete transaction');
select is((select count(*)::integer from public.orders where user_id = auth.uid()
  and idempotency_key = '54000000-0000-0000-0000-000000000004'), 0,
  'failed multi-product allocation leaves no partial order or history');

create temporary table calendar_first on commit drop as
select * from public.create_multi_product_booking(
  '54000000-0000-0000-0000-000000000005',
  jsonb_build_array(jsonb_build_object('productId', '51000000-0000-0000-0000-000000000004', 'quantity', 1)),
  '2099-08-01', '2099-08-01', 'pickup', 'Customer One', '0912345678', 'Test address 123'
);
set local role postgres;
insert into public.unit_maintenance (unit_id, reason, started_on, expected_end_on, created_by)
values ('52000000-0000-0000-0000-000000000004', 'repair', current_date, current_date,
  '53000000-0000-0000-0000-000000000003');
update public.product_units set state = 'maintenance' where id = '52000000-0000-0000-0000-000000000004';
set local role authenticated;
select set_config('request.jwt.claim.sub', '53000000-0000-0000-0000-000000000002', true);
create temporary table calendar_second on commit drop as
select * from public.create_multi_product_booking(
  '54000000-0000-0000-0000-000000000006',
  jsonb_build_array(jsonb_build_object('productId', '51000000-0000-0000-0000-000000000004', 'quantity', 1)),
  '2099-08-04', '2099-08-04', 'pickup', 'Customer Two', '0912345679', 'Other test address'
);
set local role postgres;
update public.unit_maintenance set completed_on = current_date
where unit_id = '52000000-0000-0000-0000-000000000004' and completed_on is null;
update public.product_units set state = 'available' where id = '52000000-0000-0000-0000-000000000004';
set local role anon;
select is((select bool_and(available) from public.booking_calendar(
  jsonb_build_array(jsonb_build_object('productId', '51000000-0000-0000-0000-000000000004', 'quantity', 1)),
  '2099-08-01', '2099-08-04', null
)), true, 'each one-day candidate has some free unit even when availability alternates by date');
select is((select available from public.booking_calendar(
  jsonb_build_array(jsonb_build_object('productId', '51000000-0000-0000-0000-000000000004', 'quantity', 1)),
  '2099-08-01', '2099-08-04', '2099-08-01'
) where rental_date = '2099-08-04'), false, 'continuous rental rejects alternating units that are never free for the whole range');

set local role authenticated;
select set_config('request.jwt.claim.sub', '53000000-0000-0000-0000-000000000002', true);
create temporary table second_booking on commit drop as
select * from public.create_multi_product_booking(
  '54000000-0000-0000-0000-000000000007',
  jsonb_build_array(
    jsonb_build_object('productId', '51000000-0000-0000-0000-000000000001', 'quantity', 1),
    jsonb_build_object('productId', '51000000-0000-0000-0000-000000000002', 'quantity', 1)
  ), '2099-07-15', '2099-07-15', 'delivery', 'Customer Two', '0912345679', 'Other test address',
  '', '20000000-0000-4000-8000-000000000001'
);
set local role authenticated;
select set_config('request.jwt.claim.sub', '53000000-0000-0000-0000-000000000001', true);
create temporary table future_same_unit on commit drop as
select * from public.create_multi_product_booking(
  '54000000-0000-0000-0000-000000000008',
  jsonb_build_array(jsonb_build_object('productId', '51000000-0000-0000-0000-000000000001', 'quantity', 1)),
  '2099-07-20', '2099-07-20', 'pickup', 'Customer One', '0912345678', 'Test address 123'
);
set local role postgres;
select is((select oi.unit_id from public.order_items oi where oi.order_id = (select order_id from future_same_unit)),
  (select oi.unit_id from public.order_items oi where oi.order_id = (select order_id from second_booking) and oi.product_id = '51000000-0000-0000-0000-000000000001'),
  'future booking fixture retains the same physical unit for late-custody checks');
set local role authenticated;
select is((select count(*)::integer from public.orders where user_id = auth.uid()), 3,
  'customer sees only their own multi-product and calendar orders');
select is((select count(*)::integer from public.orders where id = (select order_id from second_booking)), 0,
  'customer cannot read another customer order details');
select is((select count(*)::integer from public.product_units), 0, 'customer cannot enumerate physical units');
select is((select count(*)::integer from public.reservations), 0, 'customer cannot enumerate reservations');
select lives_ok($$select public.cancel_booking((select order_id from primary_booking))$$,
  'customer can cancel their own pending multi-product booking');
select is((select state::text from public.orders where id = (select order_id from primary_booking)), 'cancelled',
  'customer cancellation changes only the order state');
select is((select count(*)::integer from public.order_items where order_id = (select order_id from primary_booking)), 3,
  'cancelled order item history remains intact');
create temporary table future_not_due on commit drop as
select * from public.create_booking(
  '54000000-0000-0000-0000-000000000010', '51000000-0000-0000-0000-000000000002', 1,
  '2099-07-22', '2099-07-22', 'pickup', 'Customer One', '0912345678', 'Test address 123'
);

set local role postgres;
update public.order_items set rental_period = daterange((now() at time zone 'Asia/Ho_Chi_Minh')::date,
  (now() at time zone 'Asia/Ho_Chi_Minh')::date + 1, '[)') where order_id = (select order_id from second_booking);
update public.reservations set blocked_period = daterange((now() at time zone 'Asia/Ho_Chi_Minh')::date,
  (now() at time zone 'Asia/Ho_Chi_Minh')::date + 2, '[)') where order_id = (select order_id from second_booking);
update public.orders set expires_at = now() + interval '1 day' where id = (select order_id from second_booking);
update public.profiles set role = 'staff' where id = '53000000-0000-0000-0000-000000000003';
set local role authenticated;
select set_config('request.jwt.claim.sub', '53000000-0000-0000-0000-000000000003', true);
select is((select bool_and(released_at is not null) from public.reservations where order_id = (select order_id from primary_booking)),
  true, 'staff can inspect released reservation history');
select lives_ok($$select public.transition_booking((select order_id from second_booking), 'confirmed')$$, 'staff can confirm booking');
select lives_ok($$select public.transition_booking((select order_id from future_not_due), 'confirmed')$$,
  'staff can confirm a future rental before its handover date');
select throws_ok($$select public.transition_booking((select order_id from future_not_due), 'delivering')$$,
  'P0001', 'One or more units are not ready for handover', 'staff cannot hand over a confirmed booking before its contractual start');
set local role postgres;
insert into public.unit_maintenance (unit_id, reason, started_on, expected_end_on, created_by)
select oi.unit_id, 'repair', current_date, current_date, '53000000-0000-0000-0000-000000000003'
from public.order_items oi
where oi.order_id = (select order_id from second_booking)
  and oi.product_id = '51000000-0000-0000-0000-000000000001';
update public.product_units set state = 'maintenance' where id = (
  select oi.unit_id from public.order_items oi where oi.order_id = (select order_id from second_booking)
    and oi.product_id = '51000000-0000-0000-0000-000000000001'
);
set local role authenticated;
select throws_ok($$select public.transition_booking((select order_id from second_booking), 'delivering')$$,
  'P0001', 'One or more units are not ready for handover', 'maintenance unit cannot be handed over');
set local role postgres;
update public.unit_maintenance set completed_on = current_date
where unit_id = (
  select oi.unit_id from public.order_items oi where oi.order_id = (select order_id from second_booking)
    and oi.product_id = '51000000-0000-0000-0000-000000000001'
) and completed_on is null;
update public.product_units set state = 'available' where id = (
  select oi.unit_id from public.order_items oi where oi.order_id = (select order_id from second_booking)
    and oi.product_id = '51000000-0000-0000-0000-000000000001'
);
set local role authenticated;
select lives_ok($$select public.transition_booking((select order_id from second_booking), 'delivering')$$,
  'staff can mark a due, ready booking as delivering');
select lives_ok($$select public.transition_booking((select order_id from second_booking), 'active')$$,
  'staff can mark physical handover active');
set local role postgres;
update public.order_items set rental_period = daterange((now() at time zone 'Asia/Ho_Chi_Minh')::date - 3,
  (now() at time zone 'Asia/Ho_Chi_Minh')::date - 2, '[)') where order_id = (select order_id from second_booking);
update public.reservations set blocked_period = daterange((now() at time zone 'Asia/Ho_Chi_Minh')::date - 3,
  (now() at time zone 'Asia/Ho_Chi_Minh')::date - 1, '[)') where order_id = (select order_id from second_booking);
update public.order_items set rental_period = daterange((now() at time zone 'Asia/Ho_Chi_Minh')::date,
  (now() at time zone 'Asia/Ho_Chi_Minh')::date + 1, '[)') where order_id = (select order_id from future_same_unit);
update public.reservations set blocked_period = daterange((now() at time zone 'Asia/Ho_Chi_Minh')::date,
  (now() at time zone 'Asia/Ho_Chi_Minh')::date + 2, '[)') where order_id = (select order_id from future_same_unit);
set local role authenticated;
select lives_ok($$select public.transition_booking((select order_id from future_same_unit), 'confirmed')$$,
  'staff may confirm a later contract before delivery');
select throws_ok($$select public.transition_booking((select order_id from future_same_unit), 'delivering')$$,
  'P0001', 'One or more units are still assigned to another rental', 'late active custody blocks a confirmed future order handover');
select is((select bool_and(not available) from public.booking_calendar(
  jsonb_build_array(jsonb_build_object('productId', '51000000-0000-0000-0000-000000000001', 'quantity', 2)),
  '2099-07-20', '2099-07-20', null
)), true, 'active custody past the scheduled return blocks availability before staff marks overdue');
select throws_ok($$select * from public.create_booking(
  '54000000-0000-0000-0000-000000000009', '51000000-0000-0000-0000-000000000001', 2,
  '2099-07-20', '2099-07-20', 'pickup', 'Customer One', '0912345678', 'Test address 123'
)$$, 'P0001', 'Not enough available units for all products and dates', 'allocation also blocks active late custody');
select lives_ok($$select public.transition_booking((select order_id from second_booking), 'overdue')$$,
  'overdue transition succeeds without expanding into a future reservation');
select is((select count(*)::integer from public.reservations where order_id = (select order_id from future_same_unit)
  and released_at is null), 1, 'existing future reservation remains present after overdue transition');
select is((select bool_and(not available) from public.booking_calendar(
  jsonb_build_array(jsonb_build_object('productId', '51000000-0000-0000-0000-000000000001', 'quantity', 2)),
  '2099-07-20', '2099-07-20', null
)), true, 'explicit overdue custody blocks units beyond the contractual date');
select throws_ok($$select public.transition_booking((select order_id from future_same_unit), 'delivering')$$,
  'P0001', 'One or more units are still assigned to another rental', 'staff cannot hand a unit to the next order while overdue');
select lives_ok($$select public.transition_booking((select order_id from second_booking), 'returning')$$,
  'staff can mark actual return for inspection');
select lives_ok($$select public.transition_booking((select order_id from second_booking), 'completed')$$,
  'inspection completion ends custody without deleting reservation history');
select is((select u.ready_on from public.product_units u join public.order_items oi on oi.unit_id = u.id
  where oi.order_id = (select order_id from second_booking) and oi.product_id = '51000000-0000-0000-0000-000000000001'),
  (now() at time zone 'Asia/Ho_Chi_Minh')::date + 2, 'late completion applies the cleanup period to the actual return date');
select throws_ok($$select public.transition_booking((select order_id from future_same_unit), 'delivering')$$,
  'P0001', 'One or more units are not ready for handover', 'handover is blocked until post-return cleanup ends');
select is((select state::text from public.orders where id = (select order_id from future_same_unit)), 'confirmed',
  'rejected handover does not advance the future booking');

set local role postgres;
update public.products set name = 'Archived GĐ2 A', state = 'draft'
where id = '51000000-0000-0000-0000-000000000001';
select is((select bool_and(product_name_snapshot = 'GĐ2 A') from public.order_items
  where order_id = (select order_id from primary_booking) and product_id = '51000000-0000-0000-0000-000000000001'),
  true, 'catalog rename and archive do not change historical order line names');
insert into public.order_items(id, order_id, unit_id, product_id, rental_period, price_per_day_vnd,
    rental_days, line_total_vnd, product_name_snapshot)
select '55000000-0000-0000-0000-000000000001', oi.order_id, oi.unit_id, oi.product_id,
    oi.rental_period, oi.price_per_day_vnd, oi.rental_days, oi.line_total_vnd, 'Caller supplied name'
from public.order_items oi
where oi.order_id = (select order_id from primary_booking)
  and oi.product_id = '51000000-0000-0000-0000-000000000001'
order by oi.id limit 1;
select is((select product_name_snapshot from public.order_items
  where id = '55000000-0000-0000-0000-000000000001'), 'Archived GĐ2 A',
  'insert trigger replaces caller-supplied snapshot with the current catalog name');

select * from finish();
rollback;
