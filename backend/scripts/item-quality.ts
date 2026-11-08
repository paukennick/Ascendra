// REQ-114: the human side of shared-item quality. Quarantine and hold-back
// are automatic; deciding an item is really wrong (which voids every answer
// graded against it) or really fine (served again) is a person's call.
//
//   npm run items -- list                         pulled items and recent holdbacks
//   npm run items -- confirm <kind> <itemId> "<what is wrong>"
//   npm run items -- clear   <kind> <itemId> "<why it is fine>"
//
// kind: lesson | review | exam | quiz | comparison. itemId as listed.
import "../supabase/seed/env-local";
import { query, queryOne, closePool } from "../lib/db";
import { ITEM_KINDS, clearItem, confirmItemWrong, type ItemKind } from "../lib/item-quality";

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
    return;
  }
  if ((cmd === "confirm" || cmd === "clear") && (ITEM_KINDS as readonly string[]).includes(kind) && itemId && note) {
    const s = await queryOne<{ objective_id: string | null; question: string }>(
      `select objective_id, question from item_status where item_kind = $1 and item_id = $2`,
      [kind, itemId]
    );
    if (!s) throw new Error("No such pulled item; run `list`.");
    if (cmd === "confirm") {
      const n = await confirmItemWrong({ kind: kind as ItemKind, itemId, objectiveId: s.objective_id, question: s.question }, note);
      console.log(`Confirmed wrong. ${n} answer(s) voided and the learners' mastery recomputed.`);
    } else {
      console.log((await clearItem({ kind: kind as ItemKind, itemId }, note)) ? "Cleared: served again." : "Not quarantined; nothing changed.");
    }
    return;
  }
  console.log('Usage: npm run items -- list | confirm <kind> <itemId> "<note>" | clear <kind> <itemId> "<note>"');
  process.exitCode = 1;
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => closePool());
