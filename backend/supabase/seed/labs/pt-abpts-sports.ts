import { CLINICAL_SAFETY, part, type SeedLabSet } from "./types";
import { source } from "../sources";

// REQ-152: ABPTS Sports Clinical Specialist (ABPTSSCS), authored labs.
//
// Aligned to the ABPTS sports examination outline (knowledge 20%,
// professional roles 5%, assessment 30%, clinical intervention 35%,
// outcomes 10%; seed/tracks/pt-abpts.ts). Density (hybrid, docs/labs.md):
// 2/1/3/3/1 = 10. The two heaviest domains carry the sideline and
// return-to-sport decisions the exam tests: concussion recognition and
// removal, bone stress triage, exertional heat stroke, criterion-based
// progression, and the limb symmetry arithmetic behind functional testing.
//
// Sources checked 2026-11-07:
//   OUTLINE   ABPTS, Specialist Certification Examination Outline: Sports
//             https://specialization.apta.org/become-a-specialist/sports/specialist-certification-examination-outline-sports
// Every clinical value in these labs is one the track's own objectives
// already carry, verified there on 2026-11-04 against the sources tagged
// in seed/tracks/pt-abpts.ts: SCAT6 / Child SCAT6 ages 5-12 and the fact
// that over 90% of concussions occur without loss of consciousness,
// emergency red flags after head injury, 24-48 hours of relative rest then
// a stepwise return with medical clearance (SP-CONC); high-risk bone stress
// sites and medial tibial stress syndrome as a continuum (SP-SF, SP-MTSS);
// exertional heat stroke above about 40 C with CNS dysfunction, ice-water
// immersion, rectal temperature, stop cooling at 38-39 C (SP-HS);
// exercise-associated hyponatremia below 135 mmol/L from over-drinking
// hypotonic fluid (SP-EAH); the female athlete triad's three components
// (SP-FAT); apophyseal traction injuries (SP-OSG, SP-SEV, SP-LLE); the
// preparticipation evaluation's history-based yield and full / limited /
// no-participation outcome (SP-PPE); hypertrophic cardiomyopathy as the
// leading cause of sudden death in young athletes (SP-SDA); and the AAOS
// 2023 ACL guideline (AAOS-ACL): injury-prevention training programmes
// reduce primary ACL injury in high-risk sports, prophylactic bracing is
// not preferred, functional bracing after reconstruction is not routine,
// hop tests are one factor in return-to-sport with limited evidence.
// Limb symmetry index arithmetic in the testing lab is computed from the
// fictional values given; no symmetry cut-off is asserted as a standard
// because none could be verified today (the search budget was exhausted).
//
// SAFETY: every athlete is fictional; exam practice, not clinical guidance.
// Emergency steps are framed as the venue's emergency action plan and the
// team physician's call. All needs_expert_review until a board-certified
// sports physical therapist approves it (docs/labs.md).

