-- A.I.R booking foundation. Apply with Supabase CLI after linking a project.
create extension if not exists pgcrypto;
create extension if not exists btree_gist;

create type public.app_role as enum ('customer', 'staff', 'admin');
create type public.product_state as enum ('draft', 'active', 'archived');
create type public.unit_state as enum ('available', 'maintenance', 'retired');
create type public.fulfillment_method as enum ('pickup', 'delivery');
create type public.order_state as enum (
  'pending', 'confirmed', 'delivering', 'active', 'returning',
  'completed', 'cancelled', 'expired', 'overdue'
);
create type public.reservation_state as enum ('pending', 'confirmed', 'released', 'expired', 'completed');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null default 'customer',
  full_name text,
  phone text,
  created_at timestamptz not null default now()
);

create function public.create_profile_for_auth_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.create_profile_for_auth_user();

-- The role column is intentionally excluded from every user-facing update policy.
create function public.current_app_role()
returns public.app_role language sql stable security definer set search_path = '' as $$
  select coalesce((select p.role from public.profiles p where p.id = (select auth.uid())), 'customer'::public.app_role)
$$;

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id),
  slug text not null unique,
  name text not null,
  description text not null default '',
  price_per_day_vnd bigint not null check (price_per_day_vnd > 0),
  deposit_vnd bigint not null default 0 check (deposit_vnd >= 0),
  state public.product_state not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_units (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id),
  asset_tag text not null unique,
  state public.unit_state not null default 'available',
  created_at timestamptz not null default now()
);
create index product_units_product_state_idx on public.product_units(product_id, state, id);

create table public.price_tiers (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  min_days integer not null check (min_days > 0),
  max_days integer,
  discount_percent integer not null check (discount_percent between 0 and 100),
  check (max_days is null or max_days >= min_days),
  unique (product_id, min_days),
  constraint no_overlapping_product_price_tiers exclude using gist (
    product_id with =,
    int4range(min_days, max_days + 1, '[)') with &&
  )
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  user_id uuid not null references auth.users(id),
  state public.order_state not null default 'pending',
  fulfillment public.fulfillment_method not null,
  customer_name text not null check (length(customer_name) between 2 and 120),
  customer_phone text not null check (length(customer_phone) between 9 and 16),
  delivery_address text not null check (length(delivery_address) between 5 and 500),
  subtotal_vnd bigint not null check (subtotal_vnd > 0),
  deposit_vnd bigint not null check (deposit_vnd >= 0),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 minutes'),
  idempotency_key uuid not null,
  request_hash text not null,
  unique (user_id, idempotency_key)
);
create index orders_user_created_idx on public.orders(user_id, created_at desc);

-- Historical line items retain the selected, inclusive rental period and price.
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id),
  unit_id uuid not null references public.product_units(id),
  product_id uuid not null references public.products(id),
  rental_period daterange not null,
  price_per_day_vnd bigint not null check (price_per_day_vnd > 0),
  rental_days integer not null check (rental_days > 0),
  line_total_vnd bigint not null check (line_total_vnd > 0),
  created_at timestamptz not null default now(),
  check (not isempty(rental_period) and lower_inc(rental_period) and not upper_inc(rental_period))
);

-- Current holds are separate from historical order_items. A released row remains as audit history.
-- Rental dates are inclusive. blocked_period is [start, end + 2 days), adding one cleanup day.
create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id),
  order_item_id uuid not null unique references public.order_items(id),
  unit_id uuid not null references public.product_units(id),
  blocked_period daterange not null,
  state public.reservation_state not null default 'pending',
  released_at timestamptz,
  created_at timestamptz not null default now(),
  check (not isempty(blocked_period) and lower_inc(blocked_period) and not upper_inc(blocked_period)),
  constraint no_overlapping_unit_reservations exclude using gist (
    unit_id with =,
    blocked_period with &&
  ) where (released_at is null)
);
create index reservations_order_idx on public.reservations(order_id);

create table public.order_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders(id),
  actor_id uuid references auth.users(id) on delete set null,
  from_state public.order_state,
  to_state public.order_state not null,
  created_at timestamptz not null default now()
);
create index order_events_order_created_idx on public.order_events(order_id, created_at);

