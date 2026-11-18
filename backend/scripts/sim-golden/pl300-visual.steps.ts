// REQ-335: golden paths for PL300/return-rate-trend-on-a-pie-chart (built from a spec by the round's
// data-case helper; the expectations are the engine's own results).
import type { StepsSpec } from "./steps.ts";
import { record, run } from "./data-helpers.ts";

export const ENTRY = { course: "PL300", slug: "return-rate-trend-on-a-pie-chart" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Looks first, the right fix, checks, ships on time", reasoning: "met", drive: (c) => { run(c, "look"); run(c, "change", { f: "line" }); run(c, "check"); run(c, "ship"); record(c, { cause: "c0", check: "k0" }); } },
      { id: "shipAsIs", title: "Ships as it is without looking", reasoning: "missed", drive: (c) => { run(c, "ship"); record(c, { cause: "c2", check: "k2" }); } },
      { id: "columnsPartial", title: "Looks, then a weaker fix: The same measure on a clustered column chart by month and region; checks and ships", reasoning: "partial", drive: (c) => { run(c, "look"); run(c, "change", { f: "columns" }); run(c, "check"); run(c, "ship"); record(c, { cause: "c0", check: "k0" }); } },
      { id: "sumlineWrong", title: "Looks, then A line chart by month of Sum of ReturnRate by region, checks, ships", reasoning: "missed", drive: (c) => { run(c, "look"); run(c, "change", { f: "sumline" }); run(c, "check"); run(c, "ship"); record(c, { cause: "c1", check: "k1" }); } },

      { id: "hold", title: "Looks, checks and holds", reasoning: "partial", drive: (c) => { run(c, "look"); run(c, "check"); record(c, { cause: "c0", check: "k2" }); } },
      { id: "unchecked", title: "Fixes before looking and ships unchecked", reasoning: "partial", drive: (c) => { run(c, "change", { f: "line" }); run(c, "look"); run(c, "ship"); record(c, { cause: "c0", check: "k1" }); } },
      { id: "late", title: "The right fix, checked, then ships after the deadline", reasoning: "met", drive: (c) => { run(c, "look"); run(c, "change", { f: "line" }); run(c, "check"); for (let i = 0; i < 6; i++) run(c, "wait"); run(c, "ship"); record(c, { cause: "c0", check: "k0" }); } },
    ],
  };
}
