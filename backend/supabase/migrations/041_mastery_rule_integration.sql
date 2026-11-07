-- REQ-112: the weighted mastery rule (031) brought up to date with the
-- assessment types the feature branches added (037 review loop and unit
-- checks, 038 exam practice, 039 coach quiz and placement, 040 comparison
-- cards and explain-back). Schema and functions only; the backup and the
-- recompute of every learner are in 041b_mastery_rule_backfill.sql, which the
-- runner applies straight after this file in its own transaction.
--
-- DEPLOY ORDER: docs/deploy-runbook-integration.md (migrate, deploy the
-- backend, `call recompute_mastery_batched();`, publish the app).
--
-- LOCKING. Catalog-only, under lock_timeout 5 s like 031: two columns on the
-- small assessment_types table, one nullable column without a default on
-- attempts (no rewrite, no scan; ACCESS EXCLUSIVE for an instant), and
-- CREATE OR REPLACE FUNCTION. Nothing here reads attempts.
--
-- WHAT CHANGES IN THE RULE (mastery_detail; everything else in the 031
-- header still holds). Each item has a regression test in
-- lib/integration-rule.dbtest.ts.
--
-- a. Unit-scope types count in the unit branch. 031's unit branch read only
--    PBQs (kind 'pbq'); a unit check (037: kind 'unitcheck', assessment_type
--    'unit_check', unit_scope true) was recorded but never counted. The unit
--    branch now reads every answer with no objective whose type has
--    unit_scope = true (PBQs included, as before), on the objective's unit,
--    and like a PBQ it only adds to objectives that already have direct
--    evidence. The review-retest match for a unit-wide answer is the same
--    PBQ scenario OR the same unit-check item (attempts.unit_check_item_id).
--
-- b. Zero-weight types are not evidence at all. An answer whose type has
--    cognitive_weight 0 (039's coach_quiz: hinted practice) is left out
--    before anything is counted: it is not one of the "answers", not the
--    latest answer Needs review looks at, not the "previous answer" spacing
--    is measured from, and its miss does not make a later answer a review
--    retest. In 031 it only had no weight, so a Quiz-me miss could still
--    tip an objective into Needs review.
--    Spacing evidence: a type with spacing_evidence = false (new column,
--    false for placement and coach_quiz) is neither the previous answer
--    spacing is measured from, nor itself spaced, nor a review retest, nor
--    the earlier miss that makes a later answer a retest. A placement check
--    happens once, before teaching; the first lesson answer the next day
--    is not a spaced retrieval of it.
--
-- c. Guessable formats. A two-option comparison-card question is a coin
--    flip. Option chosen (of the two the integration brief offered): a type
--    counts as format evidence only after min_format_wins correct,
--    unassisted answers on DIFFERENT questions (new column, default 1;
--    discrimination 2). Why this and not scaling the weight by 1 - 1/options:
--    the attempt does not store how many options were shown, the
--    scaling would change accuracy as well as format evidence (a correct
--    two-option answer would weigh half a free response twice over, since
--    discrimination is already weighted like free response), and "twice,
--    on different questions" is a rule a learner can be told in a sentence.
--    It applies to every discrimination question, also 3- and 4-option ones;
--    for those the second correct answer is cheap for a learner who knows
--    it. Until the threshold is met those answers still count in the
--    accuracy; they just do not open Independent or a format family.
--
-- e. Lab reports (035: kind 'lab', objective in lab_objective_id) stay out:
--    both branches exclude kind 'lab' explicitly (035's check constraint
--    already keeps objective_id null on them).
--
-- Also here:
--   - mastery_pairs() (029) visits every pair with a graded answer the rule
--     can count (kind 'lesson' OR an explicit assessment_type), not only
--     lesson answers, so a recompute also reaches pairs that only have exam,
--     review or comparison answers. Same signature.
--   - attempt_spaced(attempt id): whether that answer is spaced by exactly
--     the rule's definition (b). Used by the exam review advance (d,
--     lib/grading-service.ts) and the plan's "kept" view (g,
--     lib/study-plan-store.ts), so the three cannot disagree.
--   - attempts.part_scores (REQ-107 follow-up): the PBQ grader's per-part
--     scores, stored so a replayed request returns them.
--
-- (d -- a correct, unassisted, spaced exam answer advances a due review --
-- is code, not rule: lib/grading-service.ts and lib/review-store.ts.)
--
-- Safe to run twice: IF NOT EXISTS / CREATE OR REPLACE throughout, and the
-- tuning values are set only in the run that adds their column, so a tuned
-- value is never overwritten.

