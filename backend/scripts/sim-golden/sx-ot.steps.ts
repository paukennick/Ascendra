// REQ-238: golden paths for the SecurityX IT/OT segmentation incident on the
// security console (SECURITYX/ot-segmentation-breach.sim.json). No prototype
// exists, so the expectations are the engine's own results.
import type { StepPath, StepsSpec } from "./steps.ts";
import { close, task, watchUntil } from "./secplus-helpers.ts";

export const ENTRY = { course: "SECURITYX", slug: "ot-segmentation-breach" };

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}

export function paths(): StepPath[] {
  return [
    {
      id: "expert",
      title: "Incident command, map the IT-to-OT paths, close the conduit, cut the backups off the domain, VPN offline, credentials reset by 28 min, image, microsegment; notify everyone with a stake",
      reasoning: "met",
      drive: (c) => {
        task(c, "escalate");
        task(c, "mapPaths");
        task(c, "cutConduit");
        task(c, "isolateBackups");
        task(c, "cutVpn");
        task(c, "resetCreds");
        task(c, "imageEntry");
        task(c, "microsegment");
        task(c, "resetVpn");
        close(c);
        c.act("notify", { who: "full" });
        c.act("document", { cause: "vendorVpn", fix: "dmz" });
      },
    },
    {
      id: "itFocus",
      title: "Works the IT side only (entry review, microsegmentation, image): the attacker crosses through the historian and encrypts the plant HMIs at 35 min",
      reasoning: "missed",
      drive: (c) => {
        task(c, "reviewEntry");
        task(c, "microsegment");
        task(c, "imageEntry");
        watchUntil(c, 90);
        c.answer();
        c.act("notify", { who: "it" });
        c.act("document", { cause: "phish", fix: "av" });
      },
    },
    {
      id: "slowBackups",
      title: "Maps the paths and closes the conduit, then investigates the entry and images it with the VPN still open: Domain Admin deletes the backups at 25 min and IT encryption starts at 45",
      reasoning: "partial",
      drive: (c) => {
        task(c, "mapPaths");
        task(c, "cutConduit");
        task(c, "reviewEntry");
        task(c, "imageEntry");
        watchUntil(c, 46);
        task(c, "cutVpn");
        task(c, "resetCreds");
        task(c, "escalate");
        close(c);
        c.act("notify", { who: "full" });
        c.act("document", { cause: "vendorVpn", fix: "dmz" });
      },
    },
    {
      id: "resetNoImage",
      title: "Contains the plant, the backups and the entry fast, then factory-resets the VPN appliance with nothing kept",
      reasoning: "partial",
      drive: (c) => {
        task(c, "escalate");
        task(c, "mapPaths");
        task(c, "cutConduit");
        task(c, "isolateBackups");
        task(c, "cutVpn");
        task(c, "resetCreds");
        task(c, "resetVpn");
        close(c);
        c.act("notify", { who: "full" });
        c.act("document", { cause: "vendorVpn", fix: "dmz" });
      },
    },
    {
      id: "noCredsReset",
      title: "Closes the conduit, the backups and the VPN but never resets the Domain Admin rights the attacker took",
      reasoning: "partial",
      drive: (c) => {
        task(c, "escalate");
        task(c, "cutConduit");
        task(c, "isolateBackups");
        task(c, "cutVpn");
        task(c, "imageEntry");
        close(c);
        c.act("notify", { who: "nobody" });
        c.act("document", { cause: "vendorVpn", fix: "nochange" });
      },
    },
    {
      id: "shutdown",
      title: "Shuts the whole plant down first, then the VPN and the backups; isolates the historian, resets credentials and images: safe, but three lines stopped",
      reasoning: "partial",
      drive: (c) => {
        task(c, "escalate");
        task(c, "shutdownPlant");
        task(c, "cutVpn");
        task(c, "isolateHistorian");
        task(c, "isolateBackups");
        task(c, "resetCreds");
        task(c, "imageEntry");
        close(c);
        c.act("notify", { who: "full" });
        c.act("document", { cause: "vendorVpn", fix: "dmz" });
      },
    },
  ];
}
