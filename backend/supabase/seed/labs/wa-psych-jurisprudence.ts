import { part, matchPart, selectPart, numericPart, type SeedLabSet } from "./types";
import { source } from "../sources";
import { WA_JP_REFERENCES_URL } from "../tracks/wa-psych-jurisprudence";

// REQ-287: Prep for the Washington Psychology Jurisprudence Exam, authored labs.
//
// Built on the laws DOH lists for the exam (its "Jurisprudence Exam RCW and
// WAC References" page) as in force on 2026-11-14 (seed/tracks/
// wa-psych-jurisprudence.ts). Density (docs/labs.md, "hybrid", on the course's
// study-emphasis weights): 1 / 1 / 3 / 2 / 1 / 1 = 9, one lab per objective.
// Every number a lab asks for (retention years, waiting periods, report
// deadlines, CE hours) was read in the statute or rule the lab cites in
// value-sources.ts.
//
// The course sits in the Mental Health category, so its labs get the clinical
// family; the safety note adds that this is not legal advice. Every person is
// fictional. All needs_expert_review until a Washington-licensed psychologist
// (or an attorney familiar with chapter 18.83 RCW) approves them.

export const LEGAL_SAFETY =
  "Fictional practice case for the exam, not clinical guidance or legal advice. Washington law changes: check the current RCW and WAC, ask the Department of Health or a lawyer about a real situation, and never enter real client details here.";

