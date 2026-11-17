// REQ-313: golden paths for the CISSP audit-finding conversation on the
// session screen at level 2 (CISSP/cissp-ethics-audit-finding-pressure.sim.json).
// The expectations are the engine's own results.
import type { StepPath, StepsSpec } from "./steps.ts";
import { helpers } from "./gov-helpers.ts";

export const ENTRY = { course: "CISSP", slug: "cissp-ethics-audit-finding-pressure" };

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
      title: "Finds the contract gap and the three-week fix, acknowledges her concern, discloses the offer, keeps it critical with a fix and the owner's acceptance, writes a factual note",
      reasoning: "met",
      drive: (c) => {
        task(c, "askVendor");
        task(c, "ack");
        task(c, "askComp");
        task(c, "coi");
        task(c, "propose");
        close(c);
        note(c, "factual");
      },
    },
    {
      id: "holdOnly",
      title: "Holds the rating with no proposal; she says she will edit it and he goes to the chief audit executive; the offer never disclosed",
      reasoning: "partial",
      drive: (c) => {
        task(c, "askVendor");
        task(c, "readCode");
        task(c, "hold");
        watchUntil(c, 16 * 60);
        task(c, "escalate");
        close(c);
        note(c, "factual");
      },
    },
    {
      id: "slowPropose",
      title: "Reads, listens and discloses the offer, but proposes the fix only after 20 minutes",
      reasoning: "partial",
      drive: (c) => {
        task(c, "readCode");
        task(c, "ack");
        task(c, "askVendor");
        task(c, "coi");
        task(c, "askComp");
        watchUntil(c, 21 * 60);
        task(c, "propose");
        close(c);
        note(c, "factual");
      },
    },
    {
      id: "downgrade",
      title: "Agrees to rate it medium for the sake of the relationship",
      reasoning: "missed",
      drive: (c) => {
        task(c, "ack");
        task(c, "downgrade");
        close(c);
        note(c, "none");
      },
    },
    {
      id: "leak",
      title: "Holds the rating, then sends the draft to a reporter friend",
      reasoning: "missed",
      drive: (c) => {
        task(c, "hold");
        task(c, "leak");
        close(c);
        note(c, "factual");
      },
    },
    {
      id: "aroundProcess",
      title: "Keeps it critical with a proposal but goes around the process to the committee chair and never discloses the offer",
      reasoning: "missed",
      drive: (c) => {
        task(c, "askComp");
        task(c, "propose");
        watchUntil(c, 7 * 60);
        task(c, "boardChair");
        close(c);
        note(c, "none");
      },
    },
  ];
}
