// REQ-334 (health depth, 2026-11-17 evening): golden paths for
// ABPTSSCS/second-stress-fracture-no-period. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps scs-triad
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "ABPTSSCS", slug: "second-stress-fracture-no-period" };

const ended = (c: Ctl): boolean => c.run.state.ended !== null;
const upTo = (c: Ctl, tick: number): void => until(c, (x) => x.run.state.tick >= tick || ended(x));
const toEnd = (c: Ctl): void => until(c, (x) => ended(x), 20000);
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
        title: "Expert at study pace: periods, eating, refers, hop and history, holds, documents",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          test(c, "mens");
          test(c, "food");
          act(c, "diagnose", { dx: "triad" });
          act(c, "refer", { how: "md" });
          test(c, "hop");
          test(c, "hist");
          act(c, "hold");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateCall",
        title: "Asks and holds, but refers 8 minutes later",
        reasoning: "partial",
        drive: (c) => {
          test(c, "mens");
          test(c, "food");
          act(c, "hold");
          test(c, "hop");
          test(c, "hist");
          upTo(c, 130);
          act(c, "diagnose", { dx: "triad" });
          act(c, "refer", { how: "md" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "noAsk",
        title: "Holds and refers on the fracture history alone, never asks about periods or eating",
        reasoning: "partial",
        drive: (c) => {
          test(c, "hist");
          act(c, "hold");
          act(c, "diagnose", { dx: "triad" });
          act(c, "refer", { how: "md" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "loaded",
        title: "Failure: reads it as normal for a runner and builds mileage",
        reasoning: "missed",
        drive: (c) => {
          act(c, "diagnose", { dx: "normal" });
          act(c, "load");
          act(c, "refer", { how: "coach" });
          toEnd(c);
        },
      },
      {
        id: "training",
        title: "Failure: hears about her periods but blames training only and loads her",
        reasoning: "missed",
        drive: (c) => {
          test(c, "mens");
          act(c, "diagnose", { dx: "load" });
          act(c, "load");
          toEnd(c);
        },
      },
    ],
  };
}
