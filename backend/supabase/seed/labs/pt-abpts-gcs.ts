import { CLINICAL_SAFETY, part, type SeedLabSet } from "./types";
import { source } from "../sources";

// REQ-151: ABPTS Geriatric Clinical Specialist labs.
//
// Aligned to the ABPTS geriatrics examination outline: knowledge areas
// 15%, professional roles 15%, examination 25%, evaluation/diagnosis/
// prognosis 15%, intervention 25%, outcomes 5%. Density follows the adopted
// hybrid plan unit by unit: 2 / 2 / 3 / 2 / 2 / 1 = 12 labs (7 build,
// 5 case).
//
// Every patient, family member and facility is fictional; exam practice,
// not clinical guidance. Thresholds quoted were checked on 2026-11-07
// against publisher abstracts (Europe PMC) or official documents:
//   - Cruz-Jentoft 2019, EWGSOP2, Age Ageing doi:10.1093/ageing/afy169
//     (grip strength below 27 kg men / 16 kg women; five chair stands
//     longer than 15 s; gait speed 0.8 m/s or less marks severity; SARC-F
//     4 or more triggers assessment) -- cut-offs confirmed against two
//     papers applying EWGSOP2 because the consensus page itself was behind
//     a browser check.
//   - World Falls Guidelines 2022 (Montero-Odasso, Age Ageing
//     doi:10.1093/ageing/afac205), as already verified in
//     seed/tracks/pt-abpts.ts: gait speed below 0.8 m/s or TUG over 15 s;
//     high-risk criteria; exercise 3 or more times a week for at least
//     12 weeks; hip-fracture programme.
//   - Freeman 2011 consensus on orthostatic hypotension (Clin Auton Res
//     doi:10.1007/s10286-011-0119-5) and SP-OH: a fall of 20 mm Hg
//     systolic or 10 mm Hg diastolic within 3 minutes of standing.
//   - Inouye 1990, Confusion Assessment Method, Ann Intern Med
//     doi:10.7326/0003-4819-113-12-941 (acute onset/fluctuation AND
//     inattention AND either disorganized thinking OR altered level of
//     consciousness).
//   - Bellelli 2014, 4AT, Age Ageing doi:10.1093/ageing/afu021 (4 or more:
//     possible delirium; 1-3: possible cognitive impairment).
//   - Nasreddine 2005, MoCA, J Am Geriatr Soc
//     doi:10.1111/j.1532-5415.2005.53221.x (cut-off 26).
//   - Fried 2001 frailty phenotype, J Gerontol A
//     doi:10.1093/gerona/56.3.m146 (3 or more of: unintentional weight loss,
//     exhaustion, weakness, slow walking, low activity; weakness is grip
//     in the lowest 20% by sex and BMI -- for women 17 to 21 kg -- not the
//     EWGSOP2 16 kg line).
//   - Singer 2016, Sepsis-3, JAMA doi:10.1001/jama.2016.0287 (qSOFA: RR
//     22/min or more, altered mentation, SBP 100 mm Hg or less; 2 or more).
//   - Perera 2006, J Am Geriatr Soc doi:10.1111/j.1532-5415.2006.00701.x
//     (small / substantial meaningful change: gait speed 0.05 / 0.10 m/s,
//     6MWT 20 / 50 m, SPPB 0.5 / 1.0 points).
//   - Donoghue & Stokes 2009, Berg MDC, J Rehabil Med
//     doi:10.2340/16501977-0337 (4 points for 45-56, 5 for 35-44, 7 for
//     25-34, 5 for 0-24).
//   - Wrisley & Kumar 2010, FGA, Phys Ther doi:10.2522/ptj.20090069
//     (22/30 or less classifies fall risk in community-dwelling older
//     adults).
//   - Bull 2020, WHO 2020 physical activity guidelines, Br J Sports Med
//     doi:10.1136/bjsports-2020-102955 (150-300 min moderate or 75-150 min
//     vigorous aerobic activity a week; muscle strengthening for all ages).
//   - Fragala 2019, NSCA position statement on resistance training for
//     older adults, J Strength Cond Res doi:10.1519/JSC.0000000000003230.
//   - McDonough 2021, Hip Fracture CPG, JOSPT doi:10.2519/jospt.2021.0301.
//   - AGS 2023 Beers Criteria, J Am Geriatr Soc doi:10.1111/jgs.18372.
//   - Appelbaum 2007, NEJM doi:10.1056/NEJMcp074045 (four abilities:
//     understanding, appreciation, reasoning, expressing a choice).
//   - OSTEO-CPG, FRID, SP-SARC, SP-DEL, SP-POLY, SP-EA as cited in
//     seed/tracks/pt-abpts.ts.
// Not used because unverified on the day: specific heart-failure daily
// weight-gain thresholds (rubrics say "the threshold the cardiology team
// set"); percent-1RM prescriptions (rubrics accept any sourced dosing that
// is progressive and uses an RPE or repetition-maximum anchor).

