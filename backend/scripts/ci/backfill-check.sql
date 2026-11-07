-- REQ-118 (Audit 3 LOW-11): after the backfills ran over
-- scripts/ci/synthetic-history.sql, fail unless they did real work and left
-- every stored level equal to the rule.
\set ON_ERROR_STOP on
do $$
declare
  n_learners int;
  n_backup int;
  n_differing int;
  n_enrolled int;
begin
  select count(*) into n_learners from app_users where email like 'syn%@example.test';
  if n_learners = 0 then raise exception 'synthetic history is missing'; end if;
  select count(*) into n_backup from mastery_backup_029;
  if n_backup = 0 then raise exception '029b backed up no mastery rows: the backfill did not see the history'; end if;
  select count(*) into n_enrolled from review_schedule;
  if n_enrolled = 0 then raise exception '037b enrolled nobody in review'; end if;
  select count(*) into n_differing from mastery m
    cross join lateral mastery_from_attempts(m.user_id, m.objective_id) f
   where (m.status, m.score_0_4, m.evidence) is distinct from (f.status, f.score, f.evidence);
  if n_differing > 0 then raise exception '% stored mastery level(s) differ from mastery_from_attempts()', n_differing; end if;
  raise notice 'backfill check: % learners, % rows backed up by 029b, % review enrolments, 0 levels differ',
    n_learners, n_backup, n_enrolled;
end $$;
