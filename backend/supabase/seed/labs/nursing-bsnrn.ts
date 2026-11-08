import { CLINICAL_SAFETY, part, type SeedLabSet } from "./types";
import { AACN_ESSENTIALS, AHRQ_TEAMSTEPPS, CDC_HAND_HYGIENE, ISMP_HIGH_ALERT, NCSBN_RN_2026 } from "./nursing-sources";

// REQ-148: BSN Nursing course, organised by the ten domains of the AACN
// Essentials (2021): Knowledge for Nursing Practice, Person-Centered Care,
// Population Health, Scholarship, Quality and Safety, Interprofessional
// Partnerships, Systems-Based Practice, Informatics, Professionalism, and
// Personal, Professional and Leadership Development. The Essentials do not
// weight domains, so the unit weights are Ascendra's judgment
// (seed/tracks/nursing.ts); the graduate's licensure exam is the NCLEX-RN,
// whose clinical judgment model the bedside case below follows.
// Density ("hybrid"): 2/2/2/2/2/1/1/1/1/1 = 15 (9 case, 6 build).
//
// BSN depth means the competencies beyond the bedside as well as at it:
// clinical judgment, person-centred planning, population health, evidence
// appraisal, quality improvement and root cause analysis, speaking up,
// transitions, informatics and AI, ethics and reflective practice. Where a
// lab names an approach (TeamSTEPPS CUS and the two-challenge rule), it was
// read at AHRQ's page on 2026-11-07 (nursing-sources.ts). Statistics in the
// appraisal case are fictional, with every number given. All
// needs_expert_review (docs/labs.md).

