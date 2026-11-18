// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for TECHPLUS/laptop-hotel-wifi-phones-encryption
// on the service-desk screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "TECHPLUS", slug: "laptop-hotel-wifi-phones-encryption" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Inventory and loss read; disks encrypted; HTTPS and VPN; phones managed; an honest record", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["inventory", "lost"] }, answers: { restPrompt: "fde", transitPrompt: "https", mobilePrompt: "mdm" }, close: { how: "honest" } }) },
      { id: "partialRest", title: "Partly right on data at rest, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["inventory"] }, answers: { restPrompt: "strongPw", transitPrompt: "https", mobilePrompt: "mdm" }, close: { how: "honest" } }) },
      { id: "partialMobile", title: "Partly right on mobile devices, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { restPrompt: "fde", transitPrompt: "https", mobilePrompt: "lockOnly" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { restPrompt: "strongPw", transitPrompt: "vpnOptional", mobilePrompt: "lockOnly" }, close: { how: "honest" } }) },
      { id: "badRest", title: "The lost laptop treated as a hardware loss", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["inventory", "lost"] }, answers: { restPrompt: "ignoreLoss", transitPrompt: "https", mobilePrompt: "mdm" }, close: { how: "honest" } }) },
      { id: "badTransit", title: "Plain HTTP left in place", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["inventory", "lost"] }, answers: { restPrompt: "fde", transitPrompt: "avoidWifi", mobilePrompt: "mdm" }, close: { how: "honest" } }) },
      { id: "badMobile", title: "Phones left unmanaged", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["inventory", "lost"] }, answers: { restPrompt: "fde", transitPrompt: "https", mobilePrompt: "allowAny" }, close: { how: "honest" } }) },
    ],
  };
}
