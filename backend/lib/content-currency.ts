import type { SeedTrack } from "../supabase/seed/data";
import type { SeedLabSet } from "../supabase/seed/labs/types";
import { RECHECK_MONTHS, SOURCE_KINDS, type SourceRef } from "../supabase/seed/sources";

// REQ-142: how current is what each course is built on? Everything here
// reads the seed files only (no database, no network), so the report can run
// anywhere and the seed tests can refuse content without dates.
//
// A COURSE'S OUTLINE is not a new field: the seed already records it
// (migration 007, REQ-102). The exam or standard is the credential block
// (credentialName / standardName, examCode, examRevision /
// standardRevision / objectivesRevision, officialObjectivesUrl,
// lastVendorVerifiedAt), and sourceUrl / sourceVerifiedAt /
// contentReviewDueAt are what the app's Verified / Review due badges read
// (subject_tracks, view_content_freshness). courseOutline() gathers them
// into { name, version, url, checkedAt, recheckBy }.
//
// LAB SOURCES carry their own dates (seed/sources.ts): the set's exam
// outline, and each lab's own guideline or reference sources (SeedLab.sources).
//
// A COURSE WITH NO EXAM records its curriculum source instead (SeedTrack.
// curriculum: a language's official reference, a published degree plan, or a
// self-defined syllabus), and an outline whose publisher prints no version
// says why (credential.versionNote), so neither is reported as missing.

export const DUE_WINDOW_DAYS = 60;
export const COURSE_RECHECK_MONTHS = 12;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// "2026-09-18" or "2026-09-18T00:00:00Z" -> "2026-09-18"; null if not a real date.
export function dayOf(value: string | undefined | null): string | null {
  if (typeof value !== "string") return null;
  const day = value.slice(0, 10);
  if (!DATE_RE.test(day)) return null;
  const d = new Date(`${day}T00:00:00Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== day ? null : day;
}

// Calendar months, clamped to the month's last day (Aug 31 + 6 -> Feb 28).
export function addMonths(day: string, months: number): string {
  const [y, m, d] = day.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, last));
  return target.toISOString().slice(0, 10);
}

export function addDays(day: string, days: number): string {
  const t = new Date(`${day}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() + days);
  return t.toISOString().slice(0, 10);
}

export function sourceRecheckBy(s: SourceRef): string {
  return dayOf(s.recheckBy) ?? addMonths(dayOf(s.checkedAt) ?? "1970-01-01", RECHECK_MONTHS[s.kind] ?? 12);
}

