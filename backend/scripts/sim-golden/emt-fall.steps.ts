// REQ-338 (docs/sims.md 22.42): golden paths for
// NREMTEMT/emt-head-bump-on-a-blood-thinner. No prototype; the expectations
// are the engine's own results.
//
//   npm run sim:golden -- steps emt-fall
import type { Ctl, StepPath, StepsSpec } from "./steps.ts";
import { pace, teach } from "./s2b-helpers.ts";
import { act, toEnd, v, when } from "./ems-helpers.ts";

export const ENTRY = { course: "NREMTEMT", slug: "emt-head-bump-on-a-blood-thinner" };

function history(c: Ctl): void {
  act(c, "history");
  teach(c);
  when(c, (x) => v(x, "hPending") === false);
}
function vitals(c: Ctl): void {
  act(c, "vitals");
  when(c, (x) => v(x, "vPending") === false);
}
const vomited = (c: Ctl): boolean => v(c, "vomitAt") !== null;

export function paths(): StepPath[] {
  return [
    {
      id: "expert",
      title: "Expert at study pace: primary assessment, a full history (apixaban), vital signs and GCS; the risk explained; to the trauma center; on her side and suctioned when she vomits, re-measured, hospital notified",
      reasoning: "met",
      drive: (c) => {
        pace(c, 3);
        act(c, "look");
        history(c);
        vitals(c);
        act(c, "explain");
        act(c, "transport", { to: "trauma" });
        when(c, vomited);
        act(c, "side");
        act(c, "suction");
        vitals(c);
        act(c, "notify");
        toEnd(c);
      },
    },
    {
      id: "closest",
      title: "History and vital signs, the risk explained, but to the closest community hospital; she vomits on the way and is turned and re-measured",
      reasoning: "partial",
      drive: (c) => {
        history(c);
        vitals(c);
        act(c, "explain");
        act(c, "transport", { to: "local" });
        when(c, vomited);
        act(c, "side");
        vitals(c);
        act(c, "notify");
        toEnd(c);
      },
    },
    {
      id: "noMedsNoRecheck",
      title: "Never asks about medications; talks her into going 'to be safe'; trauma center; turned when she vomits but never re-measured",
      reasoning: "partial",
      drive: (c) => {
        act(c, "look");
        vitals(c);
        act(c, "explain");
        act(c, "transport", { to: "trauma" });
        when(c, vomited);
        act(c, "side");
        act(c, "notify");
        toEnd(c);
      },
    },
    {
      id: "aspirated",
      title: "History and the trauma center, but nobody turns her when she vomits",
      reasoning: "partial",
      drive: (c) => {
        history(c);
        act(c, "explain");
        act(c, "transport", { to: "trauma" });
        when(c, (x) => v(x, "aspirated") === true);
        act(c, "side");
        act(c, "suction");
        toEnd(c);
      },
    },
    {
      id: "signedRefusal",
      title: "Primary assessment and vital signs, then her refusal signed without asking about medications or explaining the risk",
      reasoning: "missed",
      drive: (c) => {
        act(c, "look");
        vitals(c);
        act(c, "refuse");
        toEnd(c);
      },
    },
  ];
}

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}
