-- 043_ai_budget_index.sql (Audit 3 H4, REQ-115): the per-learner daily AI
-- budget (lib/ai-budget.ts) sums this learner's ai_calls rows from the last
-- 24 hours on every coach message and lesson regenerate. ai_calls only had
-- an index on created_at, so that sum scanned every learner's calls for the
-- day. This index makes it a range scan of one learner's rows.
--
-- Additive and idempotent. The budget check works without it (just slower),
-- and treats a missing ai_calls table as no spend.

create index if not exists ai_calls_user_created_idx on ai_calls (user_id, created_at);
