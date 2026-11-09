// REQ-162 (docs/sims.md 4.4, 16): the scenario linter over every seeded
// document (lib/sim/documents.ts).
//
//   npm run sims:lint        schema, semantics, content rules, golden replays,
//                            bounded path search, source re-check dates
//   npm run sims:validate    schema only: each document and its golden file
//                            against the zod schemas
//
// Exits 1 on any error; warnings are printed and do not fail.
import { ALL_DOCUMENTS } from "../lib/sim/documents.ts";
import { checkDocument, formatReport } from "../lib/sim/lint.ts";

const full = !process.argv.includes("--schema-only");
const now = new Date().toISOString().slice(0, 10);
let errors = 0;
if (!ALL_DOCUMENTS.length) console.log("no seeded sim documents");
for (const entry of ALL_DOCUMENTS) {
  const r = checkDocument(entry, { full, now });
  errors += r.problems.filter((p) => p.level === "error").length;
  for (const line of formatReport(r)) console.log(line);
}
console.log(errors ? `FAIL: ${errors} error(s)` : `OK: ${ALL_DOCUMENTS.length} document(s)${full ? "" : " (schema only)"}`);
process.exit(errors ? 1 : 0);
