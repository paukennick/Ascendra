-- REQ-117: Audit 3 teaching-science and mastery-integrity fixes (owner goal:
-- depth is "the weighted accuracy throughout all types of assessments", and
-- the numbers a learner sees must be honest). Schema, tuning values and
-- functions only; the backup and the recompute of every learner are in
-- 045b_mastery_honesty_backfill.sql, which the runner applies straight after
-- this file in its own transaction.
--
-- DEPLOY ORDER: docs/deploy-runbook-integration.md (migrate in a quiet
-- window, deploy the backend, `call recompute_mastery_batched();`, publish
-- the app).
--
-- LOCKING. lock_timeout 5 s like 031/041: two columns with defaults on the
-- small assessment_types table, a handful of rows in mastery_model_params,
-- one new small table (grading_claims), CREATE OR REPLACE FUNCTION, and two
-- partial indexes on attempts (section 2b: a SHARE lock while they build, so
-- reads go on and attempt inserts wait; timing in the runbook). Nothing here
-- rewrites attempts.
--
-- WHAT CHANGES IN THE RULE (mastery_detail). Each item names its Audit 3
-- finding and has a regression test in lib/mastery-honesty.dbtest.ts.
--
-- 1. (T1, A1) Unit-wide answers (PBQs, unit checks) are accuracy only. They
--    never count as format evidence: one unit PBQ used to give every studied
--    objective of the unit a second format family, so a single scenario made
--    40 objectives Transfer-ready. Their weight is also spread over the
--    unit: unit_scope_factor x min(1, unit_scope_ref_objectives / objectives
--    in the unit). And a unit-wide answer to a scenario or unit-check item
--    the learner already answered (and so saw graded, with the model answer)
--    is a 'repeat', as a lesson item is -- the stored flag alone said
--    "unassisted" for a pasted-back model answer.
-- 2. (T5) Help lowers an answer's WEIGHT, not its credit. A correct repeat
--    used to count as three-quarters wrong (credit 0.25 at full weight), so
--    practice that went well demoted a learner. Now hint and repeat earn full
--    credit at assist_weight_hint / assist_weight_repeat of the weight, and
--    only the latest repeat of each item counts at all, so repeating one item
--    cannot pile up accuracy either. Help still never counts as format
--    evidence.
-- 3. (T7, A4) Comparison cards (discrimination: pick one of 2-4) count toward
--    Transfer-ready's second format but never open Independent on their own
--    (new column assessment_types.opens_independent). Two lucky coin flips
--    used to make an objective Independent.
-- 4. (T12) Transfer-ready needs its last format win to be SPACED (a day or
--    more after the previous answer) and the first and last wins
--    transfer_min_gap_hours (now 72) apart; explain-back counts as format
--    evidence only when it is spaced (new column win_needs_spacing). A lesson
--    plus explain-back, then one review the next day, was Transfer-ready one
--    day after first seeing the material.
-- 5. (T15) Guided needs a credited answer that is not a placement guess (a
--    4-option placement question is a 25% guess and is taken before any
--    teaching; placement-tested objectives are "confirm" steps in the plan
--    instead). Help is allowed: a correct answer with help is what Guided
--    means. Needs review needs answers on at least two different days (not
--    before the first review), so one rough first lesson is not labelled a
--    failure.
-- 6. (T13) independent_accuracy 0.60 -> 0.70, transfer_accuracy 0.75 -> 0.80
--    (after 2 and 3, which stop help and coin flips from moving accuracy).
-- 7. (T3) recency_half_life_days 60 -> 30.
--
-- REQ-114 (migration 042) is kept: every attempt selection leaves out voided
-- answers (`a.voided_at is null`, answers to an item later confirmed wrong),
-- and so does the first-miss lookup behind the review-retest factor.
--
-- ALSO HERE
--   review_state(user, objective): the one definition of "kept" and "due to
--     re-check" that the plan (lib/study-plan-store.ts) and readiness
--     (lib/readiness.ts) both read (T2, T3, T6, T8):
--       kept       from answers given when a review was DUE, unaided
--                  (review_log.was_due and not assisted, enrolled), the last
--                  up to 3: kept when the latest is correct and at least 2 of
--                  the last 3 are; slipped otherwise; unchecked when none.
--                  It used to be the latest spaced answer of any kind, so a
--                  miss re-asked the next day until a guess landed read
--                  "kept" (a 25% guesser kept 31 of 36).
--       recheck_due  the scheduled review is a full interval overdue.
--       retention  1 up to the due date, then 10S / (9S + t) for t days since
--                  the last review and S the current interval: the FSRS
--                  power forgetting curve (R = (1 + t/9S)^-1) scaled so it is
--                  1 at the due date. Readiness multiplies by it, so it falls
--                  with absence; levels do not decay.
--   grading_claims (A9): one row per (learner, client attempt id) while it is
--     being graded, so racing copies of one submission call the model once.
--
-- Tuning values change only where they still hold the value an earlier
-- migration set, so a value tuned by hand is never overwritten. Safe to run
-- twice: IF NOT EXISTS / ON CONFLICT DO NOTHING / CREATE OR REPLACE.

