// REQ-323 (health breadth): golden paths for
// ABPTSECS/carpal-tunnel-referral-demyelinating-gbs. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps ecs-gbs
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "ABPTSECS", slug: "carpal-tunnel-referral-demyelinating-gbs" };

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
        title: "Expert at study pace: history, strength and reflexes, single breath count, brief motor studies; suspected Guillain-Barre syndrome; 911; physician told",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          test(c, "hx");
          test(c, "exam");
          test(c, "sbc");
          test(c, "ncs");
          act(c, "diagnose", { dx: "aidp" });
          act(c, "refer", { how: "ed" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "fullStudy",
        title: "Completes a full needle EMG before checking breathing and calling 911",
        reasoning: "partial",
        drive: (c) => {
          test(c, "hx");
          test(c, "ncs");
          test(c, "emg");
          test(c, "sbc");
          act(c, "diagnose", { dx: "aidp" });
          act(c, "refer", { how: "ed" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "noBreathCheck",
        title: "Reads the studies correctly and calls 911, but never checks her breathing",
        reasoning: "partial",
        drive: (c) => {
          test(c, "hx");
          test(c, "exam");
          test(c, "ncs");
          act(c, "diagnose", { dx: "aidp" });
          act(c, "refer", { how: "ed" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "routineNeurology",
        title: "Failure: a correct pattern, but a routine neurology referral and home",
        reasoning: "missed",
        drive: (c) => {
          test(c, "hx");
          test(c, "ncs");
          act(c, "diagnose", { dx: "aidp" });
          act(c, "refer", { how: "neuro" });
          toEnd(c);
        },
      },
      {
        id: "asReferred",
        title: "Failure: straight to the studies, reported as bilateral carpal tunnel syndrome, splints and home",
        reasoning: "missed",
        drive: (c) => {
          test(c, "ncs");
          act(c, "diagnose", { dx: "cts" });
          act(c, "refer", { how: "home" });
          toEnd(c);
        },
      },
      {
        id: "studyOnly",
        title: "Failure: a full study, a chronic axonal impression and no decision",
        reasoning: "missed",
        drive: (c) => {
          test(c, "hx");
          test(c, "emg");
          act(c, "diagnose", { dx: "axonal" });
          toEnd(c);
        },
      },
    ],
  };
}
