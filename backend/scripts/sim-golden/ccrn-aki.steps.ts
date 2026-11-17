// REQ-325 (nursing depth, round 3): golden paths for
// CCRNADULT/low-urine-after-contrast-on-vancomycin. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps ccrn-aki
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "CCRNADULT", slug: "low-urine-after-contrast-on-vancomycin" };

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
        title: "Expert at study pace: catheter and scan, creatinine; NSAID and ACE inhibitor held; pharmacy; prerenal and nephrotoxic AKI; intensivist; bolus; documented",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          test(c, "catheter");
          test(c, "labs");
          act(c, "hold");
          act(c, "pharm");
          act(c, "diagnose", { dx: "aki" });
          act(c, "refer", { how: "icu" });
          upTo(c, 85);
          act(c, "fluid");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateCall",
        title: "Reviews volume and medications first, never checks the catheter or asks pharmacy, and calls 7 minutes after the creatinine",
        reasoning: "partial",
        drive: (c) => {
          test(c, "volume");
          test(c, "mar");
          test(c, "labs");
          act(c, "hold");
          act(c, "diagnose", { dx: "aki" });
          upTo(c, 125);
          act(c, "refer", { how: "icu" });
          upTo(c, 180);
          act(c, "fluid");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "diureticGiven",
        title: "Calls at once but gives the PRN furosemide to make urine before the bolus",
        reasoning: "partial",
        drive: (c) => {
          test(c, "labs");
          test(c, "catheter");
          act(c, "hold");
          act(c, "refer", { how: "icu" });
          act(c, "diuretic");
          act(c, "diagnose", { dx: "aki" });
          upTo(c, 85);
          act(c, "fluid");
          act(c, "pharm");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "makeUrine",
        title: "Failure: reads the creatinine, calls it no AKI, gives furosemide and the ketorolac and leaves it for rounds",
        reasoning: "missed",
        drive: (c) => {
          test(c, "labs");
          act(c, "diagnose", { dx: "none" });
          act(c, "diuretic");
          act(c, "nsaid");
          act(c, "refer", { how: "rounds" });
          toEnd(c);
        },
      },
      {
        id: "blockedCatheter",
        title: "Failure: checks the catheter, calls it obstruction anyway and waits for rounds",
        reasoning: "missed",
        drive: (c) => {
          test(c, "catheter");
          act(c, "diagnose", { dx: "obstruction" });
          act(c, "refer", { how: "rounds" });
          toEnd(c);
        },
      },
    ],
  };
}
