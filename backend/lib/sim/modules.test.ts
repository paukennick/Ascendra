// REQ-190 (docs/sims.md 4.8): modules/code-acls@1, spliced before
// validation, on its fixture host (VF under the AHA protocol) and on the
// tamponade case (PEA after cardiac surgery).
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { readFileSync } from "node:fs";
import { spliceModules, loadModule } from "./modules.ts";
import type { ModuleFile } from "./modules.ts";
import { checkDocument } from "./lint.ts";
import { ALL_DOCUMENTS, loadDocument } from "./documents.ts";
import type { DocumentEntry } from "./documents.ts";
import { advance, applyCommand, createRun } from "./engine/v1/engine.ts";
import { scoreRun } from "./engine/v1/scoring.ts";
import type { Command } from "./engine/v1/types.ts";

const FIXTURE: DocumentEntry = {
  course: "fixture",
  slug: "code-vf-fixture",
  file: join(__dirname, "fixtures", "code-vf-fixture.sim.json"),
  golden: join(__dirname, "fixtures", "code-vf-fixture.golden.json"),
  kind: "scenario",
  source: "authored",
};

function fixtureSource(): Record<string, unknown> {
  return JSON.parse(readFileSync(FIXTURE.file, "utf8")) as Record<string, unknown>;
}

function withInputs(mut: (w: Record<string, unknown>) => void): Record<string, unknown> {
  const s = fixtureSource();
  mut(((s.modules as Record<string, { with: Record<string, unknown> }>).code).with);
  return s;
}

function spliceErrors(src: Record<string, unknown>, load?: (r: string) => ModuleFile | null): string {
  return spliceModules(src, load)
    .problems.filter((p) => p.level === "error")
    .map((p) => `${p.path}: ${p.message}`)
    .join("\n");
}

describe("splicing", () => {
  test("the module file exists and declares its inputs", () => {
    const m = loadModule("code-acls@1")!;
    assert.equal(m.prefix, "code");
    for (const k of ["entry", "etiology", "scope", "returnPhase", "protocol"]) assert.ok(m.inputs[k], k);
  });
  test("the spliced document has no modules key and every module id is prefixed", () => {
    const r = spliceModules(fixtureSource());
    assert.deepEqual(r.problems, []);
    const d = r.doc!;
    assert.equal("modules" in d, false);
    for (const map of ["params", "state", "actions", "timers"]) for (const k of Object.keys(d[map] as object)) if (!["arrestAt", "goodRosc", "seen", "look"].includes(k)) assert.match(k, /^code_/, `${map}.${k}`);
    assert.equal(Object.keys(d.endings as object).slice(-1)[0], "time_up");
  });
  test("a missing input, an unknown input and an unknown module are errors", () => {
    assert.match(spliceErrors(withInputs((w) => delete w.returnPhase)), /returnPhase.*missing input/);
    assert.match(spliceErrors(withInputs((w) => (w.extra = 1))), /no input "extra"/);
    const s = fixtureSource();
    (s.modules as Record<string, { use: string }>).code.use = "code-acls@9";
    assert.match(spliceErrors(s), /no module "code-acls@9"/);
  });
  test("protocol is checked against its values", () => {
    assert.match(spliceErrors(withInputs((w) => (w.protocol = "pals"))), /one of acls, cals/);
  });
  test("scope must keep both compression modes (the non-tap mode is the accessible path)", () => {
    assert.match(spliceErrors(withInputs((w) => (w.scope = ["code_compress", "code_shock"]))), /code_compressPaced/);
    assert.match(spliceErrors(withInputs((w) => (w.scope = ["code_compress", "code_compressPaced", "look"]))), /not one of/);
  });
  test("a host id that collides with the module's is an error", () => {
    const s = fixtureSource();
    (s.state as Record<string, unknown>).code_active = { type: "bool", init: false };
    assert.match(spliceErrors(s), /already has/);
  });
  test("a fragment id without the prefix is refused", () => {
    const m = loadModule("code-acls@1")!;
    const bad = JSON.parse(JSON.stringify(m)) as ModuleFile;
    (bad.fragment.state as Record<string, unknown>).rogue = { type: "bool", init: false };
    assert.match(spliceErrors(fixtureSource(), () => bad), /must start with its prefix/);
  });
});

