-- Release 2026-11-07: reconcile line A (integration/all, 027a-051) with line
-- B (PRs #5-#13; 025_lesson_choice_feedback, 026_enable_rls and
-- 027_legal_acceptances_and_content_reports, which production has already
-- run). See docs/release-2026-11-07.md.
--
-- 1. One record of legal acceptance. B's legal_acceptances (one row per
--    document and version) is kept; it gains A's `source` (how the account
--    agreed: register / google_signup / prompt). Any rows in A's
--    terms_acceptances (048) are copied in as a Terms row and a Privacy row
--    at the version they accepted, then that table is dropped. Old code
--    (master @ c3e13ab) reads neither table.
-- 2. One per-option explanation. A's *_option_reasons (034) is kept; B's
--    *_choice_feedback (025) is copied into it where A's is empty and the
--    list matches the choices one-for-one, then B's columns are dropped.
--    Old code reads neither.
-- 3. B's 026 lock-out, applied again for every table created since it ran
--    (027a-051 on production; on a fresh database everything after 026):
--    RLS on for every table in public, and anon / authenticated stripped of
--    every privilege. The backend connects as the table owner (postgres),
--    which RLS does not restrict, so nothing the app does changes.
--
-- Safe to run twice. Instant on production's size (3 accounts); every
-- statement is catalog-only or touches the handful of rows involved.

set local lock_timeout = '5s';

-- 1. Legal acceptances --------------------------------------------------------

alter table legal_acceptances
  add column if not exists source text;
alter table legal_acceptances drop constraint if exists legal_acceptances_source_052;
alter table legal_acceptances
  add constraint legal_acceptances_source_052
  check (source is null or source in ('register', 'google_signup', 'prompt'));

do $$
begin
  if to_regclass('public.terms_acceptances') is not null then
    insert into legal_acceptances (user_id, document, version, accepted_at, source)
    select t.user_id, d.document, left(t.terms_version, 20), t.accepted_at, t.source
      from terms_acceptances t
     cross join (values ('terms'), ('privacy')) as d(document)
    on conflict (user_id, document, version) do nothing;
    drop table terms_acceptances;
  end if;
end $$;

-- 2. Per-option explanations --------------------------------------------------

do $$
declare
  t text;
  p text;
begin
  foreach t in array array['lesson_content', 'lesson_content_overrides'] loop
    foreach p in array array['fade', 'solo'] loop
      if exists (select 1 from information_schema.columns
                  where table_schema = 'public' and table_name = t and column_name = p || '_choice_feedback') then
        execute format(
          'update %1$I set %2$s_option_reasons = %2$s_choice_feedback
            where %2$s_option_reasons is null
              and jsonb_typeof(%2$s_choice_feedback) = ''array''
              and jsonb_typeof(to_jsonb(%2$s_choices)) = ''array''
              and jsonb_array_length(%2$s_choice_feedback) = jsonb_array_length(to_jsonb(%2$s_choices))',
          t, p);
        execute format('alter table %I drop column %I', t, p || '_choice_feedback');
      end if;
    end loop;
  end loop;
end $$;

-- 3. Supabase Data API lock-out (as 026) --------------------------------------

do $$
declare r record;
begin
  for r in
    select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity
  loop
    execute format('alter table public.%I enable row level security', r.relname);
  end loop;
end $$;

do $$
begin
  -- The roles exist on Supabase; a plain Postgres (CI, local) may not have them.
  if exists (select 1 from pg_roles where rolname = 'anon')
     and exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on all tables in schema public from anon, authenticated;
    revoke all on all sequences in schema public from anon, authenticated;
    revoke all on all functions in schema public from anon, authenticated;
  end if;
end $$;
