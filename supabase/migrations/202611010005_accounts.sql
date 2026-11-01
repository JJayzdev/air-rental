-- GĐ3 account data: owner-scoped profile actions, addresses, favorites, and optional identity review.

-- Existing profile fields are customer-editable; the role remains protected by column grants and RLS.
revoke update (role) on public.profiles from authenticated;
grant update (full_name, phone) on public.profiles to authenticated;

create table public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null default 'Home',
  recipient_name text not null,
  phone text not null,
  address_line text not null,
  ward text not null,
  district text not null,
  province text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (length(btrim(label)) between 1 and 40),
  check (length(btrim(recipient_name)) between 2 and 120),
  check (btrim(phone) ~ '^(0|\+84)(3|5|7|8|9)[0-9]{8}$'),
  check (length(btrim(address_line)) between 5 and 300),
  check (length(btrim(ward)) between 1 and 120),
  check (length(btrim(district)) between 1 and 120),
  check (length(btrim(province)) between 1 and 120)
);
create index customer_addresses_user_idx on public.customer_addresses(user_id, created_at desc);
create unique index customer_addresses_one_default_idx on public.customer_addresses(user_id) where is_default;
alter table public.customer_addresses enable row level security;
revoke all on table public.customer_addresses from public, anon, authenticated;
grant select on public.customer_addresses to authenticated;
create policy "customer addresses owner read" on public.customer_addresses for select to authenticated
  using (user_id = (select auth.uid()));

create function public.save_customer_address(
  p_address_id uuid,
  p_label text,
  p_recipient_name text,
  p_phone text,
  p_address_line text,
  p_ward text,
  p_district text,
  p_province text,
  p_is_default boolean
)
returns public.customer_addresses
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_address public.customer_addresses%rowtype;
  v_make_default boolean;
begin
  if v_user is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  if p_is_default is null then raise exception 'Default selection is required'; end if;
  if length(btrim(coalesce(p_label, ''))) not between 1 and 40
      or length(btrim(coalesce(p_recipient_name, ''))) not between 2 and 120
      or btrim(coalesce(p_phone, '')) !~ '^(0|\+84)(3|5|7|8|9)[0-9]{8}$'
      or length(btrim(coalesce(p_address_line, ''))) not between 5 and 300
      or length(btrim(coalesce(p_ward, ''))) not between 1 and 120
      or length(btrim(coalesce(p_district, ''))) not between 1 and 120
      or length(btrim(coalesce(p_province, ''))) not between 1 and 120 then
    raise exception 'Invalid address details';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user::text || ':customer-addresses', 0));
  if p_address_id is not null then
    select * into v_address from public.customer_addresses a
    where a.id = p_address_id and a.user_id = v_user for update;
    if not found then raise exception 'Address was not found'; end if;
  end if;

  v_make_default := p_is_default or (p_address_id is null and not exists (
    select 1 from public.customer_addresses a where a.user_id = v_user
  ));
  if v_make_default then
    update public.customer_addresses a set is_default = false, updated_at = now()
    where a.user_id = v_user and a.is_default and a.id is distinct from p_address_id;
  end if;

  if p_address_id is null then
    insert into public.customer_addresses(user_id, label, recipient_name, phone, address_line,
        ward, district, province, is_default)
      values (v_user, btrim(p_label), btrim(p_recipient_name), btrim(p_phone), btrim(p_address_line),
        btrim(p_ward), btrim(p_district), btrim(p_province), v_make_default)
      returning * into v_address;
  else
    update public.customer_addresses a set label = btrim(p_label), recipient_name = btrim(p_recipient_name),
      phone = btrim(p_phone), address_line = btrim(p_address_line), ward = btrim(p_ward),
      district = btrim(p_district), province = btrim(p_province), is_default = v_make_default, updated_at = now()
    where a.id = p_address_id and a.user_id = v_user
    returning * into v_address;
  end if;
  return v_address;
end;
$$;

create function public.delete_customer_address(p_address_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_was_default boolean;
  v_next_default uuid;
begin
  if v_user is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user::text || ':customer-addresses', 0));
  select a.is_default into v_was_default from public.customer_addresses a
  where a.id = p_address_id and a.user_id = v_user for update;
  if not found then raise exception 'Address was not found'; end if;
  delete from public.customer_addresses a where a.id = p_address_id and a.user_id = v_user;
  if v_was_default then
    select a.id into v_next_default from public.customer_addresses a
    where a.user_id = v_user order by a.created_at, a.id limit 1 for update;
    if v_next_default is not null then
      update public.customer_addresses a set is_default = true, updated_at = now()
      where a.id = v_next_default;
    end if;
  end if;
