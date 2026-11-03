-- Academic demo correctness: public-safe full quote previews and guarded unit retirement.

create function public.preview_booking_quote(
  p_items jsonb,
  p_start date,
  p_end date,
  p_fulfillment public.fulfillment_method,
  p_discount_code text default '',
  p_delivery_zone_id uuid default null
)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_items jsonb;
  v_quote jsonb;
  v_code text := upper(btrim(coalesce(p_discount_code, '')));
  v_description text := '';
begin
  if v_code <> '' and auth.uid() is null then
    raise exception 'Authentication required to preview discount codes' using errcode = '28000';
  end if;
  if p_items is null or jsonb_typeof(p_items) is distinct from 'array'
      or jsonb_array_length(p_items) not between 1 and 20 then
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
    select (value->>'productId')::uuid as product_id,
      sum((value->>'quantity')::integer)::integer as quantity
    from jsonb_array_elements(p_items) as item(value)
    group by (value->>'productId')::uuid
  ) as canonical;
  if (select coalesce(sum((value->>'quantity')::integer), 0)
      from jsonb_array_elements(v_items) as item(value)) > 20 then
    raise exception 'Cart quantity cannot exceed 20 units';
  end if;

  -- This is the same locked pricing engine used by create_multi_product_booking. A preview does
  -- not increment used_count or allocate inventory; booking creation revalidates under its locks.
  v_quote := public.quote_booking(
    v_items, p_start, p_end, p_fulfillment, v_code, p_delivery_zone_id
  );
  if v_code <> '' then
    select d.description into v_description from public.discount_codes d where d.code = v_code;
  end if;
  return v_quote || jsonb_build_object('description', coalesce(v_description, ''));
end;
$$;

revoke all on function public.preview_booking_quote(
  jsonb, date, date, public.fulfillment_method, text, uuid
) from public, anon, authenticated;
grant execute on function public.preview_booking_quote(
  jsonb, date, date, public.fulfillment_method, text, uuid
) to anon, authenticated;

create function public.guard_product_unit_state_change()
returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
begin
  if new.state = old.state then return new; end if;

  if new.state = 'maintenance' and not exists (
    select 1 from public.unit_maintenance m
    where m.unit_id = new.id and m.completed_on is null
  ) then
    raise exception 'State maintenance requires an open maintenance record';
  end if;

  -- Closing maintenance marks its record complete before returning the unit to available. Any
  -- other path that tries to bypass an open record is rejected, including direct table updates.
  if new.state = 'available' and exists (
    select 1 from public.unit_maintenance m
    where m.unit_id = new.id and m.completed_on is null
  ) then
    raise exception 'Unit has an open maintenance record';
  end if;
  if new.state = 'retired' and exists (
    select 1 from public.unit_maintenance m
    where m.unit_id = new.id and m.completed_on is null
  ) then
    raise exception 'Close maintenance before retiring the unit';
  end if;

  -- Retiring or reactivating a unit may not strand a current/future booking or physical custody.
  -- Pending holds that have already expired are deliberately ignored; booking allocation and the
  -- guarded update both serialize on the product_units row.
  if new.state = 'retired' and exists (
    select 1
    from public.reservations r
    join public.orders o on o.id = r.order_id
    join public.order_items oi on oi.id = r.order_item_id
    where r.unit_id = new.id and r.released_at is null
      and (
        (o.state = 'pending' and o.expires_at > now())
        or (o.state = 'confirmed' and upper(r.blocked_period) > v_today)
        or o.state in ('delivering', 'active', 'returning', 'overdue')
      )
  ) then
    raise exception 'Unit has a live reservation or custody';
  end if;
  return new;
end;
$$;

revoke all on function public.guard_product_unit_state_change() from public, anon, authenticated;
create trigger product_units_guard_state_change
  before update of state on public.product_units
  for each row execute function public.guard_product_unit_state_change();
