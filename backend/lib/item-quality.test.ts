// REQ-114 (Audit 3, content): pure checks -- the prompts carry the new
// rules, the generation schemas require confidence and uncertainClaims, the
// fact-check verdict logic, the "(Choose two.)" check, and the seed fixes.
// The stateful parts (flags, quarantine, voiding, the gate in each generator)
// are in lib/item-quality.dbtest.ts.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  ACCURACY_RULES,
  INCLUSIVE_RULES,
  ITEM_WRITING_RULES,
  KEY_SUSPECT,
  coachQuizPrompt,
  coachQuizSchema,
  coachRules,
  domainFraming,
  examItemSchema,
  examItemsPrompt,
  gradeFreeResponsePrompt,
  guessFeedbackPrompt,
  labQuestionsPrompt,
  lessonIntroPrompt,
  lessonIntroSchema,
  lessonPracticePrompt,
  lessonPracticeSchema,
  pbqGenerationPrompt,
  pbqScenarioSchema,
  chatSystemPrompt,
} from "./prompts";
import { reviewBatchPrompt, reviewBatchSchema, unitCheckPrompt, unitCheckSchema } from "./review-prompts";
import { conceptSetSchema, conceptSetsPrompt, learnedSetPrompt } from "./understanding-prompts";
import { factCheckEnabled, factCheckGate, factCheckPrompt, judgeFactCheck, orderingForCheck, type CheckItem } from "./fact-check";
import { lessonItemId, servableSql, uncertaintyOf, examCheckItem } from "./item-quality";
import { statedChoiceCount, validateItemDraft } from "./exam-formats";
import { CATALOG_TRACKS } from "../supabase/seed/catalog";
import type { CoachContext } from "./coach-context";

const ctx: CoachContext = { trackTitle: "AWS ANS", trackType: "certification", examCode: "ANS-C01", credentialName: "AWS Certified Advanced Networking" };
const P = { trackTitle: "T", unitTitle: "U", objectiveTitle: "O", ctx };