end;
$$;

create table public.user_favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);
create index user_favorites_product_idx on public.user_favorites(product_id);
alter table public.user_favorites enable row level security;
revoke all on table public.user_favorites from public, anon, authenticated;
grant select, insert, delete on public.user_favorites to authenticated;
create policy "favorites owner read" on public.user_favorites for select to authenticated
  using (user_id = (select auth.uid()));
create policy "favorites owner add active products" on public.user_favorites for insert to authenticated
  with check (user_id = (select auth.uid()) and exists (
    select 1 from public.products p where p.id = product_id and p.state = 'active'
  ));
create policy "favorites owner remove" on public.user_favorites for delete to authenticated
  using (user_id = (select auth.uid()));

-- Identity collection is explicitly disabled until an operator enables the local/production feature gate.
create table public.identity_document_settings (
  singleton boolean primary key default true check (singleton),
  enabled boolean not null default false
);
insert into public.identity_document_settings(singleton, enabled) values (true, false);
revoke all on table public.identity_document_settings from public, anon, authenticated;

create function public.identity_documents_enabled()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select s.enabled from public.identity_document_settings s where s.singleton), false)
$$;

create table public.identity_document_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  requested_by uuid not null references auth.users(id),
  status text not null default 'requested'
    check (status in ('requested', 'pending_review', 'approved', 'rejected', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id),
  check ((status in ('approved', 'rejected')) = (reviewed_at is not null and reviewed_by is not null))
);
create index identity_document_requests_user_idx on public.identity_document_requests(user_id, created_at desc);
create index identity_document_requests_review_idx on public.identity_document_requests(status, created_at)
  where status = 'pending_review';
create unique index identity_document_one_open_request_idx on public.identity_document_requests(user_id)
  where status in ('requested', 'pending_review');
alter table public.identity_document_requests enable row level security;
revoke all on table public.identity_document_requests from public, anon, authenticated;
grant select on public.identity_document_requests to authenticated;
create policy "identity document request owner and staff read" on public.identity_document_requests for select to authenticated
  using (user_id = (select auth.uid()) or public.current_app_role() in ('staff', 'admin'));

create table public.identity_document_events (
  id bigint generated always as identity primary key,
  request_id uuid not null references public.identity_document_requests(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  from_status text,
  to_status text not null,
  created_at timestamptz not null default now()
);
create index identity_document_events_request_idx on public.identity_document_events(request_id, created_at);
alter table public.identity_document_events enable row level security;
revoke all on table public.identity_document_events from public, anon, authenticated;
revoke all on sequence public.identity_document_events_id_seq from public, anon, authenticated;
grant select on public.identity_document_events to authenticated;
create policy "identity document event owner and staff read" on public.identity_document_events for select to authenticated
  using (exists (
    select 1 from public.identity_document_requests r where r.id = request_id
      and (r.user_id = (select auth.uid()) or public.current_app_role() in ('staff', 'admin'))
  ));

create function public.request_identity_document(p_user_id uuid)
returns public.identity_document_requests
language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid();
  v_request public.identity_document_requests%rowtype;
begin
  if v_actor is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  if not public.identity_documents_enabled() then raise exception 'Identity document collection is disabled'; end if;
  if public.current_app_role() not in ('staff', 'admin') then raise exception 'Staff access required' using errcode = '42501'; end if;
  if p_user_id is null or not exists (select 1 from auth.users u where u.id = p_user_id) then
    raise exception 'Customer was not found';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text || ':identity-document-request', 0));
  select * into v_request from public.identity_document_requests r
  where r.user_id = p_user_id and r.status in ('requested', 'pending_review')
  order by r.created_at desc limit 1 for update;
  if found then return v_request; end if;
  insert into public.identity_document_requests(user_id, requested_by)
    values (p_user_id, v_actor) returning * into v_request;
  insert into public.identity_document_events(request_id, actor_id, from_status, to_status)
    values (v_request.id, v_actor, null, 'requested');
  return v_request;
