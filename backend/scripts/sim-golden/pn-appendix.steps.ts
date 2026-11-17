// REQ-325 (nursing depth, round 3): golden paths for
// NCLEXPN/clinic-belly-pain-moved-right. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps pn-appendix
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "NCLEXPN", slug: "clinic-belly-pain-moved-right" };

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
        title: "Expert at study pace: history, vital signs and abdomen; nothing by mouth; possible appendicitis; provider interrupted at once; documented",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          test(c, "history");
          test(c, "vitals");
          test(c, "belly");
          act(c, "npo");
          act(c, "diagnose", { dx: "appy" });
          act(c, "refer", { how: "report" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateReport",
        title: "Does the full assessment but waits 6 minutes after the abdominal finding to interrupt the provider",
        reasoning: "partial",
        drive: (c) => {
          test(c, "history");
          test(c, "vitals");
          test(c, "belly");
          act(c, "npo");
          act(c, "diagnose", { dx: "appy" });
          upTo(c, 110);
          act(c, "refer", { how: "report" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "acetaminophen",
        title: "Reports at once after the abdominal check, but gives acetaminophen before she is seen and never takes vital signs",
        reasoning: "partial",
        drive: (c) => {
          test(c, "belly");
          act(c, "refer", { how: "report" });
          act(c, "apap");
          act(c, "npo");
          act(c, "diagnose", { dx: "appy" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "sentHome",
        title: "Failure: takes a history, calls it a stomach bug and sends her home",
        reasoning: "missed",
        drive: (c) => {
          test(c, "history");
          act(c, "diagnose", { dx: "gastro" });
          act(c, "refer", { how: "home" });
          toEnd(c);
        },
      },
      {
        id: "periodCramps",
        title: "Failure: checks her abdomen, calls it period cramps and leaves her waiting unreported",
        reasoning: "missed",
        drive: (c) => {
          test(c, "belly");
          act(c, "diagnose", { dx: "cramps" });
          toEnd(c);
        },
      },
    ],
  };
}
