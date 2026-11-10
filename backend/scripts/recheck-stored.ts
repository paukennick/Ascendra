// REQ-187 (audit 2026-11-09 R6): re-run the fact-check on every still-served
// lesson check and keyed item stored before the 2026-11-07 gate, and pull
// the ones the checker does not agree with (lib/recheck-stored.ts).
//
//   npm run items:recheck                         dry run: checks, writes nothing
//   npm run items:recheck -- --apply              pull failures (quarantine + holdback log)
//   npm run items:recheck -- --kinds lesson,quiz  only these kinds
//   npm run items:recheck -- --limit 50           at most this many items
//   npm run items:recheck -- --before 2026-11-07  a different cut-off
//
// Needs ANTHROPIC_API_KEY (it calls the model) and DATABASE_URL. Run against
// production by the "Re-check pre-gate content" GitHub workflow. Pulled items
// are listed by `npm run items -- list` for a person to clear or confirm.
import "../supabase/seed/env-local";
import { closePool } from "../lib/db";
import { ITEM_KINDS, type ItemKind } from "../lib/item-quality";
import { GATE_DATE, recheckStored } from "../lib/recheck-stored";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const apply = process.argv.includes("--apply");
  const before = arg("--before") ?? GATE_DATE;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(before)) throw new Error("--before must be YYYY-MM-DD");
  const kinds = (arg("--kinds") ?? "lesson,review,quiz,exam,comparison").split(",").map((k) => k.trim()) as ItemKind[];
  if (kinds.some((k) => !(ITEM_KINDS as readonly string[]).includes(k) || k === "lab")) throw new Error("--kinds: lesson, review, quiz, exam, comparison");
  const limitRaw = arg("--limit");
  const limit = limitRaw ? Number(limitRaw) : undefined;
  if (limit !== undefined && !(Number.isInteger(limit) && limit > 0)) throw new Error("--limit must be a positive integer");
  const r = await recheckStored({ before, apply, kinds, limit, log: (m) => console.log(m) });
  console.log(
    `${apply ? "Applied" : "Dry run"} (stored before ${before}): ${r.checked} checked, ${r.agreed} agreed, ${r.pulled.length} ${apply ? "pulled" : "would be pulled"}, ${r.skipped} skipped, ${r.errors.length} batch errors.`
  );
  for (const e of r.errors) console.log(`error: ${e}`);
  if (r.errors.length) process.exitCode = 1;
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => closePool());
