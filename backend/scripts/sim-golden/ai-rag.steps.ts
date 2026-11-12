// REQ-238: golden paths for the SecAI+ retrieval data-leak incident on the
// security console (SECAIPLUS/rag-assistant-data-leak.sim.json). No
// prototype exists, so the expectations are the engine's own results.
import type { StepPath, StepsSpec } from "./steps.ts";
import { close, task, watchUntil } from "./secplus-helpers.ts";

export const ENTRY = { course: "SECAIPLUS", slug: "rag-assistant-data-leak" };

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}

export function paths(): StepPath[] {
  return [
    {
      id: "expert",
      title: "Privacy in, read the logs, disable the contractor, preserve, permission-aware retrieval by 21 min, review the connector, list recipients, masking; notify everyone who must act",
      reasoning: "met",
      drive: (c) => {
        task(c, "escalate");
        task(c, "reviewLogs");
        task(c, "suspendContractor");
        task(c, "preserve");
        task(c, "restrictRetrieval", { how: "permissionAware" });
        task(c, "reviewConnector");
        task(c, "listExposed");
        task(c, "redact");
        close(c);
        c.act("notify", { who: "full" });
        c.act("document", { cause: "connector", who: "four" });
      },
    },
    {
      id: "promptOnly",
      title: "Adds a line to the system prompt and masks numbers: the contractor moves to contracts, then scripts the API key and walks every folder by 50 min",
      reasoning: "missed",
      drive: (c) => {
        task(c, "restrictRetrieval", { how: "promptOnly" });
        task(c, "redact");
        watchUntil(c, 90);
        c.answer();
        c.act("notify", { who: "it" });
        c.act("document", { cause: "inject", who: "one" });
      },
    },
    {
      id: "deleteFirst",
      title: "Reads the logs, disables the contractor and deletes the HR and Finance collections before keeping any logs or manifest",
      reasoning: "partial",
      drive: (c) => {
        task(c, "escalate");
        task(c, "reviewLogs");
        task(c, "suspendContractor");
        task(c, "restrictRetrieval", { how: "removed" });
        task(c, "listExposed");
        close(c);
        c.act("notify", { who: "full" });
        c.act("document", { cause: "connector", who: "four" });
      },
    },
    {
      id: "contractorOnly",
      title: "Disables the contractor and investigates fully, but leaves retrieval as it was for everyone else",
      reasoning: "partial",
      drive: (c) => {
        task(c, "escalate");
        task(c, "reviewLogs");
        task(c, "suspendContractor");
        task(c, "preserve");
        task(c, "listExposed");
        close(c);
        c.act("notify", { who: "nobody" });
        c.act("document", { cause: "connector", who: "four" });
      },
    },
    {
      id: "assistantOff",
      title: "Turns AskOps off at once, then preserves, investigates and disables the contractor: safe, but nothing fixed and the assistant is gone",
      reasoning: "partial",
      drive: (c) => {
        task(c, "assistantOff");
        task(c, "preserve");
        task(c, "reviewLogs");
        task(c, "reviewConnector");
        task(c, "listExposed");
        task(c, "suspendContractor");
        task(c, "escalate");
        close(c);
        c.act("notify", { who: "full" });
        c.act("document", { cause: "connector", who: "four" });
      },
    },
    {
      id: "lateFix",
      title: "Investigates the connector and recipients first; the contractor reaches contracts at 15 min; fixed at 41 min with permission-aware retrieval",
      reasoning: "partial",
      drive: (c) => {
        task(c, "reviewConnector");
        task(c, "reviewLogs");
        task(c, "listExposed");
        task(c, "suspendContractor");
        task(c, "preserve");
        task(c, "listExposed");
        task(c, "restrictRetrieval", { how: "permissionAware" });
        task(c, "escalate");
        close(c);
        c.act("notify", { who: "full" });
        c.act("document", { cause: "connector", who: "four" });
      },
    },
  ];
}
