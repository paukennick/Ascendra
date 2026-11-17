// REQ-313: golden paths for the CISM business case on the governance board
// (CISM/cism-security-business-case-budget.sim.json). No prototype exists, so
// the expectations are the engine's own results.
import type { StepPath, StepsSpec } from "./steps.ts";
import { helpers } from "./gov-helpers.ts";

export const ENTRY = { course: "CISM", slug: "cism-security-business-case-budget" };

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}

const DAY = 86400;
const { task, watchUntil, close } = helpers("quarter", "busy", "work", "watch", "closeQuarter");
type C = Parameters<StepPath["drive"]>[0];
const pkg = (c: C, p: Partial<Record<"backups" | "mfa" | "callback" | "mdr" | "siem", "in" | "out">>) =>
  task(c, "package", { backups: "in", mfa: "in", callback: "in", mdr: "in", siem: "out", ...p });
const record = (c: C, treat: string, report: string) => c.act("document", { treat, report });

export function paths(): StepPath[] {
  return [
    {
      id: "expert",
      title: "Quantifies with Finance, maps the strategy, brings the CFO and COO along, submits 550 thousand within budget, the COO accepts the residual wire risk, answers the chair in business terms",
      reasoning: "met",
      drive: (c) => {
        task(c, "quantify");
        task(c, "mapStrategy");
        task(c, "meetCfo");
        task(c, "meetCoo");
        pkg(c, {});
        task(c, "submit");
        task(c, "ownerAccept");
        watchUntil(c, 21 * DAY);
        task(c, "briefChair");
        watchUntil(c, 91 * DAY);
        close(c);
        record(c, "owners", "risk");
      },
    },
    {
      id: "noWireControl",
      title: "A good case for ransomware, but the call-back control left out and no owner acceptance: wire fraud stays above appetite",
      reasoning: "partial",
      drive: (c) => {
        task(c, "quantify");
        task(c, "mapStrategy");
        task(c, "meetCfo");
        task(c, "meetCoo");
        pkg(c, { callback: "out" });
        task(c, "submit");
        watchUntil(c, 21 * DAY);
        task(c, "briefChair");
        watchUntil(c, 91 * DAY);
        close(c);
        record(c, "owners", "risk");
      },
    },
    {
      id: "dashboard",
      title: "The expert case, but the chair gets a dashboard of blocked attacks instead of an answer",
      reasoning: "partial",
      drive: (c) => {
        task(c, "quantify");
        task(c, "mapStrategy");
        task(c, "meetCfo");
        task(c, "meetCoo");
        pkg(c, {});
        task(c, "submit");
        task(c, "ownerAccept");
        watchUntil(c, 21 * DAY);
        task(c, "dashChair");
        watchUntil(c, 91 * DAY);
        close(c);
        record(c, "owners", "activity");
      },
    },
    {
      id: "selfAccept",
      title: "Builds the case but accepts the wire fraud risk personally instead of asking its owner",
      reasoning: "missed",
      drive: (c) => {
        task(c, "quantify");
        task(c, "meetCfo");
        task(c, "mapStrategy");
        pkg(c, {});
        task(c, "submit");
        task(c, "cisoAccept");
        watchUntil(c, 21 * DAY);
        task(c, "briefChair");
        watchUntil(c, 91 * DAY);
        close(c);
        record(c, "ciso", "risk");
      },
    },
    {
      id: "siemAfterBoard",
      title: "Gets the case approved, then signs the SIEM premium order outside the budget process",
      reasoning: "missed",
      drive: (c) => {
        task(c, "quantify");
        task(c, "mapStrategy");
        task(c, "meetCfo");
        task(c, "meetCoo");
        pkg(c, {});
        task(c, "submit");
        task(c, "ownerAccept");
        watchUntil(c, 21 * DAY);
        task(c, "briefChair");
        watchUntil(c, 43 * DAY);
        task(c, "signSiem");
        watchUntil(c, 91 * DAY);
        close(c);
        record(c, "owners", "activity");
      },
    },
    {
      id: "noCase",
      title: "Talks to the CFO about threats, never quantifies or submits a case: the attack in week 11 finds backups that encrypt with everything else",
      reasoning: "missed",
      drive: (c) => {
        task(c, "meetCfo");
        watchUntil(c, 91 * DAY);
        close(c);
        record(c, "none", "activity");
      },
    },
  ];
}