describe("H1: every prompt carries the accuracy rules (shared coach rules)", () => {
  test("the rules say: objective scope for this exam version, say so or omit when unsure, never guess names/limits/prices", () => {
    assert.match(ACCURACY_RULES, /only what the objective names, for the exam version given/);
    assert.match(ACCURACY_RULES, /say so plainly or leave it\s+out/);
    assert.match(ACCURACY_RULES, /Never guess version-specific names/);
    assert.match(ACCURACY_RULES, /limits, quotas, defaults.*prices/s);
    assert.ok(coachRules(ctx).includes(ACCURACY_RULES));
    assert.ok(coachRules().includes(ACCURACY_RULES));
  });

  test("every generation, grading and chat prompt's stable block includes them", () => {
    const systems = [
      lessonIntroPrompt(P).system,
      lessonPracticePrompt(P).system,
      examItemsPrompt({ ...P, formats: ["multiple_choice"], exhibits: false }).system,
      coachQuizPrompt(P).system,
      pbqGenerationPrompt({ trackTitle: "T", unitTitle: "U", unitObjectives: ["a"], ctx }).system,
      labQuestionsPrompt({ objectiveTitle: "O", labPrompt: "L", ctx }).system,
      guessFeedbackPrompt({ objectiveTitle: "O", guessPrompt: "g", teach: "t", guess: "x", ctx }).system,
      gradeFreeResponsePrompt({ taughtText: "t", question: "q", answer: "a", ctx }).system,
      reviewBatchPrompt({ trackTitle: "T", objectives: [], ctx }).system,
      unitCheckPrompt({ trackTitle: "T", unitTitle: "U", gate: "g", objectiveTitles: ["a"], ctx }).system,
      conceptSetsPrompt({ trackTitle: "T", objectives: [], ctx }).system,
      learnedSetPrompt({ trackTitle: "T", objectiveTitle: "O", confusedWith: ["x"], ctx }).system,
      factCheckPrompt({ items: [], ctx }).system,
      chatSystemPrompt({ trackTitle: "T", ctx }),
    ];
    for (const s of systems) {
      assert.ok(s.stable.includes(ACCURACY_RULES));
      assert.ok(s.stable.includes(INCLUSIVE_RULES));
    }
  });

  test("M3: the rules no longer call the learner 'he', and ask for inclusive scenarios", () => {
    assert.doesNotMatch(coachRules(ctx), /\bhe\b/);
    assert.match(coachRules(ctx), /require the learner can define the idea/);
    assert.match(INCLUSIVE_RULES, /never assume gender, culture, nationality, age, ability/);
  });

  test("generation schemas require confidence and uncertainClaims", () => {
    const schemas = {
      lessonIntro: lessonIntroSchema,
      lessonPractice: lessonPracticeSchema,
      examItem: examItemSchema,
      coachQuiz: coachQuizSchema,
      pbqScenario: pbqScenarioSchema,
      unitCheck: unitCheckSchema,
      conceptSet: conceptSetSchema,
      reviewItem: reviewBatchSchema.shape.items.element,
    };
    for (const [name, s] of Object.entries(schemas)) {
      const shape = (s as { shape: Record<string, { isOptional(): boolean }> }).shape;
      assert.ok(shape.confidence && !shape.confidence.isOptional(), `${name}.confidence required`);
      assert.ok(shape.uncertainClaims && !shape.uncertainClaims.isOptional(), `${name}.uncertainClaims required`);
    }
    assert.throws(() => coachQuizSchema.parse({ question: "q", choices: ["a", "b", "c", "d"], correctIndex: 0, hints: ["h", "i"], explanation: "e" }));
  });

  test("uncertaintyOf holds back listed claims and low confidence, and nothing when the fields are absent", () => {
    assert.deepEqual(uncertaintyOf({ confidence: "high", uncertainClaims: ["  Agent Platform AutoML limit  ", ""] }), ["Agent Platform AutoML limit"]);
    assert.ok(uncertaintyOf({ confidence: "low", uncertainClaims: [] }));
    assert.equal(uncertaintyOf({ confidence: "medium", uncertainClaims: [] }), null);
    assert.equal(uncertaintyOf({}), null);
    assert.equal(uncertaintyOf(null), null);
  });
});

describe("M4: one set of item-writing rules in every multiple-choice prompt", () => {
  test("lesson, Quiz-me, review and exam prompts include it", () => {
    assert.match(ITEM_WRITING_RULES, /NOT \/ EXCEPT/);
    assert.match(ITEM_WRITING_RULES, /never the longest/);
    assert.match(ITEM_WRITING_RULES, /absolute cue words/);
    assert.match(ITEM_WRITING_RULES, /Exactly one defensible answer/);
    for (const s of [
      lessonPracticePrompt(P).system.task,
      coachQuizPrompt(P).system.task,
      reviewBatchPrompt({ trackTitle: "T", objectives: [], ctx }).system.task,
      examItemsPrompt({ ...P, formats: ["multiple_choice"], exhibits: false }).system.task,
    ]) {
      assert.ok(s.includes(ITEM_WRITING_RULES));
    }
  });
});

describe("H3: the grader may judge the key itself wrong", () => {
  test("with a reference answer the prompt carries the key-suspect rule; without one it does not", () => {
    const withKey = gradeFreeResponsePrompt({ taughtText: "t", question: "q", answer: "a", answerKey: "k", ctx });
    assert.match(withKey.system.task, /CONFIDENT the reference answer is itself wrong/);
    assert.ok(withKey.system.task.includes(`"${KEY_SUSPECT}"`));
    assert.match(withKey.user, /key-suspect/);
    const noKey = gradeFreeResponsePrompt({ taughtText: "t", question: "q", answer: "a", ctx });
    assert.doesNotMatch(noKey.system.task, /key-suspect/);
    assert.equal(withKey.system.stable, noKey.system.stable, "the cached block is unchanged");
  });
});

