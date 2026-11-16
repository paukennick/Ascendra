// REQ-297: golden paths for the CKA API server static pod outage on the
// terminal screen (CKA/apiserver-static-pod-bad-flag.sim.json). Each command
// costs a minute through the `work` wait, so the console's shared driver steps
// apply. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec, Ctl } from "./steps.ts";
import { task, watchUntil } from "./secplus-helpers.ts";

export const ENTRY = { course: "CKA", slug: "apiserver-static-pod-bad-flag" };

function close(c: Ctl): void {
  if (c.run.state.phase === "incident") c.act("closeOutage");
  c.answer();
}

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "crictl ps and logs, the manifest flags, a backup in /root, fix the flag, kubectl get nodes",
        reasoning: "met",
        drive: (c) => {
          task(c, "getNodes");
          task(c, "crictlPs");
          task(c, "crictlLogs");
          task(c, "grepFlags");
          task(c, "backup");
          task(c, "fix", { change: "editFlag" });
          task(c, "watch");
          task(c, "getNodes");
          close(c);
          c.act("document", { cause: "flag" });
        },
      },
      {
        id: "noBackup",
        title: "Right diagnosis and fix, but no backup of the manifest first",
        reasoning: "partial",
        drive: (c) => {
          task(c, "crictlPs");
          task(c, "crictlLogs");
          task(c, "grepFlags");
          task(c, "fix", { change: "editFlag" });
          task(c, "watch");
          task(c, "getNodes");
          close(c);
          c.act("document", { cause: "flag" });
        },
      },
      {
        id: "dupBackup",
        title: "Keeps a 'backup' in the manifests directory: a second static pod; removes it later",
        reasoning: "partial",
        drive: (c) => {
          task(c, "crictlLogs");
          task(c, "grepFlags");
          task(c, "fix", { change: "backupInDir" });
          task(c, "fix", { change: "editFlag" });
          task(c, "watch");
          task(c, "getNodes");
          task(c, "removeDup");
          task(c, "getNodes");
          close(c);
          c.act("document", { cause: "flag" });
        },
      },
      {
        id: "kubeletLoop",
        title: "Tries kubectl delete and a kubelet restart, then waits",
        reasoning: "missed",
        drive: (c) => {
          task(c, "getNodes");
          task(c, "fix", { change: "deleteMirror" });
          task(c, "fix", { change: "restartKubelet" });
          task(c, "kubeletLog");
          watchUntil(c, 46);
          close(c);
          c.act("document", { cause: "etcd" });
        },
      },
      {
        id: "reset",
        title: "Runs kubeadm reset to start over",
        reasoning: "missed",
        drive: (c) => {
          task(c, "getNodes");
          task(c, "fix", { change: "reset" });
          close(c);
          c.act("document", { cause: "cert" });
        },
      },
      {
        id: "stillDown",
        title: "Sees etcd running and closes blaming etcd",
        reasoning: "missed",
        drive: (c) => {
          task(c, "crictlPs");
          close(c);
          c.act("document", { cause: "etcd" });
        },
      },
    ],
  };
}