set local lock_timeout = '5s';

-- 1. Tuning ----------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from information_schema.columns
                  where table_schema = 'public' and table_name = 'assessment_types' and column_name = 'opens_independent') then
    alter table assessment_types add column opens_independent boolean not null default true;
    update assessment_types set opens_independent = false where type_name = 'discrimination';
  end if;
  if not exists (select 1 from information_schema.columns
                  where table_schema = 'public' and table_name = 'assessment_types' and column_name = 'win_needs_spacing') then
    alter table assessment_types add column win_needs_spacing boolean not null default false;
    update assessment_types set win_needs_spacing = true where type_name = 'explain_back';
  end if;
end $$;

comment on column assessment_types.opens_independent is
  'REQ-117: false = a correct unassisted answer of this type counts toward Transfer-ready''s format families but never opens Independent on its own (discrimination: chosen from 2-4 options).';
comment on column assessment_types.win_needs_spacing is
  'REQ-117: true = an answer of this type is format evidence only when spaced, a day or more after the previous answer on the objective (explain_back: straight after the lesson it restates the example just taught).';

insert into mastery_model_params (name, value, note) values
  ('assist_weight_hint', 0.5, 'REQ-117: weight multiplier for an answer given with the choices on screen (assist_reason hint). Credit stays full: help means weaker evidence, not a wrong answer.'),
  ('assist_weight_repeat', 0.25, 'REQ-117: weight multiplier for an answer to an item already answered and graded (assist_reason repeat). Only the latest repeat of each item counts.'),
  ('unit_scope_ref_objectives', 4, 'REQ-117: a unit-wide answer counts toward one objective at unit_scope_factor x min(1, this / objectives in the unit), so a scenario on a 40-objective unit is not worth as much per objective as one on a 4-objective unit.'),
  ('readiness_min_kept_share', 0.7, 'REQ-117: course readiness reads "ready" only when at least this blueprint-weighted share of objectives is kept (confirmed by an unaided correct answer at a due review) and not due to re-check.'),
  ('readiness_unconfirmed_cap', 0.6, 'REQ-117: an objective''s readiness is at most this until it is Independent or above AND kept.')
on conflict (name) do nothing;

update mastery_model_params set value = 1,
       note = 'Credit multiplier when the choices were on screen (hint). REQ-117: 1 -- help lowers the weight (assist_weight_hint), not the credit.'
 where name = 'assist_credit_hint' and value = 0.5;
update mastery_model_params set value = 1,
       note = 'Credit multiplier for an item already answered (repeat). REQ-117: 1 -- help lowers the weight (assist_weight_repeat), not the credit.'
 where name = 'assist_credit_repeat' and value = 0.25;
update mastery_model_params set value = 0.70,
       note = 'Weighted accuracy needed for Independent. REQ-117: 0.70 (was 0.60).'
 where name = 'independent_accuracy' and value = 0.60;
update mastery_model_params set value = 0.80,
       note = 'Weighted accuracy needed for Transfer-ready. REQ-117: 0.80 (was 0.75).'
 where name = 'transfer_accuracy' and value = 0.75;
update mastery_model_params set value = 72,
       note = 'First and last format wins at least this far apart for Transfer-ready, and the last one spaced. REQ-117: 72 h (was 24).'
 where name = 'transfer_min_gap_hours' and value = 24;
update mastery_model_params set value = 30,
       note = 'An answer this many days old counts half as much as one from today. REQ-117: 30 (was 60).'
 where name = 'recency_half_life_days' and value = 60;

-- 2. grading_claims (A9) ------------------------------------------------------------

-- Held while one submission (learner, client attempt id) is being graded, so
-- a second copy of it waits for the first's stored result instead of calling
-- the model again. Released (deleted) when grading ends either way; a claim
-- older than its expiry is taken over (lib/grading-claims.ts).
create table if not exists grading_claims (
    user_id uuid not null references app_users(id) on delete cascade,
    client_attempt_id varchar(100) not null,
    token uuid not null,
    claimed_at timestamptz not null default now(),
    primary key (user_id, client_attempt_id)
);

