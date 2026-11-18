// REQ-334 (health depth, 2026-11-17 evening): golden paths for
// ABPTSECS/proximal-weakness-on-statin-cola-urine. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps ecs-myopathy
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "ABPTSECS", slug: "proximal-weakness-on-statin-cola-urine" };

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
        title: "Expert at study pace: history, calls, conductions, needle study, reports",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          test(c, "hx");
          act(c, "diagnose", { dx: "myo" });
          act(c, "refer", { how: "md" });
          test(c, "ncs");
          test(c, "emg");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateCall",
        title: "Completes the study first and calls 8 minutes after the history",
        reasoning: "partial",
        drive: (c) => {
          test(c, "hx");
          test(c, "ncs");
          test(c, "emg");
          upTo(c, 130);
          act(c, "diagnose", { dx: "myo" });
          act(c, "refer", { how: "md" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "exFirst",
        title: "Starts the strengthening program, then calls",
        reasoning: "partial",
        drive: (c) => {
          test(c, "hx");
          act(c, "ex");
          act(c, "diagnose", { dx: "myo" });
          act(c, "refer", { how: "md" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "neuro",
        title: "Failure: reads a neuropathy and sends the usual report",
        reasoning: "missed",
        drive: (c) => {
          act(c, "diagnose", { dx: "neuro" });
          act(c, "refer", { how: "report" });
          toEnd(c);
        },
      },
      {
        id: "decond",
        title: "Failure: calls it deconditioning and strengthens him",
        reasoning: "missed",
        drive: (c) => {
          act(c, "diagnose", { dx: "decond" });
          act(c, "ex");
          toEnd(c);
        },
      },
    ],
  };
}
