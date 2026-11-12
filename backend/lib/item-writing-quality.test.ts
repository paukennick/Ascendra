// REQ-251: the item-writing rules state the distractor lint's own thresholds
// where the options are written, the retry steer names a concrete target, and
// two clear false positives of the lint are fixed (FAIL-1660, FAIL-1661).
// No model, no database.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  ITEM_WRITING_RULES,
  OPTION_LENGTH_RULE,
  CUE_WORD_RULE,
  STABLE_DATA_RULES,
  coachRules,
  coachQuizPrompt,
  coachQuizSchema,
  lessonPracticePrompt,
  lessonPracticeSchema,
} from "./prompts";
import { ABSOLUTE_WORDS, KEY_LENGTH_RATIO, KEY_LENGTH_SLACK_CHARS, keyLengthLimit } from "./item-style";
import { distractorProblems, fixFor } from "./content-validator";

const longFinding = (ps: string[]) => ps.filter((p) => /much longer than/.test(p));
const cueFinding = (ps: string[]) => ps.filter((p) => /absolute word/.test(p));

describe("REQ-251: the rules carry the check's numbers and word list", () => {
  test("the length rule states the ratio and the slack the lint uses", () => {
    assert.equal(KEY_LENGTH_RATIO, 1.25);
    assert.equal(KEY_LENGTH_SLACK_CHARS, 8);
    assert.match(OPTION_LENGTH_RULE, /at most 1\.25 times the average length of the wrong options, or at most 8 characters longer than that average, whichever allows more/);
    assert.match(OPTION_LENGTH_RULE, /not the longest/);
  });

  test("the cue-word rule lists every word the lint flags, and only wrong options are held to it", () => {
    for (const w of ABSOLUTE_WORDS) assert.match(CUE_WORD_RULE, new RegExp(`\\b${w}\\b`));
    assert.match(CUE_WORD_RULE, /^no wrong option uses /);
    assert.match(CUE_WORD_RULE, /unless the question itself uses that word/);
  });

  test("ITEM_WRITING_RULES: both rules, where a qualification goes, the example pair and the self-check", () => {
    assert.ok(ITEM_WRITING_RULES.includes(OPTION_LENGTH_RULE));
    assert.ok(ITEM_WRITING_RULES.includes(CUE_WORD_RULE));
    assert.match(ITEM_WRITING_RULES, /Put qualifications and the reasoning in the explanation, not in the option/);
    assert.match(ITEM_WRITING_RULES, /Bad: {2}\*"/);
    assert.match(ITEM_WRITING_RULES, /Good: \*"/);
    assert.match(ITEM_WRITING_RULES, /find the longest option -- if it is the right one, shorten it/);
    assert.match(ITEM_WRITING_RULES, /scan every wrong option for the cue words above/);
  });

  test("the example pair is right by the check itself: Bad fails both rules, Good passes", () => {
    const sets = [...ITEM_WRITING_RULES.matchAll(/(Bad|Good): +([\s\S]*?)(?=\n {2}(?:Good|- )|\n- )/g)];
    assert.equal(sets.length, 2);
    const parse = (s: string) => [...s.matchAll(/(\*?)"([^"]+)"/g)].map((m) => ({ key: m[1] === "*", text: m[2] }));
    for (const [, which, body] of sets) {
      const opts = parse(body);
      assert.equal(opts.length, 4);
      const ps = distractorProblems("Q", "What does it do?", opts.map((o) => o.text), opts.findIndex((o) => o.key));
      if (which === "Bad") {
        assert.equal(longFinding(ps).length, 1);
        assert.equal(cueFinding(ps).length, 1);
      } else assert.deepEqual(ps, []);
    }
  });

  test("the options are written with the rules in view: schema descriptions and the JSON template, Guided and Solo", () => {
    for (const d of [lessonPracticeSchema.shape.fadeChoices.description, lessonPracticeSchema.shape.soloChoices.description, coachQuizSchema.shape.choices.description]) {
      assert.ok(d?.includes(OPTION_LENGTH_RULE), "length rule in the schema description");
      assert.ok(d?.includes(CUE_WORD_RULE), "cue rule in the schema description");
    }
    const { user } = lessonPracticePrompt({ trackTitle: "T", unitTitle: "U", objectiveTitle: "O" });
    for (const field of ["fadeChoices", "soloChoices"]) {
      const line = user.split("\n").find((l) => l.trimStart().startsWith(`"${field}"`)) ?? "";
      assert.ok(line.includes(OPTION_LENGTH_RULE), `${field} line carries the length rule`);
      assert.ok(line.includes(CUE_WORD_RULE), `${field} line carries the cue rule`);
    }
    assert.ok(coachQuizPrompt({ trackTitle: "T", unitTitle: "U", objectiveTitle: "O" }).user.includes(OPTION_LENGTH_RULE));
  });

  test("cache layout unchanged: the rules are in the per-call task block, the cached stable block is the coach rules alone", () => {
    const ctx = { trackTitle: "Track", trackType: "certification", examCode: "X-1" } as Parameters<typeof coachRules>[0];
    const { system } = lessonPracticePrompt({ trackTitle: "Track", unitTitle: "U", objectiveTitle: "O", ctx });
    assert.equal(system.stable, coachRules(ctx) + STABLE_DATA_RULES);
    assert.ok(!system.stable.includes("Item-writing rules"));
    assert.ok(system.task.includes(ITEM_WRITING_RULES));
  });
});

describe("REQ-251: the retry steer names a target", () => {
  const opts = (key: string, others: string[]) => [key, ...others];
  const others = ["a".repeat(40), "b".repeat(40), "c".repeat(40)]; // mean 40 -> limit 50

  test("keyLengthLimit is the lint's boundary exactly", () => {
    assert.equal(keyLengthLimit(40), 50);
    assert.equal(keyLengthLimit(20), 28); // the slack wins on short options
    assert.deepEqual(longFinding(distractorProblems("Q", "S", opts("k".repeat(50), others), 0)), []);
    assert.equal(longFinding(distractorProblems("Q", "S", opts("k".repeat(51), others), 0)).length, 1);
  });

  test("the length finding says how short the key must be, or how long the wrong options must be", () => {
    const [p] = longFinding(distractorProblems("Solo question", "S", opts("k".repeat(70), others), 0));
    assert.match(p, /^Solo question: the right answer is much longer than the other options \(70 vs about 40 characters\)/);
    assert.match(p, /shorten the right answer to at most 50 characters/);
    assert.match(p, /lengthen the wrong options with plausible detail to about 56 characters each/);
    // 56: the smallest mean that lets a 70-character key pass (70 / 1.25)
    assert.equal(keyLengthLimit(56) >= 70, true);
    assert.equal(keyLengthLimit(55) >= 70, false);
    assert.ok(fixFor([p])!.includes(p));
  });

  test("the cue finding says how to make the option wrong instead, and lists the words", () => {
    const [p] = cueFinding(distractorProblems("Guided question", "What happens?", ["It retries", "It always fails", "It queues", "It logs"], 0));
    assert.match(p, /option 2 uses the absolute word "always"; reword it without a cue word/);
    assert.match(p, /make it wrong through its content \(a wrong value, step, condition or cause\)/);
    for (const w of ABSOLUTE_WORDS) assert.match(p, new RegExp(`\\b${w}\\b`));
  });
});

describe("REQ-251: clear false positives", () => {
  test("FAIL-1660: a key that is not the longest option is not 'much longer than the others'", () => {
    // One very short distractor dragged the mean down (mean 31, limit 39).
    const choices = ["Encrypt the data at rest with AES-256", "Hash it with SHA-256 before storing it in the table", "Use TLS", "Do nothing"];
    assert.deepEqual(longFinding(distractorProblems("Q", "How should the stored card numbers be protected?", choices, 0)), []);
    // A distractor exactly as long as the key: not the longest either.
    assert.deepEqual(longFinding(distractorProblems("Q", "S", ["k".repeat(60), "d".repeat(60), "x", "y"], 0)), []);
  });

  test("FAIL-1660: the intent stands -- a key longer than every distractor and over the limit is still flagged", () => {
    assert.equal(longFinding(distractorProblems("Q", "S", ["k".repeat(61), "d".repeat(60), "x", "y"], 0)).length, 1);
    assert.equal(longFinding(distractorProblems("Q", "What does it do?", ["It encrypts traffic between client and server once the chain validates", "It compresses data", "It logs events", "It routes"], 0)).length, 1);
  });

  test("FAIL-1661: 'every' in a stated interval is a schedule, not an absolute", () => {
    const q = (o: string) => cueFinding(distractorProblems("Q", "Which exercise prescription fits?", ["Ten repetitions, twice a day", o, "Rest for a week", "Ice for 20 minutes"], 0));
    assert.deepEqual(q("Repeat the set every 2 hours"), []);
    assert.deepEqual(q("Reposition the patient every two hours"), []);
    assert.deepEqual(q("Stretch every other day"), []);
    assert.deepEqual(q("Every 4-6 hours as needed"), []);
    assert.deepEqual(q("Take a back-up every hour"), []);
  });

  test("FAIL-1661: the intent stands -- 'every' about people or cases, and other cues in the same option, are still caught", () => {
    const q = (o: string) => cueFinding(distractorProblems("Which control fits?", "Which control fits?", ["Role-based access", o, "Audit logging", "Network segmentation"], 0));
    assert.equal(q("Give every user admin rights").length, 1);
    assert.equal(q("It applies in every case").length, 1);
    assert.equal(q("Always rotate the key every 90 days").length, 1); // "always" is still a cue
  });
});
