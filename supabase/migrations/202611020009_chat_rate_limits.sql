-- Store only keyed hashes for fixed-window chat quotas. Conversation content and raw IPs are never
-- written to the database. Both IP and authenticated-user quotas are charged atomically.
create table public.chat_rate_limits (
  scope text not null check (scope in ('ip', 'user')),
  identity_hash text not null check (identity_hash ~ '^[0-9a-f]{64}$'),
  window_started_at timestamptz not null,
  request_count integer not null check (request_count > 0),
  primary key (scope, identity_hash)
);
alter table public.chat_rate_limits enable row level security;
revoke all on public.chat_rate_limits from public, anon, authenticated;

create or replace function public.consume_chat_rate_limit(
  p_ip_hash text,
  p_user_hash text
) returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_ip_count integer;
  v_user_count integer;
begin
  if auth.role() <> 'service_role'
    or p_ip_hash is null
    or p_ip_hash !~ '^[0-9a-f]{64}$'
    or (p_user_hash is not null and p_user_hash !~ '^[0-9a-f]{64}$')
    then
    raise exception 'Invalid chat quota request';
  end if;

  insert into public.chat_rate_limits(scope, identity_hash, window_started_at, request_count)
    values ('ip', p_ip_hash, now(), 1)
  on conflict (scope, identity_hash) do update set
    window_started_at = case
      when chat_rate_limits.window_started_at + interval '60 seconds' <= now() then now()
      else chat_rate_limits.window_started_at end,
    request_count = case
      when chat_rate_limits.window_started_at + interval '60 seconds' <= now() then 1
      else chat_rate_limits.request_count + 1 end
  returning request_count into v_ip_count;

  if p_user_hash is not null then
    insert into public.chat_rate_limits(scope, identity_hash, window_started_at, request_count)
      values ('user', p_user_hash, now(), 1)
    on conflict (scope, identity_hash) do update set
      window_started_at = case
        when chat_rate_limits.window_started_at + interval '60 seconds' <= now() then now()
        else chat_rate_limits.window_started_at end,
      request_count = case
        when chat_rate_limits.window_started_at + interval '60 seconds' <= now() then 1
        else chat_rate_limits.request_count + 1 end
    returning request_count into v_user_count;
  else
    v_user_count := 1;
  end if;

  if random() < 0.01 then
    delete from public.chat_rate_limits
      where window_started_at < now() - interval '2 hours';
  end if;
  return v_ip_count <= 12 and v_user_count <= 12;
end;
$$;
revoke all on function public.consume_chat_rate_limit(text, text) from public, anon, authenticated;
grant execute on function public.consume_chat_rate_limit(text, text) to service_role;
