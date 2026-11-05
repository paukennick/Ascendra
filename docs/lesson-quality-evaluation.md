# Lesson quality evaluation

Date: 2026-11-02. Scope: the lesson flow (guess → teach → guided → solo), how it ties into mastery and review, and 13 real cached lessons read from the live database. Evaluation only. No code, seed, or lesson content was changed and no lessons were generated.

## Verdict

**Yes, it's a real problem, and a medium-to-large one. The cause is not too much reading. It's that the active parts are too easy to get through without thinking.**

Three of the four steps do ask the learner for something. But every one of those asks can be passed with little real thought:

- **The guess can be skipped.** There's a button for it: "I don't know — just teach me".
- **Both checks default to multiple choice.** Free response is opt-in.
- **The right answer is almost always the first option.** It's the first one listed in **49 of 52** cached questions, and it's also the longest option in **39 of 52**. A learner who notices this can pass every lesson without reading the material.
- **The guided-practice question often states the reasoning, then asks for the label.** That turns the step into a recognition check.
- **A wrong answer gets one sentence about why the right answer is right.** Nothing is said about why the chosen answer was wrong.
- **Review doesn't re-test.** It shows the question and the explanation together, and "Got it" moves the item on without the learner answering anything.
- **Nothing the learner got right ever comes back.** Only misses are scheduled.

So the realistic learning path is: read one long block of about 500 words, then tap the first option twice. By volume, about two-thirds of what a learner sees is read-only text: the teach block runs about 3,000–4,400 characters, against roughly 1,500 for the guess, guided and solo questions combined. Learning research rates rereading as a low-value technique and testing yourself plus spacing it out as high-value (Dunlosky et al. 2013). Ascendra has the skeleton of the high-value design but not the substance.

For clinical content the gap is bigger. The questions are all "pick one of four". The NCLEX Next Generation item types (ranking, matrix, bowtie, trend over time) and the cues → hypotheses → actions → outcomes reasoning of the NCSBN Clinical Judgment Measurement Model can't be expressed in the current lesson format at all. There are also two internal inconsistencies in clinical (physical therapy) questions (Finding 6).

The good news: the biggest problems are cheap to fix. Shuffling the answer order, grading on the server, explaining each wrong option, and making review re-ask the question are all small jobs. None of them needs a new screen type.

## Strengths to keep

- **The four-step structure is correct learning design.** Attempting before being taught (pretesting, productive failure: Kapur 2016; Richland, Kornell & Kao 2009) is followed by one worked example, then one partly-worked problem, then one solo problem. That is the faded worked-example sequence the research supports (Renkl & Atkinson 2003; Atkinson, Renkl & Merrill 2003). Don't replace it; fix what goes into each step.
- **The guess gets real feedback.** A non-blank guess is compared with the teaching and the learner sees "On your guess" feedback (`backend/lib/prompts.ts:198-237`, `lesson/[objectiveId].tsx:133-144, 190-210`). Without that, a pretest helps much less.
- **Multiple choice is capped at "Guided".** Only a correct free-response answer earns "Independent" (`backend/lib/mastery.ts:61-80`). This rewards producing an answer over recognising one, which is the right incentive.
- **Free-response and PBQ grading names each missed part** (`prompts.ts:68-72, 308-335, 369-395`). That is specific feedback, not just a mark.
- **The teaching text is usually good.** It defines every term, traces a worked example step by step, names a common mistake, and states where the idea stops applying ("where it stops helping" in NCLEX, `ABPTSECS` electrodiagnosis, AWS IAM). Several guess prompts are real case vignettes, like the NCLEX four-patient rounds and the PT wrist drop.
- **Clinical framing exists.** Nursing tracks are told "safety and priority first … where guidelines vary by jurisdiction, say so" (`prompts.ts:42-48`), and the disclaimer acknowledgement gates every lesson call.
- **Spaced review exists.** Misses are scheduled 1 / 7 / 21 days out (`mastery.ts:44`, `grading-service.ts:120-141`), and a correct answer later moves the entry forward (`grading-service.ts:105-118`).
- **The confidence rating sits above Submit**, so it is actually collected (`lesson/[objectiveId].tsx:605, 618`).

