import { GENERAL_SAFETY, part, type SeedLabSet } from "./types";
import { source } from "../sources";

// REQ-171: PMI-CPMAI (PMI Certified Professional in Managing AI).
//
// Aligned to the September 2025 ECO's five domains as the seed track carries
// them: Support Responsible and Trustworthy AI Efforts 15%, Identify
// Business Needs and Solutions 26%, Identify Data Needs 26%, Manage AI Model
// Development and Evaluation 16%, Operationalize AI Solution 17%. pmi.org's
// PMI-CPMAI page, read 2026-11-09, still offers the exam (120 questions,
// 160 minutes) and announces no change, but doesn't list domain weights.
// The ECO PDF (pmicpmai-exam-content-outline2025-updated.pdf) was fetched
// and re-read on 2026-11-09 and its weights match the ones above. AI
// pattern names follow the Seven Patterns of AI that the ECO cites
// (Cognilytica, read 2026-11-09).
// Density ("hybrid"): 2 / 3 / 2 / 2 / 2 = 11 labs (7 build, 4 case).
// Model metrics are worked in the model answers; no vendor product is
// required.

const CHECKED = "2026-11-09";

export const PMICPMAI_LABS: SeedLabSet = {
  trackCode: "PMICPMAI",
  sources: [
    source("https://www.pmi.org/certifications/ai-project-management-cpmai", "exam_outline", CHECKED),
    source(
      "https://www.pmi.org/-/media/pmi/documents/public/pdf/certifications/pmicpmai-exam-content-outline2025-updated.pdf",
      "exam_outline",
      "2026-09-27"
    ),
  ],
  labs: [
    // Responsible and trustworthy AI (2)
    {
      slug: "cpmai-bias-check-case",
      objective:
        "Conducting bias checks across model, data, and algorithm: demographic representation analysis, fairness testing, and bias-mitigation techniques",
      kind: "case",
      title: "A screening model that favours one group",
      brief:
        "Harborview Credit Union (fictional) is piloting a model that recommends which loan applications go to fast-track approval. You manage the AI project.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "Pilot results: applicants aged under 30 make up 35% of applications and are fast-tracked at 10%; applicants 30 and over are fast-tracked at 40%. Approval outcomes for both groups after full review are similar.",
          ask: "What do you check to find out whether the model is biased?",
          parts: [
            part(
              "Fairness tests",
              "Computes or requests fast-track rates by group and compares them (e.g. disparate impact ratio), and checks error rates by group (people who would be approved but weren't fast-tracked).",
              "Fast-track rate by age group, and the ratio between them; and, using full-review outcomes as ground truth, the miss rate by group (approved later but not fast-tracked). Similar final approval rates with very different fast-track rates suggests the model under-serves younger applicants."
            ),
            part(
              "Data and features",
              "Checks the training data's representation of under-30s and whether features act as proxies for age (e.g. length of credit history, years at address).",
              "Check how many under-30s were in the training data and whether features like credit history length or years at address stand in for age."
            ),
          ],
        },
        {
          text: "Analysis: under-30s were 9% of training data, and credit-history length is the strongest feature. Legal confirms age must not drive decisions.",
          ask: "What mitigation do you propose, and how will you confirm it worked?",
          parts: [
            part(
              "Mitigation",
              "Proposes specific steps: rebalance or reweight training data, reconsider proxy features, possibly add a fairness constraint, and keep human review for affected cases; retest with the same fairness metrics before go-live and monitor in production.",
              "Reweight training data so under-30s are properly represented, test the model without credit-history length or with a capped effect, and retest fast-track and miss rates by group against an agreed threshold. Keep full human review for anyone not fast-tracked, and monitor the rates monthly."
            ),
          ],
        },
      ],
    },
    {
      slug: "cpmai-audit-trail",
      objective:
        "Managing accountability documentation and audit trails: version control for models/data/training processes and stakeholder approval records",
      kind: "build",
      title: "Specify the audit trail for a regulated model",
      brief:
        "Harborview Credit Union's (fictional) fast-track model will be reviewed by its regulator once a year. Today, data scientists keep training notebooks on laptops, and the 'current model' is whichever file was last copied to the server.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Specify what must be recorded and controlled so any decision the model made can be explained later.",
          parts: [
            part(
              "Versioning",
              "Requires version control of code, training data snapshots (or references with hashes), model artifacts, and hyperparameters, linked to each other.",
              "Code in Git; each training dataset snapshot stored with a version ID and hash; each model version in a model registry linked to its code commit, data version and hyperparameters."
            ),
            part(
              "Decision traceability",
              "Logs, for each prediction, the model version, input features (or reference) and output, kept for the required retention period.",
              "For each application: timestamp, model version, input feature values, score and recommendation, retained per the credit union's record-keeping policy."
            ),
            part(
              "Approvals",
              "Records approvals at key gates (data use, model validation results including fairness tests, go-live) with approver, date and evidence.",
              "Signed records for data-use approval (privacy), validation sign-off (performance and fairness results attached), and go-live approval by the model risk owner -- stored with the model version."
            ),
          ],
        },
      ],
    },

    // Business needs and solutions (3)
    {
      slug: "cpmai-problem-to-ai-pattern",
      objective:
        "Identifying the problem to be solved: user personas, mapping business problems to AI patterns, and validating problem statements with SMEs",
      kind: "build",
      title: "Map business problems to AI patterns",
      brief:
        "Oakline Retail (fictional) leadership lists 'AI ideas': (1) know which customers are likely to stop shopping with us; (2) answer common customer questions any time of day; (3) spot fraudulent returns; (4) group customers into segments for marketing nobody has defined yet; (5) predict next month's sales per store. Some ideas may not need AI at all.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Map each idea to an AI pattern and say how you'd validate the problem before committing.",
          parts: [
            part(
              "Patterns",
              "Uses the Seven Patterns of AI names: 1 predictive analytics and decision support (churn classification); 2 conversational/human interaction (chatbot); 3 patterns and anomalies (fraud detection); 4 patterns and anomalies (unsupervised clustering finds which customers belong together -- not recognition, which identifies things in unstructured data such as images or text); 5 predictive analytics and decision support (time-series forecasting).",
              "1 predictive analytics and decision support -- churn classification. 2 conversational/human interaction -- a customer-service assistant. 3 patterns and anomalies -- fraud detection. 4 patterns and anomalies -- unsupervised clustering into segments nobody has defined. 5 predictive analytics and decision support -- sales forecasting."
            ),
            part(
              "Persona and problem statement",
              "Writes a problem statement for one idea with the user persona and the decision it supports, e.g. who uses churn scores and what they will do.",
              "Persona: CRM manager running monthly retention offers. Problem: 'Retention offers go to all lapsed customers after they leave; we need a monthly list of active customers likely to stop within 60 days, so offers reach them before they go.'"
            ),
            part(
              "Validation",
              "Validates with SMEs and data: does the decision exist, is the data available, would a simpler rule work (e.g. a basic report for idea 5), and what success looks like.",
              "Check with marketing and store managers that they would act on the output, confirm the data exists, and test a simple baseline first -- if last year's same-month sales predict well enough, idea 5 may not need AI."
            ),
          ],
        },
      ],
    },
    {
      slug: "cpmai-roi-cost-benefit",
      objective: "Determining ROI: expected benefits, total cost of ownership, and a cost-benefit analysis for stakeholder decision-making",
      kind: "build",
      title: "Work out the ROI of a churn model",
      brief:
        "Oakline Retail (fictional) has 200,000 active loyalty customers; 10% stop shopping each year, each worth $150 margin a year. A churn model plus targeted offers is expected to keep 15% of would-be leavers. Costs: build $180,000 (one-off); cloud and monitoring $40,000 a year; offers $20 each to 12,000 customers a year; a data scientist for maintenance at 0.25 FTE ($35,000 a year).",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Calculate the annual benefit, total cost of ownership and ROI over three years.",
          parts: [
            part(
              "Annual benefit",
              "Would-be leavers 20,000; retained 15% = 3,000; benefit 3,000 x $150 = $450,000 a year.",
              "200,000 x 10% = 20,000 leavers; 15% retained = 3,000; 3,000 x $150 = $450,000 a year."
            ),
            part(
              "Three-year TCO",
              "Annual running = 40,000 + 240,000 (12,000 x $20) + 35,000 = $315,000; three-year TCO = 180,000 + 3 x 315,000 = $1,125,000.",
              "Running cost: $40,000 + $240,000 + $35,000 = $315,000 a year. Three years: $180,000 + $945,000 = $1,125,000."
            ),
            part(
              "ROI and interpretation",
              "Three-year benefit $1,350,000; net $225,000; ROI = 225,000 / 1,125,000 = 20%; notes sensitivity (offer cost dominates; if retention is 10% the project loses money) and suggests testing assumptions with a pilot.",
              "Benefit 3 x $450,000 = $1,350,000; net $225,000; ROI 20%. The offers are the biggest cost, and at 10% retention benefit falls to $900,000, a loss -- so pilot with a control group to measure real retention before scaling."
            ),
          ],
        },
      ],
    },
    {
      slug: "cpmai-feasibility-case",
      objective:
        "Evaluating initial AI feasibility: technical viability, data availability/quality, computational resource requirements, and organizational readiness",
      kind: "case",
      title: "Is the maintenance-prediction idea feasible?",
      brief:
        "Brennock Rail (fictional) wants to predict train door failures two weeks ahead so they can be fixed during planned maintenance.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "You find: door sensors log open/close times every trip; failures are recorded in a maintenance system as free text; there were 180 door failures across 300 trains in two years; maintenance planners say they could act on a two-week warning.",
          ask: "Assess feasibility across technical, data and organisational readiness.",
          parts: [
            part(
              "Data",
              "Notes positives (sensor data exists) and gaps: free-text failure records need labelling/linking to sensor data; 180 failures is a small, imbalanced set; data quality and time alignment must be checked.",
              "Sensor data is plentiful but failures are rare (180) and recorded as free text, so they must be labelled and matched to trains and dates -- labelling effort and class imbalance are the main risks."
            ),
            part(
              "Technical and organisational",
              "Judges the pattern technically plausible (anomaly detection or classification on sensor trends) with modest compute, and organisational readiness positive (planners will act) but notes skills/ownership needs.",
              "Detecting slower door cycles before failure is a plausible pattern with modest compute. Planners are ready to act; the project needs a data engineer for the sensor pipeline and an owner in maintenance."
            ),
          ],
        },
        {
          text: "Labelling a sample shows that only 60 failures can be linked confidently to sensor records.",
          ask: "What do you recommend?",
          parts: [
            part(
              "Recommendation",
              "Recommends a staged approach: proof of concept with the 60 linked failures (or anomaly detection that needs fewer labels), improve failure recording going forward, and a go/no-go gate with defined success criteria.",
              "Run a 3-month proof of concept using anomaly detection (needs few labels) validated on the 60 linked failures; change the maintenance system to record door failures with a structured code from now on; go/no-go if it flags at least half of known failures two weeks ahead with an acceptable false-alarm rate."
            ),
          ],
        },
      ],
    },

    // Data needs (2)
    {
      slug: "cpmai-data-quality-assessment",
      objective:
        "Overseeing data evaluation: quality dimensions (accuracy, completeness, consistency), bias/gap analysis, and exploratory data analysis",
      kind: "build",
      title: "Assess a dataset before training",
      brief:
        "Oakline Retail's (fictional) churn dataset: 200,000 customers, 24 months of history. Exploratory analysis shows: 'last purchase date' is missing for 8% of customers; 'region' has values 'North', 'north', 'N' and 'Northern'; 3% of customers have a birth year of 1900; online customers are only 15% of records although they are 40% of current sales.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the data quality assessment and the actions before training.",
          parts: [
            part(
              "Findings by dimension",
              "Classifies findings: completeness (8% missing last purchase date), consistency (region spellings), accuracy/validity (1900 birth years as placeholder), representativeness (online customers under-represented).",
              "Completeness: 8% missing last-purchase date. Consistency: four spellings of one region. Accuracy: 1900 birth years are placeholders, not real ages. Representativeness: online customers 15% of records vs 40% of sales."
            ),
            part(
              "Actions",
              "Gives an action for each (investigate why dates are missing rather than blindly imputing; standardise region codes; treat 1900 as missing; obtain more online data or weight it) and documents them.",
              "Find out why dates are missing (maybe in-store cash buyers) before choosing imputation; map region values to one code; set 1900 birth years to missing; add online transactions from the e-commerce system or reweight. Record every change for reproducibility."
            ),
            part(
              "Readiness message",
              "States the data readiness in business terms for leadership (what's usable now, what delays training).",
              "Leadership summary: data is usable after about two weeks of cleaning; the online gap is the main risk -- without it, predictions for online customers will be weaker."
            ),
          ],
        },
      ],
    },
    {
      slug: "cpmai-data-privacy-rights-case",
      objective: "Gathering required data and checking privacy, compliance, and access rights (usage licensing, data protection regulations)",
      kind: "case",
      title: "Can we use this data to train?",
      brief:
        "Pinemoor Insurance (fictional) wants to train its document classifier on two years of claim documents, which contain names, addresses and medical details.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "The data team proposes copying all documents to a cloud workspace used by an external AI vendor.",
          ask: "What do you check before any data moves?",
          parts: [
            part(
              "Checks",
              "Checks the legal basis and purpose compatibility under applicable data protection law, consent/privacy notices, the data protection officer's view (impact assessment), data minimisation, the vendor contract (processing terms, location, security) and access controls.",
              "Ask the data protection officer for a privacy impact assessment: is training a compatible purpose under the privacy notice and law; can we minimise (only fields needed for classification); does the vendor contract cover processing, data location, security and deletion; who will have access."
            ),
          ],
        },
        {
          text: "The DPO says medical details are sensitive data and the vendor's workspace is outside the approved region. The classifier needs only document layout and wording, not identities.",
          ask: "What do you propose?",
          parts: [
            part(
              "Approach",
              "Proposes de-identifying or redacting personal data before use, keeping data in the approved region (e.g. vendor works in the insurer's environment), limiting access and retention, and documenting approvals.",
              "Redact names, addresses and policy numbers before training, keep data in the insurer's own cloud tenancy in the approved region with the vendor given restricted access, delete training copies after the project, and file the DPO's approval with the project records."
            ),
          ],
        },
      ],
    },

    // Model development and evaluation (2)
    {
      slug: "cpmai-model-evaluation-go-no-go",
      objective: "Verifying data quality and readiness for training with a go/no-go decision, and verifying model readiness for operationalization",
      kind: "build",
      title: "Make the go/no-go call on a fraud model",
      brief:
        "Oakline Retail's (fictional) returns-fraud model was tested on 10,000 held-out returns, of which 200 were fraudulent. It flagged 300 returns, of which 150 were truly fraudulent. Agreed go-live criteria: recall at least 70%, precision at least 40%, and investigators can handle at most 400 flags per 10,000 returns.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Calculate the metrics and make the go/no-go recommendation.",
          parts: [
            part(
              "Metrics",
              "Precision = 150/300 = 50%; recall = 150/200 = 75%; flags 300 per 10,000 (within 400).",
              "Precision 150 / 300 = 50%; recall 150 / 200 = 75%; 300 flags per 10,000, under the 400 limit."
            ),
            part(
              "Decision",
              "Concludes all criteria are met (go), while stating other readiness checks still needed before production (fairness by group, monitoring plan, rollback, user training).",
              "All three criteria are met, so the model is ready on performance. Before production, confirm fairness across customer groups, monitoring and rollback plans, and investigator training -- then go."
            ),
            part(
              "What-if",
              "Explains the effect of raising the threshold (fewer flags, higher precision, lower recall) and that the threshold should be set with the business.",
              "A higher threshold gives fewer flags and probably higher precision but lower recall -- more fraud missed. Set the threshold with the loss-prevention team based on investigator capacity and the cost of missed fraud."
            ),
          ],
        },
      ],
    },
    {
      slug: "cpmai-algorithm-selection",
      objective:
        "Overseeing AI/ML model technique and algorithm selection: supervised/unsupervised/reinforcement learning tradeoffs against complexity and interpretability",
      kind: "build",
      title: "Choose the learning approach for three tasks",
      brief:
        "Three fictional tasks: (A) Harborview Credit Union must explain to each applicant why a loan was declined; it has 5 years of labelled outcomes. (B) Oakline Retail wants to find groups of customers with similar buying habits; it has purchase histories but no labels. (C) A warehouse wants software that learns over time how to route picking robots to minimise travel, using a simulator.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Recommend the learning approach for each task and explain the trade-offs.",
          parts: [
            part(
              "Task A",
              "Supervised learning (labelled outcomes) with an interpretable model (e.g. logistic regression, scorecard or shallow tree) or explainability methods, because declines must be explained; trades some accuracy for interpretability.",
              "Supervised learning on the labelled outcomes, using an interpretable model such as a scorecard or logistic regression so reason codes can be given to each applicant -- accepting slightly lower accuracy than a complex model."
            ),
            part(
              "Task B",
              "Unsupervised learning (clustering) because there are no labels; results need business interpretation and validation.",
              "Unsupervised clustering of purchase patterns; marketing must interpret and name the clusters and check they are useful."
            ),
            part(
              "Task C",
              "Reinforcement learning, which learns a policy from rewards (e.g. shorter travel) via trial in the simulator; notes higher complexity and the need to validate safely before real use.",
              "Reinforcement learning: the agent tries routes in the simulator and is rewarded for less travel. It's complex to build and test, so validate in simulation and a limited trial before full use."
            ),
          ],
        },
      ],
    },

    // Operationalize (2)
    {
      slug: "cpmai-deployment-rollback-plan",
      objective: "Creating an AI solution deployment plan: strategy, timeline, infrastructure requirements, and rollback procedures",
      kind: "build",
      title: "Plan the deployment of a document classifier",
      brief:
        "Pinemoor Insurance's (fictional) document classifier passed validation. 8,000 documents a day are sorted by hand today. The claims director wants it live for everyone next Monday. A misfiled medical report delays a claim by about a week.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the deployment plan.",
          parts: [
            part(
              "Strategy",
              "Uses a staged rollout (shadow mode where AI and staff both classify and results are compared, then a percentage or document-type rollout) rather than a big bang.",
              "Week 1-2: shadow mode -- the model classifies alongside staff and differences are reviewed. Week 3: auto-sort 25% of volume, excluding medical reports. Week 5: all types if quality holds."
            ),
            part(
              "Infrastructure and readiness",
              "Lists infrastructure (production endpoint, scaling for 8,000 a day, integration with the document system, logging/monitoring) and people readiness (staff trained to handle low-confidence queue).",
              "Production endpoint sized for peak hour volume, integration with the document management system, prediction logging and dashboards, and staff trained on the new low-confidence review queue."
            ),
            part(
              "Rollback",
              "Defines rollback triggers (e.g. precision below threshold, system errors) and the procedure (switch routing back to manual, keep the previous model version), with an owner.",
              "If measured precision on sampled documents drops below 98% or the service errors for over 15 minutes, the operations lead switches routing back to manual sorting (a configuration flag) and the previous model version stays deployable."
            ),
          ],
        },
      ],
    },
    {
      slug: "cpmai-drift-governance-case",
      objective: "Overseeing model governance: lifecycle management, versioning, and drift detection/monitoring",
      kind: "case",
      title: "A model that slowly gets worse",
      brief:
        "Oakline Retail's (fictional) churn model has been live for 10 months. Each month it scores customers and the CRM team sends offers.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "The monitoring dashboard shows the share of customers scored 'high risk' rose from 8% to 19% over three months, while actual churn stayed about the same. Online sales have grown fast since a new app launched.",
          ask: "What is happening, and how do you confirm it?",
          parts: [
            part(
              "Diagnosis",
              "Suspects data drift (input distributions changed with app customers, e.g. fewer store visits recorded) causing miscalibration, and confirms by comparing feature distributions to training data and checking performance on recent labelled outcomes.",
              "Probably data drift: app customers shop differently (fewer store visits), so the model reads them as at risk. Compare current feature distributions with the training data, and check precision/recall on customers whose outcome is now known."
            ),
          ],
        },
        {
          text: "The checks confirm drift and that precision has fallen from 45% to 22%.",
          ask: "What do you do, and what governance changes prevent a repeat?",
          parts: [
            part(
              "Response",
              "Retrains on recent data including app behaviour (as a new version), validates against criteria, deploys through the normal approval process, and limits harm meanwhile (e.g. reduce offer volume).",
              "Cut the offer list to the top-scored customers to limit waste, retrain on the last 12 months including app data as version 2, validate against the go-live criteria and release through the approval process."
            ),
            part(
              "Governance",
              "Adds drift thresholds that trigger review automatically, a scheduled retraining/review cadence, and a requirement to assess model impact when major business changes (like an app launch) happen.",
              "Set alert thresholds on feature drift and on the high-risk share; review the model quarterly; and add 'impact on live models' to the checklist for major business changes."
            ),
          ],
        },
      ],
    },
  ],
};
