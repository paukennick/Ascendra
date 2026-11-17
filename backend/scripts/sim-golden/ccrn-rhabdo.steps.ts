// REQ-325 (nursing depth, round 3): golden paths for
// CCRNADULT/found-on-floor-tea-colored-urine. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps ccrn-rhabdo
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "CCRNADULT", slug: "found-on-floor-tea-colored-urine" };

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
        title: "Expert at study pace: labs and ECG; lungs; fluid titrated; nephrotoxins held; rhabdomyolysis; intensivist; hyperkalemia treated; compartments; documented",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          test(c, "labs");
          test(c, "lungs");
          act(c, "fluid");
          act(c, "hold");
          act(c, "diagnose", { dx: "rhabdo" });
          act(c, "refer", { how: "icu" });
          upTo(c, 80);
          act(c, "kTx");
          test(c, "limbs");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateCall",
        title: "Medications and limbs first, then the labs; calls 6 minutes after the potassium",
        reasoning: "partial",
        drive: (c) => {
          test(c, "meds");
          test(c, "limbs");
          test(c, "labs");
          test(c, "lungs");
          act(c, "fluid");
          act(c, "hold");
          act(c, "diagnose", { dx: "rhabdo" });
          upTo(c, 110);
          act(c, "refer", { how: "icu" });
          upTo(c, 165);
          act(c, "kTx");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "ketorolac",
        title: "Calls at once and titrates fluid without checking his lungs, then gives the ketorolac for his pain",
        reasoning: "partial",
        drive: (c) => {
          test(c, "labs");
          act(c, "refer", { how: "icu" });
          act(c, "fluid");
          act(c, "nsaid");
          act(c, "diagnose", { dx: "rhabdo" });
          upTo(c, 70);
          act(c, "kTx");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "uti",
        title: "Failure: reads the dipstick as a UTI, gives ketorolac and leaves the labs for rounds",
        reasoning: "missed",
        drive: (c) => {
          test(c, "labs");
          act(c, "diagnose", { dx: "uti" });
          act(c, "nsaid");
          act(c, "refer", { how: "later" });
          toEnd(c);
        },
      },
      {
        id: "dehydration",
        title: "Failure: reviews his medications, calls it dehydration and lets the next bag wait",
        reasoning: "missed",
        drive: (c) => {
          test(c, "meds");
          act(c, "diagnose", { dx: "dehydration" });
          toEnd(c);
        },
      },
    ],
  };
}
