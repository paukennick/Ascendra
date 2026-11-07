-- REQ-100: weighted, cross-format mastery (owner request, 2026-11-07: "Depth is
-- not just there on words but the weighted accuracy throughout all types of
-- assessments").
--
-- Replaces the rule inside mastery_from_attempts() (migration 029) with a
-- weighted-accuracy model over every kind of graded answer, then recomputes
-- every learner's stored mastery with it. The function keeps its signature,
-- so live grading (lib/grading-service.ts) and recompute_mastery() (029) use
-- the new rule without changes. 029's backup tables are not touched; this
-- file takes its own backup (mastery_backup_031) first.
--
-- THE MODEL (mastery_detail; mastery_from_attempts returns its first three
-- columns). Every number named below lives in mastery_model_params or
-- assessment_types, defined in section 1, with a note on each row.
--
-- Evidence for (learner, objective):
--   * every graded answer on the objective itself ("direct" evidence), and
--   * every graded PBQ on the objective's unit (PBQs cover a whole unit and
--     have no objective). PBQ evidence only adds to objectives that already
--     have direct evidence: a PBQ alone never gives an objective a level.
--
-- Each answer gets a CREDIT and a WEIGHT.
--   credit = verdict credit (correct 1, partial partial_credit, incorrect 0)
--            x assist credit (unassisted 1; hint assist_credit_hint;
--              reveal assist_credit_reveal; repeat assist_credit_repeat)
--   weight = cognitive weight of the answer's assessment type
--              (guided step < multiple choice < free response < PBQ)
--            x unit_scope_factor        if it is a unit-wide PBQ
--            x spacing_factor           if it came spacing_gap_hours or more
--                                       after the learner's previous answer
--                                       on this objective
--            x review_retest_factor     if the learner had missed this
--                                       objective (or PBQ scenario) on an
--                                       earlier day: a review retest
--            x 0.5 ^ (age in days / recency_half_life_days)
--                                       old evidence counts for less
--   weighted accuracy  = sum(weight x credit) / sum(weight)
--   readiness score    = sum(weight x credit) / max(sum(weight), readiness_full_evidence)
--                        (same sums, but thin evidence cannot score high;
--                        used by course readiness, lib/readiness.ts)
--
-- "Format evidence" = a correct, unassisted answer of an application-level
-- type (free response, PBQ, and later explain-back and scenario). Its
-- format_family is what "different formats" means.
--
-- Levels (labels unchanged; first match wins):
--   Needs review    latest direct answer incorrect, at least
--                   needs_review_min_attempts direct answers, weighted
--                   accuracy under needs_review_accuracy
--   Transfer-ready  weighted accuracy >= transfer_accuracy, AND direct format
--                   evidence, AND format evidence in >= transfer_min_formats
--                   format families, AND the first and last format evidence
--                   at least transfer_min_gap_hours apart (separate days)
--   Independent     weighted accuracy >= independent_accuracy AND at least
--                   one direct format evidence (an unassisted correct free
--                   response on this objective)
--   Guided          anything with credit (a correct or partial answer, a
--                   hinted or repeated answer, the guided step)
--   Introduced      answered, nothing credited
-- Score 0-4 is unchanged: Introduced 1, Guided 2, Independent 3,
-- Transfer-ready 4, Needs review 1.
--
-- Kept from 029 (B1): one sitting cannot reach Transfer-ready (24-hour gap);
-- repeats and hints are assisted, so they earn reduced credit and never count
-- as format evidence; the guided step and multiple choice never lift an
-- objective above Guided on their own.
--
-- New assessment types slot in by name: insert a row into assessment_types
-- and write attempts.assessment_type = '<name>' when recording the answer.
-- Without an explicit type an answer's type comes from attempt_type_of()
-- (PBQ / guided step / multiple choice / free response). explain_back and
-- scenario rows exist already; nothing writes them yet.
--
-- Tuning: update a row in mastery_model_params or assessment_types, then run
-- `select recompute_mastery();` so stored levels follow. Re-running this file
-- never overwrites a tuned value (inserts are ON CONFLICT DO NOTHING).
--
-- ORDER OF WORK, and why it is safe to run twice:
--   1. additive DDL and the tuning rows (IF NOT EXISTS / ON CONFLICT DO NOTHING)
--   2. BACKUP of mastery to mastery_backup_031 before anything changes; ON
--      CONFLICT DO NOTHING keeps the original pre-031 values on a re-run.
--      mastery_backup_029 is never read or written here.
--   3. the new functions (CREATE OR REPLACE)
--   4. recompute_mastery(): rewrites only rows whose status, score or
--      evidence differ, so a second run on the same day changes nothing.
--      (Evidence text carries the weighted accuracy, which drifts as evidence
--      ages, so a run on a later day may refresh rows -- by design.)
--
-- RESTORE (puts mastery back to just before the first run of this file; only
-- meaningful together with restoring 029's mastery_from_attempts, because the
-- next graded answer recomputes from whatever rule is installed):
--
--   begin;
--   update mastery m
--      set status = b.status, score_0_4 = b.score_0_4,
--          evidence = b.evidence, updated_at = b.updated_at
--     from mastery_backup_031 b
--    where b.mastery_id = m.id;
--   commit;
--
-- To see whose level changed:
--   select b.user_id, b.objective_id, b.status as before, m.status as after
--     from mastery_backup_031 b join mastery m on m.id = b.mastery_id
--    where b.status is distinct from m.status;

