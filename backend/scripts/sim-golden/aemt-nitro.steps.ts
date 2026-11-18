// REQ-338 (docs/sims.md 22.42): golden paths for
// NREMTAEMT/aemt-chest-pressure-pill-last-night. No prototype; the
// expectations are the engine's own results.
//
//   npm run sim:golden -- steps aemt-nitro
import type { Ctl, StepPath, StepsSpec } from "./steps.ts";
import { pace, teach } from "./s2b-helpers.ts";
import { act, at, toEnd, v, when } from "./ems-helpers.ts";

export const ENTRY = { course: "NREMTAEMT", slug: "aemt-chest-pressure-pill-last-night" };

function done(c: Ctl, flag: string): void {
  when(c, (x) => v(x, flag) === false);
}

export function paths(): StepPath[] {
  return [
    {
      id: "expert",
      title: "Expert at study pace: monitor and vital signs, aspirin, 12-lead transmitted, the direct question about sildenafil, no nitrate, IV; to the PCI center",
      reasoning: "met",
      drive: (c) => {
        pace(c, 3);
        act(c, "vitals");
        act(c, "aspirin");
        act(c, "ecg");
        act(c, "history");
        teach(c);
        act(c, "iv");
        done(c, "ivPending");
        done(c, "ePending");
        act(c, "transport", { to: "pci" });
        toEnd(c);
      },
    },
    {
      id: "closest",
      title: "Everything right, no nitrate, but to the community hospital without a cath lab",
      reasoning: "partial",
      drive: (c) => {
        act(c, "vitals");
        act(c, "aspirin");
        act(c, "history");
        act(c, "ecg");
        act(c, "iv");
        done(c, "ivPending");
        act(c, "transport", { to: "local" });
        toEnd(c);
      },
    },
    {
      id: "ntgCorrected",
      title: "Nitroglycerin before asking about medications; his pressure falls to 72; flat, legs up and fluid bring it back; the PCI center",
      reasoning: "partial",
      drive: (c) => {
        act(c, "vitals");
        act(c, "aspirin");
        act(c, "ecg");
        act(c, "iv");
        done(c, "ivPending");
        act(c, "ntg");
        act(c, "legs");
        act(c, "bolus");
        act(c, "bolus");
        act(c, "history");
        act(c, "transport", { to: "pci" });
        toEnd(c);
      },
    },
    {
      id: "lateEcg",
      title: "No nitrate and the PCI center, but the 12-lead only at 11 minutes and aspirin late",
      reasoning: "partial",
      drive: (c) => {
        act(c, "vitals");
        act(c, "history");
        act(c, "iv");
        at(c, 620);
        act(c, "aspirin");
        act(c, "ecg");
        done(c, "ePending");
        act(c, "transport", { to: "pci" });
        toEnd(c);
      },
    },
    {
      id: "ntgCrash",
      title: "Nitroglycerin at once without a history, aspirin or an IV, and no move to transport; his pressure stays below 80",
      reasoning: "missed",
      drive: (c) => {
        act(c, "ntg");
        act(c, "vitals");
        toEnd(c);
      },
    },
  ];
}

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}