## Findings

### 1. How much is passive versus active

**The amount of reading is fine. The active parts are optional or too easy.**

| Step | What the learner does | What the samples show |
|---|---|---|
| Guess | Types a free guess **or skips** (`lesson/[objectiveId].tsx:446-447`) | Good prompts, often case-based. Average 329 characters. |
| Teach | **Reads only.** One `<Body>` text block (`:213`), no questions inside it | Median **514 words** (range 355–771), one continuous paragraph in 20 of 26 lessons |
| Guided | Picks from 4 options (default) or types (`:486` defaults to `"mc"`) | Stem averages 759 characters and often contains the answer |
| Solo | Same as guided | Average 451 characters |

- **The attempt data shows the easy path is the one being taken.** Every recorded lesson attempt (16 in total, from 2 users) is multiple choice, with **0 free-response attempts**. This is almost certainly Nick's own testing, not learner behaviour, but it shows which path the interface makes easiest.
- **The answer is in a fixed position.** The correct option is index 0 in 24 of 26 guided questions and 25 of 26 solo questions. Nothing in the app shuffles the options; a repo-wide search finds no shuffle in the lesson code. The likely cause is the JSON example in the prompt, which hard-codes `"fadeCorrectIndex": 0` and `"soloCorrectIndex": 0` (`prompts.ts:290, 294`).
- **The correct option stands out by length.** It is the longest in 39 of 52 questions, and wrong options often carry giveaway absolutes ("always", "regardless", "must always"; 8 of them across the 52 questions). A test-wise learner can answer without the content.
- **The guided stem gives the answer away in at least 4 of the 13 lessons read.** The NCLEX acuity guided problem says: *"Patient B has new, acute signs suggesting respiratory decompensation that could progress to failure if not assessed now. State exactly which patient you go to first."* The PT median-nerve stem says the muscles are *"all supplied by one nerve … (via the anterior interosseous branch)"* and then asks which nerve. Fading should leave a **reasoning** step for the learner to complete. Here only a label is left, so the step tests reading comprehension, not the skill.
- **The guided and solo questions are generated without seeing the teaching.** `lessonPracticePrompt` gets only titles (`lesson-generation.ts:145-151`). So the "second example of the same idea" can drift from what was actually taught, which breaks the rule at `prompts.ts:77-78`.

### 2. Feedback quality

**Free-response feedback is specific. Multiple-choice feedback, the path nearly everyone takes, is thin.**

- **Multiple choice:** `"Not quite." + why` (`grade/route.ts:46`). `why` is "one short sentence on why the correct choice is correct" (`prompts.ts:252, 260`). Nothing addresses the misconception behind the option the learner chose.
  - Wrong multiple-choice options can plant false beliefs unless feedback corrects them (Butler & Roediger 2008). The distractors are deliberately written as "real misconceptions" (`prompts.ts:249`), so that risk is higher here.
- **The client tells the server which answer is right.** The app sends `correctIndex` and the server just compares it with the learner's pick (`grade/route.ts:39-44`). A modified client could mark anything correct and inflate mastery. Grading against `lesson_content` on the server fixes this, and it is also required before options can be shuffled.
- **The confidence rating is stored and never used.** `suggestStatus` ignores it (`mastery.ts:61-80`). A confident wrong answer is the most correctable error there is (the hypercorrection effect, Butterfield & Metcalfe 2001), and nothing reacts to it.
- **Disputing a verdict works but leaves the lesson.** It sends full context to the coach chat (`lesson/[objectiveId].tsx:550-569`), which is good. The coach still sees only the chat thread, not the lesson or the learner's misses (`backend/app/api/chat/route.ts:24, 59-80`).

### 3. Clinical judgment and applied skill

**The teaching often shows clinical reasoning. The learner is never asked to do it in steps.**

