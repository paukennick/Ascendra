// REQ-296 (clinical coverage): golden paths for CCRNADULT/status-epilepticus-after-craniotomy.
// No prototype exists, so the expectations are the engine's own results,
// re-checked by every `npm test` (lint + documents).
//
//   npm run sim:golden -- steps ccrn-se
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "CCRNADULT", slug: "status-epilepticus-after-craniotomy" };

const SE = { say: "se" };
const ended = (c: Ctl): boolean => c.run.state.ended !== null;
const upTo = (c: Ctl, tick: number): void => until(c, (x) => x.run.state.tick >= tick || ended(x));
const toEnd = (c: Ctl): void => until(c, (x) => ended(x), 20000);
function act(c: Ctl, a: string, p?: Record<string, string>): void {
  if (ended(c)) return;
  c.act(a, p);
  teach(c);
}
function glucose(c: Ctl): void {
  act(c, "glucose");
  until(c, (x) => x.value("gluPending") === false || ended(x));
}
const onset = (c: Ctl): void => until(c, (x) => x.value("seizing") === true || ended(x));
const stopped = (c: Ctl): void => until(c, (x) => x.value("stopAt") !== null || ended(x));

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Expert at study pace: timed, side-lying, suction, non-rebreather, glucose; lorazepam 4 mg at 5 minutes, early call, levetiracetam load, one repeat dose, EEG",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          onset(c);
          act(c, "time");
          act(c, "side");
          act(c, "suction");
          act(c, "oxygen");
          glucose(c);
          upTo(c, 60 + 300);
          act(c, "lorazepam", { mg: "4" });
          act(c, "call", SE);
          act(c, "levetiracetam");
          upTo(c, 60 + 600);
          act(c, "lorazepam", { mg: "4" });
          stopped(c);
          act(c, "eeg");
          toEnd(c);
        },
      },
      {
        id: "smallDose",
        title: "Airway right, but 2 mg lorazepam twice and a call at 21 minutes; the load is late",
        reasoning: "partial",
        drive: (c) => {
          onset(c);
          act(c, "time");
          act(c, "side");
          act(c, "oxygen");
          upTo(c, 60 + 360);
          act(c, "lorazepam", { mg: "2" });
          upTo(c, 60 + 700);
          act(c, "lorazepam", { mg: "2" });
          upTo(c, 60 + 1260);
          act(c, "call", SE);
          act(c, "levetiracetam");
          stopped(c);
          glucose(c);
          toEnd(c);
        },
      },
      {
        id: "biteBlock",
        title: "Benzodiazepine and load on time, but a bite block and late positioning",
        reasoning: "partial",
        drive: (c) => {
          onset(c);
          act(c, "biteBlock");
          glucose(c);
          upTo(c, 60 + 300);
          act(c, "lorazepam", { mg: "4" });
          act(c, "call", SE);
          act(c, "levetiracetam");
          act(c, "side");
          act(c, "oxygen");
          act(c, "time");
          stopped(c);
          act(c, "eeg");
          toEnd(c);
        },
      },
      {
        id: "benzoOnly",
        title: "Failure: protects the airway and keeps giving lorazepam, calls only to say 'call back'; refractory",
        reasoning: "missed",
        drive: (c) => {
          onset(c);
          act(c, "time");
          act(c, "side");
          act(c, "oxygen");
          upTo(c, 60 + 300);
          act(c, "lorazepam", { mg: "4" });
          act(c, "call", { say: "fyi" });
          upTo(c, 60 + 600);
          act(c, "lorazepam", { mg: "4" });
          upTo(c, 60 + 900);
          act(c, "lorazepam", { mg: "4" });
          act(c, "airway");
          toEnd(c);
        },
      },
      {
        id: "restrained",
        title: "Failure: holds him down and waits for the glucose, no oxygen; he desaturates",
        reasoning: "missed",
        drive: (c) => {
          onset(c);
          act(c, "restrain");
          glucose(c);
          toEnd(c);
        },
      },
    ],
  };
}