export const BSNRN_LABS: SeedLabSet = {
  trackCode: "BSNRN",
  sources: [AACN_ESSENTIALS, NCSBN_RN_2026, AHRQ_TEAMSTEPPS, ISMP_HIGH_ALERT, CDC_HAND_HYGIENE],
  labs: [
    // ---- Nursing Science and Theory (2) ----
    {
      slug: "bsn-socio-ecological-hypertension",
      objective: "Apply the socio-ecological model to see a client within nested individual, relationship, community and policy contexts",
      kind: "build",
      title: "Why the blood pressure stays high",
      brief:
        "A fictional 54-year-old bus driver has had uncontrolled hypertension for two years despite a prescribed medication. In a clinic visit he tells you: he skips doses when money is tight at the end of the month; his wife cooks with a lot of salt 'because that's how our family eats'; the nearest grocery store with fresh food is a 40-minute bus ride away, while three fast-food outlets are near his depot; his split shifts leave no regular time for meals or exercise; and his employer's insurance has a high deductible for medication.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Map the factors onto the socio-ecological levels and propose one nursing action at each level.",
          parts: [
            part(
              "Individual",
              "Places individual factors (knowledge, beliefs, skipping doses, health literacy) at the individual level and proposes an individual action such as teaching with teach-back, a simpler regimen request, or exploring his beliefs about the medication.",
              "Individual: skipping doses, his understanding of hypertension. Action: explore why he skips, teach with teach-back, and ask the provider about a once-daily, lower-cost option."
            ),
            part(
              "Relationship",
              "Places family cooking and social norms at the relationship (interpersonal) level and proposes involving his wife/family (for example joint teaching on lower-salt cooking that keeps family dishes).",
              "Relationship: family cooking with lots of salt. Action: invite his wife to a visit and plan lower-salt versions of their usual dishes together."
            ),
            part(
              "Community and organisational",
              "Places food access and the work schedule at the community/organisational level and proposes a community or workplace action (for example linking to a food programme or mobile market, working with the employer on breaks or a workplace blood-pressure programme).",
              "Community and organisation: no nearby fresh food, fast food at the depot, split shifts. Action: connect him to a mobile market or food programme and contact the transit employer about a workplace blood-pressure check and healthy options."
            ),
            part(
              "Policy",
              "Places insurance design and medication cost at the policy level and proposes a policy-level action (for example referral to a medication assistance programme now, and advocacy for lower cost-sharing for chronic disease medications).",
              "Policy: high deductible for medication. Action: refer to a pharmacy or manufacturer assistance programme now, and support advocacy for lower cost-sharing on blood-pressure medication."
            ),
          ],
        },
      ],
    },
    {
      slug: "bsn-cjmm-post-op-confusion",
      objective: "Clinical judgment as the product of knowledge plus reasoning",
      kind: "case",
      title: "New confusion on day two",
      brief:
        "A fictional 78-year-old is 2 days after a total knee replacement. Medications include a scheduled opioid, an as-needed opioid, and enoxaparin. The client's daughter says, 'Mum isn't herself today -- she thinks it's 1990.' Yesterday the client was oriented.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "Your data: temperature 38.2 degrees C, heart rate 104, respiratory rate 22, blood pressure 118/70 mm Hg, SpO2 90% on room air (was 96%), fine crackles at the right base, has not used the incentive spirometer, urine output 30 mL/h, has had the as-needed opioid three times overnight, last bowel movement 3 days ago.",
          ask: "Recognise and analyse the cues: which data matter, and what could explain them?",
          parts: [
            part(
              "Relevant cues",
              "Separates relevant cues (acute change in mental status, fever, tachycardia, tachypnea, falling SpO2, right basal crackles, poor spirometer use, extra opioid doses) from less relevant or expected ones, and notes the acute onset versus yesterday's baseline.",
              "What matters: new confusion compared with yesterday, fever, faster heart rate and breathing, SpO2 down from 96 to 90%, right basal crackles, no spirometer use and three extra opioid doses. The constipation and urine output are worth noting but less urgent."
            ),
            part(
              "Possible explanations",
              "Links the cues to more than one hypothesis: delirium from a cause such as a postoperative pulmonary complication (atelectasis or pneumonia) and hypoxemia, opioid effects, infection elsewhere, or pulmonary embolism.",
              "This looks like delirium with a cause to find: atelectasis or pneumonia with low oxygen, too much opioid, another infection, or even a pulmonary embolism after surgery."
            ),
          ],
        },
        {
          text: "There is no calf swelling or chest pain, and heart rate settles to 98 when the client sits up and takes deep breaths. Sedation scale shows the client is awake and rousable.",
          ask: "Prioritise your hypotheses and generate solutions.",
          parts: [
            part(
              "Priority hypothesis",
              "Ranks a respiratory complication (atelectasis progressing to pneumonia) with hypoxemia causing delirium as most likely and most urgent, explaining why (crackles, fever, falling SpO2, no spirometer use, improvement with deep breathing), while keeping opioid effect and PE on the list to rule out.",
              "Most likely and most urgent: atelectasis turning into pneumonia, with low oxygen driving the delirium -- crackles, fever, falling SpO2, no spirometer use, and better with deep breathing. Opioids and PE stay on the list."
            ),
            part(
              "Solutions",
              "Generates actions with expected outcomes: notify the provider (SBAR) for orders such as chest imaging, blood work and cultures; oxygen to the prescribed target; upright positioning, deep breathing, spirometer and early mobility; review opioid use with the provider and use multimodal and non-drug pain relief; delirium prevention (orientation, glasses and hearing aids, sleep, family presence); and defined outcomes such as SpO2 within target and orientation back to baseline.",
              "SBAR to the provider for a chest x-ray, labs and cultures; oxygen to target; sit up, deep breathing, spirometer every hour while awake and walk with help; ask about reducing opioids and add non-drug pain relief; delirium care -- glasses, clock, daughter present. Goal: SpO2 back on target and oriented within 24-48 hours."
            ),
          ],
        },
        {
          text: "The provider orders a chest x-ray (right lower lobe infiltrate), cultures, an antibiotic, and oxygen to keep SpO2 at 92% or above; opioids are reduced. You carry out the plan.",
          ask: "Next morning: SpO2 94% on 2 L/min, temperature 37.6 degrees C, oriented to person and place but not date. Evaluate the outcomes.",
          parts: [
            part(
              "Evaluate",
              "Compares the new data with the expected outcomes: oxygenation and fever improving (partly met), orientation improving but not back to baseline (partly met), so continues the plan, keeps monitoring and delirium measures, and reports progress; would revise if trends reversed.",
              "Oxygen and fever are better -- improving. Orientation is better but not back to baseline -- partly met. Keep the plan going, continue delirium care and monitoring, update the provider and daughter, and change course if things slip."
            ),
          ],
        },
      ],
    },
    // ---- Patient- and Family-Centered Care (2) ----
    {
      slug: "bsn-nanda-problem-list",
      objective: "Turn assessment data into a prioritised problem list, writing each problem as a NANDA-I diagnosis -- problem-focused, risk, health promotion or syndrome -- with the person's preferences in view",
      kind: "build",
      title: "From assessment to a prioritised problem list",
      brief:
        "A fictional 71-year-old with heart failure is being discharged home in two days. Assessment: dyspnea on walking 10 metres, 2+ ankle edema, weight up 3 kg from her dry weight, crackles in both bases, SpO2 93% on room air; she says she is 'tired of all the pills' and sometimes skips her diuretic before church so she won't need the toilet; she lives alone and her son visits weekly; she says what matters most is being able to sing in the church choir again. She asks how she can 'stay out of hospital this time'.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write three nursing diagnoses in priority order, each with one measurable outcome agreed with her.",
          parts: [
            part(
              "First priority",
              "Writes a problem-focused diagnosis about fluid/gas exchange as the top priority, in a correct format (label related to/as evidenced by), for example Excessive fluid volume (the current NANDA-I label; older texts say Excess fluid volume) or Impaired gas exchange, related to compromised regulatory mechanisms as evidenced by edema, weight gain, crackles and dyspnea, with a measurable time-bound outcome.",
              "Excessive fluid volume related to compromised regulatory mechanisms (heart failure) as evidenced by 2+ ankle edema, 3 kg weight gain, bilateral crackles and dyspnea on exertion. Outcome: within 48 hours, weight down at least 1.5 kg and she walks 30 metres without stopping to rest."
            ),
            part(
              "Second priority",
              "Writes a diagnosis addressing medication-taking that reflects her stated reason (for example Ineffective health self-management related to regimen complexity and the inconvenience of diuretic timing as evidenced by skipped doses), with an outcome that uses her preferences (such as an agreed diuretic timing around church).",
              "Ineffective health self-management related to a complex regimen and diuretic timing that clashes with church, as evidenced by skipped doses. Outcome: by discharge she states a diuretic schedule she agrees to (for example after she returns from church, as the provider approves) and how to weigh herself daily."
            ),
            part(
              "Third (risk or health promotion)",
              "Writes a risk or health-promotion diagnosis in the correct format (a risk diagnosis has risk factors, not 'as evidenced by'; a health-promotion diagnosis expresses readiness), for example Readiness for enhanced health self-management as expressed by desire to stay out of hospital, or a risk diagnosis tied to living alone, with a measurable outcome.",
              "Readiness for enhanced health self-management as expressed by her wish to 'stay out of hospital this time'. Outcome: before discharge she teaches back the three warning signs to call about and has a follow-up appointment within a week."
            ),
            part(
              "Why this order",
              "Justifies the order: physiological instability (fluid and breathing) first, then the self-management problem that drives readmission, then the health-promotion/risk issue, and links outcomes to what matters to her (singing in the choir).",
              "Breathing and fluid first because they're physiological and unstable; then the skipped diuretic, because it's what brings her back; then her readiness to learn. Her goal -- singing in the choir again -- is what the outcomes are built around."
            ),
          ],
        },
      ],
    },
    {
      slug: "bsn-reassess-modify-plan",
      objective: "Reassess and modify the plan of care when outcomes fall short, and recognise when standard practice needs to change for an individual",
      kind: "case",
      title: "When the plan isn't working",
      brief:
        "A fictional 45-year-old with sickle cell disease is admitted with a pain crisis. The standard order set gives an as-needed oral opioid every 4 hours and encourages oral fluids. The outcome on the care plan: pain at or below 4/10 within 24 hours, by the client's own rating.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "At 24 hours the client rates pain 8/10, is curled in bed, drinking little, and says, 'Every time I come here nobody believes me.' Two staff have charted 'drug-seeking?'.",
          ask: "Evaluate the outcome and say what you do.",
          parts: [
            part(
              "Evaluate",
              "States that the outcome is not met (8/10 versus a goal of 4 or less), believes the client's report of pain, and recognises bias in the 'drug-seeking' notes as a barrier to care.",
              "Not met: pain is 8/10 against a goal of 4 or below. Pain is what the client says it is; the 'drug-seeking?' notes are bias, and they're getting in the way of care."
            ),
            part(
              "Modify",
              "Reassesses (pain characteristics, functional impact, sedation and respiratory status, hydration), advocates with the provider using SBAR for a revised, individualised plan consistent with current sickle cell pain guidance (for example scheduled rather than as-needed analgesia, IV route, multimodal and non-drug measures, hydration), and involves the client in setting the plan.",
              "Reassess the pain, how it limits movement, sedation, breathing and fluids. SBAR to the provider asking for an individual plan: scheduled analgesia (IV if needed) instead of waiting for as-needed doses, multimodal and non-drug comfort, and IV fluids if intake stays poor -- and ask the client what has worked before."
            ),
          ],
        },
        {
          text: "The provider changes to scheduled IV analgesia with an as-needed dose for breakthrough pain, adds IV fluids and a heat pack. Six hours later pain is 5/10, the client is drinking, and sedation and breathing are within safe limits.",
          ask: "What do you do now?",
          parts: [
            part(
              "Re-evaluate and continue",
              "Evaluates progress (improving, close to goal), continues the revised plan with ongoing sedation and respiratory monitoring, documents objectively without biased language, and addresses the stigma in the team (for example raising the charting at handoff or with the manager).",
              "Improving and nearly at the goal: keep the new plan, keep checking sedation and breathing, document facts instead of labels, and raise the 'drug-seeking' notes with the team so the client gets fair care next admission too."
            ),
          ],
        },
      ],
    },
    // ---- Community and Public Health Nursing (2) ----
    {
      slug: "bsn-five-levels-diabetes",
      objective: "Use the five levels of prevention -- primordial, primary, secondary, tertiary, quaternary -- to plan population interventions",
      kind: "build",
      title: "A county with rising type 2 diabetes",
      brief:
        "You are a public health nurse in a fictional county where type 2 diabetes prevalence among adults has risen over ten years. A community assessment found: few safe places to walk, many corner stores and few groceries in two neighbourhoods, high rates of obesity among children, many adults who have never been screened, and a cluster of amputations among adults with long-standing diabetes. A local clinic has begun ordering many imaging tests for people with prediabetes who have no symptoms.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Plan one intervention at each of the five levels of prevention.",
          parts: [
            part(
              "Primordial",
              "Proposes an intervention that prevents risk factors from emerging, aimed at social and environmental conditions (for example safe walking routes, healthy food access, school food policy).",
              "Primordial: work with the city on safe walking routes and a healthy-food corner-store programme, and with schools on healthier meals -- stopping the risk factors from developing in the first place."
            ),
            part(
              "Primary",
              "Proposes an intervention that prevents disease in people with risk factors (for example a lifestyle-change programme for adults with prediabetes or obesity).",
              "Primary: a structured lifestyle-change programme for adults with prediabetes or overweight, to prevent diabetes developing."
            ),
            part(
              "Secondary",
              "Proposes early detection in people without symptoms (for example community screening with referral and follow-up for abnormal results).",
              "Secondary: screening events at churches and workplaces for adults never screened, with referral and follow-up for anyone with an abnormal result."
            ),
            part(
              "Tertiary and quaternary",
              "Proposes a tertiary intervention that limits complications in people who have diabetes (for example foot-care programmes and podiatry access to prevent amputations), and a quaternary intervention that protects people from overmedicalisation or unnecessary intervention (for example working with the clinic to stop low-value imaging in asymptomatic people with prediabetes).",
              "Tertiary: diabetic foot checks, footwear and podiatry access to prevent more amputations. Quaternary: work with the clinic to stop unneeded imaging in people with prediabetes and no symptoms -- protecting them from harm from too much care."
            ),
          ],
        },
      ],
    },
    {
      slug: "bsn-shelter-outbreak",
      objective: "Emergency preparedness and disaster response",
      kind: "case",
      title: "A flood shelter",
      brief:
        "After a fictional river flood, 220 displaced residents are housed in a high-school gym for at least a week. You are the public health nurse assigned to the shelter with volunteers and one emergency medical technician.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "Day 1. Residents are arriving; some have medications soaked or left behind.",
          ask: "What do you set up first?",
          parts: [
            part(
              "Intake and vulnerable groups",
              "Sets up a health intake that identifies people with urgent or functional needs (chronic conditions needing medications or devices such as oxygen, dialysis or insulin; pregnancy; infants; older adults; disabilities; mental health needs) and arranges replacements or referral.",
              "A health check at registration that flags people who need medications, oxygen, dialysis, insulin storage or mobility help, pregnant people, babies, older adults and anyone in crisis, and then arranges replacements or referral."
            ),
            part(
              "Prevention",
              "Puts infection prevention in place (hand-washing stations and hand rub, safe water and food handling, sanitation, spacing cots) and a way to track illness (surveillance log).",
              "Hand-washing stations and hand rub, safe drinking water and food handling, enough toilets and cleaning, cots spaced apart, and a daily illness log."
            ),
          ],
        },
        {
          text: "Day 4. Since last night 18 residents have had sudden vomiting and diarrhoea; two volunteers who serve food are also ill.",
          ask: "What do you do?",
          parts: [
            part(
              "Control",
              "Suspects a gastrointestinal outbreak (for example norovirus), reports it to the local health department, separates ill people into a designated area with their own toilets, excludes ill food handlers, switches to soap-and-water hand washing for everyone (alcohol rub is less effective against norovirus), and has surfaces cleaned with an appropriate disinfectant.",
              "This looks like a GI outbreak, possibly norovirus. Report it to the health department today; move sick residents to a separate area with their own toilets; keep the sick volunteers off food service; switch everyone to soap-and-water hand washing; and clean surfaces with a disinfectant that works on norovirus."
            ),
            part(
              "Care and tracking",
              "Monitors for dehydration (especially older adults and children), arranges oral rehydration and referral of severe cases, and records cases (onset, symptoms, location) to support the health department's investigation.",
              "Watch for dehydration, especially in older adults and small children, give oral rehydration and send severe cases to hospital, and keep a line list -- who, when it started, symptoms, where they sleep -- for the health department."
            ),
          ],
        },
        {
          text: "Day 9. The shelter is closing and residents are returning home.",
          ask: "What is the nurse's role in recovery?",
          parts: [
            part(
              "Recovery",
              "Addresses recovery-phase needs: safe return (flood-related hazards such as mould, contaminated water, carbon monoxide from generators), continuity of medications and care, mental health follow-up, and an after-action review to improve preparedness.",
              "Teach about mould, unsafe well water and never running generators indoors; make sure everyone has medications and follow-up appointments; link people to mental health support; and join the after-action review to improve the next response."
            ),
          ],
        },
      ],
    },
    // ---- Evidence-Based Practice and Nursing Research (2) ----
    {
      slug: "bsn-picot-and-hierarchy",
      objective: "Write a clinical question in PICOT form and place evidence within a hierarchy, with recent high-quality systematic reviews at the top",
      kind: "build",
      title: "A question about chlorhexidine bathing",
      brief:
        "On a fictional adult ICU, nurses wonder whether daily chlorhexidine gluconate (CHG) bathing, compared with soap-and-water bathing, reduces central line-associated bloodstream infections over a 12-month period. You find four sources: (1) a 2024 systematic review and meta-analysis of randomised controlled trials; (2) a single-centre before-and-after study from 2019; (3) a hospital blog post by a nurse manager; (4) a 2022 cluster-randomised controlled trial in 40 ICUs.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the PICOT question and rank the evidence.",
          parts: [
            part(
              "PICOT question",
              "Writes a complete PICOT question naming population (adult ICU patients with central lines), intervention (daily CHG bathing), comparison (soap-and-water bathing), outcome (CLABSI rate) and time (12 months).",
              "In adult ICU patients with central lines (P), does daily chlorhexidine bathing (I), compared with soap-and-water bathing (C), reduce the rate of central line-associated bloodstream infection (O) over 12 months (T)?"
            ),
            part(
              "Ranking",
              "Ranks the sources from strongest to weakest: the recent systematic review of RCTs, then the cluster RCT, then the before-and-after (quasi-experimental) study, then the blog (opinion, not research).",
              "1) the 2024 systematic review and meta-analysis of RCTs; 2) the 2022 cluster RCT; 3) the 2019 before-and-after study; 4) the blog post."
            ),
            part(
              "Why",
              "Explains the ranking by design (synthesised randomised evidence controls bias best; a quasi-experimental study has no randomisation and is open to confounding; opinion is lowest) and notes that quality (not only level) and fit to their own population still need appraisal.",
              "A synthesis of randomised trials controls bias best; one large RCT is next; a before-and-after study can't separate the effect from other changes at the time; a blog is opinion. Each still needs appraising for quality and for whether its patients look like ours."
            ),
          ],
        },
      ],
    },
    {
      slug: "bsn-appraise-a-study",
      objective: "Appraising evidence quality and level",
      kind: "case",
      title: "Should we change practice on this study?",
      brief:
        "A fictional colleague brings you a published study claiming a new fall-prevention bundle 'cuts falls in half' and asks whether your medical unit should adopt it.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "The study: one hospital; two units chose the bundle and two did not (not randomised); 410 patients; follow-up 3 months; the bundle units also got new low beds during the study.",
          ask: "What level and quality of evidence is this?",
          parts: [
            part(
              "Level and threats",
              "Identifies it as a quasi-experimental (non-randomised controlled) study, a lower level than an RCT, and names the main threats: units self-selected (selection bias), the new beds as a co-intervention/confounder, a single site and short follow-up limiting generalisability.",
              "Quasi-experimental -- a comparison without randomisation, below an RCT. Units chose themselves (selection bias), the new low beds arrived at the same time (a confounder), and one site over 3 months limits how far it applies elsewhere."
            ),
          ],
        },
        {
          text: "Results table: falls per 1,000 patient-days 2.1 (bundle) vs 3.9 (usual care); relative risk 0.54; 95% confidence interval 0.27 to 1.08; p = 0.08.",
          ask: "Interpret the results.",
          parts: [
            part(
              "Interpretation",
              "Explains that the point estimate suggests about 46% fewer falls, but the 95% confidence interval crosses 1 (and p is above 0.05), so the result is not statistically significant and is compatible with no effect or even slight harm; 'cuts falls in half' overstates it.",
              "A relative risk of 0.54 suggests about 46% fewer falls, but the confidence interval runs from 0.27 to 1.08 -- it crosses 1 -- and p = 0.08, so it isn't statistically significant. The data are compatible with no benefit at all, so 'cuts falls in half' overstates it."
            ),
          ],
        },
        {
          text: "In the methods you find no mention of ethics committee (IRB) approval or how patients consented, and the bundle's manufacturer funded the study.",
          ask: "What do you recommend?",
          parts: [
            part(
              "Recommendation",
              "Treats the missing IRB/consent information and the manufacturer funding as serious concerns about ethics and bias, does not recommend a practice change on this study alone, and recommends searching for stronger evidence (systematic reviews, guidelines) and, if the bundle is promising, a local quality-improvement pilot with measurement.",
              "No IRB or consent statement is a warning sign about how ethically it was done, and manufacturer funding adds a risk of bias. I wouldn't change practice on this alone: look for systematic reviews and guidelines on fall prevention, and if the bundle still looks promising, pilot it as a measured QI project."
            ),
          ],
        },
      ],
    },
    // ---- Patient Safety and Quality Improvement (2) ----
    {
      slug: "bsn-rca-heparin-vials",
      objective: "Recognise a sentinel event and use root cause analysis to find the system factors behind an error, such as similar-looking drug labels or vague orders",
      kind: "case",
      title: "Two vials that look alike",
      brief:
        "On a fictional medical unit, a 76-year-old client was given a heparin flush from a vial containing 10,000 units/mL instead of the 10 units/mL flush vial. The client developed a major bleed and is in the ICU with permanent harm. The two vials are the same size with similar blue labels and are stored in neighbouring bins in the automated dispensing cabinet. The nurse was covering two extra clients because of a sick call.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "The unit manager asks you to join the review.",
          ask: "What kind of event is this, and what happens first?",
          parts: [
            part(
              "Classify and respond",
              "Identifies a sentinel event (a patient safety event resulting in permanent or severe harm), and the immediate steps: care for the patient, secure the vials and evidence, report through the event system, disclose to the patient/family, support the staff involved, and start a root cause analysis.",
              "A sentinel event -- a safety event causing permanent harm. First: care for the client; pull and keep the vials; report it; disclose honestly to the client and family; support the nurse involved; and start a root cause analysis."
            ),
          ],
        },
        {
          text: "In the RCA meeting, one person says, 'The nurse just needs retraining and a written warning.'",
          ask: "How does an RCA approach this, and what causes do you expect to find?",
          parts: [
            part(
              "System focus",
              "Explains that RCA looks for system causes rather than individual blame (asking why repeatedly), and names likely contributing factors: look-alike packaging, storage of both strengths side by side, availability of a high-concentration vial on a general unit, staffing/workload, and any missing barcode scanning or independent check for a high-alert drug.",
              "RCA asks 'why' until it reaches the system, not who to blame. Likely causes: look-alike vials, both strengths in adjacent bins, a high-concentration heparin vial stocked on a general unit at all, an overloaded nurse after a sick call, and no barcode scan or double check on a high-alert drug."
            ),
          ],
        },
        {
          text: "The team must choose actions.",
          ask: "Which actions do you recommend, and why those?",
          parts: [
            part(
              "Strong actions",
              "Prefers stronger system actions over weaker ones (education and warnings): removing high-concentration heparin vials from unit stock or using pre-filled flush syringes (a forcing function), separating look-alike products, barcode scanning required for heparin, and staffing escalation; plus a measure to check the actions worked.",
              "Strongest first: take 10,000 units/mL vials off the unit and use pre-filled flush syringes, so the error becomes almost impossible; separate any look-alike stock; require barcode scanning for heparin; and a staffing escalation plan. Then audit flushes and events to prove it worked. Education alone is the weakest fix."
            ),
          ],
        },
      ],
    },
    {
      slug: "bsn-pdsa-falls",
      objective: "Use the PDSA cycle repeatedly, revising the plan from what was learned until the change succeeds",
      kind: "build",
      title: "Two cycles to fewer night-time falls",
      brief:
        "A fictional 28-bed medical unit had 5.2 falls per 1,000 patient-days last quarter, most between 22:00 and 06:00 while clients were going to the toilet alone. In cycle 1 (two weeks), staff tried hourly rounding at night; audits showed rounds were documented only 40% of the time, and nurses said the night assistive personnel were often pulled to another unit. Falls during the cycle: 3 (no change from the usual rate).",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the aim and measures, then plan cycle 2 from what cycle 1 taught.",
          parts: [
            part(
              "Aim",
              "Writes a specific, measurable, time-bound aim (for example reduce falls from 5.2 to 3.0 or fewer per 1,000 patient-days within six months on this unit).",
              "Reduce falls on our unit from 5.2 to 3.0 or fewer per 1,000 patient-days by the end of June."
            ),
            part(
              "Measures",
              "Names an outcome measure (falls per 1,000 patient-days), a process measure (for example percent of scheduled toileting rounds completed), and a balancing measure (for example restraint or bed-alarm use, sleep complaints, or staff workload).",
              "Outcome: falls per 1,000 patient-days. Process: percent of night toileting rounds done. Balancing: complaints about sleep being disturbed, and staff overtime."
            ),
            part(
              "Study cycle 1",
              "Interprets cycle 1 as a failure of implementation rather than proof the idea cannot work: the change was not reliably done (40% completion) because of staffing, so the outcome cannot be judged.",
              "Rounding only happened 40% of the time because the night assistant kept being pulled away -- we didn't really test the idea, so no change in falls tells us little."
            ),
            part(
              "Plan cycle 2",
              "Designs a small, revised test that addresses the barrier and is measurable (for example scheduled toileting at set times by the RNs and a protected assistant on high-risk clients only, on one hallway for one week, with prediction and data collection), and states what would lead to adapt, adopt or abandon.",
              "Cycle 2: one hallway, one week; scheduled toileting at 22:00, 02:00 and 05:00 for clients flagged high fall risk, shared by the RN and an assistant the supervisor agrees not to pull. Prediction: 90% of rounds done and no falls on that hall. If rounds are done but falls continue, adapt; if both improve, spread to the whole unit."
            ),
          ],
        },
      ],
    },
    // ---- Teamwork and Interprofessional Collaboration (1) ----
    {
      slug: "bsn-speak-up-cus",
      objective: "Speaking up across a hierarchy when safety requires it",
      kind: "case",
      title: "\"We're fine, let's start\"",
      brief:
        "You are the circulating nurse in a fictional operating room. During the time-out before a left knee arthroscopy, you notice the consent form says 'right knee', the site mark is on the left knee, and the client (already sedated) earlier told the pre-op nurse 'it's my left knee'. The senior surgeon says, 'It's the left -- the form is just a typo. Let's start, we're behind.'",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "The team turns toward the instrument tray.",
          ask: "What do you say and do?",
          parts: [
            part(
              "Speak up",
              "Stops the procedure using a structured assertive approach such as TeamSTEPPS CUS ('I'm concerned... I'm uncomfortable... this is a safety issue') and states the specific discrepancy and the request (pause until the consent and site are reconciled).",
              "'I'm concerned -- the consent says right knee and the mark is on the left. I'm uncomfortable starting. This is a safety issue. We need to stop until the consent and site match.'"
            ),
          ],
        },
        {
          text: "The surgeon replies, 'Noted. I've done a thousand of these. Scalpel.'",
          ask: "What now?",
          parts: [
            part(
              "Two-challenge and chain of command",
              "Voices the concern a second time (two-challenge rule), and if it is still not acknowledged, escalates via the chain of command (charge nurse, anaesthesia, OR manager) and does not hand over instruments for the incision until the discrepancy is resolved; recognises any team member may stop the line for a safety breach.",
              "Say it again clearly: 'I need us to stop -- the consent doesn't match the site.' If it's still ignored, call the OR charge nurse and ask the anaesthetist to support the pause. I don't pass the scalpel until it's resolved; anyone on the team can stop for a safety breach."
            ),
          ],
        },
        {
          text: "The charge nurse arrives. The surgeon agrees to pause; the procedure is delayed while the consent is corrected through the proper process.",
          ask: "What follows the case?",
          parts: [
            part(
              "Follow-up",
              "Documents and reports the near miss through the event system (a system issue, not a personal complaint), takes part in a debrief, and supports a culture in which speaking up is expected, for example by suggesting how consent and site verification are checked before the patient is sedated.",
              "File a near-miss report about the consent-site mismatch, join the debrief, and suggest checking consent against the site mark before sedation so it can't happen again. Speaking up should be routine, not brave."
            ),
          ],
        },
      ],
    },
    // ---- Health Care Systems, Policy and Finance (1) ----
    {
      slug: "bsn-transition-heart-failure",
      objective: "Transitions of care and the risks they carry",
      kind: "case",
      title: "Home from hospital, then a phone call",
      brief:
        "A fictional 80-year-old with heart failure and mild cognitive impairment is being discharged home after a 5-day admission. He lives with his wife, who manages his pills. The discharge medication list stops his old furosemide 40 mg and starts torsemide; his pharmacy refill history shows furosemide is still being auto-refilled.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "Discharge day.",
          ask: "What do you do to make this transition safe?",
          parts: [
            part(
              "Medication reconciliation",
              "Identifies the duplication risk (both loop diuretics), reconciles the list with the provider and pharmacist, and makes sure the old furosemide is clearly stopped (including the auto-refill) and the wife knows.",
              "Two loop diuretics could both be taken at home. Reconcile with the provider and pharmacist, cancel the furosemide auto-refill, and make sure his wife knows to stop the old tablets and remove them."
            ),
            part(
              "Teaching and follow-up",
              "Teaches the wife and client together using plain language and teach-back (daily weights, warning signs, low-salt diet, medication schedule), arranges early follow-up and a post-discharge phone call, and sends a complete handoff to primary care/home health.",
              "Teach both of them, with teach-back: weigh daily and call about the gain the provider set, which symptoms to report, the new pill schedule and low salt. Book a clinic visit within a week, arrange a follow-up call in 2-3 days, and send the discharge summary to his primary care provider and home health."
            ),
          ],
        },
        {
          text: "Two days later on the follow-up call, his wife says he has been dizzy, very thirsty and passing a lot of urine, and that she 'found the old water pills too and gave both to be safe'.",
          ask: "What do you do?",
          parts: [
            part(
              "Respond",
              "Recognises a likely duplication causing fluid and electrolyte loss and fall risk; tells her to stop the old furosemide now, arranges same-day assessment (provider visit or advice to seek urgent care if severe symptoms) and labs, and reports to the provider; documents and reports the transition failure for system review.",
              "This sounds like over-diuresis from taking both pills: stop the furosemide now, keep him sitting and safe from falls, and get him seen today with blood tests -- urgent care or 911 if he faints or is confused. Tell the provider, document the call, and report the auto-refill gap so the discharge process gets fixed."
            ),
          ],
        },
      ],
    },
    // ---- Nursing Informatics and Health Technology (1) ----
    {
      slug: "bsn-ai-early-warning",
      objective: "Artificial intelligence in clinical tools, and its failure modes",
      kind: "case",
      title: "The score says low risk",
      brief:
        "A fictional hospital has introduced an AI-based deterioration score in the electronic health record that shows each client's risk as low, medium or high. It was developed on data from a different health system. You are caring for a 58-year-old two days after abdominal surgery.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "The score shows LOW. Your assessment: new restlessness, respiratory rate up from 16 to 26 /min, heart rate 112, cool clammy skin, and urine output 10 mL/h for 2 hours. The latest vital signs have not yet been entered in the record.",
          ask: "What do you do?",
          parts: [
            part(
              "Clinical judgment over the tool",
              "Acts on the assessment rather than the score (the cues suggest deterioration), escalates per protocol (rapid response/provider), and recognises that the score cannot reflect data not yet charted.",
              "My assessment shows a client deteriorating, whatever the score says. Call rapid response now. The score is low partly because it hasn't seen the new vital signs -- a tool can't use data that isn't in the record."
            ),
            part(
              "Documentation",
              "Enters the current assessment data promptly and accurately so the record (and the tool) reflect the client.",
              "Chart the new vital signs and findings straight away so the record and the score are current."
            ),
          ],
        },
        {
          text: "Later, the unit's nurses notice that the score often rates clients with darker skin as lower risk than their condition suggests; the tool uses pulse oximetry readings as an input.",
          ask: "What failure modes might explain this, and what should nurses do?",
          parts: [
            part(
              "Failure modes",
              "Names plausible failure modes: biased input data (pulse oximeters can overestimate oxygen saturation in people with darker skin), training data from a different population (poor generalisability), and missing or delayed data; notes that tools can encode inequities.",
              "Pulse oximeters can read falsely high on darker skin, so a model using SpO2 may underrate those clients; it was trained on another health system's patients, so it may not fit ours; and late charting starves it of data. The tool can carry bias into care."
            ),
            part(
              "Action",
              "Reports the pattern through the proper channels (informatics/clinical decision support committee, safety reporting), asks for the tool's validation and performance by subgroup, advocates for monitoring of bias, and keeps using clinical judgment and full assessment for every client meanwhile.",
              "Report the pattern to the informatics team and the safety system, ask for the tool's validation results by subgroup, push for ongoing bias monitoring, and keep assessing every client fully -- never letting the score overrule what we see."
            ),
          ],
        },
      ],
    },
    // ---- Professional Nursing: Ethics and Standards (1) ----
    {
      slug: "bsn-ethics-withhold-diagnosis",
      objective: "Ethical decision-making frameworks",
      kind: "case",
      title: "\"Don't tell him\"",
      brief:
        "A fictional 67-year-old man is admitted with weight loss. Tests show advanced pancreatic cancer. He speaks fluent English and is mentally alert. Before the provider meets him, his adult daughter takes you aside: 'In our family we don't tell the patient. It would kill his hope. Please don't tell him.'",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "The provider plans to meet him this afternoon.",
          ask: "Identify the ethical dilemma using a framework.",
          parts: [
            part(
              "Dilemma and principles",
              "Identifies the conflict between principles: autonomy and veracity (his right to know and decide) versus beneficence/nonmaleficence as the family frames it (protecting him from distress), with respect for cultural values, and notes the key fact that he has decision-making capacity.",
              "Autonomy and truthfulness -- he's capable and has a right to know and make his own choices -- against the family's wish to protect him from harm. Their cultural values matter, but he has capacity, so his wishes come first."
            ),
            part(
              "Gather facts",
              "Uses a structured framework to gather facts and options before acting: his own preferences about information (ask him how much he wants to know and who should be involved), the family's concerns, and policy; considers involving interpreter/cultural or ethics resources.",
              "Using a framework, gather the facts first: ask him -- privately -- how much he wants to know about his results and whether he wants his daughter involved; listen to the daughter's fears; check policy; and consider an ethics or cultural liaison."
            ),
          ],
        },
        {
          text: "Asked privately by the provider and you, the man says: 'Tell me everything. But I want my daughter here when you do.'",
          ask: "What do you do now?",
          parts: [
            part(
              "Act and support",
              "Honours his stated wishes (full disclosure with the daughter present), supports the daughter compassionately (explaining his choice and offering support), plans the conversation with the provider, and arranges follow-up (palliative care, spiritual care) and documentation.",
              "Follow his wishes: the provider tells him everything with his daughter there. Before that, explain kindly to the daughter that he has asked to know, and offer her support. Plan the conversation with the provider, offer palliative and spiritual care, and document his wishes."
            ),
          ],
        },
      ],
    },
    // ---- Nursing Leadership and Professional Growth (1) ----
    {
      slug: "bsn-reflect-on-a-conversation",
      objective: "Use feedback and self-reflection to keep developing your therapeutic communication",
      kind: "build",
      title: "Reflect on a conversation that went wrong",
      brief:
        "You are a fictional new graduate nurse. Yesterday a client's wife, upset that her husband's surgery was delayed again, raised her voice at the nurses' station. You replied, 'It's not my fault, I just follow the schedule,' and turned back to your computer. She later complained. Your preceptor gave you this feedback: 'You sounded defensive, and she left feeling nobody cared.' You felt embarrassed and a bit angry.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Reflect on the event using a structured reflective cycle and plan what you will do differently.",
          parts: [
            part(
              "Description and feelings",
              "Describes what happened factually and names their own feelings at the time and after (for example defensive, embarrassed, angry), using a recognised structure such as Gibbs' cycle.",
              "Using Gibbs' cycle -- description: she raised her voice about another delay; I said it wasn't my fault and turned away. Feelings: defensive and rushed then; embarrassed and a bit angry at the feedback."
            ),
            part(
              "Evaluation and analysis",
              "Analyses what went wrong with reference to therapeutic communication (defensiveness and disengaging are blocks; her anger likely came from fear and lack of information) and accepts the feedback rather than rejecting it.",
              "What went badly: I defended myself and turned away -- both block communication. Her anger was probably fear and not knowing what was happening. My preceptor was right."
            ),
            part(
              "Action plan",
              "Writes a specific plan: a better response next time (acknowledge feelings, give information or find someone who can, follow up), a way to practise it, and a way to get further feedback.",
              "Next time: 'I can see how worrying another delay is. Let me find out what's happening and come back to you in 15 minutes' -- and then do it. I'll practise with my preceptor and ask her to watch my next difficult conversation and tell me how it went."
            ),
          ],
        },
      ],
    },
  ],
};
