// REQ-310: the source verification pass of 2026-11-16. Builders on Nov 14-16
// could only search the web, so they marked some sources "to verify" or
// read them only through a summary. This pass read each source directly
// where it could. These tests pin what the pass found: each source it
// confirmed carries the reading date and no longer says "to verify", and
// each fact it corrected stays corrected (one test per FAIL entry).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ALL_DOCUMENTS } from "./documents.ts";

interface SourceLike { cite: string; checkedAt?: string; note?: string; url?: string }

const PASS_DATE = "2026-11-16";
const UNREAD = /to verify|title only|no text shown/i;

function rawOf(slug: string): Record<string, unknown> {
  const entry = ALL_DOCUMENTS.find((e) => e.slug === slug);
  assert.ok(entry, `${slug} registered`);
  return JSON.parse(readFileSync(entry!.file, "utf8")) as Record<string, unknown>;
}

function sourcesOf(node: unknown, out: SourceLike[] = []): SourceLike[] {
  if (Array.isArray(node)) for (const v of node) sourcesOf(v, out);
  else if (node && typeof node === "object") {
    const o = node as Record<string, unknown>;
    if (typeof o.cite === "string") out.push(o as unknown as SourceLike);
    for (const v of Object.values(o)) sourcesOf(v, out);
  }
  return out;
}

// [slug, cite prefix]: sources this pass read directly and confirmed.
export const VERIFIED_20261116: readonly (readonly [string, string])[] = [
  ["postpartum-check-boggy-fundus", "OpenStax. Maternal-Newborn Nursing"],
  ["postpartum-check-boggy-fundus", "StatPearls. Postpartum Hemorrhage"],
  ["postpartum-hemorrhage-atony", "StatPearls. Postpartum Hemorrhage"],
  ["postpartum-hemorrhage-atony", "OpenStax. Maternal-Newborn Nursing (2024), section 21.2"],
  ["postpartum-hemorrhage-atony", "Methylergonovine maleate injection"],
  ["parkinson-freezing-session", "Osborne JA"],
  ["clinic-sulfonylurea-hypoglycemia", "American Diabetes Association Professional Practice Committee. 6."],
];

for (const [slug, prefix] of VERIFIED_20261116) {
  test(`${slug}: "${prefix}" read on ${PASS_DATE} and no longer marked unread`, () => {
    const hits = sourcesOf(rawOf(slug)).filter((s) => s.cite.startsWith(prefix));
    assert.ok(hits.length > 0, "cited");
    for (const s of hits) {
      assert.equal(s.checkedAt, PASS_DATE, `${s.cite}: checkedAt`);
      assert.doesNotMatch(s.note ?? "", UNREAD, `${s.cite}: note still says it was not read`);
      assert.match(s.note ?? "", /2026-11-16/, `${s.cite}: note says when it was read`);
    }
  });
}

test("FAIL-2130: the Parkinson model reasoning does not call behavior change a strong recommendation", () => {
  const doc = rawOf("parkinson-freezing-session") as { scoring: { modelReasoning: string } };
  const mr = doc.scoring.modelReasoning;
  // Osborne et al. 2022, Table 1: behavior-change approaches are a moderate-strength recommendation.
  assert.doesNotMatch(mr, /strong recommendations are[^.]*behavior-change/);
  assert.match(mr, /behavior-change approaches \(a moderate-strength recommendation\)/);
});
