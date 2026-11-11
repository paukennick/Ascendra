// REQ-189: rule-graded interactive lab parts -- every grader with its
// partial credit, normalisation and malformed input; the content rules; the
// served input never carrying the key; and mixed steps in gradeLabStep
// (model mocked: a step with only interactive parts makes no model call).
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  answerForm,
  commandShape,
  gradeInteractive,
  interactiveAnswerText,
  interactiveInput,
  interactiveKey,
  interactiveLegacyText,
  interactiveProblems,
  InteractiveAnswerError,
  numbersIn,
  orderMovesAllowed,
  readNumber,
  type CommandSpec,
  type InteractiveSpec,
  type MatchSpec,
  type NumericSpec,
  type OrderSpec,
  type SelectSpec,
} from "./lab-interactive";
import { gradeLabStep, type LabStepModel } from "./lab-grading";
import { labContentProblems, labContentHash, type LabContent } from "./lab-content";
import { interactiveAnswerProblem, partAnswerText, runTranscript } from "./labs";

const ORDER: OrderSpec = { type: "order", items: ["Identify", "Contain", "Eradicate", "Recover", "Lessons learned"] };
const MATCH: MatchSpec = {
  type: "match",
  left: ["Confidentiality", "Integrity", "Availability"],
  right: ["Encryption", "Hashing", "Redundant power", "Badge reader"],
  pairs: [0, 1, 2],
};
const SELECT: SelectSpec = {
  type: "select",
  display: "log",
  lines: ["10:01 login ok alice", "10:02 login FAIL root x50", "10:03 login ok bob", "10:04 sudo su by guest"],
  correct: [1, 3],
};
const COMMAND: CommandSpec = { type: "command", accepted: ["kubectl get pods -n prod", "kubectl get po -n prod"], valueFlags: ["-n", "--namespace"] };
const NUMERIC: NumericSpec = { type: "numeric", answer: 12500, tolerance: 1, partialTolerance: 500, unit: "USD" };

const orderIds = () => (interactiveKey(ORDER) as { order: string[] }).order;
const matchKey = () => (interactiveKey(MATCH) as { pairs: Record<string, string> }).pairs;

