// REQ-335: golden paths for AZ700/appgw-502-after-login-on-root on the terminal screen.
// No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "AZ700", slug: "appgw-502-after-login-on-root" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Backend health, probe, direct test, NSG; custom probe; template and alert; verify",
        reasoning: "met",
        drive: (c) => {
          run(c, "health");
          run(c, "probecfg");
          run(c, "direct");
          run(c, "nsg");
          run(c, "probe");
          run(c, "record");
          run(c, "verify");
          waitUntil(c, 51);
          close(c);
          c.act("document", { cause: "probe" });
        },
      },
      {
        id: "harm",
        title: "Turns off sign-in",
        reasoning: "missed",
        drive: (c) => {
          run(c, "health");
          run(c, "anyone");
          run(c, "verify");
          waitUntil(c, 51);
          close(c);
          c.act("document", { cause: "probe" });
        },
      },
      {
        id: "noop",
        title: "Scales the gateway",
        reasoning: "partial",
        drive: (c) => {
          run(c, "health");
          run(c, "scale");
          run(c, "verify");
          waitUntil(c, 51);
          close(c);
          c.act("document", { cause: "probe" });
        },
      },
      {
        id: "fixOnly",
        title: "Reads health and probe, adds the custom probe, verifies",
        reasoning: "partial",
        drive: (c) => {
          run(c, "health");
          run(c, "probecfg");
          run(c, "probe");
          run(c, "verify");
          waitUntil(c, 51);
          close(c);
          c.act("document", { cause: "probe" });
        },
      },
      {
        id: "late",
        title: "Waits, adds the probe after 09:00",
        reasoning: "partial",
        drive: (c) => {
          run(c, "health");
          waitUntil(c, 50);
          run(c, "probe");
          run(c, "verify");
          waitUntil(c, 58);
          close(c);
          c.act("document", { cause: "probe" });
        },
      },
      {
        id: "blind",
        title: "Adds a probe without looking and blames the NSG",
        reasoning: "missed",
        drive: (c) => {
          run(c, "probe");
          waitUntil(c, 51);
          close(c);
          c.act("document", { cause: "nsg" });
        },
      },
    ],
  };
}
