// REQ-334 (health depth, 2026-11-17 evening): golden paths for
// LPNVN/iv-arm-cool-and-swollen. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps lpn-iv
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "LPNVN", slug: "iv-arm-cool-and-swollen" };

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
        title: "Expert at study pace: site, stop, remove, elevate, report, circulation and pain, document",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          test(c, "site");
          act(c, "stop");
          act(c, "remove");
          act(c, "elevate");
          act(c, "diagnose", { dx: "infil" });
          act(c, "refer", { how: "rn" });
          test(c, "pulse");
          test(c, "pain");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateReport",
        title: "Stops and removes at once, but checks everything before reporting 8 minutes later",
        reasoning: "partial",
        drive: (c) => {
          test(c, "site");
          act(c, "stop");
          act(c, "remove");
          act(c, "elevate");
          test(c, "flow");
          test(c, "pulse");
          test(c, "pain");
          upTo(c, 120);
          act(c, "diagnose", { dx: "infil" });
          act(c, "refer", { how: "rn" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "flushed",
        title: "Reports promptly but flushes the line first and never removes the catheter",
        reasoning: "partial",
        drive: (c) => {
          test(c, "site");
          act(c, "flush");
          act(c, "stop");
          act(c, "diagnose", { dx: "infil" });
          act(c, "refer", { how: "rn" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "occlusion",
        title: "Failure: reads it as an occlusion, flushes and restarts the pump, reports at 14:00",
        reasoning: "missed",
        drive: (c) => {
          test(c, "flow");
          act(c, "diagnose", { dx: "occl" });
          act(c, "flush");
          act(c, "restart");
          act(c, "refer", { how: "later" });
          toEnd(c);
        },
      },
      {
        id: "phleb",
        title: "Failure: calls it phlebitis and restarts the pump",
        reasoning: "missed",
        drive: (c) => {
          act(c, "diagnose", { dx: "phleb" });
          act(c, "restart");
          toEnd(c);
        },
      },
    ],
  };
}
