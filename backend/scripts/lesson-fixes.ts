// REQ-187: apply the 2026-11-09 audit's lesson fixes (and, since REQ-195, the
// authored lessons of reframed general courses -- lib/authored-lessons.ts)
// through the app's own mechanisms (lib/lesson-fixes.ts).
//
//   npm run lessons:fix -- lookup     read-only: each fix's objective id and
//                                     whether its stored lesson is the audited one
//   npm run lessons:fix               dry run: what would change (the default)
//   npm run lessons:fix -- --apply    apply
//
// Run against production by the "Lesson fixes" GitHub workflow
// (.github/workflows/lesson-fixes.yml). Safe to re-run: a fixed lesson no
// longer contains its `expect` text and is skipped, and an authored lesson
// is not authored twice. Logs ids and outcomes only.
import "../supabase/seed/env-local";
import { closePool } from "../lib/db";
import { authoredFixes, applyLessonFix, lookupFix, lessonText, type LessonFix } from "../lib/lesson-fixes";
import { LESSON_FIXES_2026_11_09 } from "./lesson-fixes-2026-11-09";

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  if (args[0] === "lookup") {
    for (const f of LESSON_FIXES_2026_11_09) {
      const t = await lookupFix(f);
      const status = t.length !== 1 ? `matched ${t.length} objectives` : !t[0].lesson ? "no stored lesson" : (f.expect ?? []).every((e) => lessonText(t[0].lesson!).includes(e)) ? "audited lesson present" : "stored lesson differs (already regenerated?)";
      console.log(`${f.id}\t${t.map((x) => x.objectiveId).join(",") || "-"}\t${f.action}\t${status}`);
    }
    for (const f of await authoredFixes()) {
      const t = await lookupFix(f);
      console.log(`${f.id}\t${t.map((x) => x.objectiveId).join(",") || "-"}\tauthored\tnon-authored lesson stored`);
    }
    return;
  }
  // The audit's fixes first, then the authored lessons.
  const fixes: LessonFix[] = [...LESSON_FIXES_2026_11_09];
  const results = [];
  for (const f of fixes) results.push(await applyLessonFix(f, { apply }));
  for (const f of await authoredFixes()) results.push(await applyLessonFix(f, { apply }));
  for (const r of results) {
    console.log(`${r.status.padEnd(11)} ${r.id}${r.objectiveId ? ` (${r.objectiveId})` : ""}: ${r.detail}${r.voidedAnswers !== undefined ? `; ${r.voidedAnswers} answer(s) voided` : ""}`);
  }
  const errors = results.filter((r) => r.status === "error");
  console.log(`${apply ? "Applied" : "Dry run"}: ${results.length} fixes, ${results.filter((r) => r.status === (apply ? "applied" : "would_apply")).length} ${apply ? "applied" : "would apply"}, ${results.filter((r) => r.status === "skipped").length} skipped, ${errors.length} errors.`);
  if (errors.length) process.exitCode = 1;
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => closePool());
