import { query } from "@/lib/db";
import type { ItemKind } from "@/lib/item-quality";

// REQ-196: the staging area for the re-check and sandbox jobs.
//
// A job's finding is an item_holdbacks row (reason 'fact_check') whose
// content carries `staged` and the item's kind and id. Staging changes
// nothing a learner sees: item_holdbacks is a log no serving query reads
// (lib/staging-boundary.test.ts holds that), and the item keeps being
// served until a person decides with `npm run items -- confirm | clear`.
// The job's database role (content_recheck, migration 064) can insert here
// and nowhere that serves.
//
// Unlike recordHoldback (which never throws, because a request must not fail
// on a log write), this throws: a job that cannot stage must not record the
// item as handled.

export type StageSource = "recheck" | "exec";

export interface StagedItem {
  source: StageSource;
  kind: ItemKind;
  itemId: string;
  objectiveId: string | null;
  question: string;
  claims: string[];
  detail?: unknown;
}

export async function stageForReview(s: StagedItem): Promise<void> {
  await query(
    `insert into item_holdbacks (item_kind, objective_id, reason, claims, content, model)
     values ($1, $2, 'fact_check', $3, $4, null)`,
    [
      s.kind,
      s.objectiveId,
      JSON.stringify(s.claims),
      JSON.stringify({ staged: s.source, itemKind: s.kind, itemId: s.itemId, question: s.question, detail: s.detail ?? null }),
    ]
  );
}

// SQL: true when an item already has a staged finding (any source), so a
// re-run does not stage it twice. `kindExpr` / `idExpr` are SQL expressions.
export function alreadyStagedSql(kindExpr: string, idExpr: string): string {
  return `exists (select 1 from item_holdbacks hb
     where hb.content ? 'staged' and hb.content->>'itemKind' = (${kindExpr}) and hb.content->>'itemId' = (${idExpr})::text)`;
}

export interface StagedRow {
  id: string;
  source: StageSource;
  kind: ItemKind;
  itemId: string;
  objectiveId: string | null;
  question: string;
  claims: string[];
  createdAt: string;
  // the person's decision so far: null while open
  decided: string | null;
}

// Staged findings with the person's decision (an item_status row made by
// `npm run items -- confirm | clear` after the finding), newest first.
export async function listStaged(opts: { open?: boolean; limit?: number } = {}): Promise<StagedRow[]> {
  const rows = await query<{
    id: string;
    source: StageSource;
    kind: ItemKind;
    item_id: string;
    objective_id: string | null;
    question: string;
    claims: string[];
    created_at: string;
    decided: string | null;
  }>(
    `select hb.id::text, hb.content->>'staged' as source, hb.content->>'itemKind' as kind, hb.content->>'itemId' as item_id,
            hb.objective_id, hb.content->>'question' as question, hb.claims, hb.created_at::text,
            (select s.status from item_status s where s.item_kind = hb.content->>'itemKind' and s.item_id = hb.content->>'itemId') as decided
       from item_holdbacks hb
      where hb.content ? 'staged'
      order by hb.created_at desc
      limit $1`,
    [opts.limit ?? 200]
  );
  return rows
    .map((r) => ({
      id: r.id,
      source: r.source,
      kind: r.kind,
      itemId: r.item_id,
      objectiveId: r.objective_id,
      question: r.question,
      claims: Array.isArray(r.claims) ? r.claims : [],
      createdAt: r.created_at,
      decided: r.decided,
    }))
    .filter((r) => (opts.open ? r.decided === null : true));
}

// The staged finding for one item, if any (newest).
export async function stagedFor(kind: string, itemId: string): Promise<StagedRow | null> {
  const r = await query<{ id: string; source: StageSource; objective_id: string | null; question: string; claims: string[]; created_at: string }>(
    `select id::text, content->>'staged' as source, objective_id, content->>'question' as question, claims, created_at::text
       from item_holdbacks
      where content ? 'staged' and content->>'itemKind' = $1 and content->>'itemId' = $2
      order by created_at desc limit 1`,
    [kind, itemId]
  );
  const x = r[0];
  return x
    ? { id: x.id, source: x.source, kind: kind as ItemKind, itemId, objectiveId: x.objective_id, question: x.question, claims: x.claims ?? [], createdAt: x.created_at, decided: null }
    : null;
}
