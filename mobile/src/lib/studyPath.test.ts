import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { NEIGHBOUR_LABEL, neighbourRows, parsePaths, stepLine, stepOfLine, type CoursePath, type PathStep } from "./studyPath.ts";

const here = dirname(fileURLToPath(import.meta.url));

// REQ-198: "Recommended before / Recommended after" on the course page.
const step = (position: number, code: string, current = false): PathStep => ({
  trackId: `id-${code}`,
  code,
  title: `Title ${code}`,
  when: `When ${code}`,
  why: `Why ${code}`,
  position,
  current,
});
const path = (at: number): CoursePath => {
  const steps = [step(1, "PTPREREQ", at === 0), step(2, "DPT", at === 1), step(3, "NPTEPT", at === 2)];
  return { slug: "dpt-student", title: "Physical therapy school, start to licence", audience: "Starting PT school", steps, before: steps[at - 1] ?? null, after: steps[at + 1] ?? null };
};

describe("study path rows (REQ-198)", () => {
  test("the labels are the ones the course page promises", () => {
    assert.equal(NEIGHBOUR_LABEL.before, "Recommended before");
    assert.equal(NEIGHBOUR_LABEL.after, "Recommended after");
  });

  test("DPT shows before then after; the ends show one each", () => {
    assert.deepEqual(neighbourRows(path(1)).map((r) => [r.label, r.step.code]), [["Recommended before", "PTPREREQ"], ["Recommended after", "NPTEPT"]]);
    assert.deepEqual(neighbourRows(path(0)).map((r) => [r.kind, r.step.code]), [["after", "DPT"]]);
    assert.deepEqual(neighbourRows(path(2)).map((r) => [r.kind, r.step.code]), [["before", "DPT"]]);
  });

  test("each row is one spoken label naming the course and when", () => {
    const [row] = neighbourRows(path(2));
    assert.equal(row.a11y, "Recommended before this course: Title DPT. When DPT. Opens the course.");
  });

  test("step lines mark the current course", () => {
    assert.equal(stepOfLine(path(1)), "Step 2 of 3");
    assert.equal(stepLine(path(1).steps[1]), "2. Title DPT (this course): When DPT");
    assert.equal(stepLine(path(1).steps[0]), "1. Title PTPREREQ: When PTPREREQ");
  });

  test("a malformed response hides the panel instead of crashing", () => {
    assert.deepEqual(parsePaths(null), []);
    assert.deepEqual(parsePaths({}), []);
    assert.deepEqual(parsePaths({ paths: "x" }), []);
    assert.deepEqual(parsePaths({ paths: [{ title: "t", steps: [step(1, "A")], before: null, after: null }] }), [], "one step is not a path");
    assert.deepEqual(parsePaths({ paths: [{ ...path(1), after: { nope: 1 } }] }), []);
    assert.equal(parsePaths({ paths: [path(1)] }).length, 1);
  });

  test("the panel is on the course page and hides itself on failure", () => {
    const page = readFileSync(join(here, "../../app/(app)/course/[trackId]/index.tsx"), "utf8");
    assert.match(page, /<StudyPathPanel trackId=\{trackId\} \/>/);
    const panel = readFileSync(join(here, "../components/StudyPathPanel.tsx"), "utf8");
    assert.match(panel, /\/api\/courses\/\$\{encodeURIComponent\(trackId\)\}\/path/);
    assert.match(panel, /\.catch\(\(\) => setPaths\(\[\]\)\)/);
    assert.match(panel, /if \(!paths\.length\) return null;/);
    assert.match(panel, /minHeight: 48/);
  });
});
