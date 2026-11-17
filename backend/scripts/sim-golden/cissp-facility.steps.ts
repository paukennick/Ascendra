// REQ-314: golden paths for the CISSP facility console case
// (CISSP/cissp-datahall-tailgate-cooling.sim.json): a tailgater in the data
// hall and a tripped cooling unit, on the facility console.
import type { Ctl, StepPath, StepsSpec } from "./steps.ts";

export const ENTRY = { course: "CISSP", slug: "cissp-datahall-tailgate-cooling" };

function d(c: Ctl, action: string, params?: Record<string, string>): void {
  if (c.run.state.phase !== "incident" || c.run.state.ended) return;
  c.act(action, params);
  while (c.run.state.phase === "incident" && !c.run.state.ended && c.value("busy") === true) c.skip("work");
}

// Let time pass on purpose (the watch action) until a condition holds.
function until(c: Ctl, pred: () => boolean, max = 30): void {
  for (let i = 0; i < max && !pred() && c.run.state.phase === "incident"; i++) d(c, "watch");
}

function close(c: Ctl, what: string): void {
  if (c.run.state.phase === "incident") c.act("closeIncident");
  c.answer();
  c.act("document", { what });
}

const isSet = (c: Ctl, n: string) => c.value(n) !== null;

export function paths(): StepPath[] {
  return [
    { id: "expert", title: "Both guards at once; camera and visitor log; entry suspended with free exit; Okoye called and suspended; police; CRAC-3 and the engineer at the trip; evidence; a full report", reasoning: "met",
      drive: (c) => {
        d(c, "dispatch", { how: "pair" }); d(c, "reviewCam"); d(c, "suspendIn"); d(c, "visitorLog"); d(c, "callOkoye"); d(c, "disableOkoye");
        until(c, () => isSet(c, "interceptAt")); d(c, "police");
        until(c, () => isSet(c, "tripAt")); d(c, "crac3"); d(c, "engineer"); d(c, "preserve");
        close(c, "full");
      } },
    { id: "slowCooling", title: "The intruder handled well, but cooling left to the engineer: row C runs warm", reasoning: "partial",
      drive: (c) => {
        d(c, "dispatch", { how: "pair" }); d(c, "reviewCam"); d(c, "suspendIn");
        until(c, () => isSet(c, "interceptAt")); d(c, "police");
        until(c, () => isSet(c, "tripAt")); d(c, "engineer"); d(c, "preserve");
        until(c, () => isSet(c, "cracBackAt"), 40);
        close(c, "full");
      } },
    { id: "investigateFirst", title: "Verify everything first, dispatch late: he reaches cage C7 before the guards", reasoning: "partial",
      drive: (c) => {
        d(c, "reviewCam"); d(c, "visitorLog"); d(c, "callOkoye"); d(c, "disableOkoye"); d(c, "suspendIn");
        until(c, () => isSet(c, "tripAt")); d(c, "crac3");
        d(c, "dispatch", { how: "pair" });
        until(c, () => isSet(c, "interceptAt")); d(c, "customer"); d(c, "police"); d(c, "preserve");
        close(c, "brief");
      } },
    { id: "loneGuard", title: "The nearer guard alone to stop him: the guard is hurt", reasoning: "partial",
      drive: (c) => {
        d(c, "dispatch", { how: "single" }); d(c, "reviewCam"); d(c, "suspendIn");
        until(c, () => isSet(c, "interceptAt")); d(c, "police");
        until(c, () => isSet(c, "tripAt")); d(c, "crac3"); d(c, "preserve");
        close(c, "full");
      } },
    { id: "lockedIn", title: "Every hall door locked both ways; the technicians cannot leave", reasoning: "missed",
      drive: (c) => {
        d(c, "lockBoth"); d(c, "dispatch", { how: "pair" });
        until(c, () => isSet(c, "interceptAt"));
        until(c, () => isSet(c, "tripAt")); d(c, "prop"); d(c, "crac3");
        close(c, "brief");
      } },
    { id: "breached", title: "Cooling first and a watch on the cameras; nobody is sent: a device on the customer's switch", reasoning: "missed",
      drive: (c) => {
        until(c, () => isSet(c, "tripAt")); d(c, "crac3");
        until(c, () => isSet(c, "plantAt"));
        close(c, "nothing");
      } },
    { id: "overheated", title: "Guards sent, but the trip ignored: row C passes 32 °C", reasoning: "missed",
      drive: (c) => {
        d(c, "dispatch", { how: "pair" }); d(c, "suspendIn");
        until(c, () => isSet(c, "interceptAt")); d(c, "police"); d(c, "preserve");
        until(c, () => (c.value("temp") as number) >= 32, 40);
        close(c, "full");
      } },
  ];
}

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}
