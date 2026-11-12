// REQ-244: the Python, JavaScript and DP-300 courses verified against their
// current sources on 2026-11-11. Pure; reads the seed files only.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { CATALOG_TRACKS } from "../supabase/seed/catalog";
import { JAVASCRIPT_TRACK, PYTHON_TRACK, type SeedTrack } from "../supabase/seed/data";
import { AZURE_DP300_TRACK } from "../supabase/seed/tracks/azure";
import { GCP_DEVOPS_TRACK } from "../supabase/seed/tracks/gcp";
import { activeUnits } from "../supabase/seed/catalog";
import { DP300_LABS } from "../supabase/seed/labs/microsoft-dp300";
import { courseOutlineProblems, dayOf } from "./content-currency";
import { currentFactsBlock } from "./current-facts";

const TODAY = new Date().toISOString().slice(0, 10);
const time = (iso: string | undefined) => (iso ? Date.parse(iso) : NaN);

describe("FAIL-1540: DP-300 stuck at Review due after its review line was deleted", () => {
  // The seed writes content_review_due_at with coalesce: a value can be set
  // but never cleared. Production kept 2026-10-27 after the 2026-11-09 fix
  // removed the line, so the course showed "Review due" despite being
  // re-verified. Only a later date in the seed clears it.
  test("DP-300 sets a review date later than the stale stored one and than its check", () => {
    const due = time(AZURE_DP300_TRACK.contentReviewDueAt);
    assert.ok(Number.isFinite(due), "DP300 must set contentReviewDueAt (a deleted line cannot clear the stored 2026-10-27)");
    assert.ok(due > time("2026-10-27T00:00:00Z"));
    assert.ok(due > time(AZURE_DP300_TRACK.sourceVerifiedAt));
  });
  test("the check and the review are the dates REQ-244 recorded (12 months for an exam outline)", () => {
    assert.equal(dayOf(AZURE_DP300_TRACK.sourceVerifiedAt), "2026-11-11");
    assert.equal(dayOf(AZURE_DP300_TRACK.credential?.lastVendorVerifiedAt), "2026-11-11");
    assert.equal(dayOf(AZURE_DP300_TRACK.contentReviewDueAt), "2027-11-11");
    assert.equal(AZURE_DP300_TRACK.credential?.objectivesRevision, "Skills measured as of October 27, 2026");
    const outline = DP300_LABS.sources.find((s) => s.kind === "exam_outline");
    assert.equal(outline?.checkedAt, "2026-11-11");
  });
  test("every catalog course that records both dates reviews after it was checked", () => {
    for (const t of CATALOG_TRACKS) {
      if (!t.sourceVerifiedAt || !t.contentReviewDueAt) continue;
      assert.ok(time(t.contentReviewDueAt) > time(t.sourceVerifiedAt), `${t.code}: review ${t.contentReviewDueAt} is not after check ${t.sourceVerifiedAt}`);
    }
  });
  test("DP-300 still follows the live guide: five domains, 94 skills, weights inside the published ranges", () => {
    const counts = AZURE_DP300_TRACK.units.map((u) => u.objectives.length);
    assert.deepEqual(counts, [22, 20, 23, 11, 18]);
    const ranges: [number, number][] = [[15, 20], [20, 25], [20, 25], [15, 20], [20, 25]];
    AZURE_DP300_TRACK.units.forEach((u, i) => {
      assert.ok(u.weight! >= ranges[i][0] && u.weight! <= ranges[i][1], u.title);
    });
    assert.equal(AZURE_DP300_TRACK.units.reduce((n, u) => n + (u.weight ?? 0), 0), 100);
    assert.ok(AZURE_DP300_TRACK.units[1].objectives.includes("Implementing Always Encrypted with secure enclaves"));
  });
});

// FAIL-1540 / FAIL-1541: the seed writes content_review_due_at with
// coalesce, so a review date can only move forward through the seed. These
// are the courses whose seed once stored one that a later commit deleted;
// the value is the date production still holds. Each must keep a later one,
// or production shows "Review due" from that date for good. Add a course
// here whenever its contentReviewDueAt line is removed or moved earlier.
const STORED_REVIEW_DUE: Record<string, string> = {
  DP300: "2026-10-27T00:00:00Z",
  GCPDEVOPS: "2026-11-23T00:00:00Z",
};