export const WAPSYCHJP_LABS: SeedLabSet = {
  trackCode: "WAPSYCHJP",
  sources: [source(WA_JP_REFERENCES_URL, "reference", "2026-11-14", "2027-05-15")],
  labs: [
    // ------------------------------------------- Licensure, Scope and the Examining Board -- 1
    {
      slug: "wajp-associate-and-trainee-titles",
      objective: "Explain the licensed psychological associate license: who qualifies, levels of training, supervision and client disclosure",
      kind: "build",
      title: "Sort out who may practice, under what title, at a group practice",
      brief:
        "A fictional Spokane group practice is hiring. Candidates: Aya, a fictional fourth-year PsyD student starting her internship there, approved by her director of clinical training; Ben, a fictional postdoctoral resident whose associate application the department received 30 days ago; Cleo, a fictional psychologist licensed in Oregon for ten years who wants to see clients in Washington for about two months this year; and Dev, a fictional master's-level counselor who wants his business card to say 'psychological counselor'.",
      safetyNote: LEGAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "For each candidate, say whether and how they may practice psychology in Washington, and what clients must be told.",
          parts: [
            matchPart(
              "Candidate and route",
              "Aya: licensed psychological associate, level 2 (internship); Ben: may practice under direct supervision while his associate application is pending (up to 120 days), then associate level 3; Cleo: temporary permit (up to 90 days in a calendar year); Dev: may not use 'psychological' in his title without a psychology license. All four is met; two or three is partly there.",
              "Aya is a doctoral student in internship: a licensed psychological associate at level 2 (RCW 18.83.105; WAC 246-924-161). Ben applied 30 days ago: RCW 18.83.105(2)(b) lets him practice under the direct supervision of a licensed supervisor for 120 days after a complete application or until the license is issued or denied; then he is level 3. Cleo can petition for a temporary permit for up to 90 days in a calendar year (RCW 18.83.082). Dev cannot use 'psychological' or any term of like import without a psychology license (RCW 18.83.020); he can offer counseling under his own credential (18.83.210).",
              {
                leftHeading: "Candidate",
                rightHeading: "Route",
                left: ["Aya, PsyD intern", "Ben, postdoc, application pending 30 days", "Cleo, Oregon psychologist, two months", "Dev, master's counselor"],
                right: [
                  "Associate level 2 (internship)",
                  "Practice under direct supervision while the application is pending, then associate level 3",
                  "Temporary permit, up to 90 days in a calendar year",
                  "May not use 'psychological' in his title",
                  "Full psychologist license by endorsement",
                ],
                pairs: [0, 1, 2, 3],
              }
            ),
            part(
              "What clients are told",
              "States that an associate gives each client a disclosure form at the first contact saying they are supervised and by whom (RCW 18.83.020(3)), identifies their level of training (WAC 246-924-161(3)), and that supervisees' services are not billed as the supervisor's.",
              "Aya and Ben give every client, at the first professional contact, a disclosure form saying they are a licensed psychological associate under the supervision of an approved supervisor (RCW 18.83.020(3)), and tell clients their level of training (WAC 246-924-161(3)). Clients learn who the supervisor is and how to reach them, and services are never represented to insurers as the supervisor's own (WAC 246-924-059(1))."
            ),
          ],
        },
      ],
    },
    // ------------------------------------------- Continuing Education, Renewal and Credential Status -- 1
    {
      slug: "wajp-first-ce-cycle-plan",
      objective: "Plan a three-year continuing education cycle that meets the ethics, health equity, suicide prevention and jurisprudence requirements",
      kind: "build",
      title: "Plan a new psychologist's first continuing education cycle",
      brief:
        "Dr. Ruiz, a fictional psychologist, was first licensed in Washington in March 2026. Her plan so far: a 20-hour workshop on a new therapy, a 6-hour course on practice marketing and billing efficiency, 12 hours teaching an approved CE workshop she also designed, and an APA online course on telepsychology ethics (4 hours).",
      safetyNote: LEGAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Check her plan against the rules and fill the gaps.",
          parts: [
            numericPart(
              "Hours required per cycle",
              "60 hours every three years. Exactly 60 is met.",
              "WAC 246-924-230(1): at least 60 hours of continuing education every three years.",
              { answer: 60, tolerance: 0, unit: "hours" }
            ),
            selectPart(
              "What does not count",
              "Selects the practice marketing and billing efficiency course. Teaching an approved program counts (up to 30 hours per three years), as do the workshop and the ethics course.",
              "Courses designed mainly to increase practice income or office efficiency are not eligible (WAC 246-924-240(2)). Teaching an approved CE program earns credit up to 30 hours every three years (246-924-240(5)), so her 12 hours count. The ethics course counts toward the four ethics hours.",
              {
                display: "list",
                lines: ["20-hour workshop on a new therapy", "6-hour practice marketing and billing efficiency course", "12 hours teaching an approved CE workshop", "4-hour telepsychology ethics course"],
                correct: [1],
              }
            ),
            part(
              "What is still missing",
              "Names the jurisprudence exam within this first cycle (WAC 246-924-230(1)(d), one hour), two hours of health equity training meeting WAC 246-12-830, six hours of suicide prevention from the DOH model list (first training in assessment, treatment and management) every six years, enough other hours to reach 60, and keeping documentation for an audit.",
              "Still needed: the jurisprudence exam, which she must pass within this first CE cycle (one hour); two hours of health equity; six hours of suicide prevention from DOH's model list, her first in assessment, treatment and management (WAC 246-924-255); and further eligible hours to reach 60 (she has 36 countable so far). She keeps certificates showing her name, the title, hours, dates, faculty and sponsor signature in case of an audit (WAC 246-924-300)."
            ),
          ],
        },
      ],
    },
    // ------------------------------------------- Rules of Ethical Conduct and Practice Standards -- 3
    {
      slug: "wajp-sexual-misconduct-waiting-periods",
      objective: "Apply Washington's sexual misconduct rule, including the waiting periods for former clients and key parties",
      kind: "case",
      title: "A former client's brother, and a former client, years later",
      brief:
        "Dr. Lee, a fictional psychologist in Tacoma, ended brief treatment for panic with Mia, a fictional 30-year-old, in 2023, with a documented termination and referral. At a friend's party Dr. Lee meets Mia's brother, Omar, who was part of family sessions about her care.",
      safetyNote: LEGAL_SAFETY,
      steps: [
        {
          text: "Omar asks Dr. Lee out. Mia's treatment ended about three years ago.",
          ask: "What does the rule say about Omar, and what about Mia herself?",
          parts: [
            numericPart(
              "Years after services end: a key party",
              "2 years for a key party. Exactly 2 is met.",
              "WAC 246-924-358(5): after services end, no sexual misconduct with a former patient or client for five years, or with a key party for 2 years. Omar, as a sibling involved in her care, is a key party.",
              { answer: 2, tolerance: 0, unit: "years" }
            ),
            part(
              "Beyond the waiting period",
              "Explains that passing the period is not enough: the rule still forbids it if there is a significant likelihood the client or key party will need services again or there is an imbalance of power or special knowledge (358(6)); the board weighs termination, duration, time passed, contact since, what was shared, the client's condition and vulnerability (358(7)); for Mia herself the period is five years, so not yet; consent or initiation is no excuse (358(8)).",
              "Two years have passed for Omar, but subsection (6) still forbids it if Mia is likely to need Dr. Lee's services again or the relationship carries an imbalance of power, influence or special knowledge -- and Dr. Lee knows a great deal about his family from the sessions. The board would weigh the formal termination, how long and how intense the services were, time passed, any contact since, what was shared and Mia's vulnerability (358(7)). For Mia herself, five years must pass, and even then (6) applies. That Omar asked does not change the psychologist's responsibility (358(8)). The safe course is to decline."
            ),
          ],
        },
        {
          text: "Dr. Lee declines. Weeks later Omar calls asking to start therapy with Dr. Lee for his own anxiety.",
          ask: "Should Dr. Lee take him on?",
          parts: [
            part(
              "Taking Omar as a client",
              "Recognizes a multiple relationship that could impair objectivity (prior involvement as a key party in his sister's care, and the social contact) and refers him elsewhere (WAC 246-924-357, -353(2)), explaining kindly and offering names.",
              "No. Dr. Lee knows Omar through his sister's treatment and has had a social encounter with a romantic invitation; that history is the kind of present or previous social, emotional or familial connection that impairs objectivity (WAC 246-924-357). Dr. Lee explains this kindly and gives Omar the names of other psychologists (246-924-353(2))."
            ),
          ],
        },
      ],
    },
    {
      slug: "wajp-records-retention-and-closing-practice",
      objective: "Keep and retain records as Washington requires, including a plan for records when a psychologist leaves practice",
      kind: "build",
      title: "Write the records policy for a solo practice",
      brief:
        "Dr. Patel, a fictional psychologist in solo practice in Olympia, sees adults and adolescents and is writing her records policy. Her youngest client, Jay, is 15; his last session was this month.",
      safetyNote: LEGAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the parts of the policy the rules require, and work out how long Jay's record is kept.",
          parts: [
            numericPart(
              "Jay's record: how many years from now",
              "Jay is 15: kept until age 22 or eight years after last contact, whichever is longer, so eight years (to age 23). Exactly 8 is met.",
              "WAC 246-924-354(2): at least eight years after last contact; for a minor, until age 22 or eight years, whichever is longer. Jay turns 22 in seven years; eight years is longer, so 8 years.",
              { answer: 8, tolerance: 0, unit: "years" }
            ),
            part(
              "What each record holds",
              "Lists the required contents: presenting problem, purpose or diagnosis; fee arrangement; dates and services; copies of tests and reports; formal consultations and information from others under a release; progress notes; and the rule for a client who asks that no record be kept (in writing, minimal record, not where other law requires records).",
              "Each record holds the presenting problem, purpose or diagnosis; the fee arrangement; each date and service; copies of tests and reports; formal consultations and information received under a release; and progress notes (WAC 246-924-354(1)). If a client asks in writing that no treatment record be kept and she agrees, she still keeps the request with the client's identity, dates, fees and a description of services, and she cannot agree where other law requires records."
            ),
            part(
              "If she cannot continue",
              "Includes the written plan for retirement, leaving practice, illness or death: a designated qualified person or facility to make referrals, a plan for record requests, a successor bound by the law, available to the board within 60 days of request; secure storage and secure disposal (shredding, deleting) after the retention period; and arrangements for clients' emergencies during absences (246-924-355).",
              "A written policy names a qualified colleague (or clinic) to make clinically relevant referrals if she cannot, describes how record requests will be met, and requires whoever holds the records next to follow the law; she gives it to the board within 60 days if asked (246-924-354(3)). Records are stored securely and, after the retention period, shredded or deleted securely (354(5)). For planned absences she arranges emergency coverage (246-924-355)."
            ),
          ],
        },
      ],
    },
    {
      slug: "wajp-parenting-evaluation-standards",
      objective: "Conduct a parenting evaluation to Washington's minimum standards",
      kind: "case",
      title: "Asked to do a parenting evaluation for a former client's divorce",
      brief:
        "Dr. Gomez, a fictional psychologist in Yakima, receives a request from an attorney to conduct a parenting evaluation in the divorce of the Kerr family, all fictional, who have two children, 6 and 11.",
      safetyNote: LEGAL_SAFETY,
      steps: [
        {
          text: "Dr. Gomez saw Mrs. Kerr for individual therapy for depression two years ago.",
          ask: "Can Dr. Gomez take the evaluation?",
          parts: [
            part(
              "Prior therapy",
              "Applies WAC 246-924-445(7): a psychologist who provided therapeutic services to any party declines unless there are mitigating circumstances (e.g., a rural or underserved area with limited options); also (8) multiple relationships: disclose, document, decline if objectivity is likely impaired; concludes she should decline unless no other evaluator is reasonably available, and could instead provide limited information as a treating provider with authorization (246-924-467(2)).",
              "WAC 246-924-445(7) says a psychologist who has provided therapy to any party shall not do the evaluation unless there are mitigating circumstances, such as a rural or underserved area with few options. Her history with Mrs. Kerr also raises a multiple relationship that could impair objectivity (445(8)). Unless no other qualified evaluator is reasonably available, she declines. With Mrs. Kerr's authorization she could still give the court or the evaluator limited information as her former treating provider (246-924-467(2))."
            ),
          ],
        },
        {
          text: "A colleague, Dr. Shah, takes the evaluation instead.",
          ask: "What must Dr. Shah do to meet the minimum standards?",
          parts: [
            part(
              "Minimum standards",
              "Discloses in writing at the outset who requested it, who pays, fees, who receives the report, confidentiality limits and procedures (11); focuses on each child's best interest and the listed factors including RCW 26.09.191 limiting factors (1), (5); uses more than one source of information (5); interprets any tests per current research (6); identifies people not personally evaluated (9); keeps the required written record (10); and gives raw test data only to qualified persons with authorization or by court order (12)(g).",
              "At the start, in writing: who asked for the evaluation, who pays, the fees, who gets the report, the limits of confidentiality and the procedures (WAC 246-924-445(11)). The focus is each child's best interest: each parent's relationship with each child, who has done the daily parenting, each parent's ability, and the children's needs and development, with ethnic and cultural issues and the limiting factors in RCW 26.09.191 (445(1), (5)). Conclusions rest on more than one source -- interviews, observation of each parent with the children, collateral contacts, records (445(5)). Tests are interpreted per current research (445(6)). Anyone not personally evaluated is identified as such (445(9)). She keeps the required record (445(10)) and releases raw test data only to a qualified person with authorization or as the court directs (445(12)(g))."
            ),
          ],
        },
      ],
    },
    // ------------------------------------------- Confidentiality, Privilege and Health Care Information -- 2
    {
      slug: "wajp-duty-to-protect",
      objective: "Apply the duty to warn or protect when a client threatens an identifiable person",
      kind: "case",
      title: "A threat in session in Washington",
      brief:
        "Dr. Novak, a fictional psychologist in Bellingham, is treating Kai, a fictional 26-year-old, for anger after a breakup.",
      safetyNote: LEGAL_SAFETY,
      steps: [
        {
          text: "Kai says his ex-girlfriend, Sara, 'is going to pay'. Asked what he means, he says he knows where she works and has bought a knife.",
          ask: "Does a duty arise, and how is it discharged under Washington law?",
          parts: [
            part(
              "When the duty arises",
              "Identifies an actual threat of physical violence against a reasonably identifiable victim (RCW 71.05.120(3)); the means and specificity make it serious; the psychologist's privilege does not bar it.",
              "Yes. RCW 71.05.120(3) keeps the duty to warn or take reasonable precautions where a patient has communicated an actual threat of physical violence against a reasonably identifiable victim. Kai named Sara, knows where she works and has a knife."
            ),
            part(
              "Discharging it",
              "States that the duty is discharged by reasonable efforts to communicate the threat to the victim and to law enforcement (71.05.120(3)); RCW 70.02.050(1)(c) also permits disclosure to people able to prevent a serious and imminent threat, including the target; disclose only what is needed; consider safety steps with Kai (crisis evaluation); document.",
              "Make reasonable efforts to tell Sara and law enforcement of the threat -- that discharges the duty under RCW 71.05.120(3). Chapter 70.02 RCW allows disclosure without authorization to those reasonably able to prevent or lessen a serious and imminent threat, including the target (70.02.050(1)(c)), and WAC 246-924-363(2) ties a psychologist's disclosures without consent to that chapter. Share only what prevents the harm. Assess whether Kai needs a crisis evaluation, consult, and document the threat, the assessment, whom she contacted and when."
            ),
          ],
        },
        {
          text: "A week later Kai's new employer calls asking whether Kai is 'dangerous' and whether he is in treatment.",
          ask: "How does Dr. Novak answer?",
          parts: [
            part(
              "No authorization, no disclosure",
              "Does not confirm or deny treatment without a valid written authorization (the fact of treatment is itself confidential, 70.02.230(1); WAC 246-924-363(1)); no serious and imminent threat to this caller justifies disclosure.",
              "She does not confirm or deny that Kai is a client. The fact of mental health treatment is itself confidential (RCW 70.02.230(1)), and a psychologist discloses only with informed written consent or as chapter 70.02 RCW permits (WAC 246-924-363). No threat to the employer exists, so there is no basis to disclose. She can tell the caller only that she cannot share any information without a written authorization."
            ),
          ],
        },
      ],
    },
    {
      slug: "wajp-valid-authorization",
      objective: "Write a valid authorization to disclose health care information under chapter 70.02 RCW",
      kind: "build",
      title: "Fix an authorization form",
      brief:
        "A fictional clinic's release form for a client, Jo, reads: 'I authorize release of my records. Signed: Jo (no date).' Jo wants her psychologist to send her treatment summary to her new primary care doctor, Dr. Bay, at a fictional clinic, for the next year.",
      safetyNote: LEGAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "What makes the form invalid, and what should it say?",
          parts: [
            selectPart(
              "Required elements missing",
              "Selects the missing elements: the date, the nature of the information, the recipient, the provider making the disclosure, and an expiration date or event. The signature is present.",
              "RCW 70.02.030(3): a valid authorization is in writing, dated and signed by the patient, identifies the nature of the information, the recipient, the provider who discloses, and the patient, and has an expiration date or event. Jo's form is signed and names her, but lacks a date, says 'my records' instead of what information, names no recipient and no disclosing provider, and has no expiration.",
              {
                display: "list",
                lines: ["Signed by the patient", "Dated", "Nature of the information", "Name and affiliation of the recipient", "Provider making the disclosure", "Expiration date or event"],
                correct: [1, 2, 3, 4, 5],
              }
            ),
            part(
              "The corrected authorization",
              "Writes it with each element: Jo identified; the psychologist (and practice) as discloser; Dr. Bay and her clinic as recipient; the treatment summary (not the whole record); dated and signed; expires one year from signing or at a stated event; notes Jo can revoke it in writing; keeps a copy with the record.",
              "'I, Jo [last name, date of birth], authorize Dr. [psychologist], [practice], to disclose a summary of my treatment (diagnosis, treatment provided and current recommendations) to Dr. Bay, [clinic], for coordination of my medical care. This authorization expires one year from the date signed. I may revoke it in writing at any time. Signed: Jo. Date: [date].' The practice keeps a copy with the record (RCW 70.02.030(7)) and sends only the summary."
            ),
          ],
        },
      ],
    },
    // ------------------------------------------- Mandatory Reporting -- 1
    {
      slug: "wajp-child-abuse-report-48-hours",
      objective: "Report suspected child abuse or neglect as a mandated reporter, on time and to the right agency",
      kind: "case",
      title: "A disclosure on Friday afternoon",
      brief:
        "Dr. Ito, a fictional psychologist in Everett, sees Bea, a fictional 12-year-old, for anxiety. At the end of a Friday 4 p.m. session Bea says her mother's boyfriend 'touches me at night' and begs Dr. Ito not to tell.",
      safetyNote: LEGAL_SAFETY,
      steps: [
        {
          text: "Dr. Ito's next free time is Monday.",
          ask: "When and to whom must Dr. Ito report?",
          parts: [
            numericPart(
              "Latest deadline in hours",
              "48 hours after reasonable cause arises. Exactly 48 is met.",
              "RCW 26.44.030(1)(h): at the first opportunity, and in no case longer than 48 hours after there is reasonable cause to believe the child has suffered abuse or neglect.",
              { answer: 48, tolerance: 0, unit: "hours" }
            ),
            part(
              "To whom, and why not Monday",
              "Psychologists are mandated reporters (26.44.030(1)(a)); reports to law enforcement or the Department of Children, Youth, and Families (DCYF) at the first opportunity -- today, given ongoing risk at night -- not waiting until Monday even though 48 hours is the outer limit; includes the identity of the accused if known; cannot promise secrecy.",
              "Psychologists are named mandated reporters (RCW 26.44.030(1)(a)). The report goes to law enforcement or DCYF 'at the first opportunity', and Bea goes home tonight to where the abuse happens, so Dr. Ito reports before Bea leaves or immediately after, not on Monday; 48 hours is the outer limit, not a target. The report names the boyfriend if known. Dr. Ito tells Bea gently that she can't keep this secret because her job is to keep Bea safe."
            ),
          ],
        },
        {
          text: "Separately, Dr. Ito's adult client, 40, discloses abuse by an uncle when she was 9. The uncle now coaches a youth soccer team.",
          ask: "Does this also need a report?",
          parts: [
            part(
              "An adult disclosing childhood abuse",
              "Explains that abuse discovered after the child became an adult need not be reported (26.44.030(2)), unless there is reasonable cause to believe other children are or may be at risk from the accused; the uncle's current access to children makes a report required; discusses this with the client and documents.",
              "Normally a childhood abuse disclosed by an adult is not reportable (RCW 26.44.030(2)). The exception applies here: there is reasonable cause to believe other children are or may be at risk from the accused, since he coaches a youth team, so the duty to report applies. Dr. Ito explains this to her client, supports her through it, and documents."
            ),
          ],
        },
      ],
    },
    // ------------------------------------------- Discipline Under the Uniform Disciplinary Act -- 1
    {
      slug: "wajp-unprofessional-conduct-and-sanctions",
      objective: "Identify unprofessional conduct under the Uniform Disciplinary Act and the psychology-specific grounds",
      kind: "build",
      title: "Match complaints to the grounds for discipline",
      brief:
        "Five fictional complaints reach the Examining Board of Psychology about five fictional psychologists: (1) Dr. A ignored the board's request for records about a complaint; (2) Dr. B began offering neuropsychological assessments with no training in them; (3) Dr. C billed an insurer for sessions that did not happen; (4) Dr. D practiced while intoxicated; (5) Dr. E provided conversion therapy to a 16-year-old.",
      safetyNote: LEGAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Match each complaint to its ground, and say what the board can do.",
          parts: [
            matchPart(
              "Complaint and ground",
              "(1) failure to cooperate with the disciplining authority, (2) practicing in an area where clearly untrained or incompetent, (3) misrepresentation or fraud in the business, (4) current misuse of alcohol, (5) conversion therapy on a patient under 18. All five is met; three or four is partly there.",
              "(1) RCW 18.130.180(8): not furnishing records to the disciplining authority. (2) RCW 18.83.121(4): practicing in an area of psychology where clearly untrained or incompetent. (3) RCW 18.130.180(13), and WAC 246-924-366 on fraud in billing. (4) RCW 18.130.180(22): current misuse of alcohol. (5) RCW 18.130.180(26): conversion therapy on a patient under 18.",
              {
                leftHeading: "Complaint",
                rightHeading: "Ground",
                left: ["(1) Ignored the board's records request", "(2) Neuropsych testing with no training", "(3) Billed sessions that didn't happen", "(4) Practiced while intoxicated", "(5) Conversion therapy with a 16-year-old"],
                right: [
                  "Failure to cooperate with the disciplining authority",
                  "Practicing where clearly untrained or incompetent",
                  "Misrepresentation or fraud in the business",
                  "Current misuse of alcohol",
                  "Conversion therapy on a patient under 18",
                  "Contagious disease",
                ],
                pairs: [0, 1, 2, 3, 4],
              }
            ),
            part(
              "Sanctions",
              "Names the range of sanctions under RCW 18.130.160: revocation, suspension, restriction, remedial education or treatment, practice monitoring, censure or reprimand, probation, a fine up to $5,000 per violation, corrective action, refund of fees, surrender; chosen under the sanction schedule, with the public's safety paramount.",
              "After a hearing (or a stipulation), the board can revoke, suspend or restrict the license; require remedial education or treatment; require practice monitoring; censure or reprimand; impose probation; fine up to $5,000 per violation; order corrective action or a refund of fees; or accept surrender (RCW 18.130.160). It uses the sanction schedule, and protecting the public's health and safety is its paramount responsibility."
            ),
          ],
        },
      ],
    },
  ],
};
