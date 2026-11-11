import { CLINICAL_SAFETY, part, type SeedLabSet } from "./types";
import { AHA_BLS_2025, CDC_EBP, CDC_HAND_HYGIENE, CDC_PPE_SEQUENCE, CDC_TBP, CFR_483_12, CFR_483_152 } from "./nursing-sources";

// REQ-148: Certified Nursing Assistant (nurse aide), built on the federal
// training standard at 42 CFR 483.152. The competency evaluation is run by
// each state; unit weights are Ascendra's study-emphasis judgment, not an
// exam blueprint (seed/tracks/nursing.ts). Density ("hybrid"): 2/2/2/2/1/2/1
// = 12 (7 case, 5 build).
//
// SCOPE: a nurse aide observes, measures, reports and gives personal care and
// ADL help as the care plan and the nurse direct. The rubrics never ask an
// aide to assess, diagnose, decide on treatment or give medications; the
// right answer to anything that needs judgment is "tell the nurse now", in
// objective words.
//
// Values quoted come from nursing-sources.ts, read 2026-11-07:
//   - Choking: the 2025 AHA adult BLS guideline -- repeated cycles of 5 back
//     blows then 5 abdominal thrusts for a conscious adult with severe
//     obstruction. This replaces abdominal thrusts alone; the course
//     objective keeps the regulation's own words ("the Heimlich maneuver").
//   - PPE order and enhanced barrier precautions (CDC).
//   - Abuse reporting: 42 CFR 483.12(c)(1) -- immediately, and not later than
//     2 hours (abuse or serious bodily injury) or 24 hours (otherwise). That
//     is the facility's duty to report to the state; the aide's duty is to
//     tell the nurse/administrator at once.
// Vital-sign ranges in the briefs are the fictional facility's own report
// ranges, not clinical thresholds. All needs_expert_review (docs/labs.md).

