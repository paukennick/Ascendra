// REQ-338 (docs/sims.md 22.42): golden paths for
// NREMTPARAMEDIC/medic-racing-heart-pressure-falling. No prototype; the
// expectations are the engine's own results.
//
//   npm run sim:golden -- steps medic-svt
import type { Ctl, StepPath, StepsSpec } from "./steps.ts";
import { pace, teach } from "./s2b-helpers.ts";
import { act, at, toEnd, v, when } from "./ems-helpers.ts";

export const ENTRY = { course: "NREMTPARAMEDIC", slug: "medic-racing-heart-pressure-falling" };

function free(c: Ctl): void {
  when(c, (x) => v(x, "busy") === false);
}
function ivIn(c: Ctl): void {
  act(c, "iv");
  teach(c);
  when(c, (x) => v(x, "ivPending") === false);
}

export function paths(): StepPath[] {
  return [
    {
      id: "expert",
      title: "Expert at study pace: unstable recognized; pads, IV, SYNC checked, sedation per protocol, synchronized shock; pressure and a 12-lead; load and notify",
      reasoning: "met",
      drive: (c) => {
        pace(c, 3);
        act(c, "look");
        act(c, "monitor");
        act(c, "vitals");
        act(c, "pads");
        ivIn(c);
        act(c, "sync");
        act(c, "sedate");
        free(c);
        act(c, "shock");
        act(c, "vitals");
        act(c, "ecg12");
        act(c, "transport");
        act(c, "notify");
        toEnd(c);
      },
    },
    {
      id: "adenosineFirst",
      title: "Two doses of adenosine first, then pads, SYNC and the shock without sedation; no 12-lead",
      reasoning: "partial",
      drive: (c) => {
        act(c, "look");
        act(c, "monitor");
        ivIn(c);
        act(c, "adenosine");
        free(c);
        act(c, "adenosine");
        free(c);
        act(c, "pads");
        act(c, "sync");
        act(c, "shock");
        act(c, "vitals");
        act(c, "transport");
        act(c, "notify");
        toEnd(c);
      },
    },
    {
      id: "valsalvaFirst",
      title: "A Valsalva attempt in a confused, hypotensive patient, then a late sedated synchronized shock",
      reasoning: "partial",
      drive: (c) => {
        act(c, "look");
        act(c, "monitor");
        act(c, "vagal");
        free(c);
        ivIn(c);
        act(c, "pads");
        act(c, "sync");
        at(c, 240);
        act(c, "sedate");
        free(c);
        act(c, "shock");
        act(c, "vitals");
        act(c, "ecg12");
        act(c, "transport");
        act(c, "notify");
        toEnd(c);
      },
    },
    {
      id: "unsynced",
      title: "Pads on and a shock without SYNC: ventricular fibrillation, then CPR and defibrillation",
      reasoning: "missed",
      drive: (c) => {
        act(c, "look");
        act(c, "monitor");
        act(c, "pads");
        act(c, "shock");
        act(c, "defib");
        toEnd(c);
      },
    },
    {
      id: "noShock",
      title: "IV and two doses of adenosine, then transport without a shock; her pressure falls until she arrests",
      reasoning: "missed",
      drive: (c) => {
        act(c, "monitor");
        ivIn(c);
        act(c, "adenosine");
        free(c);
        act(c, "adenosine");
        free(c);
        act(c, "transport");
        toEnd(c);
      },
    },
  ];
}

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}
