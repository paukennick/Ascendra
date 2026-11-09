// REQ-142: source expiry dates. Pure; reads the seed files only.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { CATALOG_TRACKS } from "../supabase/seed/catalog";
import { LAB_SETS } from "../supabase/seed/labs";
import type { SeedTrack } from "../supabase/seed/data";
import type { SeedLabSet } from "../supabase/seed/labs/types";
import { source, type SourceRef } from "../supabase/seed/sources";
import {
  addMonths,
  courseOutline,
  courseOutlineProblems,
  currencyReport,
  dayOf,
  dueStatus,
  labSetSources,
  sourceDateProblems,
  sourceRecheckBy,
} from "./content-currency";

const TODAY = new Date().toISOString().slice(0, 10);

describe("dates", () => {
  test("dayOf accepts a date or an ISO timestamp and refuses impossible dates", () => {
    assert.equal(dayOf("2026-09-18T00:00:00Z"), "2026-09-18");
    assert.equal(dayOf("2026-09-18"), "2026-09-18");
    assert.equal(dayOf("2026-02-30"), null);
    assert.equal(dayOf("18/09/2026"), null);
    assert.equal(dayOf(undefined), null);
  });
  test("addMonths clamps to the end of a shorter month", () => {
    assert.equal(addMonths("2026-08-31", 6), "2027-02-28");
    assert.equal(addMonths("2026-11-07", 12), "2027-11-07");
    assert.equal(addMonths("2027-12-15", 1), "2028-01-15");
  });
  test("default re-check: 12 months for outlines and references, 6 for guidelines and cloud prices or limits", () => {
    assert.equal(sourceRecheckBy(source("https://x.test/a", "exam_outline", "2026-11-07")), "2027-11-07");
    assert.equal(sourceRecheckBy(source("https://x.test/a", "reference", "2026-11-07")), "2027-11-07");
    assert.equal(sourceRecheckBy(source("https://x.test/a", "clinical_guideline", "2026-11-07")), "2027-05-07");
    assert.equal(sourceRecheckBy(source("https://x.test/a", "cloud_pricing_limits", "2026-11-07")), "2027-05-07");
    assert.equal(sourceRecheckBy(source("https://x.test/a", "exam_outline", "2026-11-07", "2027-01-01")), "2027-01-01");
  });
  test("dueStatus: overdue before today, due soon inside the window, otherwise nothing", () => {
    assert.equal(dueStatus("2026-11-06", "2026-11-07"), "overdue");
    assert.equal(dueStatus("2026-11-07", "2026-11-07"), "due_soon");
    assert.equal(dueStatus("2027-01-06", "2026-11-07"), "due_soon");
    assert.equal(dueStatus("2027-01-07", "2026-11-07"), null);
  });
  test("sourceDateProblems refuses a missing, malformed, future or backwards date", () => {
    assert.deepEqual(sourceDateProblems(source("https://x.test/a", "exam_outline", "2026-11-07"), "2026-11-07"), []);
    assert.match(sourceDateProblems({ url: "https://x.test/a", kind: "exam_outline" } as SourceRef, TODAY).join(), /checkedAt/);
    assert.match(sourceDateProblems(source("https://x.test/a", "exam_outline", "2099-01-01"), TODAY).join(), /future/);
    assert.match(sourceDateProblems(source("https://x.test/a", "exam_outline", "2026-11-07", "2026-11-01"), "2026-11-07").join(), /not after/);
    assert.match(sourceDateProblems({ url: "https://x.test/a", kind: "blog", checkedAt: "2026-11-07" } as unknown as SourceRef, TODAY).join(), /kind/);
    assert.match(sourceDateProblems(source("http://x.test/a", "reference", "2026-11-07"), TODAY).join(), /https/);
  });
});