describe("served input never carries the key", () => {
  test("order is shuffled, never in key order, and the same on every load", () => {
    const a = interactiveInput(ORDER, "lab:0:0");
    const b = interactiveInput(ORDER, "lab:0:0");
    assert.deepEqual(a, b);
    assert.equal(a.type, "order");
    if (a.type !== "order") return;
    assert.notDeepEqual(a.items.map((c) => c.id), orderIds());
    assert.deepEqual(new Set(a.items.map((c) => c.text)), new Set(ORDER.items));
    // Over many seeds, still never in key order.
    for (let i = 0; i < 200; i++) {
      const x = interactiveInput(ORDER, `s${i}`) as { items: { id: string }[] };
      assert.notDeepEqual(x.items.map((c) => c.id), orderIds());
    }
  });
  test("ids are hashes of the text, not positions; nothing in the input names the answer", () => {
    for (const spec of [ORDER, MATCH, SELECT, COMMAND, NUMERIC] as InteractiveSpec[]) {
      const json = JSON.stringify(interactiveInput(spec, "x"));
      assert.ok(!/correct|pairs|accepted|answer|tolerance|order"\s*:\s*\[/.test(json), json);
    }
    const inp = interactiveInput(COMMAND, "x");
    assert.ok(!JSON.stringify(inp).includes("kubectl"));
    assert.ok(!JSON.stringify(interactiveInput(NUMERIC, "x")).includes("12500"));
  });
  test("match keeps left in order and shuffles right off the key alignment", () => {
    const m = interactiveInput(MATCH, "seed") as Extract<ReturnType<typeof interactiveInput>, { type: "match" }>;
    assert.deepEqual(m.left.map((c) => c.text), MATCH.left);
    const key = matchKey();
    assert.ok(!m.left.every((l, i) => key[l.id] === m.right[i].id));
  });
  test("an older app gets the options written out", () => {
    assert.match(interactiveLegacyText("Sequence", interactiveInput(ORDER, "s")), /put these in order: .*Contain/);
    assert.match(interactiveLegacyText("Value", interactiveInput(NUMERIC, "s")), /in USD/);
    assert.match(interactiveLegacyText("Lines", interactiveInput(SELECT, "s")), /1\. 10:01/);
  });
});

describe("order", () => {
  const ids = orderIds;
  const ans = (order: number[]) => JSON.stringify(order.map((i) => ids()[i]));
  test("exact is met", () => assert.equal(gradeInteractive(ORDER, ans([0, 1, 2, 3, 4]))!.score, "met"));
  test("one item out of place is partly there; two in a list of five is missed", () => {
    assert.equal(orderMovesAllowed(5), 1);
    const g = gradeInteractive(ORDER, ans([1, 0, 2, 3, 4]))!;
    assert.equal(g.score, "partial");
    assert.match(g.comment, /3 of 5 in the right place; 1 move/);
    assert.equal(gradeInteractive(ORDER, ans([4, 0, 1, 2, 3]))!.score, "partial"); // one move, none in place
    assert.equal(gradeInteractive(ORDER, ans([1, 0, 3, 2, 4]))!.score, "missed");
    assert.equal(gradeInteractive(ORDER, ans([4, 3, 2, 1, 0]))!.score, "missed");
  });
  test("moves allowed grow with the list", () => {
    assert.deepEqual([4, 5, 6, 8, 9, 10].map(orderMovesAllowed), [1, 1, 2, 2, 3, 3]);
  });
  test("malformed: unknown, repeated or missing ids are a 400; prose is written text; blank is missed", () => {
    assert.throws(() => gradeInteractive(ORDER, JSON.stringify(["nope", ...ids().slice(1)])), InteractiveAnswerError);
    assert.throws(() => gradeInteractive(ORDER, JSON.stringify([ids()[0], ...ids().slice(0, 4)])), InteractiveAnswerError);
    assert.throws(() => gradeInteractive(ORDER, JSON.stringify(ids().slice(0, 3))), InteractiveAnswerError);
    assert.throws(() => gradeInteractive(ORDER, "[1,2,3]"), InteractiveAnswerError);
    assert.equal(gradeInteractive(ORDER, "Identify, then contain, then the rest"), null);
    assert.equal(gradeInteractive(ORDER, "[not json"), null);
    assert.equal(gradeInteractive(ORDER, "  ")!.score, "missed");
  });
  test("the answer in words", () => {
    assert.equal(interactiveAnswerText(ORDER, ans([1, 0, 2, 3, 4])).split("; ")[0], "1. Contain");
  });
});

describe("match", () => {
  const l = Object.keys(matchKey());
  const r = (interactiveInput(MATCH, "x") as { right: { id: string; text: string }[] }).right;
  const rid = (text: string) => r.find((c) => c.text === text)!.id;
  test("all pairs met; at least half partly there; less missed", () => {
    assert.equal(gradeInteractive(MATCH, JSON.stringify(matchKey()))!.score, "met");
    const two = { [l[0]]: rid("Encryption"), [l[1]]: rid("Hashing"), [l[2]]: rid("Badge reader") };
    assert.equal(gradeInteractive(MATCH, JSON.stringify(two))!.score, "partial");
    const one = { [l[0]]: rid("Encryption"), [l[1]]: rid("Badge reader") };
    const g = gradeInteractive(MATCH, JSON.stringify(one))!;
    assert.equal(g.score, "missed");
    assert.match(g.comment, /1 of 3 pairs/);
    assert.equal(gradeInteractive(MATCH, "{}")!.score, "missed");
  });
  test("one right item used for every left item scores at most once", () => {
    const all = { [l[0]]: rid("Encryption"), [l[1]]: rid("Encryption"), [l[2]]: rid("Encryption") };
    assert.equal(gradeInteractive(MATCH, JSON.stringify(all))!.score, "missed");
  });
  test("malformed pairs are a 400", () => {
    assert.throws(() => gradeInteractive(MATCH, JSON.stringify({ bogus: rid("Hashing") })), InteractiveAnswerError);
    assert.throws(() => gradeInteractive(MATCH, JSON.stringify({ [l[0]]: "bogus" })), InteractiveAnswerError);
    assert.throws(() => gradeInteractive(MATCH, JSON.stringify([l[0]])), InteractiveAnswerError);
    assert.throws(() => gradeInteractive(MATCH, JSON.stringify({ [l[0]]: 3 })), InteractiveAnswerError);
  });
  test("the answer in words names unmatched items", () => {
    assert.match(interactiveAnswerText(MATCH, JSON.stringify({ [l[0]]: rid("Hashing") })), /Confidentiality -> Hashing; Integrity -> \(not matched\)/);
  });
});

describe("select", () => {
  test("exact set met; a wrong pick cancels a right one; ticking every line never scores", () => {
    assert.equal(gradeInteractive(SELECT, '["L1","L3"]')!.score, "met");
    assert.equal(gradeInteractive(SELECT, '["L3","L1"]')!.score, "met");
    assert.equal(gradeInteractive(SELECT, '["L1"]')!.score, "partial");
    const g = gradeInteractive(SELECT, '["L1","L0"]')!;
    assert.equal(g.score, "missed");
    assert.match(g.comment, /found 1 of 2 .*picked 1 line that is fine/);
    assert.equal(gradeInteractive(SELECT, '["L0","L1","L2","L3"]')!.score, "missed");
    assert.equal(gradeInteractive(SELECT, "[]")!.score, "missed");
  });
  test("malformed picks are a 400", () => {
    assert.throws(() => gradeInteractive(SELECT, '["L9"]'), InteractiveAnswerError);
    assert.throws(() => gradeInteractive(SELECT, '["L1","L1"]'), InteractiveAnswerError);
    assert.throws(() => gradeInteractive(SELECT, '{"L1":true}'), InteractiveAnswerError);
  });
  test("the answer in words", () => {
    assert.equal(interactiveAnswerText(SELECT, '["L3","L1"]'), "line 2: 10:02 login FAIL root x50; line 4: 10:04 sudo su by guest");
  });
});

describe("command (checked, never run)", () => {
  test("whitespace, prompt, flag order and value forms are normalized", () => {
    for (const ok of [
      "kubectl get pods -n prod",
      "  kubectl   get pods  -n  prod ",
      "$ kubectl get pods -n prod",
      "kubectl -n prod get pods",
      "kubectl get pods --namespace=prod".replace("--namespace=prod", "-n prod"),
      "kubectl get pods -nprod",
      "kubectl get po -n prod",
      "kubectl get pods -n 'prod'",
    ]) {
      assert.equal(gradeInteractive(COMMAND, ok)!.score, "met", ok);
    }
  });
  test("short flag clusters equal separate flags", () => {
    const ls: CommandSpec = { type: "command", accepted: ["ls -la /var/log"] };
    for (const ok of ["ls -al /var/log", "ls -l -a /var/log", "ls -a -l /var/log", "ls /var/log -la"]) assert.equal(gradeInteractive(ls, ok)!.score, "met", ok);
    assert.equal(gradeInteractive(ls, "ls -l /var/log")!.score, "partial");
    assert.equal(gradeInteractive(ls, "ls -la /etc")!.score, "partial");
    assert.equal(gradeInteractive(ls, "cat /var/log")!.score, "missed");
    assert.equal(gradeInteractive(ls, "ls -l /etc")!.score, "missed");
  });
  test("long options with = are value options automatically", () => {
    const s: CommandSpec = { type: "command", accepted: ["aws s3 ls --profile=audit"] };
    assert.equal(gradeInteractive(s, "aws s3 ls --profile audit")!.score, "met");
    assert.equal(gradeInteractive(s, "aws --profile audit s3 ls")!.score, "met");
  });
  test("option aliases: --namespace equals -n, with either value form", () => {
    const s: CommandSpec = { type: "command", accepted: ["oc get pods -n booking"], valueFlags: ["-n"], optionAliases: { "--namespace": "-n" } };
    for (const ok of ["oc get pods --namespace booking", "oc get pods --namespace=booking", "oc -n booking get pods"]) assert.equal(gradeInteractive(s, ok)!.score, "met", ok);
    assert.ok(interactiveProblems({ ...s, optionAliases: { namespace: "-n" } }, "oc get pods -n booking", "p").some((p) => p.includes("optionAliases")));
  });
  test("case only folds when the spec says so", () => {
    const ios: CommandSpec = { type: "command", accepted: ["show ip interface brief"], ignoreCase: true, prompt: "Router#" };
    assert.equal(gradeInteractive(ios, "SHOW IP INTERFACE BRIEF")!.score, "met");
    assert.equal(gradeInteractive({ ...ios, ignoreCase: false }, "SHOW IP INTERFACE BRIEF")!.score, "missed");
  });
  test("malformed input is missed, not a crash; injection text is just words", () => {
    assert.equal(gradeInteractive(COMMAND, "kubectl get pods -n 'prod")!.score, "missed");
    assert.equal(gradeInteractive(COMMAND, "kubectl get pods -n prod; rm -rf /")!.score, "missed");
    assert.equal(gradeInteractive(COMMAND, "$(kubectl get pods -n prod)")!.score, "missed");
    assert.equal(gradeInteractive(COMMAND, "")!.score, "missed");
    assert.deepEqual(commandShape("tar -czf out.tgz dir", { type: "command", accepted: ["x"], valueFlags: ["-f"] }), {
      program: "tar",
      positionals: ["dir"],
      options: ["-c", "-f=out.tgz", "-z"],
    });
  });
});

describe("numeric", () => {
  test("currency, commas, units and minus signs are read", () => {
    assert.equal(readNumber("$12,500", "USD"), 12500);
    assert.equal(readNumber("12500 usd", "USD"), 12500);
    assert.equal(readNumber("-0.25"), -0.25);
    assert.equal(readNumber("−3"), -3);
    assert.equal(readNumber(".5"), 0.5);
    assert.equal(readNumber("87.5%", "%"), 87.5);
    assert.equal(readNumber("about 12"), null);
    assert.equal(readNumber("12 mg", "mL"), null);
    assert.equal(readNumber("1,25"), null);
    assert.equal(readNumber("1e5"), null);
  });
  test("met within tolerance, partly within partialTolerance, else missed", () => {
    assert.equal(gradeInteractive(NUMERIC, "12500")!.score, "met");
    assert.equal(gradeInteractive(NUMERIC, "12,501")!.score, "met");
    assert.equal(gradeInteractive(NUMERIC, "12,800")!.score, "partial");
    assert.equal(gradeInteractive(NUMERIC, "13,100")!.score, "missed");
    const g = gradeInteractive(NUMERIC, "a lot")!;
    assert.equal(g.score, "missed");
    assert.match(g.comment, /Enter just the number \(in USD\)/);
    const exact: NumericSpec = { type: "numeric", answer: 0.3, tolerance: 0 };
    assert.equal(gradeInteractive(exact, String(0.1 + 0.2))!.score, "met");
    assert.equal(gradeInteractive({ ...exact, partialTolerance: undefined }, "0.31")!.score, "missed");
  });
  test("numbers in a model answer", () => {
    assert.deepEqual(numbersIn("EAC = $12,500; CPI 0.80 and -.5"), [12500, 0.8, -0.5]);
  });
});

describe("content rules for interactive parts", () => {
  const ok = (spec: unknown, model = "x") => interactiveProblems(spec, model, "p");
  test("well-formed specs pass", () => {
    assert.deepEqual(ok(ORDER), []);
    assert.deepEqual(ok(MATCH), []);
    assert.deepEqual(ok(SELECT), []);
    assert.deepEqual(ok(COMMAND, "Run kubectl get pods -n prod."), []);
    assert.deepEqual(ok(NUMERIC, "EAC is $12,500."), []);
  });
  test("order: duplicates, too few or too many items", () => {
    assert.ok(ok({ ...ORDER, items: ["A", "B", "C", "a"] }).some((p) => p.includes("twice")));
    assert.ok(ok({ ...ORDER, items: ["A", "B", "C"] }).some((p) => p.includes("4-10 items")));
    assert.ok(ok({ ...ORDER, items: Array.from({ length: 11 }, (_, i) => `i${i}`) }).some((p) => p.includes("4-10 items")));
    assert.ok(ok({ ...ORDER, items: ["A", "", "C", "D"] }).some((p) => p.includes("empty")));
    assert.ok(ok({ ...ORDER, items: "A,B" }).some((p) => p.includes("list of text")));
  });
  test("match: no unique solution, bad indexes, too many distractors", () => {
    assert.ok(ok({ ...MATCH, pairs: [0, 0, 2] }).some((p) => p.includes("no unique solution")));
    assert.ok(ok({ ...MATCH, pairs: [0, 1] }).some((p) => p.includes("one right-item index per left item")));
    assert.ok(ok({ ...MATCH, pairs: [0, 1, 9] }).some((p) => p.includes("one right-item index")));
    assert.ok(ok({ ...MATCH, right: ["Encryption", "Hashing", "Redundant power", "encryption"] }).some((p) => p.includes("twice")));
    assert.ok(ok({ ...MATCH, right: [...MATCH.right, "a", "b", "c"] }).some((p) => p.includes("at most 3")));
    assert.ok(ok({ ...MATCH, right: MATCH.right.slice(0, 2) }).some((p) => p.includes("as many right items")));
  });
  test("select: nothing or everything correct, duplicate correct, a correct line indistinguishable from a fine one", () => {
    assert.ok(ok({ ...SELECT, correct: [] }).some((p) => p.includes("at least one")));
    assert.ok(ok({ ...SELECT, correct: [0, 1, 2, 3] }).some((p) => p.includes("nothing to tell apart")));
    assert.ok(ok({ ...SELECT, correct: [1, 1] }).some((p) => p.includes("twice")));
    assert.ok(ok({ ...SELECT, lines: ["a", "b", "a"], correct: [0] }).some((p) => p.includes("same text")));
    assert.ok(ok({ ...SELECT, display: "pdf" }).some((p) => p.includes("display")));
  });
  test("command: unreadable, duplicate after normalizing, model answer must quote it", () => {
    assert.ok(ok({ ...COMMAND, accepted: ["echo 'x"] }, "echo 'x").some((p) => p.includes("can't be read")));
    assert.ok(ok({ ...COMMAND, accepted: ["ls -la", "ls -al"] }, "ls -la").some((p) => p.includes("same after normalizing")));
    assert.ok(ok(COMMAND, "Use kubectl.").some((p) => p.includes("quote the first accepted command")));
    assert.ok(ok({ ...COMMAND, valueFlags: ["n"] }, "kubectl get pods -n prod").some((p) => p.includes("valueFlags")));
  });
  test("numeric: loose tolerances and a model answer that doesn't state the value", () => {
    assert.ok(ok({ ...NUMERIC, tolerance: 2000 }, "12,500").some((p) => p.includes("more than 10%")));
    assert.ok(ok({ ...NUMERIC, partialTolerance: 0.5 }, "12,500").some((p) => p.includes("larger than tolerance")));
    assert.ok(ok({ ...NUMERIC, partialTolerance: 5000 }, "12,500").some((p) => p.includes("more than 25%")));
    assert.ok(ok(NUMERIC, "EAC is twelve thousand.").some((p) => p.includes("must state the answer")));
    assert.ok(ok({ ...NUMERIC, answer: "12500" }).some((p) => p.includes("must be a number")));
  });
  test("an unknown type is named", () => {
    assert.ok(ok({ type: "slider" }).some((p) => p.includes("must be one of")));
  });
  test("labContentProblems runs them and the hash moves with the spec", () => {
    const lab: LabContent = {
      kind: "build",
      title: "Order the response",
      brief: "A fictional company has an incident. Put the phases in order.",
      steps: [{ text: "", ask: "Order the incident-response phases." }],
      rubric: [{ parts: [{ label: "Sequence", criteria: "All five phases in order.", modelAnswer: "Identify, contain, eradicate, recover, lessons.", interactive: ORDER }] }],
    };
    assert.deepEqual(labContentProblems(lab), []);
    const bad = { ...lab, rubric: [{ parts: [{ ...lab.rubric[0].parts[0], interactive: { ...ORDER, items: ["A", "A", "B", "C"] } }] }] };
    assert.ok(labContentProblems(bad).some((p) => p.startsWith("step 1 part 1: order item has")));
    assert.notEqual(labContentHash(lab), labContentHash(bad));
    const plain = { ...lab, rubric: [{ parts: [{ label: "Sequence", criteria: "All five phases in order.", modelAnswer: "Identify, contain, eradicate, recover, lessons." }] }] };
    assert.equal(labContentHash(plain), labContentHash({ ...plain, rubric: [{ parts: [{ ...plain.rubric[0].parts[0], interactive: undefined }] }] }));
  });
});

describe("answers on the lab routes", () => {
  const parts = [
    { label: "Sequence", criteria: "c", modelAnswer: "m", interactive: ORDER },
    { label: "Why", criteria: "c", modelAnswer: "m" },
  ];
  test("a structured answer naming another part's options is a 400 message; prose is fine", () => {
    assert.equal(interactiveAnswerProblem(parts, [JSON.stringify(orderIds()), "because"]), null);
    assert.equal(interactiveAnswerProblem(parts, ["in this order: identify...", "because"]), null);
    assert.match(interactiveAnswerProblem(parts, ['["x"]', "because"]) ?? "", /^part 1: /);
  });
  test("the transcript writes interactive answers out", () => {
    const t = runTranscript({ steps: [{ text: "", ask: "a" }], rubric: [{ parts }] }, [[JSON.stringify(orderIds()), "because"]]);
    assert.match(t, /^Sequence: 1\. Identify; 2\. Contain/);
    assert.equal(partAnswerText(parts[1], "x"), "x");
  });
  test("answerForm tells the three apart", () => {
    assert.equal(answerForm(ORDER, ""), "blank");
    assert.equal(answerForm(ORDER, "words"), "text");
    assert.equal(answerForm(ORDER, JSON.stringify(orderIds())), "structured");
    assert.equal(answerForm(NUMERIC, "12"), "structured");
  });
});

describe("mixed steps in gradeLabStep", () => {
  const base = {
    labTitle: "Lab",
    brief: "A fictional brief.",
    priorSteps: [],
    step: { text: "", ask: "Do the thing." },
    stepIndex: 0,
    stepCount: 1,
    family: "general" as const,
    userId: null,
  };
  const noModel: LabStepModel = async () => {
    throw new Error("the model must not be called");
  };
  test("only interactive parts: graded by rule, no model call", async () => {
    const g = await gradeLabStep(
      {
        ...base,
        parts: [
          { label: "Sequence", criteria: "c", modelAnswer: "m", interactive: ORDER },
          { label: "Value", criteria: "c", modelAnswer: "m", interactive: NUMERIC },
        ],
        answers: [JSON.stringify(orderIds()), "12,900"],
      },
      noModel
    );
    assert.equal(g.verdict, "partial");
    assert.deepEqual(g.partScores.map((p) => p.score), ["met", "partial"]);
    assert.deepEqual(g.missedParts, []);
    assert.match(g.feedback, /Checked instantly: 1 of 2 parts met/);
    assert.match(g.fixNext, /Look again at "Value"/);
  });
  test("all interactive parts met is correct; all missed is incorrect", async () => {
    const parts = [{ label: "Value", criteria: "c", modelAnswer: "m", interactive: NUMERIC }];
    assert.equal((await gradeLabStep({ ...base, parts, answers: ["12500"] }, noModel)).verdict, "correct");
    assert.equal((await gradeLabStep({ ...base, parts, answers: ["1"] }, noModel)).verdict, "incorrect");
  });
  test("a written part beside them goes to the model alone, and the scores merge in order", async () => {
    let prompt = "";
    const model: LabStepModel = async (p) => {
      prompt = p.user;
      return {
        verdict: "correct",
        feedback: "Good reasoning.",
        classification: "none",
        missedParts: [],
        fixNext: "",
        parts: [{ part: "Why", score: "met", comment: "Clear." }],
      };
    };
    const g = await gradeLabStep(
      {
        ...base,
        parts: [
          { label: "Sequence", criteria: "ORDER-CRITERIA", modelAnswer: "m", interactive: ORDER },
          { label: "Why", criteria: "WHY-CRITERIA", modelAnswer: "m" },
        ],
        answers: [JSON.stringify([orderIds()[1], orderIds()[0], ...orderIds().slice(2)]), "Because containment limits spread before eradication."],
      },
      model
    );
    assert.ok(prompt.includes("WHY-CRITERIA") && !prompt.includes("ORDER-CRITERIA"));
    assert.deepEqual(g.partScores.map((p) => [p.part, p.score]), [["Sequence", "partial"], ["Why", "met"]]);
    assert.equal(g.verdict, "partial");
    assert.match(g.feedback, /Checked instantly: 0 of 1 part met\. Good reasoning\./);
  });
  test("a written answer to an interactive part (older app) is graded by the model", async () => {
    let called = false;
    const model: LabStepModel = async () => {
      called = true;
      return { verdict: "partial", feedback: "f", classification: "incomplete", missedParts: [], fixNext: "n", parts: [{ part: "Sequence", score: "partial", comment: "" }] };
    };
    const g = await gradeLabStep(
      { ...base, parts: [{ label: "Sequence", criteria: "c", modelAnswer: "m", interactive: ORDER }], answers: ["Identify then contain then eradicate then recover"] },
      model
    );
    assert.ok(called);
    assert.equal(g.partScores[0].score, "partial");
  });
  test("a trivial written part beside an interactive one is missed without a model call", async () => {
    const g = await gradeLabStep(
      {
        ...base,
        parts: [
          { label: "Value", criteria: "c", modelAnswer: "m", interactive: NUMERIC },
          { label: "Why", criteria: "c", modelAnswer: "m" },
        ],
        answers: ["12500", "idk"],
      },
      noModel
    );
    assert.deepEqual(g.partScores.map((p) => p.score), ["met", "missed"]);
    assert.equal(g.verdict, "partial");
  });
});

describe("the authored pilot (supabase/seed/labs)", async () => {
  const { LAB_SETS } = await import("../supabase/seed/labs/index");
  const { CLINICAL_SAFETY, FITNESS_SAFETY } = await import("../supabase/seed/labs/types");
  const keyAnswer = (spec: InteractiveSpec): string => {
    const k = interactiveKey(spec);
    switch (k.type) {
      case "order":
        return JSON.stringify(k.order);
      case "match":
        return JSON.stringify(k.pairs);
      case "select":
        return JSON.stringify(k.correct);
      case "command":
        return k.accepted[0];
      case "numeric":
        return String(k.answer);
    }
  };
  const interactiveParts = LAB_SETS.flatMap((set) =>
    set.labs.flatMap((lab) => lab.steps.flatMap((s, i) => s.parts.filter((p) => p.interactive).map((p) => ({ set, lab, step: i, part: p }))))
  );
  test("about 40 labs carry interactive parts", () => {
    assert.ok(new Set(interactiveParts.map((x) => x.lab.slug)).size >= 40);
  });
  test("every interactive part's own key is met, and every accepted command is met", () => {
    for (const { lab, part } of interactiveParts) {
      const spec = part.interactive!;
      assert.equal(gradeInteractive(spec, keyAnswer(spec))!.score, "met", `${lab.slug} / ${part.label}`);
      if (spec.type === "command") for (const a of spec.accepted) assert.equal(gradeInteractive(spec, a)!.score, "met", `${lab.slug}: ${a}`);
    }
  });
  test("the served arrangement never already shows the answer", () => {
    for (const { lab, step, part } of interactiveParts) {
      const spec = part.interactive!;
      if (spec.type !== "order") continue;
      const inp = interactiveInput(spec, `${lab.slug}:${step}`) as { items: { id: string }[] };
      assert.notEqual(gradeInteractive(spec, JSON.stringify(inp.items.map((c) => c.id)))!.score, "met", lab.slug);
    }
  });
  test("clinical and fitness labs keep a written part in every step (no quiz replaces clinical reasoning)", () => {
    for (const set of LAB_SETS) {
      for (const lab of set.labs) {
        if (lab.safetyNote !== CLINICAL_SAFETY && lab.safetyNote !== FITNESS_SAFETY) continue;
        for (const [i, s] of lab.steps.entries()) assert.ok(s.parts.some((p) => !p.interactive), `${set.trackCode}/${lab.slug} step ${i + 1}`);
      }
    }
  });
});