- **The format allows only one kind of question.** Each lesson is one guess, one teach block, and two four-option single-answer questions (`prompts.ts:239-261`; table at `001_init.sql:72+`). None of these can be built:
  - Clinical judgment as the NCSBN model breaks it down: recognise cues, analyse cues, prioritise hypotheses, generate solutions, take action, evaluate outcomes (Dickison, Haerling & Lasater 2019).
  - The Next Generation NCLEX item types used since April 2023: extended multiple response, matrix, bowtie, ordering by drag-and-drop, drop-down cloze, and trends across a chart.
- **The NCLEX samples come closest.** The four-patient prioritisation vignettes are real clinical judgment framing ("ABC is a starting filter, not the whole triage system"). But each one collapses to "who first?" with one obvious answer ("tracheostomy, audible gurgling" against "warm blanket"). It never asks the learner to:
  - say which cues mattered,
  - rank all four patients, or
  - say what to do next and what result would show it worked.
- **No CCRN lesson has been generated yet.** CCRN Adult alone has 271 objectives, and they are action-heavy (for example *"respond to malignant hyperthermia: stop trigger, give dantrolene immediately, cool…"*). Pick-one-of-four will under-teach those badly.
- **Technical content has the same problem.** The AWS IAM lessons are well explained but test vocabulary-level choices with easy distractors (*"Lambda uses the account root user's credentials"*, *"one shared IAM user that all 40 developers log into"*). There is no policy to read and reason about, no architecture to fix, and no troubleshooting.
- **The hands-on lab slot exists but is unused.** The schema has a `lab_prompt` field and a `"lab"` attempt kind, and 28 of 5,602 objectives have lab text, but **no screen shows it**. The field appears only in `mobile/src/types/index.ts:76`.
- **Unit-level PBQ scenarios are the one place multi-step reasoning is graded** (`prompts.ts:343-395`, `pbq.tsx`). They are separate from lessons and not offered after them.

### 4. Retrieval and spacing after the lesson

**Missed items do come back on a schedule, but review doesn't make the learner recall anything.**

- **Only wrong answers enter review** (`grading-service.ts:122`). Material the learner answered right on the day is never brought back, even though forgetting is steepest exactly then (Cepeda et al. 2006; Roediger & Karpicke 2006).
- **Review shows the answer before asking anything.** Each card shows the question, *"Your answer: …"* and the stored explanation (`review.tsx:132-134`). Then "Got it" moves the item to the next interval (`:159`) on the learner's say-so, with no retrieval. The honest path, "Open lesson", replays the whole lesson including the same first-slot answers.
- **Practice is never mixed.** Each lesson is one objective, and review groups by course, not by mixed topics. Mixing related problem types improves the ability to tell them apart (Rohrer & Taylor 2007). That matters most for "which nerve / which IAM feature / which informatics area" style objectives.
- **Regenerating a lesson replaces it for everyone.** `lesson_content` is one row per objective in a shared catalog (`001_init.sql:72`, `023_shared_catalog.sql`), and any signed-in learner can overwrite it (`lesson/route.ts:79-110`). The questions a learner missed can change under them before their review date.

### 5. Accuracy and grounding

**Lessons are generated freely from the objective's title alone. The care that went into sourcing the catalog never reaches the lesson prompt.**

- **The prompt gets only titles and taxonomy labels.** It receives track, unit and objective titles plus framing such as category, exam code and unit weight (`lesson-generation.ts:116-122`, `prompts.ts:173-175`). None of these reach it:
  - the source documents behind each objective,
  - source URLs,
  - the source reliability standard (`docs/source-reliability-standard.md`),
  - the per-track rules written in the seed files.
- **The seed rules are a concrete example.** The CCRN seed says *"any generated lesson should prefer generic names"* and *"doses and numeric thresholds are left out … unless the sources agreed"* (`backend/supabase/seed/tracks/ccrn.ts`, header). Neither "generic" nor "dose" appears anywhere in `prompts.ts`.
- **No lesson is ever reviewed for content.** Nothing records which sources a lesson used or whether a person checked it. The catalog review agent reviews tracks and objectives, not `lesson_content`.

### 6. Factual problems in the samples

13 lessons read in full: NCLEX-RN ×2, ABPTS Electrophysiology (`ABPTSECS`) ×2, MS Health Informatics ×2, AWS Solutions Architect ×2, AWS AI Practitioner ×3, Security+ ×2. Most of the content is accurate. Problems found:

