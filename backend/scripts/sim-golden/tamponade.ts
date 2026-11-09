// REQ-162 (docs/sims.md 16, 17 step 5): the tamponade port's golden paths,
// written once as learner steps and turned into (a) engine commands for
// tamponade-after-cabg.golden.json and (b) calls into the revised prototype
// (critical-care.html?test=1) by the driver in ../sim-golden.ts. Each step is
// at a sim second; a reasoning moment that opens on the way is answered at
// the tick it opens, in both.

export interface Step {
  at: number; // sim seconds
  act: string;
  value?: string; // a choice param
  sbar?: { sit: string; bg: string; asmt: string; rec: string };
}

export interface PathSpec {
  id: string;
  title: string;
  steps: Step[];
  p2: string[]; // phase-2 choices in order; "finish" ends phase 2 at once
  reasoning: "met" | "partial" | "missed";
  notes?: string;
  // the prototype's own result for this path, recorded by the driver
}

const FULL = { sit: "stop", bg: "full", asmt: "tamp", rec: "come" };

export const SNAPSHOT_TICKS = [60, 300, 600, 900, 1200, 1500, 1800, 2100, 2400, 3000];

export const PATHS: PathSpec[] = [
  {
    id: "expert",
    title: "Expert path: recognise by the first check, page to the bedside, prepare, inotrope in phase 2",
    steps: [
      { at: 540, act: "inspect" },
      { at: 560, act: "tubes" },
      { at: 600, act: "ausc" },
      { at: 620, act: "wedge" },
      { at: 660, act: "surgeon", sbar: FULL },
      { at: 680, act: "echo" },
      { at: 700, act: "prep" },
      { at: 720, act: "labs" },
      { at: 760, act: "fluid", value: "250" },
      { at: 800, act: "norepi", value: "0.05" },
    ],
    p2: ["inotrope"],
    reasoning: "met",
  },
  {
    id: "earlyNoInotrope",
    title: "Early escalation, but phase 2 treats low output with more fluid then a pressor",
    steps: [
      { at: 600, act: "tubes" },
      { at: 700, act: "surgeon", sbar: { sit: "stop", bg: "min", asmt: "tamp", rec: "come" } },
      { at: 720, act: "echo" },
      { at: 740, act: "prep" },
      { at: 760, act: "labs" },
    ],
    p2: ["fluid", "pressor"],
    reasoning: "partial",
  },
  {
    id: "bridge",
    title: "Recognised after the second check; surgeon paged just inside 20 minutes: re-exploration by a slower route",
    steps: [
      { at: 1240, act: "inspect" },
      { at: 1250, act: "surgeon", sbar: { sit: "soft", bg: "full", asmt: "tamp", rec: "come" } },
      { at: 1260, act: "echo" },
      { at: 1270, act: "prep" },
      { at: 1280, act: "fluid", value: "250" },
      { at: 1300, act: "labs" },
      { at: 1400, act: "norepi", value: "0.05" },
    ],
    p2: ["afterload", "inotrope"],
    reasoning: "partial",
  },
  {
    id: "lateNoPrep",
    title: "Recognised at the second check, called at 20 minutes without preparing: bedside resternotomy",
    steps: [
      { at: 1260, act: "inspect" },
      { at: 1270, act: "fluid", value: "500" },
      { at: 1300, act: "surgeon", sbar: { sit: "soft", bg: "full", asmt: "tamp", rec: "come" } },
      { at: 1320, act: "echo" },
      { at: 1500, act: "labs" },
      { at: 1700, act: "norepi", value: "0.1" },
    ],
    p2: ["afterload", "inotrope"],
    reasoning: "partial",
  },
  {
    id: "phoneOrdersLate",
    title: "Routine call gets phone orders; the second call brings the surgeon late; bedside resternotomy",
    steps: [
      { at: 900, act: "look" },
      { at: 1000, act: "surgeon", sbar: { sit: "routine", bg: "min", asmt: "hypo", rec: "fluid" } },
      { at: 1130, act: "fluid", value: "500" },
      { at: 1400, act: "protamine", value: "give" },
      { at: 2200, act: "tubes" },
      { at: 2210, act: "surgeon", sbar: { sit: "stop", bg: "min", asmt: "unsure", rec: "come" } },
      { at: 2230, act: "norepi", value: "0.1" },
      { at: 2240, act: "fluid", value: "500" },
      { at: 2260, act: "fluid", value: "250" },
    ],
    p2: ["inotrope"],
    reasoning: "missed",
  },
  {
    id: "arrest",
    title: "Fluids and a pressor without escalation: PEA arrest",
    steps: [
      { at: 1200, act: "look" },
      { at: 1300, act: "fluid", value: "500" },
      { at: 1700, act: "norepi", value: "0.1" },
      { at: 2000, act: "fluid", value: "500" },
      { at: 2400, act: "epi", value: "5" },
      { at: 2700, act: "dobut", value: "5" },
    ],
    p2: [],
    reasoning: "missed",
  },
  {
    id: "earlyFinishNow",
    title: "Expert live phase, then ends phase 2 without a decision",
    steps: [
      { at: 560, act: "tubes" },
      { at: 600, act: "wedge" },
      { at: 660, act: "surgeon", sbar: FULL },
      { at: 680, act: "echo" },
      { at: 700, act: "prep" },
      { at: 720, act: "labs" },
      { at: 730, act: "protamine", value: "hold" },
    ],
    p2: ["finish"],
    reasoning: "met",
  },
];
