// REQ-315: golden paths for NCLEXRN/oxytocin-tachysystole-late-decels. No
// prototype exists, so the expectations are the engine's own results,
// re-checked by every `npm test` (lint + documents).
//
//   npm run sim:golden -- steps rn-fhr
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "NCLEXRN", slug: "oxytocin-tachysystole-late-decels" };

const ended = (c: Ctl): boolean => c.run.state.ended !== null;
const upTo = (c: Ctl, tick: number): void => until(c, (x) => x.run.state.tick >= tick || ended(x));
const toEnd = (c: Ctl): void => until(c, (x) => ended(x), 20000);
function act(c: Ctl, a: string, p?: Record<string, string>): void {
  if (ended(c)) return;
  c.act(a, p);
  c.answer();
  teach(c);
}

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Expert at study pace: read the strip, stop the oxytocin, left side, bolus, SBAR with numbers, terbutaline on order",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 10);
          act(c, "review");
          act(c, "oxytocin", { o: "off" });
          act(c, "position", { p: "left" });
          act(c, "bolus");
          act(c, "callOb");
          act(c, "terbutaline");
          toEnd(c);
        },
      },
      {
        id: "halved",
        title: "Reads the strip and calls with numbers, turns her, but only halves the oxytocin until the obstetrician arrives; no terbutaline",
        reasoning: "partial",
        drive: (c) => {
          upTo(c, 10);
          act(c, "review");
          act(c, "position", { p: "left" });
          act(c, "oxytocin", { o: "half" });
          act(c, "callOb");
          upTo(c, 420);
          act(c, "oxytocin", { o: "off" });
          toEnd(c);
        },
      },
      {
        id: "slowStart",
        title: "Bolus first, then reads the strip at 4 min, stops the oxytocin and turns her at 6 min, calls at 8 min",
        reasoning: "partial",
        drive: (c) => {
          upTo(c, 10);
          act(c, "bolus");
          upTo(c, 240);
          act(c, "review");
          upTo(c, 360);
          act(c, "oxytocin", { o: "off" });
          act(c, "position", { p: "left" });
          upTo(c, 480);
          act(c, "callOb");
          act(c, "terbutaline");
          toEnd(c);
        },
      },
      {
        id: "flatAndMore",
        title: "Failure: lays her flat for a clearer tracing and increases the oxytocin; a prolonged deceleration",
        reasoning: "missed",
        drive: (c) => {
          upTo(c, 20);
          act(c, "position", { p: "supine" });
          act(c, "oxytocin", { o: "up" });
          toEnd(c);
        },
      },
      {
        id: "vagueCall",
        title: "Failure: calls 'the strip looks bad' without reading it and waits for the obstetrician",
        reasoning: "missed",
        drive: (c) => {
          upTo(c, 30);
          act(c, "callOb");
          toEnd(c);
        },
      },
    ],
  };
}
