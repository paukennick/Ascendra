// REQ-325 (nursing depth, round 3): golden paths for
// NCLEXRN/postop-fever-150-graves-meds-stopped. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps rn-storm
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "NCLEXRN", slug: "postop-fever-150-graves-meds-stopped" };

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
        title: "Expert at study pace: vital signs and mental status; cooling without aspirin; thyroid storm; rapid response now; beta-blocker and fluids; ICU hand-off",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          test(c, "vitals");
          test(c, "mental");
          act(c, "cool");
          act(c, "diagnose", { dx: "storm" });
          act(c, "refer", { how: "rrt" });
          upTo(c, 80);
          act(c, "beta");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateCall",
        title: "History and wound first, then vital signs; calls rapid response 6 minutes after them",
        reasoning: "partial",
        drive: (c) => {
          test(c, "history");
          test(c, "wound");
          test(c, "vitals");
          test(c, "mental");
          act(c, "cool");
          act(c, "diagnose", { dx: "storm" });
          upTo(c, 110);
          act(c, "refer", { how: "rrt" });
          upTo(c, 165);
          act(c, "beta");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "sedated",
        title: "Calls rapid response at once, but gives lorazepam for her agitation while waiting",
        reasoning: "partial",
        drive: (c) => {
          test(c, "vitals");
          act(c, "refer", { how: "rrt" });
          act(c, "sed");
          act(c, "cool");
          act(c, "diagnose", { dx: "storm" });
          upTo(c, 70);
          act(c, "beta");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "aspirin",
        title: "Failure: calls it a wound infection, gives aspirin for the fever and pages the resident for after clinic",
        reasoning: "missed",
        drive: (c) => {
          test(c, "vitals");
          act(c, "diagnose", { dx: "sepsis" });
          act(c, "asp");
          act(c, "refer", { how: "page" });
          toEnd(c);
        },
      },
      {
        id: "anxiety",
        title: "Failure: sees her agitation, calls it anxiety and gives lorazepam",
        reasoning: "missed",
        drive: (c) => {
          test(c, "mental");
          act(c, "diagnose", { dx: "anxiety" });
          act(c, "sed");
          toEnd(c);
        },
      },
    ],
  };
}
