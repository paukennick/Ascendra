import { CLINICAL_SAFETY, part, matchPart, selectPart, type SeedLabSet } from "./types";
import { source } from "../sources";
import { ASWB_GUIDEBOOK_URL } from "../tracks/aswb";

// REQ-286: Prep for the ASWB Clinical Exam, authored labs.
//
// Aligned to the ASWB Clinical content outline in the August 2026 guidebook
// (2026 blueprint, in use from 2026-08-03; read 2026-11-14): Values and Ethics
// 36, Assessment and Planning 32, Intervention and Practice 32, as seeded in
// seed/tracks/aswb.ts. Density (docs/labs.md, "hybrid"): 3 / 3 / 3 = 9, one lab
// per objective. ASWB questions are recall, application and reasoning; these
// labs make the learner do what the reasoning items assume -- decide what to do
// FIRST with a threat, a suicidal statement or a boundary problem, write a
// consent and a biopsychosocial summary, separate look-alike presentations, and
// use supervision.
//
// Mental health course: behind the per-course 18+ acknowledgment
// (lib/mature-content.ts). Frank where the exam tests it, never graphic. Every
// person is fictional; this is exam practice, not clinical, legal or ethics
// advice. Values (NASW Code standards, Washington's duty-to-protect rule, 988)
// are sourced per lab in value-sources.ts; labs that quote none say why. All
// needs_expert_review until a licensed clinical social worker approves them.

