// REQ-237: golden paths for the CKA NotReady node and the w3 drain on the
// terminal screen (CKA/node-notready-swap-drain.sim.json). No prototype
// exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "CKA", slug: "node-notready-swap-drain" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Ready Unknown, kubelet journal says swap, swapoff and fstab, kubelet restart; drain w3 within budget, reboot, uncordon",
        reasoning: "met",
        drive: (c) => {
          run(c, "getNodes");
          run(c, "describeW2");
          run(c, "kubeletStatus");
          run(c, "kubeletJournal");
          run(c, "swapShow");
          run(c, "swapOffA");
          run(c, "fstabFix");
          run(c, "restartKubelet");
          run(c, "getNodes");
          run(c, "drainW3", { flags: "safe" });
          run(c, "rebootW3");
          run(c, "uncordonW3");
          run(c, "getNodes");
          close(c);
          c.act("document", { cause: "swap" });
        },
      },
      {
        id: "notPersistedBypass",
        title: "swapoff only (fstab untouched), then drains w3 with --disable-eviction; w3 left cordoned",
        reasoning: "partial",
        drive: (c) => {
          run(c, "getNodes");
          run(c, "kubeletJournal");
          run(c, "swapOffA");
          run(c, "restartKubelet");
          run(c, "drainW3", { flags: "bypass" });
          run(c, "rebootW3");
          close(c);
          c.act("document", { cause: "swap" });
        },
      },
      {
        id: "drainFirst",
        title: "Starts w3's patch first: the drain blocks on the budget, and rebooting w3 anyway breaks payments",
        reasoning: "missed",
        drive: (c) => {
          run(c, "getNodes");
          run(c, "drainW3", { flags: "safe" });
          run(c, "rebootW3");
          run(c, "kubeletJournal");
          run(c, "swapOffA");
          run(c, "fstabFix");
          run(c, "restartKubelet");
          run(c, "uncordonW3");
          close(c);
          c.act("document", { cause: "swap" });
        },
      },
      {
        id: "reset",
        title: "Runs kubeadm reset on w2 to 'start fresh'",
        reasoning: "missed",
        drive: (c) => {
          run(c, "getNodes");
          run(c, "describeW2");
          run(c, "kubeadmReset");
          run(c, "restartKubelet");
          close(c);
          c.act("document", { cause: "certs" });
        },
      },
      {
        id: "slowPressure",
        title: "Describes w2, then waits on the patch vendor: w1 hits memory pressure; then fixes swap and does w3 properly",
        reasoning: "partial",
        drive: (c) => {
          run(c, "getNodes");
          run(c, "describeW2");
          waitUntil(c, 51);
          run(c, "kubeletJournal");
          run(c, "swapOffA");
          run(c, "fstabFix");
          run(c, "restartKubelet");
          run(c, "drainW3", { flags: "safe" });
          run(c, "rebootW3");
          run(c, "uncordonW3");
          close(c);
          c.act("document", { cause: "swap" });
        },
      },
      {
        id: "closeEarly",
        title: "Restarts the kubelet blind (it exits again), tries a drain without --delete-emptydir-data and closes",
        reasoning: "missed",
        drive: (c) => {
          run(c, "getNodes");
          run(c, "restartKubelet");
          run(c, "drainW3", { flags: "local" });
          close(c);
          c.act("document", { cause: "runtime" });
        },
      },
    ],
  };
}
