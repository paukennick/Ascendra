import { GENERAL_SAFETY, matchPart, numericPart, part, selectPart, type SeedLabSet } from "./types";
import { source } from "../sources";

// REQ-280: ASQ Certified Six Sigma Green Belt. Aligned to the 2022 CSSGB Body
// of Knowledge and ASQ's exam page, read 2026-11-14 (sections 11 / 20 / 20 /
// 18 / 16 / 15 of 100 scored questions). Density (hybrid): 2 per section =
// 12 labs. Every number below is computed from the lab's own fictional data
// with the standard formulas (RPN = S x O x D; RTY = product of step yields;
// Cp = (USL - LSL) / 6s, Cpk = min(USL - mean, mean - LSL) / 3s; a 2x2
// factorial's main effect = mean at high - mean at low); no external
// threshold is quoted.

const CHECKED = "2026-11-14";

export const CSSGB_LABS: SeedLabSet = {
  trackCode: "CSSGB",
  sources: [
    source("https://www.asq.org/cert/resource/pdf/certification/cssgb-cert-insert.pdf", "exam_outline", CHECKED),
    source("https://www.asq.org/cert/six-sigma-green-belt", "exam_outline", CHECKED),
  ],
  labs: [
    // Six Sigma and the Organization (2)
    {
      slug: "cssgb-fmea-rpn",
      objective: "Building a basic FMEA and calculating and interpreting risk priority numbers",
      kind: "build",
      title: "Score two failure modes",
      brief:
        "A fictional Green Belt at Alder Medical Supplies runs a process FMEA on the sterile-packaging line (ratings 1-10). Failure mode A, seal not fully closed: severity 8, occurrence 4, detection 5. Failure mode B, wrong label printed: severity 9, occurrence 2, detection 3.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Calculate the RPN for failure mode A, compare it with B, and say what you would act on first and why.",
          parts: [
            numericPart(
              "RPN for A",
              "RPN = S x O x D = 8 x 4 x 5 = 160. Met at 160.",
              "A: 8 x 4 x 5 = 160. B: 9 x 2 x 3 = 54.",
              { answer: 160, tolerance: 0 }
            ),
            part(
              "Priority",
              "Ranks A higher on RPN but notes B's severity of 9 means it also deserves action (high severity is not ignored just because the RPN is lower); proposes actions that cut occurrence or improve detection.",
              "A has the higher RPN (160 vs 54), so it goes first: improve seal-bar maintenance to cut occurrence and add an inline seal check to improve detection. B's severity is 9, though, so it still gets an action -- such as a barcode check on the label -- rather than waiting on the RPN ranking."
            ),
          ],
        },
      ],
    },
    {
      slug: "cssgb-value-stream-efficiency",
      objective: "Using value stream mapping to separate value-added steps from waste",
      kind: "build",
      title: "How much of the lead time adds value?",
      brief:
        "A fictional value stream map of loan approvals at Juniper Credit Union shows a total lead time of 3,500 minutes from application to decision. The steps that change the application in a way the member would pay for -- data entry, credit check, underwriting decision -- take 70 minutes in all. The rest is queues, re-keying and waiting for signatures.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Calculate the process cycle efficiency (value-added time / lead time) as a percent, and name two kinds of waste the map shows with one countermeasure each.",
          parts: [
            numericPart(
              "Process cycle efficiency (%)",
              "70 / 3,500 = 0.02 = 2%. Met within 0.1.",
              "70 / 3,500 = 0.02, so about 2% of the lead time adds value.",
              { answer: 2, tolerance: 0.1, unit: "%" }
            ),
            part(
              "Waste and countermeasures",
              "Names at least two wastes from the map (waiting, overprocessing or re-keying, transportation of paper, inventory of applications in queues) with a sensible countermeasure each.",
              "Waiting for signatures: use electronic signatures. Overprocessing from re-keying data: capture it once and pass it between systems. Queues of applications: limit work in progress and pull work through."
            ),
          ],
        },
      ],
    },

    // Define Phase (2)
    {
      slug: "cssgb-rolled-throughput-yield",
      objective: "Calculating process performance metrics: defects per unit, defects per million opportunities, rolled throughput yield and the cost of poor quality",
      kind: "build",
      title: "Baseline a three-step process",
      brief:
        "A fictional circuit-board line at Harlow Electronics has three steps with first-pass yields of 95% (solder paste), 90% (component placement) and 98% (reflow). Last month 300 boards had 45 defects in all.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Calculate the rolled throughput yield as a percent and the defects per unit, and explain what RTY reveals that a final yield can hide.",
          parts: [
            numericPart(
              "RTY (%)",
              "RTY = 0.95 x 0.90 x 0.98 = 0.8379, about 83.8%. Met within 0.1.",
              "0.95 x 0.90 = 0.855; 0.855 x 0.98 = 0.8379, so RTY is about 83.8%.",
              { answer: 83.8, tolerance: 0.1, unit: "%" }
            ),
            numericPart(
              "Defects per unit",
              "DPU = 45 / 300 = 0.15. Met within 0.001.",
              "DPU = 45 defects / 300 boards = 0.15.",
              { answer: 0.15, tolerance: 0.001 }
            ),
            part(
              "What RTY shows",
              "Explains RTY is the chance a unit passes every step first time, exposing hidden rework (the 'hidden factory') that a final yield after rework can hide.",
              "RTY is the probability a board gets through every step right the first time. A final yield counts boards that pass after rework, so it can look high while rework -- the hidden factory -- eats capacity and cost."
            ),
          ],
        },
      ],
    },
    {
      slug: "cssgb-project-charter",
      objective: "Writing a project charter: problem statement, scope, primary and consequential metrics, plan and risks",
      kind: "build",
      title: "Charter a late-delivery project",
      brief:
        "At the fictional Brindle Office Supplies distribution center, 12% of next-day orders shipped late over the last six months (target 2%). Late orders cost about $40 each in refunds and calls. The sponsor is the operations director.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the problem statement, the scope, a primary and a consequential metric, and one project risk.",
          parts: [
            part(
              "Problem statement",
              "States the measurable gap, where and when, and its impact, without naming a cause or a solution.",
              "Over the last six months, 12% of next-day orders from the Brindle distribution center shipped late against a 2% target, costing about $40 per late order in refunds and calls."
            ),
            part(
              "Scope",
              "Defines in and out of scope (e.g. from order release to carrier hand-off at this site; carrier transit and other sites out).",
              "In scope: next-day orders at this site, from order release to hand-off to the carrier. Out of scope: carrier transit times, other sites and standard-delivery orders."
            ),
            part(
              "Metrics",
              "Primary metric (e.g. % next-day orders late) and a consequential metric that must not get worse (e.g. picking errors or overtime cost).",
              "Primary: percent of next-day orders shipped late, from 12% to 2%. Consequential: picking accuracy and overtime hours must not get worse."
            ),
            part(
              "Risk",
              "Names a credible risk with a response (e.g. seasonal peak during the project, data quality of timestamps).",
              "The holiday peak falls mid-project and could swamp the baseline; plan data collection around it and confirm order timestamps are accurate before measuring."
            ),
          ],
        },
      ],
    },

    // Measure Phase (2)
    {
      slug: "cssgb-capability-indices",
      objective: "Calculating Cp, Cpk, Pp and Ppk and the sigma level, and allowing for the shift between short- and long-term data",
      kind: "build",
      title: "Is the fill process capable?",
      brief:
        "A fictional bottling line at Cascade Springs fills to a specification of 10.0 +/- 0.6 oz (LSL 9.4, USL 10.6). A stable, normally distributed short-term study gives a mean of 10.1 oz and a standard deviation of 0.15 oz.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Calculate Cp and Cpk, explain the difference, and say what you would change first.",
          parts: [
            numericPart(
              "Cp",
              "Cp = (10.6 - 9.4) / (6 x 0.15) = 1.2 / 0.9 = 1.33. Met within 0.01.",
              "Cp = 1.2 / 0.9 = 1.33.",
              { answer: 1.33, tolerance: 0.01 }
            ),
            numericPart(
              "Cpk",
              "Cpk = min((10.6 - 10.1) / 0.45, (10.1 - 9.4) / 0.45) = min(1.11, 1.56) = 1.11. Met within 0.01.",
              "Upper: (10.6 - 10.1) / (3 x 0.15) = 0.5 / 0.45 = 1.11. Lower: 0.7 / 0.45 = 1.56. Cpk = 1.11.",
              { answer: 1.11, tolerance: 0.01 }
            ),
            part(
              "Interpretation",
              "Explains Cp is potential (spread vs tolerance), Cpk accounts for centering; Cpk < Cp means the process is off center toward the USL, so re-centering to 10.0 is the first step; notes short-term indices overstate long-term performance (Pp/Ppk).",
              "Cp says the spread would fit if centered; Cpk is lower because the mean sits 0.1 oz toward the upper limit. Re-center the fill to 10.0 first -- that alone lifts Cpk to Cp. These are short-term figures; long-term Pp and Ppk will usually be lower as the process drifts."
            ),
          ],
        },
      ],
    },
    {
      slug: "cssgb-gauge-rr-case",
      objective: "Evaluating a measurement system with gauge R&R, bias, linearity and percent agreement",
      kind: "case",
      title: "Can we trust the micrometer?",
      brief:
        "Before a capability study at the fictional Ashford Machining, a Green Belt runs a gauge R&R: 10 parts, 3 operators, 3 repeat measurements each.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "The study shows the measurement system takes up a large share of the tolerance, and most of that comes from differences between operators rather than from repeat measurements by the same operator.",
          ask: "What does this split tell you, and what would you do?",
          parts: [
            part(
              "Diagnosis",
              "Identifies reproducibility (operator-to-operator variation) as dominant over repeatability (equipment), pointing to method or training differences.",
              "Reproducibility dominates: each operator is consistent, but they differ from each other. That points to differences in method -- how the part is held, where it is measured, how hard the micrometer is closed -- not the instrument."
            ),
            part(
              "Action",
              "Standardizes the method (work instruction, training, fixture) and re-runs the study before collecting capability data.",
              "Write a standard measuring method, train all three operators, add a fixture if needed, and re-run the gauge R&R before trusting any capability data."
            ),
          ],
        },
        {
          text: "The capability study had already been run with the old measurements.",
          ask: "What do you do with those results?",
          parts: [
            part(
              "Prior data",
              "Explains measurement variation inflates observed process variation, so the earlier capability is unreliable and should be repeated after the fix.",
              "Treat them as unreliable: measurement variation adds to the observed spread, so the earlier capability is understated and misleading. Repeat the study once the measurement system is fixed."
            ),
          ],
        },
      ],
    },

    // Analyze Phase (2)
    {
      slug: "cssgb-choose-the-test",
      objective: "Choosing and interpreting tests for means, variances and proportions: t-tests, the F-test, ANOVA and chi-square",
      kind: "build",
      title: "Pick the hypothesis test",
      brief:
        "A fictional Green Belt at Holloway Plastics has five questions about the injection-molding process.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Match each question to the test that fits it.",
          parts: [
            matchPart(
              "Question to test",
              "All five correct is met; three or four is partly there.",
              "Two independent machines' mean wall thickness: two-sample t-test. The same 20 parts measured before and after a tool change: paired t-test. Mean strength across three resin suppliers: one-way ANOVA. Whether two processes differ in variability: F-test. Whether defect type depends on shift: chi-square test of independence.",
              {
                left: [
                  "Does mean wall thickness differ between machine 1 and machine 2?",
                  "Did the same 20 parts change weight after a tool change?",
                  "Does mean tensile strength differ across three resin suppliers?",
                  "Is process A more variable than process B?",
                  "Does the type of defect depend on which shift made the part?",
                ],
                right: ["Two-sample t-test", "Paired t-test", "One-way ANOVA", "F-test", "Chi-square test of independence", "Control chart"],
                pairs: [0, 1, 2, 3, 4],
              }
            ),
          ],
        },
      ],
    },
    {
      slug: "cssgb-correlation-not-causation",
      objective: "Calculating correlation and simple linear regression, and telling correlation from causation",
      kind: "case",
      title: "Humidity and cracked tiles",
      brief:
        "At the fictional Marlow Ceramics plant, a Green Belt plots daily humidity against the percentage of cracked tiles for 60 days.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "The correlation coefficient is r = 0.82, and the regression slope is significant (p < 0.01).",
          ask: "How much of the variation in cracking does humidity explain, as a percent (r squared)?",
          parts: [
            numericPart(
              "R squared (%)",
              "r^2 = 0.82^2 = 0.6724, about 67%. Met within 0.5.",
              "0.82 x 0.82 = 0.6724, so humidity explains about 67% of the day-to-day variation in cracking.",
              { answer: 67.2, tolerance: 0.5, unit: "%" }
            ),
            part(
              "Statistical meaning",
              "States a strong positive relationship that is unlikely to be chance (p < 0.01), while about a third of the variation is unexplained.",
              "A strong positive relationship, very unlikely to be chance, but about a third of the variation comes from something else."
            ),
          ],
        },
        {
          text: "The plant manager wants to buy dehumidifiers immediately.",
          ask: "What would you say before that purchase?",
          parts: [
            part(
              "Causation",
              "Explains correlation is not causation; a lurking variable (e.g. season, kiln load on humid days) may drive both; proposes confirming cause, e.g. a controlled trial or designed experiment.",
              "Correlation is not causation: humid days may also be the days the kiln runs hotter loads, or a season when a different clay batch is used. Confirm the cause first -- for example, a controlled trial with humidity varied while other factors are held steady -- before spending."
            ),
          ],
        },
      ],
    },

    // Improve Phase (2)
    {
      slug: "cssgb-doe-main-effect",
      objective: "Interpreting main effects and interaction plots",
      kind: "build",
      title: "Read a 2x2 experiment",
      brief:
        "A fictional Green Belt at Wexford Adhesives runs a 2x2 full factorial on bond strength (psi) with factors A (cure temperature) and B (pressure). Results: A low B low 20, A high B low 30, A low B high 24, A high B high 26.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Calculate the main effect of A, then describe the interaction and what it means for the settings.",
          parts: [
            numericPart(
              "Main effect of A (psi)",
              "Mean at A high = (30 + 26) / 2 = 28; mean at A low = (20 + 24) / 2 = 22; effect = 6 psi. Met at 6.",
              "A high: (30 + 26) / 2 = 28. A low: (20 + 24) / 2 = 22. Main effect of A = 28 - 22 = 6 psi.",
              { answer: 6, tolerance: 0, unit: "psi" }
            ),
            part(
              "Interaction",
              "Recognizes an AB interaction: raising A helps by 10 at low B but only 2 at high B (non-parallel lines), so A's effect depends on B; recommends A high with B low based on these runs, and confirmation runs.",
              "There is an interaction: raising temperature adds 10 psi at low pressure but only 2 at high pressure, so the lines on the interaction plot are not parallel. The best result here is high temperature with low pressure (30 psi); confirm with repeat runs before changing the process."
            ),
          ],
        },
      ],
    },
    {
      slug: "cssgb-lean-tool-match",
      objective: "Eliminating waste with pull systems, kanban, 5S, standard work and poka-yoke",
      kind: "build",
      title: "Match the lean tool",
      brief:
        "A fictional assembly cell at Corran Bikes has four recurring problems.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Match each problem to the lean tool that most directly prevents it.",
          parts: [
            matchPart(
              "Problem to tool",
              "All four correct is met; two or three is partly there.",
              "Workers searching for tools: 5S. A part installed backwards: poka-yoke (a fixture that only fits one way). Piles of frames built ahead of demand: kanban pull. Each worker assembling wheels a different way: standard work.",
              {
                left: [
                  "Workers spend minutes searching for torque wrenches",
                  "Brake levers are sometimes fitted the wrong way round",
                  "Painted frames pile up ahead of assembly while orders change",
                  "Each worker assembles the wheel in a different sequence",
                ],
                right: ["5S", "Poka-yoke", "Kanban pull system", "Standard work", "Overtime"],
                pairs: [0, 1, 2, 3],
              }
            ),
          ],
        },
      ],
    },

    // Control Phase (2)
    {
      slug: "cssgb-choose-control-chart",
      objective: "Selecting and interpreting a control chart: X-bar and R, X-bar and s, individuals and moving range, median, p, np, c and u",
      kind: "build",
      title: "Pick the control chart",
      brief:
        "A fictional quality team at Dunmore Foods must chart five kinds of data.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Match each data set to the control chart that fits it.",
          parts: [
            matchPart(
              "Data to chart",
              "All five correct is met; three or four is partly there.",
              "Subgroups of 5 package weights each hour: X-bar and R. One viscosity reading per batch: individuals and moving range. Proportion of defective jars in samples of varying size: p chart. Number of blemishes per standard-sized sheet: c chart. Blemishes per square meter on rolls of varying size: u chart.",
              {
                left: [
                  "Weights of 5 packages sampled every hour",
                  "One viscosity reading per batch, one batch a day",
                  "Fraction of defective jars in daily samples whose size varies",
                  "Count of blemishes on each standard-sized sheet",
                  "Blemishes per square meter on rolls of different sizes",
                ],
                right: ["X-bar and R chart", "Individuals and moving range chart", "p chart", "c chart", "u chart", "np chart"],
                pairs: [0, 1, 2, 3, 4],
              }
            ),
          ],
        },
      ],
    },
    {
      slug: "cssgb-special-cause-points",
      objective: "Explaining the aims of SPC and telling common-cause from special-cause variation",
      kind: "build",
      title: "Find the out-of-control points",
      brief:
        "A fictional X-bar chart at Penrose Paper has a center line of 50.0, an upper control limit of 52.0 and a lower control limit of 48.0. The last eight subgroup means are listed in order.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Select the subgroups that fall outside the control limits, then say what each kind of variation calls for.",
          parts: [
            selectPart(
              "Points beyond the limits",
              "Selecting both points outside the limits and nothing else is met; one of them is partly there.",
              "Subgroup 4 (52.6) is above the UCL and subgroup 7 (47.2) is below the LCL. The others are inside the limits.",
              {
                lines: [
                  "Subgroup 1: 49.8",
                  "Subgroup 2: 50.6",
                  "Subgroup 3: 51.1",
                  "Subgroup 4: 52.6",
                  "Subgroup 5: 49.4",
                  "Subgroup 6: 50.2",
                  "Subgroup 7: 47.2",
                  "Subgroup 8: 50.9",
                ],
                correct: [3, 6],
                display: "log",
              }
            ),
            part(
              "Responses",
              "Special causes (points outside limits) are investigated and removed at their source; common-cause variation is not reacted to point by point (tampering) but reduced by improving the process itself.",
              "The two points outside the limits signal special causes: investigate what was different at those times and remove the cause. The variation inside the limits is common cause: adjusting for each point is tampering and makes things worse; reducing it means changing the process itself."
            ),
          ],
        },
      ],
    },
  ],
};
