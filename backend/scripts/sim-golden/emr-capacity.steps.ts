// REQ-338 (docs/sims.md 22.42): golden paths for
// NREMTEMR/emr-head-cut-wants-to-drive-home. No prototype; the expectations
// are the engine's own results.
//
//   npm run sim:golden -- steps emr-capacity
import type { StepPath, StepsSpec } from "./steps.ts";
import { pace, teach } from "./s2b-helpers.ts";
import { act, at, toEnd, v, when } from "./ems-helpers.ts";

export const ENTRY = { course: "NREMTEMR", slug: "emr-head-cut-wants-to-drive-home" };

export function paths(): StepPath[] {
  return [
    {
      id: "expert",
      title: "Expert at study pace: sat on the curb, keys with his friend, a deputy requested; capacity checked; pressure and vital signs; on his side as soon as he fades; full handover",
      reasoning: "met",
      drive: (c) => {
        pace(c, 3);
        act(c, "engage");
        act(c, "keys");
        act(c, "police");
        act(c, "capacity");
        act(c, "pressure");
        act(c, "vitals");
        teach(c);
        when(c, (x) => v(x, "drowsyAt") !== null);
        act(c, "side");
        when(c, (x) => v(x, "ambAt") !== null);
        act(c, "report");
        toEnd(c);
      },
    },
    {
      id: "noBackup",
      title: "Engaged, keys taken and a deputy requested, but capacity checked late and his airway positioned a little late",
      reasoning: "partial",
      drive: (c) => {
        act(c, "engage");
        act(c, "keys");
        act(c, "police");
        act(c, "pressure");
        at(c, 200);
        act(c, "capacity");
        act(c, "vitals");
        when(c, (x) => v(x, "drowsyAt") !== null);
        at(c, (v(c, "drowsyAt") as number) + 75);
        act(c, "side");
        when(c, (x) => v(x, "ambAt") !== null);
        act(c, "report");
        toEnd(c);
      },
    },
    {
      id: "signedOff",
      title: "Capacity asked about, then his refusal accepted and signed; he drives off",
      reasoning: "missed",
      drive: (c) => {
        act(c, "capacity");
        act(c, "accept");
        toEnd(c);
      },
    },
    {
      id: "wrestled",
      title: "Capacity checked and a deputy requested, then he is grabbed and held down alone",
      reasoning: "partial",
      drive: (c) => {
        act(c, "capacity");
        act(c, "police");
        act(c, "restrain");
        act(c, "pressure");
        when(c, (x) => v(x, "drowsyAt") !== null);
        act(c, "side");
        when(c, (x) => v(x, "ambAt") !== null);
        act(c, "report");
        toEnd(c);
      },
    },
    {
      id: "snoring",
      title: "A good scene, but when he fades nobody positions him until his airway blocks",
      reasoning: "partial",
      drive: (c) => {
        act(c, "engage");
        act(c, "keys");
        act(c, "police");
        act(c, "capacity");
        act(c, "pressure");
        act(c, "vitals");
        when(c, (x) => v(x, "blockedAt") !== null);
        act(c, "jaw");
        when(c, (x) => v(x, "ambAt") !== null);
        act(c, "report");
        toEnd(c);
      },
    },
  ];
}

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}