-- 1. Schema and tuning tables --------------------------------------------------

-- One row per kind of graded answer. format_family decides what counts as a
-- "different format" for Transfer-ready; application_level says whether a
-- correct unassisted answer of this type is format evidence at all.
create table if not exists assessment_types (
    type_name text primary key,
    format_family text not null,
    cognitive_weight numeric not null check (cognitive_weight >= 0),
    application_level boolean not null,
    unit_scope boolean not null default false,
    note text not null
);

insert into assessment_types (type_name, format_family, cognitive_weight, application_level, unit_scope, note) values
  ('guided_step', 'guided', 0.5, false, false,
   'Guided ("fade") step, either format: a worked example with the last step left to the learner. Recall-level.'),
  ('multiple_choice', 'multiple_choice', 0.75, false, false,
   'Solo check answered from the choices: recognition. On the Solo step it is always hint-assisted (029).'),
  ('free_response', 'free_response', 1.0, true, false,
   'Solo check typed from scratch and graded on substance: application.'),
  ('pbq', 'performance', 1.5, true, true,
   'Performance-based question: multi-part scenario across a unit. Analysis. Counts for each studied objective of its unit, scaled by unit_scope_factor.'),
  ('explain_back', 'explain_back', 1.25, true, false,
   'Reserved: learner explains the idea back in their own words. Nothing records it yet.'),
  ('scenario', 'scenario', 1.5, true, false,
   'Reserved: single-objective applied scenario question. Nothing records it yet.')
on conflict (type_name) do nothing;

create table if not exists mastery_model_params (
    name text primary key,
    value numeric not null,
    note text not null
);

insert into mastery_model_params (name, value, note) values
  ('partial_credit', 0.5, 'Credit for a partial verdict (correct = 1, incorrect = 0).'),
  ('assist_credit_hint', 0.5, 'Credit multiplier when the Solo choices were on screen (assist_reason hint).'),
  ('assist_credit_reveal', 0.25, 'Credit multiplier when the answer had been revealed (assist_reason reveal; reserved).'),
  ('assist_credit_repeat', 0.25, 'Credit multiplier for answering an item already answered, whose answer was shown (assist_reason repeat).'),
  ('spacing_gap_hours', 24, 'An answer at least this long after the previous answer on the objective is spaced.'),
  ('spacing_factor', 1.5, 'Weight multiplier for a spaced answer (a same-session answer has 1).'),
  ('review_retest_factor', 1.2, 'Weight multiplier when the learner had missed this objective or PBQ scenario on an earlier day.'),
  ('recency_half_life_days', 60, 'An answer this many days old counts half as much as one from today.'),
  ('unit_scope_factor', 0.5, 'Weight multiplier for a unit-wide PBQ counted toward one objective of that unit.'),
  ('independent_accuracy', 0.60, 'Weighted accuracy needed for Independent.'),
  ('transfer_accuracy', 0.75, 'Weighted accuracy needed for Transfer-ready.'),
  ('transfer_min_formats', 2, 'Format families with unassisted correct application-level answers needed for Transfer-ready.'),
  ('transfer_min_gap_hours', 24, 'First and last such answers must be at least this far apart (separate days) for Transfer-ready.'),
  ('needs_review_accuracy', 0.5, 'Below this weighted accuracy, with a latest direct answer incorrect, the objective Needs review.'),
  ('needs_review_min_attempts', 2, 'Direct answers needed before Needs review can apply.'),
  ('readiness_full_evidence', 2.0, 'Evidence weight at which an objective''s readiness score equals its weighted accuracy; below it, missing weight counts as 0.'),
  ('readiness_min_coverage', 0.5, 'Course readiness says "not enough evidence yet" below this blueprint-weighted share of objectives practiced.'),
  ('readiness_ready_score', 0.75, 'Course readiness at or above this (with readiness_ready_coverage) reads as ready.'),
  ('readiness_ready_coverage', 0.9, 'Blueprint-weighted share of objectives practiced needed before a course can read as ready.')
on conflict (name) do nothing;

-- Explicit type for answer kinds the enums below cannot express (explain-back,
-- scenario). Null means "derive it" (attempt_type_of).
alter table attempts add column if not exists assessment_type text references assessment_types(type_name);

