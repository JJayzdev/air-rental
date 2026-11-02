-- GĐ5 admin: dashboard aggregates, fleet maintenance scheduling, and admin catalog/unit writes.
-- Discount codes and delivery-fee zones are intentionally not part of this migration.

create type public.maintenance_reason as enum ('scheduled', 'repair', 'inspection');

create table public.unit_maintenance (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.product_units(id) on delete cascade,
  reason public.maintenance_reason not null default 'scheduled',
  notes text not null default '' check (length(notes) <= 500),
  started_on date not null,
  expected_end_on date not null,
  completed_on date,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  check (expected_end_on >= started_on),
  check (completed_on is null or completed_on >= started_on)
);
create index unit_maintenance_unit_idx on public.unit_maintenance(unit_id, started_on desc);
create index unit_maintenance_open_idx on public.unit_maintenance(unit_id)
  where completed_on is null;

alter table public.unit_maintenance enable row level security;
revoke all on table public.unit_maintenance from public, anon, authenticated;
grant select on public.unit_maintenance to authenticated;
create policy "maintenance staff read" on public.unit_maintenance for select to authenticated
  using (public.current_app_role() in ('staff', 'admin'));

-- Admin catalog and fleet edits go through the authenticated client and are constrained by the
-- existing admin row policies. Staff keep read-only access to units and no product writes.
grant insert, update on public.products, public.product_units to authenticated;

create function public.admin_dashboard()
returns table (
  pending_orders bigint,
  confirmed_orders bigint,
  active_rentals bigint,
  overdue_orders bigint,
  refunds_pending bigint,
  month_revenue_vnd bigint,
  month_refunds_vnd bigint,
  available_units bigint,
  maintenance_units bigint,
  pending_identity_documents bigint
)
language plpgsql security definer set search_path = '' as $$
declare
  v_month_start timestamptz;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  if public.current_app_role() not in ('staff', 'admin') then
    raise exception 'Staff access required' using errcode = '42501';
  end if;
  v_month_start := date_trunc('month', (now() at time zone 'Asia/Ho_Chi_Minh')) at time zone 'Asia/Ho_Chi_Minh';

  return query select
    (select count(*) from public.orders o where o.state = 'pending'),
    (select count(*) from public.orders o where o.state = 'confirmed'),
    (select count(*) from public.orders o where o.state in ('delivering', 'active')),
    (select count(*) from public.orders o where o.state = 'overdue'),
    (select count(*) from public.payments p where p.kind = 'deposit_refund' and p.status = 'pending'),
    (select coalesce(sum(p.amount_vnd), 0)::bigint from public.payments p
      where p.direction = 'in' and p.status = 'succeeded' and p.created_at >= v_month_start),
    (select coalesce(sum(p.amount_vnd), 0)::bigint from public.payments p
      where p.direction = 'out' and p.status = 'succeeded' and p.created_at >= v_month_start),
    (select count(*) from public.product_units u where u.state = 'available'),
    (select count(*) from public.product_units u where u.state = 'maintenance'),
    (select count(*) from public.identity_document_requests r where r.status = 'pending_review');
end;
$$;

revoke all on function public.admin_dashboard() from public, anon, authenticated;
grant execute on function public.admin_dashboard() to authenticated;

-- Schedules maintenance, moves the unit out of the rental pool, and refuses to collide with a live
-- reservation so a future booking never loses its assigned machine.
create function public.open_unit_maintenance(
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

-- Closing a record returns the unit to the pool once the completion date has arrived.
create function public.close_unit_maintenance(p_maintenance_id uuid, p_completed_on date default null)
returns public.unit_maintenance
language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid();
  v_today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  v_record public.unit_maintenance%rowtype;
  v_completed date := coalesce(p_completed_on, v_today);
begin
  if v_actor is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  if public.current_app_role() not in ('staff', 'admin') then
    raise exception 'Staff access required' using errcode = '42501';
  end if;
  select * into v_record from public.unit_maintenance m
  where m.id = p_maintenance_id for update;
  if not found or v_record.completed_on is not null then
    raise exception 'Open maintenance record was not found';
  end if;
  if v_completed < v_record.started_on then
    raise exception 'Completion date cannot be before the start date';
  end if;
  update public.unit_maintenance m set completed_on = v_completed where m.id = v_record.id
    returning * into v_record;
  update public.product_units u
    set state = 'available', ready_on = greatest(u.ready_on, v_completed)
  where u.id = v_record.unit_id
    and not exists (select 1 from public.unit_maintenance other
      where other.unit_id = v_record.unit_id and other.completed_on is null);
  return v_record;
end;
$$;

revoke all on function public.close_unit_maintenance(uuid, date) from public, anon, authenticated;
grant execute on function public.close_unit_maintenance(uuid, date) to authenticated;
