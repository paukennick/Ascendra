import { CLINICAL_SAFETY, part, matchPart, orderPart, selectPart, type SeedLabSet } from "./types";
import { source } from "../sources";

// REQ-239: Prep for the NCMHCE, authored labs.
//
// Aligned to NBCC's NCMHCE content outline (revised 2025-10-08, read
// 2026-11-11): six domains at 15 / 25 / 0 / 15 / 30 / 15 percent, as seeded in
// seed/tracks/nbcc.ts. Areas of Clinical Focus carries no item-level weight
// (NBCC assesses it through the cases); the hybrid plan then splits the six
// extra labs evenly, because apportion() treats a course with any zero
// weight as unweighted (scripts/generate-labs-lib.ts), and every unit is
// taught, so 2 / 2 / 2 / 2 / 2 / 2 = 12, one lab per objective.
//
// The NCMHCE is built from case studies told in three sections -- an initial
// intake summary and two counseling sessions -- so most case labs here use
// that shape: step 1 is the intake summary, steps 2 and 3 are later
// sessions, and each asks what an applied item would (NBCC outline,
// "Examination Format" and "Case Studies").
//   https://www.nbcc.org/assets/exam/ncmhce_content_outline.pdf
//
// Mental health course: behind the 18+ mature-content gate
// (lib/mature-content.ts). Frank where the exam tests it, never graphic.
// Every person is fictional; this is exam practice, not clinical, legal or
// ethics advice. Values (the ACA Code of Ethics standards, PTSD's duration,
// 988) are sourced per lab in value-sources.ts, read 2026-11-11. All
// needs_expert_review until a licensed mental health counselor approves them.

