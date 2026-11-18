// REQ-338 (docs/sims.md 22.42): golden paths for
// NREMTPARAMEDIC/medic-polst-selective-daughter-wants-everything. No
// prototype; the expectations are the engine's own results.
//
//   npm run sim:golden -- steps medic-polst
import type { Ctl, StepPath, StepsSpec } from "./steps.ts";
import { pace, teach } from "./s2b-helpers.ts";
import { act, at, toEnd, v, when } from "./ems-helpers.ts";

export const ENTRY = { course: "NREMTPARAMEDIC", slug: "medic-polst-selective-daughter-wants-everything" };

function readPolst(c: Ctl): void {
  act(c, "polst");
  teach(c);
  when(c, (x) => v(x, "pPending") === false);
}

export function paths(): StepPath[] {
  return [
    {
      id: "expert",
      title: "Expert at study pace: POLST read and validated; CPAP and albuterol; the form explained to his daughter; medical direction; transport with the POLST; notified",
      reasoning: "met",
      drive: (c) => {
        pace(c, 3);
        act(c, "look");
        act(c, "monitor");
        readPolst(c);
        act(c, "cpap");
        act(c, "neb");
        act(c, "talk");
        act(c, "medDir");
        when(c, (x) => v(x, "mdPending") === false);
        act(c, "transport");
        act(c, "notify");
        toEnd(c);
      },
    },
    {
      id: "oxygenOnly",
      title: "POLST read and explained, but oxygen only, no CPAP and no medical direction",
      reasoning: "partial",
      drive: (c) => {
        act(c, "look");
        readPolst(c);
        act(c, "o2");
        act(c, "talk");
        act(c, "transport");
        act(c, "notify");
        toEnd(c);
      },
    },
    {
      id: "lateRead",
      title: "Oxygen first, the POLST read only at 6 minutes, CPAP at 9; medical direction called; his daughter not spoken to",
      reasoning: "partial",
      drive: (c) => {
        act(c, "monitor");
        act(c, "o2");
        at(c, 360);
        readPolst(c);
        at(c, 540);
        act(c, "cpap");
        act(c, "medDir");
        act(c, "transport");
        act(c, "notify");
        toEnd(c);
      },
    },
    {
      id: "intubated",
      title: "At his daughter's request, intubated without reading the POLST",
      reasoning: "missed",
      drive: (c) => {
        act(c, "look");
        act(c, "intubate");
        act(c, "transport");
        toEnd(c);
      },
    },
    {
      id: "withheld",
      title: "POLST read as 'no treatment': no oxygen, no CPAP; he tires",
      reasoning: "missed",
      drive: (c) => {
        readPolst(c);
        act(c, "withhold");
        act(c, "transport");
        toEnd(c);
      },
    },
  ];
}

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}
