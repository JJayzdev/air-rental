-- Quyền của hệ thống đối tác (migration 202611060003_partner_security).
create extension if not exists pgtap with schema extensions;
begin;
select plan(13);
set local role postgres;

select ok(not has_table_privilege('anon', 'public.partners', 'SELECT'),
  'anonymous visitors cannot read partner contact or tax data');
select ok(has_table_privilege('authenticated', 'public.partners', 'SELECT')
  and not has_table_privilege('authenticated', 'public.partners', 'INSERT')
  and not has_table_privilege('authenticated', 'public.partners', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.partners', 'DELETE'),
  'signed-in users can only read partner profiles; writes go through the server');

insert into public.categories(id, slug, name)
values ('97000000-0000-0000-0000-000000000001', 'partner-sec-test', 'Partner security test');
insert into auth.users(id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('98000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'ps-customer@example.invalid', '', now(), '{}', '{}', now(), now()),
  ('98000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'ps-active@example.invalid', '', now(), '{}', '{}', now(), now()),
  ('98000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'ps-pending@example.invalid', '', now(), '{}', '{}', now(), now());
update public.profiles set role = 'partner'
where id in ('98000000-0000-0000-0000-000000000002', '98000000-0000-0000-0000-000000000003');
insert into public.partners(id, user_id, display_name, status)
values
  ('99000000-0000-0000-0000-000000000002', '98000000-0000-0000-0000-000000000002', 'Active partner', 'active'),
  ('99000000-0000-0000-0000-000000000003', '98000000-0000-0000-0000-000000000003', 'Pending partner', 'pending');
insert into public.products(id, partner_id, category_id, slug, name, price_per_day_vnd, state)
values ('97000000-0000-0000-0000-000000000003', '99000000-0000-0000-0000-000000000003',
  '97000000-0000-0000-0000-000000000001', 'ps-pending-draft', 'Pending draft', 50000, 'draft');

-- Khách thường không tự tạo hồ sơ đối tác "active".
set local role authenticated;
select set_config('request.jwt.claim.sub', '98000000-0000-0000-0000-000000000001', true);
select throws_ok($$insert into public.partners(user_id, display_name, status, commission_rate)
  values ('98000000-0000-0000-0000-000000000001', 'Self approved', 'active', 0)$$,
  '42501', null, 'a customer cannot self-approve as an active partner');
select is((select count(*)::int from public.partners), 0,
  'a customer cannot see other partners');
select throws_ok($$insert into public.products(partner_id, category_id, slug, name, price_per_day_vnd, state)
  values ('99000000-0000-0000-0000-000000000002', '97000000-0000-0000-0000-000000000001',
    'ps-hijack', 'Hijack', 50000, 'active')$$,
  '42501', null, 'a customer cannot publish a product under another partner');

-- Đối tác chờ duyệt: xem được sản phẩm của mình nhưng không đăng/sửa được.
select set_config('request.jwt.claim.sub', '98000000-0000-0000-0000-000000000003', true);
select is((select count(*)::int from public.products where partner_id = '99000000-0000-0000-0000-000000000003'), 1,
  'a pending partner can still see their own draft products');
select throws_ok($$insert into public.products(partner_id, category_id, slug, name, price_per_day_vnd, state)
  values ('99000000-0000-0000-0000-000000000003', '97000000-0000-0000-0000-000000000001',
    'ps-pending-new', 'Pending new', 50000, 'active')$$,
  '42501', null, 'a pending partner cannot publish products');
update public.products set state = 'active' where id = '97000000-0000-0000-0000-000000000003';
select throws_ok($$update public.partners set status = 'active'
  where id = '99000000-0000-0000-0000-000000000003'$$,
  '42501', null, 'a pending partner cannot approve their own profile');

-- Đối tác đang hoạt động: đăng được sản phẩm, nhưng các cột do quản trị kiểm soát bị khóa.
select set_config('request.jwt.claim.sub', '98000000-0000-0000-0000-000000000002', true);
select lives_ok($$insert into public.products(id, partner_id, category_id, slug, name,
    price_per_day_vnd, state, is_sample, sort_order)
  values ('97000000-0000-0000-0000-000000000002', '99000000-0000-0000-0000-000000000002',
    '97000000-0000-0000-0000-000000000001', 'ps-active-product', 'Active product', 50000,
    'active', true, -100)$$,
  'an active partner can publish their own product');
update public.products set partner_id = '99000000-0000-0000-0000-000000000003', sort_order = -1
where id = '97000000-0000-0000-0000-000000000002';
select throws_ok($$update public.partners set commission_rate = 0
  where id = '99000000-0000-0000-0000-000000000002'$$,
  '42501', null, 'an active partner cannot change their own commission');

set local role postgres;
select is((select state::text from public.products where id = '97000000-0000-0000-0000-000000000003'),
  'draft', 'the pending partner update to their product was silently filtered by RLS');
select is(
  (select row(partner_id, is_sample, sort_order)::text from public.products
    where id = '97000000-0000-0000-0000-000000000002'),
  row('99000000-0000-0000-0000-000000000002'::uuid, false, 1000)::text,
  'partners cannot mark samples, reorder the catalog, or move a product to another owner');

set local role anon;
select throws_ok($$select phone, email, tax_code from public.partners$$,
  '42501', null, 'anonymous partner reads are refused');

select * from finish();
rollback;
