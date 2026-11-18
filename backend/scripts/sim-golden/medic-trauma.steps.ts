// REQ-338 (docs/sims.md 22.42): golden paths for
// NREMTPARAMEDIC/medic-chest-stab-pulse-lost. No prototype; the expectations
// are the engine's own results.
//
//   npm run sim:golden -- steps medic-trauma
import type { Ctl, StepPath, StepsSpec } from "./steps.ts";
import { pace, teach } from "./s2b-helpers.ts";
import { act, at, toEnd, v, when } from "./ems-helpers.ts";

export const ENTRY = { course: "NREMTPARAMEDIC", slug: "medic-chest-stab-pulse-lost" };

function needle(c: Ctl, side: string): void {
  act(c, side);
  teach(c);
  when(c, (x) => v(x, "nPending") === false);
}

export function paths(): StepPath[] {
  return [
    {
      id: "expert",
      title: "Expert at study pace: traumatic arrest recognized; BVM; left then right decompression, pulse back; vented seal; scoop and go; IO en route; trauma center notified",
      reasoning: "met",
      drive: (c) => {
        pace(c, 3);
        act(c, "look");
        act(c, "bvm");
        needle(c, "left");
        needle(c, "right");
        act(c, "seal");
        act(c, "transport");
        act(c, "io");
        act(c, "notify");
        toEnd(c);
      },
    },
    {
      id: "slowStart",
      title: "Monitor and compressions first, the right side at 3 minutes and the left after; pulse back; a long scene",
      reasoning: "partial",
      drive: (c) => {
        act(c, "look");
        act(c, "monitor");
        act(c, "cpr");
        act(c, "bvm");
        at(c, 180);
        needle(c, "right");
        needle(c, "left");
        act(c, "seal");
        at(c, 700);
        act(c, "transport");
        act(c, "notify");
        toEnd(c);
      },
    },
    {
      id: "leftOnly",
      title: "Left decompression at once, pulse back; the right side never done",
      reasoning: "partial",
      drive: (c) => {
        act(c, "look");
        act(c, "bvm");
        needle(c, "left");
        act(c, "seal");
        act(c, "transport");
        act(c, "notify");
        toEnd(c);
      },
    },
    {
      id: "epiFirst",
      title: "Run as a medical arrest with epinephrine first; decompression at 7 minutes just in time; long scene",
      reasoning: "partial",
      drive: (c) => {
        act(c, "cpr");
        act(c, "monitor");
        act(c, "bvm");
        act(c, "io");
        act(c, "epi");
        at(c, 400);
        needle(c, "left");
        needle(c, "right");
        act(c, "transport");
        act(c, "notify");
        toEnd(c);
      },
    },
    {
      id: "medicalArrest",
      title: "Compressions and epinephrine on scene; no decompression and no transport",
      reasoning: "missed",
      drive: (c) => {
        act(c, "cpr");
        act(c, "bvm");
        act(c, "io");
        act(c, "epi");
        at(c, 240);
        act(c, "epi");
        toEnd(c);
      },
    },
  ];
}

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}
