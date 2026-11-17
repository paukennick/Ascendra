// REQ-323 (health depth, round 2): golden paths for
// CEN/diving-injury-low-pressure-slow-pulse. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps cen-neuroshock
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "CEN", slug: "diving-injury-low-pressure-slow-pulse" };

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
        title: "Expert at study pace: breathing, a bolus, the bleeding screen, skin and level; neurogenic shock reported; vasopressor at once; hand-off",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          test(c, "airway");
          act(c, "bolus");
          test(c, "bleed");
          test(c, "skin");
          test(c, "neuro");
          act(c, "diagnose", { dx: "neuro" });
          act(c, "refer", { how: "md" });
          act(c, "pressor");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "reportFirst",
        title: "Reads the pattern and reports before looking for bleeding; screens afterward; vasopressor started",
        reasoning: "partial",
        drive: (c) => {
          test(c, "airway");
          act(c, "bolus");
          test(c, "skin");
          test(c, "neuro");
          act(c, "diagnose", { dx: "neuro" });
          act(c, "refer", { how: "md" });
          act(c, "pressor");
          test(c, "bleed");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "latePressor",
        title: "Screens and reports well, then gives two more boluses before starting the vasopressor 12 minutes later",
        reasoning: "partial",
        drive: (c) => {
          act(c, "bolus");
          test(c, "bleed");
          test(c, "skin");
          test(c, "neuro");
          act(c, "refer", { how: "md" });
          act(c, "bolus");
          act(c, "bolus");
          upTo(c, 230);
          act(c, "pressor");
          act(c, "diagnose", { dx: "neuro" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "fluidOnly",
        title: "Failure: calls it hemorrhagic and keeps to boluses; tells the physician only that the pressure is low",
        reasoning: "missed",
        drive: (c) => {
          act(c, "bolus");
          test(c, "airway");
          act(c, "bolus");
          act(c, "diagnose", { dx: "hemo" });
          act(c, "refer", { how: "fluids" });
          act(c, "bolus");
          toEnd(c);
        },
      },
      {
        id: "collarOff",
        title: "Failure: takes the collar off so he can breathe more easily",
        reasoning: "missed",
        drive: (c) => {
          test(c, "airway");
          act(c, "collar");
          act(c, "diagnose", { dx: "spinal" });
          toEnd(c);
        },
      },
    ],
  };
}