1. **PT, solo question on the suprascapular nerve: the stem contradicts itself.**
   - It says the patient *"cannot abduct the shoulder beyond the first 15 degrees (initiated by supraspinatus)"*. Being able to start abduction means supraspinatus is working, which points to deltoid or axillary nerve weakness.
   - The keyed answer is the suprascapular nerve, and the wasting clue supports that. But the abduction clue argues against it.
   - Needs clinical-expert review.
2. **PT, guided question on the median nerve: the clues don't fit together.**
   - Weak pronator teres and flexor carpi radialis put the lesion above the anterior interosseous branch. A median nerve lesion that high would normally cause loss of sensation on the palm side of the hand, yet the stem says *"sensation is intact"*.
   - It also names the branch, which gives the answer away.
   - Needs clinical-expert review.
3. **NCLEX acuity lesson: an oversimplification.**
   - It says an empty IV bag is *"not a patient safety emergency (the line typically still has a 'keep vein open' function or can simply be clamped briefly)"*.
   - That depends entirely on what is running. An interrupted vasoactive drip, insulin or heparin infusion can be a priority. NCLEX expects that nuance.
4. **NCLEX ABC lesson: a slightly unsafe framing.** The postictal patient "drops in priority" once breathing is normal. That holds for the stem as written, but it doesn't mention that postictal patients remain at risk of aspiration and losing their airway.
5. **AWS Solutions Architect IAM lessons teach an older pattern.**
   - They teach IAM users in groups as the way to give people access (*"Create an IAM group 'staging-deployers' … add/remove each developer's IAM user"*; "Create a new IAM user for the contractor").
   - AWS's current guidance is *"Require human users to use federation with an identity provider to access AWS using temporary credentials"*, through IAM Identity Center ([IAM security best practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html), read 2026-11-02).
   - The exam still tests groups, but the lesson should say this is the fallback, not the recommended design.
6. **MS Health Informatics: a minor typo.** *"A hospital's EHU-based sepsis alert"* should say EHR. The five-area breakdown and the NANDA/NIC/NOC terms are accurate. The distractors are weak ("A fax machine…", "a clerk manually re-entering…").

### 7. Length and load on a phone screen

**Each teach block is one long wall of text, roughly two to four phone screens of unbroken reading.**

- **Size and layout:** median 514 words at 15 px / 23 px line height (`ui.tsx:610`).
  - 20 of 26 lessons have no paragraph breaks.
  - 0 have tables.
  - 5 have list-like lines.
  - 3 contain markdown syntax that shows up as literal `**`, because `<Body>` is a plain `<Text>` with no markdown rendering.
- **No diagrams anywhere.** Peripheral nerve maps, ECG strips, conduction diagrams, IAM trust relationships and the informatics molecule → population scale are all naturally visual. Pairing words with a picture helps (Paivio; Mayer, segmenting and multimedia principles).
- **The intro prompt asks for many parts in one field:** definitions, why, a worked example, a common mistake and systems implications (`prompts.ts:153`). The model packs them into one paragraph. The `ABPTSECS` neuroscience teach defines about 10 terms before the worked example begins.

### 8. Learner levels and accessibility

**Every learner gets the same lesson shape and the same nursing framing, whatever their level.**

