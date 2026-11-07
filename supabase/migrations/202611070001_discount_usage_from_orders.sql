-- Mã giảm giá hoàn lượt khi đơn bị huỷ hoặc hết hạn giữ máy.
--
-- Trước migration này, create_multi_product_booking tăng discount_codes.used_count ngay khi tạo
-- đơn pending nhưng không chỗ nào giảm lại khi đơn chuyển sang cancelled/expired. Một mã có
-- max_uses bị "đốt" bởi đơn giữ chỗ bỏ dở: chỉ cần đặt rồi huỷ liên tục là vô hiệu hoá được mã.
--
-- Sau migration: giới hạn max_uses được so với số đơn ĐANG dùng mã, đếm trực tiếp từ orders
-- (mọi trạng thái trừ cancelled, expired và pending đã quá expires_at). quote_booking vẫn khoá
-- dòng discount FOR UPDATE trước khi đếm, nên hai lượt đặt đồng thời cùng mã được tuần tự hoá và
-- không bán vượt giới hạn. Không dùng trigger trả lượt khi huỷ đơn: trigger đó sẽ khoá dòng
-- discount khác bên trong CTE expire của một lượt đặt đang giữ khoá discount của nó → deadlock.
--
-- used_count giữ nguyên ý nghĩa lịch sử "tổng số lần mã đã được áp vào một đơn" (kể cả đơn đã
-- huỷ), nên bỏ ràng buộc used_count <= max_uses.

do $$
declare
  v_name text;
begin
  for v_name in
    select c.conname from pg_catalog.pg_constraint c
    where c.conrelid = 'public.discount_codes'::regclass
      and c.contype = 'c'
      and pg_catalog.pg_get_constraintdef(c.oid) like '%used_count <= max_uses%'
  loop
    execute format('alter table public.discount_codes drop constraint %I', v_name);
  end loop;
end;
$$;

comment on column public.discount_codes.used_count is
  'Tổng số lần mã được áp vào một đơn, kể cả đơn đã huỷ/hết hạn. Không dùng để giới hạn lượt; xem discount_code_active_uses.';

-- Số đơn đang giữ hoặc đã dùng mã. Đơn pending quá hạn được coi như đã hết hạn dù job expire
-- chưa chạy, khớp với cách booking_calendar bỏ qua các lượt giữ máy quá hạn.
create function public.discount_code_active_uses(p_discount_id uuid)
returns integer
language sql stable security definer set search_path = '' as $$
  select count(*)::integer
  from public.orders o
  where o.discount_code_id = p_discount_id
    and o.state not in ('cancelled', 'expired')
    and not (o.state = 'pending' and o.expires_at <= now())
$$;

revoke all on function public.discount_code_active_uses(uuid) from public, anon, authenticated;

-- Màn hình quản trị: số lượt đang dùng của mọi mã.
create function public.discount_code_usage()
returns table(discount_code_id uuid, active_uses integer)
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  if public.current_app_role() <> 'admin' then
    raise exception 'Admin access required' using errcode = '42501';
  end if;
  return query
    select d.id, public.discount_code_active_uses(d.id) from public.discount_codes d;
end;
$$;

revoke all on function public.discount_code_usage() from public, anon, authenticated;
grant execute on function public.discount_code_usage() to authenticated;

-- Bản sao quote_booking từ 202611010008_pricing.sql; chỉ đổi điều kiện giới hạn lượt dùng.
create or replace function public.quote_booking(
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
    if v_discount.max_uses is not null
        and public.discount_code_active_uses(v_discount.id) >= v_discount.max_uses then
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
