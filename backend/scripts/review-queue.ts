// REQ-143: the content review queue (migration 055), for a person.
//
//   npm run review-queue -- list [open|resolved|all] [--json]
//   npm run review-queue -- resolve <id> <fixed|dismissed> "<what you found or changed>"
//   npm run review-queue -- run          one detection pass now (the daily cron does this)
//
// Entries are opened by the daily job (GET /api/cron/content-signals): rising
// learner reports, or a sharp drop in an item's correct rate. Nothing is
// pulled or hidden by the queue. To pull or void an item, use
// `npm run items` (it also resolves the item's open entries here).
import "../supabase/seed/env-local";
import { closePool } from "../lib/db";
import { listQueue, resolveQueueEntry, runContentSignals } from "../lib/content-review-queue";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function main() {
  const [cmd, a, b, c] = process.argv.slice(2).filter((x) => x !== "--json");
  const json = process.argv.includes("--json");
  if (cmd === "list" || !cmd) {
    const status = a === "resolved" || a === "all" ? a : "open";
    const rows = await listQueue({ status });
    if (json) {
      console.log(JSON.stringify(rows, null, 2));
      return;
    }
    console.log(`${rows.length} ${status} entr${rows.length === 1 ? "y" : "ies"}.`);
    for (const r of rows) {
      const e = r.evidence as any;
      const summary =
        r.signal === "learner_reports"
          ? `${e.reporters} learner report(s)${e.learnersAnswered ? ` / ${e.learnersAnswered} answered (${Math.round((e.reportRate ?? 0) * 100)}%)` : ""} since ${String(e.window?.from).slice(0, 10)}; reasons ${JSON.stringify(e.reasons)}`
          : `correct rate ${Math.round(e.baseline.rate * 100)}% (${e.baseline.learners} learners) -> ${Math.round(e.recent.rate * 100)}% (${e.recent.learners} learners), drop ${Math.round(e.drop * 100)} pts, z ${e.z}`;
      console.log(`\n${r.id}  ${r.status.toUpperCase()}  ${r.signal}  ${r.item_kind} ${r.item_id}`);
      console.log(`  ${r.course ?? "-"} / ${r.objective ?? "-"}${r.item_status ? `  [item ${r.item_status}]` : ""}`);
      console.log(`  "${r.label.slice(0, 140)}"`);
      console.log(`  ${summary}`);
      if (e.recentNotes?.length) console.log(`  notes: ${e.recentNotes.map((n: string) => JSON.stringify(n)).join(" | ")}`);
      console.log(`  first seen ${new Date(r.first_detected_at).toISOString().slice(0, 10)}, last ${new Date(r.last_detected_at).toISOString().slice(0, 10)}`);
      if (r.resolved_at) console.log(`  resolved ${new Date(r.resolved_at).toISOString().slice(0, 10)} (${r.resolution}) by ${r.resolved_by}: ${r.resolution_note ?? ""}`);
    }
    return;
  }
  if (cmd === "resolve" && a && UUID.test(a) && (b === "fixed" || b === "dismissed") && c?.trim()) {
    const by = process.env.USER || "reviewer";
    console.log((await resolveQueueEntry(a, b, c.trim(), by)) ? `Resolved (${b}).` : "No open entry with that id; nothing changed.");
    return;
  }
  if (cmd === "run") {
    const r = await runContentSignals();
    console.log(JSON.stringify({ ...r, params: undefined }, null, 2));
    return;
  }
  console.log('Usage: npm run review-queue -- list [open|resolved|all] [--json] | resolve <id> <fixed|dismissed> "<note>" | run');
  process.exitCode = 1;
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => closePool());
