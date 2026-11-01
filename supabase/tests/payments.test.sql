-- GĐ4 payment ledger, webhook replay, RLS, and deposit-refund tests.
create extension if not exists pgtap with schema extensions;
begin;
select plan(31);
set local role postgres;

select ok(has_table_privilege('authenticated', 'public.payments', 'SELECT')
  and not has_table_privilege('authenticated', 'public.payments', 'INSERT')
  and not has_table_privilege('authenticated', 'public.payments', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.payments', 'DELETE')
  and not has_table_privilege('anon', 'public.payments', 'SELECT'),
  'payment rows are readable but never client-writable');

select ok(not has_table_privilege('authenticated', 'public.payment_webhook_events', 'SELECT')
  and not has_table_privilege('anon', 'public.payment_webhook_events', 'SELECT')
  and has_table_privilege('service_role', 'public.payment_webhook_events', 'INSERT')
  and has_table_privilege('service_role', 'public.payment_webhook_events', 'UPDATE'),
  'raw webhook envelopes stay server-only');

select ok(has_function_privilege('service_role',
    'public.apply_sepay_payment(text,bigint,text,jsonb)', 'EXECUTE')
  and not has_function_privilege('authenticated',
    'public.apply_sepay_payment(text,bigint,text,jsonb)', 'EXECUTE')
  and not has_function_privilege('anon',
    'public.apply_sepay_payment(text,bigint,text,jsonb)', 'EXECUTE'),
  'only the trusted server can apply bank-transfer webhooks');

select ok(has_function_privilege('authenticated',
    'public.complete_deposit_refund(uuid)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.complete_deposit_refund(uuid)', 'EXECUTE'),
  'refund completion is exposed to signed-in staff checks only');

insert into public.categories(id, slug, name)
values ('84000000-0000-0000-0000-000000000001', 'payments-test', 'Payments test');
insert into public.products(id, category_id, slug, name, price_per_day_vnd, deposit_vnd, state, is_sample)
values ('84000000-0000-0000-0000-000000000002', '84000000-0000-0000-0000-000000000001',
  'payments-test-product', 'Payments test product', 50000, 30000, 'active', false);
insert into public.product_units(id, product_id, asset_tag)
values ('84000000-0000-0000-0000-000000000003', '84000000-0000-0000-0000-000000000002', 'PAY-001');
insert into auth.users(id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('85000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'pay-one@example.invalid', '', now(), '{}', '{}', now(), now()),
  ('85000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'pay-two@example.invalid', '', now(), '{}', '{}', now(), now()),
  ('85000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'pay-staff@example.invalid', '', now(), '{}', '{}', now(), now());
update public.profiles set role = 'staff' where id = '85000000-0000-0000-0000-000000000003';

insert into public.orders(id, code, user_id, state, fulfillment, customer_name, customer_phone,
    delivery_address, subtotal_vnd, deposit_vnd, idempotency_key, request_hash)
values ('86000000-0000-0000-0000-000000000001', 'AIR-261101-ABCDEF12',
  '85000000-0000-0000-0000-000000000001', 'pending', 'pickup', 'Pay One', '0912345678',
  'Pickup at store', 100000, 30000, gen_random_uuid(), 'test-hash');

select is(public.apply_sepay_payment('sepay-1001', 30000,
    'CK AIR-261101-ABCDEF12 coc thiet bi', '{"id":1001}'::jsonb) ->> 'status',
  'applied', 'first bank transfer is applied');
select is((select payment_state from public.orders where id = '86000000-0000-0000-0000-000000000001'),
  'deposit_paid', 'paying the deposit moves the order to deposit_paid');
select is((select count(*)::integer from public.payments), 1,
  'the first transfer creates exactly one ledger row');

select is(public.apply_sepay_payment('sepay-1001', 30000,
    'CK AIR-261101-ABCDEF12 coc thiet bi', '{"id":1001}'::jsonb) ->> 'status',
  'duplicate', 'a webhook replay is reported as duplicate');
select is((select count(*)::integer from public.payments), 1,
  'a webhook replay never creates a second payment');
select is(public.apply_sepay_payment('sepay-1001', 30000,
    'CK AIR-261101-ABCDEF12 coc thiet bi', '{"id":1001}'::jsonb) ->> 'paymentId',
  (select id::text from public.payments limit 1),
  'a replay returns the original payment id');

select is(public.apply_sepay_payment('sepay-1002', 100000,
    'Thanh toan AIR-261101-ABCDEF12', '{"id":1002}'::jsonb) ->> 'status',
  'applied', 'the rental balance is recorded');
select is((select payment_state from public.orders where id = '86000000-0000-0000-0000-000000000001'),
  'paid', 'deposit plus rental marks the order paid');
select is((select count(*)::integer from public.payments), 2,
  'two distinct transfers produce two ledger rows');

select is(public.apply_sepay_payment('sepay-1003', 50000,
    'Khach chuyen nham khong co ma don', '{"id":1003}'::jsonb) ->> 'status',
  'ignored', 'a transfer without a valid order code is ignored');
select is((select outcome from public.payment_webhook_events where external_id = 'sepay-1003'),
  'ignored', 'ignored webhooks are kept for manual reconciliation');
select is((select count(*)::integer from public.payments), 2,
  'an ignored webhook never creates a payment');

select throws_ok($$select public.apply_sepay_payment('sepay-1004', 0, 'AIR-261101-ABCDEF12', '{}'::jsonb)$$,
  'P0001', 'Invalid payment amount', 'zero-value transfers are rejected');
select throws_ok($$select public.apply_sepay_payment('sepay-1005', 1000, 'AIR-261101-ABCDEF12', '[]'::jsonb)$$,
  'P0001', 'Invalid payment payload', 'non-object webhook payloads are rejected');

select set_config('request.jwt.claim.sub', '85000000-0000-0000-0000-000000000001', true);
set local role authenticated;
select is((select count(*)::integer from public.payments), 2,
  'the owner can read every payment row of their order');
select set_config('request.jwt.claim.sub', '85000000-0000-0000-0000-000000000002', true);
select is((select count(*)::integer from public.payments), 0,
  'another customer cannot read the order payments');
select set_config('request.jwt.claim.sub', '85000000-0000-0000-0000-000000000003', true);
select ok((select count(*) from public.payments) = 2,
  'staff can read payments for operations');
select throws_ok($$insert into public.payments(order_id, provider, direction, kind, amount_vnd)
  values ('86000000-0000-0000-0000-000000000001', 'manual', 'in', 'payment', 1000)$$,
  '42501', null, 'clients cannot forge a payment row');

set local role postgres;
update public.orders set state = 'returning' where id = '86000000-0000-0000-0000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub', '85000000-0000-0000-0000-000000000003', true);
select lives_ok($$select public.transition_booking('86000000-0000-0000-0000-000000000001', 'completed')$$,
  'staff can complete a returning order');

set local role postgres;
select is((select payment_state from public.orders where id = '86000000-0000-0000-0000-000000000001'),
  'refund_pending', 'completion opens a deposit refund instead of silently keeping the money');
select is((select amount_vnd from public.payments where kind = 'deposit_refund' and status = 'pending'),
  30000::bigint, 'the refund equals the deposit actually collected');
select is((select count(*)::integer from public.payments where kind = 'deposit_refund'), 1,
  'completion creates exactly one refund obligation');

set local role authenticated;
select set_config('request.jwt.claim.sub', '85000000-0000-0000-0000-000000000001', true);
select throws_ok($$select public.complete_deposit_refund((select id from public.payments where kind = 'deposit_refund'))$$,
  '42501', null, 'the customer cannot mark their own refund as paid out');
select set_config('request.jwt.claim.sub', '85000000-0000-0000-0000-000000000003', true);
select lives_ok($$select public.complete_deposit_refund((select id from public.payments where kind = 'deposit_refund'))$$,
  'staff can mark the refund as paid out');

set local role postgres;
select is((select payment_state from public.orders where id = '86000000-0000-0000-0000-000000000001'),
  'refunded', 'the order reaches refunded after the payout');
select is((select status from public.payments where kind = 'deposit_refund'), 'succeeded',
  'the refund ledger row records the payout');
select throws_ok($$select public.complete_deposit_refund((select id from public.payments where kind = 'deposit_refund'))$$,
  'P0001', 'Pending deposit refund was not found', 'a refund cannot be paid out twice');

select * from finish();
rollback;
