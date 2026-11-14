// REQ-291: prints the persona simulation of fixed_v1 vs the proposed
// predicted-recall scheduler. Simulation with assumed forgetting curves, not
// learner data. No database, no model calls, deterministic.
//   npm run sim:decay            the markdown table
//   npm run sim:decay -- --json  the raw results
import { formatReport, PERSONAS, runAll, TAU0_DAYS } from "../lib/decay-sim";
import { MEMORY_MODEL_SOURCE } from "../lib/memory-model";

const runs = {
  main: runAll(),
  fastTruth: runAll(PERSONAS, { truth: "fast" }),
  goalCaps: runAll(PERSONAS, { goalCaps: true }),
};
if (process.argv.includes("--json")) console.log(JSON.stringify(runs, null, 2));
else {
  console.log("SIMULATION WITH ASSUMED FORGETTING CURVES, NOT LEARNER DATA.");
  console.log(
    `Simulated learners forget exponentially (tau0 ${TAU0_DAYS} days x persona speed x item factor); the proposed model predicts with ${MEMORY_MODEL_SOURCE}.`
  );
  console.log("");
  console.log(formatReport(runs.main));
  console.log("");
  console.log(formatReport(runs.fastTruth, PERSONAS, "Sensitivity: fast-growth truth (closer to what FSRS defaults expect)"));
  console.log("");
  console.log(formatReport(runs.goalCaps, PERSONAS, "Sensitivity: goal-based daily caps (rejected design)"));
}
