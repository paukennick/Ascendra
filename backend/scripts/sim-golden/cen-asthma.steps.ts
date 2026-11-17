// REQ-323 (health depth, round 2): golden paths for
// CEN/asthma-attack-quiet-chest. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps cen-asthma
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "CEN", slug: "asthma-attack-quiet-chest" };

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
        title: "Expert at study pace: nebulizer, oxygen titrated, upright, history, steroid, reassess; at the quiet chest the physician now for the airway; hand-off",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          act(c, "neb");
          act(c, "oxygen", { how: "titrate" });
          act(c, "upright");
          test(c, "hx");
          act(c, "steroid");
          act(c, "reassess");
          upTo(c, 175);
          act(c, "reassess");
          act(c, "diagnose", { dx: "failing" });
          act(c, "refer", { how: "md" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "maxOxygen",
        title: "Nebulizer and steroid at once and the tiring caught, but oxygen on a non-rebreather pushed toward 100%",
        reasoning: "partial",
        drive: (c) => {
          act(c, "neb");
          act(c, "oxygen", { how: "nrb" });
          act(c, "steroid");
          act(c, "reassess");
          upTo(c, 175);
          act(c, "reassess");
          act(c, "diagnose", { dx: "failing" });
          act(c, "refer", { how: "md" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateCall",
        title: "Treats well and sees the quiet chest, but calls the physician more than 5 minutes later",
        reasoning: "partial",
        drive: (c) => {
          act(c, "neb");
          act(c, "oxygen", { how: "titrate" });
          act(c, "steroid");
          act(c, "reassess");
          upTo(c, 175);
          act(c, "reassess");
          upTo(c, 250);
          act(c, "diagnose", { dx: "failing" });
          act(c, "refer", { how: "md" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "quietIsBetter",
        title: "Failure: treats, then reads the quiet chest as improvement and asks for a recheck in 30 minutes",
        reasoning: "missed",
        drive: (c) => {
          act(c, "neb");
          act(c, "oxygen", { how: "titrate" });
          upTo(c, 175);
          act(c, "reassess");
          act(c, "diagnose", { dx: "better" });
          act(c, "refer", { how: "later" });
          toEnd(c);
        },
      },
      {
        id: "noTreatment",
        title: "Failure: questions, vital signs and a peak flow attempt; calls it anxiety; no nebulizer or oxygen",
        reasoning: "missed",
        drive: (c) => {
          test(c, "hx");
          test(c, "vitals");
          test(c, "peak");
          act(c, "diagnose", { dx: "anxiety" });
          toEnd(c);
        },
      },
    ],
  };
}
