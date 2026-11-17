// REQ-323 (health breadth): golden paths for
// ABPTSPCS/knee-pain-limp-hip-slip. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps pcs-scfe
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "ABPTSPCS", slug: "knee-pain-limp-hip-slip" };

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
        title: "Expert at study pace: history, a normal knee, the hip exam, crutches, BMI percentile; suspected slip; emergency department today; pediatrician told",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          test(c, "hx");
          test(c, "knee");
          test(c, "hip");
          act(c, "crutches");
          test(c, "growth");
          act(c, "diagnose", { dx: "scfe" });
          act(c, "refer", { how: "ed" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "xraysThisWeek",
        title: "Finds the hip signs and fits crutches, but leaves the X-rays to the pediatrician later in the week",
        reasoning: "partial",
        drive: (c) => {
          test(c, "knee");
          test(c, "hip");
          test(c, "gait");
          act(c, "crutches");
          act(c, "diagnose", { dx: "scfe" });
          act(c, "refer", { how: "pcp" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "loadedFirst",
        title: "Starts squats and step-ups before examining, then finds the hip and sends him the same day",
        reasoning: "partial",
        drive: (c) => {
          test(c, "hx");
          act(c, "squat");
          test(c, "knee");
          test(c, "hip");
          act(c, "crutches");
          test(c, "growth");
          act(c, "diagnose", { dx: "scfe" });
          act(c, "refer", { how: "ed" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateDecision",
        title: "A careful exam that reaches the hip, but the emergency department decision comes more than 15 minutes after the normal knee",
        reasoning: "partial",
        drive: (c) => {
          test(c, "knee");
          test(c, "hx");
          test(c, "gait");
          test(c, "growth");
          upTo(c, 220);
          test(c, "hip");
          act(c, "diagnose", { dx: "scfe" });
          act(c, "refer", { how: "ed" });
          toEnd(c);
        },
      },
      {
        id: "hopTest",
        title: "Failure: a single-leg hop test on the painful leg",
        reasoning: "missed",
        drive: (c) => {
          test(c, "knee");
          act(c, "hop");
          toEnd(c);
        },
      },
      {
        id: "homeProgram",
        title: "Failure: a normal knee, patellofemoral pain recorded anyway, a knee home program",
        reasoning: "missed",
        drive: (c) => {
          test(c, "hx");
          test(c, "knee");
          act(c, "diagnose", { dx: "pfp" });
          act(c, "refer", { how: "home" });
          toEnd(c);
        },
      },
    ],
  };
}
