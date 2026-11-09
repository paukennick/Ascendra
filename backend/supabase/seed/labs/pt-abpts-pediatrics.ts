import { CLINICAL_SAFETY, part, type SeedLabSet } from "./types";
import { source } from "../sources";

// REQ-152: ABPTS Pediatric Clinical Specialist (ABPTSPCS), authored labs.
//
// Aligned to the ABPTS pediatrics examination outline (knowledge 16%,
// professional roles 16%, examination 20%, evaluation/diagnosis/prognosis
// 20%, intervention 20%, outcomes 8%; seed/tracks/pt-abpts.ts). Density
// (hybrid, docs/labs.md): 2/2/2/2/2/1 = 11. Every lab is family-centred and
// uses age-appropriate norms: corrected age for preterm infants, CDC
// milestones (what 75% or more of children do by that age), standardized
// tools matched to purpose, and participation-level goals.
//
// Sources checked 2026-11-07:
//   OUTLINE   ABPTS, Specialist Certification Examination Outline: Pediatrics
//             https://specialization.apta.org/become-a-specialist/pediatrics/specialist-certification-examination-outline-pediatrics
//   CDC-9MO   CDC "Learn the Signs. Act Early." 9-month checklist (2022
//             revision; milestones 75% or more of children reach; use
//             corrected age if born more than 3 weeks early).
//             https://cdc.gov/act-early/digital-online-checklist/9-months.html
//   CP-EARLY  Morgan et al., J Clin Med 2019 (reporting the Novak 2017
//             international guideline): fidgety general movements from about
//             7-8 to 20 weeks post-term, absent fidgety highly predictive;
//             HINE for 2-24 months, cut-off 57 at 3 months; neuroimaging +
//             GMA + HINE together, two tests better than one.
//             https://arpi.unipi.it/retrieve/e0d6c92f-7191-fcf8-e053-d805fe0aa794/jcm-08-01879.pdf
//   GMFCS     Palisano et al., GMFCS E&R (CanChild): level headings and
//             6-12 year descriptors; describes current function, not
//             prognosis. https://depts.washington.edu/dbpeds/Screening%20Tools/GMFCS-ER.pdf
//   AACPDM    AACPDM Hip Surveillance Care Pathway (2017): start by age 2,
//             frequency rises with GMFCS level, refer to pediatric
//             orthopaedics for migration percentage over 30% and/or hip
//             abduction under 30 degrees; hip pain also referred.
//             https://www.Aacpdm.org/UserFiles/file/hip-surveillance-care-pathway.pdf
//   SHUNT     Hydrocephalus Association, "Complications of Shunt Systems":
//             malfunction signs in toddlers and children; seek immediate care.
//             https://www.hydroassoc.org/complications-of-shunt-systems/
//   CMT-CPG   Kaplan et al., Physical Therapy Management of Congenital
//             Muscular Torticollis, APTA Academy of Pediatric PT CPG 2018
//             (PMC8568067): severity grades by age, SCM mass and rotation
//             difference; five first-choice interventions; refer-back
//             criteria; consult after 4-6 weeks without progress; discharge
//             criteria; reassess 3-12 months after discharge.
//             https://pmc.ncbi.nlm.nih.gov/articles/PMC8568067
//   IDEA-C    OSEP policy letter 2023-03-17 (34 CFR 303.209): transition
//             conference not fewer than 90 days and, with all parties'
//             agreement, not more than 9 months before the third birthday;
//             LEA notified not fewer than 90 days before; transition plan in
//             the IFSP; IEP developed and implemented by the third birthday.
//             https://sites.ed.gov/idea/idea-files/policy-letter-march-17-2023-to-nix/
//   DMD-CARE  Parent Project Muscular Dystrophy "Care for Muscles" page
//             (summarising the 2018 care considerations, Birnkrant et al.,
//             Lancet Neurol 2018): stretch 4-6 times a week, night orthoses
//             from a young age, weight-bearing/high-load exercise can harm
//             dystrophic muscle, swimming is a safe option, specialist
//             review about every 6 months.
//             https://www.parentprojectmd.org/care/care-guidelines/by-area/care-for-muscles
//   GMFM-MCID Oeffinger et al., Dev Med Child Neurol 2008 (PMC2990955):
//             GMFM-66 MCID (medium effect) 1.7 for GMFCS I, 1.0 for II, 0.7
//             for III; large effect 2.7 / 1.5 / 1.2.
//             https://pmc.ncbi.nlm.nih.gov/articles/PMC2990955
//   COPM      Kang et al., Dev Med Child Neurol 2020 (via summary): COPM
//             performance and satisfaction 1-10, change of 2 or more points
//             clinically meaningful.
//             https://blogs.elon.edu/ptkids/2022/08/30/canadian-occupational-performance-measure-comp-article-summary-2/
//   APPT-ICF  APTA Academy of Pediatric PT, "List of Pediatric Assessment
//             Tools Categorized by ICF Model" (2013): tools by ICF level.
//             https://pediatricapta.org/includes/fact-sheets/pdfs/13%20Assessment-Screening%20tools.pdf?v=1.1
// Values also present in the track's own objectives (CP subtypes, DMD
// genetics and Gowers presentation, SCFE, hip screening) were verified there
// on 2026-11-04 against the sources tagged in seed/tracks/pt-abpts.ts.
//
// SAFETY: every child and family is fictional; exam practice, not clinical
// guidance. All needs_expert_review until a board-certified pediatric
// physical therapist approves it (docs/labs.md).

