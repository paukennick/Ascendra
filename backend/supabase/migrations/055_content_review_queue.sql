-- REQ-143: learner signals that put content in front of a person.
--
-- Migration 042 pulls an item from rotation when enough learners flag it
-- (item_status 'quarantined'). It cannot see two things:
--   - a burst of reports after a person cleared the item (recordFlag only
--     updates the count on an existing item_status row, so a cleared item is
--     never pulled again), or reports on a lesson step (support_requests
--     kind 'content_report', which has no item row);
--   - an item whose correct rate drops sharply against its own history
--     (a key that went stale, a regenerated distractor, a changed outline).
-- The daily job (lib/content-review-queue.ts, GET /api/cron/content-signals)
-- detects both and records them here with the evidence. It does NOT pull,
-- hide or change anything: serving decisions stay with 042's rules and with
-- the person who reviews the queue (npm run review-queue).
--
--   content_review_queue  one row per (item, signal) while open; a resolved
--                         row is kept as history and the same signal can open
--                         a new row later, from evidence after the
--                         resolution only.
--   item_quality_params   the detection thresholds, tunable without a deploy.
--
-- item_kind is not limited to a list: a new content kind (sims, REQ-141)
-- plugs in by adding its attempt source in lib/content-review-queue.ts, with
-- no migration here.
--
-- LOCKING. One new table and its indexes; inserts into a small table.
-- Nothing scans attempts. Safe to run while serving; safe to run twice.

set local lock_timeout = '5s';

create table if not exists content_review_queue (
    id uuid primary key default uuid_generate_v4(),
    item_kind varchar(20) not null check (item_kind ~ '^[a-z_]{2,20}$'),
    item_id text not null check (length(item_id) between 1 and 300),
    objective_id uuid references objectives(id) on delete cascade,
    -- What a reviewer reads first: the question as served, the lab title.
    label text not null default '',
    -- learner_reports: rising "Report a problem" reports.
    -- correct_rate_drop: recent correct rate well below the item's own baseline.
    signal varchar(30) not null check (signal in ('learner_reports', 'correct_rate_drop')),
    status varchar(10) not null default 'open' check (status in ('open', 'resolved')),
    -- Counts, rates, windows and thresholds at the latest detection.
    evidence jsonb not null,
    first_detected_at timestamptz not null default now(),
    last_detected_at timestamptz not null default now(),
    resolved_at timestamptz,
    resolved_by text,
    -- fixed: the content was changed. dismissed: checked, nothing wrong.
    -- cleared / confirmed_wrong: decided through npm run items (042).
    resolution varchar(20) check (resolution in ('fixed', 'dismissed', 'cleared', 'confirmed_wrong')),
    resolution_note text check (resolution_note is null or length(resolution_note) <= 1000),
    check ((status = 'open') = (resolved_at is null)),
    check ((status = 'open') = (resolution is null))
);
-- At most one open row per item and signal: the job's upsert targets it, so
-- re-running (or two runs at once) refreshes the row instead of adding one.
create unique index if not exists content_review_queue_one_open
    on content_review_queue (item_kind, item_id, signal) where status = 'open';
create index if not exists idx_content_review_queue_item
    on content_review_queue (item_kind, item_id, signal, resolved_at desc);
create index if not exists idx_content_review_queue_open
    on content_review_queue (last_detected_at desc) where status = 'open';

-- RLS on, no policies: like every public table since 026/052, reachable
-- through the server's own connection only.
alter table content_review_queue enable row level security;

insert into item_quality_params (name, value, note) values
  ('signal_report_window_days', 30, 'REQ-143: reports counted over this many days (and only after the last resolution).'),
  ('signal_report_min_learners', 3, 'REQ-143: distinct learners reporting one item in the window that open a review.'),
  ('signal_report_rate', 0.10, 'REQ-143: or this share of the item''s recent learners reported it ...'),
  ('signal_report_rate_min_reports', 2, 'REQ-143: ... with at least this many reporters ...'),
  ('signal_report_rate_min_learners', 10, 'REQ-143: ... and at least this many learners who answered it in the window.'),
  ('signal_drop_recent_days', 14, 'REQ-143: recent window for the correct-rate check.'),
  ('signal_drop_baseline_days', 180, 'REQ-143: baseline = this many days before the recent window.'),
  ('signal_drop_min_baseline', 30, 'REQ-143: learners in the baseline (first answer each) before the check runs.'),
  ('signal_drop_min_recent', 20, 'REQ-143: learners in the recent window (first answer each) before the check runs.'),
  ('signal_drop_min_points', 0.20, 'REQ-143: smallest drop in correct rate (0.20 = 20 points) that counts.'),
  ('signal_drop_z', 3.09, 'REQ-143: one-sided two-proportion z the drop must reach (3.09 ~ p < 0.001).')
on conflict (name) do nothing;
