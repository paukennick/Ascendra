// REQ-334 (health depth, 2026-11-17 evening): golden paths for
// ABPTSPWCS/second-trimester-dizzy-on-her-back. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps pwcs-pregex
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "ABPTSPWCS", slug: "second-trimester-dizzy-on-her-back" };

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
        title: "Expert at study pace: history, supine reaction, left side, reports, talk test, safe plan, warning signs",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          test(c, "hx");
          test(c, "supine");
          act(c, "side");
          act(c, "diagnose", { dx: "supine" });
          act(c, "refer", { how: "ob" });
          test(c, "talk");
          act(c, "plan");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateReport",
        title: "Repositions at once and plans well, but messages her provider 8 minutes later",
        reasoning: "partial",
        drive: (c) => {
          test(c, "hx");
          test(c, "supine");
          act(c, "side");
          test(c, "talk");
          act(c, "plan");
          upTo(c, 120);
          act(c, "diagnose", { dx: "supine" });
          act(c, "refer", { how: "ob" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "hiit",
        title: "Repositions and reports, but gives a high-intensity plan with box jumps",
        reasoning: "partial",
        drive: (c) => {
          test(c, "supine");
          act(c, "side");
          act(c, "diagnose", { dx: "supine" });
          act(c, "refer", { how: "ob" });
          act(c, "hiit");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "pushed",
        title: "Failure: blames her fitness and keeps her going flat",
        reasoning: "missed",
        drive: (c) => {
          test(c, "supine");
          act(c, "diagnose", { dx: "unfit" });
          act(c, "continueEx");
          act(c, "refer", { how: "none" });
          toEnd(c);
        },
      },
      {
        id: "sugar",
        title: "Failure: blames her blood sugar and leaves her flat",
        reasoning: "missed",
        drive: (c) => {
          test(c, "supine");
          act(c, "diagnose", { dx: "hungry" });
          toEnd(c);
        },
      },
    ],
  };
}