export const ABPTSGCS_LABS: SeedLabSet = {
  trackCode: "ABPTSGCS",
  sources: [
    source("https://specialization.apta.org/become-a-specialist/geriatrics/specialist-certification-examination-outline-geriatrics", "exam_outline", "2026-11-07"),
    source("https://specialization.apta.org/become-a-specialist/geriatrics", "exam_outline", "2026-11-07"),
  ],
  labs: [
    // ------------------------------------------------------------------
    // Unit 1: Knowledge areas (2)
    // ------------------------------------------------------------------
    {
      slug: "gcs-medication-list-and-falls",
      objective: "Pharmacology in older adults: polypharmacy, fall-risk medications and exercise interactions",
      kind: "build",
      title: "Reading a medication list for falls and exercise risk",
      brief:
        "A fictional 81-year-old woman is referred to outpatient physical therapy after two falls in 3 months, one with a wrist fracture. Medication list (9 regular medicines): metoprolol, amlodipine, furosemide, lorazepam 1 mg at night ('for sleep, for years'), amitriptyline 25 mg at night ('for nerve pain'), oxybutynin, metformin, a glipizide-type sulfonylurea, and over-the-counter diphenhydramine 'when I can't sleep'. She reports light-headedness when she stands, dry mouth and some constipation. Fictional patient; exam practice, not clinical guidance.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the pharmacology section of your evaluation: which medicines raise her fall risk and how, what they change about how you examine and dose exercise, and what you communicate to the prescriber.",
          parts: [
            part(
              "Fall-risk medicines",
              "Identifies polypharmacy (5 or more regular medicines) and names the fall-risk-increasing drugs with their mechanism: the benzodiazepine (lorazepam) and sedating antihistamine (diphenhydramine) for sedation and impaired balance; the tricyclic (amitriptyline) and oxybutynin for anticholinergic effects (confusion, blurred vision, orthostasis) -- all on the AGS Beers list of medicines to avoid in older adults; the antihypertensives and diuretic for orthostatic hypotension; and the sulfonylurea for hypoglycemia.",
              "Nine regular medicines is polypharmacy, and several are fall-risk-increasing drugs that the AGS Beers Criteria say to avoid in older adults: lorazepam (benzodiazepine: sedation, slowed reactions, imbalance), diphenhydramine and amitriptyline (strongly anticholinergic plus sedation), oxybutynin (anticholinergic). Metoprolol, amlodipine and furosemide together can drop her standing blood pressure -- which fits her light-headedness -- and the sulfonylurea can cause hypoglycemia, another fall mechanism."
            ),
            part(
              "Examination and exercise dosing",
              "Adjusts the examination and prescription: measures orthostatic blood pressure (supine at least 5 minutes, then standing, with a drop of 20 mm Hg systolic or 10 mm Hg diastolic within 3 minutes defining orthostatic hypotension), uses rating of perceived exertion rather than heart rate to dose aerobic work because the beta-blocker blunts heart rate, checks glucose symptoms and timing of exercise relative to meals and the sulfonylurea, and builds slow position changes and supported balance work into sessions.",
              "Take orthostatic vitals at the first visit (lie 5 minutes, then stand; a 20 systolic or 10 diastolic drop within 3 minutes is orthostatic hypotension) and at each change of medication. Dose aerobic work by RPE and talk test because metoprolol blunts her heart rate. Schedule sessions after a meal, ask about shakiness or sweating, and keep a glucose source in the clinic. Teach slow, staged position changes and start balance work with support."
            ),
            part(
              "Communication to the prescriber",
              "Writes to the prescriber recommending a structured medication review and deprescribing of fall-risk-increasing drugs as a core falls intervention (benzodiazepine taper, alternatives to the anticholinergics and sedating antihistamine, review of blood-pressure and glucose-lowering targets), reporting the orthostatic measurements and the fall history, and asking for timing of any changes so the exercise program can be adjusted.",
              "To the prescriber: two falls in 3 months with a fracture, orthostatic drop measured in clinic, and a list containing lorazepam, amitriptyline, oxybutynin and diphenhydramine. Request a structured medication review with deprescribing in mind -- a supervised benzodiazepine taper, alternatives to the anticholinergics and the antihistamine, and a check of her blood-pressure and glucose targets given the orthostasis. Ask to be told when changes are made so the balance program can be adjusted."
            ),
          ],
        },
      ],
    },
    {
      slug: "gcs-ewgsop2-pathway",
      objective: "Explain sarcopenia using the EWGSOP2 find-assess-confirm-severity pathway, with handgrip strength as a key strength measure that also predicts length of stay, functional loss and death",
      kind: "build",
      title: "Running the EWGSOP2 pathway on one patient",
      brief:
        "A fictional 79-year-old retired teacher attends a community falls-prevention clinic. SARC-F questionnaire: strength 2, walking assistance 1, rising from a chair 2, climbing stairs 1, falls 0 (total 6 of 10). Handgrip (best of three, dominant hand): 24 kg. Five-times sit-to-stand: 17.5 seconds. Usual gait speed over 4 m: 0.72 m/s. He weighs 68 kg, is 1.78 m tall, and a DXA scan ordered by his physician reports appendicular skeletal muscle mass below the sex-specific cut-off. Fictional patient; exam practice, not clinical guidance.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Work through the EWGSOP2 pathway step by step for this man, state the conclusion with the cut-offs that support it, and write what you would prescribe and refer.",
          parts: [
            part(
              "Find and assess",
              "Applies the pathway in order: SARC-F 6 (4 or more) is a positive case-finding screen that triggers assessment; grip 24 kg is below the male cut-off of 27 kg and five chair stands 17.5 s is longer than 15 s, so muscle strength is low and sarcopenia is 'probable', which is enough to start intervention and look for causes.",
              "Find: SARC-F 6 is at or above the 4-point trigger, so assess. Assess strength: grip 24 kg is below the 27 kg male cut-off, and 17.5 s for five chair stands is over 15 s -- low strength on both, so this is probable sarcopenia, which already justifies treatment and a search for causes."
            ),
            part(
              "Confirm and severity",
              "Uses the DXA finding of low appendicular skeletal muscle mass to confirm sarcopenia, and the gait speed of 0.72 m/s (0.8 m/s or less) as low physical performance that classifies it as severe sarcopenia; notes that the same gait speed flags falls risk.",
              "Confirm: DXA shows low appendicular muscle mass, so sarcopenia is confirmed. Severity: usual gait speed 0.72 m/s is at or below 0.8 m/s, so performance is low -- severe sarcopenia. The same 0.72 m/s also puts him in the falls-risk range."
            ),
            part(
              "Prescription and referral",
              "Prescribes progressive resistance training as the primary treatment (2-3 days a week, major muscle groups, progressed by load with an RPE or repetition-maximum anchor, adding power-type training and balance work), couples it with nutrition review (protein intake, vitamin D status) via the physician or dietitian, screens for secondary causes (inactivity, disease, malnutrition), and sets reassessment of grip, chair stand and gait speed.",
              "Progressive resistance training is the main treatment: 2-3 sessions a week on the big muscle groups, loads progressed so the last reps are hard (RPE or repetition-maximum anchored), add high-velocity, low-load power work (fast sit-to-stand, step-ups) and balance training 3 times a week. Ask his physician for a nutrition review (protein, vitamin D) and a look for causes such as inactivity or disease. Re-measure grip, five-times sit-to-stand and gait speed at 12 weeks."
            ),
          ],
        },
      ],
    },

    // ------------------------------------------------------------------
    // Unit 2: Professional roles (2)
    // ------------------------------------------------------------------
    {
      slug: "gcs-refusing-discharge-destination",
      objective: "Advocacy, ethics and consent with older adults, including capacity and surrogate decision-making",
      kind: "case",
      title: "She wants to go home; the team says she cannot",
      brief:
        "A fictional 84-year-old widow is on day 9 after a hip fracture repair in an acute hospital. She has mild dementia (lives alone with a daughter visiting twice a week). The team recommends a skilled nursing facility; she says she is going home. Fictional patient and family; exam practice, not clinical guidance.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "In your session she transfers with moderate assistance, walks 8 m with a walker and contact guard, and cannot say how she would manage the stairs to her bedroom, but she explains clearly that she would 'rather risk a fall at home than live in a facility' and that her late husband died in a nursing home. The daughter wants the facility 'for her own good'. The resident asks you whether the patient 'has capacity'.",
          ask: "Answer the resident's question properly, and say what your role in the decision is.",
          parts: [
            part(
              "Capacity",
              "Explains that capacity is decision-specific and presumed, that a diagnosis of dementia does not remove it, and describes the four abilities a formal assessment looks for -- understanding the relevant information, appreciating how it applies to her situation, reasoning about options, and expressing a consistent choice -- noting that the formal determination is made by the physician/team (or the jurisdiction's process), while the therapist contributes observations about her understanding of her mobility and risks.",
              "Capacity is specific to this decision and presumed until shown otherwise -- mild dementia alone does not remove it. The team (physician, with ethics or psychiatry if needed) decides formally by checking four abilities: does she understand the information about her mobility and risks, appreciate that it applies to her, reason through the options, and express a steady choice? She reasons clearly about her values and has been consistent, which supports capacity, but she cannot yet describe how she would manage the stairs, which is my observation to feed back."
            ),
            part(
              "Your role",
              "Describes the therapist's role: give the patient and team accurate, concrete information about her current function and risks (what she can and cannot do, what help she would need), explore what a safe-enough home plan would require (equipment, downstairs living, home health, daily help), advocate for her stated values and autonomy including the right to make a risky choice if she has capacity, and avoid taking sides with the daughter against her.",
              "My job is to make the picture concrete for everyone: today she needs moderate help to transfer and a person beside her to walk 8 m, so going home means ground-floor living, a commode, a hospital bed, rails, home health and someone with her for most of the day at first. I will lay out what a home plan needs, say honestly what the risk is, support her right to choose it if she has capacity, and help the daughter see that respecting her mother's values is not neglect."
            ),
          ],
        },
        {
          text: "The team determines she has capacity for this decision. She chooses to go home with home health and the daughter arranges a paid carer for mornings. At the first home visit two weeks later you find her thin and dehydrated-looking, in soiled clothing, with no food in the kitchen except biscuits; she says the carer 'comes some days'. There is a bruise on her upper arm she cannot explain. Her bank card is missing and the daughter has 'taken over the accounts'.",
          ask: "What concerns does this raise and what do you do?",
          parts: [
            part(
              "Concerns",
              "Recognizes possible elder abuse or neglect -- neglect (inadequate food, hygiene, unreliable care), possible physical abuse (unexplained bruise) and possible financial exploitation (missing card, control of accounts) -- in a person who is dependent on carers, and that these are reportable concerns, not conclusions.",
              "Signs of possible neglect (no food, soiled clothing, a carer who does not reliably come), possible physical abuse (an unexplained bruise) and possible financial exploitation (missing bank card, the daughter now controlling accounts) in a dependent older adult. These are concerns to report and investigate, not accusations."
            ),
            part(
              "Action",
              "Acts as a mandated reporter under the applicable state law and agency policy: reports to adult protective services (and emergency services if she is in immediate danger), documents objective findings and her own words, addresses urgent medical needs (dehydration, nutrition) via the physician or emergency services, informs the home health agency, and does not confront the suspected person or promise secrecy.",
              "Report today to adult protective services as my state law and agency policy require, and call emergency services if she is in immediate danger. Document exactly what I saw and what she said, without interpretation. Get her medical needs seen now (dehydration, nutrition) through the physician or the emergency department. Tell my agency supervisor, and do not confront the daughter or the carer or promise to keep anything secret."
            ),
          ],
        },
      ],
    },
    {
      slug: "gcs-choose-the-measures",
      objective: "Evidence-based practice and outcome measurement in geriatric rehabilitation",
      kind: "build",
      title: "Choose the measures for a home-health caseload",
      brief:
        "You lead a fictional home-health therapy team that sees older adults after hospitalization. The agency director asks you to pick a core set of standardized measures that every therapist will use at admission and discharge to show outcomes to payers and to guide care. The caseload is mixed: post-hospital deconditioning, hip fracture, heart failure, Parkinson disease and dementia. Measures must be feasible in a home with no equipment beyond a chair, a stopwatch and a tape measure. Fictional agency; exam practice, not clinical guidance.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Propose the core set with the reason for each measure, the figures therapists should use to judge real change, and what you will do about patients who cannot complete a measure.",
          parts: [
            part(
              "Core set and rationale",
              "Chooses a small feasible set covering strength, balance, gait/mobility and self-report, each with a reason: for example usual gait speed over 4 m (predicts falls, hospitalization and survival; feasible anywhere), the Short Physical Performance Battery or five-times sit-to-stand (lower-limb strength and function), the Timed Up and Go (mobility and falls screening), and a self-report or patient-specific measure (for example the Patient-Specific Functional Scale or a falls-efficacy scale); explains that the set should be short enough to be used consistently.",
              "Four measures, all possible in a living room: usual gait speed over 4 m (the single most useful number -- it predicts falls, hospitalization and survival), the Short Physical Performance Battery (balance, gait speed and chair stands in one 12-point score, so strength is covered), the Timed Up and Go (mobility and a falls screen) and the Patient-Specific Functional Scale for the person's own goals, plus the short FES-I when fear of falling is an issue. Short enough that every therapist does it every time."
            ),
            part(
              "Judging real change",
              "States sourced meaningful-change figures for the measures chosen: for older adults, gait speed about 0.05 m/s small and 0.10 m/s substantial, SPPB about 0.5 small and 1.0 point substantial, 6-minute walk about 20 m small and 50 m substantial (Perera 2006); or, if the Berg is chosen, the MDC of 4-7 points depending on the baseline score; explains that change smaller than measurement error is not change.",
              "Give therapists the numbers: gait speed -- a change of 0.05 m/s is small but meaningful and 0.10 m/s is substantial; SPPB -- 0.5 point small, 1 point substantial; if a 6-minute walk is possible, 20 m small and 50 m substantial (Perera 2006). If they use the Berg, a true change needs at least 4 points for scores of 45-56, 5 for 35-44 and 7 for 25-34 (Donoghue & Stokes 2009). Anything smaller is noise, not progress."
            ),
            part(
              "Floor effects and non-completion",
              "Plans for patients who cannot do a measure: record the reason and use the ceiling/floor alternative (for example SPPB components scored 0 rather than 'not done', a lower-level measure such as sitting balance or a transfer scale for the most impaired, and a cognitive-friendly protocol with demonstration for dementia), so outcomes are still comparable and the data are not biased toward the fittest patients.",
              "If someone cannot walk 4 m, score that SPPB item 0 rather than leaving it blank, and add a lower-level measure (sitting balance, transfer assistance level) so the most impaired patients still show change. For dementia, use demonstration and one-step instructions. Record the reason for any item not attempted so the outcome data do not quietly drop the frailest people."
            ),
          ],
        },
      ],
    },

    // ------------------------------------------------------------------
    // Unit 3: Examination (3)
    // ------------------------------------------------------------------
    {
      slug: "gcs-multifactorial-falls-assessment",
      objective: "Fall-risk and balance examination with standardized measures and their cut-off scores",
      kind: "case",
      title: "Two falls in a year: the multifactorial assessment",
      brief:
        "A fictional 77-year-old woman is referred after falling twice in the past 12 months; the second fall, in the bathroom at night, left her on the floor for about 90 minutes before her neighbor found her, with bruising but no fracture. Fictional patient; exam practice, not clinical guidance.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "History: both falls were at night getting up to the toilet; she felt 'woozy' on standing. She is afraid of falling again and has stopped going to her choir. Medicines include a diuretic and an antihypertensive. Lives alone in a two-story house.",
          ask: "Stratify her falls risk using the World Falls Guidelines and justify the category, and list the components your multifactorial assessment must include.",
          parts: [
            part(
              "Risk stratification",
              "Classifies her as high risk under the World Falls Guidelines because of 2 or more falls in 12 months and a long lie (an hour or more on the floor), and notes that fear of falling and activity restriction add to the case for a comprehensive multifactorial assessment.",
              "High risk: two falls in 12 months and a lie of about 90 minutes without being able to get up both meet the World Falls Guidelines' high-risk criteria (injury, 2 or more falls, frailty, a lie of an hour or more, or suspected loss of consciousness). Fear of falling and withdrawing from choir confirm this needs the full multifactorial assessment."
            ),
            part(
              "Assessment components",
              "Lists a multifactorial assessment: fall history and circumstances, gait and balance testing (gait speed, TUG, a balance measure), orthostatic blood pressure, medication review for fall-risk-increasing drugs, vision, feet and footwear, fear of falling (FES-I), cognition and mood, continence and nocturia, home hazards, and the ability to get up from the floor.",
              "Cover every domain: the circumstances of each fall (both nocturnal, both after standing), gait speed, TUG and a balance measure, lying and standing blood pressure, her medication list (diuretic and antihypertensive), vision, feet and footwear, fear of falling with the short FES-I, cognition and mood screens, bladder habits and nocturia, home hazards including the route to the bathroom, and whether she can get up from the floor."
            ),
          ],
        },
        {
          text: "Findings: usual gait speed 0.64 m/s; Timed Up and Go 16.8 s; Berg Balance Scale 43/56; five-times sit-to-stand 19 s; orthostatic BP: supine 146/82, standing at 1 minute 118/70 with symptoms; short FES-I 20/28; she cannot get up from the floor without furniture; MoCA 27/30; she wears loose slippers at night; the bathroom is down an unlit hallway.",
          ask: "Interpret the measures against their cut-offs and name the modifiable risk factors in priority order.",
          parts: [
            part(
              "Interpretation",
              "Interprets each result: gait speed 0.64 m/s is below the 0.8 m/s risk threshold; TUG 16.8 s exceeds the 15 s alternative threshold; a Berg score of 43 indicates impaired balance (and change will need at least 5 points to be real at this level); the orthostatic drop of 28 mm Hg systolic within 3 minutes with symptoms is orthostatic hypotension; high fear of falling; cognition within the normal range on MoCA.",
              "Gait speed 0.64 m/s is under the 0.8 m/s falls-risk threshold and the TUG of 16.8 s is over 15 s -- both flag risk. Berg 43/56 shows impaired balance (a true change at this level needs 5 points). Systolic BP fell 28 mm Hg within a minute of standing with symptoms: orthostatic hypotension, which fits the nocturnal 'woozy' falls. Short FES-I 20 is high fear. MoCA 27 is normal, so she can learn and follow a program."
            ),
            part(
              "Priorities",
              "Ranks the modifiable factors: orthostatic hypotension with nocturnal falls (medication review and timing, slow staged rising, fluids per physician), strength and balance deficits (exercise), environmental and behavioral night-time risks (lighting, path to bathroom, footwear, bedside commode or urinal), fear of falling and activity restriction, and floor-rise inability (training and an alarm or pendant for long lies).",
              "1) The orthostatic drop behind the night-time falls -- ask the physician to review the diuretic and antihypertensive and their timing, teach sit-then-stand with a pause and ankle pumps. 2) Strength and balance (slow gait, long chair-stand time, Berg 43) -- a progressive balance and strength program. 3) The night route: motion-sensor lighting, a clear path, firm closed-back footwear, a bedside commode for now. 4) Fear and avoidance -- graded return to choir with the program. 5) Teach floor-rise technique and arrange a pendant alarm so a long lie never happens again."
            ),
          ],
        },
      ],
    },
    {
      slug: "gcs-post-op-day-2-confusion",
      objective: "Cognitive, mental-health and delirium screening within the physical therapy examination",
      kind: "build",
      title: "Post-op day 2: is this delirium?",
      brief:
        "A fictional 86-year-old man is 2 days after hemiarthroplasty for a hip fracture. Yesterday he was alert, conversational and followed two-step commands; the nurse's note from the night shift says he was 'pulling at his IV and did not know where he was'. This morning he is drowsy, drifts off mid-sentence, cannot recite the months of the year backwards past October, and when asked why he is in hospital says he is 'waiting for the bus'. His daughter says he has never been like this and has 'a sharp memory'. He has had opioid analgesia overnight, and his chart shows no bowel movement since admission and low urine output. Fictional patient; exam practice, not clinical guidance.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Apply a bedside delirium screen and interpret it, decide what you do with your session, and write what you report and to whom.",
          parts: [
            part(
              "Screen and interpretation",
              "Applies the Confusion Assessment Method (or 4AT) and shows the features: acute onset and fluctuating course (fine yesterday, disturbed overnight, drowsy now), inattention (months backwards failure), plus disorganized thinking ('waiting for the bus') and/or altered level of consciousness (drowsy) -- the CAM algorithm is positive (feature 1 and 2 plus 3 or 4), or the 4AT would score 4 or more; concludes probable delirium, likely hypoactive/mixed, not dementia.",
              "CAM: feature 1 (acute onset and fluctuation -- normal yesterday, agitated overnight, drowsy now) present; feature 2 (inattention -- fails months backwards) present; feature 3 (disorganized thinking -- 'waiting for the bus') and feature 4 (altered consciousness -- drowsy) both present. CAM positive. On the 4AT, abnormal alertness alone scores 4, so it is also 4 or more. This is delirium, mixed hyperactive-hypoactive, in a man with no baseline cognitive impairment."
            ),
            part(
              "The session",
              "Modifies rather than abandons mobility: avoids complex instruction, uses simple one-step cues and demonstration, keeps him safe (two people, gait belt, no unsupervised standing), focuses on orientation, sitting out of bed, and basic transfers if he can attend, and recognizes that immobility worsens delirium while unsafe mobility risks a fall.",
              "Do not cancel, do simplify: one-step instructions, demonstration, orientation to place and time, glasses and hearing aids on, curtains open. Aim for sitting out of bed and a supported stand or transfer with two people and a gait belt if he can attend for it; no walking he cannot concentrate for. Staying in bed will make the delirium worse; a fall would be worse still."
            ),
            part(
              "Report",
              "Reports the positive screen promptly to the nurse and medical team as a medical problem with likely reversible contributors (opioids, constipation, possible dehydration or retention, pain, infection, hypoxia) so they are addressed, documents the CAM/4AT findings, and involves the daughter in reorientation and familiar objects.",
              "Tell the nurse and the medical team now: new delirium, CAM positive, with obvious things to check -- opioid dose, constipation (no bowel movement since admission), hydration and urine output or retention, pain control, infection, oxygen saturation, sleep. Document the screen in the chart. Ask the daughter to bring his glasses, hearing aids, photographs and to sit with him during the day."
            ),
          ],
        },
      ],
    },
    {
      slug: "gcs-vitals-before-exercise-multimorbid",
      objective: "Cardiopulmonary and vital-sign examination in frail and multimorbid older adults",
      kind: "build",
      title: "Vital signs before a frail patient exercises",
      brief:
        "A fictional 83-year-old man with heart failure with reduced ejection fraction, COPD and type 2 diabetes starts outpatient therapy for deconditioning after a hospital admission for heart failure. Medicines include a beta-blocker, a loop diuretic, an ACE inhibitor and inhalers. Today, seated: blood pressure 104/62 mm Hg, heart rate 58 regular, respiratory rate 20, SpO2 91% on room air, temperature normal, weight 79.4 kg (discharge weight 10 days ago 77.0 kg). He says his ankles are 'a bit puffy' and he slept on three pillows last night. Fictional patient; exam practice, not clinical guidance.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write your vital-sign and cardiopulmonary examination plan for him, interpret today's findings, and decide whether he exercises today.",
          parts: [
            part(
              "Examination plan",
              "Plans a full baseline: resting and orthostatic blood pressure (lie-to-stand with the 20/10 mm Hg within 3 minutes definition), heart rate and rhythm regularity, respiratory rate and pattern, SpO2 at rest and during activity, auscultation for crackles and wheeze, edema and jugular venous pressure where skilled, body weight trend against the heart-failure team's threshold, symptoms (orthopnea, dyspnea on exertion), and uses RPE and dyspnea scales because the beta-blocker blunts heart-rate response.",
              "Baseline every visit: seated BP and HR, then lying-to-standing BP (orthostatic if it drops 20 systolic or 10 diastolic within 3 minutes), rhythm regularity, respiratory rate, SpO2 at rest and walking, lung sounds (crackles, wheeze), ankle edema, weight on the same scale, and symptoms -- orthopnea, breathlessness, dizziness. Because of the beta-blocker, dose and monitor exercise by RPE and a dyspnea scale rather than heart rate."
            ),
            part(
              "Interpretation",
              "Interprets today as probable early heart-failure decompensation: weight up 2.4 kg in 10 days, new orthopnea (three pillows), ankle edema, with borderline low blood pressure and resting SpO2 of 91% (within or near his COPD target range, so not alarming alone) -- a pattern that needs same-day contact with the heart-failure team against the weight threshold they set.",
              "Weight up 2.4 kg since discharge, new three-pillow orthopnea and ankle swelling -- that is fluid retention and probable early decompensation, whatever the exact daily-weight threshold his heart-failure team set. BP 104/62 is on the low side on his medicines, HR 58 reflects the beta-blocker, and SpO2 91% is not alarming on its own in COPD, but together the picture says he is not stable today."
            ),
            part(
              "Decision",
              "Defers the planned exercise session, contacts the heart-failure team or physician the same day with the specific findings (weight change, orthopnea, edema, vitals), gives the patient clear instructions on what to do if symptoms worsen (and emergency services for severe breathlessness or chest pain), and plans to resume with a re-screen once he is reviewed.",
              "No exercise session today. Call his heart-failure nurse or physician now with the numbers: +2.4 kg in 10 days, orthopnea, edema, BP 104/62, SpO2 91%. Tell him to call emergency services for breathlessness at rest, chest pain or fainting, and to expect a medication review. Re-screen at the next visit and start with light, monitored activity once the team confirms he is back at his dry weight."
            ),
          ],
        },
      ],
    },

    // ------------------------------------------------------------------
    // Unit 4: Evaluation, diagnosis and prognosis (2)
    // ------------------------------------------------------------------
    {
      slug: "gcs-hip-fracture-prognosis",
      objective: "Prognosis in frailty, failure to thrive, post-hospitalization deconditioning and after hip or pelvic fracture",
      kind: "case",
      title: "Prognosis after a hip fracture in a frail 88-year-old",
      brief:
        "A fictional 88-year-old woman is on postoperative day 1 after an intramedullary nail for an intertrochanteric fracture; the surgeon has written 'weight-bearing as tolerated'. Fictional patient; exam practice, not clinical guidance.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "Before the fall she walked outdoors with a stick, had lost about 5 kg in the past year without trying, 'felt exhausted most days', and had slowed noticeably. Grip strength today is 14 kg. She lives with her son, who works full time. Cognition is intact. Pain is controlled with the current regimen.",
          ask: "State her frailty status and what it means for prognosis, and write your day-1 plan and expected trajectory.",
          parts: [
            part(
              "Frailty and prognosis",
              "Applies the Fried phenotype: unintentional weight loss, exhaustion, weakness (grip 14 kg, below Fried's BMI-adjusted female cut-offs of 17-21 kg) and slowness -- 3 or more criteria, so she is frail -- and explains that frailty after hip fracture predicts slower recovery, higher complication and institutionalization risk, so expectations are set realistically but the plan is still active and progressive.",
              "She meets at least four of the five Fried criteria -- unintentional weight loss, exhaustion, weak grip (14 kg is below Fried's cut-off for women, 17 to 21 kg depending on BMI) and slowing -- so she is frail. Frailty means recovery after hip fracture is slower and riskier (complications, needing residential care), so I would tell her and her son honestly that regaining outdoor walking with an aid is possible but will take months of structured rehabilitation, with a realistic early goal of safe indoor mobility."
            ),
            part(
              "Day-1 plan",
              "Starts early mobilization on day 1 as the hip fracture guidance recommends: out of bed, transfers and walking with a frame weight-bearing as tolerated, progressive exercise for standing up, balance and walking, pain-coordinated sessions, breathing and circulation measures, and planning for continued structured exercise after discharge.",
              "Mobilize today: sit out, stand and take steps with a frame, weight-bearing as tolerated, timed with analgesia. Begin the exercise program that continues for months -- sit-to-stand, supported balance, walking distance progressions -- plus deep breathing and ankle pumps. Start discharge planning now, because her son's work hours decide where the next stage happens."
            ),
          ],
        },
        {
          text: "Day 5: she walks 15 m with a frame and supervision, needs minimal help with transfers, has a Timed Up and Go of 38 seconds and is eating little. The team must decide between an inpatient rehabilitation unit, a skilled nursing facility and home with home health; her son can be home only evenings and weekends.",
          ask: "Recommend a setting and justify it, and set the measurable goals for the next 6 weeks.",
          parts: [
            part(
              "Setting",
              "Recommends an inpatient or facility-based rehabilitation setting because she cannot yet be safe alone during the day (supervision for walking, help with transfers, poor intake, frailty), while arguing for a setting that delivers daily progressive rehabilitation rather than custodial care, and keeps home with home health as the goal once she is safe for the hours alone.",
              "She cannot be alone for 9 hours a day yet: supervised walking, help with transfers and poor eating in a frail 88-year-old make home unsafe for now. Recommend a rehabilitation setting that provides daily structured exercise -- not just custodial care -- with the explicit plan to transition home with home health and a morning carer once she transfers alone and walks safely indoors."
            ),
            part(
              "Goals",
              "Sets measurable goals: independent transfers, indoor walking with an aid over a set distance, a target TUG improvement, a strength and balance program continuing 3 or more times a week, nutrition review for intake and protein, and criteria for discharge home, with reassessment points.",
              "Six-week goals: independent bed and chair transfers; walking 50 m indoors with a frame or stick independently; TUG under 25 s from 38 s; standing up from a chair without using the arms three times; a progressive strength, balance and walking program at least three times a week that continues at home; dietitian review for protein and calories. Reassess at 2 and 4 weeks."
            ),
          ],
        },
      ],
    },
    {
      slug: "gcs-when-to-stop-and-refer",
      objective: "Recognizing conditions requiring medical referral: sepsis, dehydration, electrolyte imbalance and acute cardiac events",
      kind: "case",
      title: "A home visit that is not about exercise",
      brief:
        "A fictional home-health physical therapist arrives for a scheduled visit with an 80-year-old woman recovering from a urinary infection and deconditioning. Fictional patient; exam practice, not clinical guidance.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "She is slower to answer than last week, mixes up the day and asks the same question twice. Vital signs: temperature 38.1 C, heart rate 112, respiratory rate 24, blood pressure 96/58, SpO2 95%. Skin is warm. She finished her antibiotics 2 days ago and says she 'feels off'.",
          ask: "What do these findings mean and what do you do before you leave the house?",
          parts: [
            part(
              "Recognition",
              "Recognizes probable sepsis in an older adult with a recent infection: altered mentation plus respiratory rate 22/min or more plus systolic BP 100 mm Hg or less -- all three qSOFA criteria (2 or more is positive) -- with fever and tachycardia, and that confusion is often the first sign in older adults.",
              "This is possible sepsis until proven otherwise. She scores 3 of 3 on qSOFA -- new confusion, respiratory rate 24 (22 or more), systolic 96 (100 or less) -- plus fever and a heart rate of 112, two days after finishing antibiotics for a urinary infection. New confusion is often how sepsis announces itself in older adults."
            ),
            part(
              "Action",
              "Does not exercise; arranges emergency evaluation (calls emergency services given hypotension and altered mentation, or the physician for immediate direction per agency policy), stays with her, repeats vitals, gathers the medication list and recent history for the handover, informs family and the agency, and documents the time line.",
              "No session. Call emergency services now -- hypotension with new confusion is not a wait-for-the-doctor situation -- and notify her physician and my agency per policy. Stay with her, keep her safe and warm, recheck vitals, and have her medication list and the antibiotic history ready for the paramedics. Call her family and document times and findings."
            ),
          ],
        },
        {
          text: "Three weeks later she is home again after treatment for urosepsis. At today's visit she is alert and oriented but complains of dizziness on standing and cramps in her calves. Vital signs: temperature 36.8 C, heart rate 92, blood pressure 128/78 sitting and 104/66 after 1 minute standing, SpO2 96%. Her lips are dry and she says she has been 'drinking less so I do not have to get up at night', and she restarted her furosemide last week.",
          ask: "Interpret the new picture and decide what happens today.",
          parts: [
            part(
              "Interpretation",
              "Interprets probable dehydration with orthostatic hypotension (a 24 mm Hg systolic fall within 3 minutes), likely aggravated by fluid restriction and the restarted loop diuretic, and recognizes cramps and dizziness as possible signs of electrolyte disturbance (for example low potassium or sodium) that need laboratory checking -- a medical, not exercise, problem.",
              "Dry lips, deliberately drinking less, a loop diuretic restarted, and a 24 mm Hg systolic drop on standing: dehydration with orthostatic hypotension. Calf cramps and dizziness on a diuretic raise the question of low potassium or sodium, which only a blood test answers. This is a medical issue today."
            ),
            part(
              "Today's decision",
              "Contacts the physician the same day for review and bloods (electrolytes, renal function) and diuretic adjustment, limits the session to safe seated activity and education (fluids per the physician's guidance, slow staged standing, why restricting fluids to avoid nocturia is risky), checks the falls plan and home safety, and arranges follow-up.",
              "Call the physician today: orthostatic drop, dehydration signs and cramps on restarted furosemide -- ask for electrolytes and renal function and a diuretic review. Keep today seated: slow staged standing practice, education that cutting fluids to avoid night-time toileting trades one fall risk for a worse one, and a plan for fluid timing with the physician's advice. Make sure the bedside commode and night lighting are in place and re-check vitals at the next visit."
            ),
          ],
        },
      ],
    },

    // ------------------------------------------------------------------
    // Unit 5: Intervention (2)
    // ------------------------------------------------------------------
    {
      slug: "gcs-exercise-prescription-frail",
      objective: "Exercise prescription for strength, power and endurance in older adults, including dosing for frailty",
      kind: "build",
      title: "A written exercise prescription for a frail 84-year-old",
      brief:
        "A fictional 84-year-old woman with sarcopenia and frailty (Fried 3 of 5) is referred from a falls clinic for a 12-week program. Baseline: five-times sit-to-stand 21 s using her arms, gait speed 0.6 m/s, 6-minute walk 180 m, grip 15 kg. She has osteoarthritic knees (pain 3/10 on stairs), controlled hypertension on a beta-blocker, and no cardiac symptoms; her physician has cleared her for progressive exercise. She can attend supervised sessions twice a week and will do home exercise on other days. Fictional patient; exam practice, not clinical guidance.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the prescription using FITT terms for resistance, power, aerobic and balance components, including how you will progress it and the safety rules.",
          parts: [
            part(
              "Resistance and power",
              "Prescribes progressive resistance training 2-3 days a week for the major lower- and upper-limb muscle groups with an intensity anchor (an RPE or repetition-maximum scale) starting lighter and progressing load over weeks, 1-3 sets of about 8-15 repetitions, plus power-type training using lighter loads moved quickly (for example fast sit-to-stand, step-ups), and explains why power matters for function and falls in older adults.",
              "Resistance 2-3 days a week: leg press or sit-to-stand with weight, step-ups, hip abduction, calf raises, rows and presses -- 1-2 sets of 10-15 reps in week 1 progressing to 2-3 sets of 8-12 at an RPE where the last two reps are hard, adding load each week she clears the target. Power work from week 2: the same movements with light load done as fast as she safely can (fast chair rises, quick step-ups), because power is lost faster than strength and predicts falls and function."
            ),
            part(
              "Aerobic and balance",
              "Prescribes aerobic activity toward the WHO target of 150-300 minutes a week of moderate intensity (built up from short bouts), dosed by RPE/talk test because of the beta-blocker, and balance training 3 or more days a week with progressively challenging static and dynamic tasks (reduced base, eyes closed, stepping, tandem walking) for at least 12 weeks, as falls guidelines recommend.",
              "Aerobic: walking, starting at 5-10 minute bouts twice a day at a 'can talk but not sing' effort (RPE because the beta-blocker hides her heart rate), building toward 150 minutes a week over the 12 weeks. Balance at least 3 days a week: narrow stance, tandem stance and walk, single-leg stand near a counter, heel-toe and sideways stepping, progressing as she becomes steady, continued for the full 12 weeks and beyond."
            ),
            part(
              "Progression and safety",
              "Sets progression rules (increase load or difficulty when the target repetitions are done with reserve two sessions running; increase one variable at a time) and safety rules (warm-up and cool-down, knee pain kept at an acceptable level with range and load adjusted, stop for chest pain, dizziness, unusual breathlessness; blood pressure checked periodically; falls precautions during balance work), and plans reassessment of baseline measures at 6 and 12 weeks.",
              "Progress when she completes the target reps with two in reserve on two consecutive sessions -- one change at a time (load, then sets, then speed). Keep knee pain at or below her usual 3/10 by trimming range or load rather than stopping. Stop and seek advice for chest pain, dizziness, breathlessness out of proportion, or new joint swelling. Balance work always near a counter or with a spotter. Repeat chair stand, gait speed, 6MWT and grip at 6 and 12 weeks."
            ),
          ],
        },
      ],
    },
    {
      slug: "gcs-design-falls-prevention-programme",
      objective: "Fall-prevention and balance intervention programs with evidence-based components",
      kind: "build",
      title: "Design a community falls-prevention program",
      brief:
        "A fictional community health center asks you to design a 12-week group falls-prevention program for older adults classified as intermediate or high falls risk after a World Falls Guidelines assessment. Participants will have had their medication, vision and orthostatic blood pressure addressed by their physicians; you own the exercise and education component. Budget allows one instructor for groups of 8 and a hall with chairs, steps and light weights. Fictional organization; exam practice, not clinical guidance.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the program: dose and components, individualization and progression, and how you will evaluate it.",
          parts: [
            part(
              "Dose and components",
              "Specifies a program built around balance and functional training (challenging static and dynamic balance, sit-to-stand, stepping, gait variations) with progressive resistance training, delivered 3 or more times a week (group sessions plus prescribed home days) for at least 12 weeks, consistent with the World Falls Guidelines, with Tai Chi as an option; includes education on falls risk, footwear, home hazards and getting up from the floor.",
              "Three sessions a week for 12 weeks -- two supervised group sessions plus a structured home day -- centered on challenging balance (narrow and single-leg stance, weight shifts, stepping in all directions, tandem and turning gait, dual-task walking) and functional strength (sit-to-stand, step-ups, heel and toe raises with light weights), with a Tai Chi-based block as an option. Each week includes 10 minutes of education: footwear, home lighting and hazards, medication and vision check-ups, and how to get up from the floor."
            ),
            part(
              "Individualization and progression",
              "Individualizes intensity to each person's baseline (gait speed, TUG, chair stands), progresses challenge weekly (reduce support and base of support, add head turns, eyes closed, cognitive dual tasks, speed), and sets safety rules for the group (chairs or rails within reach, ratios, screening for acute illness or symptoms each session).",
              "Screen everyone at entry (gait speed, TUG, five chair stands, FES-I) and give three difficulty tiers for each exercise. Progress weekly: less hand support, narrower base, head turns, eyes closed, counting backwards while stepping, then faster and bigger steps. Rails or chairs within arm's reach at all times, no more than 8 per instructor, and a quick 'how are you today' check for dizziness, illness or a new fall before each session."
            ),
            part(
              "Evaluation",
              "Plans evaluation with pre/post measures (gait speed, TUG, five-times sit-to-stand, FES-I) interpreted against meaningful-change values, tracks falls and injurious falls with a monthly calendar during and after the program, records attendance and adverse events, and plans continuation (maintenance class or home program) because benefits fade when exercise stops.",
              "Measure at weeks 0 and 12: gait speed (0.05 m/s small, 0.10 m/s substantial change), TUG, five-times sit-to-stand and the FES-I. Hand out monthly falls calendars during the program and for 6 months after, and log attendance and any adverse events. Build in a maintenance pathway -- a weekly community class or a progressed home program -- because the protection fades once people stop."
            ),
          ],
        },
      ],
    },

    // ------------------------------------------------------------------
    // Unit 6: Outcomes (1)
    // ------------------------------------------------------------------
    {
      slug: "gcs-did-she-really-improve",
      objective: "Selecting and interpreting outcome measures across impairment, activity and participation in older adults",
      kind: "build",
      title: "Did she really improve?",
      brief:
        "A fictional 79-year-old woman has completed 8 weeks of outpatient therapy after a hospital stay for pneumonia. Admission versus discharge: usual gait speed 0.58 to 0.74 m/s; 6-minute walk 215 to 262 m; Short Physical Performance Battery 6 to 8; Berg Balance Scale 40 to 44; Functional Gait Assessment 15 to 21 of 30; she says she can now shop alone but is still afraid to walk to church. Her insurer asks for evidence that continued therapy is justified. Fictional patient; exam practice, not clinical guidance.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Interpret each change against the published figure for real or meaningful change, classify the measures by ICF level, and write the one-paragraph justification (or discharge plan) you would send.",
          parts: [
            part(
              "Change against published values",
              "Interprets each: gait speed +0.16 m/s exceeds the substantial meaningful change of 0.10 m/s; 6MWT +47 m is close to the substantial change of 50 m and well beyond the small change of 20 m; SPPB +2 exceeds the substantial change of 1 point; Berg +4 from a baseline of 40 does not reach the 5-point MDC for scores of 35-44, so it may not be true change; FGA 21 is still at or below the 22/30 cut-off for fall risk despite improving.",
              "Gait speed +0.16 m/s: beyond the 0.10 m/s substantial change -- real and meaningful. 6MWT +47 m: well past the 20 m small change and almost at the 50 m substantial change. SPPB +2 points: double the 1-point substantial change. Berg +4 from 40: for a baseline of 35-44 the MDC is 5, so this may be measurement noise. FGA 15 to 21: a genuine gain, but 21 is still at or below the 22/30 fall-risk cut-off."
            ),
            part(
              "ICF levels",
              "Places the measures: Berg and SPPB components as body function/activity-level performance; gait speed, 6MWT and FGA as activity (mobility) measures; shopping alone and walking to church as participation, and notes that fear of falling is a personal factor limiting participation that a performance measure will not capture.",
              "Impairment/body function: lower-limb strength (SPPB chair stands) and static balance (Berg). Activity: gait speed, 6-minute walk distance, FGA (dynamic walking). Participation: shopping alone (achieved) and walking to church (not yet). Her fear of falling is a personal factor that none of the performance numbers capture -- it needs its own measure (FES-I)."
            ),
            part(
              "Justification or discharge",
              "Writes a concise, honest paragraph: documents clinically meaningful gains in walking capacity and function, identifies the remaining measurable deficit (FGA at or below the fall-risk threshold, fear limiting participation) with specific, time-limited goals and a plan (dynamic gait and community-walking training, graded exposure), or, if arguing for discharge, a maintenance program; avoids overstating the Berg change.",
              "'Over 8 weeks Mrs X improved gait speed by 0.16 m/s, 6-minute walk by 47 m and SPPB by 2 points, each beyond published thresholds for meaningful change, and now shops independently. Her Functional Gait Assessment of 21/30 remains at the published fall-risk cut-off and fear of falling prevents community walking. We request 4 further weeks (8 visits) targeting dynamic gait and graded community walking, with goals of FGA 24/30 or higher and independent walking to church, after which she transitions to a community balance class.' The Berg change is not reported as improvement because it is within measurement error."
            ),
          ],
        },
      ],
    },
  ],
};
