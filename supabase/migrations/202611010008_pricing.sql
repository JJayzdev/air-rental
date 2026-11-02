-- GĐ5 phase B: discount codes, delivery zones, and order totals that combine both.
-- Rental subtotal stays the catalog price after long-rental tiers. A discount reduces that
-- subtotal, then the delivery fee is added. The deposit never changes because it is refundable.

create type public.discount_kind as enum ('percent', 'fixed');

create table public.discount_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  description text not null default '',
  kind public.discount_kind not null,
  value integer not null,
  min_subtotal_vnd bigint not null default 0,
  max_uses integer,
  used_count integer not null default 0,
  starts_on date,
  ends_on date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (code = upper(code)),
  check (code ~ '^[A-Z0-9][A-Z0-9_-]{2,31}$'),
  check (length(description) <= 200),
  check (value > 0),
  check (
    (kind = 'percent' and value <= 100)
    or (kind = 'fixed' and value <= 100000000)
  ),
  check (min_subtotal_vnd >= 0),
  check (max_uses is null or max_uses > 0),
  check (used_count >= 0),
  check (max_uses is null or used_count <= max_uses),
  check (ends_on is null or starts_on is null or ends_on >= starts_on)
);

create table public.delivery_zones (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  fee_vnd bigint not null default 0,
  free_from_vnd bigint,
  notes text not null default '',
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (length(btrim(name)) between 2 and 80),
  check (fee_vnd >= 0),
  check (free_from_vnd is null or free_from_vnd >= 0),
  check (length(notes) <= 200)
);

alter table public.orders
  add column discount_code_id uuid references public.discount_codes(id) on delete set null,
  add column discount_code text not null default '',
  add column discount_vnd bigint not null default 0,
  add column delivery_zone_id uuid references public.delivery_zones(id) on delete set null,
  add column delivery_zone_name text not null default '',
  add column delivery_fee_vnd bigint not null default 0,
  -- Rental total after discount plus delivery fee. The refundable deposit is tracked separately.
  add column total_vnd bigint generated always as
    (subtotal_vnd - discount_vnd + delivery_fee_vnd) stored;

alter table public.orders
  add constraint orders_discount_within_subtotal check (discount_vnd <= subtotal_vnd),
  add constraint orders_delivery_fee_nonnegative check (delivery_fee_vnd >= 0),
  add constraint orders_discount_code_snapshot check (
    (discount_code_id is null and discount_code = '')
    or (discount_code_id is not null and discount_code <> '')
  );
create index orders_discount_code_idx on public.orders(discount_code_id)
  where discount_code_id is not null;
create index orders_delivery_zone_idx on public.orders(delivery_zone_id)
  where delivery_zone_id is not null;

alter table public.discount_codes enable row level security;
alter table public.delivery_zones enable row level security;

revoke all on table public.discount_codes, public.delivery_zones from public, anon, authenticated;
grant select, insert, update on table public.discount_codes to authenticated;
grant select on table public.delivery_zones to anon;
grant select, insert, update on table public.delivery_zones to authenticated;

create policy "discount codes admin manage" on public.discount_codes
  for all to authenticated
  using (public.current_app_role() = 'admin')
  with check (public.current_app_role() = 'admin');

-- Zones are public pricing information. Only active zones are visible to shoppers; staff and
-- admins can still read deactivated rows from the admin screens.
create policy "delivery zones public read" on public.delivery_zones
  for select to anon, authenticated
  using (active or public.current_app_role() in ('staff', 'admin'));
create policy "delivery zones admin manage" on public.delivery_zones
  for all to authenticated
  using (public.current_app_role() = 'admin')
  with check (public.current_app_role() = 'admin');

