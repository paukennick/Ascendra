// REQ-190: every seeded sim resolves its objective by exact title in its
// course (supabase/seed/sims-seed.ts). Phase 1a never seeded, so the
// tamponade document named an objective the CCRN catalog does not have;
// this keeps the seed from failing on a title again. Secondary objectives
// are exact titles too (analytics only, docs/sims.md 9.4).
import { test } from "node:test";
import assert from "node:assert/strict";
import { ALL_DOCUMENTS, loadDocument } from "./documents.ts";
import { CATALOG_TRACKS, activeUnits } from "../../supabase/seed/catalog";

for (const e of ALL_DOCUMENTS) {
  test(`${e.course}/${e.slug}: objective titles exist in the course catalog`, () => {
    const track = CATALOG_TRACKS.find((t) => t.code === e.course);
    assert.ok(track, `course ${e.course} is in the catalog`);
    const titles = activeUnits(track).flatMap((u) => u.objectives);
    const doc = loadDocument(e);
    assert.equal(titles.filter((t) => t === doc.objective).length, 1, `exactly one active objective titled "${doc.objective}"`);
    for (const s of doc.secondaryObjectives ?? []) assert.ok(titles.includes(s), `secondary objective "${s}"`);
  });
}
