import { query } from "@/lib/db";
import type { ItemRef } from "@/lib/item-quality";
import { alreadyStagedSql, stageForReview } from "@/lib/staging";
import { snippetProblems, verifyByExecution, DEFAULT_RUN_LIMITS, type CodeRunner, type RunLimits, type VerifySnippet } from "@/lib/verify-execution";

// REQ-196: verify by execution, outside the request path.
//
// Nick's decision (2026-11-09, via the lead): an item whose writer added a
// verification program is SERVED once the model fact-check passes, and is
// marked exec_unverified (a row here, no run yet). The hourly sandbox job
// (.github/workflows/content-sandbox.yml -> scripts/exec-checks.ts) runs each
// program in a --network none container (lib/sandbox-runner.ts) and records
// the result; a program that disagrees with the key is staged in
// item_holdbacks for a person, exactly like a re-check failure. Nothing a
// learner sees changes until the person runs `npm run items -- confirm`.
//
// The tradeoff, accepted: for up to about an hour (or until the job next
// runs) a learner can be served an item whose program would have
// disagreed. The model fact-check has already passed it. Holding every such
// item instead would stall all Python/JavaScript/developer and academic
// lesson generation until a sandbox answered.
//
// Fail closed where it still matters: if the program cannot be QUEUED (the
// table is missing, the database refused), the caller holds the item back
// rather than serve something that would never be verified
// (lib/lesson-generation.ts checkedPractice).

export const EXEC_STAGE_MARK = "[staged: sandbox execution disagreed with the key]";

export interface QueuedExec {
  ref: ItemRef;
  snippet: VerifySnippet;
}

// Records that an item is served exec_unverified. Throws if it cannot.
// Idempotent: the same item (same id, so the same question text) is queued
// once.
export async function queueExecCheck(ref: ItemRef, snippet: VerifySnippet): Promise<void> {
  const bad = snippetProblems(snippet);
  if (bad) throw new Error(`cannot queue execution check: ${bad}`);
  await query(
    `insert into exec_checks (item_kind, item_id, objective_id, question, language, code, expected)
     values ($1, $2, $3, $4, $5, $6, $7)
     on conflict (item_kind, item_id) do nothing`,
    [ref.kind, ref.itemId, ref.objectiveId, ref.question, snippet.language, snippet.code, snippet.expected.slice(0, 500)]
  );
}

export interface PendingExec extends QueuedExec {
  createdAt: string;
}

// Queued items with no decisive run yet (an 'error' run, e.g. an
// infrastructure hiccup, is retried), oldest first. Items already pulled or
// already staged are skipped.
export async function pendingExecChecks(limit: number): Promise<PendingExec[]> {
  const rows = await query<{
    item_kind: ItemRef["kind"];
    item_id: string;
    objective_id: string | null;
    question: string;
    language: VerifySnippet["language"];
    code: string;
    expected: string;
    created_at: string;
  }>(
    `select e.item_kind, e.item_id, e.objective_id, e.question, e.language, e.code, e.expected, e.created_at::text
       from exec_checks e
      where not exists (select 1 from exec_check_runs r
                         where r.item_kind = e.item_kind and r.item_id = e.item_id and r.outcome in ('passed', 'failed'))
        and not exists (select 1 from item_status s
                         where s.item_kind = e.item_kind and s.item_id = e.item_id and s.status <> 'cleared')
        and not ${alreadyStagedSql("e.item_kind", "e.item_id")}
      order by e.created_at
      limit $1`,
    [limit]
  );
  return rows.map((r) => ({
    ref: { kind: r.item_kind, itemId: r.item_id, objectiveId: r.objective_id, question: r.question },
    snippet: { language: r.language, code: r.code, expected: r.expected },
    createdAt: r.created_at,
  }));
}

export interface ExecRunSummary {
  ran: number;
  passed: number;
  failed: number;
  errors: number;
  // the sandbox could not run anything; nothing was recorded as passed
  unavailable: boolean;
  // the run's time budget ran out; the rest stay exec_unverified for the next run
  stoppedAtDeadline: boolean;
}

// Runs the queued programs. A disagreement is staged, never pulled.
export async function runExecChecks(opts: {
  runner: CodeRunner;
  runnerName: string;
  limit: number;
  limits?: RunLimits;
  // epoch ms: no program starts after this (the job's time budget)
  deadline?: number;
  log?: (m: string) => void;
}): Promise<ExecRunSummary> {
  const log = opts.log ?? (() => {});
  const out: ExecRunSummary = { ran: 0, passed: 0, failed: 0, errors: 0, unavailable: false, stoppedAtDeadline: false };
  for (const p of await pendingExecChecks(opts.limit)) {
    if (opts.deadline !== undefined && Date.now() >= opts.deadline) {
      out.stoppedAtDeadline = true;
      log("time budget reached: the rest stay exec_unverified for the next run");
      break;
    }
    const v = await verifyByExecution(p.snippet, opts.runner, opts.limits ?? DEFAULT_RUN_LIMITS);
    if (!v.ran) {
      if (v.detail === "no sandbox") {
        // Fail closed: stop, record nothing, leave everything exec_unverified.
        out.unavailable = true;
        log("sandbox unavailable: stopping; nothing recorded");
        break;
      }
      out.errors++;
      await recordRun(p.ref, "error", v.detail, opts.runnerName);
      continue;
    }
    out.ran++;
    if (v.agreed) {
      out.passed++;
      await recordRun(p.ref, "passed", v.detail, opts.runnerName);
      continue;
    }
    out.failed++;
    // Staged first: if staging fails, no 'failed' run is recorded and the
    // next run tries again.
    await stageForReview({
      source: "exec",
      kind: p.ref.kind,
      itemId: p.ref.itemId,
      objectiveId: p.ref.objectiveId,
      question: p.ref.question,
      claims: [EXEC_STAGE_MARK, v.detail],
      detail: { snippet: p.snippet, runner: opts.runnerName },
    });
    await recordRun(p.ref, "failed", v.detail, opts.runnerName);
    log(`staged ${p.ref.kind} ${p.ref.itemId}: ${v.detail}`);
  }
  return out;
}

async function recordRun(ref: ItemRef, outcome: "passed" | "failed" | "error", detail: string, runner: string): Promise<void> {
  await query(`insert into exec_check_runs (item_kind, item_id, outcome, detail, runner) values ($1, $2, $3, $4, $5)`, [
    ref.kind,
    ref.itemId,
    outcome,
    detail.slice(0, 500),
    runner.slice(0, 120),
  ]);
}

// For `npm run items -- list`: how many served items are still waiting for
// the sandbox, and the oldest. A large or old backlog means the hourly job
// is not running (secret missing, workflow disabled).
export async function execBacklog(): Promise<{ pending: number; oldest: string | null }> {
  const r = await query<{ n: number; oldest: string | null }>(
    `select count(*)::int as n, min(e.created_at)::text as oldest from exec_checks e
      where not exists (select 1 from exec_check_runs r
                         where r.item_kind = e.item_kind and r.item_id = e.item_id and r.outcome in ('passed', 'failed'))`
  ).catch(() => [{ n: 0, oldest: null }]);
  return { pending: r[0]?.n ?? 0, oldest: r[0]?.oldest ?? null };
}
