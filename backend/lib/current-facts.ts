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

export function currentFactsBlock(track: SeedTrack): string | null {
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
  if (!lines.length) return null;
  return [
    `Current facts for this course (from its recorded outline${checked ? `, last checked ${checked}` : ""}):`,
    ...lines,
    "- Teach and test this version. Prefer these facts over anything you remember about other versions, editions or years; if a detail may have changed since that date and is not stated here, leave it out or say it may differ.",
  ].join("\n");
}

let byCode: Promise<Map<string, string>> | null = null;

async function load(): Promise<Map<string, string>> {
  const { CATALOG_TRACKS } = await import("../supabase/seed/catalog");
  const m = new Map<string, string>();
  for (const t of CATALOG_TRACKS) {
    const block = currentFactsBlock(t);
    if (block) m.set(t.code.toUpperCase(), block);
  }
  return m;
}

// The block for a catalog track, by code; null for a learner's own track or a
// code the seed does not know. Never throws.
export async function currentFactsFor(trackCode: string | null | undefined): Promise<string | null> {
  if (!trackCode) return null;
  try {
    byCode ??= load();
    return (await byCode).get(trackCode.toUpperCase()) ?? null;
  } catch {
    byCode = null;
    return null;
  }
}
