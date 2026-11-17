// REQ-323 (health breadth): golden paths for ABPTSSCS/preseason-collapse-heat-stroke.
// No prototype exists, so the expectations are the engine's own results,
// re-checked by every `npm test`.
//
//   npm run sim:golden -- steps scs-heatstroke
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "ABPTSSCS", slug: "preseason-collapse-heat-stroke" };

const ended = (c: Ctl): boolean => c.run.state.ended !== null;
const upTo = (c: Ctl, tick: number): void => until(c, (x) => x.run.state.tick >= tick || ended(x));
const toEnd = (c: Ctl): void => until(c, (x) => ended(x), 20000);
const coolTo = (c: Ctl, deg: number): void => until(c, (x) => (x.value("core") as number) <= deg || ended(x));
const emsHere = (c: Ctl): void => until(c, (x) => x.value("emsHere") === true || ended(x));
function act(c: Ctl, a: string, p?: Record<string, string>): void {
  if (ended(c)) return;
  c.act(a, p);
  c.answer();
  teach(c);
}
function test(c: Ctl, a: string): void {
  act(c, a);
  until(c, (x) => x.value("testPending") === false || ended(x));
}

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Expert at study pace: CNS signs and a rectal temperature, ice-water immersion at once, 911 to cool first, out at 39 C, parent told, handed to EMS",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          test(c, "neuro");
          test(c, "rectal");
          act(c, "tub");
          act(c, "diagnose", { dx: "ehs" });
          act(c, "refer", { how: "ems" });
          coolTo(c, 39.0);
          act(c, "out");
          act(c, "tell");
          emsHere(c);
          act(c, "handoff");
          toEnd(c);
        },
      },
      {
        id: "lateTub",
        title: "History, glucose and vital signs first; rectal temperature and the tub only after several minutes, then cooled correctly",
        reasoning: "partial",
        drive: (c) => {
          test(c, "hx");
          test(c, "glu");
          test(c, "vit");
          test(c, "neuro");
          upTo(c, 120);
          test(c, "rectal");
          act(c, "tub");
          act(c, "diagnose", { dx: "ehs" });
          act(c, "refer", { how: "ems" });
          coolTo(c, 39.0);
          act(c, "out");
          emsHere(c);
          act(c, "handoff");
          toEnd(c);
        },
      },
      {
        id: "overcooled",
        title: "Immersion at once, but left in the tub until below 38 C before handover",
        reasoning: "partial",
        drive: (c) => {
          test(c, "neuro");
          test(c, "rectal");
          act(c, "tub");
          act(c, "refer", { how: "ems" });
          act(c, "diagnose", { dx: "ehs" });
          coolTo(c, 37.8);
          act(c, "out");
          act(c, "tell");
          emsHere(c);
          act(c, "handoff");
          toEnd(c);
        },
      },
      {
        id: "transportHot",
        title: "Failure: an oral reading, heat exhaustion, ice towels, and handed to EMS as soon as they arrive",
        reasoning: "missed",
        drive: (c) => {
          test(c, "neuro");
          act(c, "oral");
          act(c, "diagnose", { dx: "exhaust" });
          act(c, "towels");
          act(c, "refer", { how: "ems" });
          emsHere(c);
          act(c, "handoff");
          toEnd(c);
        },
      },
      {
        id: "parentDrives",
        title: "Failure: sees the confusion and sends him with his parent by car",
        reasoning: "missed",
        drive: (c) => {
          test(c, "neuro");
          act(c, "refer", { how: "parent" });
          toEnd(c);
        },
      },
      {
        id: "icePacksOnly",
        title: "Failure: ice packs and waiting, no core temperature and no call",
        reasoning: "missed",
        drive: (c) => {
          test(c, "neuro");
          act(c, "packs");
          toEnd(c);
        },
      },
    ],
  };
}
