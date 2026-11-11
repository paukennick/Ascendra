// REQ-223 (batch S2b): golden paths for CNA/resident-found-on-floor.
// No prototype exists, so the expectations are the engine's own results,
// re-checked by every `npm test`.
//
//   npm run sim:golden -- steps resident-floor
import type { Ctl, StepsSpec } from "./steps.ts";
import { at, chapters, pace, teach, until, v } from "./s2b-helpers.ts";

export const ENTRY = { course: "CNA", slug: "resident-found-on-floor" };

const FULL = { found: "obj", said: "quote", flag: "thinner" };
const WEAK = { found: "interp", said: "vague", flag: "none" };

function prompted(c: Ctl, choice: string): void {
  until(c, (x) => x.run.state.openPrompt !== null || x.run.state.ended !== null);
  if (c.run.state.openPrompt) c.choose(choice);
}

function finish(c: Ctl, note: string, plan: string): void {
  until(c, (x) => x.run.state.phase === "after" || x.run.state.ended !== null, 5000);
  chapters(c);
  if (c.run.state.ended) return;
  c.act("document", { note });
  c.act("prevent", { plan });
}

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Expert path at study pace: call light at once, stays, keeps her still and warm, objective report, change reported at once",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          at(c, 5);
          c.act("callLight");
          teach(c);
          c.act("stayStill");
          c.act("ask");
          c.act("lookOver");
          c.act("blanket");
          c.act("pressure");
          prompted(c, "stay");
          until(c, (x) => v(x, "nurseHere") === true);
          c.act("report", FULL);
          until(c, (x) => v(x, "vitalsAsked") === true);
          c.act("vitals");
          c.act("reportVitals");
          teach(c);
          c.act("watch");
          teach(c);
          until(c, (x) => v(x, "changed") === true);
          at(c, c.run.state.tick + 20);
          c.act("watch");
          c.act("tellChange");
          finish(c, "obj", "universal");
        },
      },
      {
        id: "slowSafe",
        title: "Calls after a minute, no blanket, report with opinion, change reported after 5 minutes",
        reasoning: "met",
        drive: (c) => {
          at(c, 40);
          c.act("ask");
          prompted(c, "stay");
          at(c, 70);
          c.act("callLight");
          until(c, (x) => v(x, "nurseHere") === true);
          c.act("report", WEAK);
          until(c, (x) => v(x, "vitalsAsked") === true);
          c.act("vitals");
          c.act("reportVitals");
          until(c, (x) => v(x, "changed") === true);
          at(c, c.run.state.tick + 300);
          c.act("tellChange");
          finish(c, "obj", "universal");
        },
      },
      {
        id: "leftButTold",
        title: "Tells her to stay still, then leaves to find the nurse; no vital signs, the change is never reported, rails suggested",
        reasoning: "partial",
        drive: (c) => {
          at(c, 5);
          c.act("stayStill");
          c.act("leave");
          until(c, (x) => v(x, "nurseHere") === true);
          c.act("report", WEAK);
          finish(c, "opinion", "rails");
        },
      },
      {
        id: "helpedUp",
        title: "Asks what happened, then helps her up when she asks",
        reasoning: "missed",
        drive: (c) => {
          at(c, 10);
          c.act("ask");
          prompted(c, "up");
        },
      },
      {
        id: "leftAlone",
        title: "Leaves at once to find the nurse without a word; she tries to get up alone",
        reasoning: "missed",
        drive: (c) => {
          at(c, 8);
          c.act("leave");
          until(c, (x) => x.run.state.ended !== null, 5000);
        },
      },
    ],
  };
}
