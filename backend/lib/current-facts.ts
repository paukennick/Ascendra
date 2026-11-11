import type { SeedTrack } from "../supabase/seed/data";
import { dayOf } from "@/lib/content-currency";

// REQ-187 (audit 2026-11-09 R10): a short, dated "current facts" block per
// course, added to every prompt's course framing (lib/prompts.ts
// domainFraming). The writer and checker are given only titles, so they fall
// back on what they remember -- an older exam version, last year's degree
// plan, a renamed product. The block states what the course is built on, as
// the seed records it, with the date it was last checked:
//   - an exam: its name, code and revision, status, and the dates it takes
//     effect and retires (SeedCredential);
//   - a course with no exam: its curriculum source and version
//     (SeedTrack.curriculum, REQ-142).
// Nothing here is invented: a field the seed does not record is left out.
// Built from the seed files (no database column holds the curriculum), loaded
// once per server instance on first use.

// REQ-195: with a unit title, the unit's own dated references (SeedUnit
// `sources`, e.g. the open textbook a general course is taught from) are
// listed too, so the writer teaches the course as that text does.
export function currentFactsBlock(track: SeedTrack, unitTitle?: string | null): string | null {
  const lines: string[] = [];
  const c = track.credential;
  let checked: string | null = null;
  if (c) {
    const name = c.standardName ?? c.credentialName;
    const code = c.examCode ? ` ${c.examCode}` : "";
    const rev = c.examRevision ?? c.standardRevision;
    const parts = [`${name}${code}${rev ? ` (${rev})` : ""}`];
    if (c.objectivesRevision) parts.push(`objectives revision ${c.objectivesRevision}`);
    if (c.status) parts.push(`status ${c.status}`);
    const eff = dayOf(c.effectiveDate);
    const ret = dayOf(c.retirementDate);
    if (eff) parts.push(`in effect from ${eff}`);
    if (ret) parts.push(`retires ${ret}`);
    lines.push(`- ${c.examCode ? "Exam" : "Standard"}: ${parts.join("; ")}.`);
    checked = dayOf(track.sourceVerifiedAt) ?? dayOf(c.lastVendorVerifiedAt);
  }
  const k = track.curriculum;
  if (k) {
    const kind = k.kind === "degree_plan" ? "Degree plan" : k.kind === "language_reference" ? "Language reference" : "Syllabus";
    lines.push(`- ${kind}: ${k.name}, version ${k.version}.`);
    checked = checked ?? dayOf(k.checkedAt);
  }
  lines.push(...(unitTitle ? unitReferenceLines(track, unitTitle) : courseOutlineLines(track)));
  if (!lines.length) return null;
  return [
    `Current facts for this course (from its recorded outline${checked ? `, last checked ${checked}` : ""}):`,
    ...lines,
    "- Teach and test this version. Prefer these facts over anything you remember about other versions, editions or years; if a detail may have changed since that date and is not stated here, leave it out or say it may differ.",
  ].join("\n");
}

// REQ-195 / REQ-220 (FAIL-1141): the unit's dated references, each with the
// key values read at it. Shared by the current-facts block (every prompt
// with a unit in context) and the fact-checker's per-item references (a
// batch that spans units).
export function unitReferenceLines(track: SeedTrack, unitTitle?: string | null): string[] {
  const unit = unitTitle ? track.units.find((u) => u.title === unitTitle && !u.retiredAt) : undefined;
  const sources = unit?.sources ?? [];
  // REQ-235: the official outline statements come first, so the writer and
  // the checker read the outline's own wording before any reference.
  const outline = sources
    .filter((r) => r.outline?.length)
    .map((r) => `- Official outline for this unit (${r.title}, checked ${r.checkedAt}; teach and test to these statements): ${r.outline!.map(endSentence).join(" ")}`);
  const refs = sources
    .filter((r) => !r.outline?.length || r.keyValues?.length)
    .map((r) => {
      const values = r.keyValues?.length ? ` Key values (use these over any older value you remember): ${r.keyValues.join("; ")}.` : "";
      return `- Reference for this unit: ${r.title} (${r.url}), checked ${r.checkedAt}.${values}`;
    });
  return [...outline, ...refs];
}

const endSentence = (s: string) => (/[.!?]$/.test(s.trim()) ? s.trim() : `${s.trim()}.`);

// REQ-235: with no unit in context (a whole-course prompt: comparison cards,
// a review batch's framing, chat), the official outline headings of every
// taught unit, so a course-wide writer and its checker still see the
// outline's wording. Headings only; a unit's key values stay with the unit.
export function courseOutlineLines(track: SeedTrack): string[] {
  const units = track.units.filter((u) => !u.retiredAt && u.sources?.some((r) => r.outline?.length));
  if (!units.length) return [];
  return [
    "- Official outline, by unit (teach and test to these statements):",
    ...units.map((u) => `  - ${u.title}: ${u.sources!.flatMap((r) => r.outline ?? []).map(endSentence).join(" ")}`),
  ];
}

let byCode: Promise<Map<string, SeedTrack>> | null = null;

async function load(): Promise<Map<string, SeedTrack>> {
  const { CATALOG_TRACKS } = await import("../supabase/seed/catalog");
  return new Map(CATALOG_TRACKS.map((t) => [t.code.toUpperCase(), t]));
}

// The block for a catalog track, by code; null for a learner's own track or a
// code the seed does not know. Never throws.
export async function currentFactsFor(trackCode: string | null | undefined, unitTitle?: string | null): Promise<string | null> {
  if (!trackCode) return null;
  try {
    byCode ??= load();
    const t = (await byCode).get(trackCode.toUpperCase());
    return t ? currentFactsBlock(t, unitTitle) : null;
  } catch {
    byCode = null;
    return null;
  }
}

// REQ-220 (FAIL-1141): a unit's reference lines by course code and unit
// title, for prompts that cover several units in one call. [] for a
// learner's own track or an unknown code. Never throws.
export async function unitReferencesFor(trackCode: string | null | undefined, unitTitle: string | null | undefined): Promise<string[]> {
  if (!trackCode || !unitTitle) return [];
  try {
    byCode ??= load();
    const t = (await byCode).get(trackCode.toUpperCase());
    return t ? unitReferenceLines(t, unitTitle) : [];
  } catch {
    byCode = null;
    return [];
  }
}
