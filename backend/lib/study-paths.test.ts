// REQ-198: study paths (supabase/seed/paths.ts) and how a course is placed
// on them (lib/study-paths.ts). Pure; the database side is in
// study-paths.dbtest.ts.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { STUDY_PATHS, type SeedStudyPath } from "../supabase/seed/paths";
import { CATALOG_TRACKS } from "../supabase/seed/catalog";
import { buildCoursePaths, pathCodes, pathsContaining } from "./study-paths";

const catalogOf = (codes: string[]) => new Map(codes.map((c) => [c, { id: `id-${c}`, title: `Title ${c}` }]));
const ALL = catalogOf(CATALOG_TRACKS.map((t) => t.code));

describe("study path data (REQ-198)", () => {
  test("every step names a catalog course; at least two steps; no course twice; unique slugs", () => {
    const codes = new Set(CATALOG_TRACKS.map((t) => t.code));
    const slugs = new Set<string>();
    for (const p of STUDY_PATHS) {
      assert.ok(!slugs.has(p.slug), p.slug);
      slugs.add(p.slug);
      assert.ok(p.steps.length >= 2, p.slug);
      const mine = p.steps.map((s) => s.trackCode);
      assert.equal(new Set(mine).size, mine.length, `${p.slug} repeats a course`);
      for (const s of p.steps) {
        assert.ok(codes.has(s.trackCode), `${p.slug}: ${s.trackCode} is not in the catalog`);
        assert.ok(s.when.length > 8 && s.why.length > 20, `${p.slug}/${s.trackCode} says when and why`);
      }
      assert.ok(p.title.length > 5 && p.audience.length > 3);
    }
  });

  test("the DPT path: refresher, then DPT, then NPTE-PT about 6 to 9 months before graduating", () => {
    const p = STUDY_PATHS.find((x) => x.slug === "dpt-student")!;
    assert.deepEqual(p.steps.map((s) => s.trackCode), ["PTPREREQ", "DPT", "NPTEPT"]);
    assert.equal(p.audience, "Starting PT school");
    assert.match(p.steps[0].when, /before your program starts|first weeks/i);
    assert.match(p.steps[1].when, /during your program/i);
    assert.match(p.steps[2].when, /final year.*6 to 9 months before you graduate/i);
  });

  test("path text uses no exam body's mark as a product name", () => {
    for (const p of STUDY_PATHS) {
      for (const text of [p.title, p.audience, ...p.steps.map((s) => s.when)]) assert.doesNotMatch(text, /NPTE|FSBPT|PTCAS|®|™/, text);
    }
  });
});

describe("placing a course on its paths (REQ-198)", () => {
  test("refresher: nothing before, DPT after", () => {
    const [v] = buildCoursePaths("PTPREREQ", ALL);
    assert.equal(v.before, null);
    assert.equal(v.after!.code, "DPT");
    assert.deepEqual(v.steps.map((s) => [s.position, s.code, s.current]), [[1, "PTPREREQ", true], [2, "DPT", false], [3, "NPTEPT", false]]);
  });

  test("DPT: refresher before, NPTE-PT after", () => {
    const [v] = buildCoursePaths("DPT", ALL);
    assert.equal(v.before!.code, "PTPREREQ");
    assert.equal(v.after!.code, "NPTEPT");
    assert.equal(v.before!.trackId, "id-PTPREREQ");
    assert.equal(v.after!.title, "Title NPTEPT");
  });

  test("NPTE-PT: DPT before, nothing after", () => {
    const [v] = buildCoursePaths("NPTEPT", ALL);
    assert.equal(v.before!.code, "DPT");
    assert.equal(v.after, null);
  });

  test("a course on no path gets none; the PTA and specialist courses are not on this path", () => {
    for (const code of ["NPTEPTA", "ABPTSOCS", "SECPLUS", "NO-SUCH"]) assert.deepEqual(buildCoursePaths(code, ALL), [], code);
  });

  test("a step missing from the database is skipped and the neighbors close up", () => {
    const [v] = buildCoursePaths("PTPREREQ", catalogOf(["PTPREREQ", "NPTEPT"]));
    assert.equal(v.after!.code, "NPTEPT");
    assert.deepEqual(v.steps.map((s) => s.position), [1, 2]);
  });

  test("no path is shown when only this course of it is left, or when this course itself is missing", () => {
    assert.deepEqual(buildCoursePaths("PTPREREQ", catalogOf(["PTPREREQ"])), []);
    assert.deepEqual(buildCoursePaths("DPT", catalogOf(["PTPREREQ", "NPTEPT"])), []);
  });

  test("a course on two paths gets both, each with its own neighbors", () => {
    const paths: SeedStudyPath[] = [
      { slug: "a", title: "Path A", audience: "A", steps: [{ trackCode: "X", when: "first", why: "w" }, { trackCode: "Y", when: "second", why: "w" }] },
      { slug: "b", title: "Path B", audience: "B", steps: [{ trackCode: "Y", when: "first", why: "w" }, { trackCode: "Z", when: "second", why: "w" }] },
    ];
    const views = buildCoursePaths("Y", catalogOf(["X", "Y", "Z"]), paths);
    assert.deepEqual(views.map((v) => [v.slug, v.before?.code ?? null, v.after?.code ?? null]), [["a", "X", null], ["b", null, "Z"]]);
    assert.deepEqual(pathCodes(paths).sort(), ["X", "Y", "Z"]);
    assert.equal(pathsContaining("Z", paths).length, 1);
  });
});

describe("the route and the course page (REQ-198)", () => {
  const read = (p: string) => readFileSync(join(__dirname, "..", p), "utf8");
  test("GET /api/courses/:id/path checks auth and visibility before reading", () => {
    const src = read("app/api/courses/[id]/path/route.ts");
    assert.match(src, /requireUser\(req\)/);
    assert.match(src, /visibleTrack\(id, user\.id\)/);
    assert.ok(src.indexOf("visibleTrack(") < src.indexOf("coursePaths("), "visibility before the lookup");
    assert.doesNotMatch(src, /export async function (POST|PUT|PATCH|DELETE)/, "read-only");
  });
  test("only catalog courses are placed on a path, in one query for all steps", () => {
    const src = read("lib/study-paths.ts");
    assert.match(src, /row\.user_id !== null\) return \[\]/);
    assert.match(src, /where user_id is null and code = any\(\$1::text\[\]\)/);
  });
  test("the course page shows the panel", () => {
    const page = read("../mobile/app/(app)/course/[trackId]/index.tsx");
    assert.match(page, /<StudyPathPanel trackId=\{trackId\} \/>/);
  });
});
