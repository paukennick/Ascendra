// REQ-190: every seeded sim resolves its objective by exact title in its
// course (supabase/seed/sims-seed.ts). Phase 1a never seeded, so the
// tamponade document named an objective the CCRN catalog does not have;
// this keeps the seed from failing on a title again. Secondary objectives
// are exact titles too (analytics only, docs/sims.md 9.4).
import { test } from "node:test";
import assert from "node:assert/strict";
import { ALL_DOCUMENTS, EPPP_OBJECTIVES, EPPP_SESSION_DOCUMENTS, loadDocument } from "./documents.ts";
import { CATALOG_TRACKS, activeUnits } from "../../supabase/seed/catalog";

// REQ-225: the EPPP course is built on its own branch. Until it is in the
// catalog, its sessions are checked against the objective titles they were
// written for (a fixture); once it lands, the catalog check below applies to
// them like any other sim, with no change here.
const eppp = CATALOG_TRACKS.find((t) => t.code === "EPPP");
test("EPPP sessions: each registers to one of the three EPPP objective titles, one sim per objective", () => {
  const objectives = EPPP_SESSION_DOCUMENTS.map((e) => loadDocument(e).objective);
  assert.deepEqual([...objectives].sort(), [...EPPP_OBJECTIVES].sort());
  if (eppp) {
    const titles = activeUnits(eppp).flatMap((u) => u.objectives);
    for (const o of EPPP_OBJECTIVES) assert.ok(titles.includes(o), `EPPP catalog has "${o}"`);
  }
});

for (const e of ALL_DOCUMENTS) {
  if (e.course === "EPPP" && !eppp) continue; // pending the EPPP course (above)
  test(`${e.course}/${e.slug}: objective titles exist in the course catalog`, () => {
    const track = CATALOG_TRACKS.find((t) => t.code === e.course);
    assert.ok(track, `course ${e.course} is in the catalog`);
    const titles = activeUnits(track).flatMap((u) => u.objectives);
    const doc = loadDocument(e);
    assert.equal(titles.filter((t) => t === doc.objective).length, 1, `exactly one active objective titled "${doc.objective}"`);
    for (const s of doc.secondaryObjectives ?? []) assert.ok(titles.includes(s), `secondary objective "${s}"`);
  });
}