end;
$$;

create function public.submit_identity_document(p_request_id uuid)
returns public.identity_document_requests
language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid();
  v_request public.identity_document_requests%rowtype;
  v_metadata jsonb;
  v_object_name text;
begin
  if v_actor is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  if not public.identity_documents_enabled() then raise exception 'Identity document collection is disabled'; end if;
  select * into v_request from public.identity_document_requests r
  where r.id = p_request_id and r.user_id = v_actor for update;
  if not found or v_request.status <> 'requested' then raise exception 'Open identity document request was not found'; end if;
  v_object_name := v_actor::text || '/' || v_request.id::text;
  select o.metadata into v_metadata from storage.objects o
  where o.bucket_id = 'identity-documents' and o.name = v_object_name;
  if not found then raise exception 'Identity document upload is missing or invalid'; end if;
  if coalesce(v_metadata->>'mimetype', '') not in ('image/jpeg', 'image/png')
      or coalesce(v_metadata->>'size', '') !~ '^[0-9]+$' then
    raise exception 'Identity document upload is missing or invalid';
  end if;
  if length(v_metadata->>'size') > 7 then raise exception 'Identity document upload is missing or invalid'; end if;
  if (v_metadata->>'size')::integer not between 1 and 5242880 then
    raise exception 'Identity document upload is missing or invalid';
  end if;
  update public.identity_document_requests r set status = 'pending_review', updated_at = now()
  where r.id = v_request.id returning * into v_request;
  insert into public.identity_document_events(request_id, actor_id, from_status, to_status)
    values (v_request.id, v_actor, 'requested', 'pending_review');
  return v_request;
end;
$$;

