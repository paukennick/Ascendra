import { CLINICAL_SAFETY, part, matchPart, selectPart, type SeedLabSet } from "./types";
import { source } from "../sources";

// REQ-239: Prep for the NCE, authored labs.
//
// Aligned to NBCC's NCE content outline (2023 PDF, read 2026-11-11): six
// domains at 12 / 12 / 29 / 9 / 30 / 8 percent, as seeded in
// seed/tracks/nbcc.ts. NBCC's new blueprint takes effect 2027-07-01 (see the
// track's header); these labs serve the current outline.
//   https://www.nbcc.org/assets/exam/nce_content_outline.pdf
// Density (docs/labs.md, policy "hybrid"): 2 / 2 / 3 / 1 / 3 / 1 = 12, one
// lab per objective. The NCE is knowledge-level multiple choice; the labs
// make the learner DO what its applied items assume: write an informed
// consent and a mental status exam, separate grief from depression and panic
// from a medical cause, screen safely for partner violence, write measurable
// goals, hear change talk, read a group's stage, work a thought record, and
// notice one's own values at work.
//
// Mental health course: behind the 18+ mature-content gate
// (lib/mature-content.ts). Frank where the exam tests it (abuse, partner
// violence, suicide), never graphic. Every person is fictional; this is exam
// practice, not clinical, legal or ethics advice. Values (the ACA Code of
// Ethics standards, the PTSD duration, 988) are sourced per lab in
// value-sources.ts, read 2026-11-11. Labs that quote no value say why. All
// needs_expert_review until a licensed professional counselor approves them
// (docs/labs.md).