describe("the seed (new content cannot skip its dates)", () => {
  test("every lab source has a kind, a checked date and a sensible re-check date", () => {
    for (const set of LAB_SETS) {
      assert.ok(set.sources.length > 0, `${set.trackCode} cites a source`);
      for (const s of set.sources) assert.deepEqual(sourceDateProblems(s, TODAY), [], `${set.trackCode}: ${s.url}`);
      // REQ-142: and each lab's own guideline or reference sources.
      for (const lab of set.labs) {
        for (const s of lab.sources ?? []) assert.deepEqual(sourceDateProblems(s, TODAY), [], `${set.trackCode}/${lab.slug}: ${s.url}`);
      }
    }
  });
  test("the real report: every course has an outline or a curriculum, and every outline a version or a reason", () => {
    const real = currencyReport(CATALOG_TRACKS, LAB_SETS, TODAY);
    assert.deepEqual(real.noOutline, []);
    assert.deepEqual(real.noVersion, []);
    for (const u of real.unversioned) assert.ok(u.why.length > 20, u.code);
  });
  test("every course that records an outline or source dates it, and every certification course has one", () => {
    for (const t of CATALOG_TRACKS) assert.deepEqual(courseOutlineProblems(t, TODAY), [], t.code);
  });
});

describe("courseOutline", () => {
  const base: SeedTrack = { code: "T", title: "Test course", description: "", trackType: "certification", units: [] };
  test("reads the credential block and defaults the re-check to 12 months", () => {
    const o = courseOutline({
      ...base,
      sourceUrl: "https://x.test/outline",
      sourceVerifiedAt: "2026-09-18T00:00:00Z",
      credential: {
        providerSlug: "p", providerName: "P", subcategorySlug: "s", credentialSlug: "c", credentialName: "Cert",
        credentialType: "certification", examCode: "SAA-C03", status: "active",
        officialObjectivesUrl: "https://x.test/outline", lastVendorVerifiedAt: "2026-09-18T00:00:00Z",
      },
    });
    assert.deepEqual(o, { name: "Cert", version: "SAA-C03", url: "https://x.test/outline", checkedAt: "2026-09-18", recheckBy: "2027-09-18" });
  });
  test("contentReviewDueAt wins; an unversioned exam code has no version", () => {
    const o = courseOutline({
      ...base,
      sourceUrl: "https://x.test/o",
      sourceVerifiedAt: "2026-09-18T00:00:00Z",
      contentReviewDueAt: "2027-01-14T00:00:00Z",
      credential: {
        providerSlug: "p", providerName: "P", subcategorySlug: "s", credentialSlug: "c", credentialName: "Azure",
        credentialType: "certification", examCode: "AZ-104", status: "active",
        officialObjectivesUrl: "https://x.test/o", lastVendorVerifiedAt: "2026-09-18T00:00:00Z",
      },
    });
    assert.equal(o?.recheckBy, "2027-01-14");
    assert.equal(o?.version, null);
  });
  test("a course with no outline is null; a certification course without one is a problem", () => {
    assert.equal(courseOutline(base), null);
    assert.match(courseOutlineProblems(base, TODAY).join(), /without an outline/);
    assert.match(courseOutlineProblems({ ...base, trackType: "graduate", sourceUrl: "https://x.test" }, TODAY).join(), /sourceVerifiedAt/);
  });
});

