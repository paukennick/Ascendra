// REQ-334 (health depth, 2026-11-17 evening): golden paths for
// ABPTSGCS/bruises-in-stages-son-wont-leave. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps gcs-abuse
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "ABPTSGCS", slug: "bruises-in-stages-son-wont-leave" };

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
        title: "Expert at study pace: skin check, time alone, safety question, reports, weight and medicines, documents",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          test(c, "skin");
          act(c, "alone");
          test(c, "safe");
          act(c, "diagnose", { dx: "abuse" });
          act(c, "refer", { how: "aps" });
          test(c, "weight");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateReport",
        title: "Sees her alone and listens, but reports 9 minutes later",
        reasoning: "partial",
        drive: (c) => {
          test(c, "skin");
          act(c, "alone");
          test(c, "safe");
          test(c, "weight");
          upTo(c, 140);
          act(c, "diagnose", { dx: "abuse" });
          act(c, "refer", { how: "aps" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "confronted",
        title: "Confronts the son, then reports without seeing her alone",
        reasoning: "partial",
        drive: (c) => {
          test(c, "skin");
          act(c, "confront");
          act(c, "diagnose", { dx: "abuse" });
          act(c, "refer", { how: "aps" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "falls",
        title: "Failure: accepts the walker story and notes it for next time",
        reasoning: "missed",
        drive: (c) => {
          test(c, "skin");
          act(c, "diagnose", { dx: "falls" });
          act(c, "accept");
          act(c, "refer", { how: "none" });
          toEnd(c);
        },
      },
      {
        id: "private",
        title: "Failure: treats it as a family matter",
        reasoning: "missed",
        drive: (c) => {
          act(c, "diagnose", { dx: "family" });
          act(c, "accept");
          toEnd(c);
        },
      },
    ],
  };
}