-- Shared pricing engine used by the booking RPC and by the checkout preview. It locks the
-- discount row so used_count can never be oversold between two concurrent bookings.
create function public.quote_booking(
  p_items jsonb,
  p_start date,
  p_end date,
  p_fulfillment public.fulfillment_method,
  p_discount_code text,
  p_delivery_zone_id uuid
)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_days integer;
  v_line record;
  v_product record;
  v_tier_discount integer;
  v_line_total bigint;
  v_priced_items jsonb := '[]'::jsonb;
  v_subtotal numeric := 0;
  v_deposit numeric := 0;
  v_subtotal_vnd bigint;
  v_deposit_vnd bigint;
  v_code text := upper(btrim(coalesce(p_discount_code, '')));
  v_discount public.discount_codes%rowtype;
  v_discount_id uuid;
  v_resolved_code text := '';
  v_discount_vnd bigint := 0;
  v_zone public.delivery_zones%rowtype;
  v_zone_id uuid;
  v_zone_name text := '';
  v_fee bigint := 0;
  v_today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
begin
  if p_start is null or p_end is null or p_end < p_start or p_end - p_start + 1 > 90 then
    raise exception 'Invalid rental dates';
  end if;
  if p_fulfillment is null then raise exception 'Invalid fulfillment method'; end if;
  if p_items is null or jsonb_typeof(p_items) is distinct from 'array'
      or jsonb_array_length(p_items) not between 1 and 20 then
    raise exception 'Booking requires between 1 and 20 cart lines';
  end if;
  v_days := p_end - p_start + 1;

  -- Lock product rows in deterministic order and derive every price from catalog tables.
  for v_line in
    select "productId" as product_id, quantity
    from jsonb_to_recordset(p_items) as x("productId" uuid, quantity integer)
    order by "productId"
  loop
    if v_line.product_id is null or v_line.quantity not between 1 and 20 then
      raise exception 'Each cart line must contain only productId and quantity';
    end if;
    select p.* into v_product from public.products p where p.id = v_line.product_id for share;
    if not found or v_product.state <> 'active' or v_product.is_sample then
      raise exception 'One or more products are not available for rental';
    end if;
    select coalesce((select t.discount_percent from public.price_tiers t
      where t.product_id = v_product.id
        and v_days >= t.min_days
        and (t.max_days is null or v_days <= t.max_days)
      order by t.min_days desc limit 1), 0) into v_tier_discount;
    v_line_total := floor((v_product.price_per_day_vnd::numeric * v_days * (100 - v_tier_discount)) / 100)::bigint;
    if v_line_total <= 0 then raise exception 'Calculated booking line total is invalid'; end if;
    v_priced_items := v_priced_items || jsonb_build_array(jsonb_build_object(
      'productId', v_product.id, 'quantity', v_line.quantity,
      'pricePerDay', v_product.price_per_day_vnd, 'discountPercent', v_tier_discount,
      'depositPerUnit', v_product.deposit_vnd, 'lineTotalPerUnit', v_line_total
    ));
    v_subtotal := v_subtotal + v_line_total::numeric * v_line.quantity;
    v_deposit := v_deposit + v_product.deposit_vnd::numeric * v_line.quantity;
  end loop;
  if v_subtotal <= 0 or v_subtotal > 9223372036854775807
      or v_deposit < 0 or v_deposit > 9223372036854775807 then
    raise exception 'Calculated booking total is invalid';
  end if;
  v_subtotal_vnd := v_subtotal::bigint;
  v_deposit_vnd := v_deposit::bigint;

  if v_code <> '' then
    select d.* into v_discount from public.discount_codes d where d.code = v_code for update;
    if not found then raise exception 'Discount code was not found'; end if;
    v_discount_id := v_discount.id;
    v_resolved_code := v_discount.code;
    if not v_discount.active then raise exception 'Discount code is not active'; end if;
    if (v_discount.starts_on is not null and v_today < v_discount.starts_on)
        or (v_discount.ends_on is not null and v_today > v_discount.ends_on) then
      raise exception 'Discount code is outside its valid dates';
    end if;
    if v_discount.max_uses is not null and v_discount.used_count >= v_discount.max_uses then
      raise exception 'Discount code has reached its usage limit';
    end if;
    if v_subtotal_vnd < v_discount.min_subtotal_vnd then
      raise exception 'Order subtotal has not reached the discount minimum';
    end if;
    if v_discount.kind = 'percent' then
      v_discount_vnd := floor(v_subtotal_vnd::numeric * v_discount.value / 100)::bigint;
    else
      v_discount_vnd := least(v_discount.value::bigint, v_subtotal_vnd);
    end if;
    if v_discount_vnd > v_subtotal_vnd then v_discount_vnd := v_subtotal_vnd; end if;
  end if;

  if p_fulfillment = 'pickup' then
    if p_delivery_zone_id is not null then
      raise exception 'Pickup orders cannot have a delivery zone';
    end if;
  else
    if p_delivery_zone_id is null then
      raise exception 'Delivery requires a delivery zone';
    end if;
    select z.* into v_zone from public.delivery_zones z
      where z.id = p_delivery_zone_id and z.active;
    if not found then raise exception 'Delivery zone was not found or inactive'; end if;
    v_zone_id := v_zone.id;
    v_zone_name := v_zone.name;
    -- The free-delivery threshold uses the rental amount after discount.
    if v_zone.free_from_vnd is not null
        and v_subtotal_vnd - v_discount_vnd >= v_zone.free_from_vnd then
      v_fee := 0;
    else
      v_fee := v_zone.fee_vnd;
    end if;
  end if;

  return jsonb_build_object(
    'pricedItems', v_priced_items,
    'subtotalVnd', v_subtotal_vnd,
    'depositVnd', v_deposit_vnd,
    'discountVnd', v_discount_vnd,
    'discountCodeId', v_discount_id,
    'discountCode', v_resolved_code,
    'deliveryZoneId', v_zone_id,
    'deliveryZoneName', v_zone_name,
    'deliveryFeeVnd', v_fee,
    'totalVnd', v_subtotal_vnd - v_discount_vnd + v_fee,
    'rentalDays', v_days
  );