- **CNA and CCRN get identical treatment.** The CNA track (`CNA`, subcategory `nursing-licensure`) and CCRN both receive the same `healthcare-nursing` framing (`prompts.ts:42-48`). Nothing in the prompt says:
  - learner level,
  - scope of practice (a CNA reports a change in condition, doesn't titrate drips),
  - reading level.
- **Novices and experts need opposite lesson designs.** Worked examples help novices and get in the way of experienced learners (the expertise-reversal effect, Kalyuga et al. 2003). A CCRN candidate with two or more years of ICU experience should be able to go straight to a case. A CNA student needs shorter, plainer text and more scaffolding. Today there is no level setting and no way to skip ahead.
- **Accessibility basics are thin.**
  - The lesson screen has no accessibility labels on the multiple-choice options or the 1–5 confidence buttons (`lesson/[objectiveId].tsx:593-604, 690-699`).
  - A screen-reader user hears plain numbers for confidence.
  - There is no listen-to-lesson option, and no glossary pop-ups for the many defined terms.

## Recommendations, in priority order

Effort: S = under a day, M = a few days, L = a week or more. Benefits cite the learning-science sources listed at the end.

### A. Quick prompt, schema and logic changes (no new step types)

| # | Change | Expected learning benefit | Effort | Files |
|---|---|---|---|---|
| A1 | **Shuffle options when serving, and grade multiple choice on the server.** Shuffle in `rowToLesson` with a per-attempt order. The server looks up the correct answer in `lesson_content` instead of trusting the client. Remove the `0` examples from the JSON templates. Existing 26 rows need no regeneration. | Removes the "always A" shortcut, so the questions measure and drive knowledge again. Also closes the mastery-inflation hole. **Highest value per hour.** | S | `backend/lib/lesson-generation.ts`, `backend/app/api/grade/route.ts`, `backend/lib/prompts.ts:290,294`, `lesson/[objectiveId].tsx` |
| A2 | **Explain every wrong option.** Add a `fadeWhyWrong[4]` / `soloWhyWrong[4]` field and show the explanation for the option the learner picked. Ask for distractors of similar length with no absolutes. | Corrects the specific misconception the learner showed, and blocks false beliefs planted by wrong options (Butler & Roediger 2008). | S–M (schema + migration for new columns) | `prompts.ts:239-261`, `lesson-generation.ts`, a new migration, `grade/route.ts`, `lesson/[objectiveId].tsx`, `mobile/src/types/index.ts` |
| A3 | **Make guided practice leave a reasoning step for the learner, not a label.** Rewrite the fade description: "work the example up to, but not including, the key inference; never state the conclusion or the deciding cue in the stem". Pass the generated `teach` text into the practice prompt so both questions test what was taught. | Restores the real benefit of faded examples (Renkl & Atkinson 2003). Stops questions drifting outside what was taught. | S (note: practice generation can't start until the intro finishes — it already waits for it, `lesson-generation.ts:214`) | `prompts.ts:243, 264-299`, `lesson-generation.ts:139-151` |
| A4 | **Break the teach text into sections.** Return a list of short sections (definition, how it works, worked example, common trap, where it stops applying), each under about 120 words, with an optional small table. Show them as separate cards. | Lowers how much the learner has to hold in mind at once on a phone (Mayer's segmenting principle). Makes adding a question between sections (B2) easy. | S (prompt + rendering; markdown rendering needs a JS-only package or a simple custom renderer) | `prompts.ts:144-156`, `lesson-generation.ts`, `lesson/[objectiveId].tsx:184-235`, `ui.tsx` |
| A5 | **Send the sources and seed rules to the lesson prompt.** Pass the objective's source references and the track's rules (generic drug names, no doses or thresholds unless sources agree, AWS current-practice note). Store which sources were used, and add `reviewed_at`/`reviewed_by` fields on `lesson_content`. | Fewer clinical errors like those in Finding 6. Gives a reviewer something to check against. Keeps the lessons as careful as the catalog sourcing. | M (tracks already have `source_url`/`source_verified_at`, `007_education_taxonomy.sql:121-122`; objectives have no source field, and neither level reaches the prompt) | `lesson-generation.ts:67-80, 112-159`, `prompts.ts`, `coach-context.ts`, seed `tracks/*.ts`, a new migration |
| A6 | **Add learner level and scope of practice.** Add a per-track `audience` field (e.g. CNA, LPN, new-grad RN, experienced ICU RN, cloud beginner, practising engineer) that sets reading level, worked-example depth and scope. Let experienced learners start at the solo question ("test me first"). | Matches support to the learner (expertise-reversal effect, Kalyuga et al. 2003). Keeps CNA lessons inside CNA scope. | S–M | `prompts.ts:29-54`, `coach-context.ts`, seed track data, `lesson/[objectiveId].tsx` |
| A7 | **Use the confidence rating.** After a confident wrong answer, show a "you were sure — here's the trap" message and bring the item back sooner. Track how often learners are confidently wrong. | Confident errors are the most fixable (hypercorrection, Butterfield & Metcalfe 2001). | S | `grade/route.ts`, `grading-service.ts`, `mastery.ts`, `lesson/[objectiveId].tsx` |
| A8 | **Make the guess harder to skip.** Ask for a one-line guess or a quick multiple-choice prediction before "just teach me" appears. | Even wrong guesses improve later learning, but only if attempted (Richland et al. 2009; Kapur 2016). | S | `lesson/[objectiveId].tsx:417-451` |
| A9 | **Stop one learner's regenerate from replacing the lesson for everyone.** Store regenerations per learner, or limit overwriting the shared row to admins, and keep version history. | Keeps reviewed content in place. Review items stay stable until their due date. | S–M | `lesson/route.ts:79-119`, `lesson-generation.ts`, a new migration |
| A10 | **Fix the six content issues** in Finding 6 by expert review and targeted regeneration. | Removes known wrong or confusing clinical and AWS content. | S | data only |

### B. New interactive step types

| # | Step type | Expected learning benefit | Effort | Files |
|---|---|---|---|---|
| B1 | **Real spaced review that re-asks the question.** Schedule *every* lesson question, not only misses. The review card shows the question with options hidden (or freshly shuffled), the learner answers, and that answer sets the next interval. Mix objectives from the same unit in one session. "Got it" without answering goes away. | Highest long-term retention gain available: testing yourself plus spacing plus mixing (Dunlosky et al. 2013; Cepeda et al. 2006; Rohrer & Taylor 2007). | M | `grading-service.ts:100-141`, `mastery.ts:42-56`, `backend/app/api/errors/*`, a new review-queue endpoint, `mobile/app/(app)/review.tsx` |
| B2 | **Self-explanation prompts graded by the coach.** After each teach section (A4), ask one-line "why?" or "what would change if…" questions, graded by the existing free-response grader with the section as context. | Self-explanation and elaborative interrogation ("why?", "what would change if…") are rated moderate-utility by Dunlosky et al. 2013, and self-explanation helps most alongside worked examples (Chi et al. 1994; Atkinson et al. 2003). It turns the passive teach step into an active one. | M (grader exists at `prompts.ts:308-335`; needs a lightweight fast-model path and rate limits) | `prompts.ts`, `grade/route.ts`, `lesson/[objectiveId].tsx` |
| B3 | **Case-based "next best action", one stage at a time.** A case unfolds over 3–4 screens: which cues matter → most likely problem → priority action → what result shows it worked. Each stage is graded and gets feedback. | Builds the clinical judgment the NCSBN model describes and the NCLEX/CCRN exams test. Also works for cloud incident troubleshooting. | L | `prompts.ts` (new schema), new table `case_items`, `grade/route.ts` or a new route, a new step component in `lesson/[objectiveId].tsx` |
| B4 | **Ordering and prioritisation items** (drag to rank 4 patients, sequence the steps of an AWS procedure or the response to malignant hyperthermia). | Practises the actual skill of prioritising and sequencing. Matches Next Generation NCLEX extended drag-and-drop. | M (JS-only drag list; up/down buttons as the simple, accessible fallback) | new schema field, `ui.tsx`, lesson screen, `grade/route.ts` |
| B5 | **Matrix and drag-to-match items** (finding → nerve, symptom → disorder, need → IAM feature, scenario → informatics area). | Practises telling similar things apart. Matches NCLEX matrix items. Directly suits the samples' "which of these five" objectives. | M | as B4 |
| B6 | **Show the existing lab prompts** after the solo question for the 28 objectives that have them. Add more for cloud tracks ("write a least-privilege policy for…", graded per part like PBQs). | Hands-on practice, which is where cloud skills actually transfer. | S to show existing labs; M to grade them | `lesson/[objectiveId].tsx`, `grade/route.ts` (kind `"lab"` already exists), seed data |
| B7 | **Diagrams and pictures** (nerve maps, ECG strips, architecture sketches). | Words plus pictures help (Paivio; Mayer). | L (native SVG installs are blocked on this machine; start with images stored per objective and a reviewed library, not generated art) | assets, schema, lesson screen |
| B8 | **Offer a PBQ at the end of each unit**, using the existing scenario generator and per-part grading. | Applies several objectives at once, which tests transfer. | S | course dashboard / `lesson/[objectiveId].tsx` done card, `pbq.tsx` |

**Suggested order:** A1, A2 and A3 first, about two days together. Then B1, A4 and A5. Then B3, B4 and B5, for the nursing tracks first.

## Method and limits

- **Sample size.** The whole catalog has only **26** cached lessons. The deepest-read 13 are NCLEX-RN, ABPTS Electrophysiology, MS Health Informatics, AWS Solutions Architect, AWS AI Practitioner and Security+. The statistics (answer position, length, structure) cover all 26.
- **Missing tracks.** No CCRN, CNA or project-management lesson has been generated. None was generated for this review, because that would have meant a paid API call. Findings for those tracks come from their objectives and the prompt that would generate them.
- **Usage data is tiny.** 16 attempts from 2 users and 4 review entries. This is test traffic, not learner behaviour.
- **Database access.** Read-only `SELECT` queries only.
- **Clinical review.** The clinical issues in Finding 6 are a careful reading, not a clinician sign-off. Items 1 and 2 especially should go to a PT or clinical expert.

## Sources

- Dunlosky, J., Rawson, K. A., Marsh, E. J., Nathan, M. J., & Willingham, D. T. (2013). Improving students' learning with effective learning techniques. *Psychological Science in the Public Interest*, 14(1).
- Roediger, H. L., & Karpicke, J. D. (2006). Test-enhanced learning. *Psychological Science*, 17(3).
- Butler, A. C., & Roediger, H. L. (2008). Feedback enhances the positive effects and reduces the negative effects of multiple-choice testing. *Memory & Cognition*, 36(3).
- Cepeda, N. J., et al. (2006). Distributed practice in verbal recall tasks: a review and quantitative synthesis. *Psychological Bulletin*, 132(3).
- Rohrer, D., & Taylor, K. (2007). The shuffling of mathematics problems improves learning. *Instructional Science*, 35.
- Renkl, A., & Atkinson, R. K. (2003). Structuring the transition from example study to problem solving in cognitive skill acquisition. *Educational Psychologist*, 38(1).
- Atkinson, R. K., Renkl, A., & Merrill, M. M. (2003). Transitioning from studying examples to solving problems: combining fading with prompting fosters learning. *Journal of Educational Psychology*, 95(4).
- Sweller, J. — worked-example effect and cognitive load theory (e.g. Sweller, van Merriënboer & Paas, 1998, *Educational Psychology Review*, 10(3)).
- Kalyuga, S., Ayres, P., Chandler, P., & Sweller, J. (2003). The expertise reversal effect. *Educational Psychologist*, 38(1).
- Kapur, M. (2016). Examining productive failure, productive success, unproductive failure, and unproductive success in learning. *Educational Psychologist*, 51(2).
- Richland, L. E., Kornell, N., & Kao, L. S. (2009). The pretesting effect. *Journal of Experimental Psychology: Applied*, 15(3).
- Chi, M. T. H., de Leeuw, N., Chiu, M.-H., & LaVancher, C. (1994). Eliciting self-explanations improves understanding. *Cognitive Science*, 18(3).
- Butterfield, B., & Metcalfe, J. (2001). Errors committed with high confidence are hypercorrected. *JEP: Learning, Memory, and Cognition*, 27(6).
- Paivio, A. (1986). *Mental Representations: A Dual Coding Approach*; Mayer, R. E. *Multimedia Learning* (segmenting and multimedia principles).
- Dickison, P., Haerling, K. A., & Lasater, K. (2019). Integrating the National Council of State Boards of Nursing Clinical Judgment Model into nursing educational frameworks. *Journal of Nursing Education*, 58(2). NCSBN Next Generation NCLEX item types (in use since April 2023).
- AWS, *Security best practices in IAM*, https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html (read 2026-11-02).
