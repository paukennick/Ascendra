// REQ-334 (health depth, 2026-11-17 evening): golden paths for
// ABPTSWMS/walking-program-plantar-ulcer. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps wms-dfu
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "ABPTSWMS", slug: "walking-program-plantar-ulcer" };

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
        title: "Expert at study pace: feet, non-weight-bearing plan, messages, sensation and shoes, teaches",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          test(c, "feet");
          act(c, "seated");
          act(c, "diagnose", { dx: "dfu" });
          act(c, "refer", { how: "md" });
          test(c, "sensation");
          test(c, "shoes");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateMsg",
        title: "Plans well but messages the provider 8 minutes later",
        reasoning: "partial",
        drive: (c) => {
          test(c, "feet");
          act(c, "seated");
          test(c, "sensation");
          test(c, "shoes");
          upTo(c, 130);
          act(c, "diagnose", { dx: "dfu" });
          act(c, "refer", { how: "md" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "walkedFirst",
        title: "Starts the treadmill before looking, then finds the ulcer and changes the plan",
        reasoning: "partial",
        drive: (c) => {
          act(c, "walk");
          test(c, "feet");
          act(c, "seated");
          act(c, "diagnose", { dx: "dfu" });
          act(c, "refer", { how: "md" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "callus",
        title: "Failure: calls it a callus and starts the walking program",
        reasoning: "missed",
        drive: (c) => {
          test(c, "feet");
          act(c, "diagnose", { dx: "callus" });
          act(c, "walk");
          act(c, "refer", { how: "none" });
          toEnd(c);
        },
      },
      {
        id: "noLook",
        title: "Failure: never looks at his feet and walks him",
        reasoning: "missed",
        drive: (c) => {
          act(c, "walk");
          toEnd(c);
        },
      },
    ],
  };
}