end;
$$;

revoke all on function public.quote_booking(jsonb, date, date, public.fulfillment_method, text, uuid)
  from public, anon, authenticated;

-- Checkout preview. Returns the server-computed subtotal and discount so the UI never has to
-- trust prices supplied by the browser.
create function public.preview_booking_discount(
  p_items jsonb,
  p_start date,
  p_end date,
  p_discount_code text
)
returns table(subtotal_vnd bigint, discount_vnd bigint, description text)
language plpgsql security definer set search_path = '' as $$
declare
  v_items jsonb;
  v_quote jsonb;
  v_code text := upper(btrim(coalesce(p_discount_code, '')));
  v_description text := '';
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  if p_items is null or jsonb_typeof(p_items) is distinct from 'array' then
    raise exception 'Booking requires a JSON array of cart lines';
  end if;
  if jsonb_array_length(p_items) not between 1 and 20 then
    raise exception 'Booking requires between 1 and 20 cart lines';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_items) as item(value)
    where jsonb_typeof(value) <> 'object'
      or not (value ? 'productId') or not (value ? 'quantity')
      or (select count(*) from jsonb_object_keys(value)) <> 2
      or coalesce((value->>'quantity')::integer, 0) not between 1 and 20
  ) then raise exception 'Each cart line must contain only productId and quantity'; end if;

  select jsonb_agg(jsonb_build_object('productId', product_id, 'quantity', quantity) order by product_id)
  into v_items
  from (
    select (value->>'productId')::uuid as product_id, sum((value->>'quantity')::integer)::integer as quantity
    from jsonb_array_elements(p_items) as item(value)
    group by (value->>'productId')::uuid
  ) as canonical;

  v_quote := public.quote_booking(v_items, p_start, p_end, 'pickup', v_code, null);
  if v_code <> '' then
    select d.description into v_description from public.discount_codes d where d.code = v_code;
  end if;
  return query select (v_quote->>'subtotalVnd')::bigint,
    (v_quote->>'discountVnd')::bigint, coalesce(v_description, '');
