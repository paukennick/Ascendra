// REQ-338 (docs/sims.md 22.42): golden paths for
// NREMTEMT/emt-low-sugar-now-says-no. No prototype; the expectations are the
// engine's own results. Exported so the AEMT band reuses them.
//
//   npm run sim:golden -- steps emt-refusal
import type { Ctl, StepPath, StepsSpec } from "./steps.ts";
import { pace, teach } from "./s2b-helpers.ts";
import { act, toEnd, v, when } from "./ems-helpers.ts";

export const ENTRY = { course: "NREMTEMT", slug: "emt-low-sugar-now-says-no" };

function glucose(c: Ctl): void {
  act(c, "glucose");
  teach(c);
  when(c, (x) => v(x, "gPending") === false);
}
function vitals(c: Ctl): void {
  act(c, "vitals");
  when(c, (x) => v(x, "vPending") === false);
}
// Wait out the tube's 15 minutes, then recheck.
function recheck(c: Ctl): void {
  const og = v(c, "ogAt") as number;
  when(c, (x) => x.run.state.tick >= og + 900);
  glucose(c);
}
const alert = (c: Ctl): boolean => (v(c, "glu") as number) >= 70;

export function paths(): StepPath[] {
  return [
    {
      id: "expert",
      title: "Expert at study pace: capacity lacking, glucose 46, oral glucose, vital signs; recheck at 15 minutes; capacity again (present); the glipizide risk explained; medical direction on speaker; he agrees and goes",
      reasoning: "met",
      drive: (c) => {
        pace(c, 3);
        act(c, "capacity");
        glucose(c);
        act(c, "oralGlucose");
        vitals(c);
        recheck(c);
        act(c, "capacity");
        act(c, "risk");
        act(c, "medDir");
        act(c, "go");
        toEnd(c);
      },
    },
    {
      id: "oneCapacity",
      title: "Glucose and oral glucose, vital signs, capacity only once he is alert, no recheck; the risk and medical direction; he goes",
      reasoning: "partial",
      drive: (c) => {
        glucose(c);
        act(c, "oralGlucose");
        vitals(c);
        when(c, alert);
        act(c, "capacity");
        act(c, "risk");
        act(c, "medDir");
        act(c, "go");
        toEnd(c);
      },
    },
    {
      id: "documentedRefusal",
      title: "Treated and rechecked, capacity twice, the risk explained but no medical direction; he refuses and the refusal is documented with safeguards",
      reasoning: "partial",
      drive: (c) => {
        act(c, "capacity");
        glucose(c);
        act(c, "oralGlucose");
        vitals(c);
        recheck(c);
        act(c, "capacity");
        act(c, "risk");
        act(c, "safeRefusal");
        toEnd(c);
      },
    },
    {
      id: "signedAndGone",
      title: "Glucose and oral glucose; once he is alert, a signed refusal and the call cleared",
      reasoning: "missed",
      drive: (c) => {
        glucose(c);
        act(c, "oralGlucose");
        when(c, alert);
        act(c, "release");
        toEnd(c);
      },
    },
    {
      id: "forced",
      title: "Treated; alert and refusing with capacity; lifted onto the stretcher anyway",
      reasoning: "missed",
      drive: (c) => {
        glucose(c);
        act(c, "oralGlucose");
        vitals(c);
        when(c, alert);
        act(c, "capacity");
        act(c, "force");
        toEnd(c);
      },
    },
    {
      id: "leftConfused",
      title: "Capacity checked and found lacking, then his confused refusal accepted",
      reasoning: "missed",
      drive: (c) => {
        act(c, "capacity");
        act(c, "acceptEarly");
        toEnd(c);
      },
    },
  ];
}

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}