create or replace function attempt_type_of(p_kind attempt_kind, p_stage text, p_format attempt_format, p_explicit text)
returns text language sql immutable as $$
  select coalesce(p_explicit,
           case
             when p_format = 'pbq' or p_kind = 'pbq' then 'pbq'
             when p_stage = 'fade' then 'guided_step'
             when p_format = 'mc' then 'multiple_choice'
             else 'free_response'
           end)
$$;

-- 2. Backup, before any data changes -------------------------------------------

create table if not exists mastery_backup_031 (
    mastery_id uuid primary key,
    user_id uuid,
    objective_id uuid,
    status mastery_status,
    score_0_4 int,
    evidence text,
    updated_at timestamptz,
    backed_up_at timestamptz not null default now()
);

insert into mastery_backup_031 (mastery_id, user_id, objective_id, status, score_0_4, evidence, updated_at)
select id, user_id, objective_id, status, score_0_4, evidence, updated_at from mastery
on conflict (mastery_id) do nothing;

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
    select a.id, a.created_at, a.verdict, a.assisted, a.assist_reason, a.pbq_scenario_id,
           false as via_unit,
           attempt_type_of(a.kind, a.stage, a.format, a.assessment_type) as type_name
      from attempts a
     where a.user_id = p_user and a.objective_id = p_objective
       and a.format <> 'pbq' and a.verdict is not null
    union all
    select a.id, a.created_at, a.verdict, a.assisted, a.assist_reason, a.pbq_scenario_id,
           true as via_unit,
           attempt_type_of(a.kind, a.stage, a.format, a.assessment_type) as type_name
      from attempts a
      join obj on true
      left join pbq_scenarios sc on sc.id = a.pbq_scenario_id
     where a.user_id = p_user and a.objective_id is null
       and a.format = 'pbq' and a.verdict is not null
       and coalesce(a.unit_id, sc.unit_id) = obj.unit_id
  ), t as (
    select ev.*, ty.format_family, ty.cognitive_weight, ty.application_level,
           lag(ev.created_at) over (order by ev.created_at, ev.id) as prev_at,
           exists (
             select 1 from attempts r
              where r.user_id = p_user and r.verdict in ('partial', 'incorrect')
                and ((not ev.via_unit and r.objective_id = p_objective)
                  or (ev.via_unit and r.pbq_scenario_id = ev.pbq_scenario_id))
                and (r.created_at at time zone 'UTC')::date < (ev.created_at at time zone 'UTC')::date
           ) as review_retest,
           ((now() at time zone 'UTC')::date - (ev.created_at at time zone 'UTC')::date) as age_days
      from ev
      join assessment_types ty on ty.type_name = ev.type_name
  ), w as (
    select t.*,
           (case t.verdict when 'correct' then 1 when 'partial' then p.partial_credit else 0 end)
           * (case
                when not t.assisted then 1
                when t.assist_reason = 'repeat' then p.assist_credit_repeat
                when t.assist_reason = 'reveal' then p.assist_credit_reveal
                else p.assist_credit_hint
              end) as credit,
           t.cognitive_weight
           * (case when t.via_unit then p.unit_scope_factor else 1 end)
           * (case when t.prev_at is not null
                    and extract(epoch from t.created_at - t.prev_at) >= p.spacing_gap_hours * 3600
                   then p.spacing_factor else 1 end)
           * (case when t.review_retest then p.review_retest_factor else 1 end)
           * power(0.5::numeric, greatest(t.age_days, 0)::numeric / p.recency_half_life_days) as weight,
           (t.verdict = 'correct' and not t.assisted and t.application_level) as format_win
      from t cross join p
  ), s as (
    select count(*)::int as n,
           count(*) filter (where not via_unit)::int as n_direct,
           coalesce(sum(weight), 0) as ew,
           coalesce(sum(weight * credit), 0) as ewc,
           coalesce(bool_or(credit > 0), false) as any_credit,
           coalesce(bool_or(format_win and not via_unit), false) as direct_win,
           count(distinct format_family) filter (where format_win) as n_formats,
           array_agg(distinct format_family order by format_family) filter (where format_win) as fams,
           min(created_at) filter (where format_win) as first_win,
           max(created_at) filter (where format_win) as last_win,
           (select w2.verdict from w w2 where not w2.via_unit order by w2.created_at desc, w2.id desc limit 1) as last_direct_verdict
      from w
  ), st as (
    select s.*, p.*, acc.acc,
           (case
              when s.n_direct = 0 then null
              when s.last_direct_verdict = 'incorrect' and s.n_direct >= p.needs_review_min_attempts
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

-- Same signature as 029, so live grading and recompute_mastery() pick up the
-- new rule unchanged.
create or replace function mastery_from_attempts(p_user uuid, p_objective uuid)
returns table (status mastery_status, score int, evidence text)
language sql stable as $$
  select d.status, d.score, d.evidence from mastery_detail(p_user, p_objective) d
$$;

-- 4. Recompute ---------------------------------------------------------------------

select recompute_mastery();
