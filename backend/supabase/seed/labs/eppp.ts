import { CLINICAL_SAFETY, part, matchPart, numericPart, orderPart, selectPart, type SeedLabSet } from "./types";
import { source } from "../sources";

// REQ-234: Prep for the EPPP (Part 1-Knowledge), authored labs.
//
// Aligned to ASPPB's "EPPP Content Areas" page (re-read 2026-11-11): the
// eight Part 1 domains at 10 / 13 / 11 / 12 / 16 / 15 / 7 / 16 percent, as
// seeded in seed/tracks/eppp.ts. The same page lists the six domains of the
// integrated EPPP that replaces Parts 1 and 2 (see the track's header for
// the transition dates); these labs serve Part 1.
//   https://asppb.net/?p=235
// Density (docs/labs.md, policy "hybrid"): 1 / 2 / 2 / 2 / 2 / 2 / 1 / 2 =
// 14, one lab per objective. The exam is multiple choice; the labs make the
// learner DO what its applied items assume: read a lithium level against the
// label, compute a standard error and a predictive value, classify
// conditioning and attachment, critique a design, walk an ethics decision
// model, apply Washington's reporting statute.
//
// Mental health course: it sits behind the 18+ mature-content gate
// (lib/mature-content.ts). Material is frank where the exam tests it (abuse
// reporting, substance use, medication toxicity) and never graphic. Every
// person is fictional; this is exam practice, not clinical, legal or
// ethics advice. Values (the lithium label's ranges and interactions, the
// SEM formula, Washington's 48-hour rule and adult-survivor exception, the
// APA Ethics Code standards, guideline treatment recommendations) are
// sourced per lab in value-sources.ts, each read 2026-11-11. Labs that
// quote no value say why. All needs_expert_review until a licensed
// psychologist approves them (docs/labs.md).