export const NCE_LABS: SeedLabSet = {
  trackCode: "NCE",
  sources: [source("https://www.nbcc.org/assets/exam/nce_content_outline.pdf", "exam_outline", "2026-11-11", "2027-04-01")],
  labs: [
    // ------------------------------------------- Professional Practice and Ethics (12%) -- 2
    {
      slug: "nce-informed-consent-first-session",
      objective: "Obtain informed consent: the counseling process, risks and benefits, rights and responsibilities, and the client's capacity to consent",
      kind: "build",
      title: "Write the informed consent conversation for a first session",
      brief:
        "Priya, a fictional 29-year-old software tester, books counseling at a group practice for anxiety after a promotion. The practice offers in-person and video sessions, bills her insurance, keeps electronic records, and has a policy of not connecting with clients on social media. She mentions on the phone that she may want her partner to join some sessions later. Write what the counselor covers with her in the first session before counseling begins.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the consent conversation and say how it is documented and revisited.",
          parts: [
            part(
              "What the counselor covers",
              "Covers, in plain language: the counseling process and the counselor's approach, credentials and supervision if any; likely benefits and risks (feeling worse before better, effects on relationships); her rights (to refuse or end counseling, to ask questions, to see records) and responsibilities (attendance, fees, cancellation); fees, insurance and that a diagnosis is shared with the insurer; the limits of confidentiality (serious and foreseeable harm, legal requirements, abuse reporting); electronic records and video sessions, their risks and safeguards; the no-social-media policy; and what changes if her partner joins (a role change needing new consent).",
              "In plain words: how counseling works here, the counselor's training and approach, and how long it may take; what it may bring and what it may cost emotionally. Her rights: she can ask anything, decline any technique, see her record, and stop at any time. Her part: attendance, the cancellation policy and fees, including that the insurer receives a diagnosis and dates of service. Confidentiality and its limits: kept private unless she or someone else faces serious and foreseeable harm, the law requires disclosure (for example, suspected child abuse or a court order), or she gives written permission. Electronic records and video sessions: how they are protected, what can still go wrong, and what to do if a video call drops in a crisis. Social media: the practice does not connect with clients online, so the relationship stays professional. And if her partner joins later, the focus and confidentiality rules change, so they will agree that in advance."
            ),
            part(
              "Documenting and revisiting it",
              "States that consent is reviewed in writing and verbally, documented in the record, checked for her understanding and capacity, and revisited as an ongoing process, especially at a change such as adding couple sessions (ACA A.2.a, A.6.d).",
              "Give her the written disclosure, talk it through, check understanding in her own words, and note in the record that consent was discussed and signed. Consent is ongoing (ACA A.2.a): revisit it when the plan changes. Moving from individual to couple sessions is a role change (A.6.d) that needs fresh consent from both, including what happens to what she said alone."
            ),
          ],
        },
      ],
    },
    {
      slug: "nce-boundary-gift-and-social-media",
      objective: "Clarify roles, agency policies, fees and insurance, and the uses and limits of social media at the start of counseling",
      kind: "case",
      title: "Handle a gift, a friend request and a fee question in one week",
      brief:
        "Marcus, a fictional counselor at a community agency, has seen Jae-won, a fictional 34-year-old restaurant cook, for eight sessions for depression after his divorce. The agency's written policies say clients are not added on personal social media, gifts over a token value are declined, and sliding-scale fees are reviewed every six months.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "At the end of a session Jae-won hands Marcus a homemade kimchi jar 'for helping me get out of bed again'. That evening Marcus finds a friend request from him on his personal social media account.",
          ask: "What does Marcus do about the gift and about the friend request, and why?",
          parts: [
            part(
              "The gift",
              "Weighs the gift under ACA A.10.f -- the therapeutic relationship, the small monetary value, the client's motivation (gratitude, possibly cultural), and Marcus's own motivation -- and the agency's token-value policy; concludes that accepting a small homemade gift graciously is reasonable here, and explores its meaning briefly; notes it would document the decision.",
              "A small homemade jar of kimchi is a token of gratitude, and in many cultures refusing it would hurt. ACA A.10.f asks the counselor to weigh the relationship, the gift's value, the client's motivation and his own. Here the value is small, the motive is thanks, and it is within the agency's policy, so Marcus can accept it warmly, briefly acknowledge what it marks (Jae-won's progress) and note it in the record."
            ),
            part(
              "The friend request",
              "Does not accept: a personal virtual relationship with a current client is prohibited (ACA A.5.e); raises it kindly at the next session, explaining the policy and the reason (keeping the relationship professional and confidential), and checks how Jae-won feels about it; separates professional and personal online presence (H.6.a).",
              "Decline, and talk about it in session rather than simply ignoring it. ACA A.5.e prohibits a personal virtual relationship with a current client. Explain that it is not personal rejection: the policy protects his privacy and keeps the relationship one where his needs come first. Ask how it felt to send it. Marcus should check that his personal profile is private and separate from any professional presence (H.6.a)."
            ),
          ],
        },
        {
          text: "At the next session Jae-won says he has lost a shift and asks whether he can pay later, or instead cater the agency's staff party in place of fees.",
          ask: "How does Marcus respond to the fee question and the offer to barter?",
          parts: [
            part(
              "Fees and barter",
              "Uses the agency's sliding-scale review now rather than waiting six months, explains the options clearly, and declines the catering barter or treats it with great caution: ACA A.10.e allows bartering only if the client requests it, it causes no exploitation or harm, it is accepted practice in the community, and it is put in a clear written contract; catering for the agency's staff also creates a second relationship with the counselor's workplace.",
              "First the practical answer: the sliding scale can be reviewed today when income changes, and a short payment plan may be possible under agency policy. On barter: ACA A.10.e allows it only when the client requests it, there is no exploitation or harm, it is accepted practice among local professionals, and the agreement is in a clear written contract. Catering the staff party would also make Jae-won a vendor to Marcus's workplace, a second relationship that could complicate counseling. A fee adjustment meets his need without that risk."
            ),
          ],
        },
      ],
    },
    // ------------------------------------------- Intake, Assessment, and Diagnosis (12%) -- 2
    {
      slug: "nce-mental-status-exam-write-up",
      objective: "Perform and record a mental status examination from formal and informal observation",
      kind: "build",
      title: "Write a mental status exam from an intake observation",
      brief:
        "A fictional intake note: Robert, 52, arrives 20 minutes late in a stained work jacket, unshaven. He sits slumped, makes little eye contact and moves slowly. His speech is quiet, slow, with long pauses before answers. He says his mood is 'nothing, just flat'; his face shows little change and he does not smile when the counselor jokes lightly. His answers are logical and on topic. He says he has 'no point anymore' but denies a plan when asked; he hears no voices and sees nothing others don't. He knows the date, place and why he is here, recalls three words after five minutes, and loses track twice when asked to count backward by sevens. He says he 'might be depressed, maybe it's just age'.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the mental status exam, domain by domain, and say what needs follow-up.",
          parts: [
            part(
              "The mental status exam",
              "Records, in observable terms and separating what was observed from what he reported: appearance (unkempt, stained clothing, unshaven); behavior (slumped, poor eye contact, psychomotor slowing); speech (soft, slow, increased latency); mood in his words ('flat') and affect as observed (restricted or blunted, congruent); thought process (linear, goal-directed); thought content (hopelessness, passive death-related statement 'no point anymore', denies plan; no delusions noted); perception (denies hallucinations); cognition (oriented to time, place, purpose; recall 3/3; attention reduced on serial sevens); insight (partial) and judgment (fair).",
              "Appearance: disheveled, stained work jacket, unshaven, arrived 20 minutes late. Behavior: slumped posture, little eye contact, psychomotor slowing. Speech: quiet, slow, long latencies. Mood (reported): 'nothing, just flat'. Affect (observed): restricted, little range, did not respond to light humor, congruent with mood. Thought process: linear and goal-directed. Thought content: hopelessness ('no point anymore'); denies a plan when asked; no delusional content elicited. Perception: denies auditory and visual hallucinations. Cognition: oriented to date, place and purpose; recall 3 of 3 at five minutes; attention reduced (lost track twice on serial sevens). Insight: partial ('might be depressed, maybe it's just age'). Judgment: fair (attended the intake)."
            ),
            part(
              "Follow-up the exam calls for",
              "Names a full suicide risk assessment because of the hopeless, death-related statement (ideation, method, intent, plan, past behavior, means); a medical referral to rule out physical causes of slowing and poor attention (thyroid, medications, other conditions) given his age; a depression screen and history; and a recheck of attention once mood improves.",
              "'No point anymore' needs a direct, full suicide inquiry today, not only the plan question: thoughts, method, intent, preparation, past attempts and access to means. Slowing and reduced attention at 52 have medical causes to rule out, so a primary care visit with labs. A structured depression screen and history of past episodes, sleep, appetite and alcohol use complete the picture. Recheck attention later: depression can lower it, and if it does not improve it needs its own assessment."
            ),
          ],
        },
      ],
    },
    {
      slug: "nce-differential-panic-or-medical",
      objective: "Make a differential diagnosis with DSM-5-TR, including co-occurring disorders and medical rule-outs",
      kind: "case",
      title: "Sort out sudden attacks of fear: panic, a medical cause, or a substance",
      brief:
        "Lena, a fictional 41-year-old accountant, comes to counseling after three episodes in a month of sudden pounding heart, sweating, shaking, chest tightness and a feeling she was dying. Each peaked within minutes. An emergency department visit after the first found nothing wrong with her heart.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "At intake she says the attacks 'come out of nowhere', and now she avoids driving on the highway in case one happens. She drinks four or five cups of coffee a day during tax season and recently started a thyroid medication.",
          ask: "What are the possible explanations, and what do you ask or arrange before settling on one?",
          parts: [
            part(
              "Differential",
              "Considers panic disorder (recurrent unexpected attacks with at least a month of worry or behavior change such as avoidance), agoraphobia if avoidance spreads, and rules out substance- or medication-induced anxiety (caffeine, thyroid medication) and anxiety due to a medical condition (thyroid, cardiac), plus other anxiety or mood disorders; states that a DSM-5-TR diagnosis requires that the attacks are not better explained by a substance or medical condition.",
              "Panic disorder fits the pattern: unexpected attacks peaking within minutes, followed by worry and avoidance (the highway). But DSM-5-TR requires that the attacks not be attributable to a substance or another medical condition. Heavy caffeine and a new thyroid medication (too high a dose can mimic panic) are both live explanations, so are thyroid or heart conditions. Also ask about other fears, depression and alcohol use, which often co-occur."
            ),
            part(
              "What to ask or arrange",
              "Asks about the timing of the medication and the attacks, caffeine and other substances, cued versus uncued attacks, the duration of worry and avoidance, and family history; with consent, coordinates with her prescriber to check the thyroid dose and levels; documents a provisional impression rather than a final diagnosis.",
              "Map the attacks against when she started the thyroid medication and her caffeine intake. Ask whether any attack came with a clear trigger, how long she has worried about the next one, and what else she now avoids. With her consent, contact the prescriber to review the thyroid dose and labs. Record a provisional impression and the rule-outs in progress."
            ),
          ],
        },
        {
          text: "Her prescriber finds her thyroid levels in range on a stable dose that predates the attacks by a year. She cuts to one coffee a day; two weeks later she has another attack at the supermarket and has stopped going there alone.",
          ask: "Reach a diagnostic impression and say what you would offer.",
          parts: [
            part(
              "Impression and plan",
              "Concludes panic disorder is now the best fit (the medical and caffeine explanations have been checked, unexpected attacks continue with avoidance spreading), watches for agoraphobia; offers cognitive-behavioral therapy with psychoeducation about the panic cycle, interoceptive and in vivo exposure, and cognitive restructuring of catastrophic misinterpretations, with progress measured.",
              "With the thyroid stable and caffeine reduced, the attacks continue unexpectedly and avoidance is spreading (supermarket, highway): panic disorder, watching whether agoraphobia develops. Offer CBT for panic: explain the cycle of body sensations and catastrophic thoughts ('I'm dying'), practice bringing on the sensations safely (interoceptive exposure), then return to the avoided places step by step, and challenge the catastrophic beliefs. Track attack frequency and avoidance to measure progress."
            ),
          ],
        },
      ],
    },
    // ------------------------------------------- Areas of Clinical Focus (29%) -- 3
    {
      slug: "nce-grief-or-depression",
      objective: "Assess grief, loss, terminal illness and adjustment to medical conditions",
      kind: "case",
      title: "Tell grief from depression after a spouse's death",
      brief:
        "Walter, a fictional 70-year-old retired machinist, comes to counseling at his daughter's urging four months after his wife of 45 years died of cancer.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "He cries when he talks about her and says the evenings are worst. He still sees friends at church on Sundays and laughs about her stories with them. He sleeps poorly, eats less, and says 'I wish I'd gone with her sometimes'.",
          ask: "Is this grief, depression, or both? What do you ask next?",
          parts: [
            part(
              "Grief or depression",
              "Distinguishes grief (pangs of longing that come in waves tied to reminders of the loss, preserved self-esteem, moments of positive emotion and humor, thoughts of joining the deceased) from a major depressive episode (pervasive low mood and loss of pleasure, worthlessness or self-loathing, hopelessness about the future); notes that the two can co-occur and that DSM-5-TR does not exclude a depression diagnosis because of bereavement; judges his picture so far as grief, while staying alert.",
              "So far this looks like grief: his sadness comes in waves around reminders (evenings), he still enjoys church and laughs about her, and his wish to be with her is about reunion, not self-hatred. Depression would look more pervasive: little pleasure anywhere, feeling worthless or a burden, a bleak view of all his future. Bereavement does not rule out depression, so keep watching."
            ),
            part(
              "What to ask next",
              "Asks directly about suicidal thoughts (the 'gone with her' remark), intent, plan, means at home and past behavior; about worthlessness, guilt beyond 'what I could have done', and whether anything brings pleasure; about alcohol, health and isolation, given his age and widowhood.",
              "Ask directly whether 'I wish I'd gone with her' includes thoughts of ending his life, and if so about method, intent, plan and access to means such as firearms or stored medication. Older widowed men carry real risk. Ask whether anything still brings pleasure, whether he feels worthless or guilty beyond 'I should have noticed sooner', and about drinking, health problems and how alone he is during the week."
            ),
          ],
        },
        {
          text: "Ten months after the death, he has stopped going to church, says nothing has any point, has lost weight, and says 'I'm useless to everyone now'. He denies any plan to end his life.",
          ask: "What has changed, and how does the plan change?",
          parts: [
            part(
              "The change and the plan",
              "Recognizes signs that now fit a major depressive episode (pervasive loss of interest, hopelessness, worthlessness, weight loss), possibly with prolonged grief; continues risk assessment at every session with a safety plan; refers for a medical evaluation and a medication consultation; offers an evidence-based treatment for depression and grief-focused work; involves supports with his consent.",
              "The picture has shifted from waves of grief to pervasive loss of interest, hopelessness, worthlessness ('useless to everyone') and weight loss: a major depressive episode is now likely, and prolonged grief should also be considered at this point. Keep assessing suicide risk every session and build a safety plan with him. Refer to his physician for a medical check and a medication evaluation. Offer depression treatment (for example behavioral activation or cognitive therapy) alongside grief work, and with consent involve his daughter and church friends to reduce isolation."
            ),
          ],
        },
      ],
    },
    {
      slug: "nce-partner-violence-screening",
      objective: "Recognize the effects of trauma, child abuse and family or partner violence",
      kind: "case",
      title: "Respond when couple counseling uncovers partner violence",
      brief:
        "Dani and Chris, a fictional married couple in their thirties with a 5-year-old son, ask for couple counseling for 'communication problems'. As is the practice's routine, the counselor meets each partner alone for part of the intake.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "Alone, Dani says Chris checks her phone, controls the money and last month pushed her into a wall during an argument while their son watched. She asks the counselor not to tell Chris she said this.",
          ask: "What does the counselor do with this information, now and about the couple format?",
          parts: [
            part(
              "Safety and the format",
              "Keeps Dani's disclosure private from Chris (telling him could raise her danger); assesses her safety (frequency and escalation of violence, threats, strangulation, weapons, fear for her life) and the child's; does not proceed with conjoint couple counseling while violence and coercive control are present, because it can increase risk; offers individual support and safety planning and connects her with domestic violence advocacy; documents carefully.",
              "Do not reveal what Dani said to Chris; that could put her in danger. Assess her safety now: how often, whether it is getting worse, threats to kill, strangling, weapons, and whether she fears for her life or her son's. Coercive control plus physical violence means conjoint couple counseling should not go ahead now: it can expose her to retaliation for what she says in session. Offer individual sessions and a safety plan, and connect her with domestic violence advocacy (a hotline or local program) that can help with options. Document carefully and keep the record secure."
            ),
            part(
              "The child",
              "Recognizes that a child witnessing violence may be reportable under state law (definitions of child abuse or neglect vary by state); consults a supervisor and the state's statute about a report; considers the child's exposure in the safety plan.",
              "Their son watched the push. Whether witnessing violence is reportable child abuse or neglect depends on the state's law, so the counselor checks the statute and consults a supervisor promptly, and reports if the law requires it, telling Dani what will happen where safe to do so. Either way, the child's safety is part of Dani's safety plan."
            ),
          ],
        },
        {
          text: "At the next joint appointment Chris asks why the counselor has 'switched to individual sessions'.",
          ask: "What does the counselor say?",
          parts: [
            part(
              "Explaining without endangering",
              "Gives a neutral reason that does not reveal Dani's disclosure (for example, that the counselor's assessment suggests individual work first), offers Chris his own referral, possibly to an accountable intervention program if he raises his own behavior, and avoids confronting him with her statements.",
              "Give a neutral, honest-enough reason that does not point to Dani: 'From the intake, I think individual work is the right first step for each of you.' Offer Chris his own counselor. If he acknowledges his own behavior, an accountable program for people who use violence is the referral, not couple sessions. Never confront him with what Dani said."
            ),
          ],
        },
      ],
    },
    {
      slug: "nce-anxiety-ocd-phobia-sort",
      objective: "Recognize anxiety, panic and obsessive-compulsive presentations and their physical effects",
      kind: "case",
      title: "Classify a client's fears and rituals and their physical toll",
      brief:
        "Three fictional clients at a community clinic describe their worries in one afternoon. The counselor sorts what each presentation most likely is before planning.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "(1) Ana, 24, washes her hands up to 40 times a day because of thoughts that she will infect her niece, knows the thoughts are excessive, and has raw, cracked skin. (2) Ben, 47, has worried most days for over a year about money, his health and his children's grades, with muscle tension, poor sleep and trouble concentrating. (3) Cal, 31, became terrified of elevators after being stuck in one, and now takes 12 flights of stairs to work, panicking only at the thought of elevators.",
          ask: "Match each client to the most likely presentation and name its physical effects.",
          parts: [
            matchPart(
              "Most likely presentation",
              "Ana: obsessive-compulsive disorder; Ben: generalized anxiety disorder; Cal: specific phobia (situational). All three right is met; two is partly there.",
              "Ana has obsessions (contamination, harm to her niece) and compulsions (washing) with insight that they are excessive: obsessive-compulsive disorder. Ben has excessive, hard-to-control worry about many areas, most days for more than a year, with tension, poor sleep and poor concentration: generalized anxiety disorder. Cal's fear is tied to one situation and leads to avoidance: specific phobia, situational type.",
              {
                leftHeading: "Client",
                rightHeading: "Presentation",
                left: ["Ana: washing and fears of infecting her niece", "Ben: worry about many things for over a year", "Cal: fear of elevators after being stuck"],
                right: ["Obsessive-compulsive disorder", "Generalized anxiety disorder", "Specific phobia", "Panic disorder", "Illness anxiety disorder"],
                pairs: [0, 1, 2],
              }
            ),
            part(
              "Physical effects and referral",
              "Names Ana's skin damage (a reason for medical care for her hands), Ben's muscle tension, fatigue and sleep problems, and Cal's panic symptoms when facing elevators; notes medical review where physical symptoms are prominent.",
              "Ana's raw, cracked skin needs medical attention and is a measure of how severe the compulsions are. Ben's chronic muscle tension, fatigue and poor sleep are typical of generalized anxiety and can lead to headaches and pain; a medical check rules out other causes of his symptoms. Cal's racing heart and breathlessness appear only when he faces elevators."
            ),
          ],
        },
        {
          text: "The counselor plans the first-line psychological treatment for each.",
          ask: "What treatment fits each presentation?",
          parts: [
            part(
              "Matching treatment",
              "Ana: exposure and response prevention (exposure to contamination cues while refraining from washing), with medication referral as an option; Ben: cognitive-behavioral therapy for worry (relaxation, worry exposure, restructuring, problem solving); Cal: graded in vivo exposure to elevators.",
              "Ana: exposure and response prevention, facing contamination cues step by step without washing until the urge falls; a referral for a medication evaluation is an option. Ben: CBT for generalized anxiety (understanding worry, relaxation, scheduled worry time, challenging the threat estimates, problem solving). Cal: graded in vivo exposure, from looking at an elevator to riding one floor and then many, until fear subsides."
            ),
          ],
        },
      ],
    },
    // ------------------------------------------- Treatment Planning (9%) -- 1
    {
      slug: "nce-measurable-goals",
      objective: "Write measurable short- and long-term goals with the client that fit the diagnosis",
      kind: "build",
      title: "Turn a client's wishes into measurable treatment goals",
      brief:
        "Sofia, a fictional 26-year-old graduate student, has been diagnosed by her counselor with social anxiety disorder. In her words: 'I want to stop being so scared of people. I want to speak up in seminar, and maybe make one friend here.' She skips about half her seminars and eats lunch alone in her car. A social anxiety self-report scale at intake put her in the severe range of its published bands.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write one long-term goal and three short-term objectives with her, and say how progress will be measured and reviewed.",
          parts: [
            part(
              "Long-term goal and short-term objectives",
              "Writes a long-term goal in her words tied to the diagnosis (for example, reduced social anxiety so she takes part in seminars and builds a friendship) and three short-term objectives that are specific, measurable, achievable, relevant and time-bound (attendance counts, a number of comments, a social contact), built from her current baseline.",
              "Long-term goal (her words): 'Feel less scared around people so I can speak up in seminar and make a friend here', with social anxiety reduced from the severe range. Short-term objectives: (1) attend at least 4 of 5 seminars a week within 4 weeks (baseline about half); (2) make one comment or ask one question in seminar each week by week 6; (3) eat lunch with at least one classmate once a week by week 8."
            ),
            part(
              "Measuring and reviewing",
              "Names how each objective is tracked (her log of attendance, comments and contacts), repeats the standardized measure at set points (pre-test and post-test), and schedules a joint review with her to revise the plan, respecting her choices (ACA A.1.c).",
              "She keeps a simple weekly log (seminars attended, comments made, lunches shared). Repeat the same social anxiety scale every four weeks to compare with intake. Review the log and scores together at week 4 and week 8, and revise the plan jointly: ACA A.1.c asks counselors and clients to devise plans together and to review and revise them regularly."
            ),
          ],
        },
      ],
    },
    // ------------------------------------------- Counseling Skills and Interventions (30%) -- 3
    {
      slug: "nce-change-talk-and-oars",
      objective: "Use motivational interviewing to help a client resolve ambivalence about change",
      kind: "build",
      title: "Hear change talk and answer it with motivational interviewing",
      brief:
        "Derek, a fictional 38-year-old electrician, was sent to counseling by his employer after a second missed shift following heavy weekend drinking. In the first session he says: (1) 'I'm only here because HR made me.' (2) 'I guess I don't want to lose this job, it's a good one.' (3) 'Everybody on my crew drinks like I do.' (4) 'My daughter asked me why I sleep all Sunday. That stuck with me.' (5) 'I could probably cut back to just Saturdays.'",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Sort his statements, then write motivational interviewing responses.",
          parts: [
            matchPart(
              "Change talk or sustain talk",
              "(1) sustain talk, (2) change talk: reason, (3) sustain talk, (4) change talk: reason or need, (5) change talk: ability. All five right is met; three or four is partly there.",
              "(1) Sustain talk: no reason to change of his own. (2) Change talk, a reason (keeping the job). (3) Sustain talk: normalizing his drinking. (4) Change talk, a reason and need (his daughter). (5) Change talk, ability (he could cut back).",
              {
                leftHeading: "Statement",
                rightHeading: "Kind of talk",
                left: ["(1) Only here because HR made me", "(2) Don't want to lose this job", "(3) Everybody on my crew drinks like I do", "(4) My daughter's question stuck with me", "(5) I could cut back to Saturdays"],
                right: ["Sustain talk: no reason of his own", "Change talk: reason", "Sustain talk: normalizing", "Change talk: need", "Change talk: ability", "Commitment to abstain"],
                pairs: [0, 1, 2, 3, 4],
              }
            ),
            part(
              "OARS responses",
              "Writes an open question, an affirmation, a reflection (ideally of the daughter statement, reflecting the change talk rather than the sustain talk) and a summary that collects his change talk; avoids arguing, labeling him or the 'righting reflex'.",
              "Open question: 'What would be different if you only drank on Saturdays?' Affirmation: 'You came even though it wasn't your idea, and you're thinking about your daughter.' Reflection: 'Her question got to you. You don't want to be the dad who sleeps through Sunday.' Summary: 'So you didn't choose to be here, and drinking is normal on your crew. At the same time, this is a job you value, your daughter has noticed, and you think cutting back to Saturdays is something you could do. Where does that leave you?' No arguing, no 'alcoholic' label, no lecture: those strengthen sustain talk."
            ),
          ],
        },
      ],
    },
    {
      slug: "nce-group-stage-interventions",
      objective: "Choose group interventions for the stage of group development and its themes",
      kind: "case",
      title: "Lead an anger management group through its stages",
      brief:
        "A fictional counselor leads a closed eight-session anger management group for six adults referred by a county program. Ground rules on confidentiality and respect were agreed in session 1.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "In session 3, two members argue about whether the group 'is a waste of time', one member challenges the leader's qualifications, and the others go quiet.",
          ask: "What stage is this group in, and how does the leader respond?",
          parts: [
            part(
              "Stage and response",
              "Names the transition (storming) stage, marked by resistance, conflict and challenges to the leader; responds without defensiveness, acknowledges and explores the conflict as group material in the here and now, invites the quiet members in, links members' shared feelings, and refers back to the agreed ground rules if behavior becomes harmful.",
              "Transition, sometimes called storming: anxiety, resistance, conflict between members and a challenge to the leader's authority are expected here. Respond openly, not defensively ('You're wondering whether I can help, and whether this group can'), make the conflict something the group looks at together, invite the quiet members ('What's it like to watch this?'), link shared feelings (both arguing members feel forced to be there), and use the ground rules if it turns to insults."
            ),
          ],
        },
        {
          text: "By session 6 members are giving each other honest feedback and practicing a time-out skill in role plays. In session 7 one member, Rae, says she is worried about 'losing this' when the group ends.",
          ask: "Name the stage now and plan the last two sessions.",
          parts: [
            part(
              "Working stage and termination",
              "Identifies the working stage (cohesion, feedback, practice) and the coming termination; plans to name the ending openly, process feelings about it (Rae's worry as a shared theme), review what each member learned, consolidate skills with a relapse-prevention plan and supports outside the group, and give and receive final feedback.",
              "Sessions 4 to 6 show the working stage: cohesion, honest feedback and skill practice. Session 7 opens termination. Name the ending, link Rae's worry to others' feelings about it, and have each member review what changed and which skills work. Build a personal plan for high-risk situations and the supports each will use after the group. Close session 8 with final feedback and referral options for anyone who needs more."
            ),
          ],
        },
      ],
    },
    {
      slug: "nce-thought-record-distortions",
      objective: "Apply theory-based interventions -- cognitive-behavioral, person-centered, solution-focused and others -- within a treatment plan",
      kind: "build",
      title: "Work a thought record with a client: name the distortions and restructure",
      brief:
        "Kim, a fictional 33-year-old nurse in counseling for depression, brings a thought record. Situation: her manager asked to 'talk tomorrow'. Thoughts: (1) 'I'm going to be fired.' (2) 'I always mess everything up.' (3) 'She was short with me, so she must hate me.' (4) 'I feel like a failure, so I am one.' (5) 'If I'm not perfect at work, I'm worthless.' Emotion: dread, 90 out of 100.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Name each distortion, then write how the counselor helps Kim restructure one thought.",
          parts: [
            matchPart(
              "Cognitive distortions",
              "(1) fortune telling (catastrophizing), (2) overgeneralization, (3) mind reading, (4) emotional reasoning, (5) all-or-nothing thinking. All five right is met; three or four is partly there.",
              "(1) Fortune telling: predicting a bad outcome as fact. (2) Overgeneralization: 'always' from some mistakes. (3) Mind reading: assuming what the manager thinks. (4) Emotional reasoning: treating a feeling as evidence. (5) All-or-nothing thinking: perfect or worthless, nothing between.",
              {
                leftHeading: "Thought",
                rightHeading: "Distortion",
                left: ["(1) I'm going to be fired", "(2) I always mess everything up", "(3) She must hate me", "(4) I feel like a failure, so I am one", "(5) Not perfect means worthless"],
                right: ["Fortune telling", "Overgeneralization", "Mind reading", "Emotional reasoning", "All-or-nothing thinking", "Personalization"],
                pairs: [0, 1, 2, 3, 4],
              }
            ),
            part(
              "Restructuring one thought",
              "Uses collaborative Socratic questions (evidence for and against, alternative explanations, what she would tell a friend, the worst, best and most likely outcome), helps her write a balanced alternative thought, re-rates the emotion, and plans a behavioral experiment (going to the meeting and recording what happened).",
              "Take 'I'm going to be fired.' Ask together: what is the evidence for it, and against it (recent good reviews, no warnings)? What else could 'talk tomorrow' mean (scheduling, a new project, feedback)? What would she tell a colleague who thought this? Worst, best and most likely outcome? She writes a balanced thought: 'I don't know what she wants; it's more likely to be about scheduling than firing, and I'll find out tomorrow.' Re-rate dread (perhaps 50). Plan an experiment: go to the meeting, note what actually happened, and bring it back to compare with the prediction."
            ),
          ],
        },
      ],
    },
    // ------------------------------------------- Core Counseling Attributes (8%) -- 1
    {
      slug: "nce-values-countertransference",
      objective: "Recognize your own values and reactions and their impact on a client, including countertransference",
      kind: "case",
      title: "Notice your own values at work with a client",
      brief:
        "Jordan, a fictional counselor raised in a religious family that disapproved of divorce, is seeing Mei, a fictional 44-year-old mother of two, for anxiety. Jordan's own parents' divorce was painful for him as a child.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "Mei says she has decided to leave her marriage, which she describes as lonely but not abusive. Jordan notices he has asked three questions in a row about how the children will cope, and feels irritated with her.",
          ask: "What is happening, and what should Jordan do?",
          parts: [
            part(
              "What is happening",
              "Recognizes countertransference: Jordan's personal history and values are shaping his questions and feelings; this risks imposing his values on Mei's decision, contrary to ACA A.4.b, and undermines her autonomy and the alliance.",
              "Countertransference: Jordan's own childhood experience of divorce and his family's values are steering his questions (the children, again) and his irritation. Left unexamined, he would be imposing his values on a decision that is Mei's to make, which ACA A.4.b tells counselors to avoid, and Mei may feel judged and pull back."
            ),
            part(
              "What Jordan does",
              "Returns to Mei's goals and decision with empathy and neutrality; uses supervision or consultation to examine the reaction; considers personal counseling; does NOT refer her solely because of his values (ACA A.11.b), and refers only if he cannot be competent with her (A.11.a); seeks training where his values put clients at risk.",
              "In session, refocus on what Mei wants and what she is feeling, with genuine curiosity rather than steering. Outside it, take the reaction to supervision, and consider his own counseling if it keeps arising. He should not refer her because her choice conflicts with his values: ACA A.11.b says counselors refrain from referring based solely on their personal values and seek training where they risk imposing them. Referral is right only if he truly cannot be helpful to her (A.11.a), and then with care."
            ),
          ],
        },
        {
          text: "Two months later Mei thanks Jordan for 'never making me feel judged'. Jordan reflects on what helped.",
          ask: "Name the core counseling attributes that made the difference.",
          parts: [
            selectPart(
              "Core attributes shown",
              "Selects awareness of self and impact on clients, nonjudgmental stance, positive regard, and empathic attunement. Directive advice-giving is not one.",
              "Self-awareness let Jordan catch his reaction; a nonjudgmental stance and unconditional positive regard let Mei explore her choice; empathic attunement kept him following her experience. Giving direct advice about her marriage would have undercut all of these.",
              {
                display: "list",
                lines: ["Awareness of self and impact on clients", "Nonjudgmental stance", "Directive advice about what she should do", "Positive regard", "Empathic attunement"],
                correct: [0, 1, 3, 4],
              }
            ),
            part(
              "What each did for Mei",
              "Explains, briefly, how the attributes helped Mei: self-awareness kept Jordan's history out of her decision; a nonjudgmental stance and positive regard let her explore without defending herself; empathic attunement kept the focus on her experience.",
              "Because Jordan noticed his own reaction, his history stopped steering the questions. A nonjudgmental stance and positive regard meant Mei did not have to defend her decision, so she could explore her doubts and her hopes honestly. Empathic attunement kept the session following what she felt, which is why she felt understood rather than judged."
            ),
          ],
        },
      ],
    },
  ],
};
