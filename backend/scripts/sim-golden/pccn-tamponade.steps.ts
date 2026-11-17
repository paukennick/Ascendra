// REQ-323 (health depth, round 2): golden paths for
// PCCN/pacing-wires-pulled-then-restless. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps pccn-tamponade
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "PCCN", slug: "pacing-wires-pulled-then-restless" };

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
        title: "Expert at study pace: neck veins, heart sounds, lungs; pulsus paradoxus; rapid response and the surgeon; a bolus; furosemide held; SBAR",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          test(c, "neck");
          test(c, "paradox");
          act(c, "diagnose", { dx: "tamp" });
          act(c, "refer", { how: "rrt" });
          act(c, "fluid");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateCall",
        title: "History and ECG first, then the triad and pulsus; the call comes 6 minutes after the first sign",
        reasoning: "partial",
        drive: (c) => {
          test(c, "hx");
          test(c, "ecg");
          test(c, "neck");
          test(c, "paradox");
          act(c, "diagnose", { dx: "tamp" });
          upTo(c, 110);
          act(c, "refer", { how: "rrt" });
          act(c, "fluid");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "noPulsus",
        title: "Hears the muffled heart sounds and calls at once, but never measures pulsus paradoxus",
        reasoning: "partial",
        drive: (c) => {
          test(c, "neck");
          act(c, "refer", { how: "rrt" });
          act(c, "fluid");
          act(c, "diagnose", { dx: "tamp" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "furosemide",
        title: "Failure: reads the neck veins as fluid overload, pages the hospitalist and gives the furosemide",
        reasoning: "missed",
        drive: (c) => {
          test(c, "neck");
          act(c, "diagnose", { dx: "chf" });
          act(c, "refer", { how: "hosp" });
          act(c, "lasix");
          toEnd(c);
        },
      },
      {
        id: "anxiety",
        title: "Failure: a chat and a reassurance; calls it anxiety",
        reasoning: "missed",
        drive: (c) => {
          test(c, "hx");
          act(c, "diagnose", { dx: "anx" });
          toEnd(c);
        },
      },
    ],
  };
}
