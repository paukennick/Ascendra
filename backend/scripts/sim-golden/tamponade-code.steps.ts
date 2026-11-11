// REQ-190: tamponade as the first host of modules/code-acls@1. The seven
// prototype-matched paths are kept (their commands and snapshots are the
// recording ports.test.ts compares); the arrest path now runs into the code
// and, untreated, ends without ROSC. Three paths go through the code.
import { readFileSync } from "node:fs";
import type { Command } from "../../lib/sim/engine/v1/types.ts";
import type { Ctl, StepsSpec } from "./steps.ts";

export const ENTRY = { course: "CCRNADULT", slug: "tamponade-after-cabg" };

function arrestPrefix(golden: string): Command[] {
  const g = JSON.parse(readFileSync(golden, "utf8")) as { paths: { id: string; commands: Command[] }[] };
  return g.paths.find((p) => p.id === "arrest")!.commands;
}

function intoCode(c: Ctl, golden: string): void {
  c.replay(arrestPrefix(golden));
  c.waitUntil((r) => r.state.phase === "code");
}

// Two minutes of compressions per rhythm check until the chest is open.
function compressUntilRosc(c: Ctl, send: () => void): void {
  let guard = 0;
  while (c.run.state.phase === "code" && !c.run.state.ended && guard++ < 20) {
    send();
    c.skip();
  }
}

function afterRosc(c: Ctl, choice: string): void {
  c.skip("backInIcu");
  c.choose(choice);
  c.skip("reassessT");
  if (c.run.state.openPrompt) c.choose("finish");
}

export function spec(golden: string): StepsSpec {
  return {
    slug: ENTRY.slug,
    keep: ["expert", "earlyNoInotrope", "bridge", "lateNoPrep", "phoneOrdersLate", "arrest", "earlyFinishNow"],
    paths: [
      {
        id: "codeRosc",
        title: "Arrest, then the cardiac-surgery protocol: compressions at once, resternotomy called, no full-dose epinephrine",
        reasoning: "partial",
        notes: "Tap-to-the-beat compressions at 110 a minute with 6 s pauses; ROSC when the chest is open (10 min without the tray). Recovered: ROSC after an arrest is rescue (9.2).",
        drive: (c) => {
          intoCode(c, golden);
          c.act("code_compress", { pad: "cpr 110 6" });
          c.act("code_fix", { fix: "resternotomy" });
          compressUntilRosc(c, () => c.act("code_compress", { pad: "cpr 112 5" }));
          afterRosc(c, "inotrope");
        },
      },
      {
        id: "codeFullEpi",
        title: "Arrest: compressions and resternotomy, but 1 mg epinephrine without expert direction",
        reasoning: "missed",
        notes: "STS 2017 names epinephrine during an arrest after cardiac surgery as harmful (class III) unless an experienced clinician directs it; the harm shows at ROSC.",
        drive: (c) => {
          intoCode(c, golden);
          c.act("code_compress", { pad: "cpr 108 7" });
          c.act("code_epi", { dose: "1mg" });
          c.act("code_fix", { fix: "resternotomy" });
          compressUntilRosc(c, () => c.act("code_compress", { pad: "cpr 108 7" }));
        },
      },
      {
        id: "codePacedLate",
        title: "Arrest with paced compressions (no tapping): a shock to PEA, fluid first, resternotomy late",
        reasoning: "missed",
        notes: "The accessible compression mode, scored on the rate and pause chosen. A shock to a non-shockable rhythm, a wrong fix first, the right one after 3 minutes.",
        drive: (c) => {
          intoCode(c, golden);
          c.wait(20);
          c.act("code_compressPaced", { prate: "140", ppause: "20" });
          c.act("code_shock");
          c.act("code_fix", { fix: "fluid" });
          c.skip("code_cycle");
          c.act("code_compressPaced", { prate: "110", ppause: "5" });
          c.wait(60);
          c.act("code_fix", { fix: "resternotomy" });
          compressUntilRosc(c, () => c.act("code_compressPaced", { prate: "110", ppause: "5" }));
          afterRosc(c, "fluid");
        },
      },
    ],
  };
}
