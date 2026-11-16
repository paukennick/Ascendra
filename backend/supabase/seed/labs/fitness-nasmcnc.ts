import { FITNESS_SAFETY, matchPart, numericPart, part, selectPart, type SeedLabSet } from "./types";
import { source } from "../sources";

// REQ-281: NASM Certified Nutrition Coach. Aligned to NASM's four CNC course
// sections and exam facts on its product page, read 2026-11-14 (NASM
// publishes no CNC exam outline or weights; tracks/fitness.ts). Values come
// from the Dietary Guidelines for Americans 2025-2030, the National
// Academies DRI tables and FDA's supplement Q&A, read the same day and
// attached per lab in value-sources.ts. Every lab keeps to a coach's scope:
// general guidance and habit coaching, with referral for medical nutrition
// therapy. Density (hybrid, study-emphasis weights 20/35/20/25): 2 / 3 / 2 /
// 3 = 10 labs.

const CHECKED = "2026-11-14";

export const NASMCNC_LABS: SeedLabSet = {
  trackCode: "NASMCNC",
  sources: [
    source("https://www.nasm.org/products/single-complex/nasm-certified-nutrition-coach/CNC301K", "exam_outline", CHECKED),
    source("https://cdn.realfood.gov/DGA.pdf", "reference", CHECKED),
  ],
  labs: [
    // Professional Practice and Scope (2)
    {
      slug: "nasmcnc-refer-or-coach",
      objective:
        "Recognizing when to refer to a registered dietitian nutritionist or physician: a diagnosed condition, a suspected eating disorder, pregnancy or breastfeeding needs beyond general guidance, or medications affected by diet",
      kind: "case",
      title: "A diabetes diagnosis and a low-carb request",
      brief:
        "Dana (fictional, 52) hires you as a nutrition coach. At intake she says she was diagnosed with type 2 diabetes last year and takes insulin.",
      safetyNote: FITNESS_SAFETY,
      steps: [
        {
          text: "Dana asks you to write a low-carbohydrate meal plan to 'get off insulin'.",
          ask: "Is this inside a nutrition coach's scope? What do you say?",
          parts: [
            part(
              "Scope call",
              "Identifies a meal plan to treat a diagnosed disease and change medication needs as medical nutrition therapy, outside the coaching scope; changing carbohydrate intake on insulin carries a hypoglycemia risk.",
              "No. A plan designed to treat diabetes and change her insulin is medical nutrition therapy, which belongs to a registered dietitian nutritionist working with her physician. Cutting carbohydrate while on insulin can cause dangerous lows."
            ),
            part(
              "What you say",
              "Refers respectfully to her physician and an RDN, explains why, and offers what coaching can do alongside (habits, consistency, following the plan they set).",
              "Tell her this is a question for her doctor and an RDN, because her insulin dose depends on what she eats. Offer to coach the habits around whatever plan they set -- regular meals, cooking, food records -- and to work alongside them."
            ),
          ],
        },
        {
          text: "Two months later Dana mentions she has been skipping meals and feels guilty after eating.",
          ask: "What do you do?",
          parts: [
            part(
              "Response",
              "Recognizes possible disordered eating signs (plus hypoglycemia risk with insulin), avoids diagnosing, and refers promptly to her physician and/or a qualified professional while staying supportive.",
              "Skipping meals and guilt after eating can be signs of disordered eating, and skipping meals on insulin is risky. Don't diagnose; say you are concerned, encourage her to talk to her doctor soon, and help her find a qualified professional, while staying supportive."
            ),
          ],
        },
      ],
    },
    {
      slug: "nasmcnc-headline-red-flags",
      objective: "Evaluating nutrition research: study designs, the strength of evidence and red flags in a headline claim",
      kind: "build",
      title: "Check a viral nutrition claim",
      brief:
        "A fictional client sends you an article headlined 'Eating this berry melts belly fat, scientists say'. You read the article and note what it says about the evidence.",
      safetyNote: FITNESS_SAFETY,
      steps: [
        {
          text: "",
          ask: "Select the statements that are red flags about the evidence, then say how you would answer the client.",
          parts: [
            selectPart(
              "Red flags",
              "Selecting the four red flags and nothing else is met; three of them is partly there.",
              "Red flags: a study in mice, 12 participants with no control group, funding by the company selling the extract, and a 'melts fat' claim. A peer-reviewed journal and a stated sample size are not red flags on their own.",
              {
                lines: [
                  "The main study was done in mice",
                  "A separate human study had 12 participants and no control group",
                  "The research was funded by the company that sells the berry extract",
                  "The study was published in a peer-reviewed journal",
                  "The article says the berry 'melts' fat",
                  "The article states how many people took part",
                ],
                correct: [0, 1, 2, 4],
                display: "list",
              }
            ),
            part(
              "Answer to the client",
              "Explains plainly that the evidence is weak (animal, tiny uncontrolled, conflict of interest), no single food burns fat, and redirects to overall habits; respectful, not dismissive.",
              "Thanks for sending it. The evidence is weak: mostly mice, one tiny human study with no comparison group, paid for by the seller. No single food melts fat. Berries are a great food to include, and the bigger wins are the habits we're already working on."
            ),
          ],
        },
      ],
    },

    // Nutrition Science (3)
    {
      slug: "nasmcnc-calories-from-macros",
      objective: "Calculating calories from macronutrient grams with 4, 4, 9 and 7 kcal per gram",
      kind: "build",
      title: "Count the calories in a day",
      brief:
        "A fictional client's food record for one day totals 150 g carbohydrate, 120 g protein, 60 g fat and 20 g alcohol.",
      safetyNote: FITNESS_SAFETY,
      steps: [
        {
          text: "",
          ask: "Calculate the day's total energy, then the share from fat as a percent of total energy, and compare it with the adult range.",
          parts: [
            numericPart(
              "Total energy (kcal)",
              "150 x 4 + 120 x 4 + 60 x 9 + 20 x 7 = 600 + 480 + 540 + 140 = 1,760 kcal. Met within 5.",
              "Carbohydrate 150 x 4 = 600; protein 120 x 4 = 480; fat 60 x 9 = 540; alcohol 20 x 7 = 140. Total = 1,760 kcal.",
              { answer: 1760, tolerance: 5, unit: "kcal" }
            ),
            numericPart(
              "Fat (% of energy)",
              "540 / 1,760 = 30.7%. Met within 0.5.",
              "540 / 1,760 = 0.307, so about 30.7% of energy comes from fat.",
              { answer: 30.7, tolerance: 0.5, unit: "%" }
            ),
            part(
              "Compare",
              "States 30.7% sits within the adult AMDR for fat (20-35%), and notes alcohol supplies energy without nutrients.",
              "About 31% is inside the adult range for fat of 20-35% of energy. The 140 kcal from alcohol add energy with no nutrients, which is worth a conversation."
            ),
          ],
        },
      ],
    },
    {
      slug: "nasmcnc-protein-range",
      objective: "Explaining protein quality and needs, from the 0.8 g/kg RDA to the higher targets for active adults",
      kind: "build",
      title: "How much protein for a 70 kg lifter?",
      brief:
        "Jordan (fictional, 34, healthy, 70 kg) lifts weights three times a week and asks how much protein to aim for. Jordan eats about 60 g a day now.",
      safetyNote: FITNESS_SAFETY,
      steps: [
        {
          text: "",
          ask: "Work out the RDA amount and the upper end of the 2025-2030 Dietary Guidelines range for Jordan, and suggest how to close the gap with food.",
          parts: [
            numericPart(
              "RDA amount (g/day)",
              "0.8 g/kg x 70 kg = 56 g. Met within 1.",
              "RDA: 0.8 x 70 = 56 g a day.",
              { answer: 56, tolerance: 1, unit: "g/day" }
            ),
            numericPart(
              "Upper end of the DGA range (g/day)",
              "1.6 g/kg x 70 kg = 112 g (the range is 1.2-1.6 g/kg, 84-112 g). Met within 1.",
              "The 2025-2030 Dietary Guidelines suggest 1.2-1.6 g/kg: 84 to 112 g a day for Jordan, so the upper end is 112 g.",
              { answer: 112, tolerance: 1, unit: "g/day" }
            ),
            part(
              "Food-first plan",
              "Explains the RDA is a minimum while the DGA range suits an active adult, and proposes spreading protein across meals with whole foods; notes kidney disease or other conditions would be a referral question.",
              "56 g covers the minimum; for someone training, 84-112 g fits the current guidelines. Jordan is at 60 g, so add a protein food to each meal -- eggs or yogurt at breakfast, beans or chicken at lunch, fish or tofu at dinner -- rather than relying on shakes. If Jordan had kidney disease or another condition, that would be a question for a doctor or RDN."
            ),
          ],
        },
      ],
    },
    {
      slug: "nasmcnc-supplement-question",
      objective: "Evaluating a supplement: how it is regulated, third-party testing, and when it is a question for a clinician",
      kind: "case",
      title: "The pre-workout powder",
      brief:
        "Sam (fictional, 27) shows you a pre-workout powder bought online and asks if it is safe because 'it's FDA approved'.",
      safetyNote: FITNESS_SAFETY,
      steps: [
        {
          text: "The label lists a 'proprietary energy blend' with no amounts per ingredient.",
          ask: "What do you tell Sam about how supplements are regulated?",
          parts: [
            part(
              "Regulation",
              "Corrects the claim: FDA does not approve dietary supplements before they are sold; the manufacturer is responsible for safety and labeling.",
              "Supplements aren't FDA approved: the FDA has no authority to approve them before they are sold. The maker is responsible for safety and the label."
            ),
            part(
              "The label",
              "Flags that a proprietary blend hides ingredient amounts (e.g. stimulant dose), and suggests choosing third-party tested products.",
              "A proprietary blend hides how much of each ingredient -- including stimulants -- is in a scoop. If Sam uses a supplement, choose one tested by an independent third-party program."
            ),
          ],
        },
        {
          text: "Sam adds that he takes medication for high blood pressure.",
          ask: "What do you advise now?",
          parts: [
            part(
              "Referral",
              "Advises checking with his physician or pharmacist before using a stimulant product because of the blood pressure medication; does not judge the dose safe or unsafe himself.",
              "With blood pressure medication, ask his doctor or pharmacist before taking any stimulant pre-workout. That is a medical question, not one for a coach to clear."
            ),
          ],
        },
      ],
    },

    // Behavior Change Strategies (2)
    {
      slug: "nasmcnc-oars-match",
      objective: "Using motivational interviewing: open questions, affirmations, reflections and summaries",
      kind: "build",
      title: "Name the motivational interviewing skill",
      brief:
        "In a coaching session, a fictional client says she wants to cook more but 'never has time'. Here are five things a coach could say.",
      safetyNote: FITNESS_SAFETY,
      steps: [
        {
          text: "",
          ask: "Match each coach statement to the skill it shows, then write one more open question.",
          parts: [
            matchPart(
              "Statement to skill",
              "All four correct is met; two or three is partly there. Unsolicited advice matches none of them.",
              "'What would a realistic week of cooking look like for you?' is an open question. 'You've already cooked twice this week despite a busy job' is an affirmation. 'Time feels like the biggest barrier right now' is a reflection. 'So, you want to cook more, time is tight, and batch-cooking on Sunday appeals to you' is a summary.",
              {
                left: [
                  "What would a realistic week of cooking look like for you?",
                  "You've already cooked twice this week, even with a busy job.",
                  "Time feels like the biggest barrier right now.",
                  "So you want to cook more, time is tight, and Sunday batch-cooking appeals to you.",
                ],
                right: ["Open question", "Affirmation", "Reflection", "Summary", "Unsolicited advice"],
                pairs: [0, 1, 2, 3],
              }
            ),
            part(
              "Another open question",
              "Writes a genuinely open question (not yes/no) that invites the client's own reasons or ideas.",
              "What would make cooking at home feel worth the time for you?"
            ),
          ],
        },
      ],
    },
    {
      slug: "nasmcnc-behavior-goal",
      objective: "Setting SMART goals and choosing behavior goals over outcome goals",
      kind: "build",
      title: "From 'lose 20 pounds' to a behavior goal",
      brief:
        "Priya (fictional, 41) says her goal is to 'lose 20 pounds by summer'. She skips breakfast, buys lunch at the office cafe, and snacks heavily in the evening.",
      safetyNote: FITNESS_SAFETY,
      steps: [
        {
          text: "",
          ask: "Explain the difference between an outcome and a behavior goal, then write one SMART behavior goal for the next two weeks and how you would track it.",
          parts: [
            part(
              "Outcome vs behavior",
              "Explains an outcome goal (weight) is not directly controllable, while a behavior goal is an action she controls and can practice daily.",
              "Losing 20 pounds is an outcome: she can't control it directly. A behavior goal is something she does every day, which she controls and which drives the outcome."
            ),
            part(
              "SMART behavior goal",
              "Writes a specific, measurable, achievable, relevant, time-bound behavior goal linked to her pattern.",
              "For the next two weeks, on at least 5 of 7 days, eat a breakfast with a protein food before 9 a.m."
            ),
            part(
              "Tracking",
              "Proposes simple tracking (checklist, app tick) and a review point, with measures beyond the scale.",
              "A daily tick on a checklist, reviewed together in two weeks, along with how her evening hunger feels -- not only her weight."
            ),
          ],
        },
      ],
    },

    // Practical Nutrition Coaching (3)
    {
      slug: "nasmcnc-label-added-sugar",
      objective: "Reading a Nutrition Facts label: serving size, percent Daily Value and added sugars",
      kind: "build",
      title: "How much added sugar is in that bowl?",
      brief:
        "A fictional client pours about 2.5 servings of a granola whose Nutrition Facts label lists a serving of 1/2 cup with 12 g of added sugars per serving, and eats it as breakfast.",
      safetyNote: FITNESS_SAFETY,
      steps: [
        {
          text: "",
          ask: "Calculate the added sugars in the bowl, compare them with the 2025-2030 Dietary Guidelines' per-meal limit, and suggest a swap.",
          parts: [
            numericPart(
              "Added sugars in the bowl (g)",
              "2.5 servings x 12 g = 30 g. Met within 1.",
              "2.5 x 12 g = 30 g of added sugars.",
              { answer: 30, tolerance: 1, unit: "g" }
            ),
            part(
              "Compare and swap",
              "States the guidelines recommend no added sugars and no more than 10 g in one meal, so 30 g is three times that; notes the label's serving size vs what was eaten; suggests a practical swap.",
              "The 2025-2030 Dietary Guidelines recommend no amount of added sugars and say one meal should hold no more than 10 g, so this bowl has three times that. The label's serving is 1/2 cup, and the client eats 2.5 of them. Try plain oats or unsweetened cereal with fruit, or a smaller granola portion on yogurt."
            ),
          ],
        },
      ],
    },
    {
      slug: "nasmcnc-supplement-claims",
      objective: "Reading a Supplement Facts label and spotting claims a supplement may not lawfully make",
      kind: "build",
      title: "Which claims cross the line?",
      brief:
        "A fictional supplement brand prints these claims on its magnesium product's label and website.",
      safetyNote: FITNESS_SAFETY,
      steps: [
        {
          text: "",
          ask: "Select the claims that are disease claims a supplement may not make, then say what an allowed claim needs alongside it.",
          parts: [
            selectPart(
              "Disease claims",
              "Selecting the three disease claims and nothing else is met; two of them is partly there.",
              "Disease claims: 'lowers high blood pressure', 'prevents migraines' and 'treats insomnia' -- each claims to treat or prevent a disease, which makes the product a drug. 'Supports muscle function' and 'supports restful sleep' are structure/function claims.",
              {
                lines: [
                  "Supports normal muscle function",
                  "Lowers high blood pressure",
                  "Prevents migraines",
                  "Supports restful sleep",
                  "Treats insomnia",
                ],
                correct: [1, 2, 4],
                display: "list",
              }
            ),
            part(
              "Allowed claims",
              "States structure/function claims must be truthful and carry the FDA disclaimer (not evaluated by FDA; not intended to diagnose, treat, cure or prevent any disease).",
              "A structure/function claim must be truthful and backed by evidence, and must carry the disclaimer that the FDA has not evaluated it and that the product is not intended to diagnose, treat, cure or prevent any disease."
            ),
          ],
        },
      ],
    },
    {
      slug: "nasmcnc-weight-management-case",
      objective: "Coaching weight management with a modest energy deficit, and recognizing when weight change is a referral question",
      kind: "case",
      title: "Faster, she says",
      brief:
        "Morgan (fictional, 29, no known conditions) wants to lose weight for a wedding in three months and asks for 'the fastest diet possible'.",
      safetyNote: FITNESS_SAFETY,
      steps: [
        {
          text: "Morgan proposes eating 800 calories a day and cutting out all carbohydrates.",
          ask: "How do you respond as a coach?",
          parts: [
            part(
              "Response",
              "Explains a very aggressive restriction is hard to sustain and risks muscle loss and fatigue; proposes a modest deficit from food-first changes and keeps within coaching scope (no very-low-calorie plan without medical supervision).",
              "Very aggressive restriction is hard to keep up, costs muscle and energy, and often rebounds. Suggest a modest deficit from a few changes she can keep -- more vegetables and protein at each meal, fewer sugary drinks, a planned evening snack. A very-low-calorie diet is something to do only under medical supervision."
            ),
          ],
        },
        {
          text: "Six weeks later Morgan has lost weight quickly, reports dizziness, has stopped menstruating and says she 'can't stop thinking about food'.",
          ask: "What do you do?",
          parts: [
            part(
              "Referral",
              "Recognizes possible medical and disordered-eating warning signs and refers promptly to a physician (and an eating disorder professional), without diagnosing; pauses weight-loss coaching.",
              "Dizziness, lost periods and constant food preoccupation are warning signs. Stop the weight-loss focus, tell her you're concerned, and urge her to see a doctor soon; a physician can involve an eating disorder specialist or RDN. Don't diagnose; stay supportive."
            ),
          ],
        },
      ],
    },
  ],
};
