// REQ-190 (docs/sims.md 4.7): difficulty bands as a merge-patch overlay.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { applyBand, mergePatch, resolvePointer, thresholdProblems } from "./overlay.ts";
import type { BandFile } from "./overlay.ts";
import { ALL_DOCUMENTS, compileEntry, documentEntry, loadDocument } from "./documents.ts";
import { contentHash, clientHash } from "./content-hash.ts";
import type { ScenarioDoc } from "./engine/v1/types.ts";

describe("RFC 7396 merge-patch", () => {
  // The examples in RFC 7396 appendix A.
  const cases: [unknown, unknown, unknown][] = [
    [{ a: "b" }, { a: "c" }, { a: "c" }],
    [{ a: "b" }, { b: "c" }, { a: "b", b: "c" }],
    [{ a: "b" }, { a: null }, {}],
    [{ a: "b", b: "c" }, { a: null }, { b: "c" }],
    [{ a: ["b"] }, { a: "c" }, { a: "c" }],
    [{ a: "c" }, { a: ["b"] }, { a: ["b"] }],
    [{ a: { b: "c" } }, { a: { b: "d", c: null } }, { a: { b: "d" } }],
    [{ a: [{ b: "c" }] }, { a: [1] }, { a: [1] }],
    [["a", "b"], ["c", "d"], ["c", "d"]],
    [{ a: "b" }, ["c"], ["c"]],
    [{ a: "foo" }, null, null],
    [{ a: "foo" }, "bar", "bar"],
    [{ e: null }, { a: 1 }, { e: null, a: 1 }],
    [[1, 2], { a: "b", c: null }, { a: "b" }],
    [{}, { a: { bb: { ccc: null } } }, { a: { bb: {} } }],
  ];
  for (const [target, patch, want] of cases) {
    test(`${JSON.stringify(target)} + ${JSON.stringify(patch)}`, () => {
      assert.deepEqual(mergePatch(target, patch), want);
    });
  }
  test("does not mutate its inputs", () => {
    const t = { a: { b: 1 } };
    const p = { a: { c: 2 } };
    mergePatch(t, p);
    assert.deepEqual(t, { a: { b: 1 } });
    assert.deepEqual(p, { a: { c: 2 } });
  });
  test("JSON pointers", () => {
    assert.deepEqual(resolvePointer({ a: [{ "b/c": 1 }] }, "/a/0/b~1c"), { ok: true, value: 1 });
    assert.equal(resolvePointer({ a: [] }, "/a/1").ok, false);
    assert.equal(resolvePointer({ a: 1 }, "a").ok, false);
  });
});

function baseSource(): Record<string, unknown> {
  return JSON.parse(readFileSync(documentEntry("AWSSAA", "ticketburst-launch-day").file, "utf8")) as Record<string, unknown>;
}

function band(patch: Record<string, unknown>, extra: Partial<BandFile> = {}): BandFile {
  return { band: "t", base: { course: "AWSSAA", slug: "ticketburst-launch-day" }, slug: "t-band", label: "T", patch, ...extra };
}

function errors(b: BandFile): string[] {
  return applyBand(baseSource(), b)
    .problems.filter((p) => p.level === "error")
    .map((p) => `${p.path}: ${p.message}`);
}

describe("band lint: patched paths exist", () => {
  test("a typo in an existing object is an error", () => {
    assert.match(errors(band({ outcome: { noProgres: { class: "harm" } } })).join("\n"), /outcome\.noProgres/);
    assert.match(errors(band({ clock: { tik: "1min" } })).join("\n"), /clock\.tik/);
  });
  test("deleting a path the base lacks is an error", () => {
    assert.match(errors(band({ params: { nope: null } })).join("\n"), /deletes a path/);
  });
  test("new ids in id-keyed maps and optional schema fields are allowed", () => {
    assert.deepEqual(errors(band({ params: { extra: { value: 1 } }, random: { streams: ["s"] }, actions: { start: { why: "x" } } })), []);
  });
  test("replacing an object with a scalar is an error", () => {
    assert.match(errors(band({ outcome: { thresholds: 3 } })).join("\n"), /replaces an object/);
  });
  test("the engine, the format and the outcome profile stay the base's", () => {
    const e = errors(band({ engine: { minor: 1 }, outcome: { profile: "project" } })).join("\n");
    assert.match(e, /band\.patch\.engine/);
    assert.match(e, /outcome\.profile/);
  });
  test("append needs an existing array and unique ids, and is not mixed with a replace", () => {
    assert.match(errors(band({}, { append: { "/catalogs/nope/entries": [{ id: "x" }] } })).join("\n"), /does not resolve/);
    assert.match(errors(band({}, { append: { "/clock": [1] } })).join("\n"), /not one/);
    assert.match(errors(band({}, { append: { "/catalogs/components/entries": [{ id: "alb" }] } })).join("\n"), /already in the base/);
    assert.match(errors(band({ sources: [] }, { append: { "/sources": [{ cite: "x", checkedAt: "2026-11-09" }] } })).join("\n"), /append or replace/);
  });
  test("append adds after the base items", () => {
    const r = applyBand(baseSource(), band({}, { append: { "/catalogs/components/entries": [{ id: "zz", name: "Z", cost: 1, slots: ["edge"] }] } }));
    const entries = ((r.source?.catalogs as Record<string, { entries: { id: string }[] }>).components.entries).map((e) => e.id);
    assert.equal(entries[entries.length - 1], "zz");
    assert.equal(entries.length, 16);
  });
});