export const CNA_LABS: SeedLabSet = {
  trackCode: "CNA",
  sources: [CFR_483_152, CFR_483_12, AHA_BLS_2025, CDC_PPE_SEQUENCE, CDC_EBP, CDC_TBP, CDC_HAND_HYGIENE],
  labs: [
    // ---- Before resident contact (2) ----
    {
      slug: "cna-choking-at-lunch",
      objective: "The Heimlich maneuver, named explicitly in the regulation",
      kind: "case",
      title: "Choking in the dining room",
      brief:
        "You are a nurse aide in a fictional nursing home, helping in the dining room at lunch. Mr. Alvarez, a fictional 78-year-old resident who eats a regular diet, is eating chicken at a table near you.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "Mr. Alvarez starts coughing hard and his face is red. Between coughs he says, 'Went down the wrong way.'",
          ask: "What do you do?",
          parts: [
            part(
              "Mild choking",
              "Recognizes a mild (partial) obstruction because he can cough forcefully and speak; encourages him to keep coughing, does not slap his back or give thrusts, stays with him and watches for signs it is getting worse, and lets the nurse know.",
              "He can cough and talk, so the airway is only partly blocked. Encourage him to keep coughing, don't hit his back or do thrusts yet, stay right with him watching for it getting worse, and have someone tell the nurse."
            ),
          ],
        },
        {
          text: "Seconds later he stops coughing, cannot speak or breathe, clutches his throat and is turning blue.",
          ask: "What do you do now?",
          parts: [
            part(
              "Call for help",
              "Shouts for help and has someone call the nurse and the emergency response (as facility policy directs) while staying with the resident.",
              "Shout for help: 'Choking -- get the nurse and call the emergency team!' I stay with him."
            ),
            part(
              "Relieve the obstruction",
              "Follows current guidance for a conscious adult with severe choking: stand behind and give 5 back blows between the shoulder blades, then 5 abdominal thrusts (fist above the navel, below the breastbone, quick inward-upward thrusts), repeating the cycle until the object comes out or he becomes unresponsive.",
              "Stand behind him, lean him forward and give 5 firm back blows between the shoulder blades with the heel of my hand; then 5 abdominal thrusts -- fist just above the navel, other hand over it, quick in-and-up thrusts. Keep repeating 5 and 5 until it comes out or he goes limp."
            ),
          ],
        },
        {
          text: "Mr. Alvarez goes limp and stops responding. The nurse is running over.",
          ask: "What do you do?",
          parts: [
            part(
              "Unresponsive",
              "Lowers him safely to the floor, makes sure emergency services are being called, and starts CPR (or helps the nurse start it) unless the nurse confirms a do-not-resuscitate order, looking in the mouth for the object before breaths and removing it only if seen.",
              "Ease him to the floor, make sure 911 or the emergency team has been called, and start CPR (or help the nurse) unless the nurse confirms he has a DNR order. Before any breath, look in his mouth and take the object out only if I can see it."
            ),
          ],
        },
      ],
    },
    {
      slug: "cna-ppe-and-precautions",
      objective: "Standard precautions and personal protective equipment",
      kind: "build",
      title: "Gear up, gear down",
      brief:
        "In a fictional nursing home, you are assigned two residents. Resident 1 has influenza and is on droplet precautions. Resident 2 has a feeding tube and a healing wound, no known infection, and is on enhanced barrier precautions; she likes to attend the afternoon music group. You need to help Resident 1 change a soiled gown and bed linen (he is coughing), then give Resident 2 a bed bath.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Plan the PPE for each resident and the order you put it on and take it off.",
          parts: [
            part(
              "Resident 1 PPE",
              "Wears a mask on entering the room for droplet precautions, plus gloves and a gown because linen is soiled with body fluids (standard precautions), and eye protection if splashes or coughing near the face are expected.",
              "For droplet precautions a mask goes on as I enter. Because I'm handling soiled linen and he's coughing, I also wear a gown, gloves and goggles or a face shield."
            ),
            part(
              "Putting it on",
              "Cleans hands first, then puts on PPE in the order gown, mask, eye protection, gloves (gloves last, over the gown cuffs).",
              "Clean hands, then gown, mask, goggles, and gloves last, pulled over the gown cuffs."
            ),
            part(
              "Taking it off",
              "Removes the most contaminated items first without touching the outside: gloves and gown (together or gloves first), then eye protection, then mask by the ties or loops, and cleans hands right after removing all PPE (and between steps if hands become contaminated); bags soiled linen without shaking it.",
              "At the door: gloves and gown off together, rolling them inside out; then goggles by the strap; then the mask by its ties; then clean my hands straight away. Soiled linen goes in the bag without shaking it or holding it against my uniform."
            ),
            part(
              "Resident 2",
              "Wears a gown and gloves for the bed bath (a high-contact care activity under enhanced barrier precautions), with hand hygiene before and after, and does not keep the resident from the music group, since enhanced barrier precautions do not confine the resident to her room.",
              "A bed bath is high-contact care, so gown and gloves, with clean hands before and after. She can still go to the music group -- enhanced barrier precautions don't keep her in her room."
            ),
          ],
        },
      ],
    },
    // ---- Basic nursing skills (2) ----
    {
      slug: "cna-report-to-nurse",
      objective: "Reporting changes to the nurse: what, when and in what words",
      kind: "build",
      title: "What you tell the nurse",
      brief:
        "During morning care in a fictional nursing home you notice these things about Mrs. Okafor, a fictional 85-year-old resident: she is more sleepy than usual and took several seconds to answer her name; her urine in the brief was dark and smelled strong; she ate two spoonfuls of breakfast; there is a 2 cm reddened area on her right heel that stays red when pressed; and she says, 'I feel funny.' Her daughter visiting at the time asks you, 'Is something wrong with her?'",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write your report and answer to the daughter.",
          parts: [
            part(
              "When",
              "Reports to the nurse right away (not at the end of the shift), because a change in alertness is a sudden change in condition.",
              "Now -- a change in how alert she is is a sudden change and can't wait for the end of the shift."
            ),
            part(
              "What, in objective words",
              "Reports what was seen, heard, smelled and measured in objective terms (sleepier than usual, slow to answer, dark strong-smelling urine, ate two spoonfuls, red area on right heel that stays red when pressed, her own words 'I feel funny'), plus vital signs if taken, without diagnosing (for example not 'she has a UTI').",
              "'Mrs. Okafor is sleepier than usual and took a few seconds to answer her name. Her urine was dark and strong-smelling. She ate two spoonfuls of breakfast. There's a 2 cm red spot on her right heel that stays red when I press it. She said, \"I feel funny.\"' I don't say what I think she has."
            ),
            part(
              "The heel",
              "Takes pressure off the heel (floats it on a pillow) as the care plan allows and includes it in the report as a possible early pressure injury for the nurse to check.",
              "Float her heel on a pillow so nothing presses on it, and tell the nurse about it in the same report."
            ),
            part(
              "The daughter",
              "Does not interpret or reassure falsely; says the nurse is being told now and will come to talk with her, and passes on the daughter's concern.",
              "'I've noticed some changes and I'm telling her nurse right now -- the nurse will come and talk with you.' I don't guess what's wrong or say she's fine."
            ),
          ],
        },
      ],
    },
    {
      slug: "cna-out-of-range-vitals",
      objective: "Recognizing a measurement that falls outside the expected range",
      kind: "case",
      title: "A blood pressure that doesn't fit",
      brief:
        "In a fictional nursing home, the facility's care sheet tells aides to report to the nurse at once any temperature of 37.8 degrees C or higher, pulse below 60 or above 100, respirations below 12 or above 22, systolic blood pressure below 100 or above 160 mm Hg, or any resident who looks or acts unwell. You are taking 14:00 vital signs on Mr. Brandt, a fictional 81-year-old resident whose usual blood pressure is about 132/80 mm Hg.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "With the automatic cuff you get 184/104 mm Hg. Mr. Brandt is sitting up, talking normally. You notice the cuff you used is the small one from the supply cart and is tight on his large arm.",
          ask: "What do you do?",
          parts: [
            part(
              "Check the measurement",
              "Recognizes a cuff that is too small can read falsely high, rechecks with a correctly sized cuff after a short rest with the arm supported at heart level, and still reports promptly if the repeat is outside the range.",
              "A cuff that's too small reads high. Let him rest a few minutes, then recheck with the right-size cuff, arm supported at heart level. If it's still over the range, I report it right away."
            ),
          ],
        },
        {
          text: "With the right cuff the reading is 172/98 mm Hg. Mr. Brandt now says he has a bad headache and his vision is 'a bit blurry'.",
          ask: "What do you do?",
          parts: [
            part(
              "Report now",
              "Reports to the nurse immediately (above the care sheet limit, with new headache and blurred vision), stays with or checks on the resident, and does not give him anything or tell him it's fine.",
              "Tell the nurse straight away: 172/98 after a recheck with the right cuff, new bad headache and blurry vision. Stay with him or check on him often, and don't give him anything or tell him it's nothing."
            ),
            part(
              "Report in objective words",
              "Includes the readings, the cuff recheck, the time, and the resident's own words, and records the values where the facility requires.",
              "'Mr. Brandt, 14:00: 184/104 with a small cuff, 172/98 with the right cuff. He says he has a bad headache and his vision is a bit blurry.' Then write the values on the flow sheet."
            ),
          ],
        },
        {
          text: "The nurse assesses him and asks you to repeat the blood pressure in 30 minutes and tell her the result.",
          ask: "How do you follow through?",
          parts: [
            part(
              "Follow through",
              "Rechecks at the time asked with the same correct cuff and position, reports the result to the nurse whether higher or lower, and reports any new symptom (worse headache, confusion, weakness, trouble speaking) immediately rather than waiting.",
              "At 30 minutes, same cuff, same arm and position; tell the nurse the number either way. If he gets a worse headache, confusion, weakness or trouble speaking before then, I tell her immediately."
            ),
          ],
        },
      ],
    },
    // ---- Personal care skills (2) ----
    {
      slug: "cna-mechanical-lift",
      objective: "Using a gait belt and a mechanical lift safely",
      kind: "case",
      title: "The lift needs two",
      brief:
        "In a fictional nursing home, Mrs. Petrova, a fictional resident who weighs 105 kg and cannot bear weight, is to be moved from bed to her wheelchair. Her care plan says: full-body mechanical lift, two staff, the large sling. Facility policy and the lift manufacturer require two trained staff for every lift transfer.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "Mrs. Petrova wants to get up for her daughter's visit. Your co-worker is on break for 20 minutes and says, 'Just do it yourself, it's quicker.'",
          ask: "What do you do?",
          parts: [
            part(
              "Wait for two",
              "Does not use the lift alone; explains the wait to the resident kindly, finds another trained co-worker or waits, and tells the nurse if the delay matters to the resident.",
              "I don't do the lift alone -- the care plan and policy say two. I tell Mrs. Petrova I'll get help, find another trained aide (or wait), and let the nurse know if her daughter is waiting."
            ),
          ],
        },
        {
          text: "With a second aide you check the sling: it is the medium size, and one strap is frayed.",
          ask: "What do you do before the lift?",
          parts: [
            part(
              "Equipment check",
              "Does not use the wrong-size or damaged sling; takes the frayed sling out of use and reports it per policy, gets the large sling the care plan names, and checks the lift (battery, wheels, brakes) before use.",
              "Don't use it. Tag the frayed sling as out of service and report it, get the large sling the care plan names, and check the lift's battery, wheels and brakes before starting."
            ),
            part(
              "Safe lift",
              "Explains each step to the resident, positions the sling correctly, locks the bed and wheelchair brakes, opens the lift legs for stability, lifts only high enough to clear the bed, moves smoothly with one person guiding the resident, and lowers into the chair.",
              "Tell her what we're doing at each step, place the sling evenly, lock the bed and wheelchair, widen the lift's legs, lift only just clear of the bed, move slowly with my partner steadying her, and lower her gently into the chair."
            ),
          ],
        },
        {
          text: "As you begin to raise her, Mrs. Petrova slips lower in the sling and grabs the bar in panic.",
          ask: "What do you do?",
          parts: [
            part(
              "Respond and report",
              "Stops raising, lowers her back onto the bed in a controlled way, reassures her, checks for pain or injury, calls the nurse, and does not try to catch or lift her manually; reports and documents the event per policy.",
              "Stop, lower her gently back onto the bed, talk to her calmly, ask if anything hurts and look for marks, and call the nurse. Never try to grab or lift her by hand. Then report it and fill in the incident form as policy says."
            ),
          ],
        },
      ],
    },
    {
      slug: "cna-safe-feeding",
      objective: "Proper feeding techniques and reducing aspiration risk",
      kind: "build",
      title: "Helping a resident with swallowing trouble eat",
      brief:
        "In a fictional nursing home, Mr. Haddad, a fictional 82-year-old resident, had a stroke and has weakness on his left side. The speech-language pathologist has ordered a minced and moist diet and mildly thick liquids; the care plan says he needs one-to-one help with meals and should stay sitting up after meals for the time it lists.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Describe how you help him eat lunch safely.",
          parts: [
            part(
              "Before eating",
              "Checks the tray matches the ordered texture and liquid thickness (and his name), sits him fully upright in a chair or as upright as the care plan allows, makes sure dentures and glasses are in, cleans hands, and sits at eye level.",
              "Check the tray is his and the food is minced and moist with mildly thick drinks; sit him fully upright in his chair; put his dentures and glasses in; clean my hands and sit facing him at eye level."
            ),
            part(
              "While eating",
              "Offers small bites and sips slowly, one at a time, letting him swallow fully before the next, places food on his stronger (right) side, checks the weaker side of the mouth for pocketed food, minimizes distractions, and does not thin his drinks or use a straw unless the plan allows.",
              "Small spoonfuls, one at a time, waiting until he has swallowed; food into the right side of his mouth; check his left cheek for food left behind; keep the TV off; never thin his drink or give a straw unless the plan says so."
            ),
            part(
              "Stop and report",
              "Stops feeding and tells the nurse at once about coughing or choking during meals, a wet or gurgly voice, food or drink coming out of the nose or mouth, or trouble breathing; reports how much he ate and drank.",
              "If he coughs or chokes, his voice sounds wet, food comes back out, or his breathing changes, I stop and tell the nurse right away. I also report how much he ate and drank."
            ),
            part(
              "After eating",
              "Keeps him upright for the time the care plan sets, gives mouth care to remove leftover food, and records intake.",
              "Keep him sitting up for as long as the care plan says, do mouth care so no food is left in his mouth, and record his intake."
            ),
          ],
        },
      ],
    },
    // ---- Mental health and social service needs (2) ----
    {
      slug: "cna-refuses-shower",
      objective: "Responding to behavior without escalating it",
      kind: "case",
      title: "\"I am not taking a shower\"",
      brief:
        "In a fictional nursing home, Mr. Lindqvist, a fictional 79-year-old resident, is scheduled for a shower at 07:00 on your assignment. He spent his career working nights and usually sleeps late. When you wake him he shouts, 'Get out! I'm not taking a shower!'",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "He is sitting up in bed, red-faced, gripping the blanket.",
          ask: "How do you respond?",
          parts: [
            part(
              "Calm approach",
              "Stays calm, speaks quietly, keeps a safe distance and an open path to the door, does not argue, insist or touch him, acknowledges his feelings and respects his right to refuse.",
              "Keep my voice low and calm, step back so I'm not crowding him and I can leave, and say, 'I'm sorry I woke you. You don't have to shower now.' No arguing, no touching."
            ),
            part(
              "Offer choices",
              "Offers him choices about time and type of bathing that fit his preferences and history (for example later in the morning, or a bed bath), and tells the nurse about the refusal so the care plan can reflect his routine.",
              "'Would later this morning suit you better, or would you rather a wash at the sink?' Then tell the nurse he refused and that he's used to sleeping late, so the plan can change his shower time."
            ),
          ],
        },
        {
          text: "Later that morning, while you help him to the bathroom, he becomes upset again and swings his arm at you, catching your shoulder.",
          ask: "What do you do?",
          parts: [
            part(
              "Keep everyone safe",
              "Steps back out of reach, does not hit back, restrain, scold or threaten, makes sure he is safe (not about to fall), calls for help, and gives him time to calm down.",
              "Step back out of reach, don't grab or scold him, make sure he isn't about to fall, call a co-worker or the nurse, and give him a few minutes."
            ),
            part(
              "Report",
              "Reports the incident and what seemed to trigger it to the nurse in objective words, and reports their own injury per facility policy.",
              "Tell the nurse exactly what happened and what seemed to set it off (being rushed in the bathroom), and report that he hit my shoulder so it's on record."
            ),
          ],
        },
      ],
    },
    {
      slug: "cna-depression-report",
      objective: "Recognizing depression and withdrawal, and reporting it",
      kind: "build",
      title: "A resident who has gone quiet",
      brief:
        "In a fictional nursing home, Mrs. Nakamura, a fictional 83-year-old resident, lost her husband three weeks ago. Over the last week you have noticed: she no longer goes to bingo, which she loved; she eats about half of her meals; she has stopped asking to have her hair done; she is awake and crying at night; and today she said, 'There's no point in any of this anymore.'",
      safetyNote: `${CLINICAL_SAFETY} If this topic affects you personally, please reach out to someone you trust or a local crisis line.`,
      steps: [
        {
          text: "",
          ask: "Write what you do and what you report.",
          parts: [
            part(
              "Recognise",
              "Recognizes these changes as possible signs of depression (not just normal aging or ordinary sadness) after a major loss.",
              "Stopping things she loved, eating less, not caring about her hair, crying at night and saying there's no point can be signs of depression after losing her husband -- not just 'getting old'."
            ),
            part(
              "Her words",
              "Treats 'There's no point in any of this anymore' as something to report to the nurse right away, not at the end of the shift, and stays with her or checks she is not left alone until the nurse comes.",
              "Her words could mean she's thinking of not wanting to live, so I tell the nurse right away and stay with her until the nurse arrives."
            ),
            part(
              "The report",
              "Reports the specific changes, when they started, and her exact words, objectively, without diagnosing.",
              "'Over the past week Mrs. Nakamura has stopped going to bingo, eats about half her meals, hasn't asked for her hair to be done, and cries at night. Today she said, \"There's no point in any of this anymore.\"'"
            ),
            part(
              "Support",
              "Offers presence and listening, invites but does not force activities, respects her choices, and mentions to the nurse that family or chaplain support may help.",
              "Sit and listen if she wants to talk about her husband, invite her to things without pushing, and tell the nurse that a visit from family or the chaplain might help."
            ),
          ],
        },
      ],
    },
    // ---- Care of cognitively impaired residents (1) ----
    {
      slug: "cna-exit-seeking",
      objective: "Wandering and exit-seeking: keeping a resident safe without restraint",
      kind: "case",
      title: "\"I have to pick up the children\"",
      brief:
        "In a fictional nursing home's memory care unit, Mrs. Duarte, a fictional 80-year-old resident with Alzheimer disease, becomes restless every afternoon around 16:00. Today she is pushing at the locked exit door with her coat on, saying, 'I have to pick up the children from school.'",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "She is getting more upset each time the door won't open.",
          ask: "How do you respond?",
          parts: [
            part(
              "Redirect",
              "Approaches calmly from the front, uses her name, joins her reality rather than arguing or correcting ('your children are grown'), and redirects to something meaningful (a walk, a snack, a familiar task); does not restrain or lock her in a room.",
              "Approach from the front, say her name, and go along with her: 'You're a good mother, thinking of the children. Let's have a cup of tea while we wait.' Then a walk, folding towels or a snack. No arguing that the children are grown, and never restraining her."
            ),
            part(
              "Look for causes",
              "Checks for needs that may drive the behavior (toileting, hunger, thirst, pain, fatigue, noise) and reports the pattern so the care plan can address the late-afternoon restlessness (sundowning).",
              "Offer the toilet and a drink, check whether she seems in pain or tired, and lower the noise. Tell the nurse it happens every day around 16:00 so the care plan can plan for it."
            ),
          ],
        },
        {
          text: "At 17:15 during the supper rush, you can't find Mrs. Duarte in the unit. A service door to the courtyard is propped open.",
          ask: "What do you do?",
          parts: [
            part(
              "Missing resident",
              "Treats it as an emergency: alerts the nurse immediately and starts the facility's missing-resident (elopement) procedure without waiting to search alone, gives a description, and helps the search as directed; reports the propped door.",
              "Tell the nurse at once and start the missing-resident procedure -- don't spend time searching alone first. Give her description (coat, clothes), then search where I'm told. Report the propped-open door."
            ),
          ],
        },
        {
          text: "Staff find her in the courtyard, cold but unhurt.",
          ask: "What happens next?",
          parts: [
            part(
              "Afterwards",
              "Brings her somewhere warm, checks her with the nurse for injury, reports and documents what happened per policy, and helps with prevention that does not use restraint (supervision, activities at her restless time, securing the door).",
              "Get her inside and warm, have the nurse check her, document what happened, and help with prevention without restraint: someone with her in the late afternoon, an activity she enjoys then, and the door kept shut."
            ),
          ],
        },
      ],
    },
    // ---- Basic restorative services (2) ----
    {
      slug: "cna-passive-rom",
      objective: "Maintaining range of motion, active and passive",
      kind: "build",
      title: "Passive range of motion after a stroke",
      brief:
        "In a fictional nursing home, Mr. Osei, a fictional 74-year-old resident, has right-sided paralysis after a stroke. His care plan, written by the nurse with the therapist, says: passive range-of-motion exercises to the right shoulder, elbow, wrist, fingers, hip, knee and ankle, 5 times each, twice a day; do not exercise the neck; report pain, swelling or resistance.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write how you do and report the exercises.",
          parts: [
            part(
              "Prepare",
              "Explains what they will do, provides privacy, cleans hands, raises the bed to a safe working height, and positions him on his back in good alignment.",
              "Tell Mr. Osei what I'm going to do, close the curtain, clean my hands, raise the bed to my waist height, and lay him flat on his back in good alignment."
            ),
            part(
              "Technique",
              "Supports the limb above and below each joint, moves each joint slowly and smoothly through its range the number of times the plan says, and stops at the point of resistance or pain, never forcing; does not exercise the neck.",
              "Support the arm or leg above and below the joint, move each joint slowly and gently through its motion 5 times, stop where it resists or he shows pain, never force it, and leave his neck alone as the plan says."
            ),
            part(
              "Watch and report",
              "Watches his face for pain, and reports to the nurse any pain, new swelling, redness, warmth or a joint that resists more than before, and records the exercises.",
              "Watch his face for wincing, and tell the nurse about pain, swelling, redness, warmth or a joint that is stiffer than last time. Record what I did."
            ),
          ],
        },
      ],
    },
    {
      slug: "cna-walker-dizzy",
      objective: "Ambulation with a walker, cane or crutches",
      kind: "case",
      title: "A walk to the dining room",
      brief:
        "In a fictional nursing home, Mrs. Fischer, a fictional 86-year-old resident recovering from a hip replacement, walks with a front-wheeled walker and a gait belt with one staff member, as her care plan says. She just finished therapy and wants to walk to lunch.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "She is sitting on the edge of the bed. Her non-slip shoes are by the door.",
          ask: "How do you get her up and walking safely?",
          parts: [
            part(
              "Before walking",
              "Puts on non-slip shoes, applies the gait belt snugly over clothing at the waist, locks the bed, has her sit a moment and asks if she feels dizzy, checks the walker, and clears the path.",
              "Put on her non-slip shoes, fasten the gait belt snugly around her waist over her clothes, lock the bed, let her sit a moment and ask if she's dizzy, check the walker, and clear the way."
            ),
            part(
              "Walking",
              "Has her push up from the bed (not pull on the walker), stands slightly behind and to the side holding the belt, has her move the walker forward first then step into it without walking too close to the front bar, and lets her set the pace.",
              "She pushes up from the bed, not by pulling on the walker. I stand slightly behind on her side, holding the belt. Walker forward, then she steps in -- not right up to the front bar -- at her own pace."
            ),
          ],
        },
        {
          text: "Halfway down the hall she says, 'I feel dizzy,' and her knees start to bend.",
          ask: "What do you do?",
          parts: [
            part(
              "Controlled lowering",
              "Does not try to hold her up; if a chair is not right there, uses the gait belt to ease her down to the floor while protecting her head, keeping their own back straight and knees bent; calls for help and stays with her.",
              "Don't try to hold her up. If there's no chair right behind her, hold the belt, pull her close and slide her gently down my leg to the floor, protecting her head and bending my knees. Call for help and stay with her."
            ),
            part(
              "After",
              "Does not get her up until the nurse has checked her, then reports what happened (time, what she said, what was done) and records it per policy.",
              "Leave her on the floor until the nurse checks her. Then report exactly what happened -- the time, that she said she was dizzy, how I lowered her -- and fill in the facility's report."
            ),
          ],
        },
      ],
    },
    // ---- Residents' rights (1) ----
    {
      slug: "cna-report-abuse",
      objective: "Reporting a suspected violation to the right facility staff, promptly",
      kind: "case",
      title: "What you saw in room 12",
      brief:
        "In a fictional nursing home, you walk past room 12 at 06:15 and see a co-worker yank Mrs. Kowalski, a fictional 90-year-old resident with dementia, up the bed by her arms while telling her, 'If you wet the bed again you'll stay in it all day.' Mrs. Kowalski is crying.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "Your co-worker sees you and says, 'Don't make a big deal of it, I'm just tired.'",
          ask: "What do you do right now?",
          parts: [
            part(
              "Protect the resident",
              "Steps in to stop the care and makes sure the resident is safe and not left with the co-worker, without a confrontation that delays help.",
              "Go in, say calmly, 'I'll finish helping Mrs. Kowalski,' and stay with her so she isn't left with that co-worker."
            ),
            part(
              "Report at once",
              "Reports immediately to the nurse in charge or the administrator (as facility policy names), rather than waiting until the end of the shift, talking to the co-worker privately or deciding it isn't abuse.",
              "Tell the charge nurse or administrator straight away -- not at the end of my shift, and not just sorting it out with the co-worker. It's not my job to decide whether it was abuse; it's my job to report it."
            ),
          ],
        },
        {
          text: "The charge nurse thanks you and says the facility will report it to the state agency.",
          ask: "Why does reporting quickly matter, and what else do you do?",
          parts: [
            part(
              "Why the speed",
              "Explains that federal rules require the facility to report alleged abuse immediately, and no later than 2 hours when it involves abuse or serious bodily injury (24 hours otherwise), so the aide's report starts that clock and protects other residents.",
              "Federal rules say the facility must report alleged abuse right away -- within 2 hours when there's abuse or serious injury, 24 hours otherwise. My report is what lets them meet that and protect other residents."
            ),
            part(
              "Document and cooperate",
              "Writes down exactly what they saw and heard, with time and place, as policy directs, cooperates with the investigation, and knows they are protected from retaliation for reporting in good faith.",
              "Write down exactly what I saw and heard, and when, give it to the investigator, and answer their questions honestly. The facility can't punish me for reporting in good faith."
            ),
          ],
        },
      ],
    },
  ],
};
