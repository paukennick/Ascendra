import { CLINICAL_SAFETY, part, matchPart, selectPart, type SeedLabSet } from "./types";
import { source } from "../sources";
import { ASWB_GUIDEBOOK_URL } from "../tracks/aswb";

// REQ-286: Prep for the ASWB Masters Exam, authored labs.
//
// Aligned to the ASWB Masters content outline in the August 2026 guidebook
// (2026 blueprint, in use from 2026-08-03; read 2026-11-14): Values and Ethics
// 35, Assessment and Planning 33, Intervention and Practice 32, as seeded in
// seed/tracks/aswb.ts. Density (docs/labs.md, "hybrid"): 3 / 3 / 3 = 9, one lab
// per objective. Masters practice is broader than clinical: child welfare,
// older adults, groups, communities and programs, so the labs are too.
//
// Mental health course: behind the per-course 18+ acknowledgment. Frank where
// the exam tests it (child abuse), never graphic. Every person is fictional;
// exam practice, not clinical, legal or ethics advice. Values sourced per lab
// in value-sources.ts (NASW Code, Washington's reporting law as one state's
// example, 988). All needs_expert_review until a licensed social worker
// approves them.

export const ASWB_MASTERS_LABS: SeedLabSet = {
  trackCode: "ASWBMASTERS",
  sources: [source(ASWB_GUIDEBOOK_URL, "exam_outline", "2026-11-14", "2027-05-14")],
  labs: [
    // ------------------------------------------- Values and Ethics (35%) -- 3
    {
      slug: "aswbm-mandated-child-abuse-report",
      objective: "Make a mandated child abuse report and keep the family engaged",
      kind: "case",
      title: "A bruise, an explanation that doesn't fit, and a family you want to keep",
      brief:
        "Sam, a fictional school social worker in Washington State, has been working with the Ortiz family, all fictional, on their 8-year-old son Leo's attendance. The parents have been engaged and Leo's attendance is improving.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "Leo comes to Sam's office holding his arm. There are finger-shaped bruises on his upper arm. He says, 'Dad got mad about my homework,' then quickly adds that he fell.",
          ask: "What does Sam do, and what does he not do?",
          parts: [
            part(
              "Reasonable cause and the report",
              "Recognizes reasonable cause to believe abuse (an injury pattern plus a disclosure), which is enough: proof is not required and investigating is not Sam's role; reports to child protective services or law enforcement promptly (in Washington, RCW 26.44.030: at the first opportunity and no later than 48 hours); does not interview Leo in detail, examine him, or confront the parents first; follows school policy but the duty is personal.",
              "A pattern bruise and 'Dad got mad' give reasonable cause to believe abuse; Sam does not need proof, and investigating is the agency's job. He listens calmly, does not press Leo for details or ask leading questions, gets him medical attention if the arm needs it, and reports: in Washington, to law enforcement or the Department of Children, Youth, and Families at the first opportunity and no later than 48 hours (RCW 26.44.030). Telling the principal does not replace his own report. He does not call the father first, which could put Leo at risk or affect the investigation."
            ),
            part(
              "What goes in the report and the record",
              "Reports the facts observed and said (Leo's words quoted, the bruise's appearance, time and date) and the identity of the accused if known; documents objectively; tells Leo honestly and simply that he must tell people whose job is to keep kids safe.",
              "In the report: what he saw (finger-shaped bruises on the upper left arm), what Leo said in his own words, when, and who Leo named. In the record: the same facts, objectively, with the time of the report and the name of the person he spoke to. To Leo, simply and honestly: 'My job is to make sure kids are safe, so I'm going to talk to people who help with that.' No promises of secrecy."
            ),
          ],
        },
        {
          text: "The next week Mr. Ortiz storms into Sam's office: 'You called the state on us after everything we've done?'",
          ask: "How does Sam respond and keep working with the family?",
          parts: [
            part(
              "Keeping the family engaged",
              "Stays calm, acknowledges the father's feelings, is transparent that he is a mandated reporter and was required to report (as the consent and school policy say), does not discuss the content of the report or the investigation, avoids defensiveness, and offers to keep supporting Leo's attendance and to connect the family with parenting or stress resources; documents the contact and safety concerns.",
              "Acknowledge first: 'You're upset, and I understand why.' Then be honest: as a school social worker he is required by law to report when he has reason to believe a child was hurt, and this was explained when they started working together. He does not discuss what was reported or argue about it. He makes clear he still wants to help Leo and the family -- the attendance plan continues -- and offers resources such as a parenting class or stress support. If Mr. Ortiz becomes threatening he ends the meeting safely. He documents the contact."
            ),
          ],
        },
      ],
    },
    {
      slug: "aswbm-self-determination-older-adult",
      objective: "Protect client self-determination and the right to refuse services, and recognize when imminent risk limits it",
      kind: "case",
      title: "An older man who wants to stay home",
      brief:
        "Mr. Haddad, a fictional 84-year-old widower, lives alone in a two-story house. A hospital social worker meets him after a fall. His daughter wants him moved to assisted living; he wants to go home.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "He is oriented, explains the risks of going home in his own words, and says, 'I'd rather fall in my own house than live in a place I hate.'",
          ask: "Whose decision is it, and what does the social worker do?",
          parts: [
            part(
              "Self-determination and capacity",
              "Recognizes that a client with decision-making capacity has the right to make a risky choice (NASW 1.02); his understanding and appreciation of the risks support capacity; the social worker's role is to inform, support and reduce risk, not to override him or side with the daughter; works with the family with his consent.",
              "He understands the risks and explains his reasons, which supports his capacity to decide, so it is his decision. The Code asks the social worker to respect and promote self-determination (1.02), limiting it only when actions pose a serious, foreseeable and imminent risk. Her role is to help him decide well and to make his choice as safe as possible, and, with his permission, to help his daughter understand his reasons."
            ),
            part(
              "Making home safer",
              "Offers concrete supports he agrees to: home safety evaluation, grab bars and moving the bedroom downstairs, a medical alert device, home health or home care, meal delivery, and a follow-up plan.",
              "Offer, and let him choose: a home safety evaluation, grab bars and a bed on the ground floor, a medical alert pendant, home care a few hours a week, meal delivery, and a follow-up call after discharge. Write down what he accepts and what he declines."
            ),
          ],
        },
        {
          text: "Two weeks later a neighbor reports him confused, in soiled clothes, with no food in the house and unpaid bills.",
          ask: "What changes now?",
          parts: [
            part(
              "When the picture changes",
              "Recognizes possible self-neglect and lost capacity (a change from before) and possibly a medical cause such as infection or delirium; arranges a prompt capacity and medical assessment; considers an adult protective services report as the state's vulnerable adult law requires; still involves him as much as possible and uses the least restrictive option.",
              "Confusion, no food and unpaid bills are new: they suggest self-neglect and possibly lost capacity, perhaps from a treatable cause such as an infection or delirium. Arrange an urgent medical and capacity assessment. Many states, including Washington, treat self-neglect of a vulnerable adult as a matter for adult protective services, so check the duty to report. Keep him involved in decisions as far as he can be, and choose the least restrictive option that keeps him safe."
            ),
          ],
        },
      ],
    },
    {
      slug: "aswbm-ethical-dilemma-model",
      objective: "Resolve an ethical dilemma with a decision-making model, weighing duties to clients, colleagues, the profession and society",
      kind: "case",
      title: "A colleague's shortcut on the case notes",
      brief:
        "Priya, a fictional case manager at a housing agency, notices that a fictional colleague, Ted, has been copying the same visit note into several clients' records for home visits she knows he did not make, because he is overwhelmed by his caseload.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "Ted asks her to 'keep it between us', saying he will catch up next month and the agency is understaffed.",
          ask: "Work through the dilemma: what values and duties conflict, and what are Priya's options?",
          parts: [
            part(
              "The conflicting duties",
              "Identifies the duties in conflict: loyalty and respect for a colleague (NASW 2.01) against clients' well-being and accurate records (3.04), honest billing if visits are billed (3.05), and the duty to address unethical conduct (2.10); identifies the risk to clients whose needs go unseen.",
              "Loyalty to a struggling colleague pulls one way; on the other side are clients who are not being seen, records that are false (NASW 3.04 requires accurate records reflecting the services provided), possible billing for visits that did not happen (3.05), and the duty to discourage and correct unethical conduct (2.10). Client welfare weighs most."
            ),
            part(
              "Options and the choice",
              "Lists options (say nothing, talk to Ted, report to the supervisor), applies the Code's order: discuss with the colleague first when feasible and likely productive (2.10(c)), then formal channels if he does not correct it (2.10(d)); refuses to keep the secret; considers the agency's staffing as a problem to raise too (3.09(b)).",
              "Options: keep quiet (not acceptable: clients are at risk and records are false), talk to Ted, or go to the supervisor. The Code says to discuss it with the colleague first when that is feasible and likely to help (2.10(c)): Priya tells Ted she cannot keep it secret, and that he needs to correct the notes and tell their supervisor about his caseload. If he does not, she takes it through formal channels (2.10(d)). She can also raise the understaffing with management (3.09(b)). She documents what she did."
            ),
          ],
        },
        {
          text: "Ted refuses and says she will get him fired.",
          ask: "What does Priya do now?",
          parts: [
            part(
              "Formal channels",
              "Reports to the supervisor through the agency's procedure, focusing on facts and client risk, not on Ted's character; knows a licensing board or NASW complaint is possible if the agency does not act and notes the clients who need visits now.",
              "She takes it to their supervisor, sticking to the facts: which records, which visits, and the clients who may need a visit now. If the agency does nothing and the conduct continues, a complaint to the licensing board or the NASW ethics committee is open to her. She does not gossip or exaggerate, and she can say Ted needs support with his caseload."
            ),
          ],
        },
      ],
    },
    // ------------------------------------------- Assessment and Planning (33%) -- 3
    {
      slug: "aswbm-risk-of-harm-shelter",
      objective: "Assess risk of harm to self and others and act on what you find",
      kind: "case",
      title: "A shelter resident who gave away his things",
      brief:
        "Carl, a fictional 45-year-old veteran, has lived at a homeless shelter for a month. A case manager notices he has given away his jacket and his dog to other residents.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "When asked, Carl says, 'I won't need them where I'm going.'",
          ask: "What does the case manager do?",
          parts: [
            part(
              "Recognize and ask",
              "Recognizes giving away possessions and the statement as warning signs; asks directly about suicide; asks about plan, means (including firearms), intent and past attempts; does not leave him alone if risk is high.",
              "Giving away possessions and 'I won't need them' are warning signs. Ask plainly: 'Are you thinking about killing yourself?' Then the plan, the means -- including whether he has access to a gun -- intent, timing, past attempts, drinking or drug use. If he has a plan and means, he is not left alone while help is arranged."
            ),
          ],
        },
        {
          text: "Carl says he plans to walk onto the freeway tonight. He has been drinking.",
          ask: "What happens next?",
          parts: [
            part(
              "Act on imminent risk",
              "Treats this as imminent risk: stays with him, contacts emergency or crisis services per agency protocol (911 or a mobile crisis team; 988 as a resource), informs the supervisor, documents; recognizes self-determination is limited by serious, foreseeable and imminent risk (NASW 1.02, 1.07(c)).",
              "A plan for tonight, a method, and alcohol make this imminent. The case manager stays with him, follows the shelter's emergency protocol -- calling 911 or the local mobile crisis team -- and lets him know what is happening and why. 988 (call or text) is a resource for him and for staff. Imminent risk is when the Code allows limiting self-determination and sharing what is needed to keep him safe (1.02, 1.07(c)). She tells her supervisor and documents."
            ),
          ],
        },
      ],
    },
    {
      slug: "aswbm-interpreter-sensitive-interview",
      objective: "Use interviewing techniques -- clarifying, validating, reflecting, confronting -- and work well through interpreters",
      kind: "build",
      title: "Plan an interview through an interpreter about a sensitive subject",
      brief:
        "Hoa, a fictional 37-year-old Vietnamese-speaking mother, comes to a family services agency with her 14-year-old son, who speaks English and Vietnamese and offers to interpret. A teacher reported that Hoa may be experiencing violence at home.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Plan how the social worker conducts this interview.",
          parts: [
            selectPart(
              "What not to do",
              "Selects the practices to avoid: using the son as interpreter, talking to the interpreter instead of the client, and asking about violence with the partner or children present; does not select the good practices.",
              "Never use a child as interpreter, least of all about violence at home: it is unsafe for both and makes honest answers unlikely. Speak to Hoa, not to the interpreter. Ask about violence only when she is alone with the social worker and a professional interpreter.",
              {
                display: "list",
                lines: [
                  "Let her son interpret since he is fluent",
                  "Use a qualified professional interpreter by phone or in person",
                  "Look at and speak to the interpreter rather than Hoa",
                  "Ask about violence with her children in the room",
                  "Brief the interpreter on confidentiality before starting",
                ],
                correct: [0, 2, 3],
              }
            ),
            part(
              "Interviewing techniques",
              "Uses a professional interpreter briefed on confidentiality and verbatim interpreting; speaks in short segments directly to Hoa; explains confidentiality and its limits; builds rapport before sensitive questions; asks about safety alone, with normalizing and clarifying questions, validates her feelings, reflects, and avoids pressuring or confronting; plans safety and resources if she discloses.",
              "Bring a professional interpreter (phone or in person), briefed to interpret everything word for word and to keep it confidential. Speak to Hoa in short sentences. Explain confidentiality and its limits. Start with her concerns and her son's needs to build trust, then with the son out of the room ask gently: 'Many women I see have someone at home who hurts or scares them. Has that happened to you?' Validate ('That sounds frightening'), reflect and clarify rather than push. If she discloses, plan for safety with her and offer domestic violence resources in Vietnamese."
            ),
          ],
        },
      ],
    },
    {
      slug: "aswbm-service-plan-community-resources",
      objective: "Identify community resources and use triage, goal planning and service planning",
      kind: "build",
      title: "Write a service plan for a family facing several crises at once",
      brief:
        "The Brown family, fictional: Tanya, 29, and her two children, ages 2 and 7, have just arrived from another state after leaving a violent partner. They are staying in a motel for three more nights. Tanya has no job, no car, $200, and the 2-year-old has asthma and needs a refill in five days. The 7-year-old is not enrolled in school.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Triage the needs and write the service plan with Tanya.",
          parts: [
            part(
              "Triage",
              "Puts safety and immediate survival first: the abuser's ability to find them (safety planning, a domestic violence shelter or advocate), housing before the motel runs out, the child's asthma medication; then income and benefits, school enrollment, transportation, longer-term housing and employment.",
              "First, safety: can the ex-partner find them? Connect her with a domestic violence advocate and a confidential shelter if possible. Second, housing before the motel ends in three days. Third, the 2-year-old's asthma medication before it runs out. Then benefits (cash, food, health coverage), enrolling the 7-year-old (school enrollment for children in temporary housing has its own protections), transportation, and longer-term housing and work."
            ),
            part(
              "Service plan",
              "Writes goals with Tanya in her words, measurable and time-bound, partialized into tasks with who does what and by when, matched to community resources, with her strengths named and a review date.",
              "Goal 1, by tomorrow: a safe place to stay (Tanya calls the domestic violence hotline with the social worker; the social worker checks shelter beds). Goal 2, within four days: the asthma refill (Tanya applies for health coverage today; the social worker connects her with a clinic). Goal 3, within a week: income (apply for food and cash assistance together). Goal 4, within a week: the 7-year-old in school (the social worker calls the district's liaison for children in temporary housing). Strengths: she got her children out and here safely. Review in one week."
            ),
          ],
        },
      ],
    },
    // ------------------------------------------- Intervention and Practice (32%) -- 3
    {
      slug: "aswbm-involuntary-client-contract",
      objective: "Engage an involuntary client and contract for goals",
      kind: "case",
      title: "A father ordered to parenting services",
      brief:
        "Marcus, a fictional 34-year-old father, is court-ordered to parenting services after his children were placed with their grandmother because of neglect. He arrives late and says, 'I'm only here because the judge said so.'",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "He sits with his arms crossed and says the caseworker 'has it out for me'.",
          ask: "How does the social worker begin?",
          parts: [
            part(
              "Engaging an involuntary client",
              "Acknowledges that he did not choose this and validates his frustration; is transparent about what is required, what is negotiable and what will be reported to the court (NASW 1.03(d)); avoids arguing; looks for his own goal (getting his children back) and his strengths.",
              "Start where he is: 'You didn't choose to be here, and it sounds like you feel judged.' Be clear about what is not negotiable (attendance, what is reported to the court) and what is (the goals, how they work together, scheduling) -- involuntary clients are told the nature of services and the extent of their right to refuse (1.03(d)). Don't argue about the caseworker. Ask what he wants: almost always, his children home. That becomes the shared goal."
            ),
          ],
        },
        {
          text: "Marcus says he wants his kids back, but the court's list -- a parenting class, stable housing, drug screens -- feels impossible.",
          ask: "How does the social worker contract with him?",
          parts: [
            part(
              "Contracting and partializing",
              "Writes a contract with clear tasks for each of them, partializing the large goal into small measurable steps with dates, building on his strengths, and agreeing how progress is reviewed and reported.",
              "The purpose of the contract is clarity about who does what. Break 'get the kids back' into steps: enroll in the parenting class this week (the social worker gives him three options near his bus line), apply for two housing programs within two weeks with her help, keep every screen appointment. Each step has a date and a name beside it, and they review it every two weeks, including what goes in the court report. Note what he already does well, such as keeping his visits."
            ),
          ],
        },
      ],
    },
    {
      slug: "aswbm-group-stages",
      objective: "Lead groups through their stages, building cohesion and managing group process",
      kind: "build",
      title: "Read the stage of a caregivers' support group",
      brief:
        "A fictional social worker runs an eight-week support group for adult children caring for a parent with dementia. Moments from different weeks: (1) members ask what the group is for and talk only to the leader; (2) two members argue about whether placement in a facility is 'giving up', and one says the leader isn't doing enough; (3) members share phone numbers and start finishing each other's sentences; (4) members bring problems and solve them together with little prompting; (5) members talk about missing the group and what they'll do next.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Name the stage of each moment and say what the leader does in two of them.",
          parts: [
            matchPart(
              "Moment and stage",
              "(1) forming or beginning, (2) storming or conflict, (3) norming or cohesion, (4) performing or working, (5) ending or termination. All five is met; three or four is partly there.",
              "(1) Forming: members look to the leader and test what the group is. (2) Storming: conflict between members and with the leader. (3) Norming: cohesion and shared norms. (4) Performing: members do the work with little prompting. (5) Termination: endings, loss and what comes next.",
              {
                leftHeading: "Moment",
                rightHeading: "Stage",
                left: ["(1) Asking what it's for", "(2) Arguing and challenging the leader", "(3) Sharing numbers, closeness", "(4) Solving problems together", "(5) Missing the group"],
                right: ["Forming", "Storming", "Norming", "Performing", "Termination", "Recruitment"],
                pairs: [0, 1, 2, 3, 4],
              }
            ),
            part(
              "Leader's work",
              "For at least two stages, names a fitting leader action: forming -- structure, purpose, ground rules, linking members; storming -- welcome the conflict, protect members, model respectful disagreement, take the challenge non-defensively; norming -- reinforce norms and step back; performing -- facilitate, less direction; termination -- review gains, address feelings about ending, plan for support after.",
              "Forming: explain the purpose, set ground rules (confidentiality, respect), and link members' experiences so they talk to each other. Storming: treat the conflict as normal, protect both members, reframe placement as one of several caring choices, and answer the challenge to the leader openly rather than defensively. Termination: review what members gained, make room for feelings about ending, and plan for support afterward, such as exchanging contacts or joining an ongoing caregiver group."
            ),
          ],
        },
      ],
    },
    {
      slug: "aswbm-program-evaluation-plan",
      objective: "Evaluate programs -- needs assessment, formative and summative evaluation, cost-effectiveness -- and judge research design, reliability and validity",
      kind: "build",
      title: "Plan an evaluation of a youth mentoring program",
      brief:
        "A fictional agency runs a mentoring program for 60 middle schoolers and wants to know whether it improves school attendance. The funder asks for an evaluation in one year. Last year's report compared participants' attendance with the district average and found participants did better.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Critique last year's comparison and write a better evaluation plan.",
          parts: [
            part(
              "What was wrong",
              "Identifies selection bias (students who join may already differ, e.g. motivated families) and no baseline or comparison group, so the difference cannot be attributed to the program; notes other threats (history, maturation, attrition).",
              "Comparing participants with the district average says nothing about the program's effect: students who join a mentoring program may already attend more or have more involved families (selection bias). There was no baseline for the same students and no similar comparison group, and other events (a new attendance policy, maturation) could explain differences."
            ),
            part(
              "A better plan",
              "Proposes a formative evaluation (implementation: are mentors meeting as planned) and a summative one with a stronger design (baseline and follow-up attendance for participants and a matched comparison group or a waitlist), reliable measures (school attendance records), attention to attrition and confidentiality and consent, and a cost-effectiveness measure (cost per day of attendance gained).",
              "Formative: track whether mentors and students actually meet as planned and what gets in the way, so the program can improve during the year. Summative: compare attendance before and after for participants and for a similar group, such as a waitlist or matched non-participants, using school records (a reliable measure). Track who drops out. Get consent from parents and protect students' data. Add cost-effectiveness: program cost divided by the attendance days gained."
            ),
          ],
        },
      ],
    },
  ],
};
