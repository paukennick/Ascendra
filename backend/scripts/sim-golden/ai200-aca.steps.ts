// REQ-269: golden paths for the AI-200 Container Apps revision failure on
// the terminal screen (AI200/ai200-containerapp-keyvault-revision.sim.json).
// No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "AI200", slug: "ai200-containerapp-keyvault-revision" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Revision list and system logs show a 403 on the Key Vault reference; identity has no roles; Key Vault Secrets User on kv-recs; new revision v42b takes traffic; health check",
        reasoning: "met",
        drive: (c) => {
          run(c, "revList");
          run(c, "sysLogs");
          run(c, "identity");
          run(c, "roles");
          run(c, "grantSecretsUser");
          run(c, "newRevision");
          run(c, "curl");
          close(c);
          c.act("document", { cause: "kvRole", prevent: "roleInIac" });
        },
      },
      {
        id: "adminRole",
        title: "Reads the system log, grants Key Vault Administrator on the whole subscription, new revision works",
        reasoning: "partial",
        drive: (c) => {
          run(c, "sysLogs");
          run(c, "grantAdmin");
          run(c, "newRevision");
          run(c, "curl");
          close(c);
          c.act("document", { cause: "kvRole", prevent: "adminRole" });
        },
      },
      {
        id: "plainSecret",
        title: "Pastes the password back as a plain secret; v42b serves until the 10:45 rotation breaks it",
        reasoning: "missed",
        drive: (c) => {
          run(c, "revList");
          run(c, "plainSecret");
          run(c, "newRevision");
          run(c, "curl");
          waitUntil(c, 46);
          close(c);
          c.act("document", { cause: "probe", prevent: "nothing" });
        },
      },
      {
        id: "forceTraffic",
        title: "Switches to multiple revision mode and sends all traffic to the failed v42: the API answers 503",
        reasoning: "missed",
        drive: (c) => {
          run(c, "revList");
          run(c, "forceTraffic");
          close(c);
          c.act("document", { cause: "image", prevent: "nothing" });
        },
      },
      {
        id: "retryBlind",
        title: "Reads the empty console log, retries the revision unchanged (fails again) and closes",
        reasoning: "missed",
        drive: (c) => {
          run(c, "consoleLogs");
          run(c, "newRevision");
          close(c);
          c.act("document", { cause: "image", prevent: "nothing" });
        },
      },
      {
        id: "late",
        title: "Investigates slowly, then the right fix at about 10:40, just before the rotation",
        reasoning: "partial",
        drive: (c) => {
          run(c, "revList");
          run(c, "consoleLogs");
          waitUntil(c, 31);
          run(c, "sysLogs");
          run(c, "identity");
          run(c, "roles");
          run(c, "grantSecretsUser");
          run(c, "newRevision");
          run(c, "curl");
          close(c);
          c.act("document", { cause: "kvRole", prevent: "roleInIac" });
        },
      },
    ],
  };
}
