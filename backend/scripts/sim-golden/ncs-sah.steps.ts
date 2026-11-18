// REQ-334 (health depth, 2026-11-17 evening): golden paths for
// ABPTSNCS/gait-session-worst-headache-ever. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps ncs-sah
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "ABPTSNCS", slug: "gait-session-worst-headache-ever" };

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
        title: "Expert at study pace: asks, stops, calls 911, neuro check and pressure, tells the neurologist",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          test(c, "hx");
          act(c, "stop");
          act(c, "diagnose", { dx: "sah" });
          act(c, "refer", { how: "ems" });
          test(c, "neuro");
          test(c, "vitals");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateCall",
        title: "Stops and checks, but calls 911 6 minutes after the headache",
        reasoning: "partial",
        drive: (c) => {
          test(c, "hx");
          act(c, "stop");
          test(c, "neuro");
          test(c, "vitals");
          upTo(c, 85);
          act(c, "diagnose", { dx: "sah" });
          act(c, "refer", { how: "ems" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "rested",
        title: "Sends her to rest in the waiting room, then calls 911",
        reasoning: "partial",
        drive: (c) => {
          test(c, "hx");
          act(c, "home");
          act(c, "diagnose", { dx: "sah" });
          act(c, "refer", { how: "ems" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "tension",
        title: "Failure: calls it a tension headache, moves to the treadmill, leaves a message",
        reasoning: "missed",
        drive: (c) => {
          test(c, "hx");
          act(c, "diagnose", { dx: "tension" });
          act(c, "tread");
          act(c, "refer", { how: "neuro" });
          toEnd(c);
        },
      },
      {
        id: "migraine",
        title: "Failure: calls it a migraine and sends her to rest",
        reasoning: "missed",
        drive: (c) => {
          act(c, "diagnose", { dx: "migraine" });
          act(c, "home");
          toEnd(c);
        },
      },
    ],
  };
}
