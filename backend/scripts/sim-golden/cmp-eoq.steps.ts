// REQ-333: golden paths for CMPCBS/cmpcbs-order-quantity-derivative (built from a spec by the round's
// data-case helper; the expectations are the engine's own results).
import type { StepsSpec } from "./steps.ts";
import { record, run } from "./data-helpers.ts";

export const ENTRY = { course: "CMPCBS", slug: "cmpcbs-order-quantity-derivative" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Looks first, the right fix, checks, ships on time", reasoning: "met", drive: (c) => { run(c, "look"); run(c, "change", { f: "deriv" }); run(c, "check"); run(c, "ship"); record(c, { cause: "c0", check: "k0" }); } },
      { id: "shipAsIs", title: "Ships as it is without looking", reasoning: "missed", drive: (c) => { run(c, "ship"); record(c, { cause: "c2", check: "k2" }); } },
      { id: "gridPartial", title: "Looks, then a weaker fix: Try a few sizes in the sheet and pick the cheapest tried (1,000); checks and ships", reasoning: "partial", drive: (c) => { run(c, "look"); run(c, "change", { f: "grid" }); run(c, "check"); run(c, "ship"); record(c, { cause: "c0", check: "k0" }); } },
      { id: "halfWrong", title: "Looks, then Use sqrt(D S / H), dropping the factor 2, checks, ships", reasoning: "missed", drive: (c) => { run(c, "look"); run(c, "change", { f: "half" }); run(c, "check"); run(c, "ship"); record(c, { cause: "c1", check: "k1" }); } },

      { id: "hold", title: "Looks, checks and holds", reasoning: "partial", drive: (c) => { run(c, "look"); run(c, "check"); record(c, { cause: "c0", check: "k2" }); } },
      { id: "unchecked", title: "Fixes before looking and ships unchecked", reasoning: "partial", drive: (c) => { run(c, "change", { f: "deriv" }); run(c, "look"); run(c, "ship"); record(c, { cause: "c0", check: "k1" }); } },
      { id: "late", title: "The right fix, checked, then ships after the deadline", reasoning: "met", drive: (c) => { run(c, "look"); run(c, "change", { f: "deriv" }); run(c, "check"); for (let i = 0; i < 6; i++) run(c, "wait"); run(c, "ship"); record(c, { cause: "c0", check: "k0" }); } },
    ],
  };
}
