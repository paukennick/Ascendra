// REQ-227 (FAIL-1222, docs/sims.md 4.5 and 5.3): endings are checked in the
// document's `endingOrder` (engine minor 2), so the result never depends on
// the key order of `endings`, which the server's jsonb column does not keep.
// A document without it keeps key order, so older versions replay unchanged.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ScenarioDoc } from "./engine/v1/types.ts";
import { advance, checkpoint, createRun, endingCheckOrder, ENGINE_VERSION, lintScenario, restoreRun } from "./engine/v1/index.ts";
import type { Checkpoint } from "./engine/v1/index.ts";
import { endingOrderProblems } from "./lint.ts";
import { jsonbKeyOrder, reverseKeyOrder, withKeyOrder } from "./key-order.ts";
import { ALL_DOCUMENTS, loadDocument } from "./documents.ts";
import { spliceModules } from "./modules.ts";
import type { ModuleFile } from "./modules.ts";
import type { GoldenFile } from "./engine/v1/validate.ts";

// The frozen corpus case "endings-order": `done` (target) and `never`
// (harm) are both true from tick 4, so only the order decides which ends it.
const corpus = JSON.parse(readFileSync(join(__dirname, "engine", "v1", "golden", "corpus", "endings-order.json"), "utf8")) as { doc: ScenarioDoc };

function toyDoc(minor: number, order?: string[]): ScenarioDoc {
  const doc = JSON.parse(JSON.stringify(corpus.doc)) as ScenarioDoc;
  doc.engine = { major: 1, minor };
  if (order) doc.endingOrder = order;
  return doc;
}

function endedWith(doc: ScenarioDoc): string | null {
  const run = createRun(doc, 1);
  for (let i = 0; i < 10; i++) advance(run);
  return run.state.ended ? run.state.ended.ending : null;
}

const PERMUTATIONS: string[][] = [
  ["branch", "done", "never", "time_up"],
  ["time_up", "never", "done", "branch"],
  ["never", "branch", "time_up", "done"],
  ["done", "time_up", "branch", "never"],
];

function withEndingKeys(doc: ScenarioDoc, keys: string[]): ScenarioDoc {
  const copy = JSON.parse(JSON.stringify(doc)) as ScenarioDoc;
  copy.endings = Object.fromEntries(keys.map((k) => [k, doc.endings[k]]));
  return copy;
}

describe("endingOrder (engine minor 2)", () => {
  test("the engine is 1.2", () => assert.equal(ENGINE_VERSION, "1.2"));

  test("the listed order decides, whatever the key order of endings", () => {
    for (const keys of PERMUTATIONS) {
      assert.equal(endedWith(withEndingKeys(toyDoc(2, ["branch", "done", "never"]), keys)), "done", keys.join());
      assert.equal(endedWith(withEndingKeys(toyDoc(2, ["branch", "never", "done"]), keys)), "never", keys.join());
    }
  });

  test("the order survives jsonb and reversed key order of the whole document", () => {
    const doc = toyDoc(2, ["branch", "never", "done"]);
    for (const order of [jsonbKeyOrder, reverseKeyOrder]) assert.equal(endedWith(withKeyOrder(doc, order)), "never");
  });

  test("a checkpoint recorded by engine 1.1 (before endingOrder) restores", () => {
    const doc = withEndingKeys(toyDoc(1), ["branch", "done", "never", "time_up"]);
    const run = createRun(doc, 1);
    for (let i = 0; i < 2; i++) advance(run);
    const cp = JSON.parse(JSON.stringify(checkpoint(run))) as Checkpoint;
    cp.engine = "1.1";
    const resumed = restoreRun(doc, 1, cp);
    for (let i = 0; i < 8; i++) advance(resumed);
    assert.equal(resumed.state.ended?.ending, "done");
  });

  test("an ending the list leaves out is checked after the listed ones, sorted by id", () => {
    const doc = toyDoc(2, ["branch"]);
    assert.deepEqual(endingCheckOrder(doc), ["branch", "done", "never", "time_up"]);
    assert.deepEqual(endingCheckOrder(withEndingKeys(doc, ["time_up", "never", "done", "branch"])), ["branch", "done", "never", "time_up"]);
  });

  test("a document without endingOrder still uses key order, as minor 0 and 1 did (stored runs replay unchanged)", () => {
    for (const minor of [0, 1]) {
      assert.equal(endedWith(withEndingKeys(toyDoc(minor), ["branch", "done", "never", "time_up"])), "done");
      assert.equal(endedWith(withEndingKeys(toyDoc(minor), ["branch", "never", "done", "time_up"])), "never");
      assert.deepEqual(endingCheckOrder(toyDoc(minor)), ["branch", "done", "never", "time_up"]);
    }
  });
});