// Why a source cannot be dated, or [] when it is fine. `today` refuses a
// checked date in the future (a typo, or a date that was never checked).
export function sourceDateProblems(s: SourceRef, today: string): string[] {
  const out: string[] = [];
  if (!s || typeof s.url !== "string" || !/^https:\/\//.test(s.url)) out.push("url must be https");
  if (!(SOURCE_KINDS as readonly string[]).includes(s?.kind)) out.push(`kind must be one of ${SOURCE_KINDS.join(", ")}`);
  const checked = dayOf(s?.checkedAt);
  if (!checked) out.push("checkedAt must be a YYYY-MM-DD date");
  else if (checked > today) out.push(`checkedAt ${checked} is in the future`);
  if (s?.recheckBy !== undefined) {
    const by = dayOf(s.recheckBy);
    if (!by) out.push("recheckBy must be a YYYY-MM-DD date");
    else if (checked && by <= checked) out.push(`recheckBy ${by} is not after checkedAt ${checked}`);
  }
  return out;
}

// Every source a lab set cites, once per URL, with how many of its labs rest
// on it: the set's own sources (every lab) and each lab's own (REQ-142). A URL
// cited both ways counts as the set's. When the same URL appears with two
// different dates, the older one wins, so a stale copy is never hidden.
export function labSetSources(set: SeedLabSet): { source: SourceRef; labs: number }[] {
  const out = new Map<string, { source: SourceRef; labs: number }>();
  const older = (a: SourceRef, b: SourceRef) => (sourceRecheckBy(b) < sourceRecheckBy(a) ? b : a);
  for (const s of set.sources) {
    const seen = out.get(s.url);
    out.set(s.url, { source: seen ? older(seen.source, s) : s, labs: set.labs.length });
  }
  for (const lab of set.labs) {
    for (const s of new Map((lab.sources ?? []).map((x) => [x.url, x])).values()) {
      const seen = out.get(s.url);
      if (seen && seen.labs === set.labs.length && set.sources.some((x) => x.url === s.url)) {
        seen.source = older(seen.source, s);
        continue;
      }
      out.set(s.url, { source: seen ? older(seen.source, s) : s, labs: (seen?.labs ?? 0) + 1 });
    }
  }
  return [...out.values()];
}

export interface CourseOutline {
  name: string;
  // The outline's version as recorded; null when the seed names none.
  version: string | null;
  url: string;
  checkedAt: string;
  recheckBy: string;
}

// AWS publishes the version in the code itself (SAA-C03); most vendors don't.
const VERSIONED_CODE = /-C\d{2}$/;

export function outlineVersion(track: SeedTrack): string | null {
  const c = track.credential;
  if (!c) return track.curriculum && !track.sourceUrl ? track.curriculum.version || null : null;
  const revision = c.examRevision ?? c.standardRevision ?? c.objectivesRevision;
  if (revision) return c.examCode ? `${c.examCode} ${revision}` : revision;
  if (c.examCode && VERSIONED_CODE.test(c.examCode)) return c.examCode;
  return null;
}

// null when the course records no outline at all (a self-defined
// curriculum such as the MSCS bridge).
export function courseOutline(track: SeedTrack): CourseOutline | null {
  const c = track.credential;
  const url = c?.officialObjectivesUrl ?? track.sourceUrl;
  if (!url) {
    // A course with no exam: its curriculum source (REQ-142), if recorded.
    const k = track.curriculum;
    if (!k) return null;
    const checkedAt = dayOf(k.checkedAt) ?? "";
    const recheckBy = dayOf(k.recheckBy) ?? (checkedAt ? addMonths(checkedAt, COURSE_RECHECK_MONTHS) : "");
    return { name: k.name, version: k.version || null, url: k.url, checkedAt, recheckBy };
  }
  const checkedAt = dayOf(track.sourceVerifiedAt) ?? dayOf(c?.lastVendorVerifiedAt) ?? "";
  const recheckBy = dayOf(track.contentReviewDueAt) ?? (checkedAt ? addMonths(checkedAt, COURSE_RECHECK_MONTHS) : "");
  const name = c?.standardName ?? c?.credentialName ?? track.title;
  return { name, version: outlineVersion(track), url, checkedAt, recheckBy };
}

export function courseOutlineProblems(track: SeedTrack, today: string): string[] {
  const out: string[] = [];
  const c = track.credential;
  if (track.sourceUrl && !dayOf(track.sourceVerifiedAt)) out.push("sourceUrl without a sourceVerifiedAt date");
  if (c && !dayOf(c.lastVendorVerifiedAt)) out.push("credential without a lastVendorVerifiedAt date");
  if (track.contentReviewDueAt !== undefined && !dayOf(track.contentReviewDueAt)) out.push("contentReviewDueAt is not a date");
  if (track.trackType === "certification" && !courseOutline(track)) out.push("certification course without an outline URL");
  const k = track.curriculum;
  if (k) {
    if (!/^https:\/\//.test(k.url)) out.push("curriculum url must be https");
    if (!["language_reference", "degree_plan", "self_defined"].includes(k.kind)) out.push(`curriculum kind ${k.kind} is not known`);
    if (!k.version) out.push("curriculum without a version");
    if (k.recheckBy !== undefined && !dayOf(k.recheckBy)) out.push("curriculum recheckBy is not a date");
  }
  if (c && !outlineVersion(track) && c.versionNote !== undefined && !c.versionNote.trim()) out.push("versionNote is empty");
  const o = courseOutline(track);
  if (o) {
    if (!o.checkedAt) out.push("outline has no checked date");
    else if (o.checkedAt > today) out.push(`outline checked date ${o.checkedAt} is in the future`);
    if (o.checkedAt && o.recheckBy && o.recheckBy <= o.checkedAt) out.push(`outline re-check ${o.recheckBy} is not after its check ${o.checkedAt}`);
  }
  return out;
}

export type DueStatus = "overdue" | "due_soon";

export function dueStatus(recheckBy: string, asOf: string, windowDays = DUE_WINDOW_DAYS): DueStatus | null {
  if (recheckBy < asOf) return "overdue";
  if (recheckBy <= addDays(asOf, windowDays)) return "due_soon";
  return null;
}

export interface DueSource {
  what: "outline" | "lab_source" | "unit_source";
  url: string;
  kind: string;
  checkedAt: string;
  recheckBy: string;
  status: DueStatus;
  // lab sources: how many of the course's labs cite it
  labs?: number;
}

export interface CurrencyReport {
  asOf: string;
  dueBy: string;
  courses: { code: string; title: string; due: DueSource[] }[];
  noOutline: { code: string; title: string; trackType: string }[];
  noVersion: { code: string; title: string; outline: string }[];
  // Outlines whose publisher prints no version, with the reason recorded in
  // the seed (credential.versionNote): known, not missing.
  unversioned: { code: string; title: string; outline: string; why: string }[];
  // Courses with no exam, dated through their curriculum source.
  nonExam: { code: string; title: string; kind: string; name: string; version: string }[];
}

export function currencyReport(
  tracks: readonly SeedTrack[],
  labSets: readonly SeedLabSet[],
  asOf: string,
  windowDays = DUE_WINDOW_DAYS
): CurrencyReport {
  const byCode = new Map<string, { code: string; title: string; due: DueSource[] }>();
  const entry = (code: string, title: string) => {
    let e = byCode.get(code);
    if (!e) byCode.set(code, (e = { code, title, due: [] }));
    return e;
  };
  const noOutline: CurrencyReport["noOutline"] = [];
  const noVersion: CurrencyReport["noVersion"] = [];
  const unversioned: CurrencyReport["unversioned"] = [];
  const nonExam: CurrencyReport["nonExam"] = [];
  for (const t of tracks) {
    const o = courseOutline(t);
    if (!o) {
      noOutline.push({ code: t.code, title: t.title, trackType: t.trackType });
      continue;
    }
    if (t.curriculum && !t.credential && !t.sourceUrl) {
      nonExam.push({ code: t.code, title: t.title, kind: t.curriculum.kind, name: t.curriculum.name, version: t.curriculum.version });
    }
    const why = t.credential?.versionNote?.trim();
    if (!o.version && why) unversioned.push({ code: t.code, title: t.title, outline: o.name, why });
    else if (!o.version) noVersion.push({ code: t.code, title: t.title, outline: o.name });
    // An undated outline is overdue: nobody can say when it was checked.
    const status = o.recheckBy ? dueStatus(o.recheckBy, asOf, windowDays) : "overdue";
    if (status) entry(t.code, t.title).due.push({ what: "outline", url: o.url, kind: "exam_outline", checkedAt: o.checkedAt, recheckBy: o.recheckBy, status });
  }
  // REQ-195: a unit's own references (the open textbook a general course is
  // taught from), each dated like a lab source.
  for (const t of tracks) {
    const seen = new Set<string>();
    for (const u of t.units) {
      if (u.retiredAt) continue;
      for (const r of u.sources ?? []) {
        if (seen.has(r.url)) continue;
        seen.add(r.url);
        const recheckBy = sourceRecheckBy(r);
        const status = dayOf(r.checkedAt) ? dueStatus(recheckBy, asOf, windowDays) : "overdue";
        if (status) entry(t.code, t.title).due.push({ what: "unit_source", url: r.url, kind: r.kind, checkedAt: r.checkedAt, recheckBy, status });
      }
    }
  }
  const titles = new Map(tracks.map((t) => [t.code, t.title]));
  for (const set of labSets) {
    for (const { source: s, labs } of labSetSources(set)) {
      const recheckBy = sourceRecheckBy(s);
      const status = dayOf(s.checkedAt) ? dueStatus(recheckBy, asOf, windowDays) : "overdue";
      if (status) {
        entry(set.trackCode, titles.get(set.trackCode) ?? set.trackCode).due.push({
          what: "lab_source",
          url: s.url,
          kind: s.kind,
          checkedAt: s.checkedAt,
          recheckBy,
          status,
          labs,
        });
      }
    }
  }
  const courses = [...byCode.values()]
    .map((c) => ({ ...c, due: c.due.sort((a, b) => a.recheckBy.localeCompare(b.recheckBy)) }))
    .sort((a, b) => a.due[0].recheckBy.localeCompare(b.due[0].recheckBy) || a.code.localeCompare(b.code));
  return { asOf, dueBy: addDays(asOf, windowDays), courses, noOutline, noVersion, unversioned, nonExam };
}
