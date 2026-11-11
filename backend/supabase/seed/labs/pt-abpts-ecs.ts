import { CLINICAL_SAFETY, part, type SeedLabSet } from "./types";
import { source } from "../sources";

// REQ-173: ABPTS Clinical Electrophysiologic Specialist (ECS) labs.
//
// Aligned to the ABPTS clinical electrophysiology examination outline
// (re-read 2026-11-09 on specialization.apta.org; page (c) 2025, no
// effective date, no notice of a new outline or a paused exam): Area
// Knowledge 40% (80 items: anatomy, neuroscience, physiology 7% each,
// clinical sciences 9%, critical inquiry 5%, professional roles 5%) and
// Practice Expectations 60% (120 items: history/systems review 5%, tests and
// measures 15%, normal and abnormal characteristics 12.5%, interpretation
// 12.5%, diagnosis 5%, prognosis 5%, interventions 5%). The seed track groups
// these into five units (21 / 19 / 20 / 25 / 15). Density follows the
// adopted hybrid plan unit by unit: 2 / 1 / 2 / 3 / 2 = 10 labs (4 build,
// 6 case).
//
// Every patient and clinic is fictional; exam practice, not clinical
// guidance. Nerve conduction numbers in a case are given together with that
// fictional laboratory's own reference limits, so the learner interprets
// against stated limits and the lab teaches no population norm.
//
// What each lab's own clinical values rest on is listed per lab in
// value-sources.ts (ABPTSECS). Read on 2026-11-09:
//   - AANEM, "Patient Safety: EMG/NCS and Risk of Bleeding" (2021): use
//     caution with platelet counts below 50,000 (and INR above about
//     1.5-2.0); routinely stopping anticoagulant or antiplatelet drugs, or
//     routinely deferring EMG, is not recommended.
//   - Galloway et al., AANEM, "Needle EMG in certain uncommon clinical
//     contexts", Muscle Nerve 2005;31:398 (doi 10.1002/mus.20238): no
//     contraindication to needle EMG in lymphedema or with prosthetic
//     joints; judge each case. The seed track's screening objective used to
//     say never to do needle EMG in a lymphedematous limb; Nick approved
//     following AANEM, and the objective was reworded to match (REQ-173).
//   - AAEM/AAN/AAPM&R practice parameter for EDX studies in carpal tunnel
//     syndrome (Muscle Nerve 2002; 1993 recommendations reaffirmed): median
//     sensory NCS across the wrist first, compared with an adjacent nerve if
//     abnormal; short-segment or median-vs-ulnar/radial comparisons if the
//     first is normal; median motor with thenar recording; needle EMG an
//     option.
//   - Practical Neurology, "Diagnosis and Treatment of Lambert-Eaton
//     Myasthenic Syndrome" (April 2024): low resting CMAP, decrement on 2-3
//     Hz RNS, increment after 50 Hz stimulation or 10 s exercise; 100% the
//     classic cut-off, 60% more sensitive with specificity kept; SCLC the
//     most common associated cancer.
//   - Goncalves et al., "Cervical radiculopathy for neurologists: the role of
//     electrodiagnosis", Arq Neuropsiquiatr 2025 (doi
//     10.1055/s-0045-1812893): radiculopathy needs neurogenic change in at
//     least two muscles of the same root supplied by different nerves; a
//     screen of at least six muscles including a paraspinal; denervation
//     identifiable about 14-21 days after onset; sensory NCS normal in root
//     lesions because the dorsal root ganglion is spared (preganglionic).
//   - EAN/PNS guideline on CIDP, second revision (Eur J Neurol 2021, doi
//     10.1111/ene.14959): abstract read; the "at least 8 weeks" element and
//     the electrodiagnostic criteria were not re-read in full text and are
//     listed as not verified.
//   - Robinson, "Traumatic injury to peripheral nerves", Muscle Nerve 2000
//     (AANEM minimonograph; PMID 10842261): abstract read (EDX localizes
//     and quantifies axon loss); Wallerian-degeneration timing is used only
//     qualitatively and is listed as not verified.

const CHECKED = "2026-11-09";