export const EPPP_LABS: SeedLabSet = {
  trackCode: "EPPP",
  sources: [source("https://asppb.net/?p=235", "exam_outline", "2026-11-11")],
  labs: [
    // ----------------------------------------------------- Biological bases (10%) -- 1
    {
      slug: "eppp-lithium-toxicity-case",
      objective:
        "Describe the major psychotropic drug classes -- antidepressants, antipsychotics, mood stabilizers, anxiolytics and hypnotics, stimulants -- by mechanism, main uses and key adverse effects",
      kind: "case",
      title: "Recognize possible lithium toxicity in a therapy session",
      brief:
        "Dana, a fictional 46-year-old with bipolar I disorder, has been stable for three years on lithium prescribed by her psychiatrist, with regular blood levels. She sees a psychologist weekly for therapy. At today's session she walks unsteadily, her hands shake more than usual, she has vomited twice since morning and she has trouble following the conversation. She mentions a heat wave, that she has been drinking less, and that she has taken ibuprofen several times a day for a week for back pain.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "Dana says she feels 'off' but wants to finish the session and see her psychiatrist next month.",
          ask: "What do you suspect, why, and what do you do now?",
          parts: [
            part(
              "What it could be",
              "Suspects lithium toxicity: names the narrow gap between therapeutic and toxic levels, the interaction (NSAIDs such as ibuprofen raise lithium levels), dehydration as a further cause, and the signs (coarse or worsening tremor, vomiting, unsteady gait, confusion) as neurological and gastrointestinal toxicity.",
              "Possible lithium toxicity. Lithium's toxic concentrations are close to its therapeutic range, so small changes matter. Ibuprofen is a non-steroidal anti-inflammatory drug, which the lithium label lists as raising serum lithium; low fluid intake in heat adds to it. Worsening tremor, vomiting, unsteady gait and confusion fit the label's description of toxicity."
            ),
            part(
              "Action now",
              "Treats it as a medical emergency beyond psychological scope: stops the session to arrange same-day emergency medical evaluation (emergency department, or emergency services if she cannot get there safely), does not let her drive, contacts the prescriber, and explains the reason to Dana.",
              "This needs a medical assessment today, not next month. End the therapy agenda, explain the concern plainly and arrange for her to go to an emergency department with someone driving her, or call emergency services if she is too impaired. Contact her psychiatrist (with her consent, or as needed to protect her in an emergency). Psychologists do not adjust medication; the job is to recognize the danger and get her to medical care."
            ),
          ],
        },
        {
          text: "The emergency department calls back later (Dana agreed to the contact): her serum lithium level was 2.1 mEq/L; her usual maintenance level has been 0.8 mEq/L. Ibuprofen was stopped and she was admitted for treatment.",
          ask: "Interpret the result against the label, and say what led to it.",
          parts: [
            part(
              "Interpreting the level",
              "States that 2.1 mEq/L is above the label's toxic threshold (1.5 mEq/L and above) and well above the maintenance range (0.8 to 1 mEq/L), so it confirms toxicity, and that symptoms can appear even within the therapeutic range in sensitive people.",
              "The label gives maintenance titration to 0.8 to 1 mEq/L (0.8 to 1.2 for acute mania) and calls 1.5 mEq/L and above toxic. 2.1 mEq/L confirms toxicity; her usual 0.8 shows how far it rose. The label also notes that some people show toxic signs inside the therapeutic range, so symptoms always count, not only the number."
            ),
            part(
              "What led to it",
              "Names the NSAID interaction and dehydration/heat as the likely causes, and notes the label's advice to recheck levels after any new interacting drug.",
              "A week of regular ibuprofen (NSAIDs raise lithium concentrations) plus reduced fluids in a heat wave. The label advises checking lithium levels after starting interacting drugs such as NSAIDs, diuretics or renin-angiotensin system antagonists, which is why over-the-counter painkillers are worth asking about in session."
            ),
          ],
        },
        {
          text: "Three weeks later, recovered, Dana tells the psychologist: 'That scared me. I'm going to stop lithium on my own.'",
          ask: "How does the psychologist respond, within scope?",
          parts: [
            part(
              "Response within scope",
              "Validates the fear, explores her reasons and the risks of stopping a mood stabilizer abruptly (relapse) without giving medication orders, encourages and helps her raise it with her psychiatrist (with consent to coordinate), and reinforces safety learning (tell prescribers and pharmacists about lithium before any new over-the-counter drug, keep fluids up, know the warning signs).",
              "Acknowledge how frightening it was and explore what she wants. Without telling her what dose to take, discuss that stopping a mood stabilizer on her own risks relapse, and that her psychiatrist can review the options, including safer pain relief and monitoring. Offer to coordinate with the psychiatrist with her consent, and help her prepare questions. Reinforce what she learned: tell every prescriber and pharmacist she takes lithium, check before using over-the-counter painkillers, keep hydrated in heat, and seek care for tremor, vomiting or confusion."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------- Cognitive-affective bases (13%) -- 2
    {
      slug: "eppp-classical-conditioning-dental-fear",
      objective: "Apply classical conditioning: acquisition, extinction, spontaneous recovery, generalization and discrimination",
      kind: "case",
      title: "Explain and treat a fear of dental care with classical conditioning",
      brief:
        "Mateo, a fictional 28-year-old, had a painful dental procedure at 12 during which the drill's whine came just before sharp pain. Since then the sound of a dental drill makes his heart race. He now also feels anxious at the sound of an electric coffee grinder, but not at the sound of a hair dryer. He has avoided dentists for eight years and now has a cracked tooth.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "Mateo describes his history at intake; the psychologist maps it onto conditioning terms.",
          ask: "Label the elements of the conditioning and the processes in his history.",
          parts: [
            matchPart(
              "Elements and processes",
              "All five right is met; three or four is partly there.",
              "The pain is the unconditioned stimulus and the fear it caused the unconditioned response; the drill's whine became the conditioned stimulus; reacting to the coffee grinder is stimulus generalization; not reacting to the hair dryer is stimulus discrimination.",
              {
                leftHeading: "Part of the history",
                rightHeading: "Conditioning term",
                left: ["The sharp pain during the procedure", "The drill's whine", "Racing heart at the drill sound now", "Anxiety at the coffee grinder", "No anxiety at the hair dryer"],
                right: ["Unconditioned stimulus", "Conditioned stimulus", "Conditioned response", "Stimulus generalization", "Stimulus discrimination", "Negative reinforcement"],
                pairs: [0, 1, 2, 3, 4],
              }
            ),
            part(
              "Acquisition and why it lasted",
              "Explains acquisition as the drill sound being paired with (and predicting) pain, and that avoidance prevented extinction because he never experienced the sound without pain again; may add that relief from avoiding is negatively reinforcing (the two-factor account).",
              "Acquisition: the drill sound reliably came just before pain, so it became a signal for pain and came to evoke fear on its own. It has persisted for 16 years because he avoided dentists: extinction needs the conditioned stimulus to occur without the unconditioned stimulus, and avoidance prevented that. The relief of avoiding also negatively reinforces the avoidance (Mowrer's two-factor account)."
            ),
          ],
        },
        {
          text: "Mateo agrees to treatment before his dental appointment in six weeks.",
          ask: "Design a conditioning-based plan and say what to expect.",
          parts: [
            part(
              "Treatment plan",
              "Proposes graded exposure (systematic desensitization with relaxation, or in vivo exposure) building a hierarchy from recordings of the drill at low volume up to sitting in a dental chair with the drill running, so the drill sound repeatedly occurs without pain (extinction); and coordinates with the dentist (signals, pain control) so the real visit does not re-pair the sound with pain.",
              "Graded exposure toward extinction: build a hierarchy (drill recording quietly, then louder, video of a procedure, visiting the office, sitting in the chair, the drill running near him), practicing each step until anxiety falls, with relaxation if using systematic desensitization. The sound now occurs repeatedly without pain. Coordinate with the dentist: good local anesthesia and a stop signal, so the real procedure does not pair the sound with pain again."
            ),
            part(
              "Spontaneous recovery",
              "Predicts that fear may return briefly after a break (spontaneous recovery) and explains this does not mean failure; plans booster exposure and regular check-ups.",
              "After extinction, fear can reappear after time away from the cue (spontaneous recovery), for example months later before the next check-up. Tell him in advance that this is expected and usually weaker, and plan a short refresher exposure before visits and regular appointments so the sound keeps occurring without pain."
            ),
          ],
        },
      ],
    },
    {
      slug: "eppp-operant-classify-and-plan",
      objective: "Apply operant conditioning: reinforcement and punishment, schedules of reinforcement, shaping and extinction bursts",
      kind: "build",
      title: "Classify consequences and plan for a child's tantrums",
      brief:
        "A fictional second-grade teacher describes five situations. (1) A student gets a sticker each time he finishes a worksheet, and he finishes more worksheets. (2) A student's seat-belt alarm stops when she buckles up, and she now buckles up at once. (3) A student loses five minutes of recess for hitting, and hitting decreases. (4) A student who shouts out is given extra homework, and shouting out decreases. (5) A slot-machine-style reward: the class earns a game after an unpredictable number of quiet periods, and stays quiet steadily. Separately, the parents of Leo, 6, report that he throws tantrums at bedtime, and that the parents usually give in and let him stay up 'to stop the screaming'.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Classify each situation and write a plan for Leo's tantrums.",
          parts: [
            matchPart(
              "Classify the consequences",
              "(1) positive reinforcement, (2) negative reinforcement, (3) negative punishment, (4) positive punishment, (5) variable-ratio schedule. All five right is met; three or four is partly there.",
              "(1) Positive reinforcement: something added, behavior increases. (2) Negative reinforcement: an aversive sound removed, behavior increases. (3) Negative punishment: something valued removed, behavior decreases. (4) Positive punishment: something aversive added, behavior decreases. (5) Variable-ratio schedule: reward after an unpredictable number of responses, producing high, steady responding resistant to extinction.",
              {
                leftHeading: "Situation",
                rightHeading: "Term",
                left: ["(1) Sticker for each worksheet", "(2) Alarm stops when buckled", "(3) Recess lost for hitting", "(4) Extra homework for shouting out", "(5) Game after an unpredictable number of quiet periods"],
                right: ["Positive reinforcement", "Negative reinforcement", "Negative punishment", "Positive punishment", "Variable-ratio schedule", "Fixed-interval schedule"],
                pairs: [0, 1, 2, 3, 4],
              }
            ),
            part(
              "Why the tantrums persist",
              "Explains that staying up is positive reinforcement for Leo's tantrums, given intermittently (sometimes the parents hold out), a variable schedule that makes the behavior persistent, and that the parents are negatively reinforced because giving in stops the screaming.",
              "Leo's tantrums are positively reinforced by staying up. Because the parents sometimes hold out and sometimes give in, the reinforcement is intermittent (a variable schedule), which makes tantrums very resistant to extinction. The parents are caught too: giving in removes the screaming, negatively reinforcing their giving in."
            ),
            part(
              "Plan and the extinction burst",
              "Plans extinction (bedtime stays the same whatever happens, applied consistently by both parents) combined with reinforcing an alternative behavior (praise and a small reward, such as an extra story, for going to bed calmly; shaping toward a calm bedtime), warns of an extinction burst (tantrums get worse before they improve) and stresses that giving in during the burst teaches longer tantrums; safety is ensured throughout.",
              "Extinction: tantrums no longer earn staying up; bedtime holds every night, by both parents, while keeping Leo safe. Add differential reinforcement of the alternative: a calm bedtime routine earns a chosen story or a sticker toward a morning reward, shaping from 'in bed within 15 minutes' toward 'in bed on time'. Warn the parents: expect an extinction burst, with tantrums longer and louder for a few nights. Giving in then would reinforce bigger tantrums, so plan together how to hold steady."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------- Social and cultural bases (11%) -- 2
    {
      slug: "eppp-attribution-errors",
      objective: "Apply attribution theory and the common attribution errors to explain social judgments",
      kind: "build",
      title: "Name the attribution at work in five workplace remarks",
      brief:
        "A fictional consulting psychologist is helping a hospital unit whose staff conflict is rising. In interviews she hears: (1) A manager says a nurse who arrived late 'just doesn't care', not knowing the bus line was cut. (2) A nurse explains her own late arrival as 'the bus line was cut', but called a colleague late last week 'lazy'. (3) After the unit's audit scores rose, the charge nurse credits her leadership; when they fell, she blamed staffing. (4) A day-shift nurse says the night shift's mistakes show 'that's how night people are', but calls a night nurse's good catch 'a lucky break'. (5) A new hire reasons: the patient complains to every nurse (high consensus), always about pain management (high distinctiveness), every shift (high consistency), so the cause is the pain plan, not the nurses.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Name the attribution concept in each remark and suggest how the consultant could use this.",
          parts: [
            matchPart(
              "Attribution concept",
              "(1) fundamental attribution error, (2) actor-observer bias, (3) self-serving bias, (4) ultimate attribution error, (5) Kelley's covariation model. All five right is met; three or four is partly there.",
              "(1) Fundamental attribution error: explaining someone else's behavior by disposition and underweighting the situation. (2) Actor-observer bias: situational reasons for one's own behavior, dispositional for others'. (3) Self-serving bias: success to oneself, failure to circumstances. (4) Ultimate attribution error: the group-level version, outgroup failures as disposition, outgroup successes as luck or exception. (5) Kelley's covariation model: high consensus, distinctiveness and consistency point to the stimulus (here, the pain plan).",
              {
                leftHeading: "Remark",
                rightHeading: "Concept",
                left: ["(1) Late nurse 'just doesn't care'", "(2) My lateness was the bus, hers is laziness", "(3) Credit for the rise, blame staffing for the fall", "(4) Night shift's mistakes are 'how they are', their catch is luck", "(5) Consensus, distinctiveness and consistency all high"],
                right: ["Fundamental attribution error", "Actor-observer bias", "Self-serving bias", "Ultimate attribution error", "Kelley's covariation model", "False consensus effect"],
                pairs: [0, 1, 2, 3, 4],
              }
            ),
            part(
              "Using it in the consultation",
              "Proposes an intervention that targets the attributions: making situational information visible (for example shared shift-change huddles, posting transport or staffing problems), structured cross-shift contact toward a shared goal to reduce us-versus-them judgments, and feedback that looks at systems causes before blaming individuals.",
              "Make the situation visible so it can be weighed: brief shift-change huddles where barriers (transport, staffing, equipment) are named. Reduce the day-versus-night split with cooperative contact on a shared goal (a joint quality project with equal status), the conditions under which intergroup contact reduces bias. Review incidents with a systems lens first (what in the process allowed it) before attributing it to a person."
            ),
          ],
        },
      ],
    },
    {
      slug: "eppp-family-systems-case",
      objective: "Apply systems thinking to families, schools and workplaces",
      kind: "case",
      title: "Read a family's problem as a system",
      brief:
        "The fictional Okafor family is referred by a school counselor because Jaden, 14, has been skipping school and getting into fights. His parents argue often; his father works long hours. His mother describes Jaden as 'my best friend, the only one who listens to me' and tells him about her arguments with his father. Whenever the parents start to argue at home, Jaden gets into trouble, and the parents stop arguing to deal with him. His sister, 10, is described as 'the easy one'.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "The psychologist meets the whole family for an assessment session.",
          ask: "Describe the family pattern in systems terms.",
          parts: [
            part(
              "Systems formulation",
              "Uses systems concepts: Jaden as the identified patient whose symptoms serve a function (detouring the parents' conflict, maintaining homeostasis), triangulation (a two-person conflict pulled into a third person), a cross-generational coalition between mother and son with a diffuse parent-child boundary (structural terms), and circular rather than linear causality.",
              "Jaden is the identified patient, but his behavior has a function in the system: when the parents start to fight, his trouble stops the fight and unites them around him, keeping the family's balance (homeostasis). The parents' conflict is triangulated through Jaden (Bowen), and the mother-son 'best friend' bond is a cross-generational coalition with a diffuse boundary between the parental and child subsystems (Minuchin's structural view). Causality is circular: parental conflict, Jaden's trouble and the parents' distraction each maintain the others."
            ),
            part(
              "What the systems view adds",
              "Explains that treating Jaden alone would miss the pattern and that change in one part changes the whole, so the family (or the parental couple) is the unit of treatment.",
              "Treating Jaden alone might reduce the fights for a while, but the system would push back toward its balance: another symptom, or the sister becoming the problem. Working with the family, and with the parents as a couple, addresses what keeps the pattern going."
            ),
          ],
        },
        {
          text: "In the first family session the mother keeps turning to Jaden to agree with her about the father's absences, and Jaden starts acting out in the room when the parents disagree.",
          ask: "Choose interventions from one systems model and say what each aims at.",
          parts: [
            part(
              "Interventions",
              "Names a model and fitting techniques: structural (joining, enactment, restructuring boundaries so the parents work as an executive subsystem and Jaden is moved out of the marital conflict, possibly couple sessions), or Bowenian (detriangulation, increasing differentiation), or strategic (reframing the symptom, directives); each technique tied to its aim.",
              "Structural family therapy: join the family respectfully; use an enactment, asking the parents to talk directly to each other about a disagreement while the therapist blocks Jaden from stepping in, to strengthen the parental subsystem and the boundary around it; reassign roles so the mother's confidant is another adult and Jaden is a teenager again; schedule some sessions with the parents alone for their conflict. Each aims to move Jaden out of the triangle so his behavior is no longer needed."
            ),
          ],
        },
      ],
    },
    // ------------------------------------------------ Growth and lifespan development (12%) -- 2
    {
      slug: "eppp-aging-vs-ncd-case",
      objective: "Distinguish normal cognitive aging from mild neurocognitive disorder and dementia",
      kind: "case",
      title: "Tell normal aging from mild and major neurocognitive disorder",
      brief:
        "A fictional geriatric clinic asks the psychologist to review three referrals. (1) Mr. Ito, 72: slower to recall names and sometimes walks into a room and forgets why, but he manages his finances, medications, driving and volunteer work without trouble. (2) Ms. Rhee, 75: clearly forgetful compared with a year ago, confirmed on standardized testing; she now uses lists and a pill organizer and takes longer with bills, but still does them herself without errors. (3) Mr. Brandt, 79: has missed several bills, got lost driving a familiar route, and his daughter now manages his medications after he double-dosed twice.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "The psychologist reads all three referrals and the test results together.",
          ask: "Classify each person and give the deciding feature.",
          parts: [
            matchPart(
              "Classification",
              "(1) normal cognitive aging, (2) mild neurocognitive disorder, (3) major neurocognitive disorder (dementia). All three right is met; two is partly there.",
              "Mr. Ito: normal aging. Ms. Rhee: mild neurocognitive disorder (mild cognitive impairment). Mr. Brandt: major neurocognitive disorder (dementia).",
              {
                leftHeading: "Person",
                rightHeading: "Classification",
                left: ["(1) Mr. Ito", "(2) Ms. Rhee", "(3) Mr. Brandt"],
                right: ["Normal cognitive aging", "Mild neurocognitive disorder", "Major neurocognitive disorder (dementia)", "Delirium"],
                pairs: [0, 1, 2],
              }
            ),
            part(
              "Deciding feature",
              "Names the deciding features: normal aging has slower retrieval without measurable decline beyond age expectations or loss of function; mild NCD has a measurable decline from a previous level but preserved independence in everyday activities (with compensation); major NCD has decline that interferes with independence in everyday (instrumental) activities such as finances, medications and driving.",
              "Mr. Ito: slower name recall and occasional lapses with no decline in independence are typical of aging. Ms. Rhee: a real decline, shown on testing, but she stays independent using compensations (lists, an organizer, more time): mild neurocognitive disorder. Mr. Brandt: the decline now interferes with independence in instrumental activities (bills, driving, medications need someone else): major neurocognitive disorder. Function, not memory complaints alone, separates mild from major."
            ),
          ],
        },
        {
          text: "Before a diagnosis is given to Ms. Rhee, the team notes she has been sleeping poorly since her husband died eight months ago, takes an over-the-counter sleep aid containing diphenhydramine every night, and says she 'doesn't enjoy anything anymore'.",
          ask: "What should be ruled out or addressed before calling this mild neurocognitive disorder?",
          parts: [
            part(
              "Reversible contributors",
              "Names depression (grief now with anhedonia) and medication effects (diphenhydramine is anticholinergic and impairs cognition in older adults) as possible reversible causes, plus a medical workup (for example thyroid function, vitamin B12, metabolic panel, sleep problems), and recommends screening for depression, a medication review with her physician, and retesting after these are treated.",
              "Several causes could be reversible. Depression: bereavement followed by loss of enjoyment needs a depression screen; treated depression can lift cognitive deficits. Medication: diphenhydramine is anticholinergic and a known cause of confusion in older adults; ask her physician to review it and her other medicines. Medical: thyroid function, vitamin B12 and a metabolic panel, and her sleep. Then retest cognition once these are addressed, before settling on a neurocognitive diagnosis."
            ),
          ],
        },
        {
          text: "Mr. Brandt's daughter asks the psychologist, 'Is there anything we should do now?'",
          ask: "What does the psychologist recommend?",
          parts: [
            part(
              "Recommendations",
              "Gives practical, respectful steps: medical evaluation to establish the cause and treatable factors, safety (driving evaluation, supervised medications, financial safeguards), planning while he can still take part (advance directives, power of attorney), caregiver support, and involving Mr. Brandt in decisions as far as he can.",
              "Ask his physician for a full evaluation to find the cause and anything treatable. Safety now: a formal driving evaluation (he got lost driving), a locked or supervised medication system, and protection of his finances (automatic bill pay, watching for scams). Plan while he can still take part: advance directives, durable power of attorney for health care and finances. Connect the daughter with caregiver support and education. Throughout, include Mr. Brandt in the decisions and explain them to him directly."
            ),
          ],
        },
      ],
    },
    {
      slug: "eppp-strange-situation-classification",
      objective: "Explain attachment theory and attachment patterns and what they predict later in life",
      kind: "build",
      title: "Classify four infants' reunions in the Strange Situation",
      brief:
        "A fictional developmental lab runs Ainsworth's Strange Situation with four 12-month-olds. (A) Ava explores while her mother is there, protests when she leaves, greets her warmly on return, is quickly comforted and goes back to play. (B) Ben explores, shows little distress when his mother leaves, and on reunion looks away and moves off rather than approaching. (C) Cora clings to her mother and barely explores, is very distressed at separation, and on reunion seeks contact but also pushes her away angrily and cannot settle. (D) Dev, on reunion, approaches his mother and then freezes with a dazed expression, then walks toward her backward.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Classify each infant, say what each pattern reflects about caregiving, and what attachment research links them to later.",
          parts: [
            matchPart(
              "Attachment classification",
              "(A) secure, (B) insecure-avoidant, (C) insecure-resistant (ambivalent), (D) disorganized/disoriented. All four right is met; two or three is partly there.",
              "Ava: secure (uses mother as a secure base, comforted on reunion). Ben: insecure-avoidant (minimal distress, avoids on reunion). Cora: insecure-resistant or ambivalent (clings, intense distress, angry and not comforted on reunion). Dev: disorganized/disoriented (contradictory, freezing behavior with no coherent strategy; Main and Solomon's added category).",
              {
                leftHeading: "Infant",
                rightHeading: "Pattern",
                left: ["(A) Ava", "(B) Ben", "(C) Cora", "(D) Dev"],
                right: ["Secure", "Insecure-avoidant", "Insecure-resistant (ambivalent)", "Disorganized/disoriented", "Inhibited temperament"],
                pairs: [0, 1, 2, 3],
              }
            ),
            part(
              "Caregiving and later outcomes",
              "Links each pattern to caregiving (secure: sensitive, responsive; avoidant: consistently rejecting or unresponsive to bids; resistant: inconsistent responsiveness; disorganized: frightening or frightened caregiving, often with maltreatment or unresolved parental trauma) and names later associations as probabilistic (secure with better peer relations and emotion regulation; disorganized with the greatest risk of later behavior problems and dissociation), not deterministic, and notes the role of temperament and culture.",
              "Secure: sensitive, responsive care; associated later with better emotion regulation and peer relationships. Avoidant: care that consistently rebuffs bids for comfort; the infant minimizes attachment signals. Resistant: inconsistent care; the infant maximizes signals to keep the caregiver close. Disorganized: caregiving that is frightening or frightened (often with maltreatment or a parent's unresolved trauma); the strongest later risk of behavior problems and dissociative symptoms. These are probabilities, shaped by later caregiving, temperament and culture, not fixed destinies; one observation of one infant is not a diagnosis."
            ),
          ],
        },
      ],
    },
    // ---------------------------------------------------------- Assessment and diagnosis (16%) -- 2
    {
      slug: "eppp-sem-confidence-interval",
      objective: "Apply classical test theory and item response theory: reliability types, standard error of measurement and confidence intervals",
      kind: "build",
      title: "Put a confidence band around an IQ score",
      brief:
        "A fictional client, Nora, obtains a full-scale score of 104 on an intelligence test whose scores have a mean of 100 and a standard deviation of 15. The manual reports an internal-consistency reliability of .91 for this score. The referral question asks whether her score is reliably above the average range, and a school administrator wants to know 'her exact IQ'.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Compute the standard error of measurement and the 95% confidence interval, match the reliability types, and explain the result to the administrator.",
          parts: [
            numericPart(
              "Standard error of measurement",
              "4.5 (15 times the square root of 1 minus .91) is met; within about 1 is partly there.",
              "SEM = SD x square root of (1 - reliability) = 15 x square root of .09 = 15 x .3 = 4.5 points.",
              { answer: 4.5, tolerance: 0.05, partialTolerance: 1 }
            ),
            numericPart(
              "Width of the 95% band on each side",
              "8.8 (1.96 x 4.5 = 8.82) is met; 9 (rounding 1.96 to 2) is within tolerance; within 2 is partly there.",
              "1.96 x 4.5 = 8.82, so about 8.8 points either side: 104 plus or minus 8.8, roughly 95 to 113. (Using 2 SEM gives 9 points, 95 to 113.)",
              { answer: 8.82, tolerance: 0.5, partialTolerance: 2 }
            ),
            matchPart(
              "Reliability types",
              "All four right is met; two or three is partly there.",
              "Same test twice over time: test-retest. Two equivalent versions: alternate forms. Agreement among items of one administration (coefficient alpha, split-half): internal consistency. Two scorers of the same performance: inter-rater.",
              {
                leftHeading: "Evidence",
                rightHeading: "Reliability type",
                left: ["Same test given twice, three weeks apart", "Form A and Form B given to the same group", "Coefficient alpha from one administration", "Two clinicians scoring the same recorded interview"],
                right: ["Test-retest", "Alternate forms", "Internal consistency", "Inter-rater", "Construct validity"],
                pairs: [0, 1, 2, 3],
              }
            ),
            part(
              "Interpretation for the administrator",
              "Explains that no test gives an exact score: we can be about 95% confident her true score lies between about 95 and 113, which spans the average range, so the data do not show she is reliably above average; and that the band is wide because even good reliability (.91) leaves measurement error.",
              "Every score includes measurement error. With a reliability of .91 the standard error is 4.5 points, so we can say with about 95% confidence that Nora's true score is between about 95 and 113. That band sits across the average range, so the test does not show her to be reliably above average; 104 is a best estimate, not an exact IQ."
            ),
          ],
        },
      ],
    },
    {
      slug: "eppp-base-rates-ppv",
      objective: "Apply base rates, sensitivity, specificity and predictive values, and guard against confirmation bias and other judgment errors",
      kind: "build",
      title: "Work out what a positive screen means in two settings",
      brief:
        "A fictional depression screening questionnaire has a sensitivity of .80 and a specificity of .90 against a structured diagnostic interview. A community mental health clinic, where about 10% of new clients have the disorder, screens 1,000 clients. A primary-care network, where about 2% of patients have it, plans to screen 1,000 patients with the same tool and treat every positive screen as a diagnosis.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Build the two-by-two table for the clinic, compute the predictive values in both settings, and advise the primary-care network.",
          parts: [
            part(
              "The clinic's table",
              "Fills in 100 with the disorder and 900 without; true positives 80, false negatives 20, true negatives 810, false positives 90; 170 positive screens in total.",
              "With the disorder: 100 (10% of 1,000). Sensitivity .80: 80 true positives, 20 false negatives. Without: 900. Specificity .90: 810 true negatives, 90 false positives. Positive screens: 80 + 90 = 170; negative screens: 20 + 810 = 830."
            ),
            numericPart(
              "Positive predictive value at the clinic (%)",
              "About 47% (80 of 170 = 47.1%) is met; within 4 points is partly there.",
              "PPV = true positives / all positives = 80 / 170 = 47.1%. Fewer than half of the positive screens have the disorder. (NPV = 810 / 830 = 97.6%.)",
              { answer: 47.1, tolerance: 1, partialTolerance: 4, unit: "%" }
            ),
            numericPart(
              "Positive predictive value in primary care (%)",
              "About 14% (16 of 114 = 14.0%) is met; within 3 points is partly there.",
              "At 2%: 20 with the disorder (16 true positives, 4 false negatives), 980 without (882 true negatives, 98 false positives). PPV = 16 / (16 + 98) = 16 / 114 = 14.0%. Same test, much lower base rate, far lower PPV.",
              { answer: 14.0, tolerance: 1, partialTolerance: 3, unit: "%" }
            ),
            part(
              "Advice and judgment errors",
              "Advises against treating a positive screen as a diagnosis: about 86% of primary-care positives would be false, so positives should get a full diagnostic assessment; names base-rate neglect as the error, and confirmation bias (seeking only evidence that fits an initial positive result) as a risk in the follow-up interview, with a guard such as structured interviews and considering alternatives.",
              "Do not diagnose from the screen. In primary care about 86 of every 100 positive screens would be false positives, so a positive should lead to a full diagnostic interview. Ignoring the 2% base rate is base-rate neglect. In the follow-up, guard against confirmation bias, looking only for evidence that the positive screen was right: use a structured interview, ask about disconfirming information and alternative explanations (grief, medical causes, substances)."
            ),
          ],
        },
      ],
    },
    // --------------------------------------- Treatment, intervention, prevention and supervision (15%) -- 2
    {
      slug: "eppp-match-ebt",
      objective: "Match evidence-based treatments to common presentations, such as exposure for anxiety and OCD and trauma-focused therapy for PTSD",
      kind: "build",
      title: "Match evidence-based psychotherapies to five presentations",
      brief:
        "A fictional group practice is assigning five new adult clients. (1) A veteran with PTSD after combat, with nightmares, avoidance and guilt-laden beliefs that he 'should have saved' a friend. (2) A woman with obsessive-compulsive disorder who washes her hands for hours after touching door handles. (3) A man with panic disorder who has started avoiding driving on highways. (4) A woman with PTSD after an assault, who avoids reminders and wants to process the memory itself. (5) A man with generalized anxiety disorder who prefers a non-medication treatment.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Match each client to a first-line psychotherapy and give the basis for each recommendation.",
          parts: [
            matchPart(
              "First-line psychotherapy",
              "(1) cognitive processing therapy, (2) CBT with exposure and response prevention, (3) CBT for panic disorder, (4) prolonged exposure, (5) CBT or applied relaxation. Each listed therapy fits only one client here. All five right is met; three or four is partly there.",
              "(1) Cognitive processing therapy: targets trauma-related beliefs such as guilt and self-blame. (2) CBT including exposure and response prevention for OCD. (3) CBT for panic (with interoceptive and situational exposure). (4) Prolonged exposure: imaginal and in vivo exposure to the memory and reminders. (5) CBT or applied relaxation for generalized anxiety disorder.",
              {
                leftHeading: "Client",
                rightHeading: "Psychotherapy",
                left: ["(1) Veteran with guilt-laden PTSD beliefs", "(2) OCD with hours of washing", "(3) Panic disorder avoiding highways", "(4) PTSD, wants to process the memory", "(5) Generalized anxiety, no medication"],
                right: ["Cognitive processing therapy", "CBT with exposure and response prevention", "CBT for panic disorder", "Prolonged exposure", "CBT or applied relaxation", "Psychoanalytic psychotherapy"],
                pairs: [0, 1, 2, 3, 4],
              }
            ),
            part(
              "Basis for the matches",
              "Cites the evidence base: the APA PTSD guideline strongly recommends CBT, cognitive processing therapy, cognitive therapy and prolonged exposure (and conditionally EMDR, brief eclectic psychotherapy and narrative exposure therapy); NICE recommends CBT including ERP for OCD and CBT (or applied relaxation for GAD) for panic and generalized anxiety; notes that both CPT and PE fit either PTSD client and the choice also weighs preference and fit.",
              "PTSD: the American Psychological Association's guideline (2017; summary in American Psychologist 2019) strongly recommends cognitive-behavioral therapy, cognitive processing therapy, cognitive therapy and prolonged exposure, and conditionally recommends brief eclectic psychotherapy, EMDR and narrative exposure therapy. CPT fits the veteran's guilt-laden beliefs and PE the woman's wish to process the memory, but either could serve either, guided by preference. OCD: NICE CG31 recommends CBT including exposure and response prevention. Panic and GAD: NICE CG113 recommends CBT, and for GAD applied relaxation as an alternative high-intensity option."
            ),
          ],
        },
      ],
    },
    {
      slug: "eppp-readiness-alcohol-case",
      objective: "Choose a treatment from research evidence, client characteristics and preferences, and readiness to change",
      kind: "case",
      title: "Fit the intervention to a client's readiness to change drinking",
      brief:
        "Greg, a fictional 52-year-old accountant, is referred by his physician after liver tests came back abnormal. He drinks most evenings. In the first session he says: 'My doctor's overreacting. Everyone in my office drinks like this. I'm here because my wife made me come.'",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "He sits with his arms folded and says he will give it 'one session'.",
          ask: "Identify Greg's stage of change and choose the approach for this session.",
          parts: [
            part(
              "Stage of change",
              "Identifies precontemplation (no intention to change, minimizing the problem, attending because of others), using the transtheoretical model's stages (precontemplation, contemplation, preparation, action, maintenance).",
              "Precontemplation in the transtheoretical (stages of change) model: he sees no problem ('everyone drinks like this'), is not considering change and is here because his wife insisted."
            ),
            part(
              "Approach",
              "Chooses motivational interviewing: express empathy, avoid arguing or labeling, roll with resistance, develop discrepancy between his values or goals and his drinking (for example asking what the liver results mean to him), elicit change talk, and support autonomy; explains why an action-oriented plan now would likely increase resistance.",
              "Motivational interviewing: open questions and reflections, no lecturing or labeling him an alcoholic, which would provoke argument. Roll with resistance ('You feel this has been blown out of proportion'). Explore what matters to him (health, family, work) and gently develop the discrepancy between that and the liver results, eliciting his own reasons for change. Support his autonomy: the decision is his. Pushing an abstinence plan now, before he is considering change, would likely deepen resistance."
            ),
          ],
        },
        {
          text: "Four sessions later Greg says: 'Maybe I should cut down. I don't want my liver to get worse, but I don't know if I can, and evenings are when I unwind.' He asks what his options are, and says he would rather not attend groups.",
          ask: "Now what stage is he in, and how does the plan change?",
          parts: [
            part(
              "Updated stage and plan",
              "Recognizes contemplation (ambivalence: weighing pros and cons) moving toward preparation, continues MI to resolve ambivalence (decisional balance, building confidence), and offers a menu of evidence-based options fitted to his preferences (individual CBT for alcohol use with coping skills for evenings, coordination with his physician about medication for alcohol use disorder and medical monitoring, mutual-help groups offered but not required), and notes that a medically supervised plan is needed if he is physically dependent because withdrawal can be dangerous.",
              "He is in contemplation, ambivalent ('maybe I should' with 'evenings are when I unwind'), moving toward preparation. Keep using MI to resolve the ambivalence: explore both sides, strengthen his confidence. Offer a menu that fits him: individual cognitive-behavioral treatment (planning alternative ways to unwind, managing triggers), a goal he chooses with his physician, and a referral back to the physician about medications for alcohol use and monitoring of his liver. Groups are an option, not a requirement. If he drinks heavily daily, cutting down or stopping should be medically supervised, because alcohol withdrawal can be dangerous."
            ),
          ],
        },
      ],
    },
    // -------------------------------------------------- Research methods and statistics (7%) -- 1
    {
      slug: "eppp-research-design-critique",
      objective: "Appraise internal and external validity and the threats to each",
      kind: "case",
      title: "Critique a study of a new school anxiety program",
      brief:
        "A fictional school district reports that its new anxiety-prevention program 'works'. Students with the highest anxiety scores on a September screening were invited; 60 volunteered at School A and received the 10-week program. School B, across town, served as the comparison: its 60 highest scorers received nothing. In December, School A's participants' anxiety scores had dropped much more than School B's. Twelve School A students dropped out and were excluded. School A also opened a new counseling center in October. Participants knew they were in a program, and the counselors who ran it also scored the December interviews.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "The district asks a psychologist on its advisory board to review the report.",
          ask: "Name the design and the threats to internal validity.",
          parts: [
            part(
              "Design",
              "Identifies a quasi-experimental nonequivalent control group (pretest-posttest) design: two intact schools, no random assignment.",
              "A quasi-experimental nonequivalent control group design with a pretest and posttest: two existing schools, students not randomly assigned to program or control."
            ),
            selectPart(
              "Threats to internal validity",
              "Selects the selection threat (volunteers at a different school), regression to the mean (extreme scorers chosen), attrition (12 dropouts excluded), history (the new counseling center) and experimenter or rater bias (unblinded counselors scoring). The sample size of 60 is not itself an internal validity threat.",
              "Selection: volunteers at School A versus nonvolunteers at School B may differ. Regression to the mean: students chosen for extreme scores tend to score less extremely later, regardless of treatment (though both schools were selected this way, regression can differ between groups). Attrition: excluding 12 dropouts likely removes those who did worst. History: the counseling center opened at School A during the program. Experimenter or rater expectancy: unblinded counselors scored their own students.",
              {
                display: "list",
                lines: [
                  "Students volunteered at School A; School B students did not",
                  "Students were chosen because their September scores were extreme",
                  "Twelve School A students dropped out and were excluded",
                  "School A opened a counseling center in October",
                  "The counselors who ran the program scored the outcome interviews",
                  "Each school contributed 60 students",
                ],
                correct: [0, 1, 2, 3, 4],
              }
            ),
          ],
        },
        {
          text: "The district asks how to test the program properly next year, and whether results would apply to its rural schools, which differ greatly from these two urban ones.",
          ask: "Redesign the study and address external validity.",
          parts: [
            part(
              "Stronger design",
              "Randomly assigns eligible students (or schools, a cluster randomized trial) to program or control (waitlist), uses blind outcome raters, analyzes everyone randomized (intention-to-treat) and reports dropout, and measures follow-up over time.",
              "Randomly assign eligible students within schools, or whole schools in a cluster randomized trial, to the program or a waitlist control, so selection, history and regression affect both groups equally. Outcome interviews by raters who do not know the group. Analyze everyone randomized (intention-to-treat), report who dropped out and why, and follow up after several months to see whether effects last."
            ),
            part(
              "External validity",
              "Explains that results from two urban schools may not generalize to rural students, settings or delivery conditions (population and ecological validity), and proposes testing in rural schools or including them in a multisite trial, while checking that the program is delivered as intended (fidelity).",
              "External validity asks whether results generalize to other people, settings and times. Two urban schools with volunteer high scorers say little about rural schools with different resources, staff and culture. Include rural schools as sites in the trial (or run a replication there), measure delivery fidelity, and report the characteristics of the samples so others can judge fit."
            ),
          ],
        },
      ],
    },
    // -------------------------------------------- Ethical, legal and professional issues (16%) -- 2
    {
      slug: "eppp-ethics-rural-multiple-relationship",
      objective: "Work through an ethical dilemma with a decision-making model, including when ethics and law conflict",
      kind: "case",
      title: "Walk a rural multiple-relationship dilemma through a decision model",
      brief:
        "Dr. Lena Park, a fictional licensed psychologist, is the only psychologist in a small rural town. She is treating Sam, 40, for depression. Sam owns the only auto repair shop within 50 miles. Dr. Park's car breaks down, and Sam offers to fix it 'at cost, as thanks for everything you've done'. Sam's daughter has also just joined the youth soccer team Dr. Park coaches.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "Sam makes the offer at the end of a session, smiling, and says he insists.",
          ask: "Start the decision model: identify the problem and the standards that apply.",
          parts: [
            orderPart(
              "Decision-making model",
              "A sequence close to this is met; one pair swapped is partly there.",
              "A typical decision model: identify the problem, identify the relevant standards and laws, consult, generate options, evaluate consequences for everyone affected, choose and act, then document and evaluate.",
              [
                "Identify the ethical problem and who is affected",
                "Identify the relevant ethics standards, laws and policies",
                "Consult a colleague or ethics resource",
                "Generate possible courses of action",
                "Weigh the likely consequences of each for Sam and others",
                "Choose and carry out a course of action",
                "Document the decision and evaluate the outcome",
              ]
            ),
            part(
              "Standards that apply",
              "Names APA Ethics Code Standard 3.05 (multiple relationships: not unethical unless it could reasonably be expected to impair objectivity or risk exploitation or harm), 3.06 (conflict of interest), and 6.05 (barter only if not clinically contraindicated and not exploitative) by analogy to a discounted service, and notes that in rural practice some overlapping roles are unavoidable.",
              "APA Ethics Code 3.05 Multiple Relationships: taking on a second role with a client is not unethical in itself; it is when it could reasonably be expected to impair the psychologist's objectivity or effectiveness, or risk exploitation or harm. 3.06 Conflict of Interest: avoid roles where personal or financial interests could impair objectivity. A discounted repair is a financial benefit from a client, close to barter (6.05: only if not clinically contraindicated and not exploitative). In a small town, some overlap (the only garage, the only soccer team) is unavoidable, which the analysis has to weigh."
            ),
          ],
        },
        {
          text: "Dr. Park consults a colleague by phone (sharing no identifying details). The nearest other repair shop is 50 miles away; there is no other youth soccer coach.",
          ask: "Choose the course of action and how to carry it out.",
          parts: [
            part(
              "Decision",
              "Declines the discount (it creates a financial benefit and an indebtedness that could affect therapy; paying full price, or having the car towed elsewhere if feasible, avoids it); judges that coaching Sam's daughter is an incidental overlap that can continue if discussed openly and managed (no special treatment, therapy content never discussed at practice); discusses both with Sam in session, attending to how he experiences the refusal of his gift.",
              "Decline the 'at cost' offer kindly: a discount from a client creates a financial benefit and a sense of owing that could shape the therapy. If the car must be fixed at Sam's shop, pay the full ordinary price, as any customer would; otherwise tow it to the shop 50 miles away. Coaching his daughter is an unavoidable small-town overlap; it can continue if discussed openly: they will greet each other at practice only as Sam wishes, nothing from therapy will come up there, and his daughter gets no special treatment. Talk through both in session, including Sam's feelings about the declined gift, which may matter clinically."
            ),
            part(
              "Documentation and monitoring",
              "Documents the dilemma, standards considered, consultation, decision and rationale, and monitors the effects on therapy, revisiting if impairment or harm appears (for example a referral or telepsychology option if the overlap becomes harmful).",
              "Record the situation, the standards considered (3.05, 3.06, 6.05), the consultation, the decision and why. Watch for effects on the therapy and on Sam; if the overlap starts to impair her objectivity or harm him, revisit, including referral or a telepsychology provider from outside the town."
            ),
          ],
        },
      ],
    },
    {
      slug: "eppp-mandated-report-washington",
      objective: "Protect confidentiality and privilege and know their limits, including mandated reporting of abuse",
      kind: "case",
      title: "Apply Washington's child abuse reporting duty in therapy",
      brief:
        "Dr. Amir Haddad, a fictional psychologist licensed in Washington State, sees adult clients. At intake he explained the limits of confidentiality, including that he must report suspected child abuse. On Tuesday afternoon a client, Rick, 38, says that last weekend he 'lost it' and hit his 7-year-old son with a belt hard enough to leave welts, and that it has happened before.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "It is 15:00 on Tuesday, with 20 minutes of the session left.",
          ask: "Does a reporting duty apply, by when, and how does the psychologist handle it with Rick?",
          parts: [
            part(
              "The legal duty",
              "States that Washington's reporting law (RCW 26.44.030) names psychologists as mandated reporters when they have reasonable cause to believe a child has suffered abuse or neglect; that the report goes to law enforcement or the Department of Children, Youth, and Families; and that it must be made at the first opportunity and in no case later than 48 hours after reasonable cause arises.",
              "Yes. RCW 26.44.030 lists psychologists among those who must report when they have reasonable cause to believe a child has suffered abuse or neglect, to law enforcement or to the Department of Children, Youth, and Families. The report is due at the first opportunity and no later than 48 hours after he has reasonable cause, so by Thursday afternoon at the latest, and sooner is better. The source of the information (the parent himself) does not remove the duty."
            ),
            part(
              "Ethics and handling with Rick",
              "Notes that the APA Ethics Code permits disclosure without consent where mandated by law (4.05) and that limits were discussed at the outset (4.02); handles it therapeutically: tells Rick about the report (unless doing so would endanger the child), invites him to be present or make the call with the psychologist, discloses only what the report requires, assesses immediate safety, and documents.",
              "APA Standard 4.05 allows disclosure without consent where the law mandates it, and 4.02 is why he explained this limit at intake. Clinically: tell Rick that this is a report he must make and why, unless telling him would put the boy at greater risk; offer to make the call together; share what the report requires, not his whole record; assess the boy's immediate safety and Rick's plan for this weekend; and document the disclosure, the report, the time and to whom it went."
            ),
          ],
        },
        {
          text: "In the same session, Rick also says that he himself was abused by an uncle when he was a child, 30 years ago. The uncle, now 64, still babysits Rick's sister's young daughters every week.",
          ask: "Does the reporting duty apply to this second disclosure?",
          parts: [
            part(
              "Adult-survivor exception and its limit",
              "Explains that RCW 26.44.030(2) says the duty does not apply to abuse discovered after the child has become an adult, BUT does apply when there is reasonable cause to believe other children are or may be at risk from the accused, so the uncle's weekly access to young children triggers a report; adds that the psychologist should consult (a colleague, the licensing board's guidance or an attorney) when unsure and that laws differ by jurisdiction.",
              "Normally no: RCW 26.44.030(2) says the reporting requirement does not apply to childhood abuse discovered after the person has become an adult. But the same subsection makes an exception when there is reasonable cause to believe other children are or may be at risk from the accused. The uncle babysits young children every week, so the duty applies, again within 48 hours. Explain this to Rick with care, as it touches his own history. When unsure, consult a colleague or an attorney; and remember these rules are Washington's, and other jurisdictions differ."
            ),
          ],
        },
      ],
    },
  ],
};
