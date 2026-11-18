// REQ-333: golden paths for JAVASCRIPT/js-template-shallow-copy (built from a spec by the round's
// data-case helper; the expectations are the engine's own results).
import type { StepsSpec } from "./steps.ts";
import { record, run } from "./data-helpers.ts";

export const ENTRY = { course: "JAVASCRIPT", slug: "js-template-shallow-copy" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Looks first, the right fix, checks, ships on time", reasoning: "met", drive: (c) => { run(c, "look"); run(c, "change", { f: "clone" }); run(c, "check"); run(c, "ship"); record(c, { cause: "c0", check: "k0" }); } },
      { id: "shipAsIs", title: "Ships as it is without looking", reasoning: "missed", drive: (c) => { run(c, "ship"); record(c, { cause: "c2", check: "k2" }); } },
      { id: "onelevelPartial", title: "Looks, then a weaker fix: Spread the template and also copy the tasks array; checks and ships", reasoning: "partial", drive: (c) => { run(c, "look"); run(c, "change", { f: "onelevel" }); run(c, "check"); run(c, "ship"); record(c, { cause: "c0", check: "k0" }); } },
      { id: "freezeWrong", title: "Looks, then Object.freeze the template, checks, ships", reasoning: "missed", drive: (c) => { run(c, "look"); run(c, "change", { f: "freeze" }); run(c, "check"); run(c, "ship"); record(c, { cause: "c1", check: "k1" }); } },
      { id: "destroy", title: "Takes the data shortcut, then fixes it properly and ships", reasoning: "missed", drive: (c) => { run(c, "destroy"); run(c, "look"); run(c, "change", { f: "clone" }); run(c, "check"); run(c, "ship"); record(c, { cause: "c0", check: "k0" }); } },
      { id: "hold", title: "Looks, checks and holds", reasoning: "partial", drive: (c) => { run(c, "look"); run(c, "check"); record(c, { cause: "c0", check: "k2" }); } },
      { id: "unchecked", title: "Fixes before looking and ships unchecked", reasoning: "partial", drive: (c) => { run(c, "change", { f: "clone" }); run(c, "look"); run(c, "ship"); record(c, { cause: "c0", check: "k1" }); } },
      { id: "late", title: "The right fix, checked, then ships after the deadline", reasoning: "met", drive: (c) => { run(c, "look"); run(c, "change", { f: "clone" }); run(c, "check"); for (let i = 0; i < 6; i++) run(c, "wait"); run(c, "ship"); record(c, { cause: "c0", check: "k0" }); } },
    ],
  };
}
