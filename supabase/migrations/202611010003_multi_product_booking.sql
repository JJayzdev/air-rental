-- GĐ2: authenticated, atomic multi-product booking and aggregate availability.

alter table public.product_units
  add column ready_on date not null default ((now() at time zone 'Asia/Ho_Chi_Minh')::date);
comment on column public.product_units.ready_on is
  'Earliest local rental date after actual return and cleanup; private inventory field, never public.';

create function public.booking_calendar(p_items jsonb, p_from date, p_to date, p_start date default null)
returns table(rental_date date, available boolean)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_items jsonb;
  v_day date;
  v_range_start date;
  v_available boolean;
  v_local_today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  v_line record;
  v_product record;
  v_free_units integer;
begin
  if p_items is null or jsonb_typeof(p_items) is distinct from 'array' then
    raise exception 'Booking calendar requires a JSON array of cart lines';
  end if;
  if jsonb_array_length(p_items) not between 1 and 20 then
    raise exception 'Booking calendar requires between 1 and 20 cart lines';
  end if;
  if p_from is null or p_to is null or p_to < p_from or p_to - p_from > 62
      or p_from < v_local_today then
    raise exception 'Invalid booking calendar date range';
  end if;
  if p_start is not null and (p_start < p_from or p_start > p_to) then
    raise exception 'Selected start date must be within the calendar range';
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
  if (select sum(quantity::integer) from jsonb_to_recordset(v_items) as x("productId" uuid, quantity integer)) > 20 then
    raise exception 'Cart quantity cannot exceed 20 units';
  end if;

  for v_day in select generate_series(p_from, p_to, interval '1 day')::date loop
    if p_start is not null and v_day < p_start then continue; end if;
    v_range_start := coalesce(p_start, v_day);
    v_available := true;
    for v_line in
      select "productId" as product_id, quantity
      from jsonb_to_recordset(v_items) as x("productId" uuid, quantity integer)
      order by "productId"
    loop
      select p.id, p.state, p.is_sample into v_product
      from public.products p where p.id = v_line.product_id;
      if not found or v_product.state <> 'active' or v_product.is_sample then
        v_available := false;
        exit;
      end if;
      select count(*)::integer into v_free_units
      from public.product_units u
      where u.product_id = v_line.product_id and u.state = 'available' and u.ready_on <= v_range_start
        and not exists (
          select 1 from public.reservations r
          join public.orders o on o.id = r.order_id
          join public.order_items oi on oi.id = r.order_item_id
          where r.unit_id = u.id and r.released_at is null
            and not (o.state = 'pending' and o.expires_at <= now())
            and (
              r.blocked_period && daterange(v_range_start, v_day + 2, '[)')
              or o.state in ('delivering', 'returning', 'overdue')
              or (o.state = 'active' and v_local_today >= upper(oi.rental_period))
            )
        );
      if v_free_units < v_line.quantity then v_available := false; exit; end if;
    end loop;
    rental_date := v_day;
    available := v_available;
    return next;
  end loop;
end;
$$;

comment on function public.booking_calendar(jsonb, date, date, date) is
  'Boolean-only availability calendar. With p_start, each row is an end date checked against the full range and cleanup buffer. Samples are never bookable.';

