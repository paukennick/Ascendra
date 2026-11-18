// REQ-334 (health depth, 2026-11-17 evening): golden paths for
// ABPTSPCS/torticollis-visit-hip-clunk. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps pcs-ddh
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "ABPTSPCS", slug: "torticollis-visit-hip-clunk" };

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
        title: "Expert at study pace: neck, observation, Ortolani, refers, teaches swaddling, explains",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          test(c, "neck");
          test(c, "look");
          test(c, "ortolani");
          act(c, "diagnose", { dx: "ddh" });
          act(c, "refer", { how: "ortho" });
          act(c, "hipteach");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateRef",
        title: "Screens and teaches, but refers 8 minutes after the positive test",
        reasoning: "partial",
        drive: (c) => {
          test(c, "neck");
          test(c, "look");
          test(c, "ortolani");
          act(c, "hipteach");
          upTo(c, 130);
          act(c, "diagnose", { dx: "ddh" });
          act(c, "refer", { how: "ortho" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "swaddled",
        title: "Refers promptly but tells her mother straight-leg swaddling is fine",
        reasoning: "partial",
        drive: (c) => {
          test(c, "ortolani");
          act(c, "swaddle");
          act(c, "diagnose", { dx: "ddh" });
          act(c, "refer", { how: "ortho" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "click",
        title: "Failure: calls it a normal click and rechecks next month",
        reasoning: "missed",
        drive: (c) => {
          test(c, "ortolani");
          act(c, "diagnose", { dx: "normal" });
          act(c, "swaddle");
          act(c, "refer", { how: "recheck" });
          toEnd(c);
        },
      },
      {
        id: "neckOnly",
        title: "Failure: treats only the neck",
        reasoning: "missed",
        drive: (c) => {
          act(c, "diagnose", { dx: "tort" });
          act(c, "swaddle");
          toEnd(c);
        },
      },
    ],
  };
}
