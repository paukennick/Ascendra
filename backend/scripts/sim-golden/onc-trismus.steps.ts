// REQ-334 (health depth, 2026-11-17 evening): golden paths for
// ABPTSONC/jaw-wont-open-new-neck-lump. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps onc-trismus
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "ABPTSONC", slug: "jaw-wont-open-new-neck-lump" };

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
        title: "Expert at study pace: opening, neck, calls, history, explains",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          test(c, "open");
          test(c, "neck");
          act(c, "diagnose", { dx: "atyp" });
          act(c, "refer", { how: "onc" });
          test(c, "hx");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateCall",
        title: "Screens fully but calls 8 minutes after finding the node",
        reasoning: "partial",
        drive: (c) => {
          test(c, "open");
          test(c, "neck");
          test(c, "hx");
          upTo(c, 130);
          act(c, "diagnose", { dx: "atyp" });
          act(c, "refer", { how: "onc" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "stretched",
        title: "Starts stretching first, then finds the node and calls",
        reasoning: "partial",
        drive: (c) => {
          test(c, "open");
          act(c, "stretch");
          test(c, "neck");
          act(c, "diagnose", { dx: "atyp" });
          act(c, "refer", { how: "onc" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "rad",
        title: "Failure: treats radiation trismus and writes to the dentist",
        reasoning: "missed",
        drive: (c) => {
          act(c, "diagnose", { dx: "rad" });
          act(c, "stretch");
          act(c, "refer", { how: "dentist" });
          toEnd(c);
        },
      },
      {
        id: "tmd",
        title: "Failure: calls it TMD and stretches",
        reasoning: "missed",
        drive: (c) => {
          act(c, "diagnose", { dx: "tmd" });
          act(c, "stretch");
          toEnd(c);
        },
      },
    ],
  };
}
