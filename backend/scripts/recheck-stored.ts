// REQ-187 (audit 2026-11-09 R6), sandboxed by REQ-196: re-run the
// fact-check on every still-served lesson check and keyed item stored before
// the 2026-11-07 gate, and STAGE the ones the checker does not agree with
// (lib/recheck-stored.ts). Staging changes nothing a learner sees; a person
// decides each finding with `npm run items -- confirm | clear`.
//
//   npm run items:recheck                          estimate: no model call, no write
//   npm run items:recheck -- --mode check          calls the model, writes nothing
//   npm run items:recheck -- --mode apply          calls the model, stages findings
//   npm run items:recheck -- --budget 3            hard cap in USD (default 2, max 25)
//   npm run items:recheck -- --kinds lesson,quiz   only these kinds
//   npm run items:recheck -- --limit 50            at most this many items
//   npm run items:recheck -- --before 2026-11-07   a different cut-off
//
// Run by the "Re-check pre-gate content" workflow, as a LOGIN member of the
// content_recheck role (RECHECK_DATABASE_URL) with its own Anthropic key
// (RECHECK_ANTHROPIC_API_KEY, a separate Console workspace). The script
// refuses to run as a role that can write item_status or served content
// (lib/recheck-guard.ts). Model usage is tallied in-process, never written to
// ai_calls, so it cannot count toward learners' AI caps.
import "../supabase/seed/env-local";
import { closePool } from "../lib/db";
import { ITEM_KINDS, type ItemKind } from "../lib/item-quality";
import { GATE_DATE, recheckStored, type RecheckMode } from "../lib/recheck-stored";
import { assertStagingOnlyRole } from "../lib/recheck-guard";
import { RunBudget } from "../lib/run-budget";
import { factCheckModel } from "../lib/fact-check";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

export const MAX_BUDGET_USD = 25;

async function main() {
  const mode = (arg("--mode") ?? (process.argv.includes("--apply") ? "apply" : "estimate")) as RecheckMode;
  if (!["estimate", "check", "apply"].includes(mode)) throw new Error("--mode: estimate, check or apply");
  const before = arg("--before") ?? GATE_DATE;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(before)) throw new Error("--before must be YYYY-MM-DD");
  const kinds = (arg("--kinds") ?? "lesson,review,quiz,exam,comparison").split(",").map((k) => k.trim()) as ItemKind[];
  if (kinds.some((k) => !(ITEM_KINDS as readonly string[]).includes(k) || k === "lab")) throw new Error("--kinds: lesson, review, quiz, exam, comparison");
  const limitRaw = arg("--limit");
  const limit = limitRaw ? Number(limitRaw) : undefined;
  if (limit !== undefined && !(Number.isInteger(limit) && limit > 0)) throw new Error("--limit must be a positive integer");
  const budgetUsd = Number(arg("--budget") ?? "2");
  if (!(Number.isFinite(budgetUsd) && budgetUsd > 0 && budgetUsd <= MAX_BUDGET_USD)) throw new Error(`--budget must be a dollar amount above 0 and at most ${MAX_BUDGET_USD}`);

  const role = await assertStagingOnlyRole();
  console.log(`Connected as ${role.role} (staging only).`);

  const budget = new RunBudget(budgetUsd);
  if (mode !== "estimate") budget.install();
  const model = factCheckModel();

  // The estimate is always printed first, before any call.
  const plan = await recheckStored({ before, mode: "estimate", kinds, limit, model });
  console.log(
    `Budget: ${plan.items} item(s) stored before ${before} in ${plan.batches} batch(es) on ${model} with thinking. ` +
      `Typical cost ~$${plan.estimate.typicalUsd.toFixed(2)}, at most $${plan.estimate.upperUsd.toFixed(2)}. ` +
      `Cap for this run: $${budgetUsd.toFixed(2)}${plan.estimate.upperUsd > budgetUsd ? " (the run may stop at the cap; re-run to continue)" : ""}. ` +
      `${plan.skipped} item(s) cannot be checked.`
  );
  if (mode === "estimate") return;

  const r = await recheckStored({ before, mode, kinds, limit, model, budget, log: (m) => console.log(m) });
  console.log(
    `${mode === "apply" ? "Applied" : "Checked (nothing written)"}: ${r.checked} checked, ${r.agreed} agreed, ` +
      `${r.staged.length} ${mode === "apply" ? "staged for review" : "would be staged"}, ${r.skipped} skipped, ${r.errors.length} batch errors. ` +
      `Spent $${budget.spentUsd.toFixed(4)} of $${budgetUsd.toFixed(2)} in ${budget.calls} call(s).`
  );
  if (r.stoppedAtBudget) console.log(`Stopped at the budget: ${r.stoppedAtBudget}`);
  if (mode === "apply" && r.staged.length) console.log("Review them: npm run items -- staged");
  for (const e of r.errors) console.log(`error: ${e}`);
  if (r.errors.length) process.exitCode = 1;
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => closePool());
