// REQ-251: the offline answer-choice style report. Files in a temp dir; no
// model, no database.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { category, filesUnder, rawOptionSets, renderReport, scoreFile, scoreJson, summarize } from "./item-style-report-lib";

const clean = {
  fadeProblem: "A team is configuring a firewall. Which port must be opened for the secure site?",
  fadeChoices: ["TCP port 80", "TCP port 443", "TCP port 8080", "TCP port 22"],
  fadeCorrectIndex: 1,
  fadeWhy: "Secure web traffic uses port 443.",
  soloCheck: "Another team must allow secure browsing to its server. Which port does that need?",
  soloChoices: ["TCP port 80", "TCP port 443", "TCP port 8080", "TCP port 22"],
  soloCorrectIndex: 1,
  soloWhy: "Secure web traffic uses port 443.",
};
// Solo key much longer, and a Guided distractor with "always".
const styled = {
  ...clean,
  fadeChoices: ["TCP port 80", "TCP port 443", "Always TCP port 8080", "TCP port 22"],
  soloChoices: ["TCP 80", "TCP port 443, because HTTPS runs TLS over it by default", "TCP 8080", "TCP 22"],
};
// lesson_content's snake_case spelling.
const snake = {
  fade_problem: styled.fadeProblem,
  fade_choices: styled.fadeChoices,
  fade_correct_index: 1,
  fade_why: styled.fadeWhy,
  solo_check: styled.soloCheck,
  solo_choices: styled.soloChoices,
  solo_correct_index: 1,
  solo_why: styled.soloWhy,
};

describe("REQ-251 item style report", () => {
  test("finds practice halves in either spelling and quiz items anywhere in the JSON", () => {
    const items = scoreJson({ run: { lessons: [clean, { practice: styled }], stored: [snake] }, quiz: { question: "Which port?", choices: ["80", "443", "22", "Only 25"], correctIndex: 1 } }, "f");
    assert.deepEqual(items.map((i) => i.kind), ["practice", "practice", "practice", "quiz"]);
    assert.deepEqual(items[0].lint, []);
    assert.ok(items[1].lint.length >= 2);
    assert.deepEqual(items[2].lint, items[1].lint, "snake_case scores the same as camelCase");
    assert.equal(items[1].source, "f.run.lessons[1].practice");
  });

  test("counts each kind once per item, the cue words, and the key-longest share", () => {
    const value = [clean, styled, styled];
    const r = summarize(scoreJson(value, "f"), rawOptionSets(value));
    assert.equal(r.items, 3);
    assert.equal(r.withStyle, 2);
    assert.equal(r.byCategory["Solo: right answer much longer than the others"], 2);
    assert.equal(r.byCategory["Guided: wrong option uses an absolute word"], 2);
    assert.equal(r.byCueWord.always, 2);
    assert.equal(r.optionSets, 6);
    assert.equal(r.keyOverLimit, 2);
    const text = renderReport(r, "t");
    assert.match(text, /With any style finding: 2 \(67%\)/);
    assert.ok(!text.includes("HTTPS runs TLS"), "the report prints counts, never question text");
  });

  test("categories follow the validator's messages", () => {
    assert.equal(category('Solo question option 2 uses the absolute word "only"; reword it'), "Solo: wrong option uses an absolute word");
    assert.equal(category("Guided question asks for 2 but option 1 lists 1; every option must list exactly 2."), "Guided: asks for N but an option lists a different count");
    assert.equal(category("Quiz question: the right answer is much longer than the other options (9 vs about 3 characters)"), "Quiz: right answer much longer than the others");
  });

  test("reads .json and .jsonl files from a directory, nested", () => {
    const dir = mkdtempSync(join(tmpdir(), "item-style-"));
    try {
      writeFileSync(join(dir, "a.json"), JSON.stringify([clean, styled]));
      writeFileSync(join(dir, "b.jsonl"), `${JSON.stringify(styled)}\n\n${JSON.stringify(snake)}\n`);
      writeFileSync(join(dir, "notes.txt"), "ignored");
      const files = filesUnder(dir);
      assert.equal(files.length, 2);
      const items = files.flatMap(scoreFile);
      assert.equal(items.length, 4);
      assert.match(items[3].source, /b\.jsonl:3$/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