describe("second-model fact-check gate (recommendation 1)", () => {
  const items: CheckItem[] = [
    { key: "a", objectiveTitle: "O", question: "q1", format: "single", options: ["w", "x", "y", "z"], expected: [2] },
    { key: "b", objectiveTitle: "O", question: "q2", format: "multi", options: ["1", "2", "3", "4", "5"], expected: [0, 3] },
    { key: "c", objectiveTitle: "O", question: "q3", format: "matching", prompts: ["p", "q", "r"], responses: ["u", "v", "w"], expected: [2, 0, 1] },
  ];

  test("publishes only on agreement with no unsupported claim; a missing result is held", () => {
    const v = judgeFactCheck(items, {
      results: [
        { key: "a", answer: [2], unsupportedClaims: [] },
        { key: "b", answer: [3, 0], unsupportedClaims: ["the 2026 quota is 500"] },
        { key: "c", answer: [2, 1, 0], unsupportedClaims: [] },
      ],
    });
    assert.deepEqual(
      v.map((x) => [x.key, x.publish, x.outcome]),
      [
        ["a", true, "agree"],
        ["b", false, "unsupported"],
        ["c", false, "disagree"],
      ]
    );
    assert.equal(judgeFactCheck(items, { results: [] })[0].outcome, "missing");
    assert.equal(judgeFactCheck(items, null)[0].publish, false);
  });

  test("the checker never sees the key, and ordering steps are not shown in the right order", () => {
    const { user } = factCheckPrompt({ items });
    assert.doesNotMatch(user, /expected|correct/i);
    const steps = ["Identify", "Contain", "Eradicate", "Recover"];
    const { options, expected } = orderingForCheck(steps);
    assert.notDeepEqual(options, steps);
    assert.deepEqual(expected.map((i) => options[i]), steps, "expected maps back to the right order");
    const three = orderingForCheck(["a", "b", "c"]);
    assert.ok(three.options.every((o, i) => o !== ["a", "b", "c"][i]), "every step moves");
  });

  test("the gate is on by default, can be turned off, and fails closed when the check errors", async () => {
    const prev = process.env.ITEM_FACT_CHECK;
    try {
      delete process.env.ITEM_FACT_CHECK;
      assert.equal(factCheckEnabled(), true);
      const failing = async () => {
        throw new Error("network down");
      };
      const closed = await factCheckGate(items, {}, failing);
      assert.equal(closed.error, "network down");
      assert.ok([...closed.verdicts.values()].every((v) => !v.publish));
      let calls = 0;
      const agreeing = async (its: CheckItem[]) => {
        calls++;
        return its.map((i) => ({ key: i.key, publish: true, answer: i.expected, unsupportedClaims: [], outcome: "agree" as const }));
      };
      assert.ok([...(await factCheckGate(items, {}, agreeing)).verdicts.values()].every((v) => v.publish));
      assert.equal(calls, 1, "one call for the whole batch");
      process.env.ITEM_FACT_CHECK = "off";
      assert.equal(factCheckEnabled(), false);
      const off = await factCheckGate(items, {}, failing);
      assert.ok([...off.verdicts.values()].every((v) => v.publish), "off: everything publishes, no call");
    } finally {
      if (prev === undefined) delete process.env.ITEM_FACT_CHECK;
      else process.env.ITEM_FACT_CHECK = prev;
    }
  });

  test("exam items map to the checker's terms", () => {
    assert.deepEqual(examCheckItem("k", "O", "multiple_response", "s", { choices: ["a", "b", "c", "d", "e"] }, { correct: [1, 4] })?.format, "multi");
    assert.equal(examCheckItem("k", "O", "ordering", "s", { steps: ["a", "b", "c"] }, { order: [0, 1, 2] })?.format, "ordering");
  });
});

describe("item ids and the serving filter", () => {
  test("a lesson check is identified by objective, stage and question", () => {
    const id = lessonItemId("ABC", "fade", "q");
    assert.match(id, /^abc:fade:[0-9a-f]{32}$/);
    assert.notEqual(id, lessonItemId("abc", "fade", "q2"));
    assert.match(servableSql("exam", "i.id"), /item_kind = 'exam'.*status <> 'cleared'/s);
  });
});

