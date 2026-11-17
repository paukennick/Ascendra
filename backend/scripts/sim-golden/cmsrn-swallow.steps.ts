// REQ-326 (sims-health-4, docs/sims.md 22.34): golden paths for
// CMSRN/stroke-day-one-coffee-and-pills. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps cmsrn-swallow
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "CMSRN", slug: "stroke-day-one-coffee-and-pills" };

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
// Wait for the red flag (0.5 on the authored course), then reassess to find it.
function untilRed(c: Ctl): void {
  until(c, (x) => (x.value("prog") as number) >= 0.5 || ended(x));
  act(c, "reassess");
}

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Expert at study pace: upright, nothing by mouth, suction, swallow screen, reassess; the provider and speech-language pathologist now; hand-off",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          act(c, "fix");
          act(c, "suction");
          test(c, "screen");
          act(c, "reassess");
          act(c, "reassess");
          act(c, "diagnose", { dx: "dysphagia" });
          act(c, "refer", { how: "slp" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateCall",
        title: "Screens well and protects him, but tells the team more than 5 minutes later",
        reasoning: "partial",
        drive: (c) => {
          act(c, "fix");
          act(c, "suction");
          test(c, "screen");
          act(c, "reassess");
          act(c, "reassess");
          upTo(c, c.run.state.tick + 78);
          act(c, "diagnose", { dx: "dysphagia" });
          act(c, "refer", { how: "slp" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "wrongRoute",
        title: "Failure: screens him, then reads the cough as normal and lets his daughter feed him",
        reasoning: "missed",
        drive: (c) => {
          act(c, "fix");
          test(c, "screen");
          act(c, "reassess");
          act(c, "diagnose", { dx: "ok" });
          act(c, "refer", { how: "family" });
          toEnd(c);
        },
      },
      {
        id: "unsafe",
        title: "Failure: looks at his mouth, then gives the pills with coffee",
        reasoning: "missed",
        drive: (c) => {
          test(c, "mouth");
          act(c, "unsafe");
          toEnd(c);
        },
      },
      {
        id: "noAction",
        title: "Failure: mouth, history and screen, calls it a cold; not kept upright and no one told",
        reasoning: "missed",
        drive: (c) => {
          test(c, "mouth");
          test(c, "hx");
          test(c, "screen");
          act(c, "diagnose", { dx: "cold" });
          toEnd(c);
        },
      },
    ],
  };
}