end;
$$;

revoke all on function public.preview_booking_discount(jsonb, date, date, text)
  from public, anon, authenticated;
grant execute on function public.preview_booking_discount(jsonb, date, date, text) to authenticated;

-- Replaced because the return type grows with the discount and delivery columns.
drop function if exists public.create_booking(uuid, uuid, integer, date, date, public.fulfillment_method, text, text, text);
drop function if exists public.create_multi_product_booking(uuid, jsonb, date, date, public.fulfillment_method, text, text, text);

create function public.create_multi_product_booking(
  p_idempotency_key uuid,
  p_items jsonb,
  p_start date,
  p_end date,
  p_fulfillment public.fulfillment_method,
  p_customer_name text,
  p_customer_phone text,
  p_delivery_address text,
  p_discount_code text default '',
  p_delivery_zone_id uuid default null
)
returns table(
  order_id uuid,
  order_code text,
  subtotal_vnd bigint,
  discount_vnd bigint,
  delivery_fee_vnd bigint,
  deposit_vnd bigint,
  total_vnd bigint,
  rental_days integer
)
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_order_id uuid := gen_random_uuid();
  v_code text;
  v_subtotal numeric := 0;
  v_deposit numeric := 0;
  v_subtotal_vnd bigint;
  v_deposit_vnd bigint;
  v_discount_vnd bigint;
  v_delivery_fee_vnd bigint;
  v_total_vnd bigint;
  v_days integer;
  v_hash text;
  v_items jsonb;
  v_quote jsonb;
  v_priced_items jsonb;
  v_discount_code text;
  v_discount_code_id uuid;
  v_delivery_zone_id uuid;
  v_delivery_zone_name text;
  v_existing public.orders%rowtype;
  v_line record;
  v_unit record;
  v_item_id uuid;
  v_allocated integer;
