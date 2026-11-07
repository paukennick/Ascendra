-- REQ-118 (Audit 3 LOW-11): a synthetic learner history for CI's backfill
-- job. Written against the schema as of 028 (the last migration before the
-- 029b/031b/041b backfills), so CI can apply 001-028, load this, then apply
-- the rest and run every backfill over real-looking rows instead of an empty
-- database.
--
-- Size is set with psql variables (defaults keep the job to a few minutes):
--   psql -v learners=1500 -v per_learner=80 -f scripts/ci/synthetic-history.sql
-- One catalog course, 8 units x 15 objectives. Every learner answers lesson
-- items (guess / fade / solo, mc and open, mixed verdicts) spread over 60
-- days, some PBQs, and has the mastery and error_log rows the old code wrote.
-- Deterministic (no random()), so a failure reproduces.

\set ON_ERROR_STOP on
\if :{?learners} \else \set learners 1500 \endif
\if :{?per_learner} \else \set per_learner 80 \endif

insert into subject_tracks (id, user_id, code, title, track_type)
values ('00000000-0000-4000-8000-00000000c1c1', null, 'CI-SYN', 'CI synthetic course', 'certification');

insert into course_units (id, track_id, title, weight, sort_order, gate_description)
select ('00000000-0000-4000-8001-' || lpad(u::text, 12, '0'))::uuid, '00000000-0000-4000-8000-00000000c1c1',
       'Unit ' || u, 12.5, u, case when u % 2 = 0 then 'Explain the unit' end
  from generate_series(1, 8) u;

insert into objectives (id, unit_id, title, sort_order)
select ('00000000-0000-4000-8002-' || lpad((u * 100 + o)::text, 12, '0'))::uuid,
       ('00000000-0000-4000-8001-' || lpad(u::text, 12, '0'))::uuid,
       'Objective ' || u || '.' || o || ' (term' || o || ', term' || (o + 1) || ')', o
  from generate_series(1, 8) u, generate_series(1, 15) o;

create temp table syn_objs as
  select row_number() over (order by id) - 1 as n, id, unit_id from objectives
   where unit_id in (select id from course_units where track_id = '00000000-0000-4000-8000-00000000c1c1');

insert into app_users (id, email, display_name, email_verified_at)
select ('00000000-0000-4000-8003-' || lpad(l::text, 12, '0'))::uuid, 'syn' || l || '@example.test', 'Syn ' || l, now()
  from generate_series(1, :learners) l;

-- Lesson answers: each learner works through objectives in order, three
-- stages each, with a verdict mix that gives every mastery level somewhere.
insert into attempts (user_id, unit_id, objective_id, kind, stage, format, question, answer, verdict, created_at)
select ('00000000-0000-4000-8003-' || lpad(l::text, 12, '0'))::uuid, o.unit_id, o.id, 'lesson',
       (array['guess', 'fade', 'solo'])[1 + g % 3],
       case when g % 3 = 2 and (l + g) % 2 = 0 then 'open'::attempt_format else 'mc'::attempt_format end,
       'q ' || (g % 3) || ' ' || o.n, 'a',
       (array['correct', 'correct', 'partial', 'incorrect', 'correct'])[1 + (l * 7 + g * 3) % 5]::attempt_verdict,
       now() - make_interval(days => 60 - (g * 60 / :per_learner), mins => l % 1440)
  from generate_series(1, :learners) l cross join generate_series(0, :per_learner - 1) g
  join syn_objs o on o.n = ((g / 3) + l) % 120;

-- A PBQ per unit for one learner in five (unit-wide answers, no objective).
insert into attempts (user_id, unit_id, kind, format, question, answer, verdict, created_at)
select ('00000000-0000-4000-8003-' || lpad(l::text, 12, '0'))::uuid, cu.id, 'pbq', 'pbq', 'pbq ' || cu.sort_order, 'a',
       (array['correct', 'partial', 'incorrect'])[1 + (l + cu.sort_order) % 3]::attempt_verdict, now() - make_interval(days => cu.sort_order)
  from generate_series(1, :learners) l
  join course_units cu on cu.track_id = '00000000-0000-4000-8000-00000000c1c1'
 where l % 5 = 0;

-- Mastery rows as the pre-029 code left them (a level per answered pair).
insert into mastery (user_id, objective_id, status, score_0_4, evidence, updated_at)
select a.user_id, a.objective_id,
       (array['Introduced', 'Guided', 'Independent', 'Needs review'])[1 + (count(*) + count(*) filter (where a.verdict = 'correct')) % 4]::mastery_status,
       least(4, count(*) filter (where a.verdict = 'correct'))::int, 'synthetic', max(a.created_at)
  from attempts a
 where a.objective_id in (select id from syn_objs)
 group by a.user_id, a.objective_id;

-- error_log entries for misses (the 1/7/21 queue).
insert into error_log (user_id, unit_id, objective_id, attempt_id, topic, error_text, review_stage, next_review_at, resolved, created_at)
select a.user_id, a.unit_id, a.objective_id, a.id, 'topic', 'missed', 0, (a.created_at + interval '1 day')::date, false, a.created_at
  from attempts a
 where a.verdict = 'incorrect' and a.objective_id in (select id from syn_objs);

analyze;
select (select count(*) from app_users where email like 'syn%@example.test') as learners,
       (select count(*) from attempts) as attempts,
       (select count(*) from mastery) as mastery_rows,
       (select count(*) from error_log) as error_log_rows;
