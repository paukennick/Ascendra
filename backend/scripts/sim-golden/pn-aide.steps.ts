// REQ-325 (nursing depth, round 3): golden paths for
// NCLEXPN/aide-feeding-thin-liquids-dysphagia. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps pn-aide
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "NCLEXPN", slug: "aide-feeding-thin-liquids-dysphagia" };

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
        title: "Expert at study pace: watches the meal; stops it, upright, stays; breathing checked; nothing by mouth; unsafe care owned; RN and provider now; aide redirected; event report",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          test(c, "observe");
          act(c, "stop");
          test(c, "lungs");
          act(c, "npo");
          act(c, "diagnose", { dx: "unsafe" });
          act(c, "refer", { how: "report" });
          act(c, "redirect");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateReport",
        title: "Checks the order and questions the aide before stepping in; reports 5 minutes after seeing it",
        reasoning: "partial",
        drive: (c) => {
          test(c, "order");
          test(c, "ask");
          test(c, "observe");
          act(c, "stop");
          test(c, "lungs");
          act(c, "npo");
          act(c, "redirect");
          act(c, "diagnose", { dx: "unsafe" });
          upTo(c, 100);
          act(c, "refer", { how: "report" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "noDirections",
        title: "Stops the feeding and reports at once, but never checks her breathing or gives the aide directions",
        reasoning: "partial",
        drive: (c) => {
          test(c, "observe");
          act(c, "stop");
          act(c, "refer", { how: "report" });
          act(c, "diagnose", { dx: "unsafe" });
          act(c, "npo");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "letFinish",
        title: "Failure: calls the coughing normal, lets the aide finish the thin juice and mentions it at shift report",
        reasoning: "missed",
        drive: (c) => {
          test(c, "observe");
          act(c, "diagnose", { dx: "normal" });
          act(c, "finish");
          act(c, "refer", { how: "later" });
          toEnd(c);
        },
      },
      {
        id: "aideProblem",
        title: "Failure: sees it, decides it is the aide's problem to write up later, and walks on",
        reasoning: "missed",
        drive: (c) => {
          test(c, "observe");
          act(c, "diagnose", { dx: "aideonly" });
          toEnd(c);
        },
      },
    ],
  };
}
