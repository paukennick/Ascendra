// REQ-323 (health depth, round 2): golden paths for
// NCLEXPN/ltc-critical-potassium-call. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps pn-potassium
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "NCLEXPN", slug: "ltc-critical-potassium-call" };

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
        title: "Expert at study pace: read-back, apical pulse, symptoms; potassium chloride held; RN and provider now, 911; hand-off",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          test(c, "readback");
          test(c, "pulse");
          test(c, "symptoms");
          act(c, "hold");
          act(c, "diagnose", { dx: "high" });
          act(c, "refer", { how: "report" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateReport",
        title: "Reviews the record and symptoms first, then reads back and checks the pulse; reports 7 minutes after the read-back",
        reasoning: "partial",
        drive: (c) => {
          test(c, "mar");
          test(c, "symptoms");
          test(c, "readback");
          test(c, "pulse");
          act(c, "hold");
          act(c, "diagnose", { dx: "high" });
          upTo(c, 125);
          act(c, "refer", { how: "report" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "noPulse",
        title: "Reads back, holds the potassium and reports at once, but never checks his pulse",
        reasoning: "partial",
        drive: (c) => {
          test(c, "readback");
          act(c, "hold");
          act(c, "refer", { how: "report" });
          act(c, "diagnose", { dx: "high" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "assumeHemolysis",
        title: "Failure: assumes a hemolyzed sample, gives the morning medications with the potassium and books a redraw",
        reasoning: "missed",
        drive: (c) => {
          test(c, "readback");
          act(c, "diagnose", { dx: "hemolyzed" });
          act(c, "kcl");
          act(c, "refer", { how: "redraw" });
          toEnd(c);
        },
      },
      {
        id: "forRounds",
        title: "Failure: reviews the medications, calls it mildly high and leaves it for rounds",
        reasoning: "missed",
        drive: (c) => {
          test(c, "mar");
          act(c, "diagnose", { dx: "mild" });
          toEnd(c);
        },
      },
    ],
  };
}
