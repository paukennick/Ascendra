// REQ-315: golden paths for CCRNADULT/tension-pneumothorax-after-line. No
// prototype exists, so the expectations are the engine's own results,
// re-checked by every `npm test` (lint + documents).
//
//   npm run sim:golden -- steps ccrn-ptx
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "CCRNADULT", slug: "tension-pneumothorax-after-line" };

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
        title: "Expert at study pace: examine, bag on 100%, suction, stat call for decompression now, kit at the bed",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 10);
          act(c, "assess");
          act(c, "bag");
          act(c, "suction");
          act(c, "call", { req: "now" });
          act(c, "kit");
          toEnd(c);
        },
      },
      {
        id: "slowCall",
        title: "FiO2 up and suction first, chest examined at 4 min, call for decompression at 5 min; no kit",
        reasoning: "partial",
        drive: (c) => {
          upTo(c, 20);
          act(c, "fio2");
          act(c, "suction");
          upTo(c, 240);
          act(c, "assess");
          upTo(c, 290);
          act(c, "call", { req: "now" });
          toEnd(c);
        },
      },
      {
        id: "fastNoPrep",
        title: "Examines, bags and calls for decompression at once, but no suction and no kit; decompressed after the kit is fetched",
        reasoning: "met",
        drive: (c) => {
          upTo(c, 15);
          act(c, "assess");
          act(c, "bag");
          act(c, "call", { req: "now" });
          act(c, "fluid");
          toEnd(c);
        },
      },
      {
        id: "xrayFirst",
        title: "Failure: raises PEEP and FiO2, examines, then asks for a stat chest X-ray; arrest before the film",
        reasoning: "missed",
        drive: (c) => {
          upTo(c, 20);
          act(c, "fio2");
          act(c, "peep");
          act(c, "assess");
          act(c, "call", { req: "xray" });
          toEnd(c);
        },
      },
      {
        id: "alarmOnly",
        title: "Failure: suctions, then raises PEEP for the saturation; never examines or calls",
        reasoning: "missed",
        drive: (c) => {
          upTo(c, 30);
          act(c, "suction");
          act(c, "peep");
          toEnd(c);
        },
      },
    ],
  };
}