create function public.delete_identity_document_request(p_request_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid();
  v_request public.identity_document_requests%rowtype;
begin
  if v_actor is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  select * into v_request from public.identity_document_requests r
  where r.id = p_request_id and r.user_id = v_actor for update;
  if not found or v_request.status not in ('requested', 'pending_review') then
    raise exception 'Pending identity document was not found';
  end if;
  update public.identity_document_requests r set status = 'cancelled', updated_at = now()
  where r.id = v_request.id;
  insert into public.identity_document_events(request_id, actor_id, from_status, to_status)
    values (v_request.id, v_actor, v_request.status, 'cancelled');
end;
$$;

create function public.review_identity_document(p_request_id uuid, p_decision text)
returns public.identity_document_requests
language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid();
  v_request public.identity_document_requests%rowtype;
  v_metadata jsonb;
  v_object_name text;
begin
  if v_actor is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  if not public.identity_documents_enabled() then raise exception 'Identity document collection is disabled'; end if;
  if public.current_app_role() not in ('staff', 'admin') then raise exception 'Staff access required' using errcode = '42501'; end if;
  if p_decision is null or p_decision not in ('approved', 'rejected') then raise exception 'Invalid identity document decision'; end if;
  select * into v_request from public.identity_document_requests r where r.id = p_request_id for update;
  if not found or v_request.status <> 'pending_review' then raise exception 'Pending identity document was not found'; end if;
  if v_request.user_id = v_actor then raise exception 'Document subject cannot review their own request'; end if;
  v_object_name := v_request.user_id::text || '/' || v_request.id::text;
  select o.metadata into v_metadata from storage.objects o
  where o.bucket_id = 'identity-documents' and o.name = v_object_name;
  if not found then raise exception 'Identity document upload is missing or invalid'; end if;
  if coalesce(v_metadata->>'mimetype', '') not in ('image/jpeg', 'image/png')
      or coalesce(v_metadata->>'size', '') !~ '^[0-9]+$' then
    raise exception 'Identity document upload is missing or invalid';
  end if;
  if length(v_metadata->>'size') > 7 then raise exception 'Identity document upload is missing or invalid'; end if;
  if (v_metadata->>'size')::integer not between 1 and 5242880 then
    raise exception 'Identity document upload is missing or invalid';
  end if;
  update public.identity_document_requests r set status = p_decision, updated_at = now(),
    reviewed_at = now(), reviewed_by = v_actor
  where r.id = v_request.id returning * into v_request;
  insert into public.identity_document_events(request_id, actor_id, from_status, to_status)
    values (v_request.id, v_actor, 'pending_review', p_decision);
  return v_request;
end;
$$;

-- Private bucket. The server action validates bytes before uploading with service-role credentials.
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('identity-documents', 'identity-documents', false, 5242880, array['image/jpeg', 'image/png']::text[])
on conflict (id) do update set name = excluded.name, public = false,
  file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Restrictive policies prevent any pre-existing broad Storage policies from admitting client writes or public reads.
create policy "identity documents block anonymous reads" on storage.objects as restrictive for select to anon
  using (bucket_id <> 'identity-documents');
create policy "identity documents block anonymous inserts" on storage.objects as restrictive for insert to anon
  with check (bucket_id <> 'identity-documents');
create policy "identity documents block anonymous updates" on storage.objects as restrictive for update to anon
  using (bucket_id <> 'identity-documents') with check (bucket_id <> 'identity-documents');
create policy "identity documents block anonymous deletes" on storage.objects as restrictive for delete to anon
  using (bucket_id <> 'identity-documents');

create policy "identity documents limit authenticated reads" on storage.objects as restrictive for select to authenticated
  using (bucket_id <> 'identity-documents' or (
    exists (
      select 1 from public.identity_document_requests r
      where r.user_id::text || '/' || r.id::text = name
        and ((r.user_id = (select auth.uid()) and r.status in ('requested', 'pending_review'))
          or (public.current_app_role() in ('staff', 'admin') and r.status = 'pending_review'))
    )
  ));
create policy "identity documents client uploads denied" on storage.objects as restrictive for insert to authenticated
  with check (bucket_id <> 'identity-documents');
create policy "identity documents client updates denied" on storage.objects as restrictive for update to authenticated
  using (bucket_id <> 'identity-documents') with check (bucket_id <> 'identity-documents');
create policy "identity documents limit authenticated deletes" on storage.objects as restrictive for delete to authenticated
  using (bucket_id <> 'identity-documents' or (
    exists (
      select 1 from public.identity_document_requests r
      where r.user_id::text || '/' || r.id::text = name
        and r.user_id = (select auth.uid()) and r.status in ('requested', 'cancelled')
    )
  ));
create policy "identity document owner and staff reads" on storage.objects for select to authenticated
  using (bucket_id = 'identity-documents' and exists (
    select 1 from public.identity_document_requests r
    where r.user_id::text || '/' || r.id::text = name
      and ((r.user_id = (select auth.uid()) and r.status in ('requested', 'pending_review'))
        or (public.current_app_role() in ('staff', 'admin') and r.status = 'pending_review'))
  ));
create policy "identity document owner pending deletes" on storage.objects for delete to authenticated
  using (bucket_id = 'identity-documents' and exists (
    select 1 from public.identity_document_requests r
    where r.user_id::text || '/' || r.id::text = name
      and r.user_id = (select auth.uid()) and r.status in ('requested', 'cancelled')
  ));

revoke all on function public.save_customer_address(uuid, text, text, text, text, text, text, text, boolean) from public, anon, authenticated;
revoke all on function public.delete_customer_address(uuid) from public, anon, authenticated;
revoke all on function public.identity_documents_enabled() from public, anon, authenticated;
revoke all on function public.request_identity_document(uuid) from public, anon, authenticated;
revoke all on function public.submit_identity_document(uuid) from public, anon, authenticated;
revoke all on function public.delete_identity_document_request(uuid) from public, anon, authenticated;
revoke all on function public.review_identity_document(uuid, text) from public, anon, authenticated;
grant execute on function public.save_customer_address(uuid, text, text, text, text, text, text, text, boolean) to authenticated;
grant execute on function public.delete_customer_address(uuid) to authenticated;
grant execute on function public.identity_documents_enabled() to authenticated;
grant execute on function public.request_identity_document(uuid) to authenticated;
grant execute on function public.submit_identity_document(uuid) to authenticated;
grant execute on function public.delete_identity_document_request(uuid) to authenticated;
grant execute on function public.review_identity_document(uuid, text) to authenticated;

comment on table public.customer_addresses is 'Private user-owned saved rental recipient and delivery addresses.';
comment on table public.user_favorites is 'Private user-owned product favorites.';
comment on table public.identity_document_requests is 'Staff-requested optional identity uploads with controlled review state.';
comment on table public.identity_document_events is 'Append-only actor/status audit for identity document requests; contains no document contents.';
