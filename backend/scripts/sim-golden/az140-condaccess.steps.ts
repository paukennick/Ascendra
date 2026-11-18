// REQ-335: golden paths for AZ140/ca-policy-targets-arm-provider-feed-fails on the terminal screen.
// No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "AZ140", slug: "ca-policy-targets-arm-provider-feed-fails" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Sign-ins, policy targets, users, What If; retarget; document; verify",
        reasoning: "met",
        drive: (c) => {
          run(c, "signin");
          run(c, "policy");
          run(c, "who");
          run(c, "whatif");
          run(c, "retarget");
          run(c, "review");
          run(c, "verify");
          waitUntil(c, 51);
          close(c);
          c.act("document", { cause: "target" });
        },
      },
      {
        id: "harm",
        title: "Disables the MFA policy",
        reasoning: "missed",
        drive: (c) => {
          run(c, "signin");
          run(c, "disable");
          run(c, "verify");
          waitUntil(c, 51);
          close(c);
          c.act("document", { cause: "target" });
        },
      },
      {
        id: "noop",
        title: "Has users re-register MFA",
        reasoning: "partial",
        drive: (c) => {
          run(c, "signin");
          run(c, "rereg");
          run(c, "verify");
          waitUntil(c, 51);
          close(c);
          c.act("document", { cause: "target" });
        },
      },
      {
        id: "fixOnly",
        title: "Reads sign-ins and targets, retargets, verifies",
        reasoning: "partial",
        drive: (c) => {
          run(c, "signin");
          run(c, "policy");
          run(c, "retarget");
          run(c, "verify");
          waitUntil(c, 51);
          close(c);
          c.act("document", { cause: "target" });
        },
      },
      {
        id: "late",
        title: "Waits, retargets after 09:00",
        reasoning: "partial",
        drive: (c) => {
          run(c, "signin");
          waitUntil(c, 50);
          run(c, "retarget");
          run(c, "verify");
          waitUntil(c, 58);
          close(c);
          c.act("document", { cause: "target" });
        },
      },
      {
        id: "blind",
        title: "Retargets without looking and blames MFA registration",
        reasoning: "missed",
        drive: (c) => {
          run(c, "retarget");
          waitUntil(c, 51);
          close(c);
          c.act("document", { cause: "mfa" });
        },
      },
    ],
  };
}
