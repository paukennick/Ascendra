// REQ-334 (health depth, 2026-11-17 evening): golden paths for
// ABPTSCCS/eighteen-meters-better-letter. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps ccs-mcid
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "ABPTSCCS", slug: "eighteen-meters-better-letter" };

const ended = (c: Ctl): boolean => c.run.state.ended !== null;
const upTo = (c: Ctl, tick: number): void => until(c, (x) => x.run.state.tick >= tick || ended(x));
const toEnd = (c: Ctl): void => until(c, (x) => ended(x), 20000);
function act(c: Ctl, a: string, p?: Record<string, string>): void {
  if (ended(c)) return;
  c.act(a, p);
  c.answer();
  teach(c);
}
function test(c: Ctl, a: string): void {
  act(c, a);
  until(c, (x) => x.value("testPending") === false || ended(x));
}

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Expert at study pace: saturation, eases off, compares, reports accurately, conditions and gains, documents",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          test(c, "sat");
          act(c, "rest");
          test(c, "dist");
          act(c, "diagnose", { dx: "no" });
          act(c, "refer", { how: "honest" });
          test(c, "cond");
          test(c, "goals");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateCall",
        title: "Safe and right, but reports 8 minutes after the comparison",
        reasoning: "partial",
        drive: (c) => {
          test(c, "sat");
          act(c, "rest");
          test(c, "dist");
          test(c, "cond");
          test(c, "goals");
          upTo(c, 130);
          act(c, "diagnose", { dx: "no" });
          act(c, "refer", { how: "honest" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "noCompare",
        title: "Eases her off and reports, without comparing to the threshold",
        reasoning: "partial",
        drive: (c) => {
          test(c, "sat");
          act(c, "rest");
          test(c, "goals");
          act(c, "diagnose", { dx: "no" });
          act(c, "refer", { how: "honest" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "pushed",
        title: "Failure: any increase counts; pushes her through the interval",
        reasoning: "missed",
        drive: (c) => {
          act(c, "diagnose", { dx: "yes" });
          act(c, "push");
          act(c, "refer", { how: "sign" });
          toEnd(c);
        },
      },
      {
        id: "percent",
        title: "Failure: compares, reads it by percent, signs and pushes",
        reasoning: "missed",
        drive: (c) => {
          test(c, "dist");
          act(c, "diagnose", { dx: "pct" });
          act(c, "refer", { how: "sign" });
          act(c, "push");
          toEnd(c);
        },
      },
    ],
  };
}
