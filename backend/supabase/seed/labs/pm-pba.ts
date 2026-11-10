import { GENERAL_SAFETY, part, type SeedLabSet, numericPart } from "./types";
import { source } from "../sources";

// REQ-150: PMI-PBA (PMI Professional in Business Analysis; current ECO when
// checked on 2026-11-07, domain weights confirmed on pmi.org's PMI-PBA
// page, no retirement or new-exam notice).
//
// Aligned to the ECO's five domains (Needs Assessment 18%, Planning 22%,
// Analysis 35%, Traceability and Monitoring 15%, Evaluation 10%) and the
// tasks a PBA item asks a candidate to perform: quantify a value
// proposition; elicit stakeholder values; plan requirements management and
// requirements change control; decompose and model requirements (a
// decision table); evaluate options with a weighted valuation; write
// measurable specifications; manage a change through the traceability
// matrix; report requirements status; analyse delivered-solution gaps; and
// evaluate the deployed solution against its business case.
//   https://www.pmi.org/-/media/pmi/documents/public/pdf/certifications/professional-business-analysis-exam-outline.pdf
//   https://www.pmi.org/certifications/business-analysis-pba
// Density ("hybrid"): 2 / 2 / 3 / 2 / 2. Every number in a rubric is
// worked in its model answer (payback and ROI undiscounted, as stated).

