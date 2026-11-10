// REQ-142: what is due for a source re-check, from the seed files alone (no
// database, no network). Visibility only: stale content keeps being served.
//
//   npm run currency:report                      as of today, 60-day window
//   npm run currency:report -- --as-of 2027-08-01
//   npm run currency:report -- --days 90 --json
//
// Lists, grouped by course, every exam outline and lab source whose re-check
// date has passed or falls within the window, then the courses that record
// no outline at all, those whose outline has no version, those whose
// publisher prints none (with the reason), and the courses with no exam.
import { CATALOG_TRACKS } from "../supabase/seed/catalog";
import { LAB_SETS } from "../supabase/seed/labs";
import { DUE_WINDOW_DAYS, currencyReport, dayOf } from "../lib/content-currency";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const asOf = dayOf(arg("--as-of")) ?? new Date().toISOString().slice(0, 10);
const days = Number(arg("--days") ?? DUE_WINDOW_DAYS);
if (!Number.isInteger(days) || days < 0) {
  console.error("--days must be a whole number of days");
  process.exit(1);
}
const r = currencyReport(CATALOG_TRACKS, LAB_SETS, asOf, days);

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(r, null, 2));
} else {
  const due = r.courses.reduce((n, c) => n + c.due.length, 0);
  console.log(`Source currency as of ${r.asOf} (due by ${r.dueBy}): ${due} source(s) in ${r.courses.length} course(s).`);
  for (const c of r.courses) {
    console.log(`\n${c.code}  ${c.title}`);
    for (const d of c.due) {
      const label = d.status === "overdue" ? "OVERDUE " : "due soon";
      const what = d.what === "outline" ? "outline" : d.what === "unit_source" ? `unit source (${d.kind})` : `lab source (${d.kind}, ${d.labs} labs)`;
      console.log(`  ${label}  re-check by ${d.recheckBy || "(no date)"}  checked ${d.checkedAt || "(never)"}  ${what}`);
      console.log(`            ${d.url}`);
    }
  }
  console.log(`\nCourses with no recorded outline (${r.noOutline.length}):`);
  for (const c of r.noOutline) console.log(`  ${c.code.padEnd(12)} ${c.trackType.padEnd(13)} ${c.title}`);
  console.log(`\nCourses whose outline has no recorded version (${r.noVersion.length}):`);
  for (const c of r.noVersion) console.log(`  ${c.code.padEnd(12)} ${c.outline}`);
  console.log(`\nOutlines whose publisher prints no version (${r.unversioned.length}), with the reason recorded:`);
  for (const c of r.unversioned) console.log(`  ${c.code.padEnd(12)} ${c.outline}\n${" ".repeat(15)}${c.why}`);
  console.log(`\nCourses with no exam, dated through their curriculum source (${r.nonExam.length}):`);
  for (const c of r.nonExam) console.log(`  ${c.code.padEnd(12)} ${c.kind.padEnd(19)} ${c.name} (${c.version})`);
}
