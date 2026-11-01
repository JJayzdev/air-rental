-- GĐ4 payments: separate payment state, append-only ledger, SePay webhook replay guard,
-- and deposit refunds when staff completes an order.

create type public.payment_state as enum ('unpaid', 'deposit_paid', 'paid', 'refund_pending', 'refunded');

alter table public.orders
  add column payment_state public.payment_state not null default 'unpaid';
create index orders_payment_state_idx on public.orders(payment_state)
  where payment_state in ('unpaid', 'deposit_paid', 'refund_pending');

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  provider text not null check (provider in ('sepay', 'manual')),
  -- Null for manual refunds. Provider transaction ids are unique per provider.
  external_id text,
  direction text not null check (direction in ('in', 'out')),
  kind text not null check (kind in ('payment', 'deposit_refund')),
  amount_vnd bigint not null check (amount_vnd > 0),
  status text not null default 'succeeded' check (status in ('pending', 'succeeded', 'cancelled')),
  transfer_content text,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, external_id)
);
create index payments_order_created_idx on public.payments(order_id, created_at);
create index payments_pending_refund_idx on public.payments(order_id)
  where kind = 'deposit_refund' and status = 'pending';

-- Raw webhook envelopes are kept even when they cannot be matched to an order, so operators can
-- reconcile without trusting an external retry to arrive again.
create table public.payment_webhook_events (
  id bigint generated always as identity primary key,
  provider text not null default 'sepay' check (provider in ('sepay')),
  external_id text not null,
  payload jsonb not null,
  outcome text not null default 'ignored' check (outcome in ('applied', 'ignored', 'duplicate')),
  order_id uuid references public.orders(id),
  payment_id uuid references public.payments(id),
  received_at timestamptz not null default now(),
  unique (provider, external_id)
);

alter table public.payments enable row level security;
alter table public.payment_webhook_events enable row level security;

revoke all on table public.payments, public.payment_webhook_events from public, anon, authenticated;
revoke all on sequence public.payment_webhook_events_id_seq from public, anon, authenticated;

grant select on public.payments to authenticated;
create policy "payments owner or staff read" on public.payments for select to authenticated
  using (exists (
    select 1 from public.orders o where o.id = order_id
      and (o.user_id = (select auth.uid()) or public.current_app_role() in ('staff', 'admin'))
  ));

-- Only the trusted server (service role) writes webhook envelopes.
revoke all on table public.payment_webhook_events from service_role;
grant select, insert, update on table public.payment_webhook_events to service_role;