create function public.create_multi_product_booking(
  p_idempotency_key uuid,
  p_items jsonb,
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
  v_items jsonb;
  v_priced_items jsonb := '[]'::jsonb;
  v_hash text;
  v_existing public.orders%rowtype;
  v_product public.products%rowtype;
  v_line record;
  v_unit record;
  v_days integer;
  v_discount integer;
  v_line_total bigint;
  v_subtotal_numeric numeric := 0;
  v_deposit_numeric numeric := 0;
  v_subtotal bigint;
  v_deposit bigint;
  v_order_id uuid := gen_random_uuid();
  v_code text := public.new_order_code();
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

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user::text || ':' || p_idempotency_key::text, 0));
  v_hash := md5(jsonb_build_object(
    'items', v_items, 'start', p_start, 'end', p_end, 'fulfillment', p_fulfillment,
    'name', btrim(p_customer_name), 'phone', btrim(p_customer_phone), 'address', btrim(p_delivery_address)
  )::text);
  select * into v_existing from public.orders o
  where o.user_id = v_user and o.idempotency_key = p_idempotency_key;
  if found then
    if v_existing.request_hash <> v_hash then
      raise exception 'Idempotency key was already used with different booking details';
    end if;
    return query select v_existing.id, v_existing.code, v_existing.subtotal_vnd, v_existing.deposit_vnd, p_end - p_start + 1;
    return;
  end if;
  if p_start < (now() at time zone 'Asia/Ho_Chi_Minh')::date then raise exception 'Start date must be today or later'; end if;
  v_days := p_end - p_start + 1;

  -- Lock product rows in deterministic order and derive every price from catalog tables.
  for v_line in
    select "productId" as product_id, quantity from jsonb_to_recordset(v_items) as x("productId" uuid, quantity integer)
    order by "productId"
  loop
    select p.* into v_product from public.products p where p.id = v_line.product_id for share;
    if not found or v_product.state <> 'active' or v_product.is_sample then
      raise exception 'One or more products are not available for rental';
    end if;
    select coalesce((select t.discount_percent from public.price_tiers t
      where t.product_id = v_product.id and v_days >= t.min_days and (t.max_days is null or v_days <= t.max_days)
      order by t.min_days desc limit 1), 0) into v_discount;
    v_line_total := floor((v_product.price_per_day_vnd::numeric * v_days * (100 - v_discount)) / 100)::bigint;
    if v_line_total <= 0 then raise exception 'Calculated booking line total is invalid'; end if;
    v_priced_items := v_priced_items || jsonb_build_array(jsonb_build_object(
      'productId', v_product.id, 'quantity', v_line.quantity,
      'pricePerDay', v_product.price_per_day_vnd, 'discountPercent', v_discount,
      'depositPerUnit', v_product.deposit_vnd, 'lineTotalPerUnit', v_line_total
    ));
    v_subtotal_numeric := v_subtotal_numeric + v_line_total::numeric * v_line.quantity;
    v_deposit_numeric := v_deposit_numeric + v_product.deposit_vnd::numeric * v_line.quantity;
  end loop;
  if v_subtotal_numeric <= 0 or v_subtotal_numeric > 9223372036854775807
      or v_deposit_numeric < 0 or v_deposit_numeric > 9223372036854775807 then
    raise exception 'Calculated booking total is invalid';
  end if;
  v_subtotal := v_subtotal_numeric::bigint;
  v_deposit := v_deposit_numeric::bigint;
  insert into public.orders(id, code, user_id, fulfillment, customer_name, customer_phone, delivery_address,
      subtotal_vnd, deposit_vnd, idempotency_key, request_hash)
    values (v_order_id, v_code, v_user, p_fulfillment, btrim(p_customer_name), btrim(p_customer_phone),
      btrim(p_delivery_address), v_subtotal, v_deposit, p_idempotency_key, v_hash);

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
  return query select v_order_id, v_code, v_subtotal, v_deposit, v_days;
end;
$$;

create or replace function public.create_booking(
  p_idempotency_key uuid, p_product_id uuid, p_quantity integer, p_start date, p_end date,
  p_fulfillment public.fulfillment_method, p_customer_name text, p_customer_phone text, p_delivery_address text
)
returns table(order_id uuid, order_code text, subtotal_vnd bigint, deposit_vnd bigint, rental_days integer)
language plpgsql security definer set search_path = '' as $$
begin
  return query select * from public.create_multi_product_booking(
    p_idempotency_key, jsonb_build_array(jsonb_build_object('productId', p_product_id, 'quantity', p_quantity)),
    p_start, p_end, p_fulfillment, p_customer_name, p_customer_phone, p_delivery_address
  );
end;
$$;

