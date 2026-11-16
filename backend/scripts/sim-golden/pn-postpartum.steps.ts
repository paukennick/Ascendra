// REQ-296 (clinical coverage, wave 2): golden paths for NCLEXPN/postpartum-check-boggy-fundus.
// No prototype exists, so the expectations are the engine's own results,
// re-checked by every `npm test` (lint + documents).
//
//   npm run sim:golden -- steps pn-postpartum
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "NCLEXPN", slug: "postpartum-check-boggy-fundus" };

const ended = (c: Ctl): boolean => c.run.state.ended !== null;
const upTo = (c: Ctl, tick: number): void => until(c, (x) => x.run.state.tick >= tick || ended(x));
const toEnd = (c: Ctl): void => until(c, (x) => ended(x), 20000);
function act(c: Ctl, a: string, p?: Record<string, string>): void {
  if (ended(c)) return;
  c.act(a, p);
  c.answer();
  teach(c);
}
const rnHere = (c: Ctl): void => until(c, (x) => x.value("rnHere") === true || ended(x));

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Expert at study pace: fundus, massage, pad, a clear call from the bedside, bedpan, vital signs, weighed pads; recheck with the RN and document",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 5);
          act(c, "fundus");
          act(c, "massage");
          act(c, "lochia");
          act(c, "callRn", { say: "numbers" });
          act(c, "void", { how: "bedpan" });
          act(c, "vitals");
          act(c, "weigh");
          rnHere(c);
          act(c, "fundus");
          act(c, "note");
          toEnd(c);
        },
      },
      {
        id: "slow",
        title: "Fundus at 3 min, massage at 6, a vague call, a fever call for 100.0 F, the catheter at 8 min",
        reasoning: "partial",
        drive: (c) => {
          upTo(c, 180);
          act(c, "fundus");
          act(c, "vitals");
          act(c, "feverCall");
          upTo(c, 360);
          act(c, "massage");
          upTo(c, 420);
          act(c, "callRn", { say: "vague" });
          upTo(c, 480);
          act(c, "void", { how: "cath" });
          act(c, "weigh");
          act(c, "note");
          toEnd(c);
        },
      },
      {
        id: "leftAlone",
        title: "Massages, then leaves the room to find the RN; bedpan after she returns; nothing weighed or written",
        reasoning: "partial",
        drive: (c) => {
          upTo(c, 10);
          act(c, "fundus");
          act(c, "massage");
          act(c, "goFind");
          until(c, (x) => x.value("away") === false || ended(x));
          act(c, "void", { how: "bedpan" });
          toEnd(c);
        },
      },
      {
        id: "walked",
        title: "Failure: checks at 25 minutes and walks her to the bathroom",
        reasoning: "missed",
        drive: (c) => {
          upTo(c, 1500);
          act(c, "fundus");
          act(c, "void", { how: "walk" });
          toEnd(c);
        },
      },
      {
        id: "shock",
        title: "Failure: looks at the pad and takes vital signs, one late massage, no report",
        reasoning: "missed",
        drive: (c) => {
          upTo(c, 60);
          act(c, "lochia");
          act(c, "vitals");
          upTo(c, 600);
          act(c, "massage");
          toEnd(c);
        },
      },
    ],
  };
}