export const ABPTSSCS_LABS: SeedLabSet = {
  trackCode: "ABPTSSCS",
  sources: [source("https://specialization.apta.org/become-a-specialist/sports/specialist-certification-examination-outline-sports", "exam_outline", "2026-11-07")],
  labs: [
    // ----------------------------------------------------------------- Knowledge areas (2)
    {
      slug: "scs-runner-triad-recognition",
      objective: "Explain the female athlete triad as low energy availability (intake that falls short of what training burns, with or without an eating disorder) combined with menstrual disorder and reduced bone mineral density",
      kind: "case",
      title: "A distance runner with shin pain, again",
      brief:
        "A fictional 17-year-old cross-country runner is referred for her second episode of left medial tibial pain this year; the first settled with rest. She runs about 70 km a week, has increased mileage to make the state team, and says she \"eats clean\" and has lost about 4 kg since the summer. Her periods started at 13; she has had none for seven months. No history of eating disorder is recorded. Her coach wants her back for a race in three weeks.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "Examination: focal tenderness over the posteromedial tibial border at the junction of the middle and distal thirds, pain on single-leg hop, no swelling, normal alignment, hip abductor weakness on the left.",
          ask: "What pattern do you recognise, and who else needs to be involved before you plan her rehabilitation?",
          parts: [
            part(
              "Pattern recognition",
              "Recognises the female athlete triad: low energy availability (intake not matching training load, with weight loss and rising mileage, with or without disordered eating), menstrual dysfunction (secondary amenorrhea for seven months) and likely low bone mineral density expressed as recurrent bone stress injury; frames the shin pain as a bone stress injury on the MTSS-to-stress-fracture continuum rather than an isolated overuse problem.",
              "Three linked findings: energy intake that no longer covers 70 km a week (4 kg lost, 'eating clean'), seven months without a period, and a second bone stress injury in a year -- the female athlete triad. The shin pain is a bone stress injury somewhere on the continuum from medial tibial stress syndrome to stress fracture, and the underlying problem is the energy deficit, not her shins."
            ),
            part(
              "Referrals",
              "Refers to the team or primary physician for medical evaluation (amenorrhea work-up, bone density assessment, imaging of the tibia as indicated) and to a sports dietitian for energy availability, screens for disordered eating with sensitivity and refers to mental health if indicated, and involves the athlete and, with her consent, her parents and coach in the plan; does not set a race date.",
              "Before any rehabilitation plan: physician referral for the amenorrhea work-up, a decision on bone density testing and tibial imaging; a sports dietitian to restore energy availability; a sensitive screen for disordered eating with mental health referral if it is positive. With her agreement, her parents and coach are part of the conversation about load. The three-week race is not mine to promise."
            ),
          ],
        },
        {
          text: "Imaging shows a posteromedial tibial stress reaction without a fracture line. The physician confirms low bone density for age and a diagnosis of the triad, clears her for non-impact training, and the dietitian begins an energy-restoration plan. The athlete is upset about missing the season.",
          ask: "Plan the rehabilitation and training modification, and how you will talk with her and her coach.",
          parts: [
            part(
              "Rehabilitation and load",
              "Plans a non-impact conditioning programme (deep-water running, cycling, swimming) to protect fitness, hip and calf strengthening, graded return to impact only when pain-free and after medical and nutritional progress, with load progression governed by symptoms and bone healing rather than the race calendar; adds gait and footwear review.",
              "Keep her fit without loading the tibia: deep-water running and cycling at matched effort, hip abductor and calf strengthening, trunk work. Impact returns in a graded walk-jog ladder only when she is pain-free on hop testing and the physician and dietitian report progress; each step up is earned, not scheduled. Review footwear and running cadence."
            ),
            part(
              "Communication",
              "Communicates with the athlete about the triad as a health issue with long-term bone consequences, avoiding blame or weight talk, and with the coach (with consent) about load, energy and the reason the season changes; anticipates pressure to return early and holds the line on medical clearance.",
              "I explain to her that this is about her bones for the next fifty years, not about willpower or weight, and that eating enough is training. With her permission I meet the coach: the mileage increase outran her fuelling, the stress reaction is the warning, and return follows medical clearance and pain-free testing, not the fixture list."
            ),
          ],
        },
      ],
    },
    {
      slug: "scs-apophyseal-injuries-triage",
      objective: "Explain growth-plate traction injuries in young athletes: Osgood-Schlatter at the tibial tubercle from jumping and sprinting, Sever disease at the calcaneal apophysis (ages 8 to 15) and little league elbow from repeated valgus stress",
      kind: "build",
      title: "Three young athletes, three growth-plate complaints",
      brief:
        "A fictional youth sports clinic sees three children in one evening. (1) A 13-year-old basketball player with anterior knee pain and a tender, prominent bump below the kneecap, worse with jumping and kneeling, for six weeks. (2) A 10-year-old soccer player with heel pain at the back of both heels after practice, walking on his toes afterwards, tender to squeezing the heel; he just moved up to firm-ground cleats. (3) A 12-year-old pitcher with medial elbow pain during the late cocking and acceleration phases, who threw in two leagues this spring; there is tenderness over the medial epicondyle and no locking or catching.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "For each child name the condition, the mechanism at the growth plate, and the management decision, including anything that would change it.",
          parts: [
            part(
              "Child 1 (knee)",
              "Names Osgood-Schlatter disease: traction apophysitis at the tibial tubercle from repeated quadriceps pull in jumping and sprinting; manages with activity modification to tolerance rather than complete rest, quadriceps and hip flexibility and strength, ice and padding for kneeling, and reassurance that it settles with skeletal maturity; flags acute inability to extend the knee or a sudden pop (possible avulsion) for imaging.",
              "Osgood-Schlatter disease: the patellar tendon pulls on the still-open tibial tubercle apophysis with every jump and sprint. Modify, don't stop -- reduce jumping volume to a level that keeps pain low, stretch and strengthen quadriceps and hips, ice after play, knee padding for kneeling. It resolves as the apophysis closes. A sudden pop or inability to straighten the knee against gravity would need imaging for avulsion."
            ),
            part(
              "Child 2 (heels)",
              "Names Sever disease (calcaneal apophysitis, typical ages 8-15): traction by the Achilles on the calcaneal apophysis plus impact, provoked by the change in footwear and surface; manages with load reduction, calf stretching, heel cups or cushioned footwear, a check of the new cleats, gradual return; notes bilateral heel pain is typical and that night pain, swelling or systemic features would prompt referral.",
              "Sever disease: the Achilles tugs on the calcaneal growth plate and the new firm-ground cleats added impact. Bilateral is typical. Cut practice load until walking is pain-free, calf stretching twice daily, heel cups or a cushioned shoe, review the cleats, then build back. Night pain, a swollen hot heel or fever would send him to the physician instead."
            ),
            part(
              "Child 3 (elbow)",
              "Names little league elbow (medial epicondyle apophysitis) from repeated valgus stress in throwing, made likely by pitching in two leagues; manages with a throwing shutdown until pain-free, then a graded interval throwing programme, kinetic-chain and mechanics work, and education on pitch counts and rest; refers for imaging if there is a locking/catching history, loss of extension, acute pop or persistent pain (to exclude avulsion or lateral-side osteochondritis dissecans).",
              "Little league elbow: valgus stress on the medial epicondyle apophysis every pitch, with two leagues' worth of pitches and no rest. Stop throwing until he is pain-free and the epicondyle is not tender, work the shoulder, trunk and legs and his mechanics, then an interval throwing programme and strict pitch-count and rest rules across both leagues. Locking, catching, lost extension, a pop or pain that does not settle means imaging to rule out an avulsion or osteochondritis dissecans."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------- Professional roles (1)
    {
      slug: "scs-preparticipation-cardiac-history",
      objective: "Use the preparticipation evaluation as the sports specialist's screening tool: personal and family history finds most conditions that limit play, and it ends in a full, limited or no-participation recommendation",
      kind: "build",
      title: "Make the preparticipation call on a history that worries you",
      brief:
        "At a fictional high-school mass preparticipation evaluation, a 16-year-old football lineman's form shows: one episode of \"passing out\" during sprints last season, attributed by his family to the heat; occasional chest tightness during hard conditioning; and an uncle who \"dropped dead\" at 34 while jogging. His examination by the station physician is normal, including heart sounds standing and supine. The athletic director needs a clearance decision before the first contact practice on Monday.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the participation recommendation and the reasoning, what happens next, and how you handle the pressure of Monday.",
          parts: [
            part(
              "Recommendation",
              "Recommends no participation (not cleared) pending cardiology evaluation, because exertional syncope, exertional chest tightness and a first-degree-relative-type sudden death under 50 are red flags for conditions such as hypertrophic cardiomyopathy, the leading cause of sudden death in young athletes; a normal examination does not clear him.",
              "Not cleared -- no participation until cardiology has seen him. Exertional syncope, exertional chest tightness and a relative who died suddenly at 34 during exercise are exactly the history items that find the conditions that kill young athletes, with hypertrophic cardiomyopathy the most common. A normal stethoscope exam cannot exclude them."
            ),
            part(
              "Why history carries the decision",
              "Explains that the preparticipation evaluation's yield comes mainly from the personal and family history, that the physical examination is usually normal in these conditions, and that the PPE's output is one of three recommendations: full participation, limited participation (with specified restrictions), or no participation pending evaluation.",
              "The PPE finds most limiting conditions through the personal and family history, not the exam; cardiac conditions in particular are usually silent on auscultation. The evaluation must end in one of three outcomes -- full, limited or no participation -- and his history lands on no participation pending work-up."
            ),
            part(
              "Next steps and communication",
              "Documents the findings and recommendation, refers to the team physician/cardiology for evaluation (ECG and further testing as cardiology decides), communicates clearly and without alarm with the athlete and family, informs the athletic director of the status without disclosing details beyond what is needed, and refuses to clear for Monday regardless of pressure; notes that the venue emergency action plan and AED access matter for everyone meanwhile.",
              "Document the red flags and the no-participation recommendation, hand him to the team physician today for cardiology referral -- ECG and whatever cardiology adds. Tell him and his parents plainly: these symptoms need a heart check before contact practice, most athletes are cleared afterwards, and the risk of skipping the check is not acceptable. The athletic director hears 'not cleared pending medical evaluation', nothing more. Monday's practice does not change the decision; it is also a good day to confirm the field's emergency action plan and AED."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------- Assessment (3)
    {
      slug: "scs-sideline-concussion-case",
      objective: "Use the SCAT6 for sideline concussion assessment (Child SCAT6 for ages 5 to 12), remembering that over 90% of concussions occur without loss of consciousness",
      kind: "case",
      title: "A collision, no loss of consciousness, and a player who wants back in",
      brief:
        "You are the fictional sideline physical therapist at a high-school lacrosse game. A 16-year-old midfielder takes a shoulder to the head, goes to one knee for a few seconds, gets up and jogs to the sideline. She did not lose consciousness. She says she is \"fine\" and asks to go back on. Her coach looks at you.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "On the bench she is slow to answer where she is and which quarter it is, says the lights are too bright, and repeats a question you already answered.",
          ask: "What do you decide and do right now?",
          parts: [
            part(
              "Removal decision",
              "Removes her from play immediately and does not return her the same day on the basis of observable and reported signs (slowed responses, photophobia, repetition) despite no loss of consciousness, explaining that over 90% of concussions occur without loss of consciousness.",
              "She is out for the rest of the game, now. Slow answers, light sensitivity and repeating herself after a head blow are concussion signs; no loss of consciousness means nothing -- more than 90% of concussions happen without it. 'I'm fine' is not an assessment."
            ),
            part(
              "Assessment and safety screen",
              "Performs a structured sideline assessment with the SCAT6 (Child SCAT6 would apply for ages 5-12) in a quiet space, including symptom evaluation, cognitive and balance screening, and first screens for red flags that require emergency transport (neck pain or tenderness, seizure, worsening headache, repeated vomiting, focal weakness or numbness, increasing confusion or drowsiness, loss of consciousness) and for cervical spine injury before moving her.",
              "First the red-flag screen: neck pain or tenderness, double vision, weakness or tingling, severe or worsening headache, seizure, vomiting, increasing confusion or drowsiness -- any of these and she goes by ambulance. With the neck clear, I take her somewhere quiet and run the SCAT6: symptoms, orientation and memory, concentration, balance and coordination. At 16 the adult SCAT6 applies; the Child SCAT6 is for 5 to 12."
            ),
          ],
        },
        {
          text: "The SCAT6 confirms symptoms and impaired recall; no red flags. Her parents arrive and ask what to do tonight and when she can play again. A regional tournament starts in nine days.",
          ask: "Give the plan for tonight, the first days, and the return pathway.",
          parts: [
            part(
              "Tonight and the first days",
              "Instructs that an adult monitors her, with emergency care for any deterioration (worsening headache, repeated vomiting, increasing drowsiness or confusion, seizure, weakness); arranges medical evaluation; prescribes 24-48 hours of relative rest (light daily activity as tolerated, limited screens) rather than complete dark-room rest, then gradual increase in activity.",
              "An adult stays with her tonight and takes her to emergency care for worsening headache, repeated vomiting, growing confusion or drowsiness, a seizure or weakness. She sees a physician in the next day or two. For the first 24-48 hours: relative rest -- light walking and daily activities that do not worsen symptoms, screens kept short -- not lying in a dark room. Then she gradually adds activity as symptoms allow."
            ),
            part(
              "Return pathway",
              "Sets a stepwise, symptom-guided return to school first and then to sport, with no return to contact or competition until a medical provider clears her, and states that the tournament date cannot set the pace; coordinates with school for academic adjustments.",
              "Return is a staircase: symptom-limited activity, then light aerobic work, sport-specific drills, non-contact training, and only after a medical provider clears her, full contact and then competition -- each step only once the previous one is tolerated. School comes before sport, with temporary academic adjustments. The tournament in nine days is a date on the calendar, not a target; she plays when she has climbed the stairs and is cleared."
            ),
          ],
        },
      ],
    },
    {
      slug: "scs-bone-stress-site-triage",
      objective: "Recognize stress fractures as overload injuries, 0.7% to 20% of sports medicine clinic injuries; flag high-risk sites (femoral neck, anterior tibia, tarsal navicular, talus, sesamoids, 5th metatarsal) where non-union risk is high",
      kind: "case",
      title: "Groin pain in a marathoner: low risk or high risk?",
      brief:
        "A fictional 29-year-old man training for his first marathon has had deep right groin and anterior hip pain for three weeks. It began as an ache after long runs and now hurts walking up stairs and at night. He increased from 40 to 75 km a week over six weeks. No trauma, no clicking, no back pain. He is otherwise healthy and takes no medication.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "Examination: antalgic gait, pain at the end of hip flexion and internal rotation, pain on single-leg hop that he refuses to repeat, tenderness is deep and not palpable, resisted hip flexion is painful. Lumbar screen is clear.",
          ask: "What is your working diagnosis, how does the suspected site change your urgency, and what do you do today?",
          parts: [
            part(
              "Working diagnosis and site risk",
              "Suspects a bone stress injury of the femoral neck -- a high-risk site where displacement and non-union risk is high -- from a rapid load increase with deep groin pain progressing to night and walking pain and a positive hop test; contrasts it with low-risk sites (for example posteromedial tibia) where graded loading can proceed.",
              "The rapid jump from 40 to 75 km, deep groin pain that now wakes him and hurts on stairs, and pain on hopping point to a femoral neck bone stress injury. That is a high-risk site: a stress fracture there can displace or fail to unite, so it is handled completely differently from a posteromedial tibial stress injury, where graded loading usually works."
            ),
            part(
              "Action today",
              "Makes him non-weight-bearing or protected weight-bearing with crutches immediately, stops all running and impact, and refers urgently to a sports physician/orthopaedics for imaging (radiographs, then MRI as decided), explaining why no further hop or provocative testing is done; screens for energy availability and bone health risk factors.",
              "Crutches now, protected weight bearing, no more hop tests or provocation -- the point is already made. Urgent referral to the sports physician for imaging; plain films first, MRI if they are normal. I ask about diet, weight change and training history for bone-health risk factors and pass them on."
            ),
          ],
        },
        {
          text: "MRI shows a femoral neck stress fracture on the compression (inferior) side without a visible fracture line through the cortex. The orthopaedic surgeon chooses non-operative care: protected weight bearing for six weeks and \"PT to manage the return\".",
          ask: "Plan the rehabilitation and return to running.",
          parts: [
            part(
              "Protected phase",
              "Respects the surgeon's weight-bearing restriction, maintains fitness with non-impact modes that do not load the hip in pain (deep-water running, upper-body work, stationary cycling only if pain-free and permitted), works hip and trunk strength within restrictions, and watches for warning signs (increasing pain at rest or night) that trigger immediate surgical review.",
              "Six weeks on crutches as ordered. Deep-water running and upper-body conditioning keep him fit; cycling only if the surgeon allows and it is pain-free. Isometric and non-weight-bearing hip and trunk strengthening. Any increase in rest or night pain goes straight back to the surgeon -- compression-side fractures can still progress."
            ),
            part(
              "Return to running",
              "Progresses only on imaging and clinical clearance: pain-free walking, then single-leg loading and hop tolerance, then a walk-run programme with conservative weekly increases, addressing the training error (volume increase), gait and strength deficits, and bone health; sets realistic expectations about the marathon.",
              "After clearance and pain-free full weight bearing: restore single-leg strength and hop tolerance, then a walk-run ladder with small weekly increases and no back-to-back hard days, rebuilding over months rather than weeks. Fix what caused it -- a near-doubling of volume -- with a written progression rule. The first marathon moves to a later date."
            ),
          ],
        },
      ],
    },
    {
      slug: "scs-return-to-sport-test-battery",
      objective: "Functional and performance testing used in return-to-sport decisions",
      kind: "build",
      title: "Score a return-to-sport test battery and make a recommendation",
      brief:
        "A fictional 20-year-old collegiate soccer midfielder is 8 months after left ACL reconstruction (hamstring autograft) with no meniscal repair. She has been running and cutting in training. Today's battery, uninvolved (right) then involved (left): single-leg hop for distance 171 cm vs 152 cm; triple hop 4.98 m vs 4.21 m; crossover hop 1.49 m vs 1.38 m; isokinetic quadriceps peak torque 2.1 vs 1.7 Nm/kg; hamstring peak torque 1.3 vs 1.2 Nm/kg. She scores low on a psychological readiness questionnaire and says she is \"scared to plant on it\". The coach asks whether she can start full matches next week.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Calculate the limb symmetry indices, interpret the whole battery, and write your recommendation to the team.",
          parts: [
            part(
              "Limb symmetry indices",
              "Computes LSI as involved divided by uninvolved x 100 within rounding: single hop about 88.9%, triple hop about 84.5%, crossover hop about 92.6%, quadriceps about 81%, hamstrings about 92%.",
              "LSI = involved / uninvolved x 100. Single hop 152/171 = 88.9%. Triple hop 4.21/4.98 = 84.5%. Crossover 1.38/1.49 = 92.6%. Quadriceps torque 1.7/2.1 = 81.0%. Hamstrings 1.2/1.3 = 92.3%."
            ),
            part(
              "Interpretation",
              "Interprets the battery as a whole: quadriceps strength and the triple hop show the largest deficits, hop tests are one factor and carry limited evidence on their own (AAOS), symmetry can flatter if the uninvolved limb has also detrained, and psychological readiness is a separate and low domain; concludes she is not yet ready for unrestricted match play.",
              "The weakest links are quadriceps strength (81%) and the triple hop (84.5%); the crossover hop and hamstrings look better. Hop tests are one factor, not a clearance -- the AAOS rates the evidence for them as limited -- and comparing to her own right leg can flatter her if that leg has also lost strength since surgery. Add fear of planting and a low readiness score, and she is not ready for full matches."
            ),
            part(
              "Recommendation",
              "Recommends continued criterion-based progression: targeted quadriceps strengthening and plyometric/hop progression, graded exposure to planting and cutting plus a psychological readiness plan, continued full training participation short of competition, retest in a set interval, and a shared decision with the surgeon and physician; notes a functional knee brace is not routinely indicated and does not substitute for strength.",
              "To the team: keep her in full training including contact drills, but not match minutes yet. Four to six weeks of heavy quadriceps work, a plyometric and change-of-direction progression, and graded, confidence-building exposure to planting with the sport psychologist's input. Retest the full battery then, and decide together with the surgeon and team physician. A functional brace is not a shortcut; AAOS does not recommend routine bracing after reconstruction."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------- Clinical intervention (3)
    {
      slug: "scs-collapse-in-the-heat",
      objective: "Emergency management and athlete safety: spine-injury management, sudden cardiac arrest, heat illness and the emergency action plan",
      kind: "case",
      title: "Collapse at the finish line on a hot day",
      brief:
        "You are the fictional medical lead at a half-marathon finish on a 31 degree C humid morning. The medical tent has an immersion tub with ice water, rectal thermometers, an AED, oral and IV fluids under the physician's control, and an agreed emergency action plan with EMS on site. A 24-year-old runner staggers across the line, collapses, and is carried in. He is confused and combative, hot to the touch and sweating, pulse 140, breathing rapidly. His friend says he drank at every aid station.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "The physician asks you to run the initial assessment while they manage the airway and get a line in.",
          ask: "What do you measure first, what is your leading diagnosis, and what must happen in the next minutes?",
          parts: [
            part(
              "Assessment and differential",
              "Obtains a rectal temperature immediately (the only reliable core measure here) alongside pulse, breathing and mental status; leads with exertional heat stroke (central nervous system dysfunction with a core temperature above about 40 degrees C) while keeping exercise-associated hyponatremia (over-drinking hypotonic fluid, sodium below 135 mmol/L) and cardiac causes in the differential; checks the AED is at hand.",
              "Rectal temperature now -- skin, oral or ear readings are useless here -- with pulse, breathing and a mental status check. Confused and combative after exertion in the heat is exertional heat stroke until proven otherwise: CNS dysfunction with a core temperature above about 40 C. Because he drank at every station, hyponatremia (sodium under 135) is the other diagnosis that causes confusion and collapse, and the AED stays open beside us in case this is cardiac."
            ),
            part(
              "Immediate management",
              "States 'cool first, transport second': whole-body cold-water immersion started within minutes if rectal temperature confirms heat stroke, monitoring rectal temperature continuously and stopping cooling at about 38-39 degrees C, with EMS activated per the emergency action plan and transport after cooling; withholds oral fluids from a confused patient and defers any IV fluid decision to the physician pending sodium.",
              "If the rectal temperature is above 40 C: into the ice-water tub immediately, head supported, rectal probe in, stir the water, and stop cooling when he reaches about 38-39 C -- cool first, transport second, with EMS activated per the plan and the ambulance waiting. No oral fluids to a confused man; the physician decides on IV fluid once a point-of-care sodium is back, because flooding a hyponatremic runner with fluid makes it worse."
            ),
          ],
        },
        {
          text: "Rectal temperature is 41.2 degrees C. Cooling is started. After 15 minutes he is 38.6 degrees C and less confused; EMS transports him. The race director asks for a debrief: \"what do we change for next year?\"",
          ask: "Write the emergency action plan review.",
          parts: [
            part(
              "What worked",
              "Identifies the elements that saved time: on-site rectal thermometry, an immersion tub ready and filled, cooling before transport, a physician on site, EMS pre-positioned and a rehearsed plan with defined roles and communication.",
              "The plan did its job: a filled tub, rectal thermometry at hand, cooling started within minutes and stopped at the right temperature, EMS on site and briefed, roles clear. That is what turns heat stroke into a survivable event."
            ),
            part(
              "What to change",
              "Recommends prevention and preparedness changes: a wet-bulb globe temperature policy with start-time or cancellation thresholds, acclimatisation and hydration education that warns against over-drinking (drink to thirst), more cooling capacity and shade at the finish, point-of-care sodium testing, sweep teams on the course, and an annual rehearsal of the EAP including spine-injury and cardiac-arrest scenarios.",
              "For next year: a wet-bulb globe temperature policy with an earlier start or cancellation threshold; pre-race messaging on acclimatisation and drinking to thirst rather than at every station; a second tub and shade at the finish; point-of-care sodium in the tent; roving teams on the last 5 km; and a full rehearsal of the emergency action plan each season covering heat stroke, cardiac arrest with the AED, and a suspected spinal injury."
            ),
          ],
        },
      ],
    },
    {
      slug: "scs-acl-criterion-based-phases",
      objective: "Rehabilitation and return-to-activity progression with criterion-based phases",
      kind: "build",
      title: "Write criterion-based phases after ACL reconstruction",
      brief:
        "A fictional 22-year-old recreational basketball player is 2 weeks after ACL reconstruction with a bone-patellar tendon-bone autograft and no meniscal repair. The surgeon's protocol allows weight bearing as tolerated and full range of motion with no brace requirement, and asks the physical therapist to supply \"criterion-based phases, not a calendar\". He wants to return to pick-up basketball and asks whether he should buy a knee brace for when he plays.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the phases with the entry criteria for each, the exit criteria for return to sport, and your answer about the brace.",
          parts: [
            part(
              "Early and intermediate phases",
              "Defines the early phase goals and criteria (full extension equal to the other side, swelling controlled, quadriceps activation with straight-leg raise without lag, normal gait) and the intermediate phase entry criteria (those met) with its content (progressive strength, neuromuscular control, bike to light jog when strength and swelling allow), each gated by criteria rather than weeks.",
              "Phase 1: protect the graft and restore basics. Exit when extension matches the other knee, flexion is progressing, swelling is minimal, he does a straight-leg raise with no lag and walks normally without crutches. Phase 2: strength and control. Enter on those criteria; progress closed-chain and then open-chain quadriceps and hamstring loading, balance and landing mechanics; begin jogging only when quadriceps strength and swelling allow, not on a date."
            ),
            part(
              "Late phase and return criteria",
              "Defines the late phase (plyometrics, change of direction, sport-specific drills) and return-to-sport exit criteria as a battery: strength symmetry, hop symmetry, movement quality under fatigue, psychological readiness, sport-specific tolerance and medical clearance, noting hop tests are one factor with limited evidence and that time since surgery also matters for graft maturation.",
              "Phase 3: plyometrics, cutting, basketball drills with increasing speed and unpredictability. Return to pick-up games when the battery is passed -- quadriceps and hamstring strength close to symmetrical, hop symmetry, clean landing and cutting mechanics even when tired, a readiness questionnaire that says he trusts the knee, full-speed practice without reaction -- and the surgeon clears him. Hop tests are one factor with limited evidence, so they never clear him alone, and the graft needs time to mature whatever the tests say."
            ),
            part(
              "The brace question",
              "Answers that routine functional knee bracing after reconstruction is not recommended (AAOS), that strength and neuromuscular control are what protect the knee, and that bracing may be discussed for specific situations with the surgeon.",
              "No brace needed for playing: the AAOS guideline does not support routine functional bracing after reconstruction, and a brace does not replace quadriceps strength and good landing mechanics, which are what actually protect the graft. If he or the surgeon has a specific reason to consider one, that is a conversation with the surgeon."
            ),
          ],
        },
      ],
    },
    {
      slug: "scs-acl-prevention-program-design",
      objective: "Injury prevention programs and the epidemiology that justifies them",
      kind: "build",
      title: "Design an ACL injury-prevention programme for a girls' soccer club",
      brief:
        "A fictional girls' soccer club (ages 14-18, four teams, two coaches per team, no medical staff) had three non-contact ACL ruptures last season. The board asks a sports physical therapist for a prevention programme that coaches can run themselves, and wants to know why it should work and whether they should instead buy every player a prophylactic knee brace.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the programme proposal: the evidence case, the programme itself, and how you will implement and measure it.",
          parts: [
            part(
              "Evidence case",
              "States that neuromuscular injury-prevention training programmes reduce primary ACL injuries in high-risk sports such as soccer (AAOS 2023), that adolescent female athletes in cutting and landing sports are a high-risk group and most ACL ruptures are non-contact, and that prophylactic knee bracing is not a preferred prevention option.",
              "Injury-prevention training programmes cut primary ACL injuries in high-risk sports like soccer -- that is the AAOS guideline's recommendation -- and adolescent girls in a cutting, landing sport are exactly the population they were built for; most ruptures are non-contact, which is what training can change. Prophylactic braces are not a preferred option, so the money goes into the programme, not braces."
            ),
            part(
              "Programme content and dose",
              "Specifies a coach-led structured warm-up of about 15-20 minutes, 2-3 times a week across the whole season, with running, strength (hamstrings, hips, trunk), plyometric and landing training, balance, and cutting technique with feedback on knee alignment (avoid dynamic knee valgus), progressed in levels.",
              "A structured warm-up replacing the current jog-and-stretch: about 15-20 minutes before every training session and match (2-3 times a week minimum), with running drills, strength for hamstrings, glutes and trunk (Nordic hamstring, single-leg bridges, planks), jumping and landing with soft, knees-over-toes technique, single-leg balance, and cutting drills, progressed through three levels over the season. Coaches cue 'knees over toes, land soft' and correct knee-in landings."
            ),
            part(
              "Implementation and measurement",
              "Plans coach training and fidelity (workshop, video cards, periodic observation), adherence tracking (sessions completed per team), injury surveillance with exposure (ACL and other knee injuries per 1,000 athlete-exposures) over the season compared with last year, and a review point.",
              "Train all eight coaches in a 90-minute workshop with video cards and visit each team twice early in the season to check technique. Each coach logs sessions completed; the club records every injury with exposure hours so we can report knee injuries per 1,000 athlete-exposures against last year's three ACLs. Review at mid-season and at the end, and adjust the levels."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------- Outcomes (1)
    {
      slug: "scs-outcome-measures-for-two-athletes",
      objective: "Patient-reported and performance-based outcome measures for athletes",
      kind: "build",
      title: "Choose the outcome set for two athletes and say how you will read change",
      brief:
        "Two fictional athletes start rehabilitation the same week. Athlete 1: a 19-year-old volleyball player 6 weeks after ACL reconstruction whose goal is to return to competitive play. Athlete 2: a 35-year-old recreational runner with a 10-week history of lateral hip pain (gluteal tendinopathy) whose goal is to finish a 10 km race pain-free. Your clinic requires, for every athlete, one region- or condition-specific patient-reported measure, one measure of sport or activity level, one performance-based test, and a statement of how change will be judged.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the outcome set for each athlete and the rule you will use to read change.",
          parts: [
            part(
              "Athlete 1 (post-ACL)",
              "Chooses a knee-specific patient-reported measure (for example the IKDC subjective form or KOOS), a sport/activity-level scale (for example the Tegner or Marx), a psychological readiness measure (for example the ACL-RSI), and performance tests appropriate to the phase (quadriceps strength now; hop test battery later), with reasons.",
              "Knee-specific: the IKDC subjective form or the KOOS. Activity level: the Tegner or Marx scale to record pre-injury and current levels. Psychological readiness: the ACL-RSI, because fear predicts who returns. Performance: quadriceps strength now, and the hop battery once she is cleared for impact -- hop tests are one factor with limited evidence, so they sit beside the others."
            ),
            part(
              "Athlete 2 (gluteal tendinopathy)",
              "Chooses a hip- or condition-specific patient-reported measure (for example the VISA-G for gluteal tendinopathy or the HOOS), a running-specific activity measure (weekly pain-free running volume or a patient-specific functional scale for the 10 km goal), and a performance test (single-leg stance and single-leg hop or step-down tolerance, hip abductor strength), with reasons.",
              "Condition-specific: the VISA-G for gluteal tendinopathy (or the HOOS if the clinic prefers). Activity: pain-free running volume each week and a patient-specific functional scale for the 10 km goal. Performance: hip abductor strength with a dynamometer, single-leg stance time, and a single-leg hop or step-down tolerance score."
            ),
            part(
              "Reading change",
              "States the rule: use each measure's published minimal clinically important difference or minimal detectable change where one exists, otherwise the athlete's own goal threshold; re-administer at fixed points with the same instrument; and interpret performance symmetry with caution because the uninvolved limb can detrain.",
              "Each questionnaire is re-done at fixed points with the identical version, and change is read against that measure's published minimal clinically important difference or minimal detectable change -- looked up for the exact instrument and version -- and, where none exists, against the athlete's own goal (a pain-free 10 km; full matches). Symmetry scores are read knowing the other limb may have weakened too, so absolute strength is tracked alongside."
            ),
          ],
        },
      ],
    },
  ],
};
