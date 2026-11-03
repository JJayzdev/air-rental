-- GĐ6 chat quota: persistent fixed windows, independent IP/user dimensions, private service RPC.
create extension if not exists pgtap with schema extensions;
begin;
select plan(8);
set local role postgres;

select ok(not has_table_privilege('anon', 'public.chat_rate_limits', 'SELECT')
  and not has_table_privilege('authenticated', 'public.chat_rate_limits', 'SELECT')
  and not has_table_privilege('anon', 'public.chat_rate_limits', 'INSERT')
  and not has_table_privilege('authenticated', 'public.chat_rate_limits', 'INSERT'),
  'quota identity hashes and counters are private');
select ok(not has_function_privilege('anon', 'public.consume_chat_rate_limit(text,text)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.consume_chat_rate_limit(text,text)', 'EXECUTE')
  and has_function_privilege('service_role', 'public.consume_chat_rate_limit(text,text)', 'EXECUTE'),
  'only the server service role can charge quotas');

set local role service_role;
select set_config('request.jwt.claim.role', 'service_role', true);
select is((select bool_and(public.consume_chat_rate_limit(
    repeat('a', 64), lpad(to_hex(n), 64, '0')))
  from generate_series(1, 12) as n), true,
  'the IP quota permits its first twelve requests');
select is(public.consume_chat_rate_limit(repeat('a', 64), repeat('b', 64)), false,
  'the thirteenth request is denied even with a new user identity');

select is((select bool_and(public.consume_chat_rate_limit(
    lpad(to_hex(n), 64, '0'), repeat('c', 64)))
  from generate_series(1, 12) as n), true,
  'the user quota permits its first twelve requests across IPs');
select is(public.consume_chat_rate_limit(repeat('d', 64), repeat('c', 64)), false,
  'the thirteenth request is denied even from a new IP');

update public.chat_rate_limits
set window_started_at = now() - interval '61 seconds', request_count = 12
where scope = 'ip' and identity_hash = repeat('a', 64);
select is(public.consume_chat_rate_limit(repeat('a', 64), repeat('e', 64)), true,
  'a request after the fixed window resets and is allowed');
select ok(not exists (
  select 1 from public.chat_rate_limits where identity_hash !~ '^[0-9a-f]{64}$'
), 'stored identities match the fixed-length hash format rather than raw client identifiers');

select * from finish();
rollback;
