// REQ-320: golden paths for CKS/falco-shell-in-catalog-pod on the terminal screen.
// No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "CKS", slug: "falco-shell-in-catalog-pod" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Falco fields, pod and token rights, audit, evidence, quarantine, RoleBinding removed, hardened rollout, rotation",
        reasoning: "met",
        drive: (c) => {
          run(c, "falcoLog");
          run(c, "describe");
          run(c, "canI");
          run(c, "audit");
          run(c, "evidence");
          run(c, "quarantine");
          run(c, "rbac");
          run(c, "harden");
          run(c, "rotate");
          waitUntil(c, 31);
          close(c);
          c.act("document", { cause: "rce" });
        },
      },
      {
        id: "deleteFirst",
        title: "Deletes the pod at once; the replacement has the same token and the key is read at 14:30",
        reasoning: "missed",
        drive: (c) => {
          run(c, "deletePod");
          waitUntil(c, 31);
          close(c);
          c.act("document", { cause: "noise" });
        },
      },
      {
        id: "deleteThenFix",
        title: "Reads the alert, deletes the pod before saving anything, then cuts RBAC, hardens and rotates",
        reasoning: "partial",
        drive: (c) => {
          run(c, "falcoLog");
          run(c, "describe");
          run(c, "deletePod");
          run(c, "rbac");
          run(c, "evidence");
          run(c, "harden");
          run(c, "rotate");
          waitUntil(c, 31);
          close(c);
          c.act("document", { cause: "rce" });
        },
      },
      {
        id: "execLook",
        title: "Execs in to look around, then isolates and cuts RBAC; evidence saved after the exec",
        reasoning: "partial",
        drive: (c) => {
          run(c, "falcoLog");
          run(c, "describe");
          run(c, "exec");
          run(c, "evidence");
          run(c, "quarantine");
          run(c, "rbac");
          waitUntil(c, 31);
          close(c);
          c.act("document", { cause: "rce" });
        },
      },
      {
        id: "muteRule",
        title: "Reads the alert and mutes the rule as noise",
        reasoning: "missed",
        drive: (c) => {
          run(c, "falcoLog");
          run(c, "muteRule");
          waitUntil(c, 31);
          close(c);
          c.act("document", { cause: "noise" });
        },
      },
      {
        id: "isolateOnly",
        title: "Saves evidence and quarantines the pod but leaves the RoleBinding: the replacement pod is exploited again",
        reasoning: "partial",
        drive: (c) => {
          run(c, "falcoLog");
          run(c, "describe");
          run(c, "evidence");
          run(c, "quarantine");
          waitUntil(c, 31);
          close(c);
          c.act("document", { cause: "rce" });
        },
      },
    ],
  };
}