export const NCMHCE_LABS: SeedLabSet = {
  trackCode: "NCMHCE",
  sources: [source("https://www.nbcc.org/assets/exam/ncmhce_content_outline.pdf", "exam_outline", "2026-11-11", "2027-04-01")],
  labs: [
    // ------------------------------------------- Professional Practice and Ethics (15%) -- 2
    {
      slug: "ncmhce-competence-and-referral",
      objective: "Assess your competence to work with a client and refer when services would be inadequate or inappropriate",
      kind: "case",
      title: "Case: an eating disorder outside the counselor's training",
      brief:
        "Intake summary. Hana, a fictional 19-year-old college sophomore, comes to a solo private practice for 'stress about grades'. The counselor, licensed two years, has trained in anxiety and depression and has no training or supervised experience in eating disorders. The nearest specialist eating disorder program is 40 minutes away and has a two-week wait.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "Session 1. Hana says she runs twice a day, eats 'one real meal', has lost about 25 pounds this semester, and has fainted once in the shower. Her periods stopped three months ago. She says the grades are the real problem.",
          ask: "What does the counselor recognize, and what is the first concern?",
          parts: [
            part(
              "Recognition and medical risk",
              "Recognizes signs of a possible eating disorder (restriction, compulsive exercise, marked weight loss, missed periods) with medical warning signs (fainting); makes a same-day or urgent medical evaluation the first step, explaining why to Hana; screens for suicide risk and self-harm.",
              "Restriction, exercising twice a day, rapid weight loss and missed periods suggest a possible eating disorder such as anorexia nervosa, and fainting is a medical warning sign. The first step is medical: an urgent evaluation (her physician or campus health today or tomorrow, the emergency department if she faints again or feels faint and weak). Explain plainly that her body needs checking. Also ask about suicidal thoughts and self-harm, which are elevated with eating disorders."
            ),
          ],
        },
        {
          text: "Session 2. The physician has seen her, found a low heart rate, and wants a specialist team. Hana asks the counselor to 'just keep seeing me instead'. The counselor likes Hana and worries she will drop out of care.",
          ask: "Under the ACA Code of Ethics, what should the counselor do about competence and referral?",
          parts: [
            part(
              "Competence and referral",
              "Applies ACA C.2.a (practice within competence) and A.11.a (avoid continuing when lacking competence; know appropriate referral resources and suggest them); refers to the specialist program while preventing abandonment (A.12): continuing supportive contact until the transfer, coordinating with consent (A.11.d), and possibly co-treating under consultation only if the specialist team agrees; documents.",
              "The counselor lacks training in eating disorders, so treating Hana alone would be practicing outside competence (ACA C.2.a). A.11.a says to avoid continuing and to suggest appropriate referral resources: the specialist program. To avoid abandonment (A.12), keep supportive sessions going during the two-week wait, coordinate the transfer with her consent (A.11.d), and stay in touch with her physician. If the team later wants the counselor in a supporting role, that can be arranged with consultation. Wanting to keep her is understandable, but it is the counselor's need, not hers."
            ),
          ],
        },
        {
          text: "Session 3. Hana says she will not go to the program. She is an adult and declines the referral.",
          ask: "What happens now?",
          parts: [
            part(
              "When a client declines",
              "Explores her reasons and ambivalence with motivational interviewing, offers alternatives (another specialist, telehealth, a dietitian plus her physician's monitoring); explains that the counselor cannot be the sole treatment for this, and that if she declines appropriate referrals the counselor discontinues the counseling relationship (A.11.a) with a clear transition plan, crisis resources (988) and an open door; re-assesses medical risk and acts if it becomes urgent.",
              "Explore why: fear of gaining weight, cost, distance, losing control. Offer alternatives (a specialist by telehealth, a dietitian with her physician monitoring vitals). Be honest: under A.11.a, if she declines suitable referrals the counselor discontinues rather than becoming her only care for a condition outside his competence. Do it carefully: a written transition plan, referral options, her physician's involvement, 988 by call or text and emergency services if she feels faint, and an open invitation to return to the referral. If her medical risk becomes urgent, act on it."
            ),
          ],
        },
      ],
    },
    {
      slug: "ncmhce-write-a-dap-note",
      objective: "Create and maintain records appropriate to each stage of counseling, and review existing client records",
      kind: "build",
      title: "Write a progress note in DAP format",
      brief:
        "Session 4 with Luis, a fictional 36-year-old warehouse supervisor diagnosed with major depressive disorder, moderate. He reports sleeping 6 hours instead of 4, went to his nephew's game (his activity goal) and enjoyed 'some of it'. His depression questionnaire score fell from 18 at intake to 13. He denies suicidal thoughts when asked directly. He still calls in sick about once a week. The counselor used behavioral activation, scheduled two more activities with him, and they agreed to discuss a medication evaluation with his doctor because progress at work is slow. Next session in one week.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the DAP note and say what makes it a good record.",
          parts: [
            part(
              "The DAP note",
              "Data: what he reported and what was observed or measured (sleep 6 h, attended the game, score 18 to 13, denies SI when asked directly, misses work about weekly); Assessment: the counselor's clinical interpretation (partial improvement in MDD symptoms, activation working, residual occupational impairment, low current risk with the basis stated); Plan: interventions and next steps (two scheduled activities, medication evaluation discussion with his physician with consent, next session in one week, continued risk monitoring).",
              "D: Client reports sleeping about 6 hours a night (was 4) and attending his nephew's game per activity plan, enjoying 'some of it'. Depression questionnaire 13 (intake 18). Still missing about one workday a week. Asked directly, denies suicidal thoughts. Behavioral activation reviewed; two activities scheduled. A: Partial response to behavioral activation: sleep, mood score and engagement improving; occupational functioning still impaired. No current suicidal ideation; risk assessed as low on the information available. P: Complete the two scheduled activities; with his consent, contact his physician about a medication evaluation; review progress and risk next session in one week."
            ),
            part(
              "What makes it a good record",
              "Explains that the note is timely, accurate, factual and objective, separates reported from observed data, records the risk assessment and the reasoning, ties to the treatment plan goals, is written to be read by the client or another provider, and is stored securely with amendments properly noted (ACA A.1.b, B.6.b).",
              "Timely and accurate (ACA A.1.b asks for sufficient, timely documentation that reflects progress), factual rather than judgmental, clear about what Luis said versus what was measured, and explicit about the risk question asked and the answer. It links to the plan's goals so progress is visible, and could be read by Luis or a covering counselor without confusion. Kept secure (B.6.b), and any later correction marked as an amendment, never overwritten."
            ),
          ],
        },
      ],
    },
    // ------------------------------------------- Intake, Assessment, and Diagnosis (25%) -- 2
    {
      slug: "ncmhce-cultural-formulation",
      objective: "Use the cultural formulation interview to understand the client's own explanation of the problem",
      kind: "build",
      title: "Write cultural formulation questions for an intake",
      brief:
        "Intake summary. Amara, a fictional 45-year-old woman who moved from Nigeria to the United States eight years ago, is referred by her primary care physician for 'depression' after months of headaches, fatigue, poor sleep and 'thinking too much'. She says she came because the doctor insisted and that her pastor has been praying with her. She works night shifts as a home health aide and sends money home.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the questions the counselor asks to understand Amara's view of her problem, and say how the answers shape the plan.",
          parts: [
            part(
              "Cultural formulation questions",
              "Writes open, respectful questions covering how she defines the problem in her own words, what she believes causes it, what makes it better or worse (stressors and supports, including family, church and work), her cultural identity and what matters most to her, how she has coped and sought help before (prayer, pastor, family), and what she hopes counseling can do, including concerns about the counselor's own background.",
              "How would you describe the problem in your own words? What do you think is causing it? What makes it worse, and what helps (family, church, work, money worries)? What parts of your background or faith are most important to you here? What have you done so far to cope, and who has helped (your pastor, family)? What has worked? What kind of help were you hoping for today? Sometimes people worry that a counselor from a different background will not understand them; is there anything that would make this easier for you?"
            ),
            part(
              "How the answers shape the plan",
              "Uses her explanation (for example, 'thinking too much' and physical symptoms) and her supports (faith, pastor) to frame goals and interventions in terms she accepts; considers culture in the diagnosis rather than pathologizing (ACA E.5.b, E.5.c); collaborates on including spiritual supports with consent; addresses practical stressors (night shifts, money).",
              "If Amara sees the problem as 'thinking too much' and her body being tired, start there: sleep, worry and energy are shared goals, and the word 'depression' can come in as she accepts it. Her faith and pastor are strengths to include with her consent. ACA E.5.b asks counselors to consider culture and socioeconomic experience when diagnosing, and E.5.c to guard against historical and social prejudice in pathologizing, so somatic expression of distress is understood in context. Night shifts and financial strain belong in the plan too."
            ),
          ],
        },
      ],
    },
    {
      slug: "ncmhce-level-of-care",
      objective: "Determine the level of care and treatment modality a client needs",
      kind: "case",
      title: "Case: choose the level of care as a client's picture changes",
      brief:
        "Intake summary. Tom, a fictional 50-year-old roofer, is referred by his physician after an emergency department visit for a fall at work; his blood alcohol level was high. He drinks about a fifth of whiskey a day and has had shakes and sweating in the mornings when he goes without. He lives alone, still works, and wants to 'cut back, not quit'.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "At intake the counselor considers where Tom should start.",
          ask: "What level of care fits now, and why?",
          parts: [
            part(
              "Starting level of care",
              "Recognizes withdrawal signs (morning shakes and sweats after daily heavy drinking) as a medical risk, so alcohol withdrawal needs medical assessment and possibly medically managed withdrawal before or alongside counseling; uses a multidimensional assessment such as the ASAM Criteria (withdrawal risk, medical and emotional needs, readiness, recovery environment) to choose the least intensive level that is safe; does not simply tell him to stop drinking at home.",
              "Daily heavy drinking with morning shakes and sweats means withdrawal risk, which can be dangerous; stopping abruptly at home without medical oversight could be unsafe. Coordinate with his physician for a withdrawal assessment and, if needed, medically managed withdrawal. Then choose the setting with a multidimensional assessment (the ASAM Criteria, Fourth Edition, 2023, look across six dimensions of need: withdrawal risk, medical and emotional needs, readiness to change and the recovery environment among them) and the least intensive level that is safe, likely outpatient or intensive outpatient after withdrawal is managed."
            ),
          ],
        },
        {
          text: "Session 1. After a medically supervised withdrawal, Tom attends intensive outpatient treatment three evenings a week plus individual counseling. He is sober three weeks and back at work.",
          ask: "What modality and focus fit him now?",
          parts: [
            part(
              "Modality and focus",
              "Combines individual counseling using motivational interviewing (his goal of cutting back versus the clinical picture) and relapse prevention (triggers, coping, high-risk situations), group work in the program, attention to isolation (lives alone), and coordination with his physician about medication for alcohol use disorder.",
              "Individual counseling with motivational interviewing to work through his 'cut back, not quit' goal honestly; relapse prevention for triggers such as being alone after work; the program's group sessions for support and practice; building sober supports (mutual help groups, a friend or family member). Coordinate with his physician about medications for alcohol use disorder."
            ),
          ],
        },
        {
          text: "Session 2, six weeks later. Tom drank heavily over a weekend after a falling-out with his brother, missed two program nights, and says he feels 'like a failure'. He has no withdrawal signs and denies suicidal thoughts.",
          ask: "How does the counselor respond, and does the level of care change?",
          parts: [
            part(
              "Responding to a lapse",
              "Responds without shame, treating the lapse as information for relapse prevention (what happened, the trigger, what worked before); reassesses risk (withdrawal, suicide, safety at work); keeps or briefly increases the intensity of care rather than discharging him; revises the plan with him; does not treat a lapse as failure of treatment.",
              "Normalize lapses as common in recovery and treat this one as information: what led up to it (the argument), what he did, what he can do differently. Reassess: no withdrawal signs now and no suicidal thoughts, but check safety on the roof if he has been drinking. Keep intensive outpatient, possibly adding sessions for a few weeks, and revise the plan with him (a plan for family conflict, who to call). Discharging him or calling him a failure would make a full relapse more likely."
            ),
          ],
        },
      ],
    },
    // ------------------------------------------- Areas of Clinical Focus (assessed through the cases) -- 2
    {
      slug: "ncmhce-trauma-acute-or-ptsd",
      objective: "Recognize the effects of trauma, child abuse and family or partner violence",
      kind: "case",
      title: "Case: after a car crash, when do symptoms become PTSD?",
      brief:
        "Intake summary. Grace, a fictional 32-year-old teacher, comes to counseling two weeks after a highway crash in which the other driver died. She was physically unhurt. She has nightmares about the crash, avoids driving, startles at horns, and feels 'numb and guilty' that she survived.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "At intake (two weeks after the crash).",
          ask: "What can and cannot be diagnosed yet, and what does the counselor offer now?",
          parts: [
            part(
              "Timing and early support",
              "States that PTSD requires symptoms lasting more than one month, so it cannot be diagnosed at two weeks; considers acute stress disorder (within the first month) or a normal stress response; offers psychoeducation about common reactions, grounding and sleep strategies, social support, and a plan to reassess; screens for suicidal thoughts and substance use; avoids pushing detailed retelling before she is ready.",
              "PTSD needs symptoms for more than one month (VA National Center for PTSD; unchanged in DSM-5-TR), so at two weeks it cannot be diagnosed; acute stress disorder or an expected stress reaction fit the timing. Offer psychoeducation (these reactions are common and often ease), grounding and sleep strategies, encourage contact with supportive people, and agree to reassess in a few weeks. Ask about suicidal thoughts and alcohol or drug use. Let her set the pace on talking about the crash."
            ),
          ],
        },
        {
          text: "Session 1, two months after the crash. Nightmares and startle continue, she has not driven at all, takes two buses to work, and avoids the news. She says 'I should have swerved' and feels distant from her husband.",
          ask: "Does she now meet the PTSD picture? Map her symptoms to the clusters.",
          parts: [
            matchPart(
              "Symptom clusters",
              "Nightmares: intrusion; not driving and avoiding the news: avoidance; 'I should have swerved' and feeling distant: negative alterations in cognition and mood; startle: arousal and reactivity. All four right is met; three is partly there.",
              "Nightmares are intrusion (cluster B). Not driving and avoiding news are avoidance (C). Self-blame and feeling distant from her husband are negative alterations in cognitions and mood (D). Exaggerated startle is arousal and reactivity (E). PTSD needs at least 1 intrusion, 1 avoidance, 2 negative cognition and mood, and 2 arousal symptoms for more than a month; ask about sleep, irritability or concentration to complete cluster E.",
              {
                leftHeading: "Symptom",
                rightHeading: "Cluster",
                left: ["Nightmares about the crash", "Not driving, avoiding the news", "'I should have swerved', feeling distant", "Startling at horns"],
                right: ["Intrusion", "Avoidance", "Negative alterations in cognition and mood", "Arousal and reactivity", "Dissociative subtype"],
                pairs: [0, 1, 2, 3],
              }
            ),
            part(
              "Is the picture complete?",
              "States what is still needed for the diagnosis: a second arousal symptom (sleep, irritability, concentration) and the duration (two months, so more than one month), and that the symptoms cause distress or impairment (driving, her marriage).",
              "Clusters B, C and D are met (nightmares; avoiding driving and news; self-blame and detachment). Cluster E needs two symptoms, so ask about sleep, irritability or concentration besides the startle. Duration is now two months, more than the one month PTSD requires, and the avoidance and distance from her husband show impairment."
            ),
          ],
        },
        {
          text: "Session 2. With two arousal symptoms confirmed (startle and poor sleep), the counselor diagnoses PTSD and discusses treatment.",
          ask: "What treatment does the counselor offer?",
          parts: [
            part(
              "Treatment",
              "Offers a trauma-focused psychotherapy recommended by guidelines (for example cognitive processing therapy, prolonged exposure or EMDR), explained collaboratively; includes graded return to driving as exposure; works on self-blame with cognitive work; involves her husband with consent; refers for a medication consultation if she wants it; refers on if the counselor is not trained in the chosen therapy.",
              "Offer a trauma-focused psychotherapy (cognitive processing therapy to work on 'I should have swerved', prolonged exposure including a graded return to driving, or EMDR), explaining each and letting her choose. Invite her husband to a session with her consent. Offer a medication consultation. If the counselor is not trained in the chosen therapy, refer to someone who is."
            ),
          ],
        },
      ],
    },
    {
      slug: "ncmhce-first-episode-psychosis",
      objective: "Recognize hallucinations, problems of focus, intellectual disability and emotional dysregulation, and when to refer",
      kind: "case",
      title: "Case: a student begins hearing voices",
      brief:
        "Intake summary. Malik, a fictional 20-year-old community college student, is brought by his mother. Over three months his grades fell, he stopped seeing friends, and he stays up all night. She found notes on his wall about 'the signals'. He uses cannabis most weekends.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "Session 1. Malik says the radio sends him messages and a voice comments on what he does. He is guarded but answers. He denies wanting to hurt himself or anyone, but says the voice sometimes tells him 'you deserve to be hurt'.",
          ask: "What does the counselor recognize, and what are the priorities?",
          parts: [
            part(
              "Recognition and priorities",
              "Recognizes possible psychotic symptoms (hallucinations, ideas of reference, functional decline) in a young adult, a possible first episode of psychosis; prioritizes safety (command-type voices about harm: assess risk to self and others, means, supervision); arranges an urgent psychiatric and medical evaluation (rule out substance-induced and medical causes, consider specialized early-intervention services); stays calm and non-confrontational about the beliefs.",
              "A voice commenting on him, messages from the radio and a three-month decline in a 20-year-old suggest a possible first episode of psychosis. Safety first: the voice saying he deserves to be hurt needs careful questions about urges to act, past self-harm, means at home and how often it happens. Arrange an urgent psychiatric and medical evaluation to rule out substance-induced psychosis (cannabis) and medical causes, and ask about early-intervention programs for first-episode psychosis, where early treatment helps. Do not argue with the beliefs; acknowledge how frightening they are."
            ),
          ],
        },
        {
          text: "Session 2. Malik has started medication from a psychiatrist and returns for counseling with his mother. He hates the side effects and says he will stop. His mother asks how she can help.",
          ask: "What does counseling add now?",
          parts: [
            part(
              "Counseling's role",
              "Supports engagement and adherence with motivational interviewing (explores side effects and coordinates with the psychiatrist rather than advising on medication), offers family psychoeducation and support for his mother (warning signs, communication, reducing criticism), addresses cannabis use, supports school and social goals, and agrees a crisis plan with 988 and emergency contacts.",
              "Explore his concerns about side effects and encourage him to raise them with his psychiatrist (with consent, the counselor can share them too) rather than stopping on his own. Offer his mother psychoeducation on psychosis, early warning signs and calm, low-criticism communication. Work with Malik on cannabis use, sleep, and return to classes. Write a crisis plan together: warning signs, who to call, 988 by call or text, and emergency services if he is in danger."
            ),
          ],
        },
      ],
    },
    // ------------------------------------------- Treatment Planning (15%) -- 2
    {
      slug: "ncmhce-revise-the-plan",
      objective: "Review progress with the client and revise the treatment plan using assessment results",
      kind: "case",
      title: "Case: revise a treatment plan when the scores stall",
      brief:
        "Intake summary. Nadia, a fictional 28-year-old graphic designer, has generalized anxiety disorder. Her plan: weekly CBT for 12 weeks, goals to cut daily worry time from 3 hours to under 1 and to return to her climbing gym twice a week. Her anxiety questionnaire score was 16 at intake.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "Session 1 (week 6). Her score is 15. She has done about a third of the homework, says the worry log 'makes it worse', and has not been to the gym. She mentions her mother was diagnosed with breast cancer in week 2.",
          ask: "What does the counselor make of the lack of progress, and how is the plan revised?",
          parts: [
            part(
              "Reviewing progress",
              "Notes that the measure shows little change (16 to 15) and engages Nadia in reviewing it together (ACA A.1.c); explores barriers (the mother's diagnosis as a new stressor, the worry log feeling aversive, low homework completion) and strengths; considers whether the diagnosis or formulation needs revisiting (adjustment to the mother's illness, depression).",
              "A drop of one point in six weeks is essentially no change, so review it openly with her. Look at barriers: her mother's cancer diagnosis is a major new stressor, the worry log feels aversive, and homework is low. Ask about her mood (has depression developed?) and what has helped at all. ACA A.1.c asks counselor and client to review and revise plans regularly for their viability and effectiveness."
            ),
            part(
              "Revising the plan",
              "Revises collaboratively: adds goals or sessions for coping with her mother's illness, adapts the method (a shorter worry-time practice instead of the full log, more in-session practice), adjusts the gym goal to a smaller step, sets a new review point with the same measure, and considers a referral for a medication evaluation or additional support.",
              "Add her mother's illness to the plan (time in session for it, support resources). Change the method: a 15-minute scheduled worry period instead of logging all day, and practice skills in session. Shrink the gym goal to one visit a week with a friend. Repeat the questionnaire at week 9. If there is still little change, discuss a medication evaluation or a different approach."
            ),
          ],
        },
        {
          text: "Session 2 (week 9). Her score is 10, she climbed twice, and she wants to stop at week 12 'to save money'.",
          ask: "What does the counselor plan for the remaining weeks?",
          parts: [
            orderPart(
              "Order the remaining steps",
              "The order: review gains with the measure, consolidate skills, write a maintenance and relapse-prevention plan, agree a follow-up check, then end. All in order is met; one swap is partly there.",
              "Review progress against the measure first (16 to 10), then consolidate the skills that helped, then write the maintenance plan (warning signs, what to do, who to call), agree a follow-up booster session, and then end at week 12 as she chose.",
              [
                "Review progress together with the repeated measure",
                "Consolidate the skills that worked",
                "Write a maintenance and relapse-prevention plan",
                "Agree a follow-up booster session",
                "End counseling at week 12",
              ]
            ),
            part(
              "Why end as planned",
              "Explains that ending at week 12 respects her choice and that the improvement (16 to 10, back to climbing) supports it, while the maintenance plan and booster session protect the gains; notes she can return.",
              "The measure has fallen from 16 to 10 and she is climbing again, so her goals are largely met and ending when she chose respects her autonomy (and her budget). The maintenance plan and a booster session protect the gains, and she knows she can come back if worry builds again, for example as her mother's treatment goes on."
            ),
          ],
        },
      ],
    },
    {
      slug: "ncmhce-termination-and-follow-up",
      objective: "Plan termination, transitions and follow-up, and help the client maintain progress",
      kind: "case",
      title: "Case: end counseling well when a client wants to stay",
      brief:
        "Intake summary. Ruth, a fictional 67-year-old retired librarian, began counseling a year ago for depression after retiring and her husband's stroke. Her goals have been met: her depression score has been in the minimal range for four months, she volunteers twice a week and has joined a caregivers' group.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "Session 1. The counselor raises ending. Ruth says 'You're the only one I can really talk to. Can't we just keep going?'",
          ask: "Should counseling end, and how does the counselor raise it?",
          parts: [
            part(
              "Whether and how to end",
              "Recognizes that termination is appropriate when the client no longer needs assistance or is not likely to benefit (ACA A.11.c); explores Ruth's feelings about ending (loss, dependence, her other relationships), names the progress she made, plans a gradual taper rather than an abrupt stop, and keeps the decision collaborative.",
              "Her goals have been met for months, so termination is appropriate (ACA A.11.c: when it is reasonably apparent the client no longer needs assistance). Ending is a loss for Ruth and touches her other losses, so explore it openly: what it means, who else she can talk to. Name what she achieved. Propose tapering (every two weeks, then monthly) so she can practice on her own with support."
            ),
          ],
        },
        {
          text: "Session 2 (the last session). The counselor and Ruth plan for after counseling.",
          ask: "What goes into the termination and follow-up plan?",
          parts: [
            selectPart(
              "In the plan",
              "Selects a review of gains, early warning signs and what to do, her supports (caregivers' group, volunteering, friends), how to return if needed, a follow-up check, and crisis contacts. Promising to stay in touch as friends is not part of it (a nonprofessional relationship after termination).",
              "A good ending reviews what changed, names her personal warning signs (withdrawing, sleeping badly), lists supports and what she will do, explains how to come back, schedules a follow-up check, and includes crisis contacts (988 by call or text). Becoming friends after termination is a nonprofessional relationship ACA A.6.e asks counselors to avoid when potentially harmful.",
              {
                display: "list",
                lines: [
                  "A review of what changed and what helped",
                  "Her early warning signs and what she will do",
                  "Her supports: the caregivers' group, volunteering, friends",
                  "How to return to counseling if she needs it",
                  "A promise to meet for coffee as friends",
                  "A follow-up check in a few months, and crisis contacts (988)",
                ],
                correct: [0, 1, 2, 3, 5],
              }
            ),
            part(
              "Her warning signs, in her words",
              "Writes two or three early warning signs specific to Ruth (for example withdrawing from volunteering, sleeping badly, losing interest in her husband's care group) and what she will do for each.",
              "If she stops going to volunteering, or finds herself sleeping badly for a week, she calls her friend from the caregivers' group and books a check-in; if she feels hopeless or has thoughts of not wanting to live, she calls the practice or 988. If caring for her husband becomes too much, she asks the group about respite care."
            ),
          ],
        },
      ],
    },
    // ------------------------------------------- Counseling Skills and Interventions (30%) -- 2
    {
      slug: "ncmhce-crisis-intervention",
      objective: "Provide crisis intervention and contain intense feelings",
      kind: "case",
      title: "Case: a client arrives in crisis after a sudden loss",
      brief:
        "Intake summary. Kevin, a fictional 41-year-old bus driver, has seen the counselor for six sessions for work stress. He arrives without an appointment, shaking and sobbing: his teenage son was arrested last night and his wife has left with their younger child.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "Session 1 (the unscheduled visit). Kevin is pacing, talking fast, and says 'I can't do this, I can't do this'.",
          ask: "Order the counselor's first moves in this crisis.",
          parts: [
            orderPart(
              "Crisis intervention steps",
              "The order: ensure immediate safety and calm, assess risk to self and others, listen and help him tell what happened, identify supports and immediate needs, agree concrete next steps and follow-up. All in order is met; one swap is partly there.",
              "Safety and calm come first (a quiet room, a slow voice, grounding). Then assess risk: 'I can't do this' needs a direct question about suicidal thoughts and about harm to others. Then let him tell the story and reflect it. Then find supports and what he needs today (who can be with him, the son's lawyer, work). Finally agree concrete steps and when the counselor will see him again.",
              [
                "Make the setting safe and help him calm his breathing",
                "Ask directly about thoughts of suicide or harming anyone",
                "Help him tell what happened and reflect his feelings",
                "Identify who can support him and what he needs today",
                "Agree concrete next steps and a follow-up time",
              ]
            ),
            part(
              "What you say first",
              "Writes a calm opening that names what the counselor sees, offers safety and slows things down (for example sitting with him, a breathing or grounding prompt), without problem-solving yet.",
              "'Kevin, I'm glad you came here. You're safe in this room. Let's sit down together and slow your breathing for a moment, in through your nose, and out slowly. Then tell me what happened, at whatever pace you can.'"
            ),
          ],
        },
        {
          text: "Session 1, later in the visit. Kevin denies suicidal thoughts or thoughts of harming anyone, has no weapons at home, and his brother can stay with him tonight. He is calmer.",
          ask: "What does the counselor do before he leaves, and over the next week?",
          parts: [
            part(
              "Before he leaves and after",
              "Helps him make a short coping plan for tonight (his brother, sleep, not driving if too distressed, no alcohol), gives crisis contacts including 988 by call or text, schedules a session within a few days, addresses work (taking leave if he cannot drive safely), and returns to the treatment plan once the crisis passes, revising it for the family situation.",
              "A plan for tonight: his brother stays, he eats and tries to sleep, avoids alcohol, and does not drive a bus while this distressed (call in to work). Crisis contacts: the clinic, 988 by call or text, and 911 in an emergency. See him again within two or three days. Once he is stable, revise the treatment plan for the family crisis (his relationship, his son, possible family counseling)."
            ),
          ],
        },
      ],
    },
    {
      slug: "ncmhce-family-triangulation",
      objective: "Assess and change family and systemic patterns, including family of origin and support networks",
      kind: "case",
      title: "Case: a teenager's behavior and a triangle in the family",
      brief:
        "Intake summary. The Okafor-Lindgren family, fictional, come for help with Elias, 14, who has been skipping school and arguing at home. His parents, married 17 years, rarely speak to each other except about him. His mother sides with him; his father is strict. Elias's older sister has left for college.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "Session 1 (family). Whenever the parents start to disagree, Elias makes a joke or storms out and both parents turn to him.",
          ask: "What systemic pattern does the counselor see?",
          parts: [
            part(
              "The pattern",
              "Identifies triangulation (Bowen) or a cross-generational coalition (structural family therapy): Elias's behavior detours the parents' conflict onto him and stabilizes the system; notes the mother-son alliance against the father, blurred boundaries between the parental and child subsystems, and the family life-cycle transition (the sister leaving).",
              "Triangulation: tension between the parents is routed through Elias. When they begin to disagree, his outburst draws them both to him, which relieves their conflict and keeps it from being worked on. Structurally, the mother and son form a coalition against the father, and the boundary around the parental subsystem is weak. The sister's departure is a life-cycle change that may have tightened the triangle."
            ),
          ],
        },
        {
          text: "Session 2. The counselor plans interventions for the coming sessions.",
          ask: "Choose interventions to change the pattern.",
          parts: [
            part(
              "Interventions",
              "Proposes structural or Bowenian interventions: strengthen the parental subsystem (sessions with the parents alone, agreeing consistent rules together), block the detour in session (keep the parents talking when Elias interrupts), enactment of a parental discussion, reframe Elias's behavior as connected to family stress, a genogram to explore family-of-origin patterns, and individual support for Elias's school attendance.",
              "Meet the parents alone to strengthen their partnership as parents and agree on consistent rules (a firmer parental boundary). In family sessions, use enactment: have the parents discuss a disagreement while the counselor blocks Elias being pulled in. Reframe his behavior as tied to the family's stress rather than 'bad kid'. A genogram can show similar triangles in the parents' families of origin. Coordinate with his school on attendance."
            ),
          ],
        },
      ],
    },
    // ------------------------------------------- Core Counseling Attributes (15%) -- 2
    {
      slug: "ncmhce-cultural-humility",
      objective: "Demonstrate cultural humility and sensitivity to gender, sexual orientation and diversity",
      kind: "case",
      title: "Case: respond with cultural humility to a client's identity",
      brief:
        "Intake summary. Sam, a fictional 23-year-old who uses they/them pronouns, seeks counseling for low mood after moving to a small town for work. The intake form lists their legal name; they ask to be called Sam.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "Session 1. The counselor calls them by the legal name twice from the form, then apologizes. Sam goes quiet and says 'It's fine, everyone does it'.",
          ask: "How does the counselor repair this?",
          parts: [
            part(
              "Repair",
              "Takes responsibility briefly and sincerely without making Sam comfort the counselor, uses Sam's name and pronouns from then on, invites Sam to say how it felt, and updates the record to show the name and pronouns Sam uses; recognizes the rupture as part of a pattern Sam faces.",
              "A short, sincere repair: 'I used the wrong name. I'm sorry; I'll use Sam and they/them.' Do not over-apologize so that Sam has to reassure the counselor. Invite them to say more ('You said everyone does it. What's that been like here?'), and update the record to show their name and pronouns. The moment is also information about what Sam lives with daily."
            ),
          ],
        },
        {
          text: "Session 2. Sam says they have been called names at work and have no friends in town. The counselor, who has little experience with transgender and nonbinary clients, reflects on how to proceed.",
          ask: "Which responses show cultural humility and competence?",
          parts: [
            selectPart(
              "Responses",
              "Selects exploring minority stress and discrimination as part of the problem, seeking consultation and training, connecting Sam with affirming community resources, and asking Sam to teach the counselor about their identity only where it helps Sam (not as the main source of training). Assuming the move is the whole problem, and referring Sam out solely because of the counselor's discomfort, are not.",
              "Discrimination at work and isolation are part of the clinical picture (minority stress), not side issues. The counselor seeks consultation and training rather than relying on Sam to educate them, connects Sam with affirming community and online resources, and keeps learning. Referring out only because of personal discomfort or values is contrary to ACA A.11.b; assuming the move alone explains the low mood would miss the discrimination.",
              {
                display: "list",
                lines: [
                  "Explore discrimination at work as part of the low mood",
                  "Seek consultation and training on working with nonbinary clients",
                  "Connect Sam with affirming community resources",
                  "Assume the move to a new town explains the low mood",
                  "Refer Sam out because the counselor feels unsure",
                ],
                correct: [0, 1, 2],
              }
            ),
            part(
              "What you say to Sam",
              "Writes a response that validates the discrimination as real and part of the low mood, invites Sam to say more, and offers to look at support together, without making Sam educate the counselor.",
              "'Being called names at work and having no one in town to turn to sounds exhausting and lonely, and it makes sense that your mood has dropped. I want to understand what that's been like, and I'd also like us to find some people and places where you can be yourself. I'll do my own homework too, so you don't have to teach me.'"
            ),
          ],
        },
      ],
    },
    {
      slug: "ncmhce-alliance-rupture",
      objective: "Tolerate conflict in the counseling relationship and work it through",
      kind: "case",
      title: "Case: a client confronts the counselor",
      brief:
        "Intake summary. Diane, a fictional 39-year-old paralegal with chronic depression, has had three earlier counselors and says 'none of them got it'. Her goals are to improve her mood and her relationship with her teenage daughter.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "Session 1 (session 8 of counseling). Diane says angrily: 'You keep giving me homework like I'm a child. I'm wondering why I bother coming.'",
          ask: "What is happening, and how does the counselor respond in the moment?",
          parts: [
            part(
              "Responding to the rupture",
              "Recognizes an alliance rupture (a confrontation rupture about the tasks of therapy); responds nondefensively with curiosity and empathy, invites her to say more, acknowledges the counselor's part, and explores here-and-now feelings rather than justifying the homework or ignoring it; notices any personal reaction (feeling criticized) and keeps it from driving the response.",
              "This is a rupture in the alliance about the tasks of counseling. Respond openly: 'I'm glad you said that. Tell me more about how the homework has felt.' Acknowledge the counselor's part ('I may have pushed it without checking whether it fit you'). Stay with the here and now. Notice any defensiveness in yourself and set it aside: justifying the homework would repeat what she has felt with earlier counselors."
            ),
          ],
        },
        {
          text: "Session 2. Diane says that talking about it 'actually helped' and that she felt heard for the first time in counseling.",
          ask: "How does the counselor use this, and what changes going forward?",
          parts: [
            part(
              "Repair and what changes",
              "Explores what made the difference, links it (with care) to her pattern in relationships, including with her daughter; renegotiates goals and tasks collaboratively (choosing whether and how to use between-session practice); continues regular alliance check-ins; uses supervision if the counselor's reactions were strong.",
              "Ask what felt different this time, and gently connect it to her experience elsewhere: when she speaks up and is heard, things can change, perhaps with her daughter too. Renegotiate the tasks together: she chooses whether to use between-session practice, in a form that suits her. Check the alliance regularly (a quick question at the end of sessions). If the confrontation stirred strong feelings in the counselor, take them to supervision."
            ),
          ],
        },
      ],
    },
  ],
};
