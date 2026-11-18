// REQ-334 (health depth, 2026-11-17 evening): golden paths for
// CCRNPEDS/red-cells-then-crackles. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps peds-taco
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "CCRNPEDS", slug: "red-cells-then-crackles" };

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
        title: "Expert at study pace: lungs, stops it and the fluids, upright with oxygen, calls and notifies, checks the trend, balance and identity, documents",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          test(c, "lungs");
          act(c, "stop");
          act(c, "o2");
          act(c, "diagnose", { dx: "taco" });
          act(c, "refer", { how: "call" });
          test(c, "vitals");
          test(c, "io");
          test(c, "ident");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateCall",
        title: "Stops it and sits her up at once, but works through every check before calling 7 minutes later",
        reasoning: "partial",
        drive: (c) => {
          test(c, "lungs");
          act(c, "stop");
          act(c, "o2");
          test(c, "vitals");
          test(c, "io");
          test(c, "ident");
          upTo(c, 100);
          act(c, "diagnose", { dx: "taco" });
          act(c, "refer", { how: "call" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "bolused",
        title: "Calls promptly but gives a saline bolus for the heart rate before stopping the unit",
        reasoning: "partial",
        drive: (c) => {
          test(c, "lungs");
          act(c, "bolus");
          act(c, "diagnose", { dx: "taco" });
          act(c, "refer", { how: "call" });
          upTo(c, 80);
          act(c, "stop");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "finish",
        title: "Failure: reads it as pneumonia, speeds the unit up and lets it finish",
        reasoning: "missed",
        drive: (c) => {
          test(c, "lungs");
          act(c, "diagnose", { dx: "pneumonia" });
          act(c, "faster");
          act(c, "refer", { how: "finish" });
          toEnd(c);
        },
      },
      {
        id: "allergic",
        title: "Failure: calls it allergic and leaves everything running",
        reasoning: "missed",
        drive: (c) => {
          act(c, "diagnose", { dx: "allergic" });
          act(c, "bolus");
          toEnd(c);
        },
      },
    ],
  };
}