describe("the code module on its fixture host (VF, AHA protocol)", () => {
  test("passes the linter with its golden paths (Good, Mediocre, Bad; every ending and criterion)", () => {
    const r = checkDocument(FIXTURE, { full: true, searchNodes: 600 });
    assert.deepEqual(r.problems.filter((p) => p.level === "error"), []);
    assert.ok(r.goldenResults.length >= 3);
    for (const g of r.goldenResults) {
      assert.equal(g.error, null, g.path.id);
      assert.deepEqual(g.mismatches, [], g.path.id);
    }
  });
});

describe("compressions come in as integers in a command (19.4 item 3)", () => {
  const doc = loadDocument(FIXTURE);
  const intoCode = (): ReturnType<typeof createRun> => {
    const run = createRun(doc, 1);
    while (run.state.phase !== "code") {
      if (run.state.openReasoning) applyCommand(run, { seq: run.lastSeq + 1, tick: run.state.tick, type: "reason", moment: run.state.openReasoning, answered: true });
      advance(run);
    }
    return run;
  };
  test("the measured rate and pause are state; nothing reads a clock", () => {
    const run = intoCode();
    const r = applyCommand(run, { seq: run.lastSeq + 1, tick: run.state.tick, type: "act", action: "code_compress", params: { pad: "cpr 117 4" } });
    assert.ok(r.ok);
    assert.equal(run.ctx.root("code_rate"), 117);
    assert.equal(run.ctx.root("code_pause"), 4);
    assert.equal(run.ctx.root("code_cprMode"), "tap");
  });
  test("anything else on the pad is logged as unmatched and changes no measure", () => {
    const run = intoCode();
    const r = applyCommand(run, { seq: run.lastSeq + 1, tick: run.state.tick, type: "act", action: "code_compress", params: { pad: "cpr fast" } });
    assert.ok(r.ok);
    assert.equal(run.ctx.root("code_rate"), 0);
  });
  test("a cycle at 100-120 with pauses under 10 s is good; outside it is not", () => {
    for (const [pad, good] of [["cpr 110 6", 1], ["cpr 130 6", 0], ["cpr 110 12", 0], ["cpr 100 10", 1]] as const) {
      const run = intoCode();
      applyCommand(run, { seq: run.lastSeq + 1, tick: run.state.tick, type: "act", action: "code_compress", params: { pad } });
      for (let i = 0; i < 120; i++) advance(run);
      assert.equal(run.ctx.root("code_goodCycles"), good, pad);
    }
  });
  test("the paced (no tapping) mode is recorded as its own mode and scored on the choices", () => {
    const run = intoCode();
    applyCommand(run, { seq: run.lastSeq + 1, tick: run.state.tick, type: "act", action: "code_compressPaced", params: { prate: "110", ppause: "5" } });
    for (let i = 0; i < 120; i++) advance(run);
    assert.equal(run.ctx.root("code_cprMode"), "paced");
    assert.equal(run.ctx.root("code_goodCycles"), 1);
    const d = scoreRun(run, { reasoningGrades: [], pausedSeconds: 0 });
    assert.match(d.criteria.find((c) => c.id === "code_cprQuality")!.why, /paced option/);
  });
});

describe("tamponade hosts the code (cardiac-surgery protocol)", () => {
  const entry = ALL_DOCUMENTS.find((d) => d.slug === "tamponade-after-cabg")!;
  const doc = loadDocument(entry);
  const golden = JSON.parse(readFileSync(entry.golden!, "utf8")) as { paths: { id: string; commands: Command[]; expect: { ending: string } }[] };
  test("the arrest is a code with a ROSC branch, a guideline-named harm and a no-ROSC ending", () => {
    assert.equal(doc.endings.arrest, undefined);
    assert.ok(doc.endings.code_rosc && doc.endings.code_rosc.terminal === false);
    const ends = new Set(golden.paths.map((p) => p.expect.ending));
    for (const e of ["code_noRosc", "code_epiHarm", "arrestRosc"]) assert.ok(ends.has(e), e);
  });
  test("the protocol is the cardiac-surgery one and its sources are dated", () => {
    assert.equal(doc.params.code_protocol.value, "cals");
    const cites = doc.sources.map((s) => s.cite).join("\n");
    assert.match(cites, /Ann Thorac Surg 2017;103/);
    assert.match(cites, /CIR\.0000000000001376/);
    for (const s of doc.sources) assert.match(s.checkedAt, /^\d{4}-\d{2}-\d{2}$/);
  });
  test("module criteria are not applicable on paths with no arrest", () => {
    const run = createRun(doc, 1);
    const d = scoreRun(run, { reasoningGrades: [], pausedSeconds: 0 });
    for (const c of d.criteria.filter((x) => x.id.startsWith("code_"))) assert.equal(c.score, "na", c.id);
  });
});
