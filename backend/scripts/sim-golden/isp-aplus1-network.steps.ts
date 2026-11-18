// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for APLUS_CORE1/soho-router-forwarding-guest-wifi
// on the service-desk screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "APLUS_CORE1", slug: "soho-router-forwarding-guest-wifi" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Router and camera read; reserved and VPN; isolated guest VLAN; WPA3; honest notes", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["router", "cam"] }, answers: { camPrompt: "vpn", guestPrompt: "isolated", wpaPrompt: "wpa3" }, close: { how: "honest" } }) },
      { id: "partialCam", title: "Partly right on remote viewing, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["router"] }, answers: { camPrompt: "forwardSafe", guestPrompt: "isolated", wpaPrompt: "wpa3" }, close: { how: "honest" } }) },
      { id: "partialWpa", title: "Partly right on wireless security, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { camPrompt: "vpn", guestPrompt: "isolated", wpaPrompt: "newPw" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { camPrompt: "forwardSafe", guestPrompt: "noGuest", wpaPrompt: "newPw" }, close: { how: "honest" } }) },
      { id: "badCam", title: "The camera in the DMZ with its default password", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["router", "cam"] }, answers: { camPrompt: "dmz", guestPrompt: "isolated", wpaPrompt: "wpa3" }, close: { how: "honest" } }) },
      { id: "badGuest", title: "Patients kept on the office network", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["router", "cam"] }, answers: { camPrompt: "vpn", guestPrompt: "sharePw", wpaPrompt: "wpa3" }, close: { how: "honest" } }) },
      { id: "badWpa", title: "The office Wi-Fi left open", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["router", "cam"] }, answers: { camPrompt: "vpn", guestPrompt: "isolated", wpaPrompt: "open" }, close: { how: "honest" } }) },
    ],
  };
}
