// REQ-316: golden paths for the CKA etcd restore outage on the terminal
// screen (CKA/etcd-restore-deleted-namespace.sim.json). No prototype exists,
// so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "CKA", slug: "etcd-restore-deleted-namespace" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Pod flags, snapshot status, save today's state, stop the API server, restore to a new directory, manifest, restart, re-apply promo, verify",
        reasoning: "met",
        drive: (c) => {
          run(c, "ns");
          run(c, "describe");
          run(c, "status");
          run(c, "save", { certs: "with" });
          run(c, "stopApi");
          run(c, "restore", { dir: "new" });
          run(c, "manifest");
          run(c, "startApi");
          run(c, "kubelet");
          run(c, "promo");
          run(c, "verify");
          waitUntil(c, 31);
          close(c);
          c.act("document", { cause: "restore" });
        },
      },
      {
        id: "liveRestore",
        title: "Restores and switches etcd's directory with the API server still running",
        reasoning: "partial",
        drive: (c) => {
          run(c, "ns");
          run(c, "status");
          run(c, "restore", { dir: "new" });
          run(c, "manifest");
          run(c, "verify");
          close(c);
          c.act("document", { cause: "restore" });
        },
      },
      {
        id: "recreate",
        title: "Recreates the namespace from Git; the Secrets are missing at 11:00",
        reasoning: "missed",
        drive: (c) => {
          run(c, "ns");
          run(c, "recreate");
          run(c, "verify");
          waitUntil(c, 31);
          close(c);
          c.act("document", { cause: "recreate" });
        },
      },
      {
        id: "noFlagsThenRestore",
        title: "etcdctl fails without certificates; checks the snapshot and restores safely, but loses the 08:00 promo deployment",
        reasoning: "partial",
        drive: (c) => {
          run(c, "ns");
          run(c, "save", { certs: "without" });
          run(c, "status");
          run(c, "stopApi");
          run(c, "restore", { dir: "old" });
          run(c, "restore", { dir: "new" });
          run(c, "manifest");
          run(c, "startApi");
          run(c, "kubelet");
          run(c, "verify");
          waitUntil(c, 31);
          close(c);
          c.act("document", { cause: "restore" });
        },
      },
      {
        id: "reset",
        title: "Rebuilds the control plane with kubeadm reset",
        reasoning: "missed",
        drive: (c) => {
          run(c, "reset");
          close(c);
          c.act("document", { cause: "reset" });
        },
      },
      {
        id: "forgotManifest",
        title: "Restores to a new directory but never points etcd at it; checks too late",
        reasoning: "partial",
        drive: (c) => {
          run(c, "describe");
          run(c, "status");
          run(c, "save", { certs: "with" });
          run(c, "stopApi");
          run(c, "restore", { dir: "new" });
          run(c, "startApi");
          run(c, "verify");
          waitUntil(c, 31);
          close(c);
          c.act("document", { cause: "restore" });
        },
      },
    ],
  };
}
