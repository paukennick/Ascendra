// REQ-190: golden paths through modules/code-acls@1 on its fixture host
// (lib/sim/fixtures/code-vf-fixture.sim.json): VF under the AHA protocol.
import { join } from "node:path";
import type { StepsSpec } from "./steps.ts";

export const FIXTURE = { source: join(__dirname, "..", "..", "lib", "sim", "fixtures", "code-vf-fixture.sim.json"), golden: join(__dirname, "..", "..", "lib", "sim", "fixtures", "code-vf-fixture.golden.json") };

export function spec(): StepsSpec {
  return {
    slug: "code-vf-fixture",
    paths: [
      {
        id: "aclsGood",
        title: "Compressions at once, shock within 2 min, calcium, epinephrine after the second shock",
        reasoning: "met",
        drive: (c) => {
          c.act("look");
          c.waitUntil((r) => r.state.phase === "code");
          c.act("code_compress", { pad: "cpr 110 6" });
          c.wait(30);
          c.act("code_shock");
          c.act("code_fix", { fix: "calcium" });
          c.skip("code_cycle");
          c.act("code_compress", { pad: "cpr 114 5" });
          c.act("code_shock");
          c.act("code_epi", { dose: "1mg" });
          c.skip("code_cycle");
        },
      },
      {
        id: "aclsLate",
        title: "Paced compressions late, first shock after 4 minutes, amiodarone before calcium",
        reasoning: "partial",
        drive: (c) => {
          c.waitUntil((r) => r.state.phase === "code");
          c.wait(60);
          c.act("code_compressPaced", { prate: "110", ppause: "20" });
          c.act("code_epi", { dose: "1mg" });
          c.skip("code_cycle");
          c.act("code_compressPaced", { prate: "110", ppause: "5" });
          c.wait(30);
          c.act("code_shock");
          c.act("code_fix", { fix: "amio" });
          c.wait(30);
          c.act("code_fix", { fix: "calcium" });
          for (let i = 0; i < 4 && c.run.state.phase === "code"; i++) {
            c.skip("code_cycle");
            if (c.run.state.phase !== "code") break;
            c.act("code_compressPaced", { prate: "110", ppause: "5" });
            c.act("code_shock");
          }
        },
      },
      {
        id: "aclsSlowCause",
        title: "A good code, but the potassium is treated only after 9 minutes",
        reasoning: "partial",
        drive: (c) => {
          c.act("look");
          c.waitUntil((r) => r.state.phase === "code");
          c.act("code_compress", { pad: "cpr 110 6" });
          c.wait(20);
          c.act("code_shock");
          for (let i = 0; i < 4; i++) {
            c.skip("code_cycle");
            c.act("code_compress", { pad: "cpr 112 6" });
            c.act("code_shock");
            if (i === 0) c.act("code_epi", { dose: "1mg" });
          }
          c.wait(60);
          c.act("code_fix", { fix: "calcium" });
          while (c.run.state.phase === "code") {
            c.skip();
            if (c.run.state.phase !== "code") break;
            c.act("code_compress", { pad: "cpr 112 6" });
            c.act("code_shock");
          }
        },
      },
      {
        id: "aclsNoRosc",
        title: "Compressions only: VF never shocked, the cause never treated",
        reasoning: "missed",
        drive: (c) => {
          c.waitUntil((r) => r.state.phase === "code");
          c.wait(150);
          c.act("code_compress", { pad: "cpr 90 15" });
          for (let i = 0; i < 20 && !c.run.state.ended; i++) {
            if (!c.run.state.ended) c.skip("code_cycle");
          }
        },
      },
    ],
  };
}
