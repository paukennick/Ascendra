// REQ-334: golden paths for BSNRN/handover-argument-skip-the-pump-check, a professional-ethics
// conversation on the session screen (level 2), built on the REQ-313 mechanics.
// The expectations are the engine's own results.
//
//   npm run sim:golden -- steps bsn-conflict
import type { StepPath, StepsSpec } from "./steps.ts";
import { helpers } from "./gov-helpers.ts";

export const ENTRY = { course: "BSNRN", slug: "handover-argument-skip-the-pump-check" };

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}

const { task, watchUntil, close } = helpers("conversation", "talking", "talk", "wait", "endTalk");
type C = Parameters<StepPath["drive"]>[0];
const note = (c: C, n: string) => c.act("note", { note: n });
const ESC = false;

export function paths(): StepPath[] {
  return [
    { id: "expert", title: "Asks before answering, acknowledges the pressure, declines and offers the proper route, refuses the second request, escalates through the proper channel where needed, writes a factual note", reasoning: "met",
      drive: (c) => { task(c, "askScope"); task(c, "askWhy"); task(c, "ack"); task(c, "route"); if (ESC) task(c, "escalate"); watchUntil(c, 9 * 60); task(c, "keepLogs"); close(c); note(c, "factual"); } },
    { id: "flatNo", title: "Refuses flatly with no way forward, refuses the second request; nobody else hears", reasoning: "partial",
      drive: (c) => { task(c, "askScope"); task(c, "refuse"); watchUntil(c, 9 * 60); task(c, "keepLogs"); watchUntil(c, 13 * 60); close(c); note(c, "factual"); } },
    { id: "lateRoute", title: "Listens a long time, offers the route only after being pressed, then escalates properly", reasoning: "partial",
      drive: (c) => { task(c, "askScope"); task(c, "checkPolicy"); watchUntil(c, 9 * 60); task(c, "keepLogs"); watchUntil(c, 21 * 60); task(c, "route"); task(c, "escalate"); close(c); note(c, "factual"); } },
    { id: "share", title: "Gives in to the first request, then refuses the second", reasoning: "missed",
      drive: (c) => { task(c, "ack"); task(c, "share"); watchUntil(c, 9 * 60); task(c, "keepLogs"); close(c); note(c, "none"); } },
    { id: "logsOff", title: "Offers the proper route, then gives in to the second request", reasoning: "missed",
      drive: (c) => { task(c, "askScope"); task(c, "route"); watchUntil(c, 9 * 60); task(c, "logsOff"); close(c); note(c, "factual"); } },
    { id: "threatPost", title: "Threatens and posts publicly; never offers a route; no note", reasoning: "missed",
      drive: (c) => { task(c, "threaten"); task(c, "post"); watchUntil(c, 30 * 60); note(c, "none"); } },
  ];
}
