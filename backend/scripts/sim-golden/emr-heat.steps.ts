// REQ-338 (docs/sims.md 22.42): golden paths for
// NREMTEMR/emr-finish-line-confused-runner. No prototype; the expectations
// are the engine's own results.
//
//   npm run sim:golden -- steps emr-heat
import type { Ctl, StepPath, StepsSpec } from "./steps.ts";
import { pace, teach } from "./s2b-helpers.ts";
import { act, at, toEnd, v, when } from "./ems-helpers.ts";

export const ENTRY = { course: "NREMTEMR", slug: "emr-finish-line-confused-runner" };

const alert = (c: Ctl): boolean => (v(c, "tc") as number) <= 39.4;

export function paths(): StepPath[] {
  return [
    {
      id: "expert",
      title: "Expert at study pace: heat stroke recognized; into the ice tub at once; ambulance called; airway watched, vital signs; out when alert; handed over",
      reasoning: "met",
      drive: (c) => {
        pace(c, 3);
        act(c, "look");
        act(c, "tub");
        act(c, "callAmb");
        teach(c);
        act(c, "airway");
        act(c, "vitals");
        when(c, alert);
        act(c, "out");
        when(c, (x) => v(x, "ambAt") !== null);
        act(c, "report");
        toEnd(c);
      },
    },
    {
      id: "tubLate",
      title: "Assessment and the ambulance first, vital signs, then the tub only at 4 minutes; out when alert; handed over",
      reasoning: "partial",
      drive: (c) => {
        act(c, "look");
        act(c, "callAmb");
        act(c, "vitals");
        at(c, 240);
        act(c, "tub");
        when(c, alert);
        act(c, "out");
        when(c, (x) => v(x, "ambAt") !== null);
        act(c, "report");
        toEnd(c);
      },
    },
    {
      id: "sheetHot",
      title: "A wet sheet in the shade, the ambulance called late, handed over still drowsy and hot",
      reasoning: "missed",
      drive: (c) => {
        act(c, "sheet");
        at(c, 200);
        act(c, "callAmb");
        when(c, (x) => v(x, "ambAt") !== null);
        act(c, "report");
        toEnd(c);
      },
    },
    {
      id: "drinkFirst",
      title: "A sports drink while she is confused; she chokes; then the tub and the ambulance",
      reasoning: "partial",
      drive: (c) => {
        act(c, "look");
        act(c, "drink");
        act(c, "tub");
        act(c, "callAmb");
        when(c, alert);
        act(c, "out");
        when(c, (x) => v(x, "ambAt") !== null);
        act(c, "report");
        toEnd(c);
      },
    },
    {
      id: "noRadio",
      title: "Cooled well in the tub, but no ambulance is ever requested",
      reasoning: "partial",
      drive: (c) => {
        act(c, "look");
        act(c, "tub");
        act(c, "vitals");
        when(c, alert);
        act(c, "out");
        toEnd(c);
      },
    },
  ];
}

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}
