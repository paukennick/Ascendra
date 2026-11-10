import type { LessonFix } from "../lib/lesson-fixes";

// REQ-187: the generated lessons the 2026-11-09 content audit found wrong
// (scratchpad findings: academic-prompts M2-M4, AWS M2/m2/m8, CompTIA C1,
// nursing m5/m6, PT M2/M4). Applied by scripts/lesson-fixes.ts through the
// app's own mechanisms (lib/lesson-fixes.ts). Each `expect` is text from the
// audited lesson, so a lesson regenerated since then is left alone.
//
// The audit numbered lessons from 0 in generated-lessons.json; the ids below
// keep that numbering.

const AWS_DX_HOSTED: { title: string; url: string; checkedAt: string } = {
  title: "AWS Direct Connect User Guide, Hosted connections",
  url: "https://docs.aws.amazon.com/directconnect/latest/UserGuide/hosted_connection.html",
  checkedAt: "2026-11-09",
};

export const LESSON_FIXES_2026_11_09: LessonFix[] = [
  // --- CMPCBS degree advising (academic M2, M3, M4). The keys depend on
  // invented course titles (GICE 290 is Cultural Anthropology; GICE 220 is
  // Intercultural Communication and Engagement; COMS 101 is Speech
  // Communication I) or teach "no double counting" against the plan's own
  // shared credit (CSIS 110, MATH 131). Voided; the objective then gets the
  // authored advising lesson (lib/degree-advising.ts).
  {
    id: "CMPCBS-7",
    track: "CMPCBS",
    objective: "Cultural Studies elective -- choose 3 credits from ARTS 105, CSTU 101, CSTU 220, GICE 290, GOVT 200, GOVT 220, MUSC 103, or RLGN 210",
    action: "void",
    note: "invented course titles (GICE 290 is Cultural Anthropology); the key depends on them",
    expect: ["New scenario, same idea: You need a course from this same list"],
  },
  {
    id: "CMPCBS-10",
    track: "CMPCBS",
    objective: "22 credits of free electives, any 100-400 level course not already required elsewhere in the plan",
    action: "void",
    note: "teaches 'no double counting', contradicting the plan's shared credit (CSIS 110, MATH 131); options mismatched",
    expect: ["Sam's plan requires 22 credits of free electives."],
  },
  {
    id: "CMPCBS-15",
    track: "CMPCBS",
    objective: "Communications elective -- choose 3 credits from COMS 101, BUSI 300, ENGR 270, or GICE 220",
    action: "void",
    note: "invented course titles (GICE 220 is Intercultural Communication and Engagement; COMS 101 is Speech Communication I)",
    expect: ["A different transfer student, Marcus, is a Computer Engineering major"],
  },

  // --- SECPLUS (CompTIA C1): the lesson calls technical/managerial/
  // operational/physical "control types" in its checks and the six
  // preventive...directive "functions". In SY0-701 the first four are
  // CATEGORIES and the six are control TYPES. The keys themselves are right
  // (directive; physical + preventive), so answers are kept and the wording
  // is corrected.
  {
    id: "SECPLUS-19",
    track: "SECPLUS",
    // The CompTIA fix (same audit, C1) rewords the objective; either title.
    objective: [
      "Security control types (technical, managerial, operational, physical) and control functions (preventive, detective, corrective, deterrent, compensating, directive)",
      "Security control categories (technical, managerial, operational, physical) and control types (preventive, deterrent, detective, corrective, compensating, directive)",
    ],
    action: "replace",
    note: "swapped 'control types' and 'categories' (SY0-701: categories are technical/managerial/operational/physical; types are preventive/deterrent/detective/corrective/compensating/directive)",
    expect: ["and FUNCTION (what the control DOES / its purpose)"],
    edits: [
      { find: "and FUNCTION (what the control DOES / its purpose)", replace: "and TYPE (what the control DOES / its purpose; some older materials call this its function)" },
      { find: "FUNCTIONS:", replace: "TYPES:" },
      { find: "name BOTH the category and function", replace: "name BOTH the category and the type" },
      { find: "Category tells you the mechanism; function tells you the purpose.", replace: "Category tells you the mechanism; type tells you the purpose." },
      { find: "FUNCTION depends on framing", replace: "TYPE depends on framing" },
      { find: "it's also directive in function", replace: "its type is also directive" },
      { find: "FUNCTION = preventive", replace: "TYPE = preventive" },
      { find: "FUNCTION = deterrent", replace: "TYPE = deterrent" },
      { find: "assuming category and function are the same thing", replace: "assuming category and type are the same thing" },
      { find: "This is a managerial control type, because", replace: "This is a managerial control category, because" },
      { find: "Now, by control FUNCTION, this specific example", replace: "Now, by control TYPE, this specific example" },
      { find: "State exactly which control function this is", replace: "State exactly which control type this is" },
      { find: "Identify BOTH the control type (technical, managerial, operational, or physical) and the control function (preventive, detective, corrective, deterrent, compensating, or directive)", replace: "Identify BOTH the control category (technical, managerial, operational, or physical) and the control type (preventive, detective, corrective, deterrent, compensating, or directive)" },
      { find: "Physical control type, because the lock", replace: "Physical control category, because the lock" },
      { find: "preventive function, because it stops", replace: "preventive control type, because it stops" },
      { find: "Technical control type, because it uses", replace: "Technical control category, because it uses" },
      { find: "detective function, because it logs", replace: "detective control type, because it logs" },
      { find: "Physical control type, because it's a door; corrective function", replace: "Physical control category, because it's a door; corrective control type" },
      { find: "Managerial control type, because badge policies", replace: "Managerial control category, because badge policies" },
      { find: "deterrent function, because it discourages", replace: "deterrent control type, because it discourages" },
      { find: "(physical type) that stops unauthorized entry before it occurs (preventive function)", replace: "(physical category) that stops unauthorized entry before it occurs (preventive type)" },
    ],
    sources: [
      { title: "Professor Messer, Security Controls - CompTIA Security+ SY0-701 - 1.1 (four control categories, six control types)", url: "https://professormesser.com/?p=630459", checkedAt: "2026-11-09" },
    ],
  },

  // --- NCLEX-RN (nursing m5): "Worked example from the prompt" leaks the
  // generation prompt and refers to patients the lesson never introduced.
  {
    id: "NCLEXRN-17",
    track: "NCLEXRN",
    objective: "Airway, breathing, circulation as a prioritisation frame, and where it stops helping",
    action: "replace",
    note: "prompt leakage: 'Worked example from the prompt' with patients never introduced",
    expect: ["Worked example from the prompt:"],
    edits: [
      {
        find: "Worked example from the prompt: the anxious patient",
        replace:
          "Worked example: a nurse has four patients -- one anxious, one in pain, one postictal (just after a seizure) and now breathing normally, and one with a new cough and an oxygen saturation of 90%. The anxious patient",
      },
    ],
    // Wording only: no clinical claim changes.
    editorial: true,
  },

  // --- MSHI (nursing m6): #21 typo; #22 "four disciplines" listing three,
  // and an overstated "a leading cause of medical errors".
  {
    id: "MSHI-21",
    track: "MSHI",
    objective: "The five informatics application areas -- translational bioinformatics, clinical research informatics, clinical informatics, consumer health informatics and population informatics -- and what separates them",
    action: "replace",
    note: "typo 'EHU' for EHR",
    expect: ["EHU-based sepsis alert"],
    edits: [{ find: "EHU-based sepsis alert", replace: "EHR-based sepsis alert" }],
    editorial: true,
  },
  {
    id: "MSHI-22",
    track: "MSHI",
    objective: "Clinical informatics across medicine, nursing, pharmacy and dentistry: informatics in the delivery of care",
    action: "replace",
    note: "says 'four disciplines' but lists three; overstates poor interoperability as 'a leading cause of medical errors'",
    expect: ["connecting four disciplines at the point of care"],
    edits: [
      { find: "connecting four disciplines at the point of care: medicine/dentistry (the prescriber)", replace: "connecting three professions at the point of care: the prescriber (medicine or dentistry)" },
      { find: "is a leading cause of medical errors, duplicated tests, and care fragmentation", replace: "contributes to delays, medical errors, duplicated tests and fragmented care" },
    ],
    sources: [
      { title: "AHRQ PSNet, Electronic Health Records primer (poor interoperability can result in delays; updated 2024-12-15)", url: "https://psnet.ahrq.gov/primer/electronic-health-records", checkedAt: "2026-11-09" },
    ],
  },

  // --- AWSSAP (AWS M2, m2): the Guided check had two defensible answers --
  // a second Direct Connect connection at another location is AWS's own
  // High Resiliency model -- so its answers are voided and the stem now rules
  // it out. The teaching text's connection speeds were out of date.
  {
    id: "AWSSAP-24",
    track: "AWSSAP",
    objective: "Connectivity for on-premises, co-location, and cloud integration: AWS Direct Connect and AWS VPN",
    action: "replace",
    note: "Guided check had two defensible answers (second DX at another location = AWS High Resiliency); hosted speeds now 50 Mbps-25 Gbps; dedicated ports include 400 Gbps; large-bandwidth VPN tunnels reach 5 Gbps",
    expect: ["a sub-1Gbps-to-10Gbps slice of their own dedicated connection", "Budget allows for one additional network path, but it must come up almost instantly if Direct Connect fails."],
    voidChecks: ["fade"],
    edits: [
      { find: "a physical port, 1/10/100 Gbps, exclusive to you", replace: "a physical port of 1, 10, 100 or 400 Gbps, exclusive to you" },
      { find: "a sub-1Gbps-to-10Gbps slice of their own dedicated connection", replace: "a slice of their own connection, from 50 Mbps up to 25 Gbps (1 Gbps and above only from qualifying partners; 25 Gbps only where 100 Gbps ports exist)" },
      { find: "bandwidth is capped (~1.25 Gbps per tunnel)", replace: "bandwidth is capped (up to 1.25 Gbps per standard tunnel, or up to 5 Gbps per large-bandwidth tunnel)" },
      {
        find: "Budget allows for one additional network path, but it must come up almost instantly if Direct Connect fails.",
        replace:
          "Budget rules out a second Direct Connect connection, and the new path must be working within days, not the weeks a new Direct Connect circuit can take to provision; it must also take over automatically if Direct Connect fails.",
      },
      {
        find: "a second Direct Connect connection would not protect against the Direct Connect location itself failing unless it's a second location, and VIF/VPC-peering changes",
        replace:
          "a second Direct Connect connection at another location is AWS's own high-resiliency design, but this budget and timeline rule it out, and VIF/VPC-peering changes",
      },
    ],
    set: {
      fadeOptionReasons: [
        "Ruled out here: a second Direct Connect connection at a different location is AWS's documented high-resiliency model, but the stem excludes it on budget and provisioning time.",
        "Right: a Site-to-Site VPN to the same gateway is quick to provision, runs over separate infrastructure, and BGP prefers Direct Connect and fails over to the VPN automatically.",
        "A second private VIF rides the same physical connection and location, so it fails with them.",
        "VPC peering does not give on-premises traffic another way into AWS when the Direct Connect connection is down.",
      ],
    },
    sources: [
      AWS_DX_HOSTED,
      { title: "AWS Direct Connect User Guide, Dedicated connections", url: "https://docs.aws.amazon.com/directconnect/latest/UserGuide/dedicated_connection.html", checkedAt: "2026-11-09" },
      { title: "AWS Site-to-Site VPN quotas", url: "https://docs.aws.amazon.com/vpn/latest/s2svpn/vpn-limits.html", checkedAt: "2026-11-09" },
    ],
  },

  // --- AWSAIF (AWS m8): 1,200 tokens in 300-token chunks with a 50-token
  // overlap is 5 chunks (they start at 0, 250, 500, 750 and 1,000), not 4.
  // The key (cosine similarity) is unaffected; answers are kept.
  {
    id: "AWSAIF-13",
    track: "AWSAIF",
    objective: "Tokens, chunking, embeddings, and vectors",
    action: "replace",
    note: "chunk count: 1,200 tokens in 300-token chunks with 50-token overlap is 5 chunks, not 4",
    expect: ["Chunk it into pieces of 300 tokens each with 50-token overlap, producing 4 chunks."],
    edits: [
      {
        find: "Chunk it into pieces of 300 tokens each with 50-token overlap, producing 4 chunks.",
        replace: "Chunk it into pieces of 300 tokens each with 50-token overlap, producing 5 chunks (each starts 250 tokens after the last: at tokens 0, 250, 500, 750 and 1,000).",
      },
      { find: "Each of the 4 chunks is passed through an embedding model, producing 4 vectors", replace: "Each of the 5 chunks is passed through an embedding model, producing 5 vectors" },
      { find: "given Q and the 4 stored chunk vectors", replace: "given Q and the 5 stored chunk vectors" },
      { find: "Average all 4 stored chunk vectors together", replace: "Average all 5 stored chunk vectors together" },
    ],
    // Arithmetic only, recomputed: chunk starts 0, 250, 500, 750, 1000 (the
    // last runs 1000-1200), so 5 chunks.
    editorial: true,
  },

  // --- ABPTSECS (PT M2): Lambert-Eaton does NOT have a normal resting
  // amplitude. Its resting CMAP is low; it decrements at 2-3 Hz and
  // increments (classically >= 100%) after high-frequency stimulation or
  // about 10 seconds of maximal exercise. The checks (demyelination; MG
  // decrement) are right; answers are kept.
  {
    id: "ABPTSECS-20",
    track: "ABPTSECS",
    objective: "Neuroscience of axonal conduction, demyelination and the neuromuscular junction",
    action: "replace",
    note: "Lambert-Eaton resting CMAP is low, not normal; stimulation frequencies added",
    expect: ["show normal conduction velocity and normal single-fiber amplitude at rest, but abnormal repetitive nerve stimulation"],
    edits: [
      {
        find:
          "show normal conduction velocity and normal single-fiber amplitude at rest, but abnormal repetitive nerve stimulation: a decremental response (amplitude drops with repeated stimulation) in myasthenia gravis because fewer receptors are available to reach threshold as ACh stores are mildly depleted, versus an incremental response in Lambert-Eaton because repeated stimulation drives more calcium into the terminal, boosting ACh release.",
        replace:
          "show normal conduction velocity but abnormal repetitive nerve stimulation. In myasthenia gravis the resting compound muscle action potential (CMAP) is usually normal and slow stimulation at 2-3 Hz gives a decremental response (amplitude drops over the train) because fewer receptors are available to reach threshold as ACh stores are mildly depleted. Lambert-Eaton differs at rest: the resting CMAP amplitude is LOW. It also decrements at 2-3 Hz, but after high-frequency stimulation (30-50 Hz) or about 10 seconds of maximal voluntary exercise the CMAP increments markedly (classically by 100% or more), because repeated firing drives more calcium into the terminal and boosts ACh release.",
      },
    ],
    sources: [
      { title: "Varon M, Dimachkie MM. Diagnosis and Treatment of Lambert-Eaton Myasthenic Syndrome. Practical Neurology, April 2024", url: "https://practicalneurology.com/articles/2024-apr/diagnosis-and-treatment-of-lambert-eaton-myasthenic-syndrome", checkedAt: "2026-11-09" },
    ],
  },

  // --- ABPTSGCS (PT M4): 220 minus age UNDERESTIMATES maximum heart rate in
  // older adults (Tanaka 2001: HRmax = 208 - 0.7 x age). The worked example
  // said it overestimates, and the Solo check's explanation rested on that,
  // with a stem whose reasoning did not hold. The Solo check is replaced and
  // its answers voided; the Guided check (healing) is right and kept.
  {
    id: "ABPTSGCS-27",
    track: "ABPTSGCS",
    objective: "Physiology of ageing across systems and how it changes normal values, exercise response and healing",
    action: "replace",
    note: "220-minus-age underestimates (not overestimates) HRmax in older adults (Tanaka 2001); Solo check's reasoning was shaky",
    expect: ["Because age-predicted maximum heart rate overestimates her true reserve"],
    voidChecks: ["solo"],
    edits: [
      {
        find: "Because age-predicted maximum heart rate overestimates her true reserve, you set her training intensity",
        replace:
          "Because 220 minus age is a poor predictor in older adults -- it tends to underestimate their measured maximum (Tanaka's 208 minus 0.7 times age gives about 152 at 80), and individuals vary widely -- you set her training intensity",
      },
    ],
    set: {
      soloCheck:
        "A 79-year-old man with no known heart disease, taking no heart-rate-lowering medication, is starting a walking program. You want to set his aerobic training intensity from heart rate. Which approach best fits what is known about predicting maximum heart rate in older adults?",
      soloChoices: [
        "Heart rate reserve from a better-validated predicted maximum (e.g. 208 - 0.7 x age), checked against perceived exertion",
        "70% of 220 minus age on its own, since that formula was derived mainly from adults over 70",
        "Walking speed alone, since heart rate stops rising with exercise in healthy adults after about age 75",
        "220 minus age plus a 10% margin, since that formula overestimates maximum heart rate after age 70",
      ],
      soloCorrectIndex: 0,
      soloWhy:
        "220 minus age tends to underestimate maximum heart rate in older adults (Tanaka 2001), so intensity is better set by heart rate reserve from a better-validated estimate, checked against perceived exertion.",
      soloOptionReasons: [
        "Right: 220 minus age tends to underestimate maximum heart rate in older adults and individual spread is wide, so a reserve method from a better estimate, checked with perceived exertion, is safer.",
        "220 minus age was not derived from older adults and tends to underestimate their maximum, and a single percentage of it ignores resting heart rate.",
        "Heart rate still rises with exercise in healthy older adults; the maximum declines with age, but the response is not abolished.",
        "The error runs the other way: 220 minus age tends to underestimate maximum heart rate in older adults, and a fixed added margin is not a validated method.",
      ],
    },
    sources: [
      { title: "Tanaka H, Monahan KD, Seals DR. Age-predicted maximal heart rate revisited. J Am Coll Cardiol 2001;37(1):153-156", url: "https://pubmed.ncbi.nlm.nih.gov/11153730/", checkedAt: "2026-11-09" },
    ],
  },
];
