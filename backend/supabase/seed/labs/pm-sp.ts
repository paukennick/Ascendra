import { GENERAL_SAFETY, part, type SeedLabSet } from "./types";

// REQ-150: PMI-SP (PMI Scheduling Professional; current ECO when checked on
// 2026-11-07, domain weights confirmed on pmi.org's PMI-SP page).
//
// Aligned to the ECO's five domains (Schedule Strategy 14%, Schedule
// Planning and Development 31%, Schedule Monitoring and Controlling 35%,
// Schedule Closeout 6%, Stakeholder Communications Management 14%) and the
// tasks an SP item asks a candidate to perform: set scheduling policies and
// configuration control; estimate with three-point/PERT; build a
// resource-constrained schedule (CPM, then levelling); run schedule risk
// analysis; analyse status with earned value and earned schedule; choose
// the cheapest compression with crashing; evaluate final performance; and
// report status, impacts and issues to stakeholders.
//   https://www.pmi.org/-/media/pmi/documents/public/pdf/certifications/scheduling-professional-exam-outline.pdf
//   https://www.pmi.org/certifications/scheduling-sp
// Density ("hybrid"): 2 / 3 / 2 / 1 / 2. Every number in a rubric is
// worked in its model answer. Conventions: finish-to-start links, day 0
// start, early finish = early start + duration (the PMP pilot's
// convention); PERT beta mean (O + 4M + P) / 6 and standard deviation
// (P - O) / 6; earned schedule ES = C + (EV - PV_C) / (PV_C+1 - PV_C).

