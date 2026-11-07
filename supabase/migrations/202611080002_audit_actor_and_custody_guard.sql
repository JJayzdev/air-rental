-- Hai sửa nhỏ về tính đúng của dữ liệu vận hành.
--
-- 1. Nhật ký đơn (order_events.actor_id) ghi auth.uid() của phiên đang chạy câu lệnh. Đơn pending
--    quá hạn được expire hàng loạt bên trong create_multi_product_booking của MỘT KHÁCH KHÁC, nên
--    /admin/nhat-ky hiển thị khách đó là "người thao tác" đã làm hết hạn đơn của người khác.
--    Chuyển sang expired luôn là việc của hệ thống: ghi actor_id = null ("Hệ thống").
--
-- 2. open_unit_maintenance chỉ chặn reservation pending/confirmed TRÙNG cửa sổ bảo trì. Đơn
--    overdue đã qua blocked_period nên máy vẫn đang ở nhà khách mà vẫn mở bảo trì được; đóng bảo
--    trì sau đó đưa máy về available dù chưa trả. Chặn thêm khi máy thuộc đơn đang giữ máy.

create or replace function public.record_order_state_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    insert into public.order_events(order_id, actor_id, to_state) values (new.id, new.user_id, new.state);
  elsif old.state is distinct from new.state then
    insert into public.order_events(order_id, actor_id, from_state, to_state)
      values (new.id, case when new.state = 'expired' then null else auth.uid() end,
        old.state, new.state);
  end if;
  return new;
end;
$$;

revoke all on function public.record_order_state_change() from public, anon, authenticated;

-- Bản sao open_unit_maintenance từ 202611010007_admin.sql; thêm kiểm tra máy đang ở nhà khách.
create or replace function public.open_unit_maintenance(
  p_unit_id uuid,
  p_reason public.maintenance_reason,
  p_expected_end_on date,
  p_notes text default ''
)
returns public.unit_maintenance
language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid();
  v_today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  v_unit public.product_units%rowtype;
  v_record public.unit_maintenance%rowtype;
begin
  if v_actor is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  if public.current_app_role() not in ('staff', 'admin') then
    raise exception 'Staff access required' using errcode = '42501';
  end if;
  if p_expected_end_on is null or p_expected_end_on < v_today then
    raise exception 'Maintenance end date must be today or later';
  end if;
  if length(coalesce(p_notes, '')) > 500 then
    raise exception 'Maintenance notes are too long';
  end if;
  select * into v_unit from public.product_units u where u.id = p_unit_id for update;
  if not found or v_unit.state = 'retired' then
    raise exception 'Unit is not available for maintenance';
  end if;
  if exists (select 1 from public.unit_maintenance m
      where m.unit_id = p_unit_id and m.completed_on is null) then
    raise exception 'Unit already has an open maintenance record';
  end if;
  if exists (
    select 1 from public.reservations r
    where r.unit_id = p_unit_id and r.released_at is null
      and r.state in ('pending', 'confirmed')
      and r.blocked_period && daterange(v_today, p_expected_end_on + 1, '[)')
  ) then
    raise exception 'Unit has a reservation inside the maintenance window';
  end if;
  if exists (
    select 1 from public.reservations r
    join public.orders o on o.id = r.order_id
    where r.unit_id = p_unit_id and r.released_at is null
      and o.state in ('delivering', 'active', 'returning', 'overdue')
  ) then
    raise exception 'Unit is still with a customer';
  end if;

  insert into public.unit_maintenance(unit_id, reason, notes, started_on, expected_end_on, created_by)
    values (p_unit_id, p_reason, coalesce(p_notes, ''), v_today, p_expected_end_on, v_actor)
    returning * into v_record;
  update public.product_units u
    set state = 'maintenance', ready_on = greatest(u.ready_on, p_expected_end_on)
  where u.id = p_unit_id;
  return v_record;
end;
$$;

revoke all on function public.open_unit_maintenance(uuid, public.maintenance_reason, date, text)
  from public, anon, authenticated;
grant execute on function public.open_unit_maintenance(uuid, public.maintenance_reason, date, text)
  to authenticated;
