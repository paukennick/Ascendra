// REQ-323 (health breadth): golden paths for
// ABPTSPWCS/prenatal-exercise-severe-bp-headache. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps pwcs-preeclampsia
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "ABPTSPWCS", slug: "prenatal-exercise-severe-bp-headache" };

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
        title: "Expert at study pace: warning symptoms first, a severe-range pressure confirmed, no exercise, left side, labor and delivery and 911, obstetric provider told",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          test(c, "sym");
          test(c, "bp");
          test(c, "bp2");
          act(c, "side");
          act(c, "diagnose", { dx: "pe" });
          act(c, "refer", { how: "ems" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "partnerDrives",
        title: "A full check and a correct impression, but sent by her partner's car after the session",
        reasoning: "partial",
        drive: (c) => {
          test(c, "sym");
          test(c, "bp");
          test(c, "bp2");
          test(c, "edema");
          act(c, "side");
          act(c, "diagnose", { dx: "pe" });
          act(c, "refer", { how: "drive" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateCall",
        title: "Thorough history and exam, then 911 more than 10 minutes after the first warning sign; not positioned",
        reasoning: "partial",
        drive: (c) => {
          test(c, "hx");
          test(c, "ob");
          test(c, "sym");
          test(c, "edema");
          test(c, "bp");
          test(c, "bp2");
          upTo(c, 220);
          act(c, "diagnose", { dx: "pe" });
          act(c, "refer", { how: "ems" });
          toEnd(c);
        },
      },
      {
        id: "exercisedAnyway",
        title: "Hears the headache and spots, then does the bike and supine work anyway before measuring and calling 911",
        reasoning: "partial",
        drive: (c) => {
          test(c, "sym");
          act(c, "bike");
          act(c, "supine");
          act(c, "side");
          test(c, "bp");
          test(c, "bp2");
          act(c, "diagnose", { dx: "pe" });
          act(c, "refer", { how: "ems" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "messageOnly",
        title: "Failure: hears the symptoms, records a tension headache, leaves a message and exercises her",
        reasoning: "missed",
        drive: (c) => {
          test(c, "hx");
          test(c, "sym");
          act(c, "diagnose", { dx: "tension" });
          act(c, "refer", { how: "msg" });
          act(c, "bike");
          toEnd(c);
        },
      },
      {
        id: "noScreen",
        title: "Failure: straight to the exercise plan with no symptom check or blood pressure",
        reasoning: "missed",
        drive: (c) => {
          act(c, "bike");
          act(c, "supine");
          test(c, "hx");
          toEnd(c);
        },
      },
    ],
  };
}