describe("band lint: no threshold looser than the base", () => {
  const base = loadDocument(documentEntry("AWSSAA", "ticketburst-launch-day"));
  const with_ = (mut: (d: ScenarioDoc) => void): ScenarioDoc => {
    const d = JSON.parse(JSON.stringify(base)) as ScenarioDoc;
    mut(d);
    return d;
  };
  test("tighter passes, looser fails, in each direction", () => {
    assert.deepEqual(thresholdProblems(base, with_((d) => (d.outcome.thresholds.rtoMinutes.value = 10)), band({})), []);
    assert.match(thresholdProblems(base, with_((d) => (d.outcome.thresholds.rtoMinutes.value = 20)), band({}))[0].message, /looser/);
    assert.match(thresholdProblems(base, with_((d) => (d.outcome.thresholds.availabilityTarget.value = 99.5)), band({}))[0].message, /looser/);
  });
  test("a dropped threshold fails", () => {
    assert.match(thresholdProblems(base, with_((d) => delete (d.outcome.thresholds as Record<string, unknown>).rpoMinutes), band({}))[0].message, /drops/);
  });
  test("declared threshold params: budget may only fall", () => {
    const b = band({}, { tighten: { "params.budget": "lower" } });
    assert.deepEqual(thresholdProblems(base, with_((d) => (d.params.budget.value = 2400)), b), []);
    assert.match(thresholdProblems(base, with_((d) => (d.params.budget.value = 2600)), b)[0].message, /looser/);
    assert.match(thresholdProblems(base, base, band({}, { tighten: { "params.nope": "lower" } }))[0].message, /must exist/);
  });
});

describe("the SAP band of the TicketBurst launch day", () => {
  const sap = ALL_DOCUMENTS.find((d) => d.kind === "band" && d.slug === "ticketburst-launch-day-sap")!;
  const saa = ALL_DOCUMENTS.find((d) => d.slug === "ticketburst-launch-day")!;
  test("compiles with no problems and is tighter than the SAA base", () => {
    const c = compileEntry(sap);
    assert.deepEqual(c.problems, []);
    const d = c.doc!;
    assert.ok(d.outcome.thresholds.rpoMinutes.value < c.base!.outcome.thresholds.rpoMinutes.value);
    assert.ok(d.outcome.thresholds.rtoMinutes.value < c.base!.outcome.thresholds.rtoMinutes.value);
    assert.ok((d.params.budget.value as number) < (c.base!.params.budget.value as number));
    for (const ev of ["orgT", "regionT", "migT"]) assert.ok(d.timers[ev], ev);
    assert.ok(d.catalogs!.components.entries.length > c.base!.catalogs!.components.entries.length);
    assert.deepEqual(d.random, { streams: ["azFail"] });
  });
  test("each band is its own document with its own content hash", () => {
    const a = loadDocument(saa);
    const b = loadDocument(sap);
    assert.notEqual(contentHash(a), contentHash(b));
    assert.notEqual(clientHash(a), clientHash(b));
    assert.equal(b.slug, "ticketburst-launch-day-sap");
  });
  test("which AZ fails is not in the learner-facing text before it happens", () => {
    const d = loadDocument(sap);
    assert.doesNotMatch(d.timers.azT.label, /AZ [ab]\b/);
    assert.doesNotMatch(d.timers.azT.wait!.skipLabel, /AZ [ab]\b/);
  });
});
