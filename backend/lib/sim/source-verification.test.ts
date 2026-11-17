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
  ["postop-hemorrhage-early-signs", "Rossaint R"],
  ["femoral-access-retroperitoneal-bleed", "Rossaint R"],
  ["copd-exacerbation-niv", "Davidson AC"],
  ["sepsis-to-septic-shock", "Levy MM"],
  ["acute-ischemic-stroke-lvo", "Labetalol hydrochloride injection"],
  ["acute-ischemic-stroke-lvo", "Cardene IV (nicardipine)"],
  ["inferior-stemi-cath-alert", "Rao SV"],
  ["ncmhce-trauma-treatment-plan", "APA Clinical Practice Guideline for the Treatment of PTSD"],
  ["aswbm-child-abuse-report", "RCW 26.44.030"],
  ["aswbm-child-abuse-report", "RCW 26.44.020"],
  ["aswbm-child-abuse-report", "RCW 26.44.060"],
  ["aswbc-threat-identifiable-person", "Volk v. DeMeerleer"],
  ["aswbc-threat-identifiable-person", "RCW 71.05.120(3)"],
  ["duty-to-protect-threat", "Volk v. DeMeerleer"],
  ["resident-chokes-at-lunch", "42 CFR 483.24(a)(3)"],
  ["resident-found-on-floor", "42 CFR 483.12(c)"],
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

test("FAIL-2131: PTSD content follows the 2025 APA guideline, not the 2017 strength ranking", async () => {
  const doc = rawOf("ncmhce-trauma-treatment-plan");
  const text = JSON.stringify(doc);
  assert.doesNotMatch(text, /cognitive processing therapy, a strongly recommended treatment/);
  assert.doesNotMatch(text, /Describe the recommended trauma-focused therapies \(CPT, PE, EMDR\)/);
  const eppp = readFileSync(new URL("../../supabase/seed/labs/eppp.ts", import.meta.url), "utf8");
  // 2025 update: cognitive therapy is suggested (second line); brief eclectic psychotherapy is not listed.
  assert.doesNotMatch(eppp, /strongly recommends[^.]*cognitive therapy/);
  assert.doesNotMatch(eppp, /brief eclectic psychotherapy/);
  assert.match(eppp, /suggests cognitive therapy, EMDR and narrative exposure therapy/);
});

test("FAIL-2132: the Volk v. DeMeerleer citation quotes the opinion's own words", () => {
  const cites = sourcesOf(rawOf("aswbc-threat-identifiable-person")).filter((x) => x.cite.startsWith("Volk v. DeMeerleer"));
  assert.ok(cites.length > 0);
  for (const c of cites) {
    assert.doesNotMatch(c.cite, /'reasonable care, consistent with the standards of the mental health profession'/);
    assert.match(c.cite, /'under a duty of reasonable care to act consistent with the standards of the mental health profession and to protect the foreseeable victims'/);
  }
});