-- 2b. Indexes for the unit-wide lookups (perf audit HIGH-2) ---------------------
-- Partial, so they hold only the rows that have a scenario or item. Built
-- inside the migration transaction (the runner applies each file in one), so
-- inserts into attempts wait while they build; measured on the 1.9M-attempt
-- fixture in docs/deploy-runbook-integration.md.
create index if not exists idx_attempts_user_pbq_scenario
  on attempts (user_id, pbq_scenario_id) where pbq_scenario_id is not null;
create index if not exists idx_attempts_user_unit_check_item
  on attempts (user_id, unit_check_item_id) where unit_check_item_id is not null;

-- 3. The rule ----------------------------------------------------------------------

create or replace function mastery_detail(p_user uuid, p_objective uuid)
returns table (
  status mastery_status,
  score int,
  evidence text,
  weighted_accuracy numeric,
  readiness_score numeric,
  evidence_weight numeric,
  answers int,
  direct_answers int,
  formats text[]
)
language sql stable as $$
  with p as (
    select
      max(value) filter (where name = 'partial_credit') as partial_credit,
      max(value) filter (where name = 'assist_credit_hint') as assist_credit_hint,
      max(value) filter (where name = 'assist_credit_reveal') as assist_credit_reveal,
      max(value) filter (where name = 'assist_credit_repeat') as assist_credit_repeat,
      max(value) filter (where name = 'assist_credit_retry') as assist_credit_retry,
      max(value) filter (where name = 'assist_weight_retry') as assist_weight_retry,
      coalesce(max(value) filter (where name = 'assist_weight_hint'), 1) as assist_weight_hint,
      coalesce(max(value) filter (where name = 'assist_weight_repeat'), 1) as assist_weight_repeat,
      max(value) filter (where name = 'spacing_gap_hours') as spacing_gap_hours,
      max(value) filter (where name = 'spacing_factor') as spacing_factor,
      max(value) filter (where name = 'review_retest_factor') as review_retest_factor,
      max(value) filter (where name = 'recency_half_life_days') as recency_half_life_days,
      max(value) filter (where name = 'unit_scope_factor') as unit_scope_factor,
      coalesce(max(value) filter (where name = 'unit_scope_ref_objectives'), 1e9) as unit_scope_ref_objectives,
      max(value) filter (where name = 'independent_accuracy') as independent_accuracy,
      max(value) filter (where name = 'transfer_accuracy') as transfer_accuracy,
      max(value) filter (where name = 'transfer_min_formats') as transfer_min_formats,
      max(value) filter (where name = 'transfer_min_gap_hours') as transfer_min_gap_hours,
      max(value) filter (where name = 'needs_review_accuracy') as needs_review_accuracy,
      max(value) filter (where name = 'needs_review_min_attempts') as needs_review_min_attempts,
      max(value) filter (where name = 'readiness_full_evidence') as readiness_full_evidence
    from mastery_model_params
  ), obj as (
    select o.unit_id,
           (select count(*) from objectives o2
             where o2.unit_id = o.unit_id and (o2.retired_at is null or o2.retired_at > now())) as unit_objectives
      from objectives o where o.id = p_objective
  ), ev as (
    -- Direct answers: unchanged from 041.
    select a.id, a.created_at, a.verdict, a.pbq_scenario_id, a.unit_check_item_id, a.question,
           case
             when a.assist_reason = 'retry' then 'retry'
             when a.assisted then coalesce(a.assist_reason, 'hint')
             when a.stage = 'solo' and a.format = 'mc' then 'hint'
             when a.stage = 'solo' and exists (
               select 1 from lesson_hint_reveals h
                where h.user_id = a.user_id and h.objective_id = a.objective_id
                  and h.item_key = lesson_item_key(a.stage, a.question)
                  and h.revealed_at <= a.created_at) then 'hint'
             when a.stage in ('fade', 'solo') and exists (
               select 1 from attempts r
                where r.user_id = a.user_id and r.objective_id = a.objective_id
                  and r.stage = a.stage and r.question = a.question
                  and (r.created_at, r.id) < (a.created_at, a.id)) then 'repeat'
           end as assist,
           false as via_unit,
           attempt_type_of(a.kind, a.stage, a.format, a.assessment_type) as type_name
      from attempts a
     where a.user_id = p_user and a.objective_id = p_objective
       and a.format <> 'pbq' and a.verdict is not null and a.voided_at is null and a.kind <> 'lab'
       and (a.kind = 'lesson' or a.assessment_type is not null)
    union all
    -- Unit-wide answers. (1) A second answer to the same scenario or
    -- unit-check item is a repeat, derived from history like a lesson item.
    select a.id, a.created_at, a.verdict, a.pbq_scenario_id, a.unit_check_item_id, a.question,
           case when a.assist_reason = 'retry' then 'retry'
                when a.assisted then coalesce(a.assist_reason, 'hint')
                -- two indexed lookups, not one OR (perf audit HIGH-2)
                when a.pbq_scenario_id is not null and exists (
                  select 1 from attempts r
                   where r.user_id = a.user_id and r.pbq_scenario_id = a.pbq_scenario_id
                     and r.objective_id is null and r.verdict is not null
                     and (r.created_at, r.id) < (a.created_at, a.id)) then 'repeat'
                when a.unit_check_item_id is not null and exists (
                  select 1 from attempts r
                   where r.user_id = a.user_id and r.unit_check_item_id = a.unit_check_item_id
                     and r.objective_id is null and r.verdict is not null
                     and (r.created_at, r.id) < (a.created_at, a.id)) then 'repeat'
           end as assist,
           true as via_unit,
           attempt_type_of(a.kind, a.stage, a.format, a.assessment_type) as type_name
      from attempts a
      join obj on true
      left join pbq_scenarios sc on sc.id = a.pbq_scenario_id
      join assessment_types ut on ut.type_name = attempt_type_of(a.kind, a.stage, a.format, a.assessment_type)
     where a.user_id = p_user and a.objective_id is null
       and a.verdict is not null and a.voided_at is null and a.kind <> 'lab'
       and ut.unit_scope
       and ((a.kind = 'pbq' and a.format = 'pbq') or a.assessment_type is not null)
       and coalesce(a.unit_id, sc.unit_id) = obj.unit_id
  ), t0 as (
    select ev.*, ty.format_family, ty.cognitive_weight, ty.application_level,
           ty.spacing_evidence, ty.min_format_wins, ty.opens_independent, ty.win_needs_spacing
      from ev
      join assessment_types ty on ty.type_name = ev.type_name
     where ty.cognitive_weight > 0
  ), miss as materialized (
    -- The first day each thing was missed: this objective (direct answers),
    -- and each PBQ scenario / unit-check item among the unit-wide answers.
    -- Three indexed lookups, read once, instead of an EXISTS per answer whose
    -- OR of the three could only use the user_id index prefix -- quadratic in
    -- the learner's history (perf audit HIGH-2: 10 s for one objective of a
    -- 26k-attempt learner). Same rows as 041's review_retest.
    select 'o'::text as k, null::uuid as ref, min((r.created_at at time zone 'UTC')::date) as first_day
      from attempts r
      join assessment_types rt on rt.type_name = attempt_type_of(r.kind, r.stage, r.format, r.assessment_type)
     where r.user_id = p_user and r.objective_id = p_objective and r.verdict in ('partial', 'incorrect') and r.voided_at is null
       and r.kind <> 'lab' and (r.kind in ('lesson', 'pbq') or r.assessment_type is not null)
       and rt.cognitive_weight > 0 and rt.spacing_evidence
    union all
    select 's', r.pbq_scenario_id, min((r.created_at at time zone 'UTC')::date)
      from attempts r
      join assessment_types rt on rt.type_name = attempt_type_of(r.kind, r.stage, r.format, r.assessment_type)
     where r.user_id = p_user
       and r.pbq_scenario_id in (select t0.pbq_scenario_id from t0 where t0.via_unit and t0.pbq_scenario_id is not null)
       and r.verdict in ('partial', 'incorrect') and r.voided_at is null
       and r.kind <> 'lab' and (r.kind in ('lesson', 'pbq') or r.assessment_type is not null)
       and rt.cognitive_weight > 0 and rt.spacing_evidence
     group by r.pbq_scenario_id
    union all
    select 'u', r.unit_check_item_id, min((r.created_at at time zone 'UTC')::date)
      from attempts r
      join assessment_types rt on rt.type_name = attempt_type_of(r.kind, r.stage, r.format, r.assessment_type)
     where r.user_id = p_user
       and r.unit_check_item_id in (select t0.unit_check_item_id from t0 where t0.via_unit and t0.unit_check_item_id is not null)
       and r.verdict in ('partial', 'incorrect') and r.voided_at is null
       and r.kind <> 'lab' and (r.kind in ('lesson', 'pbq') or r.assessment_type is not null)
       and rt.cognitive_weight > 0 and rt.spacing_evidence
     group by r.unit_check_item_id
  ), t as (
    select t0.*,
           max(case when t0.spacing_evidence then t0.created_at end)
             over (order by t0.created_at, t0.id rows between unbounded preceding and 1 preceding) as prev_at,
           t0.spacing_evidence and exists (
             select 1 from miss m
              where m.first_day < (t0.created_at at time zone 'UTC')::date
                and ((not t0.via_unit and m.k = 'o')
                  or (t0.via_unit and m.k = 's' and m.ref = t0.pbq_scenario_id)
                  or (t0.via_unit and m.k = 'u' and m.ref = t0.unit_check_item_id))
           ) as review_retest,
           ((now() at time zone 'UTC')::date - (t0.created_at at time zone 'UTC')::date) as age_days,
           -- (2) only the latest repeat of an item counts
           case when t0.assist = 'repeat'
                then row_number() over (
                       partition by t0.assist = 'repeat',
                                    case when t0.via_unit then coalesce(t0.pbq_scenario_id::text, t0.unit_check_item_id::text, t0.id::text)
                                         else t0.type_name || ':' || t0.question end
                       order by t0.created_at desc, t0.id desc)
           end as repeat_rank,
           ((t0.created_at at time zone 'UTC')::date) as day
      from t0
  ), w as (
    select t.*,
           (t.spacing_evidence and t.prev_at is not null
             and extract(epoch from t.created_at - t.prev_at) >= p.spacing_gap_hours * 3600) as spaced,
           (case t.verdict when 'correct' then 1 when 'partial' then p.partial_credit else 0 end)
           * (case
                when t.assist is null then 1
                when t.assist = 'retry' then p.assist_credit_retry
                when t.assist = 'repeat' then p.assist_credit_repeat
                when t.assist = 'reveal' then p.assist_credit_reveal
                else p.assist_credit_hint
              end) as credit,
           t.cognitive_weight
           * (case
                when t.assist = 'retry' then p.assist_weight_retry
                when t.assist = 'repeat' then (case when t.repeat_rank = 1 then p.assist_weight_repeat else 0 end)
                when t.assist = 'hint' then p.assist_weight_hint
                else 1
              end)
           * (case when t.via_unit
                   then p.unit_scope_factor * least(1, p.unit_scope_ref_objectives / greatest((select unit_objectives from obj), 1))
                   else 1 end)
           * (case when t.spacing_evidence and t.prev_at is not null
                    and extract(epoch from t.created_at - t.prev_at) >= p.spacing_gap_hours * 3600
                   then p.spacing_factor else 1 end)
           * (case when t.review_retest then p.review_retest_factor else 1 end)
           * power(0.5::numeric, greatest(t.age_days, 0)::numeric / p.recency_half_life_days) as weight
      from t cross join p
  ), w2 as (
    select w.*,
           -- (1) unit-wide answers are never format evidence; (4) a type that
           -- needs spacing is format evidence only when spaced
           (w.verdict = 'correct' and w.assist is null and w.application_level and not w.via_unit
             and (not w.win_needs_spacing or w.spaced)) as win_raw
      from w
  ), qualified as (
    select type_name
      from w2
     where win_raw
     group by type_name
    having count(distinct coalesce(question, id::text)) >= max(min_format_wins)
  ), wq as (
    select w2.*, (w2.win_raw and w2.type_name in (select type_name from qualified)) as format_win
      from w2
  ), s as (
    select count(*)::int as n,
           count(*) filter (where not via_unit)::int as n_direct,
           count(*) filter (where not via_unit and assist is distinct from 'retry')::int as n_scored,
           count(distinct day) filter (where not via_unit and assist is distinct from 'retry')::int as n_days,
           coalesce(sum(weight), 0) as ew,
           coalesce(sum(weight * credit), 0) as ewc,
           -- (5) Guided: a credited direct answer that is not a placement guess
           -- (help is allowed: a correct answer with help is what Guided means)
           coalesce(bool_or(credit > 0 and not via_unit and type_name <> 'placement'), false) as guided_ok,
           -- (3) only a type that opens Independent does
           coalesce(bool_or(format_win and opens_independent), false) as direct_win,
           count(distinct format_family) filter (where format_win) as n_formats,
           array_agg(distinct format_family order by format_family) filter (where format_win) as fams,
           min(created_at) filter (where format_win) as first_win,
           max(created_at) filter (where format_win) as last_win,
           (select w3.spaced from wq w3 where w3.format_win order by w3.created_at desc, w3.id desc limit 1) as last_win_spaced,
           (select w2b.verdict from wq w2b where not w2b.via_unit and w2b.assist is distinct from 'retry'
               order by w2b.created_at desc, w2b.id desc limit 1) as last_direct_verdict
      from wq
  ), st as (
    select s.*, p.*, acc.acc,
           (case
              when s.n_direct = 0 then null
              when s.last_direct_verdict = 'incorrect' and s.n_scored >= p.needs_review_min_attempts
                   and s.n_days >= 2 and acc.acc < p.needs_review_accuracy then 'Needs review'
              when s.direct_win and acc.acc >= p.transfer_accuracy and s.n_formats >= p.transfer_min_formats
                   and coalesce(s.last_win_spaced, false)
                   and extract(epoch from s.last_win - s.first_win) >= p.transfer_min_gap_hours * 3600 then 'Transfer-ready'
              when s.direct_win and acc.acc >= p.independent_accuracy then 'Independent'
              when s.guided_ok then 'Guided'
              else 'Introduced'
            end)::mastery_status as lvl
      from s
      cross join p
      cross join lateral (select case when s.ew > 0 then s.ewc / s.ew else 0 end as acc) acc
  )
  select st.lvl,
         case st.lvl
           when 'Not started' then 0 when 'Introduced' then 1 when 'Guided' then 2
           when 'Independent' then 3 when 'Transfer-ready' then 4 when 'Needs review' then 1
         end,
         format('weighted accuracy %s%% over %s answers (%s on this objective, %s unit-wide); unassisted formats: %s%s',
                round(st.acc * 100), st.n, st.n_direct, st.n - st.n_direct,
                coalesce(array_to_string(st.fams, ', '), 'none'),
                case when st.first_win is not null
                     then format(' (%s to %s)', to_char(st.first_win at time zone 'UTC', 'YYYY-MM-DD'),
                                 to_char(st.last_win at time zone 'UTC', 'YYYY-MM-DD'))
                     else '' end),
         round(st.acc, 4),
         round(st.ewc / greatest(st.ew, st.readiness_full_evidence), 4),
         round(st.ew, 4),
         st.n,
         st.n_direct,
         coalesce(st.fams, '{}'::text[])
    from st
   where st.lvl is not null
