-- REQ-114 (Audit 3, content): shared-item quality. Generated questions are
-- written once and served to every learner on an objective, so one wrong
-- answer key reached everyone and the grader enforced it. This adds:
--
--   item_flags          learner reports ("Report a problem with this
--                       question"), grader 'key-suspect' verdicts, and the
--                       one automated re-check per flagged item.
--   item_status         a live item pulled from rotation: quarantined (by
--                       flags), confirmed_wrong (a person confirmed the key
--                       is wrong; attempts on it are voided) or cleared
--                       (a person checked it; served again).
--   item_holdbacks      generated content that was never published: the
--                       model listed uncertain claims, or the second-model
--                       fact-check disagreed with its key. Kept for review.
--   item_quality_params tunables (quarantine_flag_threshold, default 3).
--   attempts.voided_at  an answer to an item later confirmed wrong. The
--                       attempt is kept (history, export, review log); the
--                       mastery rule leaves it out.
--
-- ITEM IDS. item_id is text: the row id for review, exam, quiz and
-- comparison items; for a lesson check (which has no row of its own) it is
-- '<objective_id>:<stage>:<md5(question)>' (lib/item-quality.ts
-- lessonItemId), so a regenerated lesson's new check is a different item.
--
-- THE MASTERY RULE. The only change to mastery_detail() is one filter in its
-- attempt selection: `a.voided_at is null` next to `a.verdict is not null`,
-- in both branches (direct answers and unit-wide answers). It is applied by
-- rewriting the CURRENT function definition rather than by restating the
-- whole function here, so this migration cannot undo a rule change made by
-- another migration before it; it fails loudly if the text it patches is not
-- found exactly twice. Whoever next restates mastery_detail() must keep the
-- filter (lib/item-quality.dbtest.ts checks a voided answer is not counted).
-- mastery_pairs() and attempt_spaced() are unchanged: a voided answer can
-- still be visited or anchor spacing, which only matters for a learner whose
-- every other answer is also voided.
--
-- LOCKING. New tables, one nullable column without a default on attempts
-- (catalog only, no rewrite), CREATE OR REPLACE FUNCTION. Nothing scans
-- attempts. Safe to run while serving.

set local lock_timeout = '5s';

create table if not exists item_quality_params (
    name varchar(60) primary key,
    value numeric not null,
    note text not null default ''
);
insert into item_quality_params (name, value, note) values
  ('quarantine_flag_threshold', 3,
   'Independent learner flags (distinct learners; a key-suspect grade counts as its learner''s flag) that pull an item from rotation.')
on conflict (name) do nothing;

create table if not exists item_flags (
    id uuid primary key default uuid_generate_v4(),
    item_kind varchar(20) not null check (item_kind in ('lesson', 'review', 'exam', 'quiz', 'comparison')),
    item_id text not null,
    objective_id uuid references objectives(id) on delete cascade,
    -- The item's question as served, so an attempt can be matched to it and
    -- a reviewer can read what was reported without the source row.
    question text not null,
    user_id uuid references app_users(id) on delete set null,
    -- learner: "Report a problem"; key_suspect: the free-response grader
    -- judged the reference answer wrong; recheck: the one automated
    -- re-check of a flagged item (user_id null).
    source varchar(20) not null check (source in ('learner', 'key_suspect', 'recheck')),
    reason varchar(30) check (reason in ('wrong_answer', 'unclear', 'outdated', 'offensive', 'other', 'key_suspect')),
    note text check (note is null or length(note) <= 500),
    -- recheck rows: did an independent model, without the key, agree with it?
    recheck_agreed boolean,
    recheck_detail jsonb,
    created_at timestamptz not null default now()
);
-- One flag per learner per item (a second tap, or a learner flag plus a
-- key-suspect grade, is still one learner).
create unique index if not exists item_flags_one_per_learner
    on item_flags (item_kind, item_id, user_id) where user_id is not null;
-- At most one automated re-check per item, ever: the insert is the claim.
create unique index if not exists item_flags_one_recheck
    on item_flags (item_kind, item_id) where source = 'recheck';
create index if not exists idx_item_flags_item on item_flags (item_kind, item_id);

create table if not exists item_status (
    item_kind varchar(20) not null check (item_kind in ('lesson', 'review', 'exam', 'quiz', 'comparison')),
    item_id text not null,
    objective_id uuid references objectives(id) on delete cascade,
    question text not null,
    status varchar(20) not null check (status in ('quarantined', 'confirmed_wrong', 'cleared')),
    -- why it was pulled: 'flags' (threshold reached) or 'flag_and_recheck'
    reason varchar(30) not null,
    flag_count int not null default 0,
    voided_attempts int not null default 0,
    quarantined_at timestamptz not null default now(),
    resolved_at timestamptz,
    resolved_note text,
    primary key (item_kind, item_id)
);
create index if not exists idx_item_status_objective on item_status (objective_id) where status <> 'cleared';

create table if not exists item_holdbacks (
    id uuid primary key default uuid_generate_v4(),
    item_kind varchar(20) not null
        check (item_kind in ('lesson', 'lesson_intro', 'review', 'exam', 'quiz', 'comparison', 'pbq', 'unit_check')),
    objective_id uuid references objectives(id) on delete cascade,
    unit_id uuid references course_units(id) on delete cascade,
    track_id uuid references subject_tracks(id) on delete cascade,
    -- 'uncertain': the generator listed uncertain claims or low confidence;
    -- 'fact_check': the independent check disagreed with the key or found
    -- unsupported claims; 'fact_check_error': the check could not run (the
    -- gate fails closed); 'served_after_retry': a lesson's practice half
    -- still failed after one retry and was kept, because a lesson cannot be
    -- shown without its checks (lib/lesson-generation.ts).
    reason varchar(30) not null
        check (reason in ('uncertain', 'fact_check', 'fact_check_error', 'served_after_retry')),
    claims jsonb not null default '[]'::jsonb,
    content jsonb not null,
    model text,
    created_at timestamptz not null default now()
);
create index if not exists idx_item_holdbacks_created on item_holdbacks (created_at desc);

alter table attempts add column if not exists voided_at timestamptz;
alter table attempts add column if not exists void_reason text;
comment on column attempts.voided_at is
  'Set when the item this answer was graded against is confirmed wrong (item_status confirmed_wrong). The attempt is kept; mastery_detail() leaves it out.';

-- The one-line filter in the rule's attempt selection (header: THE MASTERY RULE).
do $$
declare
  def text;
  patched text;
  n int;
begin
  select pg_get_functiondef('public.mastery_detail(uuid, uuid)'::regprocedure) into def;
  if def like '%a.voided_at is null%' then
    return; -- already applied
  end if;
  n := (length(def) - length(replace(def, 'a.verdict is not null and a.kind <> ''lab''', ''))) /
       length('a.verdict is not null and a.kind <> ''lab''');
  if n <> 2 then
    raise exception '042: expected the attempt selection filter twice in mastery_detail(), found %', n;
  end if;
  patched := replace(def, 'a.verdict is not null and a.kind <> ''lab''',
                     'a.verdict is not null and a.voided_at is null and a.kind <> ''lab''');
  execute patched;
end $$;
