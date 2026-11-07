-- REQ-106: Teach as short cards, one self-explanation prompt, labs with a
-- short report.
--
-- 1. teach_cards: the Teach step as 3-4 short cards (what it is, why it
--    matters, worked example in steps, common mistake) and one "why does
--    this step follow?" question with a model explanation. Nullable: lessons
--    cached before this migration keep their single `teach` text and render
--    as before; nothing is regenerated. `teach` stays filled for new lessons
--    too (derived from the cards), because grading and guess feedback read it.
--
-- 2. lab_report_questions: up to three report questions per objective,
--    generated once from its lab_prompt and shared by every learner.
--    prompt_hash is md5(lab_prompt) at generation time; when the seed changes
--    the lab text the stored questions no longer match and are regenerated.
--
-- 3. Lab report attempts. They are recorded in attempts with kind 'lab', but
--    with objective_id NULL and the objective in lab_objective_id instead.
--    Mastery is computed from attempts.objective_id (mastery_from_attempts in
--    029, and the weighted model's mastery_detail on its own branch), so a lab
--    report can neither raise nor lower mastery until the weighted model
--    decides how much a self-reported lab is worth and reads this column.
--    The check constraint makes that hold for any future writer too.
--
-- Additive only, guarded like every migration here. The constraint is added
-- NOT VALID: it is enforced for every new or updated row at once, and the
-- runner applies this file in one transaction, so validating here would scan
-- all of attempts under the ALTER's exclusive lock. No code wrote kind 'lab'
-- before this, so there is nothing old for it to reject. A later quiet
-- moment can run: alter table attempts validate constraint attempts_lab_not_mastery_evidence;

set local lock_timeout = '5s';

alter table lesson_content add column if not exists teach_cards jsonb;
alter table lesson_content_overrides add column if not exists teach_cards jsonb;

create table if not exists lab_report_questions (
    objective_id uuid primary key references objectives(id) on delete cascade,
    prompt_hash varchar(32) not null,
    questions jsonb not null,
    model text not null,
    generated_at timestamptz not null default now()
);

alter table attempts add column if not exists lab_objective_id uuid references objectives(id) on delete set null;

create index if not exists attempts_user_lab_objective
    on attempts (user_id, lab_objective_id)
    where lab_objective_id is not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'attempts_lab_not_mastery_evidence') then
    alter table attempts add constraint attempts_lab_not_mastery_evidence
      check (kind <> 'lab' or objective_id is null) not valid;
  end if;
end $$;
