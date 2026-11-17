// REQ-325 (nursing depth, round 3): golden paths for
// NCLEXRN/digoxin-due-yellow-halos. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps rn-digoxin
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "NCLEXRN", slug: "digoxin-due-yellow-halos" };

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
        title: "Expert at study pace: apical pulse and labs; digoxin held; telemetry; suspected toxicity; provider now; potassium; documented and taught",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          test(c, "apical");
          test(c, "labs");
          act(c, "hold");
          act(c, "tele");
          act(c, "diagnose", { dx: "tox" });
          act(c, "refer", { how: "provider" });
          upTo(c, 80);
          act(c, "k");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateCall",
        title: "Asks about symptoms and reviews the record before the apical pulse; calls 6 minutes after it",
        reasoning: "partial",
        drive: (c) => {
          test(c, "symptoms");
          test(c, "mar");
          test(c, "apical");
          test(c, "labs");
          act(c, "hold");
          act(c, "tele");
          act(c, "diagnose", { dx: "tox" });
          upTo(c, 110);
          act(c, "refer", { how: "provider" });
          upTo(c, 165);
          act(c, "k");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "noMonitor",
        title: "Holds the digoxin and calls at once, but never reads the labs or puts her on telemetry",
        reasoning: "partial",
        drive: (c) => {
          test(c, "apical");
          act(c, "hold");
          act(c, "refer", { how: "provider" });
          act(c, "diagnose", { dx: "tox" });
          upTo(c, 70);
          act(c, "k");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "doseGiven",
        title: "Failure: blames the antibiotic, gives the digoxin with an antiemetic without a pulse, and leaves it for rounds",
        reasoning: "missed",
        drive: (c) => {
          test(c, "symptoms");
          act(c, "diagnose", { dx: "gi" });
          act(c, "dose");
          act(c, "refer", { how: "rounds" });
          toEnd(c);
        },
      },
      {
        id: "usualAf",
        title: "Failure: takes the pulse, calls it her usual atrial fibrillation and moves on",
        reasoning: "missed",
        drive: (c) => {
          test(c, "apical");
          act(c, "diagnose", { dx: "af" });
          toEnd(c);
        },
      },
    ],
  };
}
