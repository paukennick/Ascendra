// REQ-323 (health depth, round 2): golden paths for
// FNPAANP/two-falls-not-herself. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps fnp-atypical
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "FNPAANP", slug: "two-falls-not-herself" };

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
        title: "Expert at study pace: full vital signs with a counted rate, delirium screen, lungs; pneumonia with early sepsis; emergency department now; hand-over",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          test(c, "vitals");
          test(c, "cam");
          test(c, "lungs");
          act(c, "diagnose", { dx: "pna" });
          act(c, "refer", { how: "ed" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateDecision",
        title: "Dipstick and medications first, then the findings; the decision comes 13 minutes after the first sign",
        reasoning: "partial",
        drive: (c) => {
          test(c, "dip");
          test(c, "meds");
          test(c, "vitals");
          test(c, "cam");
          test(c, "lungs");
          upTo(c, 200);
          act(c, "diagnose", { dx: "pna" });
          act(c, "refer", { how: "ed" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "noDeliriumScreen",
        title: "Vital signs and lungs, sent promptly, but delirium never screened",
        reasoning: "partial",
        drive: (c) => {
          test(c, "vitals");
          test(c, "lungs");
          act(c, "refer", { how: "ed" });
          act(c, "diagnose", { dx: "pna" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "dipstickUti",
        title: "Failure: dipstick and vital signs, calls it a UTI, home on antibiotics",
        reasoning: "missed",
        drive: (c) => {
          test(c, "dip");
          test(c, "vitals");
          act(c, "diagnose", { dx: "uti" });
          act(c, "refer", { how: "abx" });
          toEnd(c);
        },
      },
      {
        id: "fallsClinic",
        title: "Failure: a medication review, calls it dementia with mechanical falls, referrals and home",
        reasoning: "missed",
        drive: (c) => {
          test(c, "meds");
          act(c, "diagnose", { dx: "dementia" });
          act(c, "refer", { how: "pt" });
          toEnd(c);
        },
      },
      {
        id: "noDecision",
        title: "Failure: dipstick and medication review, then no decision while she worsens",
        reasoning: "missed",
        drive: (c) => {
          test(c, "dip");
          test(c, "meds");
          toEnd(c);
        },
      },
    ],
  };
}
