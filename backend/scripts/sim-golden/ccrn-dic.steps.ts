// REQ-325 (nursing depth, round 3): golden paths for
// CCRNADULT/oozing-lines-in-septic-shock. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps ccrn-dic
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "CCRNADULT", slug: "oozing-lines-in-septic-shock" };

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
        title: "Expert at study pace: coagulation panel and bleeding exam; enoxaparin held; precautions; overt DIC; intensivist for components and drainage; components given; documented",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          test(c, "coags");
          test(c, "bleed");
          act(c, "hold");
          act(c, "prec");
          act(c, "diagnose", { dx: "dic" });
          act(c, "refer", { how: "icu" });
          upTo(c, 90);
          act(c, "products");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateCall",
        title: "Reviews the source and medications first, calls 7 minutes after the panel; no bleeding exam or precautions",
        reasoning: "partial",
        drive: (c) => {
          test(c, "source");
          test(c, "mar");
          test(c, "coags");
          act(c, "hold");
          act(c, "diagnose", { dx: "dic" });
          upTo(c, 135);
          act(c, "refer", { how: "icu" });
          upTo(c, 200);
          act(c, "products");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "enoxGiven",
        title: "Calls at once but gives the enoxaparin early 'because septic patients clot'",
        reasoning: "partial",
        drive: (c) => {
          test(c, "coags");
          test(c, "bleed");
          act(c, "enox");
          act(c, "refer", { how: "icu" });
          act(c, "prec");
          act(c, "diagnose", { dx: "dic" });
          upTo(c, 90);
          act(c, "products");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "calledHit",
        title: "Failure: calls it HIT, gives the enoxaparin anyway and waits for a repeat panel",
        reasoning: "missed",
        drive: (c) => {
          test(c, "coags");
          act(c, "diagnose", { dx: "hit" });
          act(c, "enox");
          act(c, "refer", { how: "recheck" });
          toEnd(c);
        },
      },
      {
        id: "dilution",
        title: "Failure: sees the bleeding, calls it dilution and waits for a repeat panel",
        reasoning: "missed",
        drive: (c) => {
          test(c, "bleed");
          act(c, "diagnose", { dx: "dilution" });
          act(c, "refer", { how: "recheck" });
          toEnd(c);
        },
      },
    ],
  };
}
