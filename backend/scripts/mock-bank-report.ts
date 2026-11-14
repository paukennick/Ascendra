// REQ-298: `npm run mock:bank` (or `tsx scripts/mock-bank-report.ts`) --
//   how many more bank items each course needs for a full-length mock, and what
//   pre-generating them would cost at 3.5 cents an item.
//
//   --static   no database: the bank is assumed empty (worst case; needs only the seed)
//   (default)  reads the exam_items bank through DATABASE_URL (read-only SELECTs)
//   --code X   one course
//   --facts    also list the facts entries past their review date
//
// REPORT ONLY. This script never calls a model, never writes, and never starts
// pre-generation; the number it prints is what an owner-approved run would cost.
import "../supabase/seed/env-local";
import { CATALOG_TRACKS, activeUnits } from "../supabase/seed/catalog";
import { profileFrom } from "../lib/exam-sessions";
import { MOCK_EXAM_FACTS, staleFacts } from "../lib/mock-exam-facts";
import { courseBankRow, formatBankReport, type CourseBankInput } from "../lib/mock-bank-report";
import { servableSql } from "../lib/item-status-sql";

async function liveCounts(code: string, formats: string[]): Promise<Map<string, number>> {
  const { query } = await import("../lib/db");
  const rows = await query<{ title: string; total: number }>(
    `select cu.title, count(distinct lower(btrim(regexp_replace(i.stem, '[^[:alnum:]]+', ' ', 'g'))))::int as total
       from subject_tracks st
       join course_units cu on cu.track_id = st.id and (cu.retired_at is null or cu.retired_at > now())
       join objectives o on o.unit_id = cu.id and (o.retired_at is null or o.retired_at > now())
       join exam_items i on i.objective_id = o.id and i.item_format = any($2::text[]) and i.source = 'generated'
        and ${servableSql("exam", "i.id")}
      where st.code = $1 and st.user_id is null
      group by cu.title`,
    [code, formats]
  );
  return new Map(rows.map((r) => [r.title, r.total]));
}

async function main() {
  const staticMode = process.argv.includes("--static");
  const one = process.argv.includes("--code") ? process.argv[process.argv.indexOf("--code") + 1] : null;
  const rows = [];
  for (const t of CATALOG_TRACKS) {
    if (one && t.code !== one) continue;
    const c = t.credential;
    const profile = profileFrom({
      code: t.code,
      blueprint: c ? { examCode: c.examCode ?? null, credentialName: c.credentialName, durationMinutes: c.durationMinutes ?? null, questionFormat: c.questionFormat ?? null } : null,
      weightsAreBlueprint: c?.domainWeights !== "study_emphasis",
    });
    const counts = staticMode ? new Map<string, number>() : await liveCounts(t.code, profile.formats);
    const input: CourseBankInput = {
      code: t.code,
      title: t.title,
      requested: profile.mockQuestions,
      confirmed: profile.mock.confirmed,
      units: activeUnits(t).map((u) => ({
        unitId: u.title,
        title: u.title,
        weight: u.weight ?? null,
        objectives: u.objectives.length,
        total: counts.get(u.title) ?? 0,
        fresh: counts.get(u.title) ?? 0,
      })),
    };
    rows.push(courseBankRow(input));
  }
  console.log(formatBankReport(rows, staticMode ? "static" : "live"));
  if (process.argv.includes("--facts")) {
    const today = new Date().toISOString().slice(0, 10);
    const stale = staleFacts(today);
    console.log(`\nFacts entries (${MOCK_EXAM_FACTS.length}); past their review date on ${today}: ${stale.length ? stale.map((f) => f.code).join(", ") : "none"}`);
  }
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (!process.argv.includes("--static")) (await import("../lib/db")).closePool();
  });
