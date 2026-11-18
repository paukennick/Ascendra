// REQ-334 (health depth, 2026-11-17 evening): golden paths for
// CCRNPEDS/wheeze-gone-quiet-and-sleepy. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps peds-asthma
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "CCRNPEDS", slug: "wheeze-gone-quiet-and-sleepy" };

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
        title: "Expert at study pace: quiet chest, drowsy, upright on the nebulizer, gas, calls, airway cart, pulsus, tells his mother",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          test(c, "listen");
          test(c, "alert");
          act(c, "up");
          test(c, "gas");
          act(c, "diagnose", { dx: "fail" });
          act(c, "refer", { how: "call" });
          act(c, "airway");
          test(c, "pulsus");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateCall",
        title: "Recognizes it and prepares, but calls 7 minutes after the quiet chest",
        reasoning: "partial",
        drive: (c) => {
          test(c, "listen");
          act(c, "up");
          act(c, "airway");
          test(c, "alert");
          test(c, "gas");
          test(c, "pulsus");
          upTo(c, 100);
          act(c, "diagnose", { dx: "fail" });
          act(c, "refer", { how: "call" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "sedated",
        title: "Calls promptly but gives the sedative and skips the gas",
        reasoning: "partial",
        drive: (c) => {
          test(c, "listen");
          act(c, "sedate");
          act(c, "diagnose", { dx: "fail" });
          act(c, "refer", { how: "call" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "better",
        title: "Failure: reads the quiet chest as improvement, stops the nebulizer and lets him sleep",
        reasoning: "missed",
        drive: (c) => {
          test(c, "listen");
          act(c, "diagnose", { dx: "better" });
          act(c, "neboff");
          act(c, "refer", { how: "morning" });
          toEnd(c);
        },
      },
      {
        id: "anxious",
        title: "Failure: thinks he has calmed down and sedates him",
        reasoning: "missed",
        drive: (c) => {
          act(c, "diagnose", { dx: "anxious" });
          act(c, "sedate");
          toEnd(c);
        },
      },
    ],
  };
}
