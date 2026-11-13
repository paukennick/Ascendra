// The item kinds learners can report and the SQL that leaves pulled ones
// out (docs: lib/item-quality.ts, which re-exports both). Kept apart from
// lib/item-quality.ts, which imports the fact checker, so a read-only route
// can use servableSql without reaching the model (REQ-249,
// lib/ai-spend-gate.test.ts).

// REQ-123: "lab" (migration 050) -- a verifiable lab, by labs.id.
// REQ-199: "sim" (migration 067) -- one simulation VERSION, by sim_versions.id.
export const ITEM_KINDS = ["lesson", "review", "exam", "quiz", "comparison", "lab", "sim"] as const;
export type ItemKind = (typeof ITEM_KINDS)[number];

// SQL: true when the item is not pulled (no status row, or cleared). Used in
// every query that picks an item to serve. `idExpr` is a SQL expression for
// the item id (cast to text here).
export function servableSql(kind: ItemKind, idExpr: string): string {
  return `not exists (select 1 from item_status qs where qs.item_kind = '${kind}' and qs.item_id = (${idExpr})::text and qs.status <> 'cleared')`;
}
