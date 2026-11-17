// REQ-326 (sims-health-4, docs/sims.md 22.34): golden paths for
// FNPANCC/clinic-swollen-lip-years-on-lisinopril. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps fnp-angio
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "FNPANCC", slug: "clinic-swollen-lip-years-on-lisinopril" };

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
// Wait for the red flag (0.5 on the authored course), then reassess to find it.
function untilRed(c: Ctl): void {
  until(c, (x) => (x.value("prog") as number) >= 0.5 || ended(x));
  act(c, "reassess");
}

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Expert at study pace: drug stopped, sitting up with oxygen, airway exam, reassess; at the voice change 911 now; hand-off",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          act(c, "fix");
          act(c, "up");
          test(c, "airway");
          act(c, "reassess");
          untilRed(c);
          act(c, "diagnose", { dx: "acei" });
          act(c, "refer", { how: "ems" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateCall",
        title: "Stops the drug and watches well, but calls 911 more than 5 minutes after the voice change",
        reasoning: "partial",
        drive: (c) => {
          act(c, "fix");
          act(c, "up");
          test(c, "airway");
          act(c, "reassess");
          untilRed(c);
          upTo(c, c.run.state.tick + 78);
          act(c, "diagnose", { dx: "acei" });
          act(c, "refer", { how: "ems" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "wrongRoute",
        title: "Failure: stops the drug and looks in the mouth, then calls it an allergy and sends him home",
        reasoning: "missed",
        drive: (c) => {
          act(c, "fix");
          test(c, "airway");
          untilRed(c);
          act(c, "diagnose", { dx: "allergy" });
          act(c, "refer", { how: "home" });
          toEnd(c);
        },
      },
      {
        id: "unsafe",
        title: "Failure: checks the skin, then gives an antihistamine and sends him to work",
        reasoning: "missed",
        drive: (c) => {
          test(c, "skin");
          act(c, "unsafe");
          toEnd(c);
        },
      },
      {
        id: "noAction",
        title: "Failure: skin, medicines and airway exam, calls it dental; the drug isn't stopped and no call",
        reasoning: "missed",
        drive: (c) => {
          test(c, "skin");
          test(c, "meds");
          test(c, "airway");
          act(c, "diagnose", { dx: "dental" });
          toEnd(c);
        },
      },
    ],
  };
}
