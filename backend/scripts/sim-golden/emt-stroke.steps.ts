// REQ-241 (bedside wave 2, EMS): golden paths for
// NREMTEMT/stroke-scale-destination. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps emt-stroke
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach } from "./s2b-helpers.ts";
import { act, at, toEnd, v, when } from "./ems-helpers.ts";

export const ENTRY = { course: "NREMTEMT", slug: "stroke-scale-destination" };

function glucose(c: Ctl): void {
  act(c, "glucose");
  teach(c);
  when(c, (x) => v(x, "gluPending") === false);
}
function vitals(c: Ctl): void {
  act(c, "vitals");
  teach(c);
  when(c, (x) => v(x, "vPending") === false);
}
function go(c: Ctl, where: string, notify = true): void {
  act(c, "transport", { where });
  teach(c);
  if (notify) act(c, "notify");
  toEnd(c);
}

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Expert at study pace: last known well from its source, both screens, glucose, head up, nothing by mouth, thrombectomy center, early alert",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          act(c, "look");
          act(c, "askLkw");
          act(c, "recordLkw", { when: "seen" });
          act(c, "scale");
          act(c, "severity");
          glucose(c);
          vitals(c);
          act(c, "headUp");
          go(c, "far");
        },
      },
      {
        id: "nearCenter",
        title: "A thorough assessment with the right time, but the nearer stroke center without thrombectomy",
        reasoning: "partial",
        drive: (c) => {
          act(c, "look");
          act(c, "askLkw");
          act(c, "recordLkw", { when: "seen" });
          act(c, "scale");
          act(c, "severity");
          glucose(c);
          vitals(c);
          act(c, "headUp");
          go(c, "near");
        },
      },
      {
        id: "foundTime",
        title: "Records the time he was found as last known well, skips the severity screen, still goes to the thrombectomy center",
        reasoning: "partial",
        drive: (c) => {
          act(c, "look");
          act(c, "recordLkw", { when: "found" });
          act(c, "scale");
          glucose(c);
          vitals(c);
          act(c, "headUp");
          go(c, "far");
        },
      },
      {
        id: "longScene",
        title: "Everything checked, oxygen at 95%, but 20 minutes on scene and no stroke alert",
        reasoning: "partial",
        drive: (c) => {
          act(c, "look");
          act(c, "askLkw");
          act(c, "recordLkw", { when: "seen" });
          act(c, "scale");
          act(c, "severity");
          glucose(c);
          vitals(c);
          act(c, "oxygen");
          act(c, "headUp");
          at(c, 1020);
          go(c, "far", false);
        },
      },
      {
        id: "noGlucose",
        title: "Screen only: no glucose, no last known well, the nearer center, no alert",
        reasoning: "missed",
        drive: (c) => {
          act(c, "look");
          act(c, "scale");
          vitals(c);
          at(c, 300);
          go(c, "near", false);
        },
      },
      {
        id: "aspirin",
        title: "Failure: no screen, then chewable aspirin 'because it could be a clot'; he chokes and aspirates",
        reasoning: "missed",
        drive: (c) => {
          act(c, "look");
          vitals(c);
          act(c, "aspirin");
          toEnd(c);
        },
      },
    ],
  };
}