export const PMISP_LABS: SeedLabSet = {
  trackCode: "PMISP",
  sources: [
    "https://www.pmi.org/-/media/pmi/documents/public/pdf/certifications/scheduling-professional-exam-outline.pdf",
    "https://www.pmi.org/certifications/scheduling-sp",
  ],
  labs: [
    {
      slug: "sp-scheduling-policies",
      objective:
        "Setting scheduling policies and procedures: tool selection, activity granularity, EVM implementation, and approval requirements",
      kind: "build",
      title: "Write the scheduling policies for a new programme of work",
      brief:
        "Grayson Medical Devices is starting a 20-month project to build a new sterilisation-unit production line, with a $14 million budget, three subcontractors who each run their own scheduling tools, and monthly reporting to the board. Earned value management is required by the main customer's contract. The last project's schedule had activities ranging from 2 hours to 9 months long and was changed by anyone with access.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the key scheduling policies for the schedule management plan.",
          parts: [
            part(
              "Tool and integration",
              "Selects one master scheduling tool for the integrated schedule and states how subcontractor schedules are integrated (for example a required export format, level of detail, and update cadence), rather than accepting disconnected tools.",
              "One CPM scheduling tool holds the integrated master schedule. Subcontractors may keep their own tools but must submit schedule updates monthly in the agreed export format, at the agreed level of detail, with logic links to our interface milestones."
            ),
            part(
              "Activity granularity",
              "Sets a granularity rule tied to the reporting cycle or work packages (for example activities no longer than about one or two reporting periods, no shorter than a day except milestones), with every activity linked to a WBS element/control account and having predecessors and successors.",
              "Activities should be no longer than two monthly reporting periods (about 44 working days) and normally no shorter than one day; longer work is split. Every activity sits in one control account, has at least one predecessor and one successor (except start and finish), and uses resource-loaded durations."
            ),
            part(
              "EVM implementation",
              "Defines how EVM will be applied (control accounts and work packages from the WBS, a performance measurement baseline, earned-value techniques such as 0/100, 50/50 or percent complete by milestone, and the reporting cycle/thresholds).",
              "Control accounts at WBS level 3 with a control account manager each; the time-phased budget forms the performance measurement baseline. Earning rules: 0/100 for tasks under one month, weighted milestones for longer ones. Monthly SPI/CPI reporting, with variance explanations when either is outside 0.95-1.05."
            ),
            part(
              "Approval and change requirements",
              "States who approves the baseline and baseline changes (for example the sponsor/change board), that only the scheduler edits the master schedule, and that changes go through formal change control.",
              "The sponsor approves the baseline schedule. After baselining, only the project scheduler edits the master schedule; baseline changes need an approved change request from the change control board, logged in the change log with the reason."
            ),
          ],
        },
      ],
    },
    {
      slug: "sp-configuration-management-case",
      objective: "Establishing schedule configuration management policies (accessibility, storage, baseline/change control)",
      kind: "case",
      title: "Recover from an overwritten baseline",
      brief:
        "On the Northgate Bridge refurbishment, the schedule file lives on a shared drive that 14 people can edit. There is no version naming convention.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "At the month-6 review the client asks why the baseline finish date now matches the forecast. A site engineer explains he \"reset the baseline\" after a two-week weather delay so the schedule \"wouldn't look red\".",
          ask: "What is wrong, and what do you do now?",
          parts: [
            part(
              "Problem",
              "Explains that the baseline was changed without authorisation, destroying the ability to measure variance, and that baseline changes require formal change control.",
              "The baseline is the approved reference for measuring performance. Resetting it to hide a delay erases the two-week variance and breaks change control -- only an approved change request can alter it."
            ),
            part(
              "Immediate action",
              "Restores the approved baseline from a stored copy (or reconstructs it from the last approved version), reports the true variance to the client, and informs the sponsor.",
              "Restore the last approved baseline from the month-5 issued copy, re-report the two-week weather variance to the client, and tell the sponsor what happened. If the delay is excusable under the contract, raise a change request for the baseline."
            ),
          ],
        },
        {
          text: "The sponsor asks you to stop this happening again.",
          ask: "Write the configuration management policy.",
          parts: [
            part(
              "Access and storage",
              "Restricts edit rights for the master schedule to the scheduler (others read-only or submit updates), stores it in a controlled repository with backups, and names an owner.",
              "The scheduler is the only editor of the master schedule; everyone else has read-only access and gives updates through the monthly status process. The file is kept in the document-management system with automatic backups; the scheduler owns it."
            ),
            part(
              "Versions and baseline control",
              "Sets version naming/issued copies per update, keeps each approved baseline and status update archived, and requires change-board approval and change-log entries for any baseline change.",
              "Each monthly update is saved as a new issued version (for example NGB-SCH-2026-06-v1) and never overwritten; every approved baseline is archived. Baseline changes need an approved change request, recorded in the change log with the reason, and become a new numbered baseline."
            ),
          ],
        },
      ],
    },
    {
      slug: "sp-three-point-pert-estimates",
      objective: "Estimating activity durations using three-point, parametric, analogous, or PERT techniques",
      kind: "build",
      title: "Estimate a path with three-point and PERT",
      brief:
        "Pemberton Logistics' warehouse-software rollout has three activities in sequence on its critical path, with estimates in working days (optimistic O, most likely M, pessimistic P): A Configure system: O 4, M 6, P 14. B Migrate data: O 8, M 10, P 18. C Train staff: O 3, M 5, P 7. Assume the activities are independent and the path total is approximately normal.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Estimate the path duration and its confidence.",
          parts: [
            part(
              "PERT expected durations",
              "Calculates beta/PERT means (O + 4M + P) / 6: A = 7, B = 11, C = 5, path = 23 days.",
              "A = (4 + 24 + 14) / 6 = 42 / 6 = 7. B = (8 + 40 + 18) / 6 = 66 / 6 = 11. C = (3 + 20 + 7) / 6 = 30 / 6 = 5. Path = 7 + 11 + 5 = 23 days."
            ),
            part(
              "Triangular comparison",
              "Calculates triangular means (O + M + P) / 3: A = 8, B = 12, C = 5, path = 25 days, and explains why it is higher (it weights the pessimistic tail more than PERT's beta, which weights the most likely value 4 times).",
              "Triangular: A = (4 + 6 + 14) / 3 = 8; B = (8 + 10 + 18) / 3 = 12; C = (3 + 5 + 7) / 3 = 5; path = 25 days. It is 2 days higher because PERT weights the most likely value four times, pulling the mean away from the long pessimistic tails of A and B."
            ),
            part(
              "Path standard deviation",
              "Calculates each SD (P - O) / 6 (A 1.67, B 1.67, C 0.67), sums variances (25/9 + 25/9 + 4/9 = 6.0), and takes the square root for the path SD (about 2.45 days) -- not adding the SDs.",
              "SDs: A = 10 / 6 = 1.67; B = 10 / 6 = 1.67; C = 4 / 6 = 0.67. Variances: 2.78 + 2.78 + 0.44 = 6.0 (exactly 54/9). Path SD = sqrt(6) = 2.45 days. Add variances, not standard deviations."
            ),
            part(
              "Confidence dates",
              "States 23 days is about 50% confidence, about 25.4 days is roughly 84% (mean + 1 SD), and about 27 days is roughly 95% (mean + 1.645 SD), and notes a limitation (merge bias from parallel paths, or correlated activities, is ignored).",
              "23 days is about a 50% estimate. Mean + 1 SD = 23 + 2.45 = 25.4 days for about 84%. Mean + 1.645 SD = 23 + 4.0 = 27.0 days for about 95%. This ignores merge bias where near-critical paths join, so a Monte Carlo of the whole network would give a later date."
            ),
          ],
        },
      ],
    },
    {
      slug: "sp-resource-constrained-schedule",
      objective:
        "Building a resource breakdown structure (RBS) and assigning resources to activities to produce a resource-constrained schedule",
      kind: "build",
      title: "Level a schedule around one specialist",
      brief:
        "Oakhurst Bank is upgrading a data centre. Activities (duration in working days, predecessors, resource): A Survey 2 (none, Ann); B Install racks 4 (A, Ben); C Install cabling 3 (A, Ben); D Commission 2 (B and C, Ann). Finish-to-start links, start on day 0. Ben is the only certified installer and can work on one activity at a time. Ann and Ben are internal staff; a contractor could do cabling but needs 5 days' notice.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Build the schedule with and without the resource limit.",
          parts: [
            part(
              "Unconstrained CPM",
              "Calculates the unconstrained schedule: A 0-2; B 2-6; C 2-5; D 6-8; duration 8 days, critical path A-B-D, and C has 1 day of float.",
              "Forward pass: A 0-2; B 2-6; C 2-5; D starts when both finish, 6-8. Duration 8 days. Critical path A-B-D. C: late finish 6, late start 3, float = 3 - 2 = 1 day."
            ),
            part(
              "Over-allocation",
              "Identifies that Ben is assigned to B and C at the same time (days 2-5), which cannot be resolved by smoothing within C's 1 day of float.",
              "Ben is on B (days 2-6) and C (days 2-5) at once -- three days of overlap. C has only 1 day of float, so resource smoothing (moving work only within float) can't fix it; levelling is needed."
            ),
            part(
              "Levelled schedule",
              "Levels by sequencing B and C for Ben (for example B 2-6, C 6-9, D 9-11 or C 2-5, B 5-9, D 9-11), giving 11 days, a 3-day extension, with the critical path now running through both of Ben's activities (a resource-driven path).",
              "Sequence Ben's work: B 2-6, then C 6-9, then D 9-11. Duration 11 days, 3 days longer than the unconstrained 8. Doing C first (C 2-5, B 5-9, D 9-11) also gives 11. The longest path is now A-B-C-D, driven by Ben, not by logic alone."
            ),
            part(
              "Option to recover",
              "Proposes giving cabling (C) to the contractor so B and C run in parallel, and works through the 5-day notice: booked at least 5 days before day 2, C runs 2-5 and the finish returns to day 8; booked on day 0, C can start only on day 5 (5-8), D runs 8-10 and the finish is day 10 -- still 1 day better than levelling. Notes the contractor's cost needs approval.",
              "Give cabling to the contractor so Ben only does B. If they are booked at least 5 days before day 2, C runs 2-5 in parallel with B and the schedule returns to 8 days. If we only book on day 0, C runs 5-8, D runs 8-10 and we finish on day 10 -- better than 11. Either way the contractor's cost needs the sponsor's approval, so ask now."
            ),
          ],
        },
      ],
    },
    {
      slug: "sp-schedule-risk-analysis-case",
      objective:
        "Performing schedule risk analysis (what-if scenarios, Monte Carlo simulation) to test whether milestones are achievable within risk tolerance",
      kind: "case",
      title: "Test whether the contract milestone is achievable",
      brief:
        "Quarry Lane Housing must hand over 120 homes by a contract milestone of 30 September; the developer's risk tolerance is that the committed milestone has at least an 80% chance of being met. The deterministic schedule shows handover on 12 September.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "The scheduler loads three-point durations and the top risks into the schedule and runs 5,000 Monte Carlo iterations: P50 22 September; P80 8 October. Three paths converge on the final inspection, and two of them are within 5 days of the critical path.",
          ask: "Is the milestone achievable within tolerance? Explain the results.",
          parts: [
            part(
              "Against tolerance",
              "Concludes the 30 September milestone is not achievable at 80% confidence because P80 is 8 October (8 days later), and its probability lies between 50% and 80%.",
              "No: the P80 date is 8 October, 8 days after the milestone, so 30 September has somewhere between a 50% and 80% chance -- below the 80% tolerance."
            ),
            part(
              "Why later than deterministic",
              "Explains why the simulation is later than the deterministic 12 September: risks and skewed durations, and merge bias where several near-critical paths converge on one activity.",
              "The deterministic date assumes everything goes to most-likely values. The simulation adds risk events and right-skewed durations, and where three paths converge on final inspection, any of them can be late (merge bias), pushing the finish later."
            ),
          ],
        },
        {
          text: "Two what-if scenarios are run: (1) adding a second inspection team, which removes the convergence at the final inspection, gives P80 29 September; (2) prefabricating bathroom pods, which shortens one near-critical path by 6 days, gives P80 6 October.",
          ask: "What do you recommend?",
          parts: [
            part(
              "Recommendation",
              "Recommends scenario 1 because it alone brings P80 (29 September) inside the 30 September milestone; explains why scenario 2 helps little (another near-critical path still drives the finish).",
              "Adopt scenario 1: it is the only option that brings P80 (29 September) before the milestone. Scenario 2 only moves P80 to 6 October because the other near-critical paths still drive the finish."
            ),
            part(
              "Next steps",
              "Takes the option through change control, updates the schedule and risk register, and notes the margin is thin (1 day) so the risk should be monitored and the analysis rerun regularly.",
              "Raise a change request for the second inspection team with its cost, update the schedule and risk register once approved, and rerun the simulation monthly -- with only one day of margin at P80, the milestone remains sensitive."
            ),
          ],
        },
      ],
    },
    {
      slug: "sp-earned-schedule-status",
      objective: "Performing schedule analyses to identify and report status, changes, impacts, and issues",
      kind: "build",
      title: "Analyse status with earned value and earned schedule",
      brief:
        "Brackenridge Utilities' six-month metering project has a cumulative planned value of: month 1 $50k; month 2 $120k; month 3 $200k; month 4 $280k; month 5 $340k; month 6 $400k. At the end of month 4 the earned value is $230k and the actual cost is $250k.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Analyse the schedule status.",
          parts: [
            part(
              "Cost-based schedule metrics",
              "Calculates SV = 230 - 280 = -$50k and SPI = 230 / 280 = 0.82 (behind schedule), and CPI = 230 / 250 = 0.92 if cost is mentioned.",
              "SV = EV - PV = 230 - 280 = -$50k. SPI = 230 / 280 = 0.82. (CPI = 230 / 250 = 0.92, so it is also over cost.)"
            ),
            part(
              "Earned schedule",
              "Calculates ES = 3 + (230 - 200) / (280 - 200) = 3.375 months, SV(t) = 3.375 - 4 = -0.625 months, and SPI(t) = 3.375 / 4 = 0.84.",
              "EV of $230k falls between month 3 ($200k) and month 4 ($280k). ES = 3 + (230 - 200) / (280 - 200) = 3 + 30 / 80 = 3.375 months. SV(t) = ES - actual time = 3.375 - 4 = -0.625 months (about 2.7 weeks). SPI(t) = 3.375 / 4 = 0.84."
            ),
            part(
              "Duration forecast",
              "Forecasts completion with earned schedule (planned duration / SPI(t) = 6 / 0.84375 = about 7.1 months), stating the assumption that current schedule performance continues.",
              "If schedule performance continues, the forecast duration = 6 / 0.84375 = 7.1 months, about one month late."
            ),
            part(
              "Why earned schedule",
              "Explains that SV and SPI in money converge to 0 and 1.0 as the project finishes regardless of lateness, while earned schedule measures time and stays meaningful to the end; recommends checking the critical path too.",
              "Cost-based SV and SPI are in dollars and drift back to 0 and 1.0 at completion even if the project is late, so they mislead in the later stages. Earned schedule is measured in time and stays valid. Neither replaces a critical-path check: the delay matters only if it is on critical work."
            ),
          ],
        },
      ],
    },
    {
      slug: "sp-crashing-what-if-case",
      objective: "Identifying alternative execution options through what-if scenario analysis to optimize the schedule",
      kind: "case",
      title: "Find the cheapest way to recover four days",
      brief:
        "Lindenfield Hospital's ward refit has two paths (working days): A Strip-out 10 -> B Mechanical 15 -> E Fit-out 15 (40 days, critical), and A Strip-out 10 -> C Electrical 12 -> E Fit-out 15 (37 days); B and C run in parallel. Crash options: A up to 2 days at $3,000 a day; B up to 4 days at $1,500 a day; C up to 3 days at $1,000 a day; E up to 2 days at $4,000 a day.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "The hospital needs the ward back 4 days earlier: in 36 days instead of 40.",
          ask: "Which activities do you crash, and at what cost?",
          parts: [
            part(
              "First three days",
              "Crashes B by 3 days (cheapest activity on the critical path only, $1,500/day = $4,500), bringing both paths to 37 days.",
              "Only the A-B-E path is longer than 37 days, so crash the cheapest activity on it that doesn't also cost more for both: B at $1,500 a day. Three days: 3 x 1,500 = $4,500. Both paths are now 37 days."
            ),
            part(
              "Fourth day and total",
              "For the fourth day, with both paths critical, compares options (A $3,000; E $4,000; B + C together $1,500 + $1,000 = $2,500) and chooses B + C, giving total cost $7,000 and a 36-day duration.",
              "Now both paths are critical, so one more day needs a cut on both: A ($3,000), E ($4,000), or B and C one day each ($1,500 + $1,000 = $2,500). Choose B + C. Total = 4,500 + 2,500 = $7,000. Result: B crashed 4 days, C 1 day; both paths 36 days."
            ),
          ],
        },
        {
          text: "The facilities director suggests fast-tracking instead: starting Fit-out (E) 4 days before Mechanical (B) finishes, at no direct cost.",
          ask: "Compare the options.",
          parts: [
            part(
              "Fast-tracking trade-off",
              "Explains that fast-tracking overlaps activities normally done in sequence, saving cost but adding risk of rework (fit-out over unfinished mechanical work), and that it only works if the dependency is discretionary.",
              "Fast-tracking costs nothing up front but overlaps work that was sequenced for a reason: fitting out over incomplete mechanical services risks rework and delay. It works only if the dependency is discretionary and the areas can be separated."
            ),
            part(
              "Recommendation",
              "Gives a reasoned recommendation (for example crash for the $7,000 if rework risk is high, or a partial fast-track where areas are independent) and notes both options leave the schedule with two critical paths and less float, so risk rises.",
              "Recommend crashing for $7,000 unless the mechanical contractor confirms some zones are finished early enough to fit out safely; a partial fast-track by zone could then replace the fourth day. Either way both paths become critical, so the schedule is now more fragile and needs closer monitoring."
            ),
          ],
        },
      ],
    },
    {
      slug: "sp-closeout-performance-evaluation",
      objective: "Finalizing schedule activities and evaluating schedule performance against the original baseline",
      kind: "build",
      title: "Evaluate final schedule performance",
      brief:
        "Westbury Library's extension is complete. The original baseline planned 120 working days; it finished in 132. Final earned value equals the budget at completion. The change log shows: an 8-day delay while a planning permit was reissued (the client's responsibility); a 4-day delay from late approval of the internal design by the project team. One approved change added a reading garden with a 5-day extension to the baseline.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Evaluate the schedule performance for the closeout report.",
          parts: [
            part(
              "Variance",
              "Calculates the variance against the original baseline (132 - 120 = 12 days, 10% late) and against the current approved baseline including the change (120 + 5 = 125; 132 - 125 = 7 days late).",
              "Against the original baseline: 132 - 120 = 12 days late (12 / 120 = 10%). Against the approved current baseline including the 5-day reading-garden change: 125 days, so 132 - 125 = 7 days late."
            ),
            part(
              "Final SPI vs time-based measure",
              "Explains that cost-based SPI at completion is 1.0 (EV = PV = BAC) and so hides the delay, and gives a time-based measure (for example SPI(t) = 120 / 132 = 0.91 against the original baseline).",
              "Cost-based SPI = EV / PV = 1.0 at completion because all value has been earned, so it hides the lateness. Time-based: planned duration / actual duration = 120 / 132 = 0.91 against the original baseline."
            ),
            part(
              "Cause analysis",
              "Attributes the delay: the 5 days of approved scope change; 8 days of client-caused permit delay (excusable, possibly grounds for an extension); 4 days of internal design approval delay (project-caused); notes that 5 + 8 + 4 = 17 exceeds 12, so some delay was absorbed by float or recovery.",
              "5 days came from the approved reading garden; 8 from the client's permit (excusable); 4 from our late design approval (non-excusable). These total 17 days against a 12-day overrun, so about 5 days were recovered through float or acceleration."
            ),
            part(
              "Lessons and archive",
              "Records at least one actionable lesson (for example build approval durations into the schedule with owners) and archives the final schedule, baselines and change log.",
              "Lesson: design approvals need a scheduled activity with a named approver and a maximum duration. Archive the final as-built schedule, every baseline version, status updates and the change log for future estimates and any claims."
            ),
          ],
        },
      ],
    },
    {
      slug: "sp-status-to-senior-management",
      objective:
        "Providing verbal/written schedule status updates and corrective-action impacts to senior management and stakeholders",
      kind: "build",
      title: "Brief the steering committee on a slipping milestone",
      brief:
        "Hartwell Pharmaceuticals is building a packaging line. The \"Line validated\" milestone (baseline 15 March) now forecasts 26 March, 11 days late, because a supplier delivered the labelling machine late. Corrective options (all dates are calendar dates): (1) weekend working on installation, $18,000, recovers 6 calendar days; (2) also run installation and qualification testing partly in parallel, no cost, recovers a further 4 calendar days but increases the risk of retesting. The steering committee meets for 15 minutes; it cares about the 1 April product launch.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the status update for the steering committee.",
          parts: [
            part(
              "Headline status",
              "Leads with the milestone status in plain terms (forecast 26 March, 11 days late against 15 March), the cause, and the effect on the 1 April launch.",
              "Line validation is forecast for 26 March, 11 days behind baseline, because the labelling machine arrived late. The 1 April launch is still possible but has little margin."
            ),
            part(
              "Corrective options and impact",
              "Presents the options with their cost, days recovered and risk, including the combined result (6 + 4 = 10 days -> 16 March, 1 day late) and the residual gap.",
              "Option 1, weekend installation: $18,000, recovers 6 days -> 20 March. Options 1 + 2, adding partial overlap of testing: no extra cost, a further 4 days -> 16 March, 1 day after baseline, but with a risk of retesting if installation defects appear."
            ),
            part(
              "Decision requested",
              "Asks the committee for a specific decision (for example approve $18,000 and accept the overlap risk), with a recommendation.",
              "Recommendation: approve the $18,000 for weekend working now, and allow the testing overlap only for the modules already installed. Decision needed today to book weekend crews."
            ),
          ],
        },
      ],
    },
    {
      slug: "sp-schedule-issue-scope-impact-case",
      objective:
        "Communicating schedule issues that could impact scope or the schedule management plan to relevant stakeholders",
      kind: "case",
      title: "Raise a schedule issue that threatens scope",
      brief:
        "Riverside College's new learning-platform project must go live for the start of term on 1 September; the date cannot move. The schedule management plan says baseline changes need the steering group's approval and that the scheduler reports monthly.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "In mid-June the integration with the student-records system is forecast to finish on 20 August, but user testing and training need four weeks after it. The current forecast for go-live is therefore mid-September.",
          ask: "Who do you tell, when, and how?",
          parts: [
            part(
              "Timing and audience",
              "Raises the issue promptly (not waiting for the monthly report) to the project manager and through them the steering group/sponsor, plus affected stakeholders (for example the academic registrar and training team).",
              "Immediately -- a missed fixed date can't wait for the monthly report. Tell the project manager today and, with them, the sponsor and steering group, then the registrar and training lead whose work is affected."
            ),
            part(
              "Content",
              "Explains the issue with facts (dates, critical path, gap of about two to three weeks to 1 September) and its impact on the fixed date, and that meeting 1 September needs a scope or approach change.",
              "Integration finishes 20 August; testing and training need four weeks, pointing to mid-September go-live, about two weeks after 1 September. Because the date is fixed, the only levers are scope, resources or approach."
            ),
          ],
        },
        {
          text: "The steering group asks what can still go live on 1 September.",
          ask: "Propose how scope and plan should change.",
          parts: [
            part(
              "Scope option",
              "Proposes a reduced-scope go-live on 1 September (for example course content and enrolment without the records integration, using a manual or file-based interim upload) with the rest in a later release.",
              "Go live on 1 September with courses, content and logins, loading enrolments from a nightly file export instead of the live integration; switch to the full integration in October after testing."
            ),
            part(
              "Formal update",
              "Says the scope and schedule baselines (and any change to the schedule management plan, such as weekly reporting until go-live) are changed only through an approved change request, then communicated to all affected stakeholders.",
              "Raise a change request for the reduced scope and the October release; once the steering group approves, rebaseline and update the plan to weekly schedule reporting until go-live, and tell staff and students what will and won't be available on day one."
            ),
          ],
        },
      ],
    },
  ],
};
