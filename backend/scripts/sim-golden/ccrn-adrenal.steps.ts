// REQ-325 (nursing depth, round 3): golden paths for
// CCRNADULT/pressor-climbing-home-prednisone-missed. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps ccrn-adrenal
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "CCRNADULT", slug: "pressor-climbing-home-prednisone-missed" };

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
        title: "Expert at study pace: glucose treated; omitted prednisone found; adrenal crisis; intensivist now; cortisol drawn, hydrocortisone at once; documented",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          test(c, "glucose");
          act(c, "dex");
          test(c, "meds");
          act(c, "diagnose", { dx: "adrenal" });
          act(c, "refer", { how: "icu" });
          upTo(c, 70);
          act(c, "draw");
          act(c, "hydro");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateCall",
        title: "Looks for sepsis and reads the chemistry first, raises the pressor, and tells the intensivist late",
        reasoning: "partial",
        drive: (c) => {
          test(c, "sepsis");
          test(c, "labs");
          test(c, "glucose");
          act(c, "dex");
          test(c, "meds");
          act(c, "pressor");
          act(c, "diagnose", { dx: "adrenal" });
          upTo(c, 120);
          act(c, "refer", { how: "icu" });
          upTo(c, 160);
          act(c, "draw");
          act(c, "hydro");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "glucoseLeft",
        title: "Finds the glucose of 54 and the missing prednisone, gets hydrocortisone in fast, but never treats the glucose",
        reasoning: "partial",
        drive: (c) => {
          test(c, "glucose");
          test(c, "meds");
          act(c, "diagnose", { dx: "adrenal" });
          act(c, "refer", { how: "icu" });
          upTo(c, 70);
          act(c, "hydro");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "septic",
        title: "Failure: calls it septic shock, raises the pressor and asks for a stimulation test before any steroid",
        reasoning: "missed",
        drive: (c) => {
          test(c, "sepsis");
          act(c, "diagnose", { dx: "sepsis" });
          act(c, "pressor");
          act(c, "refer", { how: "stimtest" });
          toEnd(c);
        },
      },
      {
        id: "moreFluid",
        title: "Failure: checks the glucose but calls it hypovolemia and waits",
        reasoning: "missed",
        drive: (c) => {
          test(c, "glucose");
          act(c, "diagnose", { dx: "hypovolemia" });
          toEnd(c);
        },
      },
    ],
  };
}