export const ABPTSECS_LABS: SeedLabSet = {
  trackCode: "ABPTSECS",
  sources: [
    source(
      "https://specialization.apta.org/become-a-specialist/clinical-electrophysiology/specialist-certification-examination-outline-clinical-electrophysiology",
      "exam_outline",
      CHECKED
    ),
    source("https://specialization.apta.org/become-a-specialist/clinical-electrophysiology", "exam_outline", CHECKED),
  ],
  labs: [
    // ------------------------------------------------------------------
    // Unit 1: Anatomy, neuroscience and physiology (2)
    // ------------------------------------------------------------------
    {
      slug: "ecs-nerve-injury-grades",
      objective:
        "Explain Seddon's nerve injury grades and later systems (Sunderland's five grades, Mackinnon), and the Wallerian degeneration that follows any injury worse than a conduction block",
      kind: "build",
      title: "Grade three nerve injuries and predict the studies",
      brief:
        "Three fictional patients, each studied about four weeks after injury. Patient A: radial nerve palsy after sleeping with the arm over a chair; stimulating the radial nerve below the spiral groove gives a normal CMAP to extensor indicis, but stimulating above the groove gives a much smaller one; needle EMG of the wrist extensors shows no fibrillation potentials, and few units fire. Patient B: ulnar nerve crushed in a closed elbow fracture; distal ulnar CMAP and SNAP are very low; first dorsal interosseous shows abundant fibrillation potentials; the surgeon reports the nerve sheath looked intact. Patient C: median nerve cut cleanly by glass at the mid-forearm, not repaired; no distal median CMAP or SNAP; abductor pollicis brevis shows fibrillation potentials and no voluntary units. Fictional patients; exam practice, not clinical guidance.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Grade each injury (Seddon, and Sunderland where you can) and explain how the electrodiagnostic findings support it.",
          parts: [
            part(
              "Patient A",
              "Neurapraxia (Sunderland grade 1): focal conduction block across the spiral groove with a normal distal response and no denervation, because axons are intact and there is no Wallerian degeneration.",
              "Neurapraxia, Sunderland 1. Conduction is blocked at the spiral groove but the nerve distal to it still conducts normally and there are no fibrillation potentials -- axons are in continuity, so no Wallerian degeneration. Expect good recovery as the myelin repairs."
            ),
            part(
              "Patient B",
              "Axonotmesis with axon loss: low distal CMAP/SNAP and fibrillation potentials show Wallerian degeneration; an intact sheath fits Sunderland 2-3 (or up to 4, which EDX alone can't separate), and explains that recovery depends on regrowth.",
              "Axonotmesis: axons are lost (low distal amplitudes after Wallerian degeneration, fibrillations), but the sheath is in continuity -- Sunderland 2 or 3; EDX alone can't separate 2, 3 and 4. Recovery depends on axonal regrowth, so serial studies watch for reinnervation."
            ),
            part(
              "Patient C",
              "Neurotmesis (Sunderland 5): complete transection, absent distal responses and no voluntary units with denervation, with no recovery expected without surgical repair.",
              "Neurotmesis, Sunderland 5: the nerve is divided, so the distal segment has degenerated (absent CMAP and SNAP), with denervation and no voluntary units. It won't recover without surgical repair -- refer urgently."
            ),
            part(
              "Timing caveat",
              "Explains that a study in the first days after injury can't separate neurapraxia from axon loss, because the distal nerve still conducts until Wallerian degeneration has occurred.",
              "Very early, an axon-loss lesion can look like a conduction block, since the distal stump still conducts until Wallerian degeneration is complete. That is why these studies were done at about four weeks."
            ),
          ],
        },
      ],
    },
    {
      slug: "ecs-presynaptic-nmj-case",
      objective:
        "Know the presynaptic versus postsynaptic split at the neuromuscular junction: Lambert-Eaton syndrome and botulism affect the presynaptic membrane, and Lambert-Eaton is strongly linked to small cell carcinoma",
      kind: "case",
      title: "Weak legs, dry mouth and a smoker's history",
      brief:
        "A fictional 64-year-old man, a heavy smoker, has had six months of proximal leg weakness (trouble rising from chairs), a dry mouth and constipation. His reflexes are reduced but get brisker after he contracts the muscle hard for a few seconds. He is referred for electrodiagnosis. Exam practice, not clinical guidance.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "Motor nerve conduction studies show low CMAP amplitudes in every nerve tested, with normal distal latencies and conduction velocities. Sensory studies are normal.",
          ask: "What does this pattern suggest, and what do you test next?",
          parts: [
            part(
              "Interpretation",
              "Recognizes that diffusely low CMAPs with normal sensory studies and normal latencies/velocities suggest a presynaptic neuromuscular junction disorder (Lambert-Eaton) rather than a neuropathy, given the autonomic symptoms and reflex facilitation.",
              "Low CMAPs everywhere with normal SNAPs and normal conduction speeds point away from a neuropathy and toward a presynaptic NMJ problem -- Lambert-Eaton fits the proximal weakness, dry mouth and reflexes that improve after contraction."
            ),
            part(
              "Next tests",
              "Plans slow (2-3 Hz) repetitive nerve stimulation and a post-brief-exercise (about 10 seconds) CMAP or high-rate stimulation to look for an increment.",
              "Slow repetitive stimulation at 2-3 Hz looking for a decrement, then a CMAP immediately after about 10 seconds of maximal voluntary contraction (better tolerated than 50 Hz stimulation) to look for an increment."
            ),
          ],
        },
        {
          text: "At 3 Hz the abductor digiti minimi CMAP falls by 22% from the first to the fourth response. Its baseline CMAP is 1.1 mV; immediately after 10 seconds of maximal contraction it is 2.6 mV.",
          ask: "Calculate the increment and state what the results show.",
          parts: [
            part(
              "Increment",
              "Calculates (2.6 - 1.1) / 1.1 = 136% and states that this exceeds the classic 100% criterion (and the more sensitive 60%).",
              "Increment = (2.6 - 1.1) / 1.1 = 1.36, i.e. 136% -- above the classic 100% criterion and the more sensitive 60% one."
            ),
            part(
              "Conclusion",
              "States the triad is complete (low resting CMAP, low-rate decrement, marked post-exercise increment) and that this supports a presynaptic disorder such as Lambert-Eaton, contrasting with myasthenia gravis (postsynaptic: usually normal resting CMAP, decrement without a large increment).",
              "Low resting CMAP, a decrement at 3 Hz and a large increment after exercise -- the presynaptic pattern of Lambert-Eaton. Myasthenia gravis, a postsynaptic disorder, usually has a normal resting CMAP and a decrement without this facilitation."
            ),
          ],
        },
        {
          text: "The referring physician asks what your report should say about next steps.",
          ask: "What do you recommend in the report and to whom?",
          parts: [
            part(
              "Recommendation",
              "Recommends the physician consider antibodies to voltage-gated calcium channels and a search for malignancy, especially small cell lung cancer given the smoking history, and communicates promptly rather than only in the routine report.",
              "The report states the findings support a presynaptic NMJ disorder such as Lambert-Eaton and recommends voltage-gated calcium channel antibody testing and a cancer screen, especially for small cell lung cancer given his smoking. Phone the physician the same day as well as sending the report."
            ),
          ],
        },
      ],
    },

    // ------------------------------------------------------------------
    // Unit 2: Clinical sciences, critical inquiry, professional roles (1)
    // ------------------------------------------------------------------
    {
      slug: "ecs-pretest-screening-case",
      objective:
        "Screen before testing: avoid studies over open skin infection, burns, recent grafts or casts; defer or limit needle EMG with platelets below 50,000; treat lymphedema as no contraindication to needle EMG, weighing the risk against what the study adds; and avoid testing with external temporary pacemakers",
      kind: "case",
      title: "Screen three referrals before the clinic starts",
      brief:
        "You run a fictional outpatient electrodiagnostic clinic. Three referrals arrive for this morning. Exam practice, not clinical guidance; follow your clinic's policy and the referring physician's orders in real care.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "Referral 1: a man on warfarin for atrial fibrillation, INR today 2.4, for suspected L5 radiculopathy; the plan includes lumbar paraspinal and tibialis posterior needle EMG. Referral 2: a woman with a platelet count of 38,000 from chemotherapy, for suspected peroneal neuropathy.",
          ask: "How do you handle each referral?",
          parts: [
            part(
              "Anticoagulated patient",
              "Does not stop the warfarin or routinely cancel the test; proceeds with caution because the INR is above about 1.5-2.0: limits needle insertions, uses the smallest needle, avoids or limits deep muscles that can't be compressed (for example tibialis posterior, deep paraspinals) when they won't change the answer, holds pressure afterward, and documents the risk discussion.",
              "Don't ask him to stop warfarin and don't cancel by routine. With an INR of 2.4, use extra caution: fewest insertions, smallest-gauge needle, sample superficial compressible L5 muscles first (tibialis anterior, extensor hallucis), and do tibialis posterior or deep paraspinals only if the answer depends on them; hold pressure and document the discussion."
            ),
            part(
              "Low platelets",
              "Flags that a platelet count below 50,000 calls for caution: nerve conduction studies can proceed, but needle EMG should be deferred or limited after discussion with the referring physician.",
              "Platelets of 38,000 are below 50,000: do the nerve conduction studies, which carry no needle risk, but defer the needle EMG -- or limit it to a few superficial muscles -- after speaking with the referring physician."
            ),
          ],
        },
        {
          text: "Referral 3: a woman with right arm lymphedema after breast cancer surgery, referred for right carpal tunnel syndrome. She has cellulitis-like redness over the right forearm today.",
          ask: "How do you proceed?",
          parts: [
            part(
              "Lymphedema and skin",
              "Recognizes that lymphedema is not an absolute contraindication (AANEM: judge each case on risk vs value, often limiting needle work in that limb), but that active skin infection over the test site means the study should be postponed until it resolves, informing the referrer.",
              "Lymphedema alone isn't an absolute bar -- AANEM leaves needle EMG in a lymphedematous limb to case-by-case judgment, and a CTS question can often be answered by NCS with little or no needle work in that arm. But the forearm redness may be cellulitis: postpone the study, tell the referring physician, and rebook once the skin has healed."
            ),
          ],
        },
      ],
    },

    // ------------------------------------------------------------------
    // Unit 3: Examination: history, systems review, tests and measures (2)
    // ------------------------------------------------------------------
    {
      slug: "ecs-muscle-selection-c7-vs-radial",
      objective: "Needle electromyography technique and muscle selection for a stated question",
      kind: "build",
      title: "Pick muscles to separate C7 radiculopathy from radial neuropathy",
      brief:
        "A fictional 50-year-old has had four weeks of weakness extending the wrist and fingers on the right, with some aching in the back of the arm. The referral question is: 'C7 radiculopathy or radial neuropathy?' Nerve conduction studies are planned separately. Exam practice, not clinical guidance.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the needle EMG muscle plan and say what pattern would support each diagnosis.",
          parts: [
            part(
              "C7 muscles outside the radial nerve",
              "Includes C7 muscles supplied by nerves other than the radial (for example pronator teres or flexor carpi radialis -- median), plus the cervical paraspinals at the appropriate level.",
              "Pronator teres and flexor carpi radialis (median nerve, C6-7) and the lower cervical paraspinals."
            ),
            part(
              "Radial muscles above and below the spiral groove",
              "Includes radial-innervated muscles distal to the spiral groove (extensor digitorum, extensor indicis) and proximal to it (triceps, and brachioradialis) to localize a radial lesion.",
              "Distal: extensor digitorum and extensor indicis. Proximal: triceps (branches leave above the groove) and brachioradialis (below the groove, above the forearm)."
            ),
            part(
              "Interpretation",
              "C7 radiculopathy: neurogenic change in at least two C7 muscles from different nerves (radial and median) plus paraspinals, with a normal radial SNAP. Radial neuropathy at the spiral groove: changes in radial muscles below the groove with triceps and median C7 muscles normal, paraspinals normal and often an abnormal superficial radial SNAP.",
              "Radiculopathy: abnormal pronator teres/FCR and radial C7 muscles plus paraspinals, with a normal superficial radial SNAP (the root lesion is proximal to the dorsal root ganglion). Radial neuropathy at the groove: abnormal brachioradialis and wrist/finger extensors, normal triceps, pronator teres, FCR and paraspinals, often a low superficial radial SNAP."
            ),
          ],
        },
      ],
    },
    {
      slug: "ecs-timing-after-humeral-fracture-case",
      objective:
        "Time a study around nerve injury: fibrillation potentials usually show on EMG at 3 to 4 weeks, and no sign of reinnervation by 3 to 4 months raises concern for neurotmesis and surgical exploration",
      kind: "case",
      title: "Wrist drop after a humeral shaft fracture",
      brief:
        "A fictional 28-year-old fractured the right humeral shaft in a fall and woke from surgery with a wrist and finger drop. The orthopedic surgeon asks for an electrodiagnostic study 'as soon as possible'. Exam practice, not clinical guidance.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "It is day 4 after the injury.",
          ask: "When do you schedule the first study, and why?",
          parts: [
            part(
              "Timing",
              "Explains that at day 4 the distal nerve may still conduct and denervation potentials have not yet appeared, so the study can't yet separate a conduction block from axon loss; schedules it at about 3-4 weeks, while noting an early study can document a baseline (e.g. preserved voluntary units, which show continuity).",
              "Too early: Wallerian degeneration may not be complete, so distal responses can look normal, and fibrillation potentials usually don't show until about 3-4 weeks. Schedule at about 3-4 weeks; an early study could only confirm whether any voluntary units fire (evidence the nerve is in continuity)."
            ),
          ],
        },
        {
          text: "At 4 weeks: radial CMAP to extensor indicis is 0.4 mV (this fictional lab's lower limit 2.0 mV; the uninjured side 5.1 mV). Abundant fibrillation potentials in extensor digitorum and brachioradialis; triceps normal; no voluntary units in extensor digitorum.",
          ask: "What do these findings show?",
          parts: [
            part(
              "Interpretation",
              "Identifies severe axon loss (about 8% of the other side's amplitude) of the radial nerve below the triceps branches, consistent with injury at the spiral groove, and that absent voluntary units mean continuity can't be shown yet.",
              "Severe radial axon loss: 0.4 / 5.1 = about 8% of the uninjured side, with denervation in extensor digitorum and brachioradialis but normal triceps -- a lesion at the spiral groove. No voluntary units, so the study cannot yet show whether the nerve is in continuity."
            ),
          ],
        },
        {
          text: "At 4 months, a repeat study still shows fibrillation potentials and no voluntary motor units in brachioradialis, the most proximal muscle below the lesion; there are no nascent units.",
          ask: "What do you report and recommend?",
          parts: [
            part(
              "Recommendation",
              "States there is no electrodiagnostic sign of reinnervation by about 4 months even in the nearest muscle, which raises concern for a non-recovering lesion (neurotmesis or severe axonotmesis), and recommends the surgeon consider exploration, communicating promptly because delay harms repair outcomes.",
              "No reinnervation (no nascent units) by 4 months even in brachioradialis, the first muscle the regrowing axons would reach, raises concern for neurotmesis or a lesion that won't recover. Recommend the surgeon consider exploration and call them now -- the window for nerve repair or tendon transfer planning is time-sensitive."
            ),
          ],
        },
      ],
    },

    // ------------------------------------------------------------------
    // Unit 4: Evaluation: normal and abnormal characteristics (3)
    // ------------------------------------------------------------------
    {
      slug: "ecs-axonal-vs-demyelinating-tables",
      objective: "Interpreting abnormal findings: axonal versus demyelinating, focal versus diffuse, acute versus chronic",
      kind: "build",
      title: "Classify three nerve conduction tables",
      brief:
        "This fictional laboratory's limits for the median motor study (wrist stimulation, APB recording): distal latency 4.2 ms or less, CMAP 4.0 mV or more, forearm conduction velocity 49 m/s or more. Three fictional patients' median motor results: Patient 1 -- distal latency 4.0 ms, CMAP 1.2 mV (elbow 1.1 mV), velocity 47 m/s. Patient 2 -- distal latency 7.9 ms, CMAP 5.2 mV (elbow 2.0 mV, with a broad, dispersed waveform), velocity 28 m/s. Patient 3 -- distal latency 6.1 ms, CMAP 5.0 mV (elbow 4.8 mV), velocity 55 m/s; the ulnar study in the same hand is normal. Exam practice, not clinical guidance.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Classify each pattern and explain the reasoning.",
          parts: [
            part(
              "Patient 1",
              "Axonal: low CMAP amplitude with normal or only mildly slowed latency/velocity (velocity not below what loss of the fastest fibers could explain), and no conduction block (elbow about equal to wrist).",
              "Axon loss: amplitude is well below the limit (1.2 vs 4.0 mV) while latency is normal and velocity only slightly low, as expected when the fastest axons are lost. Elbow and wrist amplitudes match, so no block."
            ),
            part(
              "Patient 2",
              "Demyelinating: markedly prolonged distal latency and slowed velocity (far beyond what axon loss explains), with a large proximal amplitude drop and temporal dispersion suggesting conduction block; raises an acquired demyelinating process.",
              "Demyelinating: distal latency nearly double the limit and velocity 28 m/s, far slower than axon loss could cause. The CMAP drops from 5.2 to 2.0 mV (about 62%) with dispersion between wrist and elbow -- conduction block and temporal dispersion, which point to an acquired demyelinating neuropathy."
            ),
            part(
              "Patient 3",
              "Focal demyelination at the wrist: prolonged distal latency only, with normal amplitude and forearm velocity and a normal ulnar study -- typical of median neuropathy at the wrist (carpal tunnel), not a diffuse process.",
              "Focal: only the segment across the wrist is slow (distal latency 6.1 ms) while amplitude and forearm velocity are normal and the ulnar nerve is normal -- focal demyelination at the wrist, as in carpal tunnel syndrome."
            ),
          ],
        },
      ],
    },
    {
      slug: "ecs-carpal-tunnel-sensory-first-case",
      objective: "Know that in carpal tunnel syndrome sensory fibers are hit before motor ones, so SNAPs are often the first values to change",
      kind: "case",
      title: "Night numbness and a normal motor study",
      brief:
        "A fictional 41-year-old office worker has three months of numbness in the right thumb, index and middle fingers that wakes her at night and eases when she shakes the hand. Strength is normal. This fictional lab's limits: median motor distal latency 4.2 ms or less; median sensory peak latency (wrist to digit 2, 14 cm) 3.6 ms or less; median-minus-ulnar palmar mixed peak latency difference 0.3 ms or less. Exam practice, not clinical guidance.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "Median motor distal latency 3.9 ms, CMAP normal. Median sensory peak latency to digit 2 is 3.5 ms, amplitude normal.",
          ask: "Do these results rule out carpal tunnel syndrome? What do you do next?",
          parts: [
            part(
              "Interpretation",
              "States that normal routine studies don't exclude mild CTS, because sensory fibers are affected first and a long-segment sensory latency can stay within limits.",
              "No. In early carpal tunnel syndrome sensory fibers change first, and a 14 cm wrist-to-digit latency of 3.5 ms can stay within limits while the short segment under the carpal ligament is slowed."
            ),
            part(
              "Next study",
              "Adds a more sensitive comparison study per the practice parameter: median vs ulnar palmar mixed (or ring-finger, or median vs radial thumb) latency comparison over a short segment.",
              "Add a comparison over a short segment, for example the median-vs-ulnar palmar mixed study over 8 cm (or ring-finger median vs ulnar, or thumb median vs radial), as the AAEM practice parameter recommends when the first study is normal."
            ),
          ],
        },
        {
          text: "Palmar mixed peak latency: median 2.4 ms, ulnar 1.8 ms. The ulnar sensory study is normal.",
          ask: "Interpret the comparison and write the impression.",
          parts: [
            part(
              "Comparison",
              "Calculates the difference 2.4 - 1.8 = 0.6 ms, above the 0.3 ms limit, showing focal median slowing across the wrist with a normal ulnar comparator.",
              "Difference 2.4 - 1.8 = 0.6 ms, double this lab's 0.3 ms limit: focal median sensory slowing across the wrist, with the ulnar nerve normal."
            ),
            part(
              "Impression",
              "Writes a mild median neuropathy at the wrist, sensory (demyelinating) only, with no motor or axon-loss involvement, consistent with clinical carpal tunnel syndrome; notes needle EMG is optional and not needed unless weakness or another diagnosis is suspected.",
              "Impression: mild right median neuropathy at the wrist, affecting sensory fibers only, without motor involvement or axon loss -- consistent with carpal tunnel syndrome. Needle EMG was not needed with normal strength and no other suspected diagnosis."
            ),
          ],
        },
      ],
    },
    {
      slug: "ecs-cervical-radiculopathy-emg-case",
      objective:
        "Confirm cervical radiculopathy on EMG with changes in a paraspinal muscle plus two muscles from different nerves sharing the root; early radiculopathy may show only sensory or demyelinating change, so EMG can miss acute cases",
      kind: "case",
      title: "Neck pain into the thumb: test now or later?",
      brief:
        "A fictional 46-year-old carpenter has had neck pain radiating to the left thumb with tingling for 8 days. Biceps reflex is reduced and elbow flexion is slightly weak. The physician wants to know whether this is a C6 radiculopathy. Exam practice, not clinical guidance.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "The physician asks for the study this week.",
          ask: "What can a study at day 8 show, and what do you advise?",
          parts: [
            part(
              "Early study limits",
              "Explains that fibrillation potentials usually aren't identifiable until about 2-3 weeks after onset, so needle EMG this early may be normal even with a real radiculopathy; only reduced recruitment might be seen. Advises waiting until about 3 weeks unless an early study answers another question.",
              "At day 8 denervation potentials usually haven't appeared (they become identifiable about 14-21 days after onset), so a normal EMG wouldn't rule out C6 radiculopathy. Advise testing at about 3 weeks unless something else needs excluding now."
            ),
          ],
        },
        {
          text: "At 4 weeks: median and radial sensory studies are normal, including the lateral antebrachial cutaneous SNAP. Needle EMG: fibrillation potentials and reduced recruitment in biceps (musculocutaneous) and brachioradialis (radial), fibrillations in the left C5-6 cervical paraspinals; pronator teres, triceps and first dorsal interosseous are normal.",
          ask: "Interpret the findings.",
          parts: [
            part(
              "Root localization",
              "Concludes C6 (C5-6) radiculopathy: neurogenic change in at least two muscles sharing the root but supplied by different nerves (biceps, brachioradialis) plus paraspinals, with muscles of other roots normal.",
              "Left C6 radiculopathy: active denervation in biceps (musculocutaneous) and brachioradialis (radial) -- two nerves, same root -- and in the C5-6 paraspinals, with C7 and C8 muscles normal."
            ),
            part(
              "Normal SNAPs",
              "Explains that sensory studies are normal because the lesion is proximal to the dorsal root ganglion (preganglionic), which separates radiculopathy from a plexus or nerve lesion.",
              "Normal SNAPs fit a root lesion: compression is proximal to the dorsal root ganglion, so the sensory cell body and its distal axon survive. An upper-trunk plexus lesion would usually lower the lateral antebrachial cutaneous SNAP."
            ),
          ],
        },
      ],
    },

    // ------------------------------------------------------------------
    // Unit 5: Diagnosis, prognosis and interventions (2)
    // ------------------------------------------------------------------
    {
      slug: "ecs-formulate-diagnosis-polyneuropathy-case",
      objective: "Formulating the electrodiagnostic diagnosis and the differential it supports",
      kind: "case",
      title: "Numb feet: length-dependent or something to treat?",
      brief:
        "A fictional 58-year-old with type 2 diabetes is referred with 'diabetic neuropathy, please confirm.' Exam practice, not clinical guidance.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "History: numb feet for two years, slowly creeping up to the ankles. Exam: reduced vibration and pin sensation in a stocking pattern, absent ankle reflexes, normal strength. NCS: sural SNAPs absent bilaterally; peroneal and tibial CMAPs low with mildly slowed velocities; radial and median sensory normal. Needle EMG: chronic neurogenic changes in distal leg muscles only.",
          ask: "Write the electrodiagnostic diagnosis and the differential it supports.",
          parts: [
            part(
              "Diagnosis",
              "States a length-dependent, symmetric, sensorimotor, predominantly axonal polyneuropathy, chronic, giving the findings that support each descriptor.",
              "Length-dependent, symmetric sensorimotor polyneuropathy, primarily axonal and chronic: absent sural SNAPs and low leg CMAPs with only mild slowing, upper limbs spared, chronic reinnervation in distal leg muscles only."
            ),
            part(
              "Differential",
              "Notes that this pattern fits diabetes but is not specific, and lists other common causes of axonal length-dependent neuropathy for the physician to consider (for example B12 deficiency, alcohol, thyroid disease, monoclonal protein, medications), within PT scope (reporting, not ordering).",
              "Consistent with diabetic polyneuropathy but not specific to it; other causes of the same pattern include B12 deficiency, alcohol, hypothyroidism, a monoclonal gammopathy and neurotoxic drugs -- listed for the referring physician to consider."
            ),
          ],
        },
        {
          text: "A second fictional patient with diabetes has 4 months of progressive weakness in both arms and legs, proximal as well as distal, and areflexia. NCS: motor velocities about half the lower limit in several nerves, prolonged distal latencies, conduction block in two nerves at non-entrapment sites, and prolonged F-waves.",
          ask: "How does your diagnosis and communication change?",
          parts: [
            part(
              "Demyelinating pattern",
              "Recognizes an acquired, multifocal demyelinating polyradiculoneuropathy (proximal and distal weakness, conduction block at non-entrapment sites, marked slowing) that is not explained by diabetes, raises CIDP, and contacts the physician promptly because it may be treatable.",
              "This is not typical diabetic neuropathy: proximal and distal weakness, marked slowing, conduction block away from entrapment sites and long F-waves indicate an acquired demyelinating polyradiculoneuropathy. With progression beyond 8 weeks, CIDP should be considered. Call the referring physician and recommend neurology referral, because CIDP is treatable."
            ),
          ],
        },
      ],
    },
    {
      slug: "ecs-preganglionic-plexus-injury",
      objective:
        "Use EDX to tell preganglionic (root) from postganglionic (plexus) brachial plexus injury, and add somatosensory evoked potentials when the central sensory pathway needs testing",
      kind: "build",
      title: "Root avulsion or plexus injury after a motorbike crash",
      brief:
        "Two fictional motorcyclists, both studied 4 weeks after a fall onto the shoulder, have a flail, numb arm over the C5-C6 territory (no shoulder abduction or elbow flexion, numb lateral forearm). Rider A: lateral antebrachial cutaneous and median-to-thumb SNAPs are normal; needle EMG shows fibrillations in deltoid, biceps and the C5-6 cervical paraspinals. Rider B: the same SNAPs are absent; deltoid and biceps show fibrillations, but the cervical paraspinals are normal. Exam practice, not clinical guidance.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Localize each injury, explain the key findings, and say what else could be tested and why it matters.",
          parts: [
            part(
              "Rider A",
              "Preganglionic (root-level, possibly avulsion) C5-6 injury: normal SNAPs in a numb territory because the dorsal root ganglion and distal sensory axons survive, and paraspinal denervation because the posterior rami leave at the root level.",
              "Preganglionic C5-6 lesion, possibly root avulsion: the arm is numb yet the SNAPs are normal, because the injury is proximal to the dorsal root ganglion, and paraspinal denervation places it at the roots."
            ),
            part(
              "Rider B",
              "Postganglionic (upper trunk) injury: absent SNAPs (axons distal to the ganglion degenerated) and normal paraspinals.",
              "Postganglionic, upper trunk: SNAPs are lost because the sensory axons beyond the ganglion degenerated, and normal paraspinals spare the roots."
            ),
            part(
              "Why it matters and further tests",
              "Explains that preganglionic (avulsion) injuries do not recover spontaneously and can't be grafted from the root, so early surgical referral is needed, while postganglionic injuries may recover or be repaired; suggests somatosensory evoked potentials (and imaging by the physician) to test central sensory continuity at the root.",
              "Avulsions don't regenerate and can't be repaired from the root, so Rider A needs early referral for nerve transfer planning; Rider B may recover or be grafted. Somatosensory evoked potentials can test whether the central sensory pathway from the root is intact, alongside the physician's imaging."
            ),
          ],
        },
      ],
    },
  ],
};