set local lock_timeout = '5s';

-- 1. Tuning columns ------------------------------------------------------------

do $$
begin
  if not exists (select 1 from information_schema.columns
                  where table_schema = 'public' and table_name = 'assessment_types' and column_name = 'spacing_evidence') then
    alter table assessment_types add column spacing_evidence boolean not null default true;
    update assessment_types set spacing_evidence = false where type_name in ('placement', 'coach_quiz');
  end if;
  if not exists (select 1 from information_schema.columns
                  where table_schema = 'public' and table_name = 'assessment_types' and column_name = 'min_format_wins') then
    alter table assessment_types add column min_format_wins int not null default 1 check (min_format_wins >= 1);
    update assessment_types set min_format_wins = 2 where type_name = 'discrimination';
  end if;
end $$;

comment on column assessment_types.spacing_evidence is
  'REQ-112: false = an answer of this type is never the previous answer spacing is measured from, never spaced itself, never a review retest, and its miss never makes a later answer one (placement, coach_quiz).';
comment on column assessment_types.min_format_wins is
  'REQ-112: correct unassisted answers on different questions needed before this type counts as format evidence (discrimination 2: a two-option question is a coin flip).';

-- 2. attempts.part_scores -------------------------------------------------------

alter table attempts add column if not exists part_scores jsonb;

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
      max(value) filter (where name = 'spacing_gap_hours') as spacing_gap_hours,
      max(value) filter (where name = 'spacing_factor') as spacing_factor,
      max(value) filter (where name = 'review_retest_factor') as review_retest_factor,
      max(value) filter (where name = 'recency_half_life_days') as recency_half_life_days,
      max(value) filter (where name = 'unit_scope_factor') as unit_scope_factor,
      max(value) filter (where name = 'independent_accuracy') as independent_accuracy,
      max(value) filter (where name = 'transfer_accuracy') as transfer_accuracy,
      max(value) filter (where name = 'transfer_min_formats') as transfer_min_formats,
      max(value) filter (where name = 'transfer_min_gap_hours') as transfer_min_gap_hours,
      max(value) filter (where name = 'needs_review_accuracy') as needs_review_accuracy,
      max(value) filter (where name = 'needs_review_min_attempts') as needs_review_min_attempts,
      max(value) filter (where name = 'readiness_full_evidence') as readiness_full_evidence
    from mastery_model_params
  ), obj as (
    select unit_id from objectives where id = p_objective
  ), ev as (
    -- assist: null = unassisted. Derived from history, not only from the
    -- stored flag (031 header, WHICH ANSWERS ARE ASSISTED).
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
       and a.format <> 'pbq' and a.verdict is not null and a.kind <> 'lab'
       and (a.kind = 'lesson' or a.assessment_type is not null)
    union all
    -- (a) Unit-wide answers: PBQs and every other unit_scope type.
    select a.id, a.created_at, a.verdict, a.pbq_scenario_id, a.unit_check_item_id, a.question,
           case when a.assist_reason = 'retry' then 'retry'
                when a.assisted then coalesce(a.assist_reason, 'hint') end as assist,
           true as via_unit,
           attempt_type_of(a.kind, a.stage, a.format, a.assessment_type) as type_name
      from attempts a
      join obj on true
      left join pbq_scenarios sc on sc.id = a.pbq_scenario_id
      join assessment_types ut on ut.type_name = attempt_type_of(a.kind, a.stage, a.format, a.assessment_type)
     where a.user_id = p_user and a.objective_id is null
       and a.verdict is not null and a.kind <> 'lab'
       and ut.unit_scope
       and ((a.kind = 'pbq' and a.format = 'pbq') or a.assessment_type is not null)
       and coalesce(a.unit_id, sc.unit_id) = obj.unit_id
  ), t0 as (
    -- (b) A zero-weight type is not evidence: dropped before anything counts.
    select ev.*, ty.format_family, ty.cognitive_weight, ty.application_level,
           ty.spacing_evidence, ty.min_format_wins
      from ev
      join assessment_types ty on ty.type_name = ev.type_name
     where ty.cognitive_weight > 0
  ), t as (
    select t0.*,
           -- (b) the previous answer that can anchor spacing
           max(case when t0.spacing_evidence then t0.created_at end)
             over (order by t0.created_at, t0.id rows between unbounded preceding and 1 preceding) as prev_at,
           t0.spacing_evidence and exists (
             select 1 from attempts r
               join assessment_types rt on rt.type_name = attempt_type_of(r.kind, r.stage, r.format, r.assessment_type)
              where r.user_id = p_user and r.verdict in ('partial', 'incorrect')
                and r.kind <> 'lab'
                and (r.kind in ('lesson', 'pbq') or r.assessment_type is not null)
                and rt.cognitive_weight > 0 and rt.spacing_evidence
                and ((not t0.via_unit and r.objective_id = p_objective)
                  or (t0.via_unit and t0.pbq_scenario_id is not null and r.pbq_scenario_id = t0.pbq_scenario_id)
                  or (t0.via_unit and t0.unit_check_item_id is not null and r.unit_check_item_id = t0.unit_check_item_id))
                and (r.created_at at time zone 'UTC')::date < (t0.created_at at time zone 'UTC')::date
           ) as review_retest,
           ((now() at time zone 'UTC')::date - (t0.created_at at time zone 'UTC')::date) as age_days
      from t0
  ), w as (
    select t.*,
           (case t.verdict when 'correct' then 1 when 'partial' then p.partial_credit else 0 end)
           * (case
                when t.assist is null then 1
                when t.assist = 'retry' then p.assist_credit_retry
                when t.assist = 'repeat' then p.assist_credit_repeat
                when t.assist = 'reveal' then p.assist_credit_reveal
                else p.assist_credit_hint
              end) as credit,
           t.cognitive_weight
           * (case when t.assist = 'retry' then p.assist_weight_retry else 1 end)
           * (case when t.via_unit then p.unit_scope_factor else 1 end)
           * (case when t.spacing_evidence and t.prev_at is not null
                    and extract(epoch from t.created_at - t.prev_at) >= p.spacing_gap_hours * 3600
                   then p.spacing_factor else 1 end)
           * (case when t.review_retest then p.review_retest_factor else 1 end)
           * power(0.5::numeric, greatest(t.age_days, 0)::numeric / p.recency_half_life_days) as weight,
           (t.verdict = 'correct' and t.assist is null and t.application_level) as win_raw
      from t cross join p
  ), qualified as (
    -- (c) a type opens format evidence only after min_format_wins correct,
    -- unassisted answers on different questions.
    select type_name
      from w
     where win_raw
     group by type_name
    having count(distinct coalesce(question, id::text)) >= max(min_format_wins)
  ), wq as (
    select w.*, (w.win_raw and w.type_name in (select type_name from qualified)) as format_win
      from w
  ), s as (
    select count(*)::int as n,
           count(*) filter (where not via_unit)::int as n_direct,
           count(*) filter (where not via_unit and assist is distinct from 'retry')::int as n_scored,
           coalesce(sum(weight), 0) as ew,
           coalesce(sum(weight * credit), 0) as ewc,
           coalesce(bool_or(credit > 0), false) as any_credit,
           coalesce(bool_or(format_win and not via_unit), false) as direct_win,
           count(distinct format_family) filter (where format_win) as n_formats,
           array_agg(distinct format_family order by format_family) filter (where format_win) as fams,
           min(created_at) filter (where format_win) as first_win,
           max(created_at) filter (where format_win) as last_win,
           (select w2.verdict from wq w2 where not w2.via_unit and w2.assist is distinct from 'retry'
               order by w2.created_at desc, w2.id desc limit 1) as last_direct_verdict
      from wq
  ), st as (
    select s.*, p.*, acc.acc,
           (case
              when s.n_direct = 0 then null
              when s.last_direct_verdict = 'incorrect' and s.n_scored >= p.needs_review_min_attempts
                   and acc.acc < p.needs_review_accuracy then 'Needs review'
              when s.direct_win and acc.acc >= p.transfer_accuracy and s.n_formats >= p.transfer_min_formats
                   and extract(epoch from s.last_win - s.first_win) >= p.transfer_min_gap_hours * 3600 then 'Transfer-ready'
              when s.direct_win and acc.acc >= p.independent_accuracy then 'Independent'
              when s.any_credit then 'Guided'
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
         format('weighted accuracy %s%% over %s answers (%s on this objective, %s unit PBQ); unassisted formats: %s%s',
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

-- Every pair the recompute visits (029's signature): any graded answer the
-- rule can count, and every existing mastery row.
create or replace function mastery_pairs(p_user uuid default null)
returns table (user_id uuid, objective_id uuid) language sql stable as $$
  select a.user_id, a.objective_id
    from attempts a
   where a.user_id is not null and a.objective_id is not null
     and a.format <> 'pbq' and a.verdict is not null and a.kind <> 'lab'
     and (a.kind = 'lesson' or a.assessment_type is not null)
     and (p_user is null or a.user_id = p_user)
  union
  select m.user_id, m.objective_id
    from mastery m
   where m.user_id is not null and m.objective_id is not null
     and (p_user is null or m.user_id = p_user)
  order by 1, 2
$$;

-- Is this answer spaced, by mastery_detail's definition (b)? Its type must be
-- spacing evidence with a weight, and the latest earlier spacing-evidence
-- answer on the same objective (direct, or unit-wide on its unit) at least
-- spacing_gap_hours before it. False for an answer with no objective or no
-- earlier answer.
create or replace function attempt_spaced(p_attempt uuid)
returns boolean language sql stable as $$
  with a as (
    select x.id, x.user_id, x.objective_id, x.created_at, o.unit_id
      from attempts x
      join objectives o on o.id = x.objective_id
      join assessment_types ty on ty.type_name = attempt_type_of(x.kind, x.stage, x.format, x.assessment_type)
     where x.id = p_attempt and ty.cognitive_weight > 0 and ty.spacing_evidence and x.kind <> 'lab'
  ), prev as (
    -- Two lookups, each on an index (attempts(user_id, objective_id)), not
    -- one OR over all of the learner's attempts.
    select greatest(
      (select max(r.created_at)
         from a
         join attempts r on r.user_id = a.user_id and r.objective_id = a.objective_id
         join assessment_types rt on rt.type_name = attempt_type_of(r.kind, r.stage, r.format, r.assessment_type)
        where (r.created_at, r.id) < (a.created_at, a.id)
          and r.verdict is not null and r.kind <> 'lab' and r.format <> 'pbq'
          and (r.kind = 'lesson' or r.assessment_type is not null)
          and rt.cognitive_weight > 0 and rt.spacing_evidence),
      (select max(r.created_at)
         from a
         join attempts r on r.user_id = a.user_id and r.objective_id is null
         join assessment_types rt on rt.type_name = attempt_type_of(r.kind, r.stage, r.format, r.assessment_type)
         left join pbq_scenarios sc on sc.id = r.pbq_scenario_id
        where (r.created_at, r.id) < (a.created_at, a.id)
          and r.verdict is not null and r.kind <> 'lab'
          and rt.unit_scope and rt.cognitive_weight > 0 and rt.spacing_evidence
          and ((r.kind = 'pbq' and r.format = 'pbq') or r.assessment_type is not null)
          and coalesce(r.unit_id, sc.unit_id) = a.unit_id)
    ) as at
  )
  select coalesce((
    select extract(epoch from a.created_at - prev.at) >=
           (select value from mastery_model_params where name = 'spacing_gap_hours') * 3600
      from a, prev where prev.at is not null), false)
$$;
