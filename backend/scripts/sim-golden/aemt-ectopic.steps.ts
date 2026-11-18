// REQ-338 (docs/sims.md 22.42): golden paths for
// NREMTAEMT/aemt-belly-pain-fainted-in-bathroom. No prototype; the
// expectations are the engine's own results.
//
//   npm run sim:golden -- steps aemt-ectopic
import type { Ctl, StepPath, StepsSpec } from "./steps.ts";
import { pace, teach } from "./s2b-helpers.ts";
import { act, at, toEnd, v, when } from "./ems-helpers.ts";

export const ENTRY = { course: "NREMTAEMT", slug: "aemt-belly-pain-fainted-in-bathroom" };

function done(c: Ctl, flag: string): void {
  when(c, (x) => v(x, flag) === false);
}
const CARRIED = { to: "ed", how: "carried" };

export function paths(): StepPath[] {
  return [
    {
      id: "expert",
      title: "Expert at study pace: shock recognized, flat, warm, oxygen; the pregnancy history; carried out to the surgical ED; IV and a bolus en route, reassessed; notified",
      reasoning: "met",
      drive: (c) => {
        pace(c, 3);
        act(c, "look");
        act(c, "flat");
        act(c, "history");
        teach(c);
        act(c, "warm");
        act(c, "o2");
        act(c, "vitals");
        done(c, "hPending");
        act(c, "transport", CARRIED);
        act(c, "notify");
        act(c, "iv");
        done(c, "ivPending");
        act(c, "bolus");
        act(c, "vitals");
        done(c, "vPending");
        toEnd(c);
      },
    },
    {
      id: "longScene",
      title: "Good care, but two IV attempts and a bolus on scene stretch it to 14 minutes; notified",
      reasoning: "partial",
      drive: (c) => {
        act(c, "look");
        act(c, "history");
        act(c, "flat");
        act(c, "vitals");
        act(c, "iv");
        done(c, "ivPending");
        act(c, "bolus");
        act(c, "warm");
        at(c, 840);
        act(c, "vitals");
        done(c, "vPending");
        act(c, "transport", CARRIED);
        act(c, "notify");
        toEnd(c);
      },
    },
    {
      id: "walked",
      title: "She insists on walking and faints at the door; otherwise good care",
      reasoning: "partial",
      drive: (c) => {
        act(c, "look");
        act(c, "history");
        act(c, "o2");
        done(c, "hPending");
        act(c, "transport", { to: "ed", how: "walk" });
        act(c, "notify");
        act(c, "iv");
        done(c, "ivPending");
        act(c, "bolus");
        toEnd(c);
      },
    },
    {
      id: "clinic",
      title: "Treated as a painful period: no pregnancy question, to her gynecologist's office",
      reasoning: "missed",
      drive: (c) => {
        act(c, "vitals");
        act(c, "flat");
        act(c, "transport", { to: "clinic", how: "carried" });
        toEnd(c);
      },
    },
    {
      id: "slowNoFluid",
      title: "Sitting up on scene for 25 minutes with no IV; profound shock",
      reasoning: "missed",
      drive: (c) => {
        act(c, "look");
        act(c, "vitals");
        at(c, 1500);
        act(c, "transport", CARRIED);
        toEnd(c);
      },
    },
  ];
}

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}
