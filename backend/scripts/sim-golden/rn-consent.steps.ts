// REQ-325 (nursing depth, round 3): golden paths for
// NCLEXRN/preop-consent-after-opioid. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps rn-consent
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "NCLEXRN", slug: "preop-consent-after-opioid" };

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
        title: "Expert at study pace: teach-back and sedation; not valid now; surgeon called; OR told; he and his daughter supported; documented",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          test(c, "teachback");
          test(c, "sedation");
          act(c, "diagnose", { dx: "invalid" });
          act(c, "refer", { how: "surgeon" });
          act(c, "or");
          act(c, "advocate");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateCall",
        title: "Reads the chart and asks about pressure before the teach-back; calls the surgeon 6 minutes after it",
        reasoning: "partial",
        drive: (c) => {
          test(c, "chart");
          test(c, "pressure");
          test(c, "sedation");
          test(c, "teachback");
          act(c, "or");
          act(c, "advocate");
          act(c, "diagnose", { dx: "invalid" });
          upTo(c, 120);
          act(c, "refer", { how: "surgeon" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "surgeonOnly",
        title: "Calls the surgeon at once after the teach-back, but never tells the OR or supports him and his daughter",
        reasoning: "partial",
        drive: (c) => {
          test(c, "teachback");
          act(c, "refer", { how: "surgeon" });
          act(c, "diagnose", { dx: "invalid" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "witnessed",
        title: "Failure: hears he can't explain it, calls the consent valid because he said yes, and witnesses his signature",
        reasoning: "missed",
        drive: (c) => {
          test(c, "teachback");
          act(c, "diagnose", { dx: "valid" });
          act(c, "witness");
          toEnd(c);
        },
      },
      {
        id: "daughterSigns",
        title: "Failure: checks the chart, then lets his daughter sign for him without checking his understanding",
        reasoning: "missed",
        drive: (c) => {
          test(c, "chart");
          act(c, "diagnose", { dx: "family" });
          act(c, "daughter");
          toEnd(c);
        },
      },
    ],
  };
}