describe("currencyReport", () => {
  const tracks: SeedTrack[] = [
    { code: "OLD", title: "Old", description: "", trackType: "certification", units: [], sourceUrl: "https://x.test/old", sourceVerifiedAt: "2025-01-01T00:00:00Z" },
    { code: "NEW", title: "New", description: "", trackType: "certification", units: [], sourceUrl: "https://x.test/new", sourceVerifiedAt: "2026-11-01T00:00:00Z" },
    { code: "SOON", title: "Soon", description: "", trackType: "certification", units: [], sourceUrl: "https://x.test/soon", sourceVerifiedAt: "2026-01-01T00:00:00Z" },
    { code: "SELF", title: "Self", description: "", trackType: "graduate", units: [] },
  ];
  const labs: SeedLabSet[] = [
    { trackCode: "NEW", labs: [], sources: [source("https://x.test/guideline", "clinical_guideline", "2026-06-01"), source("https://x.test/fine", "exam_outline", "2026-05-01")] },
  ];
  const r = currencyReport(tracks, labs, "2026-11-07");
  test("lists overdue and due-soon sources grouped by course, oldest first, and nothing current", () => {
    assert.deepEqual(r.courses.map((c) => c.code), ["OLD", "NEW", "SOON"]);
    assert.deepEqual(r.courses[0].due.map((d) => [d.what, d.status]), [["outline", "overdue"]]);
    assert.deepEqual(r.courses[1].due.map((d) => [d.url, d.status]), [["https://x.test/guideline", "due_soon"]]);
    assert.deepEqual(r.courses[2].due.map((d) => [d.recheckBy, d.status]), [["2027-01-01", "due_soon"]]);
  });
  test("names courses with no outline and outlines with no version", () => {
    assert.deepEqual(r.noOutline.map((c) => c.code), ["SELF"]);
    assert.deepEqual(r.noVersion.map((c) => c.code), ["OLD", "NEW", "SOON"]);
  });
  test("a lab's own sources count only the labs that cite them; a set source covers every lab", () => {
    const g = source("https://x.test/g", "clinical_guideline", "2026-11-08");
    const set: SeedLabSet = {
      trackCode: "NEW",
      sources: [source("https://x.test/fine", "exam_outline", "2026-05-01")],
      labs: [
        { slug: "a", objective: "o", kind: "case", title: "A", brief: "", steps: [], sources: [g] },
        { slug: "b", objective: "o", kind: "case", title: "B", brief: "", steps: [], sources: [g, source("https://x.test/fine", "exam_outline", "2025-01-01")] },
        { slug: "c", objective: "o", kind: "case", title: "C", brief: "", steps: [] },
      ],
    };
    const got = new Map(labSetSources(set).map((x) => [x.source.url, x]));
    assert.equal(got.get("https://x.test/g")?.labs, 2);
    // Cited by the set and again by a lab: still the set's (3 labs), and the older date wins.
    assert.equal(got.get("https://x.test/fine")?.labs, 3);
    assert.equal(got.get("https://x.test/fine")?.source.checkedAt, "2025-01-01");
    const due = currencyReport(tracks, [set], "2027-05-01").courses.find((c) => c.code === "NEW")!;
    assert.deepEqual(due.due.filter((d) => d.what === "lab_source").map((d) => [d.url, d.labs]).sort(), [["https://x.test/fine", 3], ["https://x.test/g", 2]]);
  });
  test("a course with no exam is dated through its curriculum source; a publisher with no version needs a reason", () => {
    const k: SeedTrack = {
      ...tracks[3],
      curriculum: { kind: "language_reference", name: "Docs", version: "3.15", url: "https://x.test/docs", checkedAt: "2026-11-08" },
    };
    assert.deepEqual(courseOutline(k), { name: "Docs", version: "3.15", url: "https://x.test/docs", checkedAt: "2026-11-08", recheckBy: "2027-11-08" });
    const cred = {
      providerSlug: "p", providerName: "P", subcategorySlug: "s", credentialSlug: "c", credentialName: "Guide",
      credentialType: "certification", status: "active" as const,
      officialObjectivesUrl: "https://x.test/g", lastVendorVerifiedAt: "2026-11-08T00:00:00Z",
    };
    const noted: SeedTrack = { ...tracks[1], code: "NOTED", credential: { ...cred, versionNote: "The publisher prints no version." } };
    const bare: SeedTrack = { ...tracks[1], code: "BARE", credential: cred };
    const rr = currencyReport([k, noted, bare], [], "2026-11-08");
    assert.deepEqual(rr.noOutline, []);
    assert.deepEqual(rr.nonExam.map((c) => [c.code, c.version]), [["SELF", "3.15"]]);
    assert.deepEqual(rr.unversioned.map((c) => c.code), ["NOTED"]);
    assert.deepEqual(rr.noVersion.map((c) => c.code), ["BARE"]);
    assert.match(courseOutlineProblems({ ...k, curriculum: { ...k.curriculum!, url: "http://x.test" } }, TODAY).join(), /https/);
    assert.match(courseOutlineProblems({ ...k, curriculum: { ...k.curriculum!, version: "" } }, TODAY).join(), /version/);
  });
  test("runs over the real catalog", () => {
    const real = currencyReport(CATALOG_TRACKS, LAB_SETS, TODAY);
    assert.ok(real.noOutline.every((c) => c.trackType !== "certification"));
  });
});
