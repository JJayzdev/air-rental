-- Hoàn tiền khi đơn đã nhận tiền bị huỷ/hết hạn (202611080001_cancellation_refunds).
create extension if not exists pgtap with schema extensions;
begin;
select plan(17);
set local role postgres;

insert into auth.users(id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('e2000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
    'refund-customer@example.invalid', '', now(), '{}', '{}', now(), now()),
  ('e2000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated',
    'refund-staff@example.invalid', '', now(), '{}', '{}', now(), now());
update public.profiles set role = 'staff' where id = 'e2000000-0000-4000-8000-000000000002';

-- Four pending orders: customer-cancelled, staff-cancelled after confirm, expired, and unpaid.
insert into public.orders(id, code, user_id, state, fulfillment, customer_name, customer_phone,
    delivery_address, subtotal_vnd, deposit_vnd, idempotency_key, request_hash, expires_at)
select ('e2100000-0000-4000-8000-00000000000' || n)::uuid, 'AIR-261108-0000000' || n,
  'e2000000-0000-4000-8000-000000000001', 'pending', 'pickup', 'Refund Customer', '0912345678',
  'Pickup at store', 100000, 30000, gen_random_uuid(), 'refund-' || n, now() + interval '1 day'
from generate_series(1, 4) as n;

select ok(not has_function_privilege('authenticated', 'public.order_refundable_balance(uuid)', 'EXECUTE'),
  'the refundable balance helper is internal');

-- 1. Customer pays the deposit while pending, then cancels.
select is(public.apply_sepay_payment('refund-1', 30000, 'CK AIR-261108-00000001', '{"id":1}'::jsonb)
    ->> 'paymentState', 'deposit_paid', 'a pending order accepts the deposit');
set local role authenticated;
select set_config('request.jwt.claim.sub', 'e2000000-0000-4000-8000-000000000001', true);
select lives_ok($$select public.cancel_booking('e2100000-0000-4000-8000-000000000001')$$,
  'the customer cancels a paid pending order');
set local role postgres;
select is((select amount_vnd from public.payments
    where order_id = 'e2100000-0000-4000-8000-000000000001' and kind = 'cancellation_refund'
      and status = 'pending'), 30000::bigint,
  'cancelling opens a refund for everything collected');
select is((select payment_state from public.orders where id = 'e2100000-0000-4000-8000-000000000001'),
  'refund_pending'::public.payment_state, 'the cancelled order waits for the refund');

-- 2. Staff confirms, the customer pays in full, staff cancels.
set local role authenticated;
select set_config('request.jwt.claim.sub', 'e2000000-0000-4000-8000-000000000002', true);
select lives_ok($$select public.transition_booking('e2100000-0000-4000-8000-000000000002', 'confirmed')$$,
  'staff confirms the second order');
set local role postgres;
select is(public.apply_sepay_payment('refund-2', 130000, 'AIR-261108-00000002', '{"id":2}'::jsonb)
    ->> 'paymentState', 'paid', 'the confirmed order is paid in full');
set local role authenticated;
select set_config('request.jwt.claim.sub', 'e2000000-0000-4000-8000-000000000002', true);
select lives_ok($$select public.transition_booking('e2100000-0000-4000-8000-000000000002', 'cancelled')$$,
  'staff cancels the paid confirmed order');
set local role postgres;
select is((select amount_vnd from public.payments
    where order_id = 'e2100000-0000-4000-8000-000000000002' and kind = 'cancellation_refund'),
  130000::bigint, 'staff cancellation refunds rent and deposit');

-- 3. Paid pending hold lapses and is expired by the staff job.
select public.apply_sepay_payment('refund-3', 30000, 'AIR-261108-00000003', '{"id":3}'::jsonb);
update public.orders set expires_at = now() - interval '1 minute'
where id = 'e2100000-0000-4000-8000-000000000003';
set local role authenticated;
select set_config('request.jwt.claim.sub', 'e2000000-0000-4000-8000-000000000002', true);
select ok(public.expire_pending_bookings() >= 1, 'staff expires the lapsed hold');
set local role postgres;
select is((select amount_vnd from public.payments
    where order_id = 'e2100000-0000-4000-8000-000000000003' and kind = 'cancellation_refund'),
  30000::bigint, 'an expired paid hold is refunded');

-- 4. Money arriving after cancellation is refunded instead of marking the order paid.
set local role authenticated;
select set_config('request.jwt.claim.sub', 'e2000000-0000-4000-8000-000000000001', true);
select lives_ok($$select public.cancel_booking('e2100000-0000-4000-8000-000000000004')$$,
  'the customer cancels an unpaid order');
set local role postgres;
select is((select count(*)::integer from public.payments
    where order_id = 'e2100000-0000-4000-8000-000000000004'), 0,
  'cancelling an unpaid order creates no refund');
select is(public.apply_sepay_payment('refund-4', 130000, 'AIR-261108-00000004', '{"id":4}'::jsonb)
    ->> 'paymentState', 'refund_pending', 'a late transfer to a cancelled order is owed back');
select is((select amount_vnd from public.payments
    where order_id = 'e2100000-0000-4000-8000-000000000004' and kind = 'cancellation_refund'),
  130000::bigint, 'the late transfer gets its own refund row');

-- 5. Staff settles the cancellation refund with the existing action.
set local role authenticated;
select set_config('request.jwt.claim.sub', 'e2000000-0000-4000-8000-000000000002', true);
select lives_ok($$select public.complete_deposit_refund((select id from public.payments
    where order_id = 'e2100000-0000-4000-8000-000000000001' and kind = 'cancellation_refund'))$$,
  'staff confirms a cancellation refund');
set local role postgres;
select is((select payment_state from public.orders where id = 'e2100000-0000-4000-8000-000000000001'),
  'refunded'::public.payment_state, 'the order is refunded once the refund is settled');

select * from finish();
rollback;