export const ASWB_CLINICAL_LABS: SeedLabSet = {
  trackCode: "ASWBCLINICAL",
  sources: [source(ASWB_GUIDEBOOK_URL, "exam_outline", "2026-11-14", "2027-05-14")],
  labs: [
    // ------------------------------------------- Values and Ethics (36%) -- 3
    {
      slug: "aswbc-threat-against-identifiable-person",
      objective: "Respond to a client's threat against an identifiable person under the NASW Code and state law",
      kind: "case",
      title: "A client names the coworker he says he will hurt",
      brief:
        "Dana, a fictional licensed clinical social worker in Washington State, has seen Tomas, a fictional 38-year-old warehouse supervisor, for six sessions for anger and depression after his demotion. Her informed consent form explains the limits of confidentiality, including threats of serious harm to others.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "Tomas arrives agitated. 'Kyle got my job. Everyone would be better off if somebody shut him up for good.' He clenches his fists and will not say more.",
          ask: "What does Dana do first, and why not break confidentiality yet?",
          parts: [
            part(
              "First response",
              "Stays calm and explores the statement directly before acting: asks what he means, whether he intends to harm Kyle, whether he has a plan, means (weapons) and history of violence, while keeping rapport; does not ignore it, and does not call anyone on the vague statement alone.",
              "Explore before acting. A vague, angry remark is not yet a threat of serious harm to an identifiable person, and acting on it alone could break confidentiality without a basis. Dana stays calm and asks directly: 'When you say someone should shut him up for good, are you thinking of hurting Kyle yourself?' Then intent, plan, timing, access to weapons, past violence, substance use, and what stops him. The answers decide what comes next."
            ),
          ],
        },
        {
          text: "Tomas says he keeps a hunting rifle in his truck and 'Kyle leaves the loading dock at six on Fridays. He'll find out what happens.' Today is Thursday.",
          ask: "What must Dana do now, and how much does she disclose?",
          parts: [
            part(
              "The duty and how it is met",
              "Recognizes an actual threat of physical violence against a reasonably identifiable person with means and a time; under Washington law (RCW 71.05.120(3)) the duty is discharged by reasonable efforts to warn the person and to notify law enforcement; NASW 1.07(c) permits disclosure to prevent serious, foreseeable and imminent harm.",
              "Now there is an actual threat of physical violence against a reasonably identifiable victim, with means (the rifle) and a time (Friday at six). Washington's RCW 71.05.120(3) says the duty to warn or protect is discharged by reasonable efforts to communicate the threat to the victim and to law enforcement, so Dana does both today. NASW 1.07(c) allows disclosure when it is necessary to prevent serious, foreseeable and imminent harm."
            ),
            part(
              "Least information, and the client",
              "Discloses only what is needed to prevent the harm (the threat, the target, the means and time), not his history or diagnosis (NASW 1.07(c)); tells Tomas before disclosing when it is safe and feasible (1.07(d)); also works on safety with him -- removing the rifle, a higher level of care if he is a danger -- and consults and documents.",
              "Disclose only what prevents the harm: who made the threat, against whom, the rifle and the Friday timing; nothing about his depression or demotion. If it is safe, tell Tomas first what she must do and why (1.07(d)); it often protects the relationship. Keep treating him: ask him to let someone remove the rifle from his truck, and assess whether he needs a crisis evaluation. Consult her supervisor and document the statement, her assessment, whom she contacted, when and what she said."
            ),
          ],
        },
      ],
    },
    {
      slug: "aswbc-informed-consent-telehealth",
      objective: "Obtain and document informed consent, including with involuntary clients, clients of limited capacity and services by technology",
      kind: "build",
      title: "Write the informed consent for court-ordered video sessions",
      brief:
        "Renee, a fictional 45-year-old, has been ordered by a court to attend 12 counseling sessions after a domestic disturbance. She lives two hours from the clinic and will be seen by video. The court wants attendance reports. Renee is angry about being there and says she does not see why she should sign anything.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write what the social worker covers before services start, and how it is documented.",
          parts: [
            part(
              "Content of consent",
              "Covers in plain language the purpose and nature of services, what the court will and will not receive (attendance and whatever the order requires, only with a signed release), the limits of confidentiality (harm to self or others, abuse reports, court orders), her right to refuse and the consequences of refusing (NASW 1.03(d)), fees, the time frame, and alternatives.",
              "In plain words: what the 12 sessions are for and how they work. What goes to the court: attendance, and anything else only as the order requires and with her signed release, and she can see what is sent. What stays private, and the exceptions: serious risk to herself or others, suspected child or elder abuse, a court order. Her rights: she can refuse services, and the social worker tells her honestly what refusing may mean for the court case (NASW 1.03(d)). Fees, the schedule, and other providers she could choose."
            ),
            part(
              "The video part",
              "Adds technology-specific consent: verifying her identity and location each session, privacy at her end, what happens if the connection drops or she is in crisis (an emergency contact and local resources), recording policy, and assessing whether video suits her (NASW 1.03(e)-(g)).",
              "For video: check who she is and where she is at the start of every session, so help can reach her in an emergency; agree on a private space at her end; agree what happens if the call drops (call her back at a number on file) and her local crisis resources; no recording without consent. Check that she has the device, connection and comfort to use it, and offer an alternative if video does not suit her (NASW 1.03(e)-(g))."
            ),
            part(
              "Documentation and her anger",
              "Acknowledges her anger without arguing, checks understanding in her own words, documents the discussion and signatures (including the release to the court), and treats consent as ongoing.",
              "Name it: 'You didn't choose this, and it makes sense that you're angry.' Go through each point and ask her to say back what it means. Document that consent was discussed, what she understood, what she signed (the consent and a specific release to the court), and that she can ask questions at any time. Revisit consent if anything changes, such as a new request from the court."
            ),
          ],
        },
      ],
    },
    {
      slug: "aswbc-small-town-dual-relationship",
      objective: "Manage boundaries, dual relationships, conflicts of interest and self-disclosure, including power differences and online contact",
      kind: "case",
      title: "One clinician in a small town: a client who is also the mechanic",
      brief:
        "Joe, a fictional clinical social worker, is the only licensed therapist in a rural town of 2,000. Mara, a fictional 52-year-old, starts treatment for grief after her husband's death. She owns the only auto repair shop in town.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "In session three Mara offers to fix Joe's car for free 'since you're helping me so much'. That weekend she sends him a friend request on social media.",
          ask: "How does Joe handle the offer and the friend request?",
          parts: [
            part(
              "The free repair",
              "Declines the free repair: accepting services from a client creates a conflict of interest and a second, business relationship with risk of exploitation (NASW 1.06(a)-(c), 1.13(b)); explains warmly and explores what the offer means to her.",
              "Decline kindly. A free repair would make Mara a provider to Joe as well as his client, a dual relationship with obvious risk (NASW 1.06(c)), and accepting goods or services in place of fees is allowed only in narrow circumstances (1.13(b)). He thanks her, explains that keeping the relationship only about her care protects her, and explores the gratitude behind the offer."
            ),
            part(
              "The friend request",
              "Does not accept (NASW 1.06(e), (h)); raises it in session, explains the policy and checks how she feels.",
              "No: social workers avoid personal relationships with clients on social networking sites (1.06(h)) and avoid technology contact for personal purposes (1.06(e)). Joe raises it at the next session, explains it is a rule he keeps with all clients, and asks how it felt."
            ),
          ],
        },
        {
          text: "Two months later Joe's car breaks down and Mara's shop is the only one within 40 miles.",
          ask: "Can Joe use her shop, and if so how does he manage it?",
          parts: [
            part(
              "An unavoidable overlap",
              "Recognizes this as an unavoidable overlap in a small community, not a prohibited relationship; may use the shop as an ordinary paying customer; talks with Mara beforehand, sets clear boundaries (normal price, no discussion of therapy at the shop), consults and documents (NASW 1.06(c)).",
              "In a town this size some overlap is unavoidable, and the Code asks Joe to protect the client and set clear, culturally sensitive boundaries when it is (1.06(c)). He can be an ordinary customer paying the normal price. He raises it with Mara first, agrees that therapy is not discussed at the shop and that she can say if it feels uncomfortable, consults a colleague, and documents the plan. If it starts to affect her treatment, they revisit it."
            ),
          ],
        },
      ],
    },
    // ------------------------------------------- Assessment and Planning (32%) -- 3
    {
      slug: "aswbc-suicide-risk-assessment",
      objective: "Assess suicide and violence risk in a clinical social work session",
      kind: "case",
      title: "Assess risk after a client says she is 'done'",
      brief:
        "Kim, a fictional 27-year-old graduate student, has been in outpatient treatment for depression for a month. She arrives late and quiet.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "Near the end of the session she says, 'I'm just done. I don't want to do any of this anymore.'",
          ask: "What does the social worker do first?",
          parts: [
            part(
              "Asking directly",
              "Asks directly and calmly about suicidal thoughts (asking does not plant the idea); does not end the session on time and leave it; explores thoughts, plan, intent, means, preparation, past attempts, and protective factors.",
              "Ask directly: 'When you say you're done, are you thinking about killing yourself?' Asking plainly does not put the idea in her head and tells her it is safe to talk. If yes: how often, a plan, method and access to it, intent, any preparation or rehearsal, past attempts, substance use, and what keeps her going. The session runs over if it has to."
            ),
          ],
        },
        {
          text: "Kim says she has thought about taking the pills her doctor prescribed; she has a month's supply at home. She has no date in mind, has never attempted, and says her sister and her dog keep her here.",
          ask: "How does the social worker estimate the risk and plan for safety?",
          parts: [
            selectPart(
              "Risk and protective factors",
              "Selects the risk factors: the stated thoughts with a specific method, access to a month's supply, and depression; does not select the protective factors (no past attempt, her sister, her dog, no date set) as risks.",
              "Risks: suicidal thoughts with a specific method, access to that method at home, and current depression. Protective: no past attempt, no date or preparation, and reasons for living (her sister and her dog). The balance points to an elevated but not imminent risk, which shapes the plan.",
              {
                display: "list",
                lines: ["Thoughts of suicide with a specific method", "A month's supply of pills at home", "Current depression", "No past attempt", "Her sister and her dog", "No date or preparation"],
                correct: [0, 1, 2],
              }
            ),
            part(
              "Safety plan",
              "Builds a collaborative written safety plan: warning signs, her own coping steps, people and places for distraction, people to ask for help (with consent, her sister), professional and crisis contacts including 988, and making the means safer (the sister holds the pills, or a weekly supply); a follow-up within days; consults and documents; a higher level of care if risk rises.",
              "Write it with her: her warning signs; things she can do alone; people and places that help; who she can ask for help, such as her sister, involved with her consent; the clinic's number and 988 (call or text); and means safety -- her sister keeps the bottle and gives her a week's supply, or she asks her prescriber for smaller fills. Schedule contact within a couple of days, consult a supervisor, and document the assessment and plan. If her intent or plan firms up, move to a higher level of care."
            ),
          ],
        },
      ],
    },
    {
      slug: "aswbc-differential-depression-bipolar-substance",
      objective: "Use DSM-5-TR criteria in assessment, including differential diagnosis and medical and substance rule-outs",
      kind: "case",
      title: "Low mood after a high: sort out the differential",
      brief:
        "Luis, a fictional 33-year-old chef, is referred by his doctor for depression: low mood, oversleeping, loss of interest and poor concentration for three weeks.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "In the history he mentions that last spring he 'barely slept for a week, felt like a genius' and spent his savings on a food truck idea. He drinks most nights and used cocaine 'a few times' that spring.",
          ask: "What diagnoses are on the differential, and what do you need to find out?",
          parts: [
            part(
              "The differential",
              "Names a bipolar spectrum disorder (a past manic or hypomanic episode changes the diagnosis and treatment), a major depressive episode, a substance-induced mood disorder (alcohol now, cocaine then), and a medical cause; explains that a past elevated episode must be asked about in any depression.",
              "The current picture looks like a major depressive episode, but the spring sounds like an elevated mood episode, and that would make this a bipolar spectrum disorder, which changes treatment (antidepressants alone can be risky). Cocaine around that time and nightly drinking now raise substance-induced mood disorder. A medical cause (thyroid, other illness, medications) must be ruled out."
            ),
            part(
              "What to find out",
              "Asks how long the elevated period lasted and how severe it was (hospitalization, impairment), whether it happened only while using cocaine, timing of drinking versus mood, family history of bipolar disorder, collateral from someone who knew him then (with consent), and a medical evaluation; uses DSM-5-TR criteria rather than memory.",
              "Pin down the spring: how many days, how much it impaired him, whether anyone worried or he was hospitalized, and whether it happened only while he was using cocaine or also when he wasn't. Map the drinking against the low mood. Ask about family history of bipolar disorder. With his consent, ask someone who saw him then. Refer for a medical work-up. Then check the episodes against the DSM-5-TR criteria, not against memory."
            ),
          ],
        },
        {
          text: "His partner confirms a week of little sleep, nonstop talking and reckless spending with no cocaine use that week; it ended without hospitalization. The doctor finds no medical cause.",
          ask: "What is the working diagnosis, and what does it mean for the plan?",
          parts: [
            part(
              "Working diagnosis and plan",
              "Concludes a bipolar spectrum diagnosis is likely (an elevated episode independent of substances) rather than unipolar depression, leaves the episode type to the DSM-5-TR criteria, and plans a psychiatric referral for medication evaluation, mood monitoring, psychoeducation, an alcohol plan and a safety assessment.",
              "An elevated week not explained by cocaine points to a bipolar spectrum disorder, currently depressed, rather than major depressive disorder; whether the past episode meets mania or hypomania is decided against the DSM-5-TR criteria (here, a week without hospitalization, so the impairment matters). The plan: a psychiatric referral for medication (tell the prescriber about the elevated episode), daily mood and sleep tracking, psychoeducation for him and his partner, addressing the nightly drinking, and a suicide risk assessment now."
            ),
          ],
        },
      ],
    },
    {
      slug: "aswbc-biopsychosocial-summary",
      objective: "Conduct a biopsychosocial assessment that brings together biological, psychological, social, cultural and spiritual factors",
      kind: "build",
      title: "Turn an intake into a biopsychosocial summary",
      brief:
        "Intake notes for Grace, a fictional 68-year-old retired teacher: referred by her primary care doctor after her husband's death eight months ago. Poorly controlled diabetes since, sleeping three to four hours, weight loss. Says she 'can't see the point of cooking for one'. Her son lives abroad; her church was her main community, but she stopped going because 'everyone asks how I'm doing'. First-generation immigrant from the Philippines; says crying in front of others shames her family. Was a respected teacher for 35 years. No alcohol or drugs. Denies thoughts of suicide when asked directly; says her faith forbids it. Drives, manages her own money.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the biopsychosocial summary and the first goals.",
          parts: [
            part(
              "Summary by domain",
              "Organizes the facts by domain: biological (diabetes poorly controlled, sleep, weight loss, age), psychological (grief, possible depression, loss of meaning), social (widowed, son abroad, withdrawal from church), cultural and spiritual (Filipino immigrant, shame about public grief, faith as both support and a reason she stopped attending), with strengths (35-year career, independence, faith, denies suicidal thoughts).",
              "Biological: 68, diabetes poorly controlled since her husband died, sleeping three to four hours, losing weight -- her grief is affecting her health. Psychological: eight months of grief with loss of meaning ('no point cooking for one'); screen for depression. Social: widowed, her only son abroad, withdrawn from her church community. Cultural and spiritual: a Filipino immigrant for whom public tears bring family shame; faith matters and protects her, but church now feels exposing. Strengths: a long, respected career, independence (drives, manages money), faith, and no suicidal thoughts."
            ),
            selectPart(
              "Which facts raise concern",
              "Selects the poorly controlled diabetes with weight loss, the severe sleep loss, and the withdrawal from her main community; does not select her denial of suicidal thoughts, driving or managing money.",
              "The concerns are her health (diabetes out of control and weight loss), her sleep, and the loss of her main support. Her denial of suicidal thoughts, driving and handling money are strengths; keep monitoring mood and risk.",
              {
                display: "list",
                lines: ["Diabetes poorly controlled since the loss, with weight loss", "Sleeping three to four hours a night", "Stopped going to church, her main community", "Denies thoughts of suicide", "Drives and manages her own money"],
                correct: [0, 1, 2],
              }
            ),
            part(
              "First goals with her",
              "Proposes goals set with her and in her terms: coordinate with her doctor on diabetes and nutrition (with consent), sleep, a culturally fitting way back to her faith community (a private meeting with her pastor, a grief group), contact with her son, and a depression screen and follow-up.",
              "With her, and in her words: work with her doctor on the diabetes and on simple meals (with her consent to share information); a sleep routine; a way back to her faith that does not expose her grief in public, such as meeting her pastor privately or a church grief group; regular video calls with her son; a depression screen now and again in a month."
            ),
          ],
        },
      ],
    },
    // ------------------------------------------- Intervention and Practice (32%) -- 3
    {
      slug: "aswbc-match-evidence-based-practice",
      objective: "Choose among evidence-based practices -- CBT, DBT, mindfulness-based approaches, motivational interviewing, EMDR -- for a presenting problem",
      kind: "build",
      title: "Match each client to the evidence-based practice that fits",
      brief:
        "Five fictional clients at a community mental health agency: Ava, 24, repeated self-harm, intense relationships and sudden anger; Ben, 41, nightmares and flashbacks a year after a car crash; Cara, 35, ambivalent about her drinking, sent by her employer; Dev, 50, recurrent depression now in remission, wants to prevent relapse; Eli, 19, panic attacks and avoidance of buses.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Match each client to the approach that fits best, and justify two of your choices.",
          parts: [
            matchPart(
              "Client and approach",
              "Ava: DBT; Ben: EMDR (or another trauma-focused therapy); Cara: motivational interviewing; Dev: mindfulness-based cognitive therapy; Eli: CBT with exposure. All five is met; three or four is partly there.",
              "Ava's self-harm and emotional dysregulation are what DBT was built for. Ben's PTSD symptoms fit a trauma-focused therapy such as EMDR. Cara is ambivalent, so motivational interviewing comes first. Dev wants to prevent relapse of recurrent depression, the target of mindfulness-based cognitive therapy. Eli's panic and avoidance respond to CBT with exposure.",
              {
                leftHeading: "Client",
                rightHeading: "Approach",
                left: ["Ava: self-harm and intense, unstable relationships", "Ben: flashbacks after a crash", "Cara: ambivalent about drinking", "Dev: preventing relapse of depression", "Eli: panic and avoiding buses"],
                right: ["Dialectical behavior therapy", "EMDR", "Motivational interviewing", "Mindfulness-based cognitive therapy", "CBT with exposure", "Psychodynamic therapy"],
                pairs: [0, 1, 2, 3, 4],
              }
            ),
            part(
              "Justification",
              "Justifies at least two matches by the problem each approach targets and the client's readiness, and notes that client preference and culture also shape the choice.",
              "Cara: she has not decided she wants to change, so a skills or abstinence program would meet resistance; motivational interviewing works on her own reasons first. Ava: DBT combines skills for distress tolerance and emotion regulation with a focus on safety, which her self-harm requires. In every case the client's preference, culture and access also count."
            ),
          ],
        },
      ],
    },
    {
      slug: "aswbc-crisis-intervention-eviction",
      objective: "Provide crisis intervention and stabilize a client in acute distress",
      kind: "case",
      title: "A walk-in client in crisis after an eviction notice",
      brief:
        "Paula, a fictional 31-year-old single mother of two, walks into the agency sobbing with an eviction notice for Friday. She cannot stop shaking and says she cannot think.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "She keeps repeating, 'Where will we go? They'll take my kids.'",
          ask: "What does the social worker do in the first minutes?",
          parts: [
            part(
              "Stabilize and assess safety",
              "Uses a crisis model: makes contact and calms (a quiet room, slow voice, grounding), assesses safety (thoughts of suicide or harm, the children's current safety), and defines the immediate problem with her; does not start long-term therapy or a full history.",
              "First, safety and calm: a quiet room, water, a slow voice, a grounding exercise until she can think. Ask about safety directly -- thoughts of harming herself, and where the children are now. Then define the problem together: the notice says Friday, and her fear is losing housing and her children. The history can wait."
            ),
          ],
        },
        {
          text: "She is calmer, denies thoughts of harm; the children are at school. She has a little savings and a sister an hour away.",
          ask: "What plan does the social worker build with her?",
          parts: [
            part(
              "A short, concrete plan",
              "Builds a concrete short-term plan using her strengths: legal aid or tenant rights to check the notice, emergency rental assistance and housing resources, the sister as a backup, written next steps with phone numbers, and a follow-up within a day or two; empowers her to make the calls where she can.",
              "Partialize: today, call legal aid or a tenant rights line to check whether the notice is lawful and how much time she has; apply for emergency rental assistance; ask her sister whether they could stay for a few days if needed. Write the steps and numbers on one page, let her make the calls she can, and schedule a check-in tomorrow. Reassure her accurately: losing housing does not by itself mean losing her children."
            ),
          ],
        },
      ],
    },
    {
      slug: "aswbc-countertransference-in-supervision",
      objective: "Use supervision and consultation well: the supervisee's role, supervision models, and transference and countertransference in supervision",
      kind: "case",
      title: "Bring a strong reaction to supervision",
      brief:
        "Nina, a fictional social worker working toward clinical licensure, sees Ray, a fictional 60-year-old who reminds her of her father, who drank. Ray minimizes his drinking, and Nina finds herself lecturing him and dreading sessions.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "Nina is tempted to transfer Ray to a colleague without telling her supervisor why.",
          ask: "What should Nina do, and what is going on?",
          parts: [
            part(
              "Naming it and using supervision",
              "Identifies countertransference (her reaction to her father shaping her response to Ray); brings it to supervision as part of her role as supervisee (naming learning needs, self-assessment) rather than transferring silently; recognizes that lecturing harms the alliance and his motivation.",
              "This is countertransference: her history with her father's drinking is driving the lecturing and the dread. As a supervisee, her job is to bring it to supervision honestly -- what she notices, what she thinks is behind it, and what she needs. Lecturing a client who minimizes drinking increases resistance, so it already affects his care; quietly transferring him would avoid the learning and could feel like rejection to Ray."
            ),
          ],
        },
        {
          text: "In supervision Nina notices she is getting defensive with her supervisor, who reminds her of a strict former teacher.",
          ask: "How do Nina and her supervisor handle this, and what happens with Ray?",
          parts: [
            part(
              "Parallel process and the plan",
              "Recognizes transference within the supervisory relationship and parallel process; the supervisor names it supportively and keeps supervision focused on the work, not therapy for Nina; agrees a plan: motivational interviewing with Ray, monitoring her reactions, her own therapy if she wants it, and transfer only if her reactions still harm his care.",
              "Nina's defensiveness toward a supervisor who reminds her of a teacher is transference in supervision, and it mirrors what is happening with Ray (parallel process). The supervisor names it kindly and keeps the focus on the work rather than turning supervision into therapy. The plan: Nina shifts to motivational interviewing with Ray, they review her reactions each week, she may seek her own therapy, and transfer is considered only if her reactions keep harming his care."
            ),
          ],
        },
      ],
    },
  ],
};