create function public.record_order_state_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    insert into public.order_events(order_id, actor_id, to_state) values (new.id, new.user_id, new.state);
  elsif old.state is distinct from new.state then
    insert into public.order_events(order_id, actor_id, from_state, to_state)
      values (new.id, auth.uid(), old.state, new.state);
  end if;
  return new;
end;
$$;
create trigger orders_record_state_change
  after insert or update of state on public.orders
  for each row execute function public.record_order_state_change();

create function public.new_order_code()
returns text language sql volatile set search_path = '' as $$
  select 'AIR-' || to_char(now() at time zone 'Asia/Ho_Chi_Minh', 'YYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
$$;

-- Authenticated customers provide product/quantity/dates only. Price and units come from DB rows.
-- A pending order holds inventory for 30 minutes; retrying its idempotency key returns that order.
create function public.create_booking(
  p_idempotency_key uuid,
  p_product_id uuid,
  p_quantity integer,
  p_start date,
  p_end date,
  p_fulfillment public.fulfillment_method,
  p_customer_name text,
  p_customer_phone text,
  p_delivery_address text
)
returns table(order_id uuid, order_code text, subtotal_vnd bigint, deposit_vnd bigint, rental_days integer)
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_hash text;
  v_existing public.orders%rowtype;
  v_product public.products%rowtype;
  v_days integer;
  v_discount integer := 0;
  v_subtotal bigint;
  v_order_id uuid := gen_random_uuid();
  v_code text := public.new_order_code();
  v_unit record;
  v_item_id uuid;
  v_allocated integer := 0;
  v_expired_count integer;
begin
  if v_user is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  if p_idempotency_key is null or p_product_id is null then raise exception 'Missing idempotency key or product'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user::text || ':' || p_idempotency_key::text, 0));
  if p_quantity is null or p_quantity < 1 or p_quantity > 20 then raise exception 'Quantity must be between 1 and 20'; end if;
  if p_start is null or p_end is null or p_end < p_start then raise exception 'Invalid rental dates'; end if;
  if length(btrim(p_customer_name)) not between 2 and 120
      or btrim(p_customer_phone) !~ '^(0|\+84)(3|5|7|8|9)[0-9]{8}$'
      or length(btrim(p_delivery_address)) not between 5 and 500 then raise exception 'Invalid customer details'; end if;

  v_days := p_end - p_start + 1;
  v_hash := md5(jsonb_build_object('productId', p_product_id, 'quantity', p_quantity, 'start', p_start, 'end', p_end,
    'fulfillment', p_fulfillment, 'name', btrim(p_customer_name), 'phone', btrim(p_customer_phone), 'address', btrim(p_delivery_address))::text);
  select * into v_existing from public.orders o where o.user_id = v_user and o.idempotency_key = p_idempotency_key;
  if found then
    if v_existing.request_hash <> v_hash then raise exception 'Idempotency key was already used with different booking details'; end if;
    return query select v_existing.id, v_existing.code, v_existing.subtotal_vnd, v_existing.deposit_vnd, v_days;
    return;
  end if;

  if p_start < (now() at time zone 'Asia/Ho_Chi_Minh')::date then raise exception 'Start date must be today or later'; end if;

  select * into v_product from public.products p where p.id = p_product_id and p.state = 'active';
  if not found then raise exception 'Product is unavailable'; end if;
  select t.discount_percent into v_discount
  from public.price_tiers t
  where t.product_id = p_product_id and v_days >= t.min_days and (t.max_days is null or v_days <= t.max_days)
  order by t.min_days desc limit 1;
  v_discount := coalesce(v_discount, 0);
  v_subtotal := floor((v_product.price_per_day_vnd::numeric * v_days * (100 - v_discount)) / 100)::bigint * p_quantity;
  if v_subtotal <= 0 then raise exception 'Calculated booking total is invalid'; end if;

  insert into public.orders(id, code, user_id, fulfillment, customer_name, customer_phone, delivery_address,
      subtotal_vnd, deposit_vnd, idempotency_key, request_hash)
    values (v_order_id, v_code, v_user, p_fulfillment, btrim(p_customer_name), btrim(p_customer_phone),
      btrim(p_delivery_address), v_subtotal, v_product.deposit_vnd * p_quantity, p_idempotency_key, v_hash);

  -- Expiry is applied during allocation under the same transaction so stale pending holds do not block inventory.
  with expiring as (
    select o.id from public.orders o where o.state = 'pending' and o.expires_at <= now()
    order by o.id for update skip locked
  ), changed as (
    update public.orders o set state = 'expired' from expiring e where o.id = e.id returning o.id
  ), released as (
    update public.reservations r set state = 'expired', released_at = now()
    from changed c where r.order_id = c.id and r.released_at is null returning r.id
  )
  select count(*) into v_expired_count from changed;

  for v_unit in
    select u.id from public.product_units u
    where u.product_id = p_product_id and u.state = 'available'
      and not exists (
        select 1 from public.reservations r
        where r.unit_id = u.id and r.released_at is null
          and r.blocked_period && daterange(p_start, p_end + 2, '[)')
      )
    order by u.id
    limit p_quantity
    for update of u skip locked
  loop
    v_allocated := v_allocated + 1;
    insert into public.order_items(order_id, unit_id, product_id, rental_period, price_per_day_vnd, rental_days, line_total_vnd)
      values (v_order_id, v_unit.id, p_product_id, daterange(p_start, p_end + 1, '[)'),
        v_product.price_per_day_vnd, v_days, floor((v_product.price_per_day_vnd::numeric * v_days * (100 - v_discount)) / 100)::bigint)
      returning id into v_item_id;
    insert into public.reservations(order_id, order_item_id, unit_id, blocked_period)
      values (v_order_id, v_item_id, v_unit.id, daterange(p_start, p_end + 2, '[)'));
  end loop;
  if v_allocated <> p_quantity then raise exception 'Not enough available units for these dates' using errcode = 'P0001'; end if;
  return query select v_order_id, v_code, v_subtotal, v_product.deposit_vnd * p_quantity, v_days;