export const ABPTSPCS_LABS: SeedLabSet = {
  trackCode: "ABPTSPCS",
  sources: [source("https://specialization.apta.org/become-a-specialist/pediatrics/specialist-certification-examination-outline-pediatrics", "exam_outline", "2026-11-07")],
  labs: [
    // ----------------------------------------------------------------- Knowledge (2)
    {
      slug: "pcs-nine-month-milestone-review",
      objective: "Typical motor, cognitive and social development from infancy through adolescence and the variability within it",
      kind: "build",
      title: "Read a 9-month-old against the milestones",
      brief:
        "A fictional infant, Theo, is seen at a well-child visit at 9 months 1 week chronological age; he was born at 34 weeks. His mother reports: he sits without support once placed but cannot get into sitting on his own; he passes a toy from hand to hand and rakes cereal toward himself; he babbles \"bababa\"; he looks for a dropped spoon and laughs at peek-a-boo; he is wary of strangers and lifts his arms to be picked up. The pediatrician asks you whether anything here warrants concern and what to tell the family.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write your developmental read-out for the pediatrician and the message for the family.",
          parts: [
            part(
              "Age to use",
              "Corrects for prematurity: born 6 weeks early (more than 3 weeks), so corrected age is about 7.5 months, and the CDC checklist to compare against is the younger one (6 months), not the 9-month list.",
              "He was 6 weeks early, so his corrected age is about 7 and a half months. The CDC checklists say to use corrected age when a child was born more than 3 weeks early and the younger checklist when the age falls between two, so he is compared with the 6-month list, not the 9-month list."
            ),
            part(
              "Findings against norms",
              "Notes that against the 9-month list the only item not yet seen is getting to sitting on his own, and that at a corrected age of about 7.5 months this is not expected yet; all social, communication, cognitive and other movement items are present. States what the milestones mean (what 75% or more of children do by that age), so a missing item flags watchfulness, not diagnosis.",
              "Against the 9-month list he shows every item except getting into sitting by himself -- and at a corrected 7.5 months that skill is not yet due. Social (stranger wariness, peek-a-boo, lifts arms), communication (varied babble), cognitive (searches for the dropped spoon) and the other motor items (sits unsupported, transfers, rakes) are all present. CDC milestones are what 75% or more of children do by the age, so one not-yet item would prompt watching, not a diagnosis."
            ),
            part(
              "Family message and plan",
              "Gives the family a plain, strengths-first message, recommends re-checking getting-to-sit by the 9-month corrected age and routine developmental screening, suggests floor play that encourages transitions, and names the red flags (loss of skills, no babbling or pointing by 12 months) that would change the plan.",
              "Tell the family Theo is doing what we expect for his corrected age and point out his strengths. Encourage floor play that invites him to pivot and push up toward sitting. Re-check getting to sitting at his 9-month corrected age with routine screening. Return sooner if he loses any skill, or if by 12 months he is not babbling or pointing."
            ),
          ],
        },
      ],
    },
    {
      slug: "pcs-duchenne-recognition-and-plan",
      objective: "Explain Duchenne muscular dystrophy: X-linked recessive (about 30% new mutations), calf pseudohypertrophy, progressive weakness to wheelchair use, and treatment centered on glucocorticoids and physiotherapy",
      kind: "case",
      title: "A four-year-old who climbs up his own legs",
      brief:
        "A fictional 4-year-old boy, Mateo, is referred to outpatient pediatric physical therapy for \"clumsiness and toe walking\". His parents say he was late to walk (18 months), falls more than his peers, cannot jump with both feet, and takes a long time to get up from the floor. There is no family history of muscle disease. He is otherwise healthy and has not had any blood tests.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "Examination: he rises from the floor by turning prone and walking his hands up his thighs (Gowers sign), his calves look large and feel firm, he walks on his toes with a lumbar lordosis and a waddling pattern, and he cannot hop or climb stairs without a rail. Reflexes are reduced at the ankles.",
          ask: "What do you suspect, and what happens before any exercise programme?",
          parts: [
            part(
              "Suspicion and reasoning",
              "Suspects Duchenne muscular dystrophy from the Gowers sign, calf pseudohypertrophy, proximal weakness pattern, toe walking with lordosis and delayed motor milestones in a boy, and explains that no family history does not exclude it because about a third of cases are new mutations.",
              "This pattern -- Gowers sign, firm enlarged calves (pseudohypertrophy), proximal weakness with a waddling lordotic gait, toe walking and late walking in a boy -- points to Duchenne muscular dystrophy. The absence of family history does not reassure: about 30% of cases arise from new mutations."
            ),
            part(
              "Referral",
              "Contacts the referring physician/pediatrician promptly to request diagnostic work-up (serum creatine kinase, then genetic testing / neuromuscular referral) before starting an exercise programme; does not disclose a diagnosis to the family but explains the findings and the need for tests.",
              "Call the pediatrician the same week with the findings and ask for a creatine kinase test and neuromuscular referral; genetic testing confirms the diagnosis. I tell the parents what I observed and that the doctor needs to run tests, not that he has Duchenne. No strengthening programme starts until the diagnosis is clarified."
            ),
          ],
        },
        {
          text: "Creatine kinase is markedly elevated and genetic testing confirms Duchenne muscular dystrophy. He starts glucocorticoids under the neuromuscular team. The family returns to you asking \"what can we do to keep him walking as long as possible?\"",
          ask: "Design the physical therapy plan and the family's home routine.",
          parts: [
            part(
              "Programme and dose",
              "Centres the plan on contracture prevention and function: stretching of the ankle plantarflexors, hip flexors and iliotibial bands 4-6 times a week (daily is best), night ankle-foot orthoses from a young age, submaximal low-impact activity such as swimming or cycling, and avoiding high-resistance, eccentric or exhausting exercise because dystrophic muscle is damaged by overload.",
              "Daily (at least 4-6 times a week) stretching of the ankles, hip flexors and iliotibial bands taught to the parents; night-time ankle-foot orthoses to hold ankle range; keep him active with swimming, cycling and play at a pace he can recover from; no heavy resistance, eccentric loading (downhill, repeated stairs for training) or exercise to exhaustion, which damages dystrophic muscle. Serial casting is an option if an ankle contracture develops despite this."
            ),
            part(
              "Monitoring and family-centred supports",
              "Schedules regular reassessment of range, strength and timed function in step with the neuromuscular team's roughly 6-monthly reviews, coordinates with school for participation and fatigue management, plans ahead for mobility equipment, and supports the family emotionally and practically (early intervention/school services, family organisations).",
              "Measure ankle and hip range and timed functions (rise from floor, 10 m walk, stairs) every few months to match the team's roughly 6-monthly reviews, so we catch change early. Work with his preschool on rest breaks and inclusion. Talk ahead -- without alarm -- about standers, a lightweight wheelchair for distances, and home access, so equipment arrives before it is urgent. Connect the family to the neuromuscular team's social worker and a Duchenne family organisation."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------- Professional roles (2)
    {
      slug: "pcs-part-c-to-part-b-transition",
      objective: "Legal and policy frameworks: IDEA early intervention and school-based services",
      kind: "build",
      title: "Plan a child's transition from early intervention to preschool services",
      brief:
        "A fictional girl, Amara, has spastic diplegic cerebral palsy and receives Part C early intervention physical therapy at home under an IFSP. She turns three on 14 September. It is now 2 February. Her parents ask the early intervention team what happens to her therapy when she turns three, whether she will lose services, and who decides. You are the service coordinator's physical therapy lead for the transition.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the transition plan for the family: the timeline, who is involved, and how the services will differ.",
          parts: [
            part(
              "Timeline",
              "Places the transition conference not fewer than 90 days (and, with everyone's agreement, up to 9 months) before the third birthday -- so between mid-December and mid-June for a 14 September birthday -- with the school district notified at least 90 days before, the transition plan written into the IFSP, and an IEP developed and implemented by the third birthday if she is eligible.",
              "The transition conference must happen at least 90 days before 14 September and, if all parties agree, can be as early as 9 months before -- so any time from mid-December to mid-June; given it is February, we schedule it this spring. The school district must be notified at least 90 days before her birthday. Her IFSP gets a written transition plan now. If she is eligible for Part B, her IEP must be developed and in place by her third birthday."
            ),
            part(
              "Who is involved and the family's role",
              "Names the family, the Part C service coordinator and providers, and the local education agency (preschool special education) at the conference; stresses that the family consents to evaluation, participates in eligibility and the IEP, and can bring the early intervention records and the therapist's report.",
              "The conference brings together Amara's parents, the service coordinator and her early intervention therapists, and the school district's preschool special education representative. The parents give consent for the district's evaluation, sit on the eligibility and IEP team, and can share the IFSP, progress notes and my summary of her motor function and equipment."
            ),
            part(
              "How services change",
              "Explains the shift from family-centred, natural-environment services under an IFSP to educationally relevant services under an IEP (supporting access to and participation in the preschool programme), the possible change in frequency and setting, and what the family can do if medically oriented therapy is also wanted (outpatient referral).",
              "Early intervention is family-centred and happens where she lives and plays; school-based therapy under an IEP is educationally relevant -- it supports her getting around the classroom, the playground and the bus, and taking part in the curriculum. Frequency and setting may change, and it is decided by the IEP team, not carried over. If the family also wants therapy aimed at impairments outside school, that comes through an outpatient referral alongside."
            ),
          ],
        },
      ],
    },
    {
      slug: "pcs-teacher-and-aide-program",
      objective: "Education of families, teachers and interprofessional colleagues",
      kind: "build",
      title: "Write a classroom plan for a teacher and aide",
      brief:
        "A fictional 7-year-old boy, Jonah, has spastic diplegic cerebral palsy, GMFCS level III: he walks indoors with posterior walker, needs help with sit-to-stand from low seats, and uses a manual wheelchair for distances. He is starting second grade in a general education classroom with a part-time aide. His IEP goals include moving between classroom centres with his walker, standing at the sink for hand washing, and taking part in physical education. The teacher has never had a student who uses a walker and is anxious about safety and about what to let him do himself.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the one-page classroom plan you will hand to the teacher and aide and go through with them.",
          parts: [
            part(
              "Participation and independence",
              "Sets expectations that favour doing over being done for: Jonah uses the walker for centre-to-centre moves with the aide nearby rather than holding him, gets time rather than help to stand up, uses the wheelchair only for long distances or when fatigued, and takes part in PE with specific adaptations rather than sitting out.",
              "Let Jonah move himself. He walks between centres with his walker; the aide stays within arm's reach but does not hold him. Give him extra time to stand from his chair instead of lifting him; from low seats he needs a hand under the elbow, not a pull. The wheelchair is for the bus line, assemblies and field trips, or when he says he is tired. In PE he does every activity with the adaptation on the back page (for example standing at a rail for throwing, walker for relays)."
            ),
            part(
              "Set-up and safety",
              "Gives concrete environmental and handling instructions: clear 36-inch paths, a chair at a height he can stand from, a stable sink station, how to guard without grabbing, how to help after a fall (let him try his own routine first), when to call the nurse, and that equipment is adjusted only by the therapist.",
              "Keep paths between centres at least a metre wide and free of bags. His chair is set so his feet are flat and his knees are at hip height -- do not swap it. Hand washing at the sink with the step and rail. If he falls: give him a moment, ask if he is hurt, let him use his own get-up routine, then check with him. Call the nurse for a head knock or if he cannot bear weight. Do not adjust the walker or orthoses; message me and I will come in."
            ),
            part(
              "Communication and teaching method",
              "Plans how the teaching happens and how progress and concerns flow: a short in-class demonstration with the aide practising guarding, a data sheet tied to the IEP goals, a way to reach the therapist, and a check-in date; includes family and Jonah's own voice in the plan.",
              "I will spend the first morning in class demonstrating each transfer and the guarding position while the aide practises. The aide keeps a one-line daily tally against the three IEP goals (centres walked, sink standing, PE minutes). The teacher reaches me through the school messaging system; I will check in at two weeks and again before the progress report. Jonah's parents reviewed this plan, and Jonah picked the PE adaptations himself."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------- Examination (2)
    {
      slug: "pcs-standardized-tool-selection",
      objective: "Standardized developmental and functional measures across ages, including norm-referenced versus criterion-referenced tools",
      kind: "build",
      title: "Pick the right standardized tool for three referrals",
      brief:
        "Three fictional referrals land on a pediatric physical therapist's desk in the same week. (A) A 4-month-old born at 30 weeks, now 1 month corrected age, referred from the NICU follow-up clinic to determine whether motor development is on track and whether early intervention eligibility is likely. (B) A 6-year-old with spastic diplegic cerebral palsy, GMFCS level II, starting a new episode of care after a block of botulinum toxin injections; the team wants to show whether gross motor function changes. (C) A 9-year-old with developmental coordination disorder whose parents want to know how his motor skills compare with peers and whether he qualifies for school-based support.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "For each child name the tool (or tools), whether it is norm- or criterion-referenced, the ICF level it measures, and why it fits the question.",
          parts: [
            part(
              "Child A (1 month corrected)",
              "Chooses a norm-referenced infant motor measure appropriate for a 1-month corrected infant (for example the Test of Infant Motor Performance or the Alberta Infant Motor Scale) scored at corrected age, at the activity level, explaining that eligibility questions need a norm-referenced comparison, and flags that CP-specific early detection (general movements, HINE) is a separate question handled later in the fidgety window.",
              "A norm-referenced infant motor test scored at corrected age -- the Test of Infant Motor Performance suits this age, with the Alberta Infant Motor Scale as he gets older -- measuring motor activity against peers, which is what an eligibility decision needs. Whether he is at risk of cerebral palsy is a different question: that is the general movements assessment in the fidgety window and the HINE, scheduled for around 3 months corrected."
            ),
            part(
              "Child B (GMFCS II, after injections)",
              "Chooses the GMFM-66 (criterion-referenced, activity level) because it was built to measure change in gross motor function in children with CP, and pairs it with a participation or goal measure (for example the COPM) so the family's priorities are captured.",
              "The GMFM-66: criterion-referenced, activity level, designed to detect change in gross motor function in cerebral palsy -- exactly the before-and-after question after injections. Add the COPM so we also measure the goals the family cares about, at the participation level."
            ),
            part(
              "Child C (DCD, age 9)",
              "Chooses a norm-referenced motor proficiency test for school-age children (for example the Movement ABC-2 or BOT-2) at the activity level to compare with peers, plus a school participation measure (for example the School Function Assessment) because the second question is about functioning at school.",
              "A norm-referenced school-age motor test -- the Movement Assessment Battery for Children-2 or the Bruininks-Oseretsky Test-2 -- gives the peer comparison the parents asked for at the activity level. For the school-support question, add the School Function Assessment, which measures participation and task performance in the school setting and speaks the IEP team's language."
            ),
          ],
        },
      ],
    },
    {
      slug: "pcs-early-cp-detection-preterm",
      objective: "Support early detection of cerebral palsy with standardized tools such as the General Movements Assessment (under 5 months) and the Hammersmith Infant Neurological Exam (2 to 24 months), alongside MRI",
      kind: "case",
      title: "A preterm infant at high risk: which test, when, and what next",
      brief:
        "A fictional infant, Priya, was born at 27 weeks and had a grade III intraventricular hemorrhage on cranial ultrasound in the NICU. She is now 12 weeks corrected age (about 25 weeks chronological) and comes to the high-risk follow-up clinic with her parents, who ask whether she will have cerebral palsy. The neonatologist asks the physical therapist to lead the motor assessment.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "In clinic Priya is alert and calm after a feed. Her parents have brought a smartphone video of her lying on her back on a plain blanket for five minutes.",
          ask: "Which assessments do you do or arrange now, and why these at this age?",
          parts: [
            part(
              "Assessments and timing",
              "Uses the General Movements Assessment in the fidgety period (she is 12 weeks corrected, inside the window from about 7-9 weeks to 20 weeks post-term) from a standardised video, plus the HINE (valid from 2 to 24 months), and coordinates neuroimaging (MRI) with the medical team; explains that the combination gives the most accurate early prediction and that two tests are better than one if all three are not available.",
              "Now is the fidgety window (fidgety movements appear at about 7-9 weeks and last to about 20 weeks post-term), so I score a general movements assessment from a standardised video -- the parents' clip, if it meets the recording standards, otherwise one taken here -- and perform the HINE, which is valid from 2 to 24 months. MRI is arranged with the neonatology team. The international guideline recommends the three together; if only two are feasible, two still beat one."
            ),
            part(
              "What the results would mean",
              "Interprets the tools correctly: absent fidgety movements are highly predictive of cerebral palsy; a HINE score below the 3-month cut-off (57) indicates high risk; MRI shows the lesion that explains it; normal results do not fully rule it out, so surveillance continues.",
              "Absent fidgety movements predict cerebral palsy with high accuracy; a HINE below 57 at 3 months is the high-risk cut-off; MRI shows whether the IVH left injury to the motor pathways. If all are reassuring, risk is low but not zero, so she stays in follow-up."
            ),
          ],
        },
        {
          text: "The video shows absent fidgety movements. Her HINE score is 52. MRI shows periventricular white matter injury. The neonatologist gives the family a diagnosis of \"high risk of cerebral palsy\" and asks you to plan the next steps.",
          ask: "What do you recommend, and how do you talk with the family?",
          parts: [
            part(
              "Intervention recommendation",
              "Recommends immediate referral to early intervention and CP-specific early intervention rather than waiting for a confirmed diagnosis: parent-delivered, task-specific motor training in daily routines, environmental enrichment, and monitoring of hips (surveillance to start by age 2), vision and feeding, with regular re-examination.",
              "Refer to early intervention now -- a high-risk designation is enough to start. Begin parent-delivered, goal-directed motor practice built into daily routines (reaching, rolling, supported sitting), enrich the play environment, and set up surveillance: hips by age 2 per the AACPDM pathway, vision, hearing and feeding with the team. Re-examine at each visit; the HINE tracks change over the first two years."
            ),
            part(
              "Family communication",
              "Communicates honestly and hopefully in plain language: what 'high risk' means and does not mean, that early intervention is why we test early, that the family are the main agents of therapy, acknowledges distress and offers supports (social work, parent groups), and avoids predicting walking or a GMFCS level this early.",
              "Sit with the parents: 'high risk' means the tests say cerebral palsy is likely, not certain, and it is why we tested early -- so we can start helping her brain learn movement now. They will do most of the therapy through everyday play, with us coaching. I do not predict whether she will walk; her abilities will become clearer over the next two years. I acknowledge how hard this is, offer the clinic's social worker and a parent network, and write down what we agreed."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------- Evaluation, diagnosis, prognosis (2)
    {
      slug: "pcs-classify-cp-and-explain",
      objective: "Classification systems in cerebral palsy and their prognostic meaning",
      kind: "build",
      title: "Classify a child's gross motor function and explain what it means",
      brief:
        "A fictional 8-year-old girl, Lena, has bilateral spastic cerebral palsy. In the clinic she walks with a posterior walker in all indoor settings, needs a hand or a surface to get from the floor or a chair to standing, sits on a bench with no support, and uses a manual wheelchair pushed by a parent for the school corridor and outings. Her parents ask what her \"level\" is and whether she will \"walk on her own one day\". The school asks for the level to plan support.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Assign the GMFCS level with the evidence, explain its purpose, and answer the parents' question honestly.",
          parts: [
            part(
              "Level and evidence",
              "Assigns GMFCS level III using the 6-12 year band: walks with a hand-held mobility device indoors, needs physical assistance or a surface for transfers, uses wheeled mobility for long distances, and sits with at most limited support; distinguishes it from level IV (self-mobility limited, powered mobility or transport, adaptive seating for trunk control).",
              "GMFCS level III in the 6 to 12 year band: she walks indoors with a hand-held device (her walker), needs a person or surface for sit-to-stand and floor-to-stand, uses wheeled mobility for distance, and sits independently. She is not level IV because she sits without adaptive seating and moves herself indoors rather than being transported or needing powered mobility."
            ),
            part(
              "What the classification is for",
              "States that the GMFCS describes current, usual performance across settings (home, school, community), is used for communication, planning and research, and is stable enough after about age 2 to anticipate equipment and service needs, but it explicitly does not grade movement quality or potential for improvement.",
              "The GMFCS classifies what she usually does, not her best effort, and it lets the school, the clinic and researchers talk about the same child. Levels are reasonably stable from early childhood, so it helps plan equipment and support, but the system itself says it does not judge movement quality or prognosis for improvement."
            ),
            part(
              "Answer to the family",
              "Answers the 'walk on her own' question honestly and kindly: level III children typically keep walking with a device indoors and use wheeled mobility for distances into adolescence; the aim is to keep and use her walking, protect her hips and energy, and widen participation; avoids both false promise and foreclosure, and brings in Lena's own goals.",
              "I tell her parents that children at level III usually continue to walk indoors with a device and use a wheelchair for longer distances as they grow, and that this is what we plan around -- keeping her walking strong and efficient, protecting her hips, and making sure she can get where she wants to go. I will not promise unaided walking, and I will not rule out change. Then I ask Lena what she wants to be able to do this year."
            ),
          ],
        },
      ],
    },
    {
      slug: "pcs-hips-and-shunt-referral-case",
      objective: "Recognizing conditions requiring medical referral: hip displacement, scoliosis progression, shunt malfunction, cardiorespiratory decline",
      kind: "case",
      title: "Two things that need a doctor before they need a therapist",
      brief:
        "A fictional 5-year-old boy, Kai, has spastic quadriplegic cerebral palsy, GMFCS level IV, with a ventriculoperitoneal shunt placed in infancy for hydrocephalus. He is seen weekly in a school-based programme. His last hip radiograph was 14 months ago (migration percentage 22% on the left, 18% on the right). The therapist notices this week that his left hip abducts to about 25 degrees with the hip and knee flexed, down from about 40 degrees at the last measurement, and he grimaces when the hip is moved.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "His parents say he has been \"a bit grumpy with diaper changes\" for a few weeks but is otherwise himself.",
          ask: "What do you do about the hips, and why now?",
          parts: [
            part(
              "Recognition and referral",
              "Recognises hip displacement risk at GMFCS IV, triggers referral to pediatric orthopaedics now because hip abduction is below 30 degrees and he has hip pain, and requests an updated supine AP pelvis radiograph for migration percentage (the AACPDM pathway refers for MP above 30% and/or abduction under 30 degrees); notes surveillance is overdue for his level.",
              "At GMFCS IV hip displacement is common, and the pathway says refer to pediatric orthopaedics when abduction is under 30 degrees and/or migration percentage is over 30%, and for hip pain. He now has abduction of about 25 degrees and pain, and his radiograph is 14 months old -- overdue at his level, where surveillance is at least yearly and often 6-monthly. I ask the physician for an urgent standardized supine AP pelvis film and an orthopaedic referral this week."
            ),
            part(
              "Therapy while waiting",
              "Adjusts therapy to protect the hip: no forced abduction stretching into pain, reviews positioning and seating for symmetrical hips and adequate abduction (sleep and wheelchair), monitors pain and documents range, and informs the family and school team.",
              "Until orthopaedics has seen him: no end-range abduction stretching into pain, check his wheelchair pelvic positioning and night positioning for symmetry and gentle abduction, document the abduction and pain each visit, and explain to the parents and school nurse what we are watching for."
            ),
          ],
        },
        {
          text: "Two weeks later, before the orthopaedic appointment, his teacher reports he has vomited twice at school this morning without fever, is unusually sleepy and hard to rouse after lunch, and his mother mentions he has been irritable with headaches for three days.",
          ask: "What is the priority now?",
          parts: [
            part(
              "Recognition",
              "Recognises possible shunt malfunction (vomiting without fever, unusual drowsiness and difficulty waking, irritability, headaches in a child with a VP shunt) and treats it as urgent, not as a routine illness.",
              "A shunted child with headaches, vomiting without fever, irritability and now drowsiness he is hard to rouse from has a possible shunt malfunction. Trouble staying awake is the sign that needs urgent attention."
            ),
            part(
              "Action",
              "Stops therapy, has the school nurse and parents contacted immediately, directs same-day emergency evaluation (emergency department / neurosurgery), documents observations and times, and does not wait for the orthopaedic visit or treat symptoms as behavioural.",
              "Stop the session. Get the school nurse now, call his mother, and send him for immediate emergency evaluation with his neurosurgery team informed -- not a wait-and-see or a GP appointment. I document what I saw and when, so the emergency team has the timeline. The hip appointment is separate and can follow."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------- Intervention (2)
    {
      slug: "pcs-torticollis-first-visit-to-discharge",
      objective: "Intervention for musculoskeletal conditions: torticollis and plagiocephaly, scoliosis, fractures, sports injuries and limb deficiency",
      kind: "case",
      title: "Congenital muscular torticollis from first visit to discharge",
      brief:
        "A fictional 10-week-old girl, Nora, is referred with a persistent right head tilt and a preference for looking left since birth. Pregnancy and delivery were uncomplicated apart from a breech presentation. Examination: passive cervical rotation to the right is 25 degrees less than to the left, lateral flexion to the left is limited, there is a small firm mass in the right sternocleidomastoid, mild right posterior-occipital flattening, and symmetric hip examination with normal tone and visual tracking.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "The parents ask how serious it is and what they should do at home.",
          ask: "Classify the severity, set the plan, and give the home programme.",
          parts: [
            part(
              "Classification and screening",
              "Classifies severity using the CPG's grid factors -- age at evaluation (under 3 months, early), an SCM mass present, rotation difference between 15 and 30 degrees -- and confirms the screen for non-muscular causes is done (tone, vision, hips for dysplasia given breech, skull shape), noting the plagiocephaly as an associated finding to monitor.",
              "She is an early presentation (under 3 months) with an SCM mass and a 25-degree rotation difference; on the 2018 CPG grid the three factors -- age, mass, rotation difference -- place her among the more severe early grades, because a mass raises the grade at any age. Screening is reassuring: normal tone and visual tracking, symmetrical hips (important with the breech history), and mild deformational plagiocephaly that we document and track."
            ),
            part(
              "First-choice interventions",
              "Prescribes the CPG's five first-choice interventions: neck passive range of motion, neck and trunk active range of motion, development of symmetrical movement, environmental adaptations, and parent/caregiver education, with a home programme for daily use.",
              "Gentle passive stretching of right rotation and left lateral flexion several times a day; active rotation to the right through visual and play positioning; symmetry work in prone and supported sitting; environmental changes (crib and changing-table orientation, carry positions, side-lying play, limiting time in containers); and teaching the parents why and how, with a written programme and tummy time off the flat spot."
            ),
          ],
        },
        {
          text: "At 16 weeks of age, after six weeks of twice-weekly therapy and a daily home programme, rotation difference is 20 degrees, the mass is unchanged in size, and the head tilt is still visible at rest. The parents are tired and ask whether this is working.",
          ask: "What does the guideline say to do now, and what do you tell the family?",
          parts: [
            part(
              "Decision",
              "Applies the CPG's lack-of-progress rule: asymmetries not beginning to resolve after 4-6 weeks of comprehensive intervention mean consulting the physician about other interventions, while checking adherence and technique and continuing therapy; keeps referral criteria in view (mass still present at 7 months or older, 10-15 degree deficits at 12 months).",
              "Six weeks in with only a 5-degree gain and a persistent tilt meets the guideline's trigger to consult the referring physician about additional options, so I write to the pediatrician now while we continue. I also review the home programme with the parents and watch the technique, since dose and quality are the usual reasons for slow change. If the mass persists at 7 months or deficits remain near 12 months, the referral criteria apply."
            ),
            part(
              "Family message and discharge criteria",
              "Reassures and re-engages the family honestly, names the discharge criteria they are working toward (passive range within 5 degrees of the other side, symmetrical active movement, age-appropriate motor development, no visible head tilt, parents know what to monitor), and plans reassessment 3-12 months after discharge or at walking.",
              "I tell them many infants with a mass take longer and that we are asking the pediatrician whether anything else should be added, not giving up. We are aiming for: rotation within 5 degrees of the left side, symmetrical active movement, motor skills on track, no head tilt, and them knowing what to watch. After discharge she is rechecked between 3 and 12 months later or when she starts walking, because tilt can reappear with new skills."
            ),
          ],
        },
      ],
    },
    {
      slug: "pcs-mobility-and-orthotic-decisions",
      objective: "Orthotic, assistive-technology, seating and mobility decisions across the lifespan of disability",
      kind: "build",
      title: "Decide mobility, seating and orthoses for a child moving to middle school",
      brief:
        "A fictional 11-year-old boy, Dev, has spastic diplegic cerebral palsy, GMFCS level III. He walks at home and in his small primary school with a posterior walker and solid ankle-foot orthoses, but his new middle school is large, with five minutes between classes across two buildings. He has grown 7 cm this year, his crouch has increased, he complains of knee pain by afternoon, and he says he does not want to \"be pushed around in a wheelchair\" by an aide. His family's insurance will fund one mobility device this year.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the recommendation for mobility, seating and orthoses with the reasoning for each.",
          parts: [
            part(
              "Mobility recommendation",
              "Recommends independent wheeled mobility for distance -- a lightweight manual wheelchair he propels himself or a power-assist option if propulsion across two buildings is not realistic -- while keeping walking with the walker for short distances, framed as energy conservation and independence rather than giving up walking, and involves Dev in the choice.",
              "He needs his own wheels for the long moves: a lightweight manual wheelchair he propels himself, with a trial of power assist if two buildings in five minutes is beyond his propulsion. He keeps the walker for classrooms, home and short distances. This is about arriving on time, out of pain and under his own power -- the opposite of being pushed -- and Dev chooses the chair and the set-up."
            ),
            part(
              "Seating and fit",
              "Specifies seating that supports upright posture and function: seat depth and height to growth, pelvic positioning, a cushion for pressure and stability, footplates, configuration for efficient propulsion, and a plan to re-fit because he is growing fast.",
              "Seat depth and width fitted with room for growth and the back height low enough for free arm swing; a firm pelvic position with a contoured cushion; footplates set so the thighs are supported; rear axle forward enough for efficient pushes. Re-check fit every six months given 7 cm of growth this year."
            ),
            part(
              "Orthoses and the crouch",
              "Reviews the ankle-foot orthoses in light of growth and increased crouch -- re-cast or adjust for fit, consider a ground-reaction design to control knee flexion in stance if ankle and knee range allow -- and links the knee pain and crouch to a gait and orthopaedic review rather than treating them with more walking distance.",
              "His AFOs are a year old and he has grown: re-measure and re-cast. With increasing crouch and afternoon knee pain, discuss a ground-reaction AFO design to help knee extension in stance, provided hamstring and plantarflexor range allow it, and ask for a gait and orthopaedic review of the crouch. Reducing the distance he walks is part of protecting his knees, not a loss."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------- Outcomes (1)
    {
      slug: "pcs-outcomes-across-icf-levels",
      objective: "Outcome measures at the body-function, activity and participation levels in pediatrics",
      kind: "build",
      title: "Choose outcome measures across the ICF and say what change counts",
      brief:
        "A fictional 5-year-old girl, Sofia, has spastic diplegic cerebral palsy, GMFCS level II, and is starting a 12-week block of goal-directed, task-specific training after serial casting of both ankles. Her parents' goals, in their words: \"keep up with her friends on the playground\" and \"climb the stairs at home without holding my hand\". The clinic requires one measure each at the body-function, activity and participation levels, and a statement of the change that would be meaningful to the family before the block starts.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the outcome plan: the measure at each level, and the change that would matter.",
          parts: [
            part(
              "Body function",
              "Chooses an impairment measure linked to the casting and the goals -- ankle dorsiflexion passive range with a goniometer and a spasticity or selective control measure -- and says what change would matter (maintaining the range gained from casting; any change read against measurement error).",
              "Passive ankle dorsiflexion with the knee extended and flexed, measured the same way each time, plus a selective motor control measure of the lower limb. Meaningful change at this level is keeping the range gained from casting through the block; small changes are read against goniometer error of a few degrees."
            ),
            part(
              "Activity",
              "Chooses the GMFM-66 (criterion-referenced, built for change in CP) and names the published MCID for GMFCS level II -- about 1.0 point for a medium effect (1.5 for a large effect) -- as the threshold for meaningful change, with a stairs item or timed stair test for the family's specific goal.",
              "The GMFM-66, with dimension E (walking, running, jumping) as the focus. For a child at GMFCS level II the published minimal clinically important difference is about 1.0 point for a medium effect and 1.5 for a large one, so a gain of 1 or more on the GMFM-66 counts. I also time the home stairs task with and without a hand held."
            ),
            part(
              "Participation",
              "Chooses a family-centred participation or goal measure (for example the COPM scored by the parents for the two goals, or a participation questionnaire such as the CAPE/PAC) and names the COPM change of 2 or more points on performance or satisfaction as clinically meaningful; involves Sofia in rating where feasible.",
              "The COPM with her parents, rating performance and satisfaction from 1 to 10 for 'keeping up on the playground' and 'climbing the home stairs unaided'; a change of 2 or more points is the clinically meaningful threshold. Sofia rates the playground goal in her own words too, and we repeat both at 12 weeks."
            ),
          ],
        },
      ],
    },
  ],
};
