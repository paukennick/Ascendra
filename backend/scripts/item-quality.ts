// REQ-114: the human side of shared-item quality. Quarantine and hold-back
// are automatic; deciding an item is really wrong (which voids every answer
// graded against it) or really fine (served again) is a person's call.
//
//   npm run items -- list                         pulled items and recent holdbacks
//   npm run items -- staged                       REQ-196: open findings from the
//                                                 re-check and sandbox jobs (still served)
//   npm run items -- confirm <kind> <itemId> "<what is wrong>"
//   npm run items -- clear   <kind> <itemId> "<why it is fine>"
//
// kind: lesson | review | exam | quiz | comparison | lab | sim. itemId as listed
// (a sim's is the sim_versions.id: confirming pulls that version).
//
// REQ-196: confirm and clear also take a STAGED item (listed by `staged`,
// not yet pulled). confirm pulls it and voids answers graded against it --
// the first moment a learner sees any change. clear records that a person
// checked it (item_status 'cleared'), so the jobs never stage it again.
// This command runs with the owner's database URL on a person's machine,
// never in a workflow: the jobs' role cannot write item_status at all.
import "../supabase/seed/env-local";
import { query, queryOne, closePool } from "../lib/db";
import { ITEM_KINDS, clearItem, clearStaged, confirmItemWrong, type ItemKind } from "../lib/item-quality";
import { resolveQueueForItem } from "../lib/content-review-queue";
import { listStaged, stagedFor } from "../lib/staging";
import { execBacklog } from "../lib/exec-checks";

async function main() {
  const [cmd, kind, itemId, note] = process.argv.slice(2);
  if (cmd === "list") {
    const pulled = await query(
      `select item_kind, item_id, status, reason, flag_count, voided_attempts, left(question, 100) as question, quarantined_at
         from item_status where status <> 'cleared' order by quarantined_at desc limit 100`
    );
    console.table(pulled);
    const held = await query(
      `select item_kind, reason, left(claims::text, 120) as claims, created_at from item_holdbacks order by created_at desc limit 50`
    );
    console.table(held);
    const open = await listStaged({ open: true });
    const b = await execBacklog();
    console.log(`${open.length} staged finding(s) waiting for a decision (npm run items -- staged).`);
    console.log(`${b.pending} served item(s) waiting for the sandbox job${b.oldest ? `, oldest queued ${b.oldest}` : ""}.`);
    return;
  }
  if (cmd === "staged") {
    const open = await listStaged({ open: true });
    console.table(
      open.map((r) => ({ source: r.source, kind: r.kind, itemId: r.itemId, question: r.question.slice(0, 80), claims: r.claims.join("; ").slice(0, 120), staged: r.createdAt }))
    );
    console.log('Decide each: npm run items -- confirm <kind> <itemId> "<what is wrong>" | clear <kind> <itemId> "<why it is fine>"');
    return;
  }
  if ((cmd === "confirm" || cmd === "clear") && (ITEM_KINDS as readonly string[]).includes(kind) && itemId && note) {
    let s = await queryOne<{ objective_id: string | null; question: string }>(
      `select objective_id, question from item_status where item_kind = $1 and item_id = $2`,
      [kind, itemId]
    );
    const staged = s ? null : await stagedFor(kind, itemId);
    if (!s && staged) s = { objective_id: staged.objectiveId, question: staged.question };
    if (!s) throw new Error("No such pulled or staged item; run `list` or `staged`.");
    if (staged && cmd === "clear") {
      await clearStaged({ kind: kind as ItemKind, itemId, objectiveId: s.objective_id, question: s.question }, note);
      console.log("Cleared: it stays in rotation and will not be staged again.");
      return;
    }
    if (cmd === "confirm") {
      const n = await confirmItemWrong({ kind: kind as ItemKind, itemId, objectiveId: s.objective_id, question: s.question }, note);
      console.log(`Confirmed wrong. ${n} answer(s) voided and the learners' mastery recomputed.`);
    } else {
      console.log((await clearItem({ kind: kind as ItemKind, itemId }, note)) ? "Cleared: served again." : "Not quarantined; nothing changed.");
    }
    // REQ-143: a person has now looked at this item; its open review-queue
    // entries (npm run review-queue) are resolved with the same decision.
    const q = await resolveQueueForItem(kind, itemId, cmd === "confirm" ? "confirmed_wrong" : "cleared", note);
    if (q) console.log(`Resolved ${q} open review-queue entr${q === 1 ? "y" : "ies"} for this item.`);
    return;
  }
  console.log('Usage: npm run items -- list | staged | confirm <kind> <itemId> "<note>" | clear <kind> <itemId> "<note>"');
  process.exitCode = 1;
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => closePool());
