// REQ-326 (sims-health-4, docs/sims.md 22.34): golden paths for
// PCCN/chest-tube-on-the-floor. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps pccn-chesttube
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "PCCN", slug: "chest-tube-on-the-floor" };

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
        title: "Expert at study pace: three-sided dressing, back to bed on oxygen, breathing assessed, reassess; provider now; hand-off",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          act(c, "bed");
          test(c, "resp");
          act(c, "reassess");
          untilRed(c);
          act(c, "fix");
          act(c, "diagnose", { dx: "out" });
          act(c, "refer", { how: "now" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateCall",
        title: "Dresses the site at once, but notifies the provider more than 5 minutes later",
        reasoning: "partial",
        drive: (c) => {
          act(c, "bed");
          test(c, "resp");
          act(c, "reassess");
          untilRed(c);
          act(c, "fix");
          upTo(c, c.run.state.tick + 78);
          act(c, "diagnose", { dx: "out" });
          act(c, "refer", { how: "now" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "wrongRoute",
        title: "Failure: dresses the site and checks breathing, then calls it non-urgent and leaves it for the round",
        reasoning: "missed",
        drive: (c) => {
          test(c, "resp");
          untilRed(c);
          act(c, "fix");
          act(c, "diagnose", { dx: "fine" });
          act(c, "refer", { how: "round" });
          toEnd(c);
        },
      },
      {
        id: "unsafe",
        title: "Failure: looks at the site, then pushes the tube back in",
        reasoning: "missed",
        drive: (c) => {
          test(c, "site");
          act(c, "unsafe");
          toEnd(c);
        },
      },
      {
        id: "noAction",
        title: "Failure: looks at the site, asks about pain and checks breathing, treats the pain; no dressing and no call",
        reasoning: "missed",
        drive: (c) => {
          test(c, "site");
          test(c, "hx");
          test(c, "resp");
          act(c, "diagnose", { dx: "pain" });
          toEnd(c);
        },
      },
    ],
  };
}
