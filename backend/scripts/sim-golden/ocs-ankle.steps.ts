// REQ-334 (health depth, 2026-11-17 evening): golden paths for
// ABPTSOCS/rolled-ankle-cant-take-four-steps. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps ocs-ankle
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "ABPTSOCS", slug: "rolled-ankle-cant-take-four-steps" };

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
        title: "Expert at study pace: history, Ottawa screen, crutches, radiographs, squeeze test, explains",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          test(c, "hx");
          test(c, "ottawa");
          act(c, "nwb");
          act(c, "diagnose", { dx: "ottawa" });
          act(c, "refer", { how: "xr" });
          test(c, "squeeze");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateRef",
        title: "Screens and protects but arranges imaging 8 minutes later",
        reasoning: "partial",
        drive: (c) => {
          test(c, "hx");
          test(c, "ottawa");
          act(c, "nwb");
          test(c, "squeeze");
          upTo(c, 130);
          act(c, "diagnose", { dx: "ottawa" });
          act(c, "refer", { how: "xr" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "boot",
        title: "Images promptly but plans six weeks of rigid immobilization",
        reasoning: "partial",
        drive: (c) => {
          test(c, "ottawa");
          act(c, "nwb");
          act(c, "cast");
          act(c, "diagnose", { dx: "immob" });
          act(c, "refer", { how: "xr" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "drills",
        title: "Failure: calls it a simple sprain and starts hop drills without imaging",
        reasoning: "missed",
        drive: (c) => {
          act(c, "diagnose", { dx: "sprain" });
          act(c, "drill");
          act(c, "refer", { how: "none" });
          toEnd(c);
        },
      },
      {
        id: "noScreen",
        title: "Failure: skips the screen and drills",
        reasoning: "missed",
        drive: (c) => {
          act(c, "drill");
          toEnd(c);
        },
      },
    ],
  };
}
