// REQ-313: golden paths for the CC credential-sharing conversation on the
// session screen at level 2 (ISC2CC/cc-ethics-shared-credentials.sim.json).
// The expectations are the engine's own results.
import type { StepPath, StepsSpec } from "./steps.ts";
import { helpers } from "./gov-helpers.ts";

export const ENTRY = { course: "ISC2CC", slug: "cc-ethics-shared-credentials" };

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}

const { task, watchUntil, close } = helpers("conversation", "talking", "talk", "wait", "endTalk");
type C = Parameters<StepPath["drive"]>[0];
const note = (c: C, n: string) => c.act("note", { note: n });

export function paths(): StepPath[] {
  return [
    {
      id: "expert",
      title: "Asks what moves and why not the emergency route, acknowledges the deadline, declines and offers a named temporary account, keeps logging on, writes a factual note",
      reasoning: "met",
      drive: (c) => {
        task(c, "askScope");
        task(c, "askWhy");
        task(c, "ack");
        task(c, "route");
        watchUntil(c, 9 * 60);
        task(c, "keepLogs");
        close(c);
        note(c, "factual");
      },
    },
    {
      id: "flatNo",
      title: "Refuses flatly with no way forward, keeps logging on; Sam insists and nobody above him hears",
      reasoning: "partial",
      drive: (c) => {
        task(c, "askScope");
        task(c, "refuse");
        watchUntil(c, 9 * 60);
        task(c, "keepLogs");
        watchUntil(c, 13 * 60);
        close(c);
        note(c, "factual");
      },
    },
    {
      id: "lateRoute",
      title: "Listens for a long time, offers the route only after Sam insists, then escalates properly",
      reasoning: "partial",
      drive: (c) => {
        task(c, "askScope");
        task(c, "checkPolicy");
        watchUntil(c, 9 * 60);
        task(c, "keepLogs");
        watchUntil(c, 21 * 60);
        task(c, "route");
        task(c, "escalate");
        close(c);
        note(c, "factual");
      },
    },
    {
      id: "share",
      title: "Shares the credentials to help, then declines the logging request",
      reasoning: "missed",
      drive: (c) => {
        task(c, "ack");
        task(c, "share");
        watchUntil(c, 9 * 60);
        task(c, "keepLogs");
        close(c);
        note(c, "none");
      },
    },
    {
      id: "logsOff",
      title: "Offers the right route, then agrees to switch off audit logging",
      reasoning: "missed",
      drive: (c) => {
        task(c, "askScope");
        task(c, "route");
        watchUntil(c, 9 * 60);
        task(c, "logsOff");
        close(c);
        note(c, "factual");
      },
    },
    {
      id: "threatPost",
      title: "Threatens HR and posts in the team channel; never offers a route; no note",
      reasoning: "missed",
      drive: (c) => {
        task(c, "threaten");
        task(c, "post");
        watchUntil(c, 30 * 60);
        note(c, "none");
      },
    },
  ];
}