export const PMIPBA_LABS: SeedLabSet = {
  trackCode: "PMIPBA",
  sources: [
    source("https://www.pmi.org/-/media/pmi/documents/public/pdf/certifications/professional-business-analysis-exam-outline.pdf", "exam_outline", "2026-11-07"),
    source("https://www.pmi.org/certifications/business-analysis-pba", "exam_outline", "2026-11-07"),
  ],
  labs: [
    {
      slug: "pba-value-proposition-invoices",
      objective: "Collecting and analyzing information from varied sources to determine an initiative's value proposition",
      kind: "build",
      title: "Quantify the value of automating invoice processing",
      brief:
        "Ashcombe Distribution's finance team processes 18,000 supplier invoices a year by hand: 12 minutes each, at a fully loaded staff cost of $40 an hour; 4% need rework, costing $25 each. A vendor's invoice-automation tool would cut handling to 3 minutes per invoice and rework to 1%. It costs $180,000 to implement (one-off) plus $20,000 a year in licences. The finance director also mentions suppliers complain about late payment, but you have no data on it yet.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Determine the value proposition.",
          parts: [
            numericPart("Annual savings (before licences)", "Handling saves $108,000 (3,600 h -> 900 h at $40) and rework saves $13,500 (720 -> 180 invoices at $25): $121,500 a year. Met within $1.", "Handling now: 18,000 x 12 min = 3,600 h x $40 = $144,000. After: 18,000 x 3 min = 900 h x $40 = $36,000. Saving $108,000. Rework now: 4% x 18,000 = 720 x $25 = $18,000; after: 1% = 180 x $25 = $4,500. Saving $13,500. Total = $121,500 a year.", { answer: 121500, tolerance: 1, unit: "USD" }),
            part(
              "Payback and ROI",
              "Nets off the licence (121,500 - 20,000 = $101,500 a year), calculates payback (180,000 / 101,500 = 1.77 years, about 21 months) and a 3-year ROI ((3 x 101,500 - 180,000) / 180,000 = 69%), noting these are undiscounted.",
              "Net annual benefit = 121,500 - 20,000 = $101,500. Payback = 180,000 / 101,500 = 1.77 years (about 21 months). 3-year ROI = (304,500 - 180,000) / 180,000 = 124,500 / 180,000 = 69%. Undiscounted; an NPV at the company's discount rate would be lower."
            ),
            part(
              "Evidence and sources",
              "Names the sources used or still needed to validate the figures (for example time studies or system logs, finance cost data, vendor quotes, supplier complaint records) and treats the late-payment benefit as unquantified until data is gathered.",
              "Validate handling times with a two-week time sample and the ERP logs, rework from the exceptions report, costs from finance, and the vendor figures from a reference customer. Late-payment benefits stay qualitative until we pull supplier complaints and late-payment penalties from accounts payable."
            ),
            part(
              "Value proposition statement",
              "Writes a concise value proposition linking the solution to the business need with the key numbers and a caveat or assumption.",
              "Automating invoice processing saves about $101,500 a year net, pays back in about 21 months, and frees about 2,700 staff hours a year, assuming the vendor's 3-minute handling time holds for our invoice mix. It may also reduce late-payment complaints, still to be measured."
            ),
          ],
        },
      ],
    },
    {
      slug: "pba-elicit-stakeholder-values-case",
      objective:
        "Determining stakeholder values through elicitation techniques to establish a baseline for prioritizing requirements",
      kind: "case",
      title: "Find out what stakeholders actually value",
      brief:
        "Pelham County's library service is replacing its events-booking website. Stakeholders: the head of libraries (budget holder), branch event organisers, the accessibility officer, and residents who book events.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "The head of libraries asks you to \"just get everyone's wish list\" in one meeting.",
          ask: "How do you elicit stakeholder values instead?",
          parts: [
            part(
              "Techniques per group",
              "Chooses suitable techniques per stakeholder group (for example interviews with the head of libraries and accessibility officer, a workshop or focus group with organisers, a survey or observation for residents) and explains the fit.",
              "Interview the head of libraries and the accessibility officer one-to-one (few people, specialist views); run a workshop with event organisers to map their current booking process; survey residents online and at branches, and observe a few booking an event."
            ),
            part(
              "Values, not wish lists",
              "Focuses elicitation on underlying values/outcomes (why something matters, what success looks like) rather than feature lists, for example by asking about goals and pain points and ranking them.",
              "Ask what each group is trying to achieve and what frustrates them now, then ask them to rank those outcomes. Features come later; first we learn that organisers value fewer no-shows and residents value booking in under two minutes."
            ),
          ],
        },
        {
          text: "Findings: organisers rank \"fewer no-shows\" first; residents rank \"quick booking on a phone\" first; the accessibility officer says the site must meet the accessibility standard the council has adopted; the head of libraries ranks \"lower running cost\" first.",
          ask: "Turn this into a baseline for prioritising requirements.",
          parts: [
            part(
              "Baseline",
              "Records each stakeholder group's ranked values in a form usable for later prioritisation (for example a stakeholder-value matrix), treating the accessibility standard as a mandatory constraint rather than a preference.",
              "Stakeholder-value matrix: organisers -- 1 fewer no-shows; residents -- 1 quick mobile booking; head of libraries -- 1 lower running cost. The accessibility standard is a mandatory constraint that every requirement must meet, not something traded off."
            ),
            part(
              "Confirming it",
              "Validates the baseline with the stakeholders (for example plays it back for confirmation) and notes how it will be used to rank requirements.",
              "Play the matrix back to each group to confirm it, then use it to score candidate requirements: a reminder-message feature that cuts no-shows scores high for organisers and supports lower cost."
            ),
          ],
        },
      ],
    },
    {
      slug: "pba-requirements-management-plan",
      objective:
        "Developing a requirements management plan: stakeholders, roles/responsibilities, and elicitation/analysis/approval methods",
      kind: "build",
      title: "Write the requirements management plan",
      brief:
        "Fairhaven Shipping is replacing its customer-booking system with a vendor product, tailored by the vendor. The project is hybrid: core configuration is planned up front, and customer-facing screens are built in two-week iterations. Stakeholders: operations director (sponsor), customer-service team leaders, finance, IT security, and the vendor's product team. Last time, requirements were approved by email by whoever replied first.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the core sections of the requirements management plan.",
          parts: [
            part(
              "Roles and responsibilities",
              "Assigns clear roles: who elicits/documents (business analyst), who prioritises (product owner or sponsor's delegate), who approves (named approvers per requirement type), who is consulted (security, finance), with one approver per decision.",
              "Business analyst: elicits, documents, maintains traceability. Product owner (customer-service lead): prioritises the backlog. Approvers: operations director for scope; finance for billing rules; IT security for security requirements. Vendor: consulted on feasibility, informed of approved changes."
            ),
            part(
              "Elicitation and analysis methods",
              "Chooses methods suited to the hybrid approach (for example workshops and document analysis for up-front configuration; backlog refinement, user stories and prototypes for iterative screens) and how requirements are analysed/modelled.",
              "Up-front configuration: workshops with operations and finance, document analysis of current booking rules, process models. Iterative screens: user stories with acceptance criteria refined each iteration, clickable prototypes reviewed with team leaders."
            ),
            part(
              "Approval method",
              "Replaces ad hoc email approval with a defined approval process (named approvers, a sign-off record, the decision rule) for the baseline and for each iteration's stories.",
              "Configuration requirements are baselined at a formal sign-off by the named approvers, recorded in the requirements tool. Iteration stories are accepted by the product owner at refinement (ready) and at review (done). No approval by email reply."
            ),
            part(
              "Traceability and tools",
              "States how requirements will be stored and traced (tool, attributes, links from business need to requirement to design/test) for both parts of the project.",
              "All requirements and stories live in one tool with ID, source, owner, priority and status. Each is traced from the business objective to its design item and test cases, so changes and coverage can be checked."
            ),
          ],
        },
      ],
    },
    {
      slug: "pba-requirements-change-control",
      objective:
        "Selecting requirements change-control methods and standard protocols for incorporation into the change management plan",
      kind: "build",
      title: "Design requirements change control",
      brief:
        "Holloway Insurance's claims-portal project has a baselined set of 85 requirements. Change requests arrive by email, phone and corridor conversation, and developers sometimes build them straight away. The sponsor wants control without slowing small fixes. The project's change control board (CCB) meets weekly.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Define the requirements change-control protocol.",
          parts: [
            part(
              "Single intake",
              "Requires every requested requirement change to be logged through one channel with a standard change-request form (requester, description, reason, urgency), and nothing built until approved.",
              "All changes come through one change-request form in the requirements tool: requester, what and why, urgency, affected requirement IDs. Developers build nothing that isn't approved."
            ),
            part(
              "Impact analysis",
              "Requires impact analysis before decision, using traceability (affected requirements, designs, tests, schedule, cost, risk) by the business analyst.",
              "The business analyst uses the traceability matrix to find every affected requirement, design item and test, and estimates the impact on schedule, cost and risk with the team."
            ),
            part(
              "Decision levels",
              "Defines tiered authority so small changes are fast (for example a BA/product owner approves minor changes under a stated threshold) and larger ones go to the CCB, with criteria for each tier.",
              "Minor (no change to baseline scope, under 2 days' effort, no regulatory impact): product owner approves within 2 days. Major (anything else): CCB decides at the weekly meeting; urgent major changes can go to the sponsor between meetings."
            ),
            part(
              "After the decision",
              "Updates the requirements baseline/version, traceability and change log, and communicates the decision to the requester and team.",
              "Record the decision in the change log, update the affected requirements and baseline version, update traceability links and tests, and notify the requester and the team."
            ),
          ],
        },
      ],
    },
    {
      slug: "pba-decision-table-shipping-rules",
      objective:
        "Analyzing, decomposing, and elaborating requirements: dependency analysis, interface analysis, and data/process modeling",
      kind: "build",
      title: "Model a business rule as a decision table",
      brief:
        "Brightwater Outdoor's shipping policy, as written by the commercial team: \"Members get free standard shipping. Non-members get free standard shipping on orders of $50 or more. Oversized items never ship free; they pay the $25 oversized fee, but members get $10 off that fee. Everyone else pays the standard $6.95.\"",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Model the rule and find its gaps.",
          parts: [
            part(
              "Conditions and combinations",
              "Identifies the three conditions (member Y/N, order $50 or more Y/N, oversized Y/N) and that there are 2 x 2 x 2 = 8 combinations.",
              "Conditions: member? order of $50 or more? oversized item? Three yes/no conditions give 2 x 2 x 2 = 8 combinations."
            ),
            part(
              "Decision table",
              "Gives correct outcomes for all 8 rules: member + oversized = $15 (whatever the amount); member + not oversized = free; non-member + oversized = $25; non-member + not oversized + $50 or more = free; non-member + not oversized + under $50 = $6.95; may collapse to 5 rules.",
              "Member, oversized (any amount): $25 - $10 = $15. Member, not oversized (any amount): free. Non-member, oversized (any amount): $25. Non-member, not oversized, $50 or more: free. Non-member, not oversized, under $50: $6.95. (8 rules collapse to these 5.)"
            ),
            part(
              "Gaps and questions",
              "Raises at least two genuine ambiguities for the stakeholders (for example whether $50 is before or after discounts/tax; how mixed orders with oversized and normal items are charged; whether the oversized fee is per item or per order; whether the $6.95 also applies to oversized items).",
              "Is $50 measured before or after discounts and tax? For a mixed basket, do the normal items still ship free and the oversized item pay its fee? Is the $25 fee per item or per order? Does an oversized order also pay the $6.95?"
            ),
          ],
        },
      ],
    },
    {
      slug: "pba-weighted-option-evaluation",
      objective:
        "Evaluating product options and capabilities with decision-making and valuation techniques to accept, defer, or reject requirements",
      kind: "build",
      title: "Score the solution options and decide on requirements",
      brief:
        "Glenmoor Clinics must choose how to deliver online appointment booking. Agreed criteria and weights: fit to requirements 40%, cost 25%, time to deliver 20%, risk 15%. Scores (1-5, 5 best): Option A extend the current system -- fit 4, cost 3, time 4, risk 3. Option B buy a specialist booking product -- fit 5, cost 2, time 3, risk 4. Option C a low-code build -- fit 3, cost 5, time 5, risk 2. Three requirements are also pending: R1 video consultations (high value, needs a product only B supports); R2 SMS reminders (high value, all options support it); R3 a loyalty scheme (low value, high cost).",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Evaluate the options and decide on the requirements.",
          parts: [
            numericPart("Option C's weighted score", "C = 3(0.40) + 5(0.25) + 5(0.20) + 2(0.15) = 1.2 + 1.25 + 1.0 + 0.3 = 3.75 (A is 3.60 and B 3.70, so C leads narrowly). Met within 0.005.", "A = 4(0.40) + 3(0.25) + 4(0.20) + 3(0.15) = 1.6 + 0.75 + 0.8 + 0.45 = 3.60. B = 2.0 + 0.5 + 0.6 + 0.6 = 3.70. C = 1.2 + 1.25 + 1.0 + 0.3 = 3.75. C leads, but only by 0.05.", { answer: 3.75, tolerance: 0.005 }),
            part(
              "Sensitivity",
              "Tests sensitivity (for example with fit 50% and cost 15%: A 3.70, B 4.00, C 3.55, so B wins) and concludes the ranking depends on the weights, which must be agreed with stakeholders before deciding.",
              "With fit at 50% and cost at 15%: A = 2.0 + 0.45 + 0.8 + 0.45 = 3.70; B = 2.5 + 0.3 + 0.6 + 0.6 = 4.00; C = 1.5 + 0.75 + 1.0 + 0.3 = 3.55. B now wins. The result is sensitive to the weights, so confirm them with the sponsor before treating 3.75 vs 3.70 as decisive."
            ),
            part(
              "Accept, defer, reject",
              "Makes reasoned decisions for R1-R3 consistent with value and the options (for example accept R2; accept R1 only if B is chosen, otherwise defer; reject or defer R3 as low value/high cost), and links R1 back to the option choice.",
              "R2 SMS reminders: accept -- high value and every option supports it. R1 video consultations: high value but only B supports it, so it should be weighed in the option decision; if C is chosen, defer R1 to a later phase. R3 loyalty scheme: reject for this project (low value, high cost) and record it for future review."
            ),
          ],
        },
      ],
    },
    {
      slug: "pba-write-measurable-specifications",
      objective:
        "Writing requirements specifications (use cases, user stories, data/interface details) so they're measurable and actionable for development",
      kind: "build",
      title: "Rewrite vague requirements so they can be built and tested",
      brief:
        "Kestrel Energy's draft requirements for its customer app include: (1) \"The app should be fast.\" (2) \"Customers can submit meter readings easily.\" (3) \"The system sends readings to billing.\" The billing system accepts readings through an interface that needs the account number (10 digits), meter serial number, reading value (whole number, up to 6 digits) and reading date.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Rewrite the three requirements.",
          parts: [
            part(
              "Measurable non-functional requirement",
              "Rewrites (1) with a measurable target and conditions (for example 95% of screens load within 2 seconds on a 4G connection under expected peak load).",
              "95% of app screens shall load within 2 seconds on a 4G mobile connection with 5,000 concurrent users; no screen shall take more than 5 seconds."
            ),
            part(
              "User story with acceptance criteria",
              "Rewrites (2) as a user story (role, goal, benefit) with at least two testable acceptance criteria, including a validation/error case.",
              "As a customer, I want to submit my meter reading from the app so that my bill is based on actual use. Given I'm logged in, when I enter a whole number of up to 6 digits and submit, I see a confirmation with the date. Given my reading is lower than my last one, I'm asked to confirm or correct it before it is sent."
            ),
            part(
              "Interface/data specification",
              "Rewrites (3) as an interface requirement naming each data element with format and validation from the brief (account number 10 digits, meter serial, reading whole number up to 6 digits, reading date), timing, and error handling.",
              "On submission, the app shall send to the billing interface: account number (10 digits), meter serial number, reading value (whole number, 0-999999) and reading date (the customer's submission date). If billing rejects the reading, it is queued, retried, and the customer is told it is pending."
            ),
          ],
        },
      ],
    },
    {
      slug: "pba-manage-requirement-change-case",
      objective:
        "Managing requirement changes by assessing impact, dependencies, and risk against the change-control plan and requirements baseline",
      kind: "case",
      title: "Assess a late requirement change",
      brief:
        "On Tarnside Council's parking-permit system, the requirements baseline was signed off two months ago. Development is 60% complete. The traceability matrix links each requirement to design items and test cases.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "The parking manager asks to add a new requirement: residents with electric vehicles get a 50% permit discount, starting at launch.",
          ask: "How do you assess the change?",
          parts: [
            part(
              "Impact through traceability",
              "Uses the traceability matrix to find affected requirements, designs and tests (for example pricing rules, vehicle-registration data, payment, reports) and identifies dependencies (for example a vehicle-fuel-type data source).",
              "From the matrix, the change touches the pricing requirements (R14-R16), vehicle details (R8), payments (R22), the finance report (R40) and their test cases. It depends on knowing a vehicle's fuel type, which we don't currently collect -- a new data source or a resident declaration plus proof."
            ),
            part(
              "Change request",
              "Logs a formal change request per the change-control plan with the impact on scope, schedule, cost and risk, rather than adding it informally because it seems small.",
              "Log a change request with the impact: about 8 days of work, the fuel-type data dependency, regression testing of pricing, and the risk of fraud if evidence isn't checked. It goes to the change board under the plan."
            ),
          ],
        },
        {
          text: "The change board approves the discount but for a later release, because the vehicle data source can't be ready before launch.",
          ask: "What do you update?",
          parts: [
            part(
              "Updates",
              "Updates the requirements baseline (version), the traceability matrix (new requirement linked to its source, design and tests, marked for release 2), the change log and the backlog/release plan.",
              "Add the requirement as R86 with its source (change request) and release 2 tag, increment the baseline version, link it in the traceability matrix to the affected designs and new tests, record the decision in the change log, and add it to the release 2 plan."
            ),
            part(
              "Communication",
              "Tells the requester and affected stakeholders/team the decision and timing.",
              "Tell the parking manager it is approved for release 2 and why, and brief the team and finance on the planned change."
            ),
          ],
        },
      ],
    },
    {
      slug: "pba-requirements-status-report",
      objective:
        "Communicating requirements status to the project manager and stakeholders: issues, conflicts, changes, risks, and overall status",
      kind: "build",
      title: "Report requirements status from the traceability matrix",
      brief:
        "On Ellerby Bank's mortgage-application portal, the requirements baseline has 60 requirements. The traceability matrix shows: 54 have linked test cases; of those, 48 passed, 4 failed and 2 have not been run. Two open conflicts: underwriting and marketing disagree about which documents are mandatory at first submission. Three change requests are awaiting the change board. User acceptance testing starts in two weeks.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the requirements status report for the project manager and sponsor.",
          parts: [
            part(
              "Coverage and verification",
              "Calculates test coverage (54 / 60 = 90%), verified requirements (48 / 60 = 80%) and pass rate of executed tests (48 / 52 = 92%) or of linked tests (48 / 54 = 89%), with the 6 untraced requirements flagged.",
              "Coverage: 54 / 60 = 90% of requirements have tests; 6 have none. Verified: 48 / 60 = 80% passed. Of the 52 tests run, 48 passed (92%); 4 failed and 2 haven't run."
            ),
            part(
              "Issues, conflicts and changes",
              "Reports the open conflict (with its effect and who must resolve it), the pending change requests, and the failures, without burying them.",
              "Open conflict: underwriting vs marketing on mandatory documents at first submission -- it blocks the upload screen design; needs a decision from the sponsor this week. Three change requests await the change board. Four failed tests are being fixed."
            ),
            part(
              "Risk and overall status",
              "Gives an overall status (for example amber) with the main risk to UAT in two weeks and a clear request or action.",
              "Overall: amber. Risk: if the 6 untested requirements and the document conflict aren't resolved within a week, UAT in two weeks may start without complete scope. Request: sponsor to decide the document rule by Friday; we'll write tests for the 6 untraced requirements this week."
            ),
          ],
        },
      ],
    },
    {
      slug: "pba-solution-gap-analysis",
      objective:
        "Analyzing and communicating identified gaps/deltas between solution scope, requirements, and what was actually built",
      kind: "build",
      title: "Analyse the gaps before sign-off",
      brief:
        "Moorcroft Dental Group's patient-recall system is ready for sign-off. Requirements vs what was built: (R1) send recall reminders by SMS and email -- built for SMS only; (R2) let patients rebook from the reminder link -- built; (R3) a report of recall response rates by practice -- built for the group total only, not by practice; (R4) not in requirements, but the developers added a birthday-message feature.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Analyse and communicate the gaps.",
          parts: [
            part(
              "Gaps identified",
              "Identifies the gaps correctly: R1 partially met (email missing), R3 partially met (by-practice breakdown missing), R2 met, and R4 as unrequested scope (gold plating) outside the solution scope.",
              "R1 partly met: email reminders missing. R2 met. R3 partly met: no breakdown by practice. R4 is outside the agreed scope -- gold plating that was never requested or approved."
            ),
            part(
              "Impact of each",
              "Assesses the business impact of each gap (for example patients without mobiles miss recalls; practice managers can't act on their own response rates; the birthday feature may raise data-protection or consent questions and was untested against requirements).",
              "Missing email means patients without a mobile number get no recall. Without by-practice reporting, practice managers can't see or act on their own rates. The birthday feature uses personal data for a new purpose and may need consent; it also wasn't specified or tested against any requirement."
            ),
            part(
              "Recommendation and communication",
              "Recommends next steps for stakeholders to decide (fix or defer the gaps with owners and dates; remove or formally assess R4 through change control) and communicates them before sign-off.",
              "Present the gaps to the sponsor and practice managers before sign-off: build email reminders before go-live (high impact), deliver the by-practice report within a month with a workaround meanwhile, and disable the birthday feature unless it is approved through change control with a privacy check."
            ),
          ],
        },
      ],
    },
    {
      slug: "pba-evaluate-against-business-case-case",
      objective: "Evaluating the deployed solution against the original business case and value proposition",
      kind: "case",
      title: "Check the deployed solution against the business case",
      brief:
        "Three months ago Larchmont Telecom deployed a new customer-onboarding portal. The business case promised: average onboarding time from 10 days down to 4; support calls about onboarding down 30% from 5,000 a month; $600,000 a year in staff savings.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "This month's data: average onboarding time 6 days; onboarding calls 4,100; staff savings are running at $45,000 a month.",
          ask: "Evaluate the results against the business case.",
          parts: [
            part(
              "Results vs targets",
              "Calculates: onboarding improved 4 of the targeted 6 days (67% of target); calls down (5,000 - 4,100) / 5,000 = 18% against 30%; savings annualise to 45,000 x 12 = $540,000 against $600,000 (90%).",
              "Onboarding: 10 -> 6 days, a 4-day improvement out of the 6 targeted (67%). Calls: (5,000 - 4,100) / 5,000 = 18%, against a 30% target. Savings: 45,000 x 12 = $540,000 a year, 90% of the $600,000 promised."
            ),
            part(
              "Conclusion",
              "Concludes the solution delivers partial value (savings nearly on target, time and calls short) and notes three months may be early (adoption still growing) but the gaps need investigation.",
              "The portal is delivering most of the savings but falls short on speed and call reduction. Three months in, adoption may still be growing, but the call gap is large enough to investigate now."
            ),
          ],
        },
        {
          text: "Analysis of the 4,100 calls shows 40% are customers asking where their identity check has got to, which the portal doesn't show.",
          ask: "What do you recommend?",
          parts: [
            part(
              "Recommendation",
              "Recommends a targeted improvement (for example showing identity-check status and notifications in the portal), estimates its effect from the data (about 40% of 4,100 = 1,640 calls a month could be avoided), and routes it through the backlog/change process.",
              "Add an identity-check status tracker with notifications. If it removed most of those calls, that's up to 40% x 4,100 = 1,640 calls a month, which would take the reduction to about 51% -- well past the 30% target. Raise it as a change request for the next release."
            ),
            part(
              "Reporting",
              "Reports the evaluation to the sponsor/benefits owner with the measures and the planned re-evaluation date, and records lessons for future business cases.",
              "Report to the sponsor with the three measures, the proposed fix and a re-evaluation in three months. Lesson for future business cases: map the customer's status questions before design."
            ),
          ],
        },
      ],
    },
  ],
};