create or replace function public.transition_booking(p_order_id uuid, p_next public.order_state)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_current public.order_state;
  v_role public.app_role := public.current_app_role();
  v_expires_at timestamptz;
  v_local_today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
begin
  if v_role not in ('staff', 'admin') then raise exception 'Staff access required' using errcode = '42501'; end if;
  select state, expires_at into v_current, v_expires_at from public.orders where id = p_order_id for update;
  if not found then raise exception 'Booking was not found'; end if;
  if v_current = 'pending' and p_next = 'confirmed' and v_expires_at <= now() then raise exception 'Pending booking has expired'; end if;
  if not (
    (v_current = 'pending' and p_next in ('confirmed', 'cancelled')) or
    (v_current = 'confirmed' and p_next in ('delivering', 'cancelled')) or
    (v_current = 'delivering' and p_next = 'active') or
    (v_current = 'active' and p_next in ('returning', 'overdue')) or
    (v_current = 'overdue' and p_next in ('returning', 'completed')) or
    (v_current = 'returning' and p_next = 'completed')
  ) then raise exception 'Invalid booking state transition'; end if;

  -- Lock every physical unit in a deterministic order before handover or completion checks.
  perform u.id from public.product_units u
  join public.order_items oi on oi.unit_id = u.id
  where oi.order_id = p_order_id
  order by u.id for update of u;

  if p_next in ('delivering', 'active') then
    if exists (
      select 1 from public.order_items oi
      join public.product_units u on u.id = oi.unit_id
      where oi.order_id = p_order_id and (
        u.state <> 'available' or u.ready_on > v_local_today
        or lower(oi.rental_period) > v_local_today or upper(oi.rental_period) <= v_local_today
      )
    ) then raise exception 'One or more units are not ready for handover'; end if;
    if exists (
      select 1 from public.order_items current_item
      join public.reservations current_reservation on current_reservation.order_item_id = current_item.id
      join public.reservations other_reservation on other_reservation.unit_id = current_item.unit_id
      join public.orders other_order on other_order.id = other_reservation.order_id
      where current_item.order_id = p_order_id and current_reservation.released_at is null
        and other_order.id <> p_order_id and other_reservation.released_at is null
        and other_order.state in ('delivering', 'active', 'returning', 'overdue')
    ) then raise exception 'One or more units are still assigned to another rental'; end if;
  end if;

  update public.orders set state = p_next where id = p_order_id;
  if p_next = 'cancelled' then
    update public.reservations set state = 'released', released_at = now() where order_id = p_order_id and released_at is null;
  elsif p_next = 'confirmed' then
    update public.reservations set state = 'confirmed' where order_id = p_order_id and released_at is null;
  elsif p_next = 'overdue' then
    -- The reservation retains its contractual range. Availability gates physical custody
    -- independently so this transition cannot collide with a pre-existing future reservation.
    null;
  elsif p_next = 'completed' then
    update public.product_units u set ready_on = greatest(u.ready_on, v_local_today + 2)
    from public.order_items oi where oi.order_id = p_order_id and oi.unit_id = u.id;
    update public.reservations set state = 'completed'
    where order_id = p_order_id and released_at is null;
  end if;
end;
$$;

revoke all on function public.booking_calendar(jsonb, date, date, date) from public, anon, authenticated;
revoke all on function public.create_multi_product_booking(uuid, jsonb, date, date, public.fulfillment_method, text, text, text) from public, anon, authenticated;
revoke all on function public.create_booking(uuid, uuid, integer, date, date, public.fulfillment_method, text, text, text) from public, anon, authenticated;
revoke all on function public.transition_booking(uuid, public.order_state) from public, anon, authenticated;
grant execute on function public.booking_calendar(jsonb, date, date, date) to anon, authenticated;
grant execute on function public.create_multi_product_booking(uuid, jsonb, date, date, public.fulfillment_method, text, text, text) to authenticated;
grant execute on function public.create_booking(uuid, uuid, integer, date, date, public.fulfillment_method, text, text, text) to authenticated;
grant execute on function public.transition_booking(uuid, public.order_state) to authenticated;