$$;

-- 4. review_state (T2, T3, T6, T8) ------------------------------------------------

create or replace function review_interval_days(p_step int)
returns int language sql immutable as $$
  -- lib/review-scheduler.ts FIXED_INTERVALS_DAYS
  select (array[1, 3, 7, 21, 60])[least(greatest(coalesce(p_step, 0), 0), 4) + 1]
$$;

create or replace function review_state(p_user uuid, p_objective uuid, p_today date default null)
returns table (kept text, recheck_due boolean, retention numeric)
language sql stable as $$
  with d as (select coalesce(p_today, (now() at time zone 'UTC')::date) as today),
  sch as (
    select rs.step, rs.due_on, coalesce(rs.last_reviewed_at, rs.enrolled_at) as since
      from review_schedule rs where rs.user_id = p_user and rs.objective_id = p_objective
  ), lg as (
    select l.verdict from review_log l
     where l.user_id = p_user and l.objective_id = p_objective
       and l.was_due and not l.assisted and l.step_before is not null
       -- REQ-114: an answer to an item later confirmed wrong does not count
       and not exists (select 1 from attempts v where v.id = l.attempt_id and v.voided_at is not null)
     order by l.reviewed_at desc, l.id desc
     limit 3
  ), k as (
    select count(*) as n,
           count(*) filter (where verdict = 'correct') as c,
           (array_agg(verdict::text))[1] as latest
      from lg
  )
  select case when k.n = 0 then 'unchecked'
              when k.latest = 'correct' and (k.n < 3 or k.c >= 2) then 'kept'
              else 'slipped' end,
         coalesce((select d.today > sch.due_on + review_interval_days(sch.step) from sch), false),
         coalesce((select least(1::numeric,
                                10.0 * review_interval_days(sch.step)
                                / (9.0 * review_interval_days(sch.step)
                                   + greatest(0, d.today - (sch.since at time zone 'UTC')::date)))
                     from sch), 1::numeric)
    from k, d
$$;
