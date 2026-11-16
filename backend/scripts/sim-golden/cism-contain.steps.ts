// REQ-274: golden paths for the CISM containment-method case on the security
// console (CISM/cism-checkout-skimmer-containment.sim.json). No prototype
// exists, so the expectations are the engine's own results.
import type { StepPath, StepsSpec } from "./steps.ts";
import { close, task, watchUntil } from "./secplus-helpers.ts";

export const ENTRY = { course: "CISM", slug: "cism-checkout-skimmer-containment" };

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}

type C = Parameters<StepPath["drive"]>[0];
const report = (c: C, who: string, method: string, duty: string) => {
  c.act("notify", { who });
  c.act("document", { method, duty });
};

export function paths(): StepPath[] {
  return [
    {
      id: "expert",
      title: "Reads the diff, saves the evidence, switches to the hosted page at 9 min, disables web-ed, removes the script, briefs the VP, notifies the acquirer, reads the CMS log",
      reasoning: "met",
      drive: (c) => {
        task(c, "readDiff");
        task(c, "preserve");
        task(c, "hosted");
        task(c, "disableAdmin");
        task(c, "remove");
        task(c, "consultOwner");
        task(c, "acquirer");
        task(c, "auditCms");
        close(c);
        report(c, "owners", "hosted", "acquirer");
      },
    },
    {
      id: "offlineFast",
      title: "Takes the whole store offline at 4 min without the VP, then saves, disables, removes and notifies the acquirer",
      reasoning: "partial",
      drive: (c) => {
        task(c, "readDiff");
        task(c, "offline");
        task(c, "preserve");
        task(c, "disableAdmin");
        task(c, "remove");
        task(c, "acquirer");
        close(c);
        report(c, "owners", "offline", "acquirer");
      },
    },
    {
      id: "removeFirst",
      title: "Deletes the script at 4 min before saving anything, then disables web-ed and switches to the hosted page",
      reasoning: "partial",
      drive: (c) => {
        task(c, "readDiff");
        task(c, "remove");
        task(c, "disableAdmin");
        task(c, "hosted");
        close(c);
        report(c, "owners", "hosted", "none");
      },
    },
    {
      id: "cspOnly",
      title: "Blocks the skimmer's domain and watches: the script moves to a new domain and runs for the hour",
      reasoning: "missed",
      drive: (c) => {
        task(c, "readDiff");
        task(c, "cspBlock");
        watchUntil(c, 70);
        close(c);
        report(c, "nobody", "blockOnly", "none");
      },
    },
    {
      id: "hostedOnly",
      title: "Saves the evidence and switches to the hosted page fast, briefs the VP and the acquirer, but leaves web-ed active and the script in place",
      reasoning: "partial",
      drive: (c) => {
        task(c, "readDiff");
        task(c, "preserve");
        task(c, "hosted");
        task(c, "consultOwner");
        task(c, "acquirer");
        close(c);
        report(c, "owners", "hosted", "acquirer");
      },
    },
    {
      id: "lateHosted",
      title: "Investigates and briefs the VP first; the hosted switch at 18 min comes after about 120 cards were taken; then a clean finish",
      reasoning: "partial",
      drive: (c) => {
        task(c, "readDiff");
        task(c, "auditCms");
        task(c, "consultOwner");
        task(c, "preserve");
        task(c, "hosted");
        task(c, "disableAdmin");
        task(c, "remove");
        task(c, "acquirer");
        close(c);
        report(c, "owners", "hosted", "acquirer");
      },
    },
  ];
}