describe("the validator and endingOrder", () => {
  const errorsAt = (doc: ScenarioDoc): string[] =>
    lintScenario(doc, { searchNodes: 0 })
      .filter((p) => p.level === "error" && (p.path.startsWith("endingOrder") || p.path === "engine.minor"))
      .map((p) => `${p.path}: ${p.message}`);

  test("a complete list at minor 2 is accepted", () => assert.deepEqual(errorsAt(toyDoc(2, ["branch", "done", "never"])), []));
  test("minor 2 with two endings that have a when needs a list", () => assert.match(errorsAt(toyDoc(2)).join("\n"), /needs an explicit endingOrder/));
  test("a list below minor 2 is refused", () => assert.match(errorsAt(toyDoc(1, ["branch", "done", "never"])).join("\n"), /endingOrder needs engine minor 2/));
  test("a missing, duplicate, unknown or time_up entry is refused", () => {
    assert.match(errorsAt(toyDoc(2, ["branch", "done"])).join("\n"), /"never" has a when but is not in endingOrder/);
    assert.match(errorsAt(toyDoc(2, ["branch", "done", "done", "never"])).join("\n"), /listed twice/);
    assert.match(errorsAt(toyDoc(2, ["branch", "done", "never", "ghost"])).join("\n"), /no ending "ghost"/);
    assert.match(errorsAt(toyDoc(2, ["branch", "done", "never", "time_up"])).join("\n"), /time_up is reached by tick count/);
  });
});

describe("the lint rule: an ending set whose result depends on key order is an error", () => {
  // One golden path with no commands: the run is played out, written against the file order (done first = target).
  const golden: GoldenFile = {
    slug: "corpus",
    status: "draft",
    paths: [{ id: "p", seed: 1, commands: [], expect: { ending: "done", class: "target", rating: null } }],
  } as unknown as GoldenFile;

  test("overlapping endings without endingOrder are an error", () => {
    const doc = withEndingKeys(toyDoc(1), ["branch", "done", "never", "time_up"]);
    const problems = endingOrderProblems(doc, golden);
    assert.equal(problems.length, 1, JSON.stringify(problems));
    assert.equal(problems[0].level, "error");
    assert.match(problems[0].message, /ends differently depending on key order/);
  });

  test("the same endings with endingOrder are not", () => {
    assert.deepEqual(endingOrderProblems(toyDoc(2, ["branch", "done", "never"]), golden), []);
  });

  test("endings that never overlap are fine without endingOrder", () => {
    const doc = withEndingKeys(toyDoc(1), ["branch", "done", "never", "time_up"]);
    doc.endings.never.when = "x >= 100"; // unreachable here, so no overlap
    assert.deepEqual(endingOrderProblems(doc, golden), []);
  });
});

describe("modules and endingOrder", () => {
  const mod: ModuleFile = {
    module: "tm",
    version: 1,
    prefix: "tm",
    about: "test",
    inputs: { flag: { type: "enum", values: ["a", "b"] } },
    fragment: {
      endings: {
        tm_one: { label: "One", class: "harm", terminal: true, when: "true", narrative: "x" },
        tm_two: { $onlyIf: { input: "flag", equals: "a" }, label: "Two", class: "harm", terminal: true, when: "true", narrative: "x" },
      },
      endingOrder: ["tm_two", "tm_one"],
    },
  };
  const load = (ref: string): ModuleFile | null => (ref === "tm@1" ? mod : null);
  const host = (order?: string[], flag = "a"): Record<string, unknown> => ({
    modules: { tm: { use: "tm@1", with: { flag } } },
    endings: { host_a: { when: "true" }, time_up: { terminal: true } },
    ...(order ? { endingOrder: order } : {}),
  });

  test("the module's order is appended after the host's, minus an ending $onlyIf dropped", () => {
    assert.deepEqual((spliceModules(host(["host_a"]), load).doc as { endingOrder: string[] }).endingOrder, ["host_a", "tm_two", "tm_one"]);
    assert.deepEqual((spliceModules(host(["host_a"], "b"), load).doc as { endingOrder: string[] }).endingOrder, ["host_a", "tm_one"]);
  });

  test("a host without endingOrder keeps key order (nothing is added)", () => {
    const r = spliceModules(host(), load);
    assert.deepEqual(r.problems, []);
    assert.equal((r.doc as { endingOrder?: string[] }).endingOrder, undefined);
  });

  test("a module ending with a when that its own order leaves out is an error", () => {
    const bad: ModuleFile = { ...mod, fragment: { ...mod.fragment, endingOrder: ["tm_one"] } };
    const r = spliceModules(host(["host_a"]), (ref) => (ref === "tm@1" ? bad : null));
    assert.match(r.problems.map((p) => p.message).join("\n"), /does not list/);
  });
});

describe("tamponade after CABG (FAIL-1222)", () => {
  const entry = ALL_DOCUMENTS.find((e) => e.slug === "tamponade-after-cabg")!;
  const golden = JSON.parse(readFileSync(entry.golden!, "utf8")) as GoldenFile;

  test("as it was before (minor 1, no endingOrder) full-dose epinephrine ends differently in jsonb order: the lint rule catches it", () => {
    const old = JSON.parse(JSON.stringify(loadDocument(entry))) as ScenarioDoc;
    delete old.endingOrder;
    old.engine = { major: 1, minor: 1 };
    const problems = endingOrderProblems(old, golden);
    assert.ok(problems.some((p) => p.message.includes("golden path codeFullEpi")), JSON.stringify(problems));
  });

  test("migrated: the order is explicit, so the rule has nothing to flag, and the codeFullEpi path expects harm (storage-order.test.ts replays it to harm in jsonb order)", () => {
    const doc = loadDocument(entry);
    assert.deepEqual(endingOrderProblems(doc, golden), []);
    const path = golden.paths.find((p) => p.id === "codeFullEpi")!;
    assert.equal(path.expect.ending, "code_epiHarm");
    assert.equal(path.expect.class, "harm");
  });
});