end;
$$;

create function public.cancel_booking(p_order_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid();
begin
  update public.orders set state = 'cancelled'
  where id = p_order_id and user_id = v_user and state = 'pending';
  if not found then raise exception 'Pending booking was not found'; end if;
  update public.reservations set state = 'released', released_at = now()
  where order_id = p_order_id and released_at is null;
end;
$$;

create function public.expire_pending_bookings()
returns integer language plpgsql security definer set search_path = '' as $$
declare v_count integer;
begin
  if public.current_app_role() not in ('staff', 'admin') then raise exception 'Staff access required' using errcode = '42501'; end if;
  with expiring as (
    select o.id from public.orders o where o.state = 'pending' and o.expires_at <= now()
    order by o.id for update skip locked
  ), changed as (
    update public.orders o set state = 'expired' from expiring e where o.id = e.id returning o.id
  ), released as (
    update public.reservations r set state = 'expired', released_at = now()
    from changed c where r.order_id = c.id and r.released_at is null returning r.id
  )
  select count(*) into v_count from changed;
  return v_count;
end;
$$;

create function public.transition_booking(p_order_id uuid, p_next public.order_state)
returns void language plpgsql security definer set search_path = '' as $$
declare v_current public.order_state; v_role public.app_role := public.current_app_role();
  v_expires_at timestamptz;
begin
  if v_role not in ('staff', 'admin') then raise exception 'Staff access required' using errcode = '42501'; end if;
  select state, expires_at into v_current, v_expires_at from public.orders where id = p_order_id for update;
  if not found then raise exception 'Booking was not found'; end if;
  if v_current = 'pending' and p_next = 'confirmed' and v_expires_at <= now() then
    raise exception 'Pending booking has expired';
  end if;
  if not (
    (v_current = 'pending' and p_next in ('confirmed', 'cancelled')) or
    (v_current = 'confirmed' and p_next in ('delivering', 'cancelled')) or
    (v_current = 'delivering' and p_next = 'active') or
    (v_current = 'active' and p_next in ('returning', 'overdue')) or
    (v_current = 'overdue' and p_next in ('returning', 'completed')) or
    (v_current = 'returning' and p_next = 'completed')
  ) then raise exception 'Invalid booking state transition'; end if;
  update public.orders set state = p_next where id = p_order_id;
  if p_next in ('cancelled', 'completed') then
    if p_next = 'cancelled' then
      update public.reservations set state = 'released', released_at = now()
      where order_id = p_order_id and released_at is null;
    else
      -- Keep the buffered period blocked even after an early return/inspection.
      update public.reservations set state = 'completed'
      where order_id = p_order_id and released_at is null;
    end if;
  elsif p_next = 'confirmed' then
    update public.reservations set state = 'confirmed' where order_id = p_order_id and released_at is null;
  end if;
end;
$$;

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_units enable row level security;
alter table public.price_tiers enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.reservations enable row level security;
alter table public.order_events enable row level security;

-- Supabase may grant broad defaults on public objects. Start from no client privileges,
-- then grant only operations guarded by the policies below.
revoke all on table public.profiles, public.categories, public.products, public.product_units,
  public.price_tiers, public.orders, public.order_items, public.reservations, public.order_events
  from public, anon, authenticated;
revoke all on sequence public.order_events_id_seq from public, anon, authenticated;

create policy "profiles read own or admins" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.current_app_role() = 'admin');
create policy "profiles update own contact fields only" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
-- Column grants prevent a customer from modifying the role even through the row policy.

