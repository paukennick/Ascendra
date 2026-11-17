// REQ-326 (sims-health-4, docs/sims.md 22.34): golden paths for
// CMSRN/bedside-debridement-sedation-quiet-capnograph. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps cmsrn-sed
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "CMSRN", slug: "bedside-debridement-sedation-quiet-capnograph" };

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
        title: "Expert at study pace: capnography, oximetry, oxygen, airway ready, sedation level, reassess; at the flat waveform stop and call; hand-off",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          act(c, "fix");
          act(c, "airway2");
          test(c, "rass");
          act(c, "reassess");
          untilRed(c);
          act(c, "diagnose", { dx: "deep" });
          act(c, "refer", { how: "stop" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateCall",
        title: "Monitors well and sees the flat waveform, but acts more than 5 minutes later",
        reasoning: "partial",
        drive: (c) => {
          act(c, "fix");
          act(c, "airway2");
          test(c, "rass");
          act(c, "reassess");
          untilRed(c);
          upTo(c, c.run.state.tick + 78);
          act(c, "diagnose", { dx: "deep" });
          act(c, "refer", { how: "stop" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "wrongRoute",
        title: "Failure: monitors and checks the level, then reads deep sedation as sleep and lets the surgeon finish",
        reasoning: "missed",
        drive: (c) => {
          act(c, "fix");
          test(c, "rass");
          untilRed(c);
          act(c, "diagnose", { dx: "asleep" });
          act(c, "refer", { how: "finish" });
          toEnd(c);
        },
      },
      {
        id: "unsafe",
        title: "Failure: checks the airway, then gives another increment",
        reasoning: "missed",
        drive: (c) => {
          test(c, "airway");
          act(c, "unsafe");
          toEnd(c);
        },
      },
      {
        id: "noAction",
        title: "Failure: airway, chart and sedation level, blames the monitor; no capnography and no call",
        reasoning: "missed",
        drive: (c) => {
          test(c, "airway");
          test(c, "hx");
          test(c, "rass");
          act(c, "diagnose", { dx: "artifact" });
          toEnd(c);
        },
      },
    ],
  };
}
