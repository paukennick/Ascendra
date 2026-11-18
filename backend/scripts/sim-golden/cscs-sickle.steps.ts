// REQ-338 (docs/sims.md 22.42): golden paths for the strength and
// conditioning sickle cell trait testing case
// (NSCACSCS/cscs-shuttle-test-trait-on-file.sim.json) on the client trainer
// screen. No prototype; the expectations are the engine's.
//
//   npm run sim:golden -- steps cscs-sickle
import type { Ctl, StepPath, StepsSpec } from "./steps.ts";

export const ENTRY = { course: "NSCACSCS", slug: "cscs-shuttle-test-trait-on-file" };

function d(c: Ctl, action: string, params?: Record<string, string>): void {
  if (c.run.state.ended) return;
  c.act(action, params);
  if (c.run.state.phase === "session" && !c.run.state.ended && c.value("busy") === true) c.skip("work");
}

function close(c: Ctl, what: string): void {
  if (c.run.state.phase === "session") c.act("closeSession");
  c.answer();
  c.act("document", { what });
}

export function paths(): StepPath[] {
  return [
    {
      id: "expert",
      title: "A protocol modified for the trait; the readiness check finds a cold and a short night, so he is held out; warm-up; a full record",
      reasoning: "met",
      drive: (c) => {
        d(c, "protocol", { p: "modified" });
        d(c, "ready");
        d(c, "holdOut");
        d(c, "warm");
        d(c, "start");
        close(c, "full");
      },
    },
    {
      id: "standardHandled",
      title: "The standard all-out test; he slumps on the second shuttle; stopped, 911, oxygen, the AED beside him, the trait told to the paramedics",
      reasoning: "partial",
      drive: (c) => {
        d(c, "protocol", { p: "standard" });
        d(c, "warm");
        d(c, "start");
        d(c, "stopCall");
        c.skip("at");
        d(c, "oxygen");
        d(c, "monitor");
        c.skip("ems");
        d(c, "tell");
        close(c, "full");
      },
    },
    {
      id: "modifiedIll",
      title: "A modified protocol and a readiness check, but he tests anyway while ill; nothing happens; a one-line record",
      reasoning: "partial",
      drive: (c) => {
        d(c, "protocol", { p: "modified" });
        d(c, "ready");
        d(c, "warm");
        d(c, "start");
        close(c, "brief");
      },
    },
    {
      id: "crampsFirst",
      title: "The standard test without a warm-up; the slump treated as cramps for three minutes, then 911 and oxygen",
      reasoning: "partial",
      drive: (c) => {
        d(c, "protocol", { p: "standard" });
        d(c, "start");
        d(c, "cramp");
        d(c, "monitor");
        d(c, "stopCall");
        c.skip("at");
        d(c, "oxygen");
        c.skip("ems");
        d(c, "tell");
        close(c, "full");
      },
    },
    {
      id: "walkedOff",
      title: "The standard test; he is pulled up to walk it off and stops responding; 911 and CPR late",
      reasoning: "missed",
      drive: (c) => {
        d(c, "protocol", { p: "standard" });
        d(c, "start");
        d(c, "walk");
        d(c, "monitor");
        d(c, "monitor");
        d(c, "lateCall");
        d(c, "cpr");
        c.skip("ems");
        close(c, "nothing");
      },
    },
  ];
}

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}
