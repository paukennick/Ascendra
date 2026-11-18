// REQ-338 (docs/sims.md 22.42): golden paths for
// NREMTEMR/emr-line-down-on-the-car. No prototype; the expectations are the
// engine's own results.
//
//   npm run sim:golden -- steps emr-wire
import type { StepPath, StepsSpec } from "./steps.ts";
import { pace, teach } from "./s2b-helpers.ts";
import { act, at, toEnd, v, when } from "./ems-helpers.ts";

export const ENTRY = { course: "NREMTEMR", slug: "emr-line-down-on-the-car" };

export function paths(): StepPath[] {
  return [
    {
      id: "expert",
      title: "Expert at study pace: perimeter, power company, engine and law enforcement at once; driver told to stay; the onlooker stopped; coached to jump clear when the car smokes; pressure, vital signs, handover",
      reasoning: "met",
      drive: (c) => {
        pace(c, 3);
        act(c, "zone");
        act(c, "utility");
        teach(c);
        act(c, "fire");
        act(c, "stay");
        when(c, (x) => v(x, "walkStartAt") !== null);
        act(c, "stopWalker");
        when(c, (x) => v(x, "smokeAt") !== null);
        act(c, "coachExit");
        act(c, "pressure");
        act(c, "vitals");
        when(c, (x) => v(x, "ambAt") !== null);
        act(c, "report");
        toEnd(c);
      },
    },
    {
      id: "lateZone",
      title: "Power company and the driver told to stay at once, the onlooker stopped, but the perimeter only at 3 minutes; good care after he jumps clear",
      reasoning: "partial",
      drive: (c) => {
        act(c, "utility");
        act(c, "stay");
        when(c, (x) => v(x, "walkStartAt") !== null);
        act(c, "stopWalker");
        at(c, 180);
        act(c, "zone");
        when(c, (x) => v(x, "smokeAt") !== null);
        act(c, "coachExit");
        act(c, "pressure");
        act(c, "vitals");
        when(c, (x) => v(x, "ambAt") !== null);
        act(c, "report");
        toEnd(c);
      },
    },
    {
      id: "noCare",
      title: "Perimeter at once and the onlooker stopped, power company late, the driver never told to stay; coached out at the smoke but no pressure or vital signs",
      reasoning: "partial",
      drive: (c) => {
        act(c, "zone");
        when(c, (x) => v(x, "walkStartAt") !== null);
        act(c, "stopWalker");
        at(c, 200);
        act(c, "utility");
        when(c, (x) => v(x, "smokeAt") !== null);
        act(c, "coachExit");
        when(c, (x) => v(x, "ambAt") !== null);
        act(c, "report");
        toEnd(c);
      },
    },
    {
      id: "walkerHit",
      title: "Perimeter taped but the man walking to the car is never stopped, and no one calls the power company",
      reasoning: "missed",
      drive: (c) => {
        act(c, "zone");
        act(c, "stay");
        when(c, (x) => v(x, "smokeAt") !== null);
        act(c, "coachExit");
        act(c, "pressure");
        when(c, (x) => v(x, "ambAt") !== null);
        act(c, "report");
        toEnd(c);
      },
    },
    {
      id: "noCoach",
      title: "Scene set well, but when the car smokes nobody tells him how to get out; he steps out holding the door",
      reasoning: "partial",
      drive: (c) => {
        act(c, "zone");
        act(c, "utility");
        act(c, "stay");
        when(c, (x) => v(x, "walkStartAt") !== null);
        act(c, "stopWalker");
        when(c, (x) => v(x, "exitAt") !== null);
        act(c, "vitals");
        when(c, (x) => v(x, "ambAt") !== null);
        act(c, "report");
        toEnd(c);
      },
    },
    {
      id: "walkedUp",
      title: "Straight to the driver's door to assess him",
      reasoning: "missed",
      drive: (c) => {
        act(c, "utility");
        at(c, 20);
        act(c, "approach");
        toEnd(c);
      },
    },
  ];
}

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}
