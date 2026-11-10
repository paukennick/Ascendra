import { CLINICAL_SAFETY, part, type SeedLabSet } from "./types";
import { NREMT_BLS_EXAMS, NREMT_EMR_PLAN, NREMT_EXAM_CONTENT, SCOPE_OF_PRACTICE_2019 } from "./ems-sources";

// REQ-174: NREMT Emergency Medical Responder (EMR Examination
// Specifications, live 2025-04-07).
//
// Density (hybrid, DEFAULT_LAB_POLICY) over the five domains at their
// range-midpoint weights 21/39/6/22/12: 2/3/2/2/2 = 11 (10 case, 1 build).
//
// SCOPE is EMR scope from the National EMS Scope of Practice Model 2019 (with
// Change Notices 1.0 and 2.0). The EMR opens and adjuncts the airway (oral
// airway only), ventilates, gives oxygen by nasal cannula or non-rebreather,
// suctions, does CPR and AED, controls bleeding (tourniquet and wound packing
// included), stabilises the spine and fractures, makes emergency moves,
// assists an uncomplicated delivery, and gives naloxone (intranasal or
// auto-injector) and chemical-antidote auto-injectors. The EMR has no pulse
// oximetry, glucose monitoring, oral glucose, aspirin or agency epinephrine
// auto-injector, and does not transport: every case ends by handing over to
// the transporting crew, and every decision beyond that scope is the crew's.
//
// Values quoted come from ems-sources.ts (read 2026-11-09); which lab rests on
// which is in value-sources.ts. All labs are needs_expert_review until an EMS
// clinical reviewer reads them (docs/labs.md).

