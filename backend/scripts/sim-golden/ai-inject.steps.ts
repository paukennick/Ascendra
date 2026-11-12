// REQ-238: golden paths for the SecAI+ indirect prompt injection incident on
// the security console (SECAIPLUS/agent-indirect-prompt-injection.sim.json).
// No prototype exists, so the expectations are the engine's own results.
import type { StepPath, StepsSpec } from "./steps.ts";
import { close, task, watchUntil } from "./secplus-helpers.ts";

export const ENTRY = { course: "SECAIPLUS", slug: "agent-indirect-prompt-injection" };

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}

export function paths(): StepPath[] {
  return [
    {
      id: "expert",
      title: "Escalate, read the logs, close the image channel and quarantine untrusted input by 15 min, human approval for high-impact tools, preserve, search; notify everyone with a stake",
      reasoning: "met",
      drive: (c) => {
        task(c, "escalate");
        task(c, "reviewLogs");
        task(c, "blockEgress");
        task(c, "quarantineInbound");
        task(c, "restrictTools", { how: "hitl" });
        task(c, "preserve");
        task(c, "searchKb");
        close(c);
        c.act("notify", { who: "full" });
        c.act("document", { cause: "indirect", data: "sent" });
      },
    },
    {
      id: "promptOnly",
      title: "Without reading the logs, adds a line to the system prompt: the forum article is poisoned at 25 min and the agent pays out refunds at 45",
      reasoning: "missed",
      drive: (c) => {
        task(c, "restrictTools", { how: "promptOnly" });
        watchUntil(c, 90);
        c.answer();
        c.act("notify", { who: "it" });
        c.act("document", { cause: "jailbreak", data: "none" });
      },
    },
    {
      id: "agentOff",
      title: "Turns the agent off at once, then preserves, investigates and searches: safe, but support is down",
      reasoning: "partial",
      drive: (c) => {
        task(c, "agentOff");
        task(c, "preserve");
        task(c, "reviewLogs");
        task(c, "searchKb");
        task(c, "escalate");
        close(c);
        c.act("notify", { who: "full" });
        c.act("document", { cause: "indirect", data: "sent" });
      },
    },
    {
      id: "purgeFirst",
      title: "Closes the channel and gates the tools, finds the poisoned article and deletes it before keeping any evidence",
      reasoning: "partial",
      drive: (c) => {
        task(c, "reviewLogs");
        task(c, "blockEgress");
        task(c, "restrictTools", { how: "hitl" });
        watchUntil(c, 26);
        task(c, "searchKb");
        task(c, "purgeKb");
        task(c, "quarantineInbound");
        close(c);
        c.act("notify", { who: "full" });
        c.act("document", { cause: "indirect", data: "sent" });
      },
    },
    {
      id: "lateQuarantine",
      title: "Watches until 26 min: the forum article is poisoned; then closes the channel, gates the tools, quarantines, preserves, finds and removes the article",
      reasoning: "partial",
      drive: (c) => {
        task(c, "reviewLogs");
        watchUntil(c, 26);
        task(c, "blockEgress");
        task(c, "restrictTools", { how: "hitl" });
        task(c, "quarantineInbound");
        task(c, "preserve");
        task(c, "searchKb");
        task(c, "purgeKb");
        task(c, "escalate");
        close(c);
        c.act("notify", { who: "full" });
        c.act("document", { cause: "indirect", data: "sent" });
      },
    },
    {
      id: "egressOnly",
      title: "Blocks the image channel and preserves, but leaves the tools and the inbox as they were",
      reasoning: "partial",
      drive: (c) => {
        task(c, "blockEgress");
        task(c, "reviewLogs");
        task(c, "preserve");
        close(c);
        c.act("notify", { who: "nobody" });
        c.act("document", { cause: "indirect", data: "sent" });
      },
    },
  ];
}
