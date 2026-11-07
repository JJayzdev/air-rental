-- Hoàn tiền khi đơn đã nhận tiền bị huỷ hoặc hết hạn giữ máy.
--
-- Trước migration này chỉ có một đường tạo nghĩa vụ hoàn tiền: trigger hoàn cọc khi đơn
-- chuyển sang completed. Các trường hợp sau giữ tiền của khách mà không ghi nhận khoản phải trả:
--   * Khách chuyển khoản cho đơn pending (trang đơn hiển thị thông tin chuyển khoản ngay) rồi
--     tự huỷ, hoặc đơn hết 30 phút giữ máy trước khi nhân viên xác nhận.
--   * Nhân viên huỷ một đơn confirmed đã thanh toán.
--   * Tiền đến SAU khi đơn đã huỷ/hết hạn (apply_sepay_payment vẫn ghi nhận, có thể đặt 'paid').
--
-- Sau migration:
--   * kind mới 'cancellation_refund' trong sổ cái payments.
--   * Khi đơn chuyển sang cancelled/expired: hoàn toàn bộ số dư đã nhận (tiền vào thành công trừ
--     các khoản đã/đang hoàn), payment_state = 'refund_pending'.
--   * Tiền đến cho đơn đã cancelled/expired: ghi nhận rồi tạo ngay khoản hoàn tương ứng.
--   * complete_deposit_refund xác nhận được cả hai loại hoàn; dashboard đếm cả hai.
-- Phí huỷ (nếu có chính sách) chưa được mô hình hoá: nhân viên hoàn toàn bộ số đã nhận.

do $$
declare
  v_name text;
begin
  for v_name in
    select c.conname from pg_catalog.pg_constraint c
    where c.conrelid = 'public.payments'::regclass
      and c.contype = 'c'
      and pg_catalog.pg_get_constraintdef(c.oid) like '%deposit_refund%'
  loop
    execute format('alter table public.payments drop constraint %I', v_name);
  end loop;
end;
$$;

alter table public.payments
  add constraint payments_kind_check
  check (kind in ('payment', 'deposit_refund', 'cancellation_refund'));

drop index if exists public.payments_pending_refund_idx;
create index payments_pending_refund_idx on public.payments(order_id)
  where kind in ('deposit_refund', 'cancellation_refund') and status = 'pending';

-- Số tiền của đơn còn nằm ở cửa hàng: tiền vào thành công trừ mọi khoản hoàn đã/đang thực hiện.
create function public.order_refundable_balance(p_order_id uuid)
returns bigint
language sql stable security definer set search_path = '' as $$
  select coalesce(sum(case
      when p.direction = 'in' and p.status = 'succeeded' then p.amount_vnd
      when p.direction = 'out' and p.status in ('pending', 'succeeded') then -p.amount_vnd
      else 0 end), 0)::bigint
  from public.payments p
  where p.order_id = p_order_id
$$;

revoke all on function public.order_refundable_balance(uuid) from public, anon, authenticated;

create function public.create_refund_on_cancellation()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_balance bigint;
begin
  if new.state in ('cancelled', 'expired') and old.state not in ('cancelled', 'expired') then
    v_balance := public.order_refundable_balance(new.id);
    if v_balance > 0 then
      insert into public.payments(order_id, provider, direction, kind, amount_vnd, status)
        values (new.id, 'manual', 'out', 'cancellation_refund', v_balance, 'pending');
      new.payment_state := 'refund_pending';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.create_refund_on_cancellation() from public, anon, authenticated;

create trigger orders_create_cancellation_refund
  before update of state on public.orders
  for each row execute function public.create_refund_on_cancellation();

-- Bản sao apply_sepay_payment từ 202611010008_pricing.sql; thêm nhánh đơn đã huỷ/hết hạn.
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
  v_balance bigint;
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

  if v_order.state in ('cancelled', 'expired') then
    -- The rental will not happen: everything still held for this order is owed back.
    v_balance := public.order_refundable_balance(v_order.id);
    if v_balance > 0 then
      insert into public.payments(order_id, provider, direction, kind, amount_vnd, status)
        values (v_order.id, 'manual', 'out', 'cancellation_refund', v_balance, 'pending');
    end if;
    v_next := 'refund_pending';
  else
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

-- Bản sao complete_deposit_refund từ 202611010006_payments.sql; nhận cả hoàn tiền huỷ đơn.
create or replace function public.complete_deposit_refund(p_payment_id uuid)
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
  if not found or v_payment.kind not in ('deposit_refund', 'cancellation_refund')
      or v_payment.direction <> 'out' or v_payment.status <> 'pending' then
    raise exception 'Pending deposit refund was not found';
  end if;
  update public.payments p set status = 'succeeded', updated_at = now() where p.id = v_payment.id;
  if not exists (
    select 1 from public.payments p
    where p.order_id = v_payment.order_id
      and p.kind in ('deposit_refund', 'cancellation_refund') and p.status = 'pending'
  ) then
    update public.orders o set payment_state = 'refunded' where o.id = v_payment.order_id;
  end if;
end;
$$;

revoke all on function public.complete_deposit_refund(uuid) from public, anon, authenticated;
grant execute on function public.complete_deposit_refund(uuid) to authenticated;

-- Bản sao admin_dashboard từ 202611010007_admin.sql; refunds_pending đếm cả hoàn tiền huỷ đơn.
create or replace function public.admin_dashboard()
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
    (select count(*) from public.payments p
      where p.kind in ('deposit_refund', 'cancellation_refund') and p.status = 'pending'),
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
