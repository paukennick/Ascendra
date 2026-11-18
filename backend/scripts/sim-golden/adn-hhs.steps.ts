// REQ-334 (health depth, 2026-11-17 evening): golden paths for
// ADNRN/two-weeks-thirsty-glucose-890. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps adn-hhs
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "ADNRN", slug: "two-weeks-thirsty-glucose-890" };

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
        title: "Expert at study pace: potassium, fluid at the ordered rate, insulin held, calls, neuro, volume and rhythm, documents",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          test(c, "potassium");
          act(c, "fluids");
          act(c, "holdIns");
          act(c, "diagnose", { dx: "hhs" });
          act(c, "refer", { how: "call" });
          test(c, "neuro");
          test(c, "volume");
          test(c, "ecg");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateCall",
        title: "Starts fluid and holds insulin, but calls 7 minutes after the potassium",
        reasoning: "partial",
        drive: (c) => {
          test(c, "potassium");
          act(c, "fluids");
          act(c, "holdIns");
          test(c, "neuro");
          test(c, "volume");
          test(c, "ecg");
          upTo(c, 100);
          act(c, "diagnose", { dx: "hhs" });
          act(c, "refer", { how: "call" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "wideOpen",
        title: "Calls promptly but runs the fluid wide open and never addresses the insulin",
        reasoning: "partial",
        drive: (c) => {
          test(c, "potassium");
          act(c, "wideOpen");
          act(c, "diagnose", { dx: "hhs" });
          act(c, "refer", { how: "call" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "dka",
        title: "Failure: reads it as DKA and starts insulin before fluid with a low potassium",
        reasoning: "missed",
        drive: (c) => {
          test(c, "potassium");
          act(c, "diagnose", { dx: "dka" });
          act(c, "insulinNow");
          act(c, "refer", { how: "later" });
          toEnd(c);
        },
      },
      {
        id: "dehyd",
        title: "Failure: calls it dehydration and starts insulin",
        reasoning: "missed",
        drive: (c) => {
          act(c, "diagnose", { dx: "dehyd" });
          act(c, "insulinNow");
          toEnd(c);
        },
      },
    ],
  };
}