export const NREMTEMR_LABS: SeedLabSet = {
  trackCode: "NREMTEMR",
  sources: [NREMT_EMR_PLAN, NREMT_EXAM_CONTENT, NREMT_BLS_EXAMS, SCOPE_OF_PRACTICE_2019],
  labs: [
    // ---- Scene Size-up and Safety (2) ----
    {
      slug: "emr-mci-grandstand-collapse",
      objective: "Triage multiple patients with a mass-casualty triage system as the first responder on scene",
      kind: "case",
      title: "A grandstand gives way",
      brief:
        "Fictional call. You are a firefighter-EMR, first on scene alone at a small-town football game where a section of temporary seating has collapsed. The rest of the stand has been cleared and a structural engineer is not needed to keep people away -- the collapsed section is on the ground and stable. Roughly a dozen people are hurt. Ambulances are 12 minutes away. Your agency triages with SALT (Sort, Assess, Lifesaving interventions, Treatment/Transport).",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "People are shouting for help from several directions.",
          ask: "What do you do in your first minute?",
          parts: [
            part(
              "Report and resources",
              "Gives dispatch a size-up -- mass-casualty incident, number of patients, hazards, best access -- and requests multiple ambulances, ALS and command support before starting patient care.",
              "Radio: 'Mass-casualty incident, stand collapse at the football field, about twelve injured, scene now stable. Request five ambulances, ALS and a supervisor; access from the north gate.'"
            ),
            part(
              "Global sort",
              "Asks those who can walk to go to a named place, then those who cannot walk to wave or move, and goes first to those who are still or have an obvious life threat.",
              "'Everyone who can walk, go to the scoreboard.' Then 'If you can't walk, wave.' I go first to the people who aren't moving."
            ),
          ],
        },
        {
          text: "A boy of about 10 is not moving and not breathing. A man is sitting against a post with blood spurting from his lower leg, talking to you.",
          ask: "What do you do for each in the seconds you can spend?",
          parts: [
            part(
              "The child",
              "Opens the airway and, because he is a child, gives two rescue breaths; if he then breathes, places him on his side and categorises him immediate; if not, categorises dead/expectant and moves on.",
              "Open his airway and, since he's a child, two rescue breaths. If he starts breathing he goes on his side as immediate; if not, he's tagged dead and I move on."
            ),
            part(
              "The man",
              "Applies a tourniquet above the spurting leg wound as a life-saving intervention (or directs a walking bystander to hold firm pressure), then categorises him immediate.",
              "A tourniquet above the wound right away, then he's immediate."
            ),
          ],
        },
        {
          text: "The first ambulance crew and a fire officer arrive.",
          ask: "What do you hand over?",
          parts: [
            part(
              "Handover to command",
              "Reports the number of patients in each category and where they are, life-saving interventions done (tourniquet with time), hazards, and asks for an assignment; continues re-triage as directed.",
              "'Twelve patients: two immediate -- the man by the post with a tourniquet on at 19:42, and a boy on his side by the stairs -- three delayed on the bench, six minor at the scoreboard, one dead. Stand is stable. Where do you want me?'"
            ),
          ],
        },
      ],
    },
    {
      slug: "emr-wires-down-crash",
      objective: "Recognise an electrical or hazardous-materials hazard and keep yourself and bystanders out of danger until trained responders arrive",
      kind: "case",
      title: "A car against a power pole",
      brief:
        "Fictional call at night. A car has hit a utility pole. A power line is lying across the bonnet and another is down on the wet grass beside the car. The driver, alone in the car, is awake and calling for help. Bystanders are walking towards the car to pull her out.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "You stop well back from the pole.",
          ask: "What do you do about the bystanders and the scene?",
          parts: [
            part(
              "Protect people",
              "Stops the bystanders from approaching, treats every downed line as live, keeps everyone well back from the car, the lines and the area of ground around them, and does not approach or touch the car.",
              "Shout to the bystanders to stop and move back. I treat the lines as live and keep everyone -- me included -- well away from the car and the wet ground near the lines."
            ),
            part(
              "Resources",
              "Requests the power company to de-energise the lines and fire, plus a transporting ambulance, through dispatch.",
              "Dispatch: power company to cut the power, fire, and an ambulance."
            ),
          ],
        },
        {
          text: "The driver opens her door and says she is going to get out because her neck hurts and she is scared.",
          ask: "What do you tell her?",
          parts: [
            part(
              "Instruction",
              "Tells her to stay in the car with hands off the metal and not to step out, because stepping out could complete a circuit through her body; explains help is coming; she should leave only if the car catches fire, and then only by jumping clear without touching the car and ground together (as directed by fire).",
              "'Stay in the car and don't touch the metal. Getting out could electrocute you. The power company and fire are on the way. If there's a fire, fire crews will tell you how to jump clear.'"
            ),
          ],
        },
        {
          text: "The power company confirms the lines are de-energised and fire declares the scene safe. The driver is alert, complaining of neck pain, and moving all limbs.",
          ask: "What do you do now within EMR scope, and what do you hand over?",
          parts: [
            part(
              "Care",
              "Approaches only after the scene is declared safe, provides manual spinal stabilisation if indicated by her neck pain, assesses airway, breathing, circulation and mental status, and checks for any electrical contact injury.",
              "Now I go in: hold her head still, check airway, breathing, circulation and her level of consciousness, and ask whether she touched anything metal."
            ),
            part(
              "Handover",
              "Hands over to the transporting crew: mechanism, the electrical hazard and that she stayed in the car, her complaints, findings and what was done.",
              "'Driver versus pole, lines down on the car; she stayed inside until power was cut. Neck pain, alert, moving everything. I've held manual stabilisation.'"
            ),
          ],
        },
      ],
    },

    // ---- Primary Assessment (3) ----
    {
      slug: "emr-arrest-at-the-gym",
      objective: "Recognise cardiac arrest and perform high-quality CPR with an AED",
      kind: "case",
      title: "Down on the treadmill",
      brief:
        "Fictional call. You are an off-duty EMR at a gym when a 58-year-old man collapses from a treadmill. A staff member brings the gym's AED and a pocket mask. Nobody else is trained.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "He does not respond to your voice or a tap. His chest is not moving except for an occasional gasp.",
          ask: "What do you do, and what do you ask the staff member to do?",
          parts: [
            part(
              "Recognition and call",
              "Treats the gasping as abnormal breathing, checks for a pulse for no more than 10 seconds, and has the staff member call 911 and bring the AED.",
              "Occasional gasps aren't breathing. I check for a pulse for no more than 10 seconds; none. 'You -- call 911 and bring the AED.'"
            ),
            part(
              "CPR",
              "Starts compressions in the centre of the chest at 100-120/min, at least 2 inches (5 cm) deep without exceeding 6 cm, full recoil, and 30 compressions to 2 breaths with the pocket mask.",
              "Hands in the centre of the chest, 100 to 120 a minute, at least 2 inches deep, letting the chest come back up. 30 compressions, then 2 breaths with the pocket mask."
            ),
          ],
        },
        {
          text: "The AED arrives. His chest is sweaty.",
          ask: "How do you use the AED with as little interruption as possible?",
          parts: [
            part(
              "AED",
              "Keeps compressions going while the AED is switched on and the chest is wiped dry, places pads as pictured, stops compressions only for analysis and shock, makes sure no one touches him, and restarts compressions immediately after the shock.",
              "Keep compressing while the staff member turns it on. Wipe his chest dry and put the pads on. Hands off only for analysis -- 'Everyone clear' -- shock, then straight back to compressions."
            ),
          ],
        },
        {
          text: "After two minutes the AED says no shock advised. The ambulance crew walks in.",
          ask: "What do you do and say?",
          parts: [
            part(
              "Continue and hand over",
              "Resumes CPR immediately after a no-shock advisory without a long pulse check, and hands over concisely: witnessed collapse time, CPR start, number of shocks and times, and anything known about him.",
              "Straight back to compressions. To the crew: 'Collapsed at 07:10, witnessed. CPR from 07:11, one shock at 07:13, no shock just now. No history known.'"
            ),
          ],
        },
      ],
    },
    {
      slug: "emr-choking-infant",
      objective: "Relieve a severe foreign-body airway obstruction in an adult, child or infant",
      kind: "case",
      title: "A baby who cannot cry",
      brief:
        "Fictional call. A father runs to your fire station holding his 8-month-old daughter. She was eating small pieces of grape. She is awake but cannot cry or cough, her lips are turning blue and she is struggling to breathe.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "You are the only EMR in the station; your partner is calling 911.",
          ask: "What do you do?",
          parts: [
            part(
              "Recognition",
              "Recognises a severe airway obstruction (unable to cry or cough, cyanosis) in a responsive infant.",
              "She can't cry or cough and she's turning blue: a severe obstruction."
            ),
            part(
              "Technique",
              "Gives repeated cycles of 5 back blows (infant face down along the forearm, head lower than the body) then 5 chest thrusts (face up, on the lower half of the breastbone), and does not use abdominal thrusts on an infant; no blind finger sweeps.",
              "Face down on my forearm, head low, 5 firm back blows between the shoulder blades; turn her over, 5 chest thrusts on the lower breastbone. Repeat. No abdominal thrusts on a baby, and no blind finger sweeps."
            ),
          ],
        },
        {
          text: "After two cycles she goes limp and stops trying to breathe.",
          ask: "What do you do now?",
          parts: [
            part(
              "Unresponsive infant",
              "Lays her on a firm surface and starts CPR (compressions about 1.5 inches / 4 cm, one third of the chest depth, using the heel of one hand or two-thumb encircling technique); each time the airway is opened, looks in the mouth and removes an object only if seen, then tries breaths.",
              "On the table, start CPR: compressions about one and a half inches deep with the heel of one hand. When I open her airway I look in her mouth and take out the grape only if I can see it, then try breaths."
            ),
          ],
        },
        {
          text: "On the third look you see a piece of grape and remove it. She gasps, then cries. The ambulance crew arrives.",
          ask: "What do you hand over?",
          parts: [
            part(
              "Handover",
              "Reports the obstruction, the time she became unresponsive, how long CPR went on, what removed the object, and her current state, and advises she needs evaluation even though she now cries.",
              "'8-month-old, choked on grape around 12:20. Back blows and chest thrusts, went limp at 12:22, CPR for about a minute, grape removed when seen, crying since 12:24. She still needs to be checked at hospital.'"
            ),
          ],
        },
      ],
    },
    {
      slug: "emr-opioid-naloxone-intranasal",
      objective: "Recognise suspected opioid overdose, ventilate, and give naloxone within EMR scope",
      kind: "case",
      title: "Slumped in a parked car",
      brief:
        "Fictional call. Police ask you, a sheriff's deputy trained as an EMR, to check a man slumped in a parked car. The scene is secured. He is about 25, does not respond to a loud voice or a sternal rub, and has a slow pulse at the wrist. Your kit has a bag-valve mask with oxygen, oral airways, a nasal cannula, a non-rebreather mask and intranasal naloxone 4 mg.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "He is breathing about 4 times a minute with snoring sounds; his pupils are very small and a burnt foil is on the seat.",
          ask: "What do you do first, and why before naloxone?",
          parts: [
            part(
              "Airway and breathing",
              "Gets him onto his back on a firm surface, opens the airway (head tilt-chin lift or jaw thrust), inserts an oral airway if he has no gag reflex, and ventilates with the BVM and oxygen, because the immediate threat is too little breathing; ventilation comes before naloxone.",
              "Out of the car onto the ground, open the airway, an oral airway since he doesn't gag, and ventilate with the BVM and oxygen. He's dying from not breathing -- that comes before any drug."
            ),
          ],
        },
        {
          text: "After a minute of ventilation his colour improves, but he still breathes only 4-6 times a minute on his own.",
          ask: "Do you give naloxone, how, and what are you aiming for?",
          parts: [
            part(
              "Naloxone",
              "Gives intranasal naloxone within EMR scope, keeps ventilating, and aims for adequate breathing, not full wakefulness.",
              "Yes -- 4 mg intranasal into one nostril. I keep bagging him. I want him breathing adequately, not necessarily wide awake."
            ),
            part(
              "Safety",
              "Anticipates that he may wake agitated, vomit or try to leave, protects the airway (recovery position if he vomits), and keeps police nearby.",
              "He might wake up suddenly, vomit or be angry, so I'm ready to roll him onto his side and the deputy stays close."
            ),
          ],
        },
        {
          text: "Four minutes later he breathes 14 times a minute and groans. The ambulance arrives; he says he does not want to go to hospital.",
          ask: "What do you hand over, and why does he need to be seen?",
          parts: [
            part(
              "Handover",
              "Reports how he was found, breathing rate before and after, ventilation given, naloxone dose, route and time, and current state.",
              "'Found unresponsive, breathing 4 a minute, pinpoint pupils, foil in the car. Ventilated with BVM and oxygen from 22:05. Naloxone 4 mg intranasal at 22:07. Now breathing 14, groaning.'"
            ),
            part(
              "Why transport",
              "Explains that the naloxone may wear off before the opioid does and breathing can slow again, so the transporting crew should assess him and his capacity to refuse.",
              "Naloxone can wear off before the drug does and he could stop breathing again -- the crew needs to assess him and whether he can refuse."
            ),
          ],
        },
      ],
    },

    // ---- Secondary Assessment (2) ----
    {
      slug: "emr-older-fall-anticoagulant",
      objective: "Recognise when an older adult's fall needs trauma-centre evaluation, such as a head strike while taking an anticoagulant",
      kind: "case",
      title: "\"I only slipped in the bathroom\"",
      brief:
        "Fictional call. A 79-year-old man slipped in his bathroom an hour ago. He is sitting on the edge of the bath, alert and oriented, and wants you to leave. There is a small bruise on his forehead. Pulse 80, respirations 16, manual BP 156/90.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "He says he feels fine apart from a mild headache.",
          ask: "What history do you take, and what do you specifically ask?",
          parts: [
            part(
              "SAMPLE and OPQRST",
              "Takes a SAMPLE history and OPQRST for the headache, and asks specifically whether he hit his head, lost consciousness, and takes blood thinners; asks why he fell (dizziness, chest pain, tripping).",
              "Signs and symptoms, allergies, medications, history, last meal, events -- and especially: did he hit his head, did he black out, and does he take a blood thinner? Did he trip, or get dizzy first?"
            ),
          ],
        },
        {
          text: "He did hit his head on the sink and takes an anticoagulant for atrial fibrillation. He does not think he passed out.",
          ask: "What does this change, and what do you tell the ambulance crew?",
          parts: [
            part(
              "Significance",
              "Recognises that a head strike in an older adult taking an anticoagulant puts him at risk of bleeding inside the skull even if he looks well, and that the field triage guideline lists anticoagulant use and low-level falls with a significant head impact at 65 or older as reasons to consider a trauma centre.",
              "A head strike on a blood thinner at 79: he could be bleeding inside his head even though he looks fine now. That's a reason to go to a trauma centre."
            ),
            part(
              "Report",
              "Tells the crew the head strike, the anticoagulant, the headache, and baseline mental status and vital signs, and supports them in persuading him to go.",
              "'Fall with head strike on the sink, takes an anticoagulant, mild headache, alert and oriented, P 80, BP 156/90. He wants to stay, but I think he needs a trauma centre.'"
            ),
          ],
        },
        {
          text: "While you wait, he repeats himself and says his headache is getting worse.",
          ask: "What do you do?",
          parts: [
            part(
              "Reassess",
              "Reassesses mental status and vital signs, recognises a worsening head injury, updates the transporting crew so they come with urgency, and keeps him safe from another fall.",
              "Recheck his orientation and vitals -- he's getting worse. Update dispatch that he's deteriorating, lie him down safely and stay with him."
            ),
          ],
        },
      ],
    },
    {
      slug: "emr-heat-stroke-runner",
      objective: "Recognise heat stroke from altered mental status and hot skin, and begin active cooling",
      kind: "case",
      title: "Mile 12 of a hot half-marathon",
      brief:
        "Fictional call. You are an EMR at a medical tent on a hot, humid day. A 30-year-old runner is brought in by two others, confused, staggering and unable to say where he is. His skin is hot and he is sweating. The tent has a cold-water tub, ice and towels; an ambulance is on standby 5 minutes away.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "His friends say he was 'fine' an hour ago.",
          ask: "What do you suspect, and what tells you?",
          parts: [
            part(
              "Recognition",
              "Suspects exertional heat stroke because of altered mental status with hot skin during exercise in heat; notes that sweating does not rule it out and that confusion distinguishes it from heat exhaustion.",
              "Heat stroke: he's confused and hot after running in the heat. Sweating doesn't rule it out -- the confusion is what makes it heat stroke rather than exhaustion."
            ),
          ],
        },
        {
          text: "His airway is clear and he is breathing fast. The ambulance is called.",
          ask: "How do you cool him?",
          parts: [
            part(
              "Active cooling",
              "Begins active cooling immediately and does not wait for transport: removes excess clothing and immerses him in cold water (the fastest method), or if not possible uses rotating ice-water towels, keeps his head and airway above water, and keeps monitoring.",
              "Strip off his top and get him into the cold-water tub now, holding his head up. If the tub weren't there, I'd rotate ice-water towels over him."
            ),
            part(
              "Fluids",
              "Gives nothing by mouth while he is confused.",
              "Nothing to drink while he's confused."
            ),
          ],
        },
        {
          text: "After several minutes he answers questions correctly. The ambulance crew arrives.",
          ask: "What do you hand over?",
          parts: [
            part(
              "Handover",
              "Reports the presentation, time cooling started and method, his response, and that he still needs evaluation and transport.",
              "'30-year-old runner, confused and hot at 10:40. Cold-water immersion from 10:43; now oriented. He still needs to go in.'"
            ),
          ],
        },
      ],
    },

    // ---- Patient Treatment and Transport (2) ----
    {
      slug: "emr-glass-door-forearm",
      objective: "Control life-threatening external bleeding with direct pressure, a tourniquet or wound packing",
      kind: "case",
      title: "An arm through a glass door",
      brief:
        "Fictional call. A 19-year-old pushed his arm through a glass door. He has a deep cut on the inside of his upper arm, with dark and bright blood flowing heavily, and is pale and anxious. You have gloves, gauze, a pressure bandage and a commercial tourniquet; an ambulance is 8 minutes away.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "No glass is left in the wound. You press hard with gauze.",
          ask: "Blood keeps soaking through. What do you do?",
          parts: [
            part(
              "Escalate",
              "Recognises that direct pressure is not controlling the bleeding and applies a commercial tourniquet on the upper arm, 2-3 inches above the wound and not over the elbow, tightening until the bleeding stops.",
              "Pressure isn't working, so the tourniquet goes on high on the arm, 2 to 3 inches above the cut and not on the elbow, tightened until the bleeding stops."
            ),
          ],
        },
        {
          text: "The bleeding stops. He says the tourniquet is very painful and asks you to take it off.",
          ask: "What do you do and say?",
          parts: [
            part(
              "Keep it on",
              "Does not loosen or remove it, explains that pain is expected and means it is working, and notes the time.",
              "'I know it hurts. That means it's working, and I can't loosen it.' I note the time: 16:25."
            ),
            part(
              "Shock care",
              "Lays him down, keeps him warm, gives oxygen if indicated within protocol, and reassesses for renewed bleeding.",
              "Lie him down, blanket over him, oxygen per protocol, and keep checking that the bleeding hasn't started again."
            ),
          ],
        },
        {
          text: "The ambulance crew arrives.",
          ask: "What do you hand over about the tourniquet?",
          parts: [
            part(
              "Handover",
              "States the tourniquet time (also written on or near the patient), that it is uncovered and visible, the bleeding before and after, and his condition.",
              "'Tourniquet on at 16:25, written on his arm, left uncovered. Heavy bleeding that pressure didn't stop; controlled now. Pale and anxious.'"
            ),
          ],
        },
      ],
    },
    {
      slug: "emr-precipitous-delivery",
      objective: "Assist an uncomplicated delivery and care for the newborn",
      kind: "case",
      title: "The baby is coming now",
      brief:
        "Fictional call. A 27-year-old woman, 39 weeks pregnant with her second baby, had strong contractions start 40 minutes ago. She says she needs to push and feels she must move her bowels. The ambulance is 15 minutes away. You have an obstetric kit with towels, cord clamps, a blanket and gloves.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "With her consent you look and see the baby's head at the vaginal opening during a contraction.",
          ask: "Is delivery imminent, and how do you prepare?",
          parts: [
            part(
              "Recognition",
              "Recognises imminent delivery from crowning, the urge to push and the urge to move the bowels, so delivery happens on scene rather than waiting for transport.",
              "Yes -- the head is crowning and she has the urge to push. The baby will be born here."
            ),
            part(
              "Preparation",
              "Uses PPE, positions her on her back with knees bent (or as she prefers), places clean towels, and keeps the room warm.",
              "Gloves and eye protection, her on her back with knees up on clean towels, and the room warmed up."
            ),
          ],
        },
        {
          text: "The head delivers. You feel a loop of cord around the baby's neck.",
          ask: "What do you do?",
          parts: [
            part(
              "Head and nuchal cord",
              "Supports the head with gentle counterpressure so it does not deliver explosively, checks for the cord, slips the loop over the head if possible (clamps twice and cuts between only if it cannot be freed), and does not routinely suction.",
              "Gentle support on the head as it comes. The cord is loose enough, so I slip it over the head. No routine suctioning."
            ),
          ],
        },
        {
          text: "The baby girl delivers, is pink in the body and cries. The placenta has not delivered.",
          ask: "How do you care for the newborn and the mother until the crew arrives?",
          parts: [
            part(
              "Newborn",
              "Dries, warms and stimulates the baby, places her skin to skin on the mother's chest with a blanket over both, and clamps and cuts the cord after about 1 minute (keeping the baby not much higher than the mother before then).",
              "Dry her, warm her, rub her back, onto mum's chest skin to skin with a blanket. Clamp and cut the cord after a minute."
            ),
            part(
              "Mother",
              "Does not pull on the cord to deliver the placenta, watches for heavy bleeding, and hands over the time of birth, the newborn's condition and the placenta status.",
              "I don't pull the cord. I watch her bleeding. To the crew: 'Girl born 03:12, cried straight away, cord cut at 03:13, placenta not out yet, bleeding light.'"
            ),
          ],
        },
      ],
    },

    // ---- Operations (2) ----
    {
      slug: "emr-handoff-to-crew",
      objective: "Write a structured handoff report for the arriving EMS crew",
      kind: "build",
      title: "Hand over a fall from a ladder",
      brief:
        "Fictional call. 14:02 you arrived as a fire-department EMR at a home where a 46-year-old man fell about 8 feet from a ladder onto grass at 13:55. He is alert and oriented, complains of right wrist pain (8/10) and a deformed right wrist, and denies hitting his head or neck pain. He takes no regular medications and has no allergies. You stabilised the wrist with a padded splint at 14:08; circulation, movement and sensation in the right hand were present before and after. Vital signs at 14:05: pulse 96, respirations 18, manual BP 138/86. At 14:15: pulse 90, respirations 16, BP 134/84. The ambulance crew arrives at 14:18.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the handoff you give the crew in four parts: patient and problem, mechanism and history, findings and vital-sign trend, and care given with times.",
          parts: [
            part(
              "Patient and problem",
              "Opens with age, sex and the main problem in one sentence.",
              "46-year-old man, fall from a ladder, deformed right wrist."
            ),
            part(
              "Mechanism and history",
              "States height and surface, time of fall, pertinent negatives (no head strike, no neck pain), medications and allergies.",
              "Fell about 8 feet onto grass at 13:55. No head strike, no neck pain. No medications, no allergies."
            ),
            part(
              "Findings and trend",
              "Gives mental status, pain score, distal circulation, movement and sensation, and both sets of vital signs with times showing the trend.",
              "Alert and oriented. Wrist pain 8/10. CMS intact in the right hand. 14:05 P 96, R 18, BP 138/86; 14:15 P 90, R 16, BP 134/84."
            ),
            part(
              "Care given",
              "States the splint with time and the CMS rechecks before and after.",
              "Padded splint at 14:08; CMS intact before and after."
            ),
          ],
        },
      ],
    },
    {
      slug: "emr-injured-child-no-parent",
      objective: "Apply implied consent for a patient who cannot consent, and recognise when a patient lacks the capacity to refuse",
      kind: "case",
      title: "A 12-year-old off his bike",
      brief:
        "Fictional call. A 12-year-old boy came off his bike at a skate park. Friends say he was knocked out for a short time. He is now awake but drowsy and repeating himself, with a cut on his chin. No parent or guardian is present and his friends cannot reach his mother. The ambulance is 10 minutes away.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "He says, 'Don't touch me, I'm fine, I want to go home.'",
          ask: "Can you treat him, and on what basis?",
          parts: [
            part(
              "Implied consent",
              "Applies implied consent (the emergency exception) because he is a minor with a possibly serious head injury, his guardian is unavailable, and treatment cannot safely wait; and notes that his refusal is not valid because he is a minor and his altered mental status means he lacks capacity.",
              "Yes. He's a minor with a possible head injury, his mother can't be reached, and it can't wait -- that's implied consent. And with his confusion he couldn't make an informed refusal anyway."
            ),
          ],
        },
        {
          text: "You keep his head still and check his airway, breathing and circulation. His friends keep trying to call his mother.",
          ask: "What treatment do you give, and what don't you do?",
          parts: [
            part(
              "Scope of treatment",
              "Gives only the treatment the emergency needs -- manual spinal stabilisation, airway and breathing support if needed, bleeding control for the chin -- and reassesses mental status, acting in his best interest.",
              "Manual stabilisation of his head, check airway and breathing, pressure on the chin cut, and recheck how alert he is. Just what the emergency needs."
            ),
          ],
        },
        {
          text: "The ambulance crew arrives. His mother is now on a friend's phone.",
          ask: "What do you hand over, and what do you document?",
          parts: [
            part(
              "Handover",
              "Tells the crew the mechanism, the loss of consciousness, his repeating himself, the refusal attempt, the treatment under implied consent, and that his mother is on the phone so the crew can involve her and medical direction.",
              "'12-year-old, bike fall, brief loss of consciousness per friends, now drowsy and repeating himself. He tried to refuse; treated under implied consent. Mum's on this phone now.'"
            ),
            part(
              "Documentation",
              "Documents the findings that showed lack of capacity, the attempts to reach the guardian with times, and the basis for treatment.",
              "My record: his mental status findings, the times we tried to reach his mother, and that treatment was given under implied consent."
            ),
          ],
        },
      ],
    },
  ],
};