begin
  if v_user is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  if p_idempotency_key is null then raise exception 'Missing idempotency key'; end if;
  if p_items is null or jsonb_typeof(p_items) is distinct from 'array' then
    raise exception 'Booking requires a JSON array of cart lines';
  end if;
  if jsonb_array_length(p_items) not between 1 and 20 then
    raise exception 'Booking requires between 1 and 20 cart lines';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_items) as item(value)
    where jsonb_typeof(value) <> 'object'
      or not (value ? 'productId') or not (value ? 'quantity')
      or (select count(*) from jsonb_object_keys(value)) <> 2
      or coalesce((value->>'quantity')::integer, 0) not between 1 and 20
  ) then raise exception 'Each cart line must contain only productId and quantity'; end if;

  select jsonb_agg(jsonb_build_object('productId', product_id, 'quantity', quantity) order by product_id)
  into v_items
  from (
    select (value->>'productId')::uuid as product_id, sum((value->>'quantity')::integer)::integer as quantity
    from jsonb_array_elements(p_items) as item(value)
    group by (value->>'productId')::uuid
  ) as canonical;
  if (select count(*) from jsonb_to_recordset(v_items) as x("productId" uuid, quantity integer)) > 20
      or (select sum(quantity::integer) from jsonb_to_recordset(v_items) as x("productId" uuid, quantity integer)) > 20
      or exists (select 1 from jsonb_to_recordset(v_items) as x("productId" uuid, quantity integer) where quantity not between 1 and 20) then
    raise exception 'Cart quantity cannot exceed 20 units';
  end if;
  if p_start is null or p_end is null or p_end < p_start or p_end - p_start + 1 > 90 then
    raise exception 'Invalid rental dates';
  end if;
  if p_fulfillment is null then raise exception 'Invalid fulfillment method'; end if;
  if length(btrim(p_customer_name)) not between 2 and 120
      or btrim(p_customer_phone) !~ '^(0|\+84)(3|5|7|8|9)[0-9]{8}$'
      or length(btrim(p_delivery_address)) not between 5 and 500 then
    raise exception 'Invalid customer details';
  end if;

  v_discount_code := upper(btrim(coalesce(p_discount_code, '')));
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user::text || ':' || p_idempotency_key::text, 0));
  v_hash := md5(jsonb_build_object(
    'items', v_items, 'start', p_start, 'end', p_end, 'fulfillment', p_fulfillment,
    'name', btrim(p_customer_name), 'phone', btrim(p_customer_phone), 'address', btrim(p_delivery_address),
    'discount', v_discount_code, 'zone', p_delivery_zone_id
  )::text);
  select * into v_existing from public.orders o
  where o.user_id = v_user and o.idempotency_key = p_idempotency_key;
  if found then
    if v_existing.request_hash <> v_hash then
      raise exception 'Idempotency key was already used with different booking details';
    end if;
    return query select v_existing.id, v_existing.code, v_existing.subtotal_vnd, v_existing.discount_vnd,
      v_existing.delivery_fee_vnd, v_existing.deposit_vnd, v_existing.total_vnd, p_end - p_start + 1;
    return;
  end if;
  if p_start < (now() at time zone 'Asia/Ho_Chi_Minh')::date then raise exception 'Start date must be today or later'; end if;
  v_days := p_end - p_start + 1;

  v_quote := public.quote_booking(v_items, p_start, p_end, p_fulfillment, v_discount_code, p_delivery_zone_id);
  v_priced_items := v_quote->'pricedItems';
  v_subtotal_vnd := (v_quote->>'subtotalVnd')::bigint;
  v_deposit_vnd := (v_quote->>'depositVnd')::bigint;
  v_discount_vnd := (v_quote->>'discountVnd')::bigint;
  v_delivery_fee_vnd := (v_quote->>'deliveryFeeVnd')::bigint;
  v_total_vnd := (v_quote->>'totalVnd')::bigint;
  v_discount_code_id := nullif(v_quote->>'discountCodeId', '')::uuid;
  v_discount_code := coalesce(v_quote->>'discountCode', '');
  v_delivery_zone_id := nullif(v_quote->>'deliveryZoneId', '')::uuid;
  v_delivery_zone_name := coalesce(v_quote->>'deliveryZoneName', '');

  insert into public.orders(id, code, user_id, fulfillment, customer_name, customer_phone, delivery_address,
      subtotal_vnd, discount_code_id, discount_code, discount_vnd,
      delivery_zone_id, delivery_zone_name, delivery_fee_vnd,
      deposit_vnd, idempotency_key, request_hash)
    values (v_order_id, 'AIR-' || to_char(now() at time zone 'Asia/Ho_Chi_Minh', 'YYMMDD') || '-' || upper(substr(md5(v_order_id::text), 1, 8)),
      v_user, p_fulfillment, btrim(p_customer_name), btrim(p_customer_phone),
      btrim(p_delivery_address), v_subtotal_vnd, v_discount_code_id, v_discount_code, v_discount_vnd,
      v_delivery_zone_id, v_delivery_zone_name, v_delivery_fee_vnd,
      v_deposit_vnd, p_idempotency_key, v_hash);
  select o.code into v_code from public.orders o where o.id = v_order_id;

  if v_discount_code_id is not null then
    update public.discount_codes d
      set used_count = d.used_count + 1, updated_at = now()
    where d.id = v_discount_code_id;
  end if;

  -- All lifecycle operations lock order rows before their reservations. Expiry is applied in this transaction.
  with expiring as (
    select o.id from public.orders o where o.state = 'pending' and o.expires_at <= now()
    order by o.id for update skip locked
  ), changed as (
    update public.orders o set state = 'expired' from expiring e where o.id = e.id returning o.id
  ), released as (
    update public.reservations r set state = 'expired', released_at = now()
    from changed c where r.order_id = c.id and r.released_at is null returning r.id
  ) select count(*) into v_allocated from changed;

  for v_line in
    select "productId" as product_id, quantity, "pricePerDay" as price_per_day,
      "lineTotalPerUnit" as line_total_per_unit
    from jsonb_to_recordset(v_priced_items) as x(
      "productId" uuid, quantity integer, "pricePerDay" bigint, "discountPercent" integer,
      "depositPerUnit" bigint, "lineTotalPerUnit" bigint)
    order by "productId"
  loop
    v_allocated := 0;
    for v_unit in
      select u.id from public.product_units u
      where u.product_id = v_line.product_id and u.state = 'available'
        and u.ready_on <= p_start
        and not exists (select 1 from public.reservations r where r.unit_id = u.id and r.released_at is null
          and r.blocked_period && daterange(p_start, p_end + 2, '[)'))
        and not exists (
          select 1 from public.reservations r
          join public.orders o on o.id = r.order_id
          join public.order_items oi on oi.id = r.order_item_id
          where r.unit_id = u.id and r.released_at is null
            and (o.state in ('delivering', 'returning', 'overdue')
              or (o.state = 'active' and (now() at time zone 'Asia/Ho_Chi_Minh')::date >= upper(oi.rental_period)))
        )
      order by u.id limit v_line.quantity for update of u skip locked
    loop
      v_allocated := v_allocated + 1;
      insert into public.order_items(order_id, unit_id, product_id, rental_period,
          price_per_day_vnd, rental_days, line_total_vnd)
        values (v_order_id, v_unit.id, v_line.product_id, daterange(p_start, p_end + 1, '[)'),
          v_line.price_per_day, v_days, v_line.line_total_per_unit)
        returning id into v_item_id;
      insert into public.reservations(order_id, order_item_id, unit_id, blocked_period)
        values (v_order_id, v_item_id, v_unit.id, daterange(p_start, p_end + 2, '[)'));
    end loop;
    if v_allocated <> v_line.quantity then
      raise exception 'Not enough available units for all products and dates' using errcode = 'P0001';
    end if;
  end loop;
  return query select v_order_id, v_code, v_subtotal_vnd, v_discount_vnd, v_delivery_fee_vnd,
    v_deposit_vnd, v_total_vnd, v_days;