describe("FAIL-1541: review dates stored in production only move forward", () => {
  test("every course with a stored review date keeps a later contentReviewDueAt", () => {
    for (const [code, stored] of Object.entries(STORED_REVIEW_DUE)) {
      const t = CATALOG_TRACKS.find((x) => x.code === code);
      assert.ok(t, `${code} is in the catalog`);
      assert.ok(Number.isFinite(time(t!.contentReviewDueAt)), `${code} must set contentReviewDueAt: deleting it cannot clear ${stored}`);
      assert.ok(time(t!.contentReviewDueAt) > time(stored), `${code}: ${t!.contentReviewDueAt} is not later than the stored ${stored}`);
      assert.ok(time(t!.contentReviewDueAt) > time(t!.sourceVerifiedAt), `${code}: review after its check`);
    }
  });
  test("GCP DevOps re-verified 2026-11-11 against the guide live on 2026-11-23, review in 12 months", () => {
    assert.equal(dayOf(GCP_DEVOPS_TRACK.sourceVerifiedAt), "2026-11-11");
    assert.equal(dayOf(GCP_DEVOPS_TRACK.credential?.lastVendorVerifiedAt), "2026-11-11");
    assert.equal(dayOf(GCP_DEVOPS_TRACK.contentReviewDueAt), "2027-11-11");
    assert.equal(GCP_DEVOPS_TRACK.credential?.objectivesRevision, "Exam guide live on November 23, 2026");
    const live = activeUnits(GCP_DEVOPS_TRACK);
    assert.deepEqual(live.map((u) => u.objectives.length), [25, 14, 10, 20, 10]);
    assert.deepEqual(live.map((u) => u.weight), [18, 30, 18, 22, 12]);
  });
  test("FAIL-1542: GCP DevOps exam facts say what the certification page says", () => {
    const c = GCP_DEVOPS_TRACK.credential!;
    assert.match(c.recommendedExperience ?? "", /1\+ years designing and managing production systems using Google Cloud/);
    assert.equal(c.questionFormat, "50-60 multiple choice questions");
    assert.equal(c.durationMinutes, 120);
  });
});

const LANGUAGE_TRACKS: SeedTrack[] = [PYTHON_TRACK, JAVASCRIPT_TRACK];

describe("REQ-244: the language courses are verified, dated and sourced", () => {
  test("verified on the day the curriculum was re-read, as technology_aligned courses", () => {
    for (const t of LANGUAGE_TRACKS) {
      assert.equal(t.freshnessModel, "technology_aligned", t.code);
      assert.equal(dayOf(t.sourceVerifiedAt), "2026-11-11", t.code);
      assert.equal(dayOf(t.contentReviewDueAt), "2027-11-11", `${t.code}: 12-month review (Nick, 2026-11-11)`);
      assert.equal(t.curriculum?.checkedAt, "2026-11-11", t.code);
      assert.equal(t.sourceUrl, undefined, `${t.code}: a sourceUrl would replace the curriculum as its outline`);
      assert.deepEqual(courseOutlineProblems(t, TODAY), [], t.code);
    }
    assert.equal(PYTHON_TRACK.curriculum?.version, "Python 3.15");
    assert.equal(JAVASCRIPT_TRACK.curriculum?.version, "ECMAScript 2026 (17th edition, June 2026)");
  });
  test("every unit names at least one dated, https reference it was compared with", () => {
    for (const t of LANGUAGE_TRACKS) {
      for (const u of t.units) {
        assert.ok((u.sources ?? []).length >= 1, `${t.code} / ${u.title}`);
        for (const s of u.sources!) {
          assert.match(s.url, /^https:\/\//, s.url);
          assert.equal(s.kind, "reference");
          assert.match(s.checkedAt, /^\d{4}-\d{2}-\d{2}$/);
          assert.ok(s.title.trim().length > 0);
        }
      }
    }
  });
  test("the facts an older-version writer would get wrong are pinned as key values", () => {
    const facts = (t: SeedTrack, unit: RegExp) => {
      const u = t.units.find((x) => unit.test(x.title))!;
      return currentFactsBlock(t, u.title) ?? "";
    };
    assert.match(facts(PYTHON_TRACK, /^Strings, files/), /UTF-8 regardless of the system locale/);
    assert.match(facts(PYTHON_TRACK, /^Strings, files/), /PEP 765/);
    assert.match(facts(PYTHON_TRACK, /^Concurrency/), /free-threaded build/);
    assert.match(facts(PYTHON_TRACK, /^Concurrency/), /profile module is deprecated/);
    assert.match(facts(PYTHON_TRACK, /^Syntax/), /3\.10 reached end of life on 2026-10-01/);
    assert.match(facts(JAVASCRIPT_TRACK, /^Asynchronous/), /response\.ok/);
    assert.match(facts(JAVASCRIPT_TRACK, /^Node\.js/), /Node\.js 26 is the Active LTS/);
    assert.match(facts(JAVASCRIPT_TRACK, /^ES6\+/), /ECMAScript 2027/);
  });
  test("no objective or gate teaches a removed or legacy feature as current", () => {
    const OUTDATED_PY = /distutils|setup\.py|\bimp\b module|get_event_loop|event loop polic|\bprofile module|asynchat|asyncore|cgi\b|telnetlib|python 2/i;
    const OUTDATED_JS = /\bsubstr\b|__proto__|XMLHttpRequest|arguments\.callee|document\.write|keyCode|\bwith statement|body-parser|new Buffer\(/i;
    for (const [t, bad] of [[PYTHON_TRACK, OUTDATED_PY], [JAVASCRIPT_TRACK, OUTDATED_JS]] as const) {
      for (const u of t.units) {
        for (const line of [u.title, u.gate ?? "", ...u.objectives]) assert.doesNotMatch(line, bad, `${t.code}: ${line}`);
      }
    }
  });
});
