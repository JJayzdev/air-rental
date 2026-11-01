-- GĐ3 account, saved-address, favorites, and optional identity-request access tests.
create extension if not exists pgtap with schema extensions;
begin;
select plan(48);
set local role postgres;
update public.identity_document_settings set enabled = false where singleton;

select ok(has_column_privilege('authenticated', 'public.profiles', 'full_name', 'UPDATE')
  and has_column_privilege('authenticated', 'public.profiles', 'phone', 'UPDATE')
  and not has_column_privilege('authenticated', 'public.profiles', 'role', 'UPDATE'),
  'customers may update contact fields but not their app role');
select ok(has_table_privilege('authenticated', 'public.customer_addresses', 'SELECT')
  and not has_table_privilege('authenticated', 'public.customer_addresses', 'INSERT')
  and not has_table_privilege('authenticated', 'public.customer_addresses', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.customer_addresses', 'DELETE'),
  'saved address rows are read-only outside owner-scoped RPCs');
select ok(has_function_privilege('authenticated',
  'public.save_customer_address(uuid,text,text,text,text,text,text,text,boolean)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.delete_customer_address(uuid)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.save_customer_address(uuid,text,text,text,text,text,text,text,boolean)', 'EXECUTE'),
  'saved address RPCs are available only to signed-in users');
select ok(exists (select 1 from pg_indexes where schemaname = 'public'
  and indexname = 'customer_addresses_one_default_idx' and indexdef ilike '%WHERE is_default%'),
  'address defaults have a database uniqueness guard');
select ok(has_table_privilege('authenticated', 'public.user_favorites', 'SELECT')
  and has_table_privilege('authenticated', 'public.user_favorites', 'INSERT')
  and has_table_privilege('authenticated', 'public.user_favorites', 'DELETE')
  and not has_table_privilege('authenticated', 'public.user_favorites', 'UPDATE')
  and not has_table_privilege('anon', 'public.user_favorites', 'SELECT'),
  'favorites allow owner-scoped add/remove without public access or row rewriting');
select ok(not public.identity_documents_enabled()
  and (select not public from storage.buckets where id = 'identity-documents')
  and (select file_size_limit = 5242880 from storage.buckets where id = 'identity-documents')
  and (select allowed_mime_types = array['image/jpeg', 'image/png']::text[] from storage.buckets where id = 'identity-documents'),
  'identity collection is disabled by default and its bucket is private with bounded image types');
select ok(not has_table_privilege('authenticated', 'public.identity_document_requests', 'INSERT')
  and not has_table_privilege('authenticated', 'public.identity_document_requests', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.identity_document_requests', 'DELETE')
  and not has_table_privilege('authenticated', 'public.identity_document_events', 'INSERT')
  and not has_sequence_privilege('authenticated', 'public.identity_document_events_id_seq', 'USAGE'),
  'identity requests and their audit log cannot be directly forged by clients');
insert into public.categories(id, slug, name) values
  ('82000000-0000-0000-0000-000000000001', 'accounts-test', 'Accounts test');
insert into public.products(id, category_id, slug, name, price_per_day_vnd, deposit_vnd, state)
values ('83000000-0000-0000-0000-000000000001', '82000000-0000-0000-0000-000000000001',
  'accounts-test-product', 'Accounts test product', 10000, 50000, 'active');
insert into auth.users(id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('81000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'account-one@example.invalid', '', now(), '{}', '{}', now(), now()),
  ('81000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'account-two@example.invalid', '', now(), '{}', '{}', now(), now()),
  ('81000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'account-requester@example.invalid', '', now(), '{}', '{}', now(), now()),
  ('81000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'account-reviewer@example.invalid', '', now(), '{}', '{}', now(), now());
update public.profiles set role = 'staff' where id in
  ('81000000-0000-0000-0000-000000000003', '81000000-0000-0000-0000-000000000004');

select set_config('request.jwt.claim.sub', '81000000-0000-0000-0000-000000000003', true);
set local role authenticated;
select throws_ok($$select public.request_identity_document('81000000-0000-0000-0000-000000000001')$$,
  'P0001', 'Identity document collection is disabled', 'identity requests remain disabled until explicitly enabled');
set local role postgres;
update public.identity_document_settings set enabled = true where singleton;
set local role authenticated;
select set_config('request.jwt.claim.sub', '81000000-0000-0000-0000-000000000001', true);
set local role authenticated;
update public.profiles set full_name = 'Account One', phone = '0912345678'
where id = '81000000-0000-0000-0000-000000000001';
select is((select full_name from public.profiles where id = auth.uid()), 'Account One',
  'customer can update their own contact profile');
select throws_ok($$update public.profiles set role = 'admin' where id = auth.uid()$$,
  '42501', null, 'customer cannot promote their own profile');
create temporary table account_address_one on commit drop as
select * from public.save_customer_address(null, 'Home', 'Account One', '0912345678',
  '1 Test Street', 'Ward 1', 'District 1', 'Ho Chi Minh City', false);
select is((select is_default from account_address_one), true,
  'first saved address becomes the default even when no prior address exists');
create temporary table account_address_two on commit drop as
select * from public.save_customer_address(null, 'Work', 'Account One', '0912345678',
  '2 Test Street', 'Ward 2', 'District 2', 'Ho Chi Minh City', false);
select is((select count(*)::integer from public.customer_addresses where user_id = auth.uid() and is_default), 1,
  'adding a non-default address preserves the existing default');
select * from public.save_customer_address((select id from account_address_two), 'Work', 'Account One',
  '0912345678', '2 Test Street', 'Ward 2', 'District 2', 'Ho Chi Minh City', true);
select is((select count(*)::integer from public.customer_addresses where user_id = auth.uid() and is_default), 1,
  'default selection atomically leaves exactly one default address');
select is((select is_default from public.customer_addresses where id = (select id from account_address_two)), true,
  'requested address becomes the default');
select lives_ok($$select public.delete_customer_address((select id from account_address_two))$$,
  'customer can delete their own saved address');
select is((select is_default from public.customer_addresses where id = (select id from account_address_one)), true,
  'deleting the default atomically promotes the oldest remaining saved address');
select set_config('request.jwt.claim.sub', '81000000-0000-0000-0000-000000000002', true);
select is((select count(*)::integer from public.customer_addresses), 0,
  'another customer cannot list the first customer address book');
select throws_ok($$select public.delete_customer_address((select id from account_address_one))$$,
  'P0001', 'Address was not found', 'another customer cannot delete a saved address by id');
select set_config('request.jwt.claim.sub', '81000000-0000-0000-0000-000000000001', true);
insert into public.user_favorites(user_id, product_id)
values (auth.uid(), '83000000-0000-0000-0000-000000000001');
select is((select count(*)::integer from public.user_favorites where user_id = auth.uid()), 1,
  'customer can add and read their own favorite');
select throws_ok($$insert into public.user_favorites(user_id, product_id)
  values (auth.uid(), '83000000-0000-0000-0000-000000000001')$$,
  '23505', null, 'duplicate favorites are rejected');
select throws_ok($$select public.request_identity_document('81000000-0000-0000-0000-000000000001')$$,
  '42501', 'Staff access required', 'customers cannot create identity verification requests');
select set_config('request.jwt.claim.sub', '81000000-0000-0000-0000-000000000002', true);
select is((select count(*)::integer from public.user_favorites), 0,
  'another customer cannot list the first customer favorites');
with removed as (
  delete from public.user_favorites where user_id = '81000000-0000-0000-0000-000000000001'
  returning 1
) select is((select count(*)::integer from removed), 0, 'another customer cannot remove a favorite by owner id');
select throws_ok($$insert into public.user_favorites(user_id, product_id)
  values ('81000000-0000-0000-0000-000000000001', '83000000-0000-0000-0000-000000000001')$$,
  '42501', null, 'customer cannot add a favorite for another account');
select set_config('request.jwt.claim.sub', '81000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claim.sub', '81000000-0000-0000-0000-000000000003', true);
create temporary table account_identity_request_one on commit drop as
select * from public.request_identity_document('81000000-0000-0000-0000-000000000001');
select is((select id from public.request_identity_document('81000000-0000-0000-0000-000000000001')),
  (select id from account_identity_request_one), 'repeated staff requests reuse the existing open request');
create temporary table account_identity_request_two on commit drop as
select * from public.request_identity_document('81000000-0000-0000-0000-000000000002');
create temporary table account_identity_request_staff_subject on commit drop as
select * from public.request_identity_document('81000000-0000-0000-0000-000000000004');
select set_config('request.jwt.claim.sub', '81000000-0000-0000-0000-000000000001', true);
select is((select count(*)::integer from public.identity_document_requests), 1,
  'customer sees only their own staff-issued identity request');
select throws_ok($$select public.submit_identity_document((select id from account_identity_request_two))$$,
  'P0001', 'Open identity document request was not found', 'customer cannot submit against another user request');
select throws_ok($$insert into storage.objects(bucket_id, name, metadata)
  values ('identity-documents', auth.uid()::text || '/' || (select id::text from account_identity_request_one),
    '{"mimetype":"image/png","size":12345}'::jsonb)$$,
  '42501', null, 'client cannot bypass the trusted upload and byte-validation path');

set local role postgres;
insert into storage.objects(bucket_id, name, metadata)
select 'identity-documents', r.user_id::text || '/' || r.id::text,
  '{"mimetype":"image/png","size":12345}'::jsonb
from public.identity_document_requests r
where r.id in ((select id from account_identity_request_one), (select id from account_identity_request_two),
  (select id from account_identity_request_staff_subject));
set local role authenticated;
select lives_ok($$select public.submit_identity_document((select id from account_identity_request_one))$$,
  'customer can submit a valid object for their own staff-issued request');
select is((select status from public.identity_document_requests where id = (select id from account_identity_request_one)),
  'pending_review', 'submission records a pending review state');
select is((select count(*)::integer from storage.objects
  where bucket_id = 'identity-documents' and name = (select user_id::text || '/' || id::text from account_identity_request_one)),
  1, 'owner can view their own pending object');
select set_config('request.jwt.claim.sub', '81000000-0000-0000-0000-000000000002', true);
select is((select count(*)::integer from storage.objects
  where bucket_id = 'identity-documents' and name = (select user_id::text || '/' || id::text from account_identity_request_one)),
  0, 'another customer cannot view the object');
select throws_ok($$select public.delete_identity_document_request((select id from account_identity_request_one))$$,
  'P0001', 'Pending identity document was not found', 'another customer cannot cancel or delete this request');
select lives_ok($$select public.submit_identity_document((select id from account_identity_request_two))$$,
  'second customer can submit their own pending request');
with removed as (
  delete from storage.objects where bucket_id = 'identity-documents'
    and name = (select user_id::text || '/' || id::text from account_identity_request_two)
  returning 1
) select is((select count(*)::integer from removed), 0, 'owner cannot remove an object while it is under review');
select lives_ok($$select public.delete_identity_document_request((select id from account_identity_request_two))$$,
  'owner can cancel a pending review before deleting their document');
select is((select status from public.identity_document_requests where id = (select id from account_identity_request_two)),
  'cancelled', 'owner deletion closes the pending review state');
with removed as (
  delete from storage.objects where bucket_id = 'identity-documents'
    and name = (select user_id::text || '/' || id::text from account_identity_request_two)
  returning 1
) select is((select count(*)::integer from removed), 1, 'owner can delete the exact object after cancelling its review');
select set_config('request.jwt.claim.sub', '81000000-0000-0000-0000-000000000003', true);
select throws_ok($$select public.review_identity_document((select id from account_identity_request_two), 'approved')$$,
  'P0001', 'Pending identity document was not found', 'cancelled document cannot be reviewed');

set local role authenticated;
select set_config('request.jwt.claim.sub', '81000000-0000-0000-0000-000000000003', true);
create temporary table account_identity_request_bad_upload on commit drop as
select * from public.request_identity_document('81000000-0000-0000-0000-000000000002');
set local role postgres;
insert into storage.objects(bucket_id, name, metadata)
select 'identity-documents', r.user_id::text || '/' || r.id::text,
  '{"mimetype":"application/pdf","size":12345}'::jsonb
from public.identity_document_requests r where r.id = (select id from account_identity_request_bad_upload);
set local role authenticated;
select set_config('request.jwt.claim.sub', '81000000-0000-0000-0000-000000000002', true);
select throws_ok($$select public.submit_identity_document((select id from account_identity_request_bad_upload))$$,
  'P0001', 'Identity document upload is missing or invalid', 'unsupported MIME type cannot enter review');
set local role postgres;
update storage.objects set metadata = '{"mimetype":"image/png","size":6000000}'::jsonb
where bucket_id = 'identity-documents'
  and name = (select user_id::text || '/' || id::text from account_identity_request_bad_upload);
set local role authenticated;
select throws_ok($$select public.submit_identity_document((select id from account_identity_request_bad_upload))$$,
  'P0001', 'Identity document upload is missing or invalid', 'oversized object cannot enter review');

set local role authenticated;
select set_config('request.jwt.claim.sub', '81000000-0000-0000-0000-000000000003', true);
select lives_ok($$select public.review_identity_document((select id from account_identity_request_one), 'approved')$$,
  'requesting staff member can review the customer document using the controlled action');
select set_config('request.jwt.claim.sub', '81000000-0000-0000-0000-000000000004', true);
select is((select status from public.identity_document_requests where id = (select id from account_identity_request_one)),
  'approved', 'staff decision updates the request state');
select is((select reviewed_by from public.identity_document_requests where id = (select id from account_identity_request_one)),
  '81000000-0000-0000-0000-000000000003', 'review actor is derived from the authenticated staff user');
select is((select count(*)::integer from public.identity_document_events
  where request_id = (select id from account_identity_request_one) and actor_id = '81000000-0000-0000-0000-000000000003'
    and from_status = 'pending_review' and to_status = 'approved'),
  1, 'staff decision is retained in the append-only status audit');
select throws_ok($$select public.review_identity_document((select id from account_identity_request_one), 'approved')$$,
  'P0001', 'Pending identity document was not found', 'reviewed identity request cannot be approved again');
select lives_ok($$select public.submit_identity_document((select id from account_identity_request_staff_subject))$$,
  'staff subject can submit a document requested by another staff member');
select throws_ok($$select public.review_identity_document((select id from account_identity_request_staff_subject), 'approved')$$,
  'P0001', 'Document subject cannot review their own request', 'staff subject cannot approve their own document');

select * from finish();
rollback;
