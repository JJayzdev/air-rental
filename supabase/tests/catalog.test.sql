-- Run after `supabase db reset` so the documented sample seed has been applied.
create extension if not exists pgtap with schema extensions;
begin;
select plan(9);

select is((select count(*)::integer from public.products
  where is_sample and id::text between '10000000-0000-4000-8000-000000000001' and '10000000-0000-4000-8000-000000000024'),
  24, 'catalog seed contains 24 marked sample products');
select is((select count(*)::integer from public.product_units u
  join public.products p on p.id = u.product_id
  where p.is_sample and u.asset_tag like 'SAMPLE-%'),
  48, 'sample inventory fixtures are present and marked');
select is((select count(*)::integer from public.price_tiers t
  join public.products p on p.id = t.product_id
  where p.is_sample and p.id::text between '10000000-0000-4000-8000-000000000001' and '10000000-0000-4000-8000-000000000024'),
  72, 'sample products have illustrative duration tiers');
select is((select count(*)::integer from public.product_units u
  join public.products p on p.id = u.product_id
  where p.is_sample and u.asset_tag like 'SAMPLE-%' and u.state = 'maintenance'),
  48, 'sample physical units are not bookable');
select is((select count(*)::integer from public.products
  where is_sample and image_credit_author is not null and image_license_url is not null and image_source_url is not null),
  3, 'three sample reference photographs carry complete visible credit metadata');

set local role anon;
select is((select count(*)::integer from public.products where is_sample and state = 'active'),
  24, 'anon can read active sample catalog rows');
select throws_ok($$select count(*) from public.product_units$$,
  '42501', null, 'anon cannot read physical unit inventory');
set local role postgres;
update public.products set state = 'draft'
where id = '10000000-0000-4000-8000-000000000001';
set local role anon;
select is((select count(*)::integer from public.products where slug = 'macbook-air-m3'),
  0, 'anon cannot read draft catalog rows');

set local role postgres;
insert into auth.users(id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values ('50000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'catalog-test@example.invalid', '', now(), '{}', '{}', now(), now());
select set_config('request.jwt.claim.sub', '50000000-0000-4000-8000-000000000001', true);
set local role authenticated;
select throws_ok($$select * from public.create_booking(
  '60000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', 1,
  '2099-12-20', '2099-12-20', 'pickup', 'Catalog Test', '0912345678', 'Test address 123'
)$$, 'P0001', 'One or more products are not available for rental', 'sample catalog units cannot be reserved');

select * from finish();
rollback;
