-- REQ-092: lock Supabase's public Data API out of every table.
--
-- Before this, the `anon` and `authenticated` roles -- the ones Supabase's
-- REST/GraphQL API uses for anyone holding the project's anon key -- could
-- read every table in `public`, including password hashes, refresh tokens,
-- MFA secrets and learners' answers. Only 7 catalog tables had RLS on.
--
-- The app never uses that API. The backend connects directly as `postgres`,
-- which has BYPASSRLS, so it is unaffected by anything here. This migration
-- therefore denies the API completely rather than writing per-user policies:
--   1. RLS on (no policies = no rows) for every table, current and future.
--   2. All privileges revoked from anon/authenticated on tables, views,
--      sequences and functions. Views need this because a view runs as its
--      owner and would otherwise skip the tables' RLS.
--   3. Default privileges revoked so tables created later start locked too.
-- If a client-side Supabase feature is ever added, grant and write policies
-- for exactly what it needs at that point.

do $$
declare r record;
begin
  for r in
    select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p')
  loop
    execute format('alter table public.%I enable row level security', r.relname);
  end loop;
end $$;

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from anon, authenticated;

alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on functions from anon, authenticated;