create policy "categories public read" on public.categories for select to anon, authenticated using (true);
create policy "products public read active" on public.products for select to anon, authenticated using (state = 'active' or public.current_app_role() = 'admin');
create policy "products admins manage" on public.products for all to authenticated
  using (public.current_app_role() = 'admin') with check (public.current_app_role() = 'admin');
create policy "price tiers public read active products" on public.price_tiers for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_id and p.state = 'active'));
create policy "units admins manage" on public.product_units for all to authenticated
  using (public.current_app_role() = 'admin') with check (public.current_app_role() = 'admin');
create policy "units staff read" on public.product_units for select to authenticated
  using (public.current_app_role() in ('staff', 'admin'));
create policy "orders customer or staff read" on public.orders for select to authenticated
  using (user_id = (select auth.uid()) or public.current_app_role() in ('staff', 'admin'));
create policy "order items customer or staff read" on public.order_items for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = (select auth.uid()) or public.current_app_role() in ('staff', 'admin'))));
create policy "reservations staff read" on public.reservations for select to authenticated
  using (public.current_app_role() in ('staff', 'admin'));
create policy "order events customer or staff read" on public.order_events for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = (select auth.uid()) or public.current_app_role() in ('staff', 'admin'))));

grant select on public.profiles, public.orders, public.order_items, public.order_events,
  public.reservations, public.product_units to authenticated;
grant select on public.categories, public.products, public.price_tiers to anon, authenticated;
grant update (full_name, phone) on public.profiles to authenticated;
-- RLS policies below restrict these table-level DML grants to admins.
grant insert, update, delete on public.products, public.product_units to authenticated;
revoke all on function public.create_profile_for_auth_user() from public, anon, authenticated;
revoke all on function public.current_app_role() from public, anon, authenticated;
revoke all on function public.new_order_code() from public, anon, authenticated;
revoke all on function public.create_booking(uuid, uuid, integer, date, date, public.fulfillment_method, text, text, text) from public, anon, authenticated;
revoke all on function public.cancel_booking(uuid) from public, anon, authenticated;
revoke all on function public.expire_pending_bookings() from public, anon, authenticated;
revoke all on function public.transition_booking(uuid, public.order_state) from public, anon, authenticated;
grant execute on function public.current_app_role() to anon, authenticated;
grant execute on function public.create_booking(uuid, uuid, integer, date, date, public.fulfillment_method, text, text, text) to authenticated;
grant execute on function public.cancel_booking(uuid) to authenticated;
grant execute on function public.expire_pending_bookings() to authenticated;
grant execute on function public.transition_booking(uuid, public.order_state) to authenticated;

