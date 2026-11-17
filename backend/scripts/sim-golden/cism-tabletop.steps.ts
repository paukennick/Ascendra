// REQ-313: golden paths for the CISM ransomware tabletop
// (CISM/cism-ransomware-tabletop.sim.json); the CC and Security+ bands reuse
// them. The expectations are the engine's own results.
import type { StepPath, StepsSpec } from "./steps.ts";
import { helpers } from "./gov-helpers.ts";

export const ENTRY = { course: "CISM", slug: "cism-ransomware-tabletop" };

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}

const H = 3600;
const { task, watchUntil, close } = helpers("exercise", "busy", "work", "watch", "endEx");
type C = Parameters<StepPath["drive"]>[0];
const aar = (c: C, plan: string) => c.act("afterAction", { plan });

export function paths(): StepPath[] {
  return [
    {
      id: "expert",
      title: "Declares at once, briefs the COO, finds all three gaps, counsel at the leak claim, a cleared holding statement, restore in BIA order, payment to the executive with the checks, every gap owned",
      reasoning: "met",
      drive: (c) => {
        task(c, "declare");
        task(c, "brief");
        task(c, "askOob");
        task(c, "staff");
        watchUntil(c, 2 * H);
        task(c, "counsel");
        task(c, "askInsurer");
        watchUntil(c, 5 * H);
        task(c, "mediaLine", { m: "cleared" });
        watchUntil(c, 27 * H);
        task(c, "askBia");
        task(c, "restoreOrder", { r: "bia" });
        watchUntil(c, 32 * H);
        task(c, "payment", { p: "refer" });
        close(c);
        aar(c, "owned");
      },
    },
    {
      id: "gapsListed",
      title: "Runs the exercise well but finds only one gap and leaves it unowned",
      reasoning: "partial",
      drive: (c) => {
        task(c, "declare");
        task(c, "brief");
        task(c, "staff");
        watchUntil(c, 2 * H);
        task(c, "counsel");
        task(c, "askInsurer");
        watchUntil(c, 5 * H);
        task(c, "mediaLine", { m: "cleared" });
        watchUntil(c, 27 * H);
        task(c, "restoreOrder", { r: "bia" });
        watchUntil(c, 32 * H);
        task(c, "payment", { p: "refer" });
        close(c);
        aar(c, "listed");
      },
    },
    {
      id: "slowTable",
      title: "Lets each inject sit for hours before deciding; no comment to the reporter; refuses to pay outright; gaps owned",
      reasoning: "partial",
      drive: (c) => {
        watchUntil(c, 2 * H);
        task(c, "declare");
        task(c, "askOob");
        task(c, "askInsurer");
        task(c, "askBia");
        watchUntil(c, 5 * H);
        task(c, "counsel");
        task(c, "brief");
        task(c, "mediaLine", { m: "none" });
        watchUntil(c, 29 * H);
        task(c, "restoreOrder", { r: "bia" });
        watchUntil(c, 34 * H);
        task(c, "payment", { p: "never" });
        close(c);
        aar(c, "owned");
      },
    },
    {
      id: "uncleared",
      title: "Releases the full details to the reporter before counsel is in, and restores everything from the newest backups",
      reasoning: "missed",
      drive: (c) => {
        task(c, "declare");
        task(c, "staff");
        watchUntil(c, 5 * H);
        task(c, "mediaLine", { m: "detail" });
        task(c, "counsel");
        watchUntil(c, 27 * H);
        task(c, "restoreOrder", { r: "all" });
        watchUntil(c, 32 * H);
        task(c, "payment", { p: "refer" });
        close(c);
        aar(c, "listed");
      },
    },
    {
      id: "pay",
      title: "Runs the first day well, then agrees with the CFO to pay",
      reasoning: "missed",
      drive: (c) => {
        task(c, "declare");
        task(c, "brief");
        watchUntil(c, 2 * H);
        task(c, "counsel");
        watchUntil(c, 5 * H);
        task(c, "mediaLine", { m: "cleared" });
        watchUntil(c, 27 * H);
        task(c, "restoreOrder", { r: "bia" });
        watchUntil(c, 32 * H);
        task(c, "payment", { p: "pay" });
        close(c);
        aar(c, "owned");
      },
    },
    {
      id: "noReport",
      title: "Never activates the plan, lets the story run, and ends with no after-action report",
      reasoning: "missed",
      drive: (c) => {
        watchUntil(c, 36 * H);
        aar(c, "none");
      },
    },
  ];
}