end;
$$;

create function public.create_booking(
  p_idempotency_key uuid, p_product_id uuid, p_quantity integer, p_start date, p_end date,
  p_fulfillment public.fulfillment_method, p_customer_name text, p_customer_phone text,
  p_delivery_address text, p_discount_code text default '', p_delivery_zone_id uuid default null
)
returns table(
  order_id uuid,
  order_code text,
  subtotal_vnd bigint,
  discount_vnd bigint,
  delivery_fee_vnd bigint,
  deposit_vnd bigint,
  total_vnd bigint,
  rental_days integer
)
language plpgsql security definer set search_path = '' as $$
begin
  return query select * from public.create_multi_product_booking(
    p_idempotency_key, jsonb_build_array(jsonb_build_object('productId', p_product_id, 'quantity', p_quantity)),
    p_start, p_end, p_fulfillment, p_customer_name, p_customer_phone, p_delivery_address,
    p_discount_code, p_delivery_zone_id
  );
end;
$$;

revoke all on function public.create_multi_product_booking(uuid, jsonb, date, date, public.fulfillment_method, text, text, text, text, uuid)
  from public, anon, authenticated;
revoke all on function public.create_booking(uuid, uuid, integer, date, date, public.fulfillment_method, text, text, text, text, uuid)
  from public, anon, authenticated;
grant execute on function public.create_multi_product_booking(uuid, jsonb, date, date, public.fulfillment_method, text, text, text, text, uuid)
  to authenticated;
grant execute on function public.create_booking(uuid, uuid, integer, date, date, public.fulfillment_method, text, text, text, text, uuid)
  to authenticated;

-- The "paid" threshold now uses the order total after discount and delivery fee.
create or replace function public.apply_sepay_payment(
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

  if v_paid >= v_order.deposit_vnd + v_order.total_vnd then
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