-- Applies a bank-transfer webhook exactly once per provider transaction id. A retry returns the
-- stored outcome instead of inserting another ledger row or moving the order again.
create function public.apply_sepay_payment(
  p_external_id text,
  p_amount_vnd bigint,
  p_content text,
  p_payload jsonb
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_event_id bigint;
  v_event public.payment_webhook_events%rowtype;
  v_order public.orders%rowtype;
  v_payment_id uuid;
  v_paid bigint;
  v_code text;
  v_next public.payment_state;
begin
  p_external_id := btrim(coalesce(p_external_id, ''));
  if p_external_id = '' or length(p_external_id) > 120 then
    raise exception 'Invalid payment reference';
  end if;
  if p_amount_vnd is null or p_amount_vnd <= 0 or p_amount_vnd > 1000000000000 then
    raise exception 'Invalid payment amount';
  end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'Invalid payment payload';
  end if;

  insert into public.payment_webhook_events(provider, external_id, payload, outcome)
    values ('sepay', p_external_id, p_payload, 'ignored')
    on conflict (provider, external_id) do nothing
    returning id into v_event_id;

  if v_event_id is null then
    select * into v_event from public.payment_webhook_events e
    where e.provider = 'sepay' and e.external_id = p_external_id;
    return jsonb_build_object(
      'status', 'duplicate',
      'outcome', v_event.outcome,
      'orderId', v_event.order_id,
      'paymentId', v_event.payment_id
    );
  end if;

  v_code := substring(upper(coalesce(p_content, '')) from 'AIR-[0-9]{6}-[A-F0-9]{8}');
  if v_code is null then
    return jsonb_build_object('status', 'ignored', 'reason', 'order-code-not-found');
  end if;

  select * into v_order from public.orders o where o.code = v_code for update;
  if not found then
    return jsonb_build_object('status', 'ignored', 'reason', 'order-not-found', 'orderCode', v_code);
  end if;

  insert into public.payments(order_id, provider, external_id, direction, kind,
      amount_vnd, transfer_content, payload)
    values (v_order.id, 'sepay', p_external_id, 'in', 'payment',
      p_amount_vnd, left(coalesce(p_content, ''), 1000), p_payload)
    returning id into v_payment_id;

  select coalesce(sum(p.amount_vnd) filter (where p.direction = 'in' and p.status = 'succeeded'), 0)
    into v_paid
  from public.payments p where p.order_id = v_order.id;

  if v_paid >= v_order.deposit_vnd + v_order.subtotal_vnd then
    v_next := 'paid';
  elsif v_paid >= v_order.deposit_vnd then
    v_next := 'deposit_paid';
  else
    v_next := 'unpaid';
  end if;
  -- Never reopen a refund that staff already started or finished.
  if v_order.payment_state in ('refund_pending', 'refunded') then
    v_next := v_order.payment_state;
  end if;
  update public.orders set payment_state = v_next where id = v_order.id;

  update public.payment_webhook_events
    set outcome = 'applied', order_id = v_order.id, payment_id = v_payment_id
  where id = v_event_id;

  return jsonb_build_object(
    'status', 'applied',
    'orderId', v_order.id,
    'orderCode', v_order.code,
    'paymentId', v_payment_id,
    'paymentState', v_next
  );
end;
$$;

revoke all on function public.apply_sepay_payment(text, bigint, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.apply_sepay_payment(text, bigint, text, jsonb) to service_role;

-- Completing an order creates a refund obligation for the deposit actually collected. The money is
-- returned outside this system; staff mark it done and the order moves to refunded.
create function public.create_deposit_refund_on_completion()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_paid bigint;
  v_refund bigint;
begin
  if new.state = 'completed' and old.state is distinct from 'completed'
      and new.payment_state in ('deposit_paid', 'paid') then
    select coalesce(sum(p.amount_vnd) filter (where p.direction = 'in' and p.status = 'succeeded'), 0)
      into v_paid
    from public.payments p where p.order_id = new.id;
    v_refund := least(new.deposit_vnd, v_paid);
    if v_refund > 0 then
      insert into public.payments(order_id, provider, direction, kind, amount_vnd, status)
        values (new.id, 'manual', 'out', 'deposit_refund', v_refund, 'pending');
      new.payment_state := 'refund_pending';
    end if;
  end if;
  return new;
end;
$$;

create trigger orders_create_deposit_refund
  before update of state on public.orders
  for each row execute function public.create_deposit_refund_on_completion();

create function public.complete_deposit_refund(p_payment_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid();
  v_payment public.payments%rowtype;
begin
  if v_actor is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  if public.current_app_role() not in ('staff', 'admin') then
    raise exception 'Staff access required' using errcode = '42501';
  end if;
  select * into v_payment from public.payments p
  where p.id = p_payment_id for update;
  if not found or v_payment.kind <> 'deposit_refund' or v_payment.direction <> 'out'
      or v_payment.status <> 'pending' then
    raise exception 'Pending deposit refund was not found';
  end if;
  update public.payments p set status = 'succeeded', updated_at = now() where p.id = v_payment.id;
  if not exists (
    select 1 from public.payments p
    where p.order_id = v_payment.order_id and p.kind = 'deposit_refund' and p.status = 'pending'
  ) then
    update public.orders o set payment_state = 'refunded' where o.id = v_payment.order_id;
  end if;
end;
$$;

revoke all on function public.complete_deposit_refund(uuid) from public, anon, authenticated;
grant execute on function public.complete_deposit_refund(uuid) to authenticated;
