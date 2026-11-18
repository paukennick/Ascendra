// REQ-338 (docs/sims.md 22.42): golden paths for
// NREMTAEMT/aemt-copd-tripod-cpap. No prototype; the expectations are the
// engine's own results.
//
//   npm run sim:golden -- steps aemt-copd
import type { StepPath, StepsSpec } from "./steps.ts";
import { pace, teach } from "./s2b-helpers.ts";
import { act, at, toEnd, v, when } from "./ems-helpers.ts";

export const ENTRY = { course: "NREMTAEMT", slug: "aemt-copd-tripod-cpap" };

export function paths(): StepPath[] {
  return [
    {
      id: "expert",
      title: "Expert at study pace: oximeter and capnography, albuterol at once, oxygen titrated, CPAP at 5 then 10, vital signs; loaded early, notified, a second nebulizer in line",
      reasoning: "met",
      drive: (c) => {
        pace(c, 3);
        act(c, "look");
        act(c, "probe");
        act(c, "capno");
        act(c, "neb");
        teach(c);
        act(c, "nc");
        act(c, "cpap");
        act(c, "vitals");
        act(c, "raise");
        act(c, "raise");
        at(c, 200);
        act(c, "transport");
        act(c, "notify");
        when(c, (x) => v(x, "nebRunning") === false);
        act(c, "neb");
        toEnd(c);
      },
    },
    {
      id: "lateCpap",
      title: "Non-rebreather at 15 L/min, albuterol at 6 minutes, CPAP only at 9; arrives still struggling",
      reasoning: "partial",
      drive: (c) => {
        act(c, "look");
        act(c, "probe");
        act(c, "nrb");
        at(c, 360);
        act(c, "neb");
        at(c, 540);
        act(c, "cpap");
        act(c, "capno");
        act(c, "transport");
        act(c, "notify");
        toEnd(c);
      },
    },
    {
      id: "tiredEscalated",
      title: "Albuterol early but high-flow oxygen and no CPAP; he tires on the way; BVM and an intercept at once",
      reasoning: "partial",
      drive: (c) => {
        act(c, "look");
        act(c, "neb");
        act(c, "nrb");
        act(c, "capno");
        at(c, 120);
        act(c, "transport");
        act(c, "notify");
        when(c, (x) => v(x, "drowsyAt") !== null);
        act(c, "bvm");
        act(c, "als");
        toEnd(c);
      },
    },
    {
      id: "oxygenOnly",
      title: "Non-rebreather only: no bronchodilator, no CPAP, no escalation when he tires",
      reasoning: "missed",
      drive: (c) => {
        act(c, "nrb");
        act(c, "vitals");
        toEnd(c);
      },
    },
  ];
}

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}