describe("L2: '(Choose two.)' must match the key", () => {
  test("the stem's count is read and checked against the number of keyed answers", () => {
    assert.equal(statedChoiceCount("Which two? (Choose two.)"), 2);
    assert.equal(statedChoiceCount("Select THREE of the following."), 3);
    assert.equal(statedChoiceCount("Which control fits?"), null);
    const mr = { format: "multiple_response", stem: "Which apply? (Choose two.)", choices: ["a", "b", "c", "d", "e"], correct: [0, 1, 2], explanation: "e" };
    assert.equal(validateItemDraft(mr, ["multiple_response"], false), "stem says choose 2 but the key has 3");
    assert.equal(typeof validateItemDraft({ ...mr, correct: [0, 1] }, ["multiple_response"], false), "object");
    const mc = { format: "multiple_choice", stem: "Pick two answers (Choose two.)", choices: ["a", "b", "c", "d"], correct: [0], explanation: "e" };
    assert.match(validateItemDraft(mc, ["multiple_choice"], false) as string, /choose 2/);
  });
});

describe("seed and framing fixes (Audit 3 M1, M5-M8, L1, L3, L4)", () => {
  const track = (code: string) => CATALOG_TRACKS.find((t) => t.code === code)!;
  const objectives = (code: string) => track(code).units.flatMap((u) => u.objectives);
  const labs = CATALOG_TRACKS.flatMap((t) => t.units.flatMap((u) => (u.labs ?? []).filter((l): l is string => !!l)));

  test("M1: ANS-C01 passes at 750 (AWS exam guide) and was re-verified", () => {
    const c = track("AWSANS").credential!;
    assert.match(c.passingScorePolicy!, /minimum passing score 750/);
    assert.equal(c.lastVendorVerifiedAt, "2026-11-07T00:00:00Z");
  });

  test("M5/M6: no track teaches OpsWorks or CodeGuru Security as current", () => {
    for (const code of ["AWSDOP", "AWSSCS", "AWSMLA"]) {
      for (const o of objectives(code)) {
        if (/OpsWorks/.test(o)) assert.match(o, /end of life/);
        if (/CodeGuru/.test(o)) assert.match(o, /end of support/);
      }
    }
  });

  test("M7: fitness tracks are disclaimer-gated and get the safety framing", () => {
    const fitness = CATALOG_TRACKS.filter((t) => t.subcategorySlug === "fitness");
    assert.equal(fitness.length, 6);
    for (const t of fitness) {
      assert.equal(t.requiresAcknowledgement, true, t.code);
      assert.equal(t.disclaimerKey, "fitness-content");
    }
    assert.match(domainFraming({ trackTitle: "NASM", categorySlug: "health-fitness" }), /not exercise, nutrition or medical advice/);
    assert.doesNotMatch(domainFraming({ trackTitle: "AWS", categorySlug: "cloud" }), /exercise/);
  });

  test("M8 / L1 / L3: lab wording is safe and asks for the right concept", () => {
    const has = (re: RegExp) => labs.find((l) => re.test(l));
    assert.match(has(/secrets scanner/)!, /revoke or rotate the secret first.*history/);
    assert.match(has(/MTBF 10,000 hours/)!, /say nothing about RPO/);
    assert.doesNotMatch(has(/MTBF 10,000 hours/)!, /RTO and RPO it can support/);
    assert.match(has(/vulnerable lab VM/)!, /host-only or NAT networking, never bridged/);
    assert.match(has(/Harden a test SSH server/)!, /second session/);
    assert.match(has(/VirusTotal/)!, /never upload a private file/);
    for (const l of labs.filter((x) => /Nmap scan/.test(x) && /home network/.test(x))) assert.match(l, /administer yourself, with the agreement/);
    assert.match(has(/with and without a salt/)!, /bcrypt, scrypt or Argon2/);
    assert.match(has(/CyberChef, decode it/)!, /never run the decoded command/);
  });

  test("L4: the CySA+ and Security+ V7 tracks say when translated exams run past the English date", () => {
    assert.match(track("CYSAPLUS").description, /translated CS0-003 exam \(available until 2027-03-23\)/);
    assert.match(track("SECPLUS").description, /until 2027-08-13/);
  });
});
