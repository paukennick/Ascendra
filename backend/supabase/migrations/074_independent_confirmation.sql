-- REQ-218 (batch G3, learning-data integrity). Number 074 assigned by the lead.
--
-- Nick, 2026-11-10: "Independent" mastery needs a follow-up session for
-- confirmation, not one correct answer in the first sitting. Before this, one
-- correct unassisted free-response (or scenario, explain-back, sim) answer in
-- the first lesson sitting made an objective Independent.
--
-- THE RULE (mastery_detail, restated from 045; everything else in it is
-- unchanged, including `a.voided_at is null` in every attempt selection,
-- REQ-114). Independent and Transfer-ready both require CONFIRMATION: a
-- unassisted correct format win (the answers that could open Independent:
-- format_win and opens_independent, so not a retry, a repeat, a hint, a
-- placement guess, a comparison card or a unit-wide answer) at least
-- spacing_gap_hours (24, the same gap that makes an answer "spaced" and that
-- Transfer-ready's last win must keep from the one before it) after the
-- first. Until then a learner with a good independent answer reads Guided
-- (the same "credited, not yet independent" level they had before the first
-- win); the evidence text says what is missing. Transfer-ready needed two
-- format wins 72 h apart but could be reached with one opening win, so it
-- takes the same confirmation: it can never sit above an unconfirmed level.
-- "Session" is deliberately not a stored notion: 24 h is the repo's existing
-- test for "a later sitting".
--
-- ALSO: nothing else changes. Needs review is untouched (it is judged before
-- either level). The lesson solo question is a format win, so the usual path
-- is the lesson's Solo answer, then a review or exam answer the next day.
--
-- LOCKING. lock_timeout 5 s. CREATE OR REPLACE FUNCTION takes no table lock.
-- Ends with app_runtime_sync() (CREATE OR REPLACE drops the function's
-- search_path). The recompute of every stored level is 074b, which the runner
-- applies straight after this file; after the deploy run
-- `call recompute_mastery_batched();` once, as for 045.
--
-- ROLLBACK. Put 045's mastery_detail back (section 3 of
-- 045_mastery_honesty.sql) and restore levels from mastery_backup_074 (the
-- restore statements are in 074b's header).
--
-- Safe to run twice: CREATE OR REPLACE.

set local lock_timeout = '5s';

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
           -- REQ-218: the first and last answer that could open Independent. A
           -- second one spacing_gap_hours (24 h) or more after the first is the
           -- confirmation from a later sitting.
           min(created_at) filter (where format_win and opens_independent) as first_open_win,
           max(created_at) filter (where format_win and opens_independent) as last_open_win,
           min(created_at) filter (where format_win) as first_win,
           max(created_at) filter (where format_win) as last_win,
           (select w3.spaced from wq w3 where w3.format_win order by w3.created_at desc, w3.id desc limit 1) as last_win_spaced,
           (select w2b.verdict from wq w2b where not w2b.via_unit and w2b.assist is distinct from 'retry'
               order by w2b.created_at desc, w2b.id desc limit 1) as last_direct_verdict
      from wq
  ), st as (
    select s.*, p.*, acc.acc, conf.confirmed,
           (case
              when s.n_direct = 0 then null
              when s.last_direct_verdict = 'incorrect' and s.n_scored >= p.needs_review_min_attempts
                   and s.n_days >= 2 and acc.acc < p.needs_review_accuracy then 'Needs review'
              when conf.confirmed and acc.acc >= p.transfer_accuracy and s.n_formats >= p.transfer_min_formats
                   and coalesce(s.last_win_spaced, false)
                   and extract(epoch from s.last_win - s.first_win) >= p.transfer_min_gap_hours * 3600 then 'Transfer-ready'
              when conf.confirmed and acc.acc >= p.independent_accuracy then 'Independent'
              when s.guided_ok then 'Guided'
              else 'Introduced'
            end)::mastery_status as lvl
      from s
      cross join p
      cross join lateral (select case when s.ew > 0 then s.ewc / s.ew else 0 end as acc) acc
      cross join lateral (
        select (s.direct_win and s.last_open_win is not null
                and extract(epoch from s.last_open_win - s.first_open_win) >= p.spacing_gap_hours * 3600) as confirmed
      ) conf
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
                     else '' end)
         -- REQ-218: say why a learner with a good independent answer is not Independent yet
         || case when st.direct_win and not st.confirmed
                 then '; Independent needs a second correct unassisted answer at least a day later'
                 else '' end,
         round(st.acc, 4),
         round(st.ewc / greatest(st.ew, st.readiness_full_evidence), 4),
         round(st.ew, 4),
         st.n,
         st.n_direct,
         coalesce(st.fams, '{}'::text[])
    from st
   where st.lvl is not null
$$;

select app_runtime_sync();
