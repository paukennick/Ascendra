// REQ-335: golden paths for PL300/merge-duplicates-double-region-revenue (built from a spec by the round's
// data-case helper; the expectations are the engine's own results).
import type { StepsSpec } from "./steps.ts";
import { record, run } from "./data-helpers.ts";

export const ENTRY = { course: "PL300", slug: "merge-duplicates-double-region-revenue" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Looks first, the right fix, checks, ships on time", reasoning: "met", drive: (c) => { run(c, "look"); run(c, "change", { f: "active" }); run(c, "check"); run(c, "ship"); record(c, { cause: "c0", check: "k0" }); } },
      { id: "shipAsIs", title: "Ships as it is without looking", reasoning: "missed", drive: (c) => { run(c, "ship"); record(c, { cause: "c2", check: "k2" }); } },
      { id: "distinctPartial", title: "Looks, then a weaker fix: Remove duplicates on StoreID only; checks and ships", reasoning: "partial", drive: (c) => { run(c, "look"); run(c, "change", { f: "distinct" }); run(c, "check"); run(c, "ship"); record(c, { cause: "c0", check: "k0" }); } },
      { id: "innerWrong", title: "Looks, then Change the join to Inner, checks, ships", reasoning: "missed", drive: (c) => { run(c, "look"); run(c, "change", { f: "inner" }); run(c, "check"); run(c, "ship"); record(c, { cause: "c1", check: "k1" }); } },
      { id: "destroy", title: "Takes the data shortcut, then fixes it properly and ships", reasoning: "missed", drive: (c) => { run(c, "destroy"); run(c, "look"); run(c, "change", { f: "active" }); run(c, "check"); run(c, "ship"); record(c, { cause: "c0", check: "k0" }); } },
      { id: "hold", title: "Looks, checks and holds", reasoning: "partial", drive: (c) => { run(c, "look"); run(c, "check"); record(c, { cause: "c0", check: "k2" }); } },
      { id: "unchecked", title: "Fixes before looking and ships unchecked", reasoning: "partial", drive: (c) => { run(c, "change", { f: "active" }); run(c, "look"); run(c, "ship"); record(c, { cause: "c0", check: "k1" }); } },
      { id: "late", title: "The right fix, checked, then ships after the deadline", reasoning: "met", drive: (c) => { run(c, "look"); run(c, "change", { f: "active" }); run(c, "check"); for (let i = 0; i < 6; i++) run(c, "wait"); run(c, "ship"); record(c, { cause: "c0", check: "k0" }); } },
    ],
  };
}
