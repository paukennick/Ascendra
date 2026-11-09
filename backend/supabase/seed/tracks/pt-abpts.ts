// ABPTS board-certified clinical specialist certifications (Strand 3 of
// docs/catalog-backlog.md, REQ-081). Ten specialties, each a separate
// proctored examination with its own published content outline on
// ABPTS's own site (specialization.apta.org), every one fetched and read
// on 2026-10-08 -- not a third-party summary.
//
// Modeling: a real, proctored, scored vendor examination that the body
// never gives an exam code -- the same shape as Google Cloud's
// certifications, so credential_basis 'vendor_exam_unpublished_code'
// (migration 016/017) and examCode left unset rather than invented.
//
// What ABPTS publishes for every specialty (exam-development and exam-
// resources pages): approximately 200 four-option multiple-choice items,
// standalone or case-based, delivered by PSI in four 50-question blocks of
// up to 90 minutes each; scaled scoring, criterion-referenced, passing
// score 500. Eligibility (minimum-requirements page): a current
// unrestricted US PT licence plus either 2,000 hours of direct patient
// care in the specialty within the last 10 years (500 of them in the last
// 3) or completion of an ABPTRFE-accredited residency within 10 years,
// plus per-specialty extras noted on each track.
//
// Weights below are the outline's own percentages. Where an outline gives
// learning-domain percentages AND a separate body-region or condition
// table (Orthopaedics, Pelvic & Women's Health, Cardiovascular &
// Pulmonary), the learning domains are the weighted units and the
// region/condition table is folded into objectives, since only one axis
// can carry the weight.
//
// Not built: Primary Care -- approved by the APTA House of Delegates in
// 2025, but its own page says the first exam "is expected to be
// administered in 2028 or 2029" and the DSP is "Coming Soon". Nothing to
// author yet; see the BLOCKED note in docs/catalog-backlog.md.
//
// Objectives are written in our own words from each outline's domains and
// condition lists -- deliberately not copied.
//
// ---------------------------------------------------------------------------
// Depth added 2026-11-04: sources, tiers and disagreements (all ten tracks).
//
// What changed: new objectives were appended to the END of existing units
// only, each block after an "Added 2026-11-04" marker and each objective with
// an inline source tag. No unit, weight, rangeLabel, gate or earlier
// objective was touched, and no unit was added. The ten outline pages were
// fetched again on 2026-11-04; every percentage still matches the unit
// weights above, so nothing about weighting changed.
//
// Scope versus depth (same split as ccrn.ts and nursing.ts): each track's
// ABPTS outline page decides whether a topic belongs (its domains and its
// condition list); guidelines and textbooks supply the facts. The DSP
// itself (the outline says Chapter 2 holds the detailed objectives) is sold
// through the APTA Store and given free only to accepted applicants, so it
// was NOT opened; nothing here claims to reflect DSP content.
//
// Standard followed: docs/source-reliability-standard.md (adopted
// 2026-10-31). Every number, test name, drug and named condition in a new
// objective was checked by script against the extracted text of the source
// its tag cites; the extracted text is kept in the session scratchpad.
//
// Tier 1 (credentialing body; current professional-society guidelines).
// Full text read through the Europe PMC fullTextXML service, accessed
// 2026-11-04. Licences as stated in each article; facts only, no wording.
//   - ABPTS, "Specialist Certification Examination Outline" pages for all
//     ten specialties, specialization.apta.org (URLs on each track below).
//     Accessed 2026-11-04. Copyright APTA. Scope only.
//   TKA-CPG   APTA, "Clinical practice guideline for physical therapist
//             management of total knee arthroplasty: revision 2026", Phys
//             Ther 2026, doi:10.1093/ptj/pzag058, PMC13403188
//             (https://pmc.ncbi.nlm.nih.gov/articles/PMC13403188/). CC BY-NC 4.0.
//             Replaces the earlier TKA guideline.
//   GHOA-CPG  APTA, "Physical Therapist Management of Glenohumeral Joint
//             Osteoarthritis: A Clinical Practice Guideline", Phys Ther 2023,
//             doi:10.1093/ptj/pzad041, PMC10256270
//             (https://pmc.ncbi.nlm.nih.gov/articles/PMC10256270/). CC BY-NC 4.0.
//   AAOS-ACL  AAOS, "Clinical Practice Guideline Summary: Management of
//             Anterior Cruciate Ligament Injuries", J Am Acad Orthop Surg
//             2023, doi:10.5435/JAAOS-D-22-01020, PMC10168113
//             (https://pmc.ncbi.nlm.nih.gov/articles/PMC10168113/). CC BY-NC-ND
//             4.0. Professional-society guideline (orthopaedic surgeons).
//   DFU-CPG   APTA Academy of Clinical Electrophysiology and Wound
//             Management, "Diabetic Foot Ulcer Beyond Wound Closure:
//             Clinical Practice Guideline" (Wendland et al.), Phys Ther
//             2025 (online 2024-11),
//             doi:10.1093/ptj/pzae171, PMC11962593
//             (https://pmc.ncbi.nlm.nih.gov/articles/PMC11962593/). CC BY-NC 4.0.
//   LYMDX-CPG APTA Oncology Section, "Diagnosis of Upper Quadrant Lymphedema
//             Secondary to Cancer", Phys Ther 2017, doi:10.1093/ptj/pzx050,
//             PMC5803775
//             (https://pmc.ncbi.nlm.nih.gov/articles/PMC5803775/). CC BY-NC 4.0. Older than 5 years; no later APTA
//             edition was found, but the search service was failing (HTTP
//             503) during the final re-check, so this is unconfirmed.
//   BCRL-CPG  APTA Academy of Oncologic PT, "Interventions for Breast
//             Cancer-Related Lymphedema", Phys Ther 2020,
//             doi:10.1093/ptj/pzaa087, PMC7412854
//             (https://pmc.ncbi.nlm.nih.gov/articles/PMC7412854/). CC BY-NC 4.0.
//   CRF-CPG   "Screening and Assessment of Cancer-Related Fatigue: A Clinical
//             Practice Guideline for Health Care Providers", Phys Ther 2022,
//             doi:10.1093/ptj/pzac120, PMC9525018
//             (https://pmc.ncbi.nlm.nih.gov/articles/PMC9525018/). CC BY-NC 4.0. A 2024
//             correction notice exists; the corrected tool list was not
//             separately opened.
//   WFG       Montero-Odasso et al., "World guidelines for falls prevention
//             and management for older adults: a global initiative", Age
//             Ageing 2022, doi:10.1093/ageing/afac205, PMC9523684
//             (https://pmc.ncbi.nlm.nih.gov/articles/PMC9523684/).
//             CC BY-NC 4.0.
//   FRID      van der Velde et al. (World Falls Guidelines working group
//             with EuGMS), "European position paper on polypharmacy and
//             fall-risk-increasing drugs", Eur Geriatr Med 2023,
//             doi:10.1007/s41999-023-00824-8, PMC10447263
//             (https://pmc.ncbi.nlm.nih.gov/articles/PMC10447263/). CC BY 4.0.
//   OSTEO-CPG APTA Academy of Geriatric PT, "Physical Therapist Management
//             of Patients With Suspected or Confirmed Osteoporosis" (Hartley
//             et al., adapted from SIGN), J Geriatr Phys Ther 2022,
//             doi:10.1519/JPT.0000000000000346, PMC8983944
//             (https://pmc.ncbi.nlm.nih.gov/articles/PMC8983944/). CC BY-NC-ND 4.0.
//   CORE-CPG  Moore et al., "A Core Set of Outcome Measures for Adults With
//             Neurologic Conditions Undergoing Rehabilitation", JNPT 2018,
//             doi:10.1097/NPT.0000000000000229, PMC6023606
//             (https://pmc.ncbi.nlm.nih.gov/articles/PMC6023606/). CC BY-NC-ND 4.0.
//             Older than 5 years; still the APTA academy's core-set
//             guideline as far as was found.
//   PD-CPG    Osborne et al., "Physical Therapist Management of Parkinson
//             Disease: A Clinical Practice Guideline From the APTA", Phys
//             Ther 2022, doi:10.1093/ptj/pzab302, PMC9046970
//             (https://pmc.ncbi.nlm.nih.gov/articles/PMC9046970/). CC BY-NC 4.0.
//   VEST-CPG  Hall et al., "Vestibular Rehabilitation for Peripheral
//             Vestibular Hypofunction: An Updated Clinical Practice
//             Guideline", JNPT 2022, doi:10.1097/NPT.0000000000000382,
//             PMC8920012
//             (https://pmc.ncbi.nlm.nih.gov/articles/PMC8920012/). CC BY-NC-ND 4.0. Supersedes the 2016 edition.
//
// Tier 2: StatPearls (StatPearls Publishing, NCBI Bookshelf), CC BY-NC-ND
// 4.0, so facts and topic scope only, no wording. Graded against the five
// criteria: (1) every chapter names its authors and their institutions in
// its metadata; author credentials and (2) editorial peer review are taken
// from the standard itself, which names StatPearls as meeting the bar (no
// peer-review statement was found in the archive XML); (3) NCBI Bookshelf;
// (4) every chapter cited is dated, and only chapters updated on or after
// 2021-11-05 (within 5 years) and not marked "(Archived)" were used; (5)
// the chapters are clinical reviews, not marketing for any test or vendor
// (each carries a disclaimer telling readers to verify content). Bookshelf pages returned a captcha to scripted access,
// so the text was read from NCBI's literature-archive FTP snapshot
// (ftp.ncbi.nlm.nih.gov/pub/litarch, statpearls_NBK430685.tar.gz, dated
// 2026-10-25), accessed 2026-11-04. Each chapter is identified below by its
// title, first author, update date and archive article ID; chapters are
// found on Bookshelf by title under https://www.ncbi.nlm.nih.gov/books/
// NBK430685/. Per-chapter NBK numbers could not be looked up (the Europe
// PMC search service returned HTTP 503 throughout).
//
// Not used as sole support for anything: Physiopedia, test-prep sites,
// blogs. JOSPT guidelines (neck pain, low back pain, ankle sprain, ACL,
// concussion and others) could not be opened -- jospt.org returned HTTP 403
// to the one guideline URL tried, and a Europe PMC search for JOSPT
// guidelines with free full text returned none -- so the
// orthopaedic and sports additions rest on StatPearls (Tier 2) plus the
// open APTA and AAOS guidelines above. The NATA position statements found
// (heat illness, emergency action plans) were not open-access full text and
// were not used. The ACSM 2019 exercise-for-cancer-survivors roundtable was
// not open-access and was not used. The DSPs were not opened (see above).
//
// Disagreements and how they were resolved:
//   - Ankle-brachial index normal range: the ABI chapter gives 0.9-1.4, the
//     venous leg ulcer chapter 1.0-1.3, the diabetic foot chapter "PAD less
//     likely" at 0.9-1.3. No Tier 1 guideline on file settles it (the AHA
//     PAD guideline was never reached: the search for it returned HTTP 503),
//     so no ABI normal range appears; the
//     objectives name only the measurement method, the falsely-high reading
//     in calcified vessels, and two thresholds the sources share for poor
//     healing or no compression (ABI or ABPI below 0.5).
//   - Falls risk tests: the World Falls Guidelines (Tier 1) prefer gait
//     speed below 0.8 m/s and treat TUG over 15 s as a weaker alternative
//     whose evidence for risk stratification is mixed. Followed and named
//     them; no gait-speed or TUG cut-off from any other source was used.
//   - Arterial blood gases: nursing.ts already records that two textbooks
//     disagree on the bicarbonate range with no Tier 1 source to settle it.
//     The Cardiovascular & Pulmonary objective therefore names only pH
//     7.35-7.45 and PaCO2 35-45 mm Hg, matching nursing.ts; no HCO3 or PaO2
//     range appears.
//   - Oxygen-saturation targets (92-98%, 88-92% in chronic hypercapnia) rest
//     on the Oxygen Therapy chapter alone; no Tier 1 source was opened for
//     them and none of the files on hand contradict them.
//   - Exercise in pregnancy: the Pregnancy and Exercise chapter (2023) gives
//     150 minutes a week; ACOG's own opinion was not opened. Kept as a
//     StatPearls figure; no conflicting source on file.
//   - Heart-failure classes: StatPearls summarises the 2022 ACC/AHA
//     guideline (HFrEF 40% or less, 41-49% mildly reduced, 50% or more
//     preserved); the guideline itself was not opened, which the objective
//     says ("as summarized in StatPearls").
//   - Low back pain red flags: the LBP chapter notes a 40-study review found
//     single red flags have limited accuracy. The objective lists red flags
//     as screening prompts, not diagnostic tests, consistent with that.
//   - Patellofemoral pain and hip abductor weakness: the chapter reports
//     mixed evidence; the objective says so instead of stating a cause.
//   - Mononucleosis return to contact sport: the chapter says 4 weeks after
//     symptom onset if recovered; no Tier 1 sports-medicine source was
//     opened, and no number from another source conflicts.
//
// Inline tag key: Tier 1 tags as listed above; SP-xxx = StatPearls chapter
// in the list below. Where an objective carries two tags, both were checked.
//
// StatPearls chapters cited (tag, title, first author, update date,
// literature-archive article ID):
//   SP-6MWT     Six-Minute Walk Test (Matos Casano et al.), updated 2025-07-07 [article-132843]
//   SP-AAS      Anabolic Steroids (Leslie et al.), updated 2025-02-06 [article-17499]
//   SP-ABG      Arterial Blood Gas Analysis: Fundamentals, Interpretation, and Clinical Utility (Castro et al.), updated 2026-07-05 [article-17837]
//   SP-ACH      Achilles Tendinopathy (Medina Pabon et al.), updated 2026-06-08 [article-17086]
//   SP-ACL      Anterior Cruciate Ligament Knee Injury (Evans et al.), updated 2023-11-17 [article-23925]
//   SP-AD       Autonomic Dysreflexia (Bilgin Badur et al.), updated 2025-06-02 [article-18031]
//   SP-ADH      Adhesive Capsulitis (Frozen Shoulder) (Li et al.), updated 2025-03-28 [article-17206]
//   SP-AIS      Adolescent Idiopathic Scoliosis (Menger et al.), updated 2023-04-03 [article-686]
//   SP-ANK      Acute Ankle Sprain (Bergman et al.), updated 2025-08-02 [article-17600]
//   SP-ANTH     Anthracycline Toxicity (Johnson et al.), updated 2024-01-09 [article-149331]
//   SP-APH      Aphasia (Le et al.), updated 2024-10-29 [article-43129]
//   SP-ASA      Abnormal Spontaneous Electromyographic Activity (Davalos et al.), updated 2025-09-15 [article-19794]
//   SP-ATEL     Atelectasis (Grott et al.), updated 2024-02-26 [article-17940]
//   SP-BM       Bone Metastasis (Jayarangaiah et al.), updated 2023-07-31 [article-18450]
//   SP-BPPV     Benign Paroxysmal Positional Vertigo (Koshi et al.), updated 2025-11-30 [article-38044]
//   SP-BURN     Burn Classification (Warby et al.), updated 2023-09-26 [article-18714]
//   SP-CABG     Coronary Artery Bypass Graft (Bachar et al.), updated 2023-08-08 [article-20007]
//   SP-CACH     Anorexia and Cachexia (Daley et al.), updated 2025-01-19 [article-35903]
//   SP-CALC     Calciphylaxis (Westphal et al.), updated 2023-08-08 [article-18769]
//   SP-CC       Commotio Cordis (Tainter et al.), updated 2023-02-05 [article-19761]
//   SP-CER      Cerebellar Dysfunction (Ataullah et al.), updated 2024-05-06 [article-19161]
//   SP-CF       Cystic Fibrosis (Sankari et al.), updated 2024-12-11 [article-20211]
//   SP-CIDP     Chronic Inflammatory Demyelinating Polyradiculoneuropathy (Gogia et al.), updated 2024-03-04 [article-119994]
//   SP-CMY      Cervical Myelopathy (Margetis et al.), updated 2025-08-02 [article-25450]
//   SP-CON      Constipation (Diaz et al.), updated 2023-11-12 [article-19913]
//   SP-CONC     Concussion (Ferry et al.), updated 2023-01-09 [article-42922]
//   SP-COPD     Chronic Obstructive Pulmonary Disease (COPD) (Kanchustambham et al.), updated 2026-04-15 [article-26083]
//   SP-CP       Cerebral Palsy (Hallman-Cooper et al.), updated 2024-02-24 [article-19188]
//   SP-CPP      Chronic Pelvic Pain (Dydyk et al.), updated 2025-05-02 [article-26872]
//   SP-CR       Cardiac Rehabilitation (Tessler et al.), updated 2025-03-28 [article-18899]
//   SP-CRAD     Cervical Radiculopathy (Margetis et al.), updated 2025-08-06 [article-19244]
//   SP-CTS      Carpal Tunnel Syndrome (Sevy et al.), updated 2023-10-29 [article-18982]
//   SP-DCD      Developmental Coordination Disorder (Dyspraxia) (Castellucci et al.), updated 2024-02-24 [article-148754]
//   SP-DDH      Developmental Dysplasia of the Hip (Nandhagopal et al.), updated 2024-05-04 [article-22896]
//   SP-DEB      Wound Debridement (Manna et al.), updated 2023-04-19 [article-34501]
//   SP-DEL      Delirium (Ramirez Echeverria et al.), updated 2026-01-10 [article-20325]
//   SP-DEVM     Developmental Milestones (Boehning et al.), updated 2026-09-13 [article-20416]
//   SP-DFU      Diabetic Foot Ulceration and Complications (Srinivas-Shankar et al.), updated 2026-03-22 [article-20448]
//   SP-DMD      Duchenne Muscular Dystrophy (Venugopal et al.), updated 2023-07-10 [article-20747]
//   SP-DRA      Diastasis Recti Rehabilitation (Hall et al.), updated 2023-08-08 [article-132839]
//   SP-DRESS    Wound Dressings (Britto et al.), updated 2024-01-23 [article-34504]
//   SP-DS       Down Syndrome (Pal et al.), updated 2026-02-20 [article-20693]
//   SP-DVT      Deep Venous Thrombosis (Waheed et al.), updated 2023-01-19 [article-20298]
//   SP-DYSP     Dyspareunia (Carlson et al.), updated 2026-01-10 [article-101958]
//   SP-EA       Elder Abuse (Jandu et al.), updated 2024-10-06 [article-20957]
//   SP-EAH      Exercise-Associated Hyponatremia (Buck et al.), updated 2023-06-12 [article-133173]
//   SP-EDX-AIDP Electrodiagnostic Evaluation of Acute Inflammatory Demyelinating Polyneuropathy (Huynh et al.), updated 2022-09-26 [article-115847]
//   SP-EDX-BP   Electrodiagnostic Evaluation of Brachial Plexopathies (Cooper et al.), updated 2026-04-12 [article-115841]
//   SP-EDX-CR   Electrodiagnostic Evaluation of Cervical Radiculopathy (Sarwan et al.), updated 2023-08-23 [article-115842]
//   SP-EDX-CTS  Electrodiagnostic Evaluation of Carpal Tunnel Syndrome (Rosario et al.), updated 2023-08-23 [article-115838]
//   SP-EDX-MYO  Electrodiagnostic Evaluation of Myopathy (Shanina et al.), updated 2026-09-14 [article-115846]
//   SP-EDX-NMJ  Electrodiagnostic Evaluation of Neuromuscular Junction Disorder (Patel et al.), updated 2022-12-11 [article-115849]
//   SP-EDX-PER  Electrodiagnostic Evaluation of Peroneal Neuropathy (Thatte et al.), updated 2023-08-23 [article-115844]
//   SP-EDX-UN   Electrodiagnostic Evaluation of Ulnar Neuropathy (Bains et al.), updated 2022-10-17 [article-115839]
//   SP-EIB      Exercise-Induced Bronchoconstriction (Goldin et al.), updated 2025-06-02 [article-17925]
//   SP-ERB      Erb Palsy (Bisht et al.), updated 2026-06-22 [article-21278]
//   SP-FAI      Femoroacetabular Impingement (O'Rourke et al.), updated 2023-06-26 [article-37128]
//   SP-FAT      Female Athlete Triad (Raj et al.), updated 2023-08-08 [article-21672]
//   SP-FI       Fecal Incontinence (Shah et al.), updated 2025-12-16 [article-21655]
//   SP-FN       Febrile Neutropenia (Punnapuzha et al.), updated 2023-03-30 [article-65103]
//   SP-GBS      Guillain-Barre Syndrome (Bhatti et al.), updated 2026-01-31 [article-22461]
//   SP-GCS      Glasgow Coma Scale (Munakomi et al.), updated 2026-06-17 [article-22258]
//   SP-HAM      Hamstring Injury (Poudel et al.), updated 2023-08-08 [article-22513]
//   SP-HF       Heart Failure (Congestive Heart Failure) (Shams et al.), updated 2025-02-26 [article-22661]
//   SP-HS       Heat Stroke (Morris et al.), updated 2023-02-13 [article-22672]
//   SP-IABP     Intra-Aortic Balloon Pump (Khan et al.), updated 2023-04-24 [article-23676]
//   SP-IC       Interstitial Cystitis/Bladder Pain Syndrome (Lim et al.), updated 2024-10-07 [article-132252]
//   SP-IWH      Impaired Wound Healing (Wernick et al.), updated 2023-08-28 [article-23409]
//   SP-JIA      Juvenile Idiopathic Arthritis (Esteban et al.), updated 2026-09-13 [article-23835]
//   SP-KEG      Kegel Exercises (Huang et al.), updated 2023-05-01 [article-23850]
//   SP-LBP      Low Back Pain: Evaluation and Management (Margetis et al.), updated 2025-12-13 [article-18089]
//   SP-LCP      Legg-Calve-Perthes Disease (Sabry et al.), updated 2026-03-25 [article-24174]
//   SP-LE       Lateral Epicondylitis (Tennis Elbow) (Buchanan et al.), updated 2023-08-04 [article-29949]
//   SP-LEMS     Lambert-Eaton Myasthenic Syndrome (Jayarangaiah et al.), updated 2023-10-23 [article-24011]
//   SP-LLE      Medial Epicondyle Apophysitis (Little League Elbow) (Hodge et al.), updated 2023-03-27 [article-131176]
//   SP-LSS      Lumbar Spinal Stenosis (Munakomi et al.), updated 2024-01-30 [article-24463]
//   SP-LVAD     Left Ventricular Assist Devices (Vaidya et al.), updated 2026-05-07 [article-24538]
//   SP-LYM      Lymphedema (Nimmana et al.), updated 2025-10-18 [article-24565]
//   SP-MMC      Myelomeningocele (Karsonovich et al.), updated 2024-11-21 [article-25448]
//   SP-MONO     Mononucleosis (Mohseni et al.), updated 2026-06-17 [article-25253]
//   SP-MS       Multiple Sclerosis (Tafti et al.), updated 2024-03-20 [article-25363]
//   SP-MTSS     Medial Tibial Stress Syndrome (Larson et al.), updated 2025-12-30 [article-42693]
//   SP-NCS      Nerve Conduction Studies and Electromyography (Ramani et al.), updated 2025-02-10 [article-151186]
//   SP-NIPAD    Noninvasive Physiologic Testing for Peripheral Arterial Disease (Montemayor et al.), updated 2026-06-10 [article-127284]
//   SP-NPWT     Negative Pressure Wound Therapy (Zaver et al.), updated 2026-02-21 [article-141836]
//   SP-O2       Oxygen Therapy (Weekley et al.), updated 2025-01-22 [article-694]
//   SP-OH       Orthostatic Hypotension (Ringer et al.), updated 2025-01-17 [article-26349]
//   SP-OSG      Osgood-Schlatter Disease (Smith et al.), updated 2023-08-04 [article-26359]
//   SP-OSTF     Osteoporosis in Females (Keen et al.), updated 2025-06-29 [article-38850]
//   SP-PAD      Peripheral Arterial Disease (Zemaitis et al.), updated 2026-01-31 [article-27004]
//   SP-PATHFX   Pathologic Fractures (Rizzo et al.), updated 2023-05-22 [article-96562]
//   SP-PD       Parkinson Disease (Zafar et al.), updated 2025-09-15 [article-26674]
//   SP-PFP      Patellofemoral Syndrome (Bump et al.), updated 2023-02-13 [article-26731]
//   SP-PFT      Pulmonary Function Tests (Ponce et al.), updated 2023-08-28 [article-28030]
//   SP-PG       Pyoderma Gangrenosum (Schmieder et al.), updated 2023-07-04 [article-28102]
//   SP-PH       Pulmonary Hypertension (Manek et al.), updated 2024-05-01 [article-28033]
//   SP-PI       Pressure Injury (Zaidi et al.), updated 2026-07-05 [article-20286]
//   SP-PLAG     Plagiocephaly (Unnithan et al.), updated 2025-12-13 [article-126820]
//   SP-PLF      Plantar Fasciitis (Buchanan et al.), updated 2024-01-07 [article-27289]
//   SP-PLT      Thrombocytopenia (Jinna et al.), updated 2025-12-01 [article-30093]
//   SP-PN       Pudendal Neuralgia (Leslie et al.), updated 2024-02-12 [article-40740]
//   SP-PNI      Peripheral Nerve Injury (Nadi et al.), updated 2026-02-15 [article-25742]
//   SP-POLY     Polypharmacy (Varghese et al.), updated 2024-02-12 [article-27419]
//   SP-POP      Pelvic Organ Prolapse (Kuo et al.), updated 2025-09-21 [article-26869]
//   SP-PPE      Sports Participation Evaluation (Farzam et al.), updated 2024-02-12 [article-29408]
//   SP-PR       Pulmonary Rehabilitation (Shenoy et al.), updated 2023-07-25 [article-111482]
//   SP-PREG     Pregnancy and Exercise (Cooper et al.), updated 2023-04-17 [article-27634]
//   SP-RNS      Repetitive Nerve Stimulation (Datta et al.), updated 2023-07-15 [article-143432]
//   SP-SARC     Sarcopenia (Ardeljan et al.), updated 2023-07-04 [article-107988]
//   SP-SCC      Spinal Cord Compression (Singleton et al.), updated 2023-02-13 [article-29311]
//   SP-SCFE     Slipped Capital Femoral Epiphysis (Johns et al.), updated 2023-07-25 [article-29145]
//   SP-SCI      Spinal Cord Injuries (Margetis et al.), updated 2025-06-02 [article-29326]
//   SP-SCT      Sickle Cell Trait (Ashorobi et al.), updated 2024-02-25 [article-29017]
//   SP-SDA      Sudden Death in Athletes (Farzam et al.), updated 2026-09-14 [article-29656]
//   SP-SEV      Sever Disease (Calcaneal Apophysitis) (Smith et al.), updated 2024-01-11 [article-28936]
//   SP-SF       Stress Fractures (May et al.), updated 2023-07-10 [article-21951]
//   SP-SIS      Shoulder Impingement Syndrome (Creech et al.), updated 2026-01-10 [article-28996]
//   SP-SPAS     Spasticity (Winkle et al.), updated 2026-02-22 [article-29252]
//   SP-SPL      Spondylolisthesis (Margetis et al.), updated 2025-03-28 [article-29394]
//   SP-SUI      Stress Urinary Incontinence (Lugo et al.), updated 2024-08-31 [article-29543]
//   SP-TMD      Temporomandibular Syndrome (Maini et al.), updated 2023-01-30 [article-29937]
//   SP-TOS      Thoracic Outlet Syndrome (Kaplan et al.), updated 2023-04-10 [article-30073]
//   SP-TRIS     Trismus (Santiago-Rosado et al.), updated 2022-10-27 [article-30622]
//   SP-UI       Urinary Incontinence (Leslie et al.), updated 2024-08-11 [article-30850]
//   SP-VAD      Vertebral Artery Dissection (Tavakoli et al.), updated 2025-04-06 [article-20605]
//   SP-VLU      Venous Leg Ulcer (Robles-Tenorio et al.), updated 2026-06-17 [article-31064]
//   SP-WHP      Physiology, Wound Healing (Ozgok Kangal et al.), updated 2025-04-04 [article-31402]
//   SP-WHPH     Wound Healing Phases (Wallace et al.), updated 2023-06-12 [article-34001]

import type { SeedTrack } from "../data";

const ABPTS_PROVIDER = {
  providerSlug: "abpts",
  providerName: "American Board of Physical Therapy Specialties",
  providerUrl: "https://specialization.apta.org/",
  subcategorySlug: "physical-therapy",
  credentialType: "specialist_certification",
} as const;

const PT_DISCLAIMER_KEY = "pt-clinical-content";

const EXAM_FORMAT =
  "Approximately 200 four-option multiple-choice items, standalone or tied to case scenarios, delivered at PSI test centers in four 50-question blocks of up to 90 minutes each";
const PASSING = "Scaled score of 500; criterion-referenced standard set by ABPTS from a PSI standard-setting study.";
const DURATION = 360;

const BASE_ELIGIBILITY =
  "Current, unrestricted US physical therapist licence, plus either 2,000 hours of direct patient care in the specialty within the last 10 years (at least 500 within the last 3) or an ABPTRFE-accredited residency in the specialty completed within the last 10 years.";

// REQ-142: the outline's version is the edition of the Description of
// Specialty Practice it is built from. ABPTS states the edition only on some
// specialties' DSP pages (specialization.apta.org/become-a-specialist/<x>/dsp,
// "Practice Analysis Summary"); the others, and the APTA Store listings, name
// the DSP without a year. Read 2026-11-08; outline percentages re-checked
// against the units for OCS, NCS and GCS the same day.
const OUTLINE_CHECKED_AT = "2026-11-08T00:00:00Z";
const DSP_EDITION_UNPUBLISHED =
  "ABPTS's exam outline, DSP and APTA Store pages name the Description of Specialty Practice without an edition year (read 2026-11-08), and the DSP itself is sold, not public.";

function abptsCredential(params: {
  slug: string;
  name: string;
  url: string;
  outlineUrl: string;
  extraEligibility?: string;
  // The DSP edition, when ABPTS states it; otherwise the reason it can't be recorded.
  dspEdition?: string;
}) {
  return {
    ...ABPTS_PROVIDER,
    credentialSlug: params.slug,
    credentialName: params.name,
    credentialUrl: params.url,
    basis: "vendor_exam_unpublished_code" as const,
    status: "active" as const,
    officialObjectivesUrl: params.outlineUrl,
    ...(params.dspEdition ? { objectivesRevision: params.dspEdition } : { versionNote: DSP_EDITION_UNPUBLISHED }),
    lastVendorVerifiedAt: OUTLINE_CHECKED_AT,
    recommendedExperience: params.extraEligibility
      ? `${BASE_ELIGIBILITY} ${params.extraEligibility}`
      : BASE_ELIGIBILITY,
    durationMinutes: DURATION,
    questionFormat: EXAM_FORMAT,
    passingScorePolicy: PASSING,
  };
}

const COMMON = {
  trackType: "certification" as const,
  subcategorySlug: "physical-therapy",
  freshnessModel: "certification_aligned" as const,
  sourceVerifiedAt: OUTLINE_CHECKED_AT,
  requiresAcknowledgement: true,
  disclaimerKey: PT_DISCLAIMER_KEY,
  disclaimerVersion: 1,
};

// ---------------------------------------------------------------------------
// Orthopaedics. The newest outline of the ten: revalidation study 2022-2025,
// implemented in the 2026 Description of Specialty Practice. First exam
// 1989; 25,306 certified as of July 2026. Credential stated on-page as
// "Board-Certified Clinical Specialist in Orthopaedic Physical Therapy
// (OCS)". Note the 2027-cycle eligibility change the page flags: the 2,000
// hours must be subdivided by body region from that cycle on.
// ---------------------------------------------------------------------------
export const ABPTS_OCS_TRACK: SeedTrack = {
  ...COMMON,
  code: "ABPTSOCS",
  title: "Orthopaedic Clinical Specialist (OCS) Coach",
  description:
    "ABPTS board certification in orthopaedic physical therapy, on the 2026 outline: 30% specialty knowledge, 60% patient management, and a body-region table that puts the lumbar spine, shoulder and knee at the top.",
  sourceUrl:
    "https://specialization.apta.org/become-a-specialist/orthopaedics/specialist-certification-examination-outline-orthopaedics",
  credential: abptsCredential({
    slug: "orthopaedic-clinical-specialist",
    name: "Board-Certified Clinical Specialist in Orthopaedic Physical Therapy (OCS)",
    url: "https://specialization.apta.org/become-a-specialist/orthopaedics",
    dspEdition: "2026 Description of Specialty Practice (2022-2025 revalidation)",
    outlineUrl:
      "https://specialization.apta.org/become-a-specialist/orthopaedics/specialist-certification-examination-outline-orthopaedics",
    extraEligibility:
      "From the 2027 exam cycle the 2,000 hours must be subdivided by body region, and observational or mentored hours under an OCS may substitute for part of them.",
  }),
  units: [
    {
      title: "Knowledge for specialty practice",
      weight: 30,
      gate: "Explain the tissue-level mechanism and healing timeline behind an orthopaedic presentation, and the exam, imaging and pharmacology facts that change management.",
      objectives: [
        "Regional anatomy and arthrokinematics of the spine, pelvis and extremities at a specialist level",
        "Tissue healing, load tolerance and the mechanobiology behind progression decisions",
        "Pain science applied to persistent musculoskeletal pain and its influence on examination and intervention",
        "Diagnostic imaging in orthopaedics: what each modality shows and when findings matter clinically",
        "Pharmacology relevant to orthopaedic patients: analgesics, corticosteroids, anticoagulants and their exercise implications",
        "Medical screening and differential diagnosis for red flags masquerading as musculoskeletal pain",
        // Added 2026-11-04: depth from ABPTS outlines, APTA guidelines and StatPearls (see source header above ABPTS_OCS_TRACK).
        "Classify low back pain by duration (acute under 6 weeks, chronic beyond 12 weeks) and explain why routine imaging is held back: disc degeneration shows up in more than 80% of adults over 50, with or without symptoms", // SP-LBP
        "Explain adhesive capsulitis as inflammation then capsular fibrosis, its link to diabetes and thyroid disorders, and its course through painful, freezing and thawing phases over months to years", // SP-ADH
        "Describe femoroacetabular impingement morphology: a cam bump at the femoral head-neck junction, pincer over-coverage from the acetabular rim, and how their collision pinches labrum and cartilage", // SP-FAI
        "Explain the factors linked to higher ACL injury rates in female athletes: quadriceps-dominant deceleration, weaker hamstrings and core, and knee valgus on landing and cutting", // SP-ACL
      ],
    },
    {
      title: "Clinical reasoning, professionalism, communication, education and systems-based practice",
      weight: 10,
      gate: "Defend a management decision with the evidence, the patient's values and the system constraints -- all three, named explicitly.",
      objectives: [
        "Clinical reasoning frameworks for orthopaedic diagnosis and treatment selection",
        "Professionalism and ethical practice in a specialist role",
        "Communication with patients, referrers and the care team about prognosis and expectations",
        "Education of patients, students and colleagues in orthopaedic practice",
        "Systems-based practice: payment, access and care pathways affecting orthopaedic management",
        // Added 2026-11-04: depth from ABPTS outlines, APTA guidelines and StatPearls (see source header above ABPTS_OCS_TRACK).
        "Plan knee arthroplasty rehab through shared decision-making, weighing patient preference against out-of-pocket cost, limits on covered visits and transport barriers when choosing setting and format", // TKA-CPG
        "Frame low back pain prognosis honestly: earlier episodes, intense symptoms, depression and fear-avoidant behavior all raise the odds of chronic disabling pain", // SP-LBP
      ],
    },
    {
      title: "Patient management: spine, pelvis and craniomandibular region",
      // The 60% patient-management domain split by the body-region table's
      // own proportions (spine group 46%, upper extremity 21%, lower
      // extremity 33% of the regions) -> 28 / 13 / 19.
      weight: 28,
      gate: "For a spinal presentation, classify it, select the examination that confirms it, and name the intervention and progression the classification calls for.",
      objectives: [
        "Lumbar spine (19% of the body-region table): classification, examination, manual therapy, exercise and prognosis",
        "Cervical spine (12%): examination including vascular and ligamentous screening, treatment-based classification and intervention",
        "Thoracic spine and ribs (6%): examination, manipulation and exercise, and the visceral referral patterns to rule out",
        "Pelvic girdle, sacroiliac joint, coccyx and abdomen (6%): examination and management",
        "Head, maxillofacial and craniomandibular conditions (3%): temporomandibular examination and treatment",
        // Added 2026-11-04: depth from ABPTS outlines, APTA guidelines and StatPearls (see source header above ABPTS_OCS_TRACK).
        "Screen low back pain for red flags: prior cancer or unexplained weight loss; infection risk such as recent spinal procedures, intravenous drug use, immunosuppression or fever; fracture risk such as trauma, long-term corticosteroids, osteoporosis or age over 70", // SP-LBP
        "Treat new urinary retention, bowel dysfunction, saddle anesthesia or new bilateral leg weakness as possible cauda equina syndrome, a surgical emergency needing immediate referral", // SP-LBP; SP-LSS
        "For nonspecific chronic low back pain, rule out serious causes, keep the patient active, and lead with exercise therapy and cognitive behavioral therapy as first-line care", // SP-LBP
        "Recognize lumbar spinal stenosis: neurogenic claudication, relief with forward flexion (the shopping-cart sign) and stairs that feel easier going up than coming down", // SP-LSS
        "Recognize cervical radiculopathy: one-sided arm pain in a root distribution, C7 in over half of cases and C6 in about a quarter, a positive Spurling test as one of the most specific signs; most acute cases settle within 8 to 12 weeks", // SP-CRAD
        "Separate cervical myelopathy from radiculopathy by hand clumsiness, gait disturbance, spasticity, hyperreflexia and pathologic reflexes, and refer promptly because it can progress and often needs surgery", // SP-CMY
        "Screen acute neck pain with headache for vertebral artery dissection, which can follow minor trauma or neck manipulation and progress to posterior-circulation stroke", // SP-VAD
        "Classify spondylolisthesis, including isthmic slips from pars interarticularis lesions, know L5-S1 is the most common level, and start with nonoperative care unless deficits progress", // SP-SPL
        "Separate temporomandibular disc displacement with reduction (clicking, intermittent locking) from displacement without reduction (limited opening), and start with education, soft diet, jaw rest, warm compresses and stretching", // SP-TMD
      ],
    },
    {
      title: "Patient management: upper extremity",
      weight: 13,
      gate: "Given a shoulder, elbow or hand complaint, name the structure, the test that implicates it, and the staged intervention.",
      objectives: [
        "Shoulder and shoulder girdle (14%): rotator cuff, instability, adhesive capsulitis and post-surgical management",
        "Arm and elbow (4%): tendinopathy, instability and fracture rehabilitation",
        "Forearm, wrist and hand (3%): fracture, tendon and nerve conditions and their rehabilitation",
        // Added 2026-11-04: depth from ABPTS outlines, APTA guidelines and StatPearls (see source header above ABPTS_OCS_TRACK).
        "Recognize subacromial pain: a painful arc around 70 to 120 degrees of abduction, Neer and Hawkins-Kennedy signs, and dynamic causes such as cuff weakness and scapular dyskinesis that targeted strengthening addresses", // SP-SIS
        "After total shoulder arthroplasty for glenohumeral osteoarthritis, use a sling in neutral rotation with progressive range-of-motion and strengthening work; starting motion exercises may wait up to 4 weeks without hurting outcomes", // GHOA-CPG
        "Treat lateral epicondylitis as an eccentric-overload injury of the common extensor tendon, progressing from forearm stretching and strengthening to graded eccentric loading", // SP-LE
        "Recognize carpal tunnel syndrome: numbness worse at night in the thumb, index, middle and radial ring finger, eased by shaking the hand; little-finger numbness points elsewhere; late thumb weakness and thenar wasting", // SP-CTS
        "Know the thoracic outlet (first rib, scalene muscles, clavicle) and its neurogenic, venous and arterial forms; neurogenic is over 90% of cases, venous brings arm swelling, arterial brings color change and weak pulses", // SP-TOS
      ],
    },
    {
      title: "Patient management: lower extremity",
      weight: 19,
      gate: "Given a hip, knee or ankle presentation, differentiate the competing diagnoses and set the criteria for progression and return to activity.",
      objectives: [
        "Hip (10%): femoroacetabular, labral, osteoarthritic and post-arthroplasty management",
        "Thigh and knee (14%): ligament, meniscal, patellofemoral and post-surgical rehabilitation with return-to-activity criteria",
        "Leg, ankle and foot (9%): ankle sprain, Achilles and plantar conditions, fracture and tendinopathy management",
        "Outcome measures and prognosis across lower-extremity conditions",
        // Added 2026-11-04: depth from ABPTS outlines, APTA guidelines and StatPearls (see source header above ABPTS_OCS_TRACK).
        "Recognize patellofemoral pain as a diagnosis of exclusion: anterior knee pain loaded by squatting, stairs, running and long sitting; hip abductor weakness is linked to it, though the evidence is mixed", // SP-PFP
        "Examine a suspected ACL tear with the Lachman (the most sensitive test), anterior drawer and pivot shift, and restore full motion before reconstruction to cut the risk of arthrofibrosis", // SP-ACL
        "Manage lateral ankle sprain: inversion loads the anterior talofibular ligament; high ankle (syndesmotic) sprains carry more morbidity; favor early functional rehab and progressive balance and neuromuscular training over long immobilization", // SP-ANK
        "After primary uncomplicated knee arthroplasty, skip continuous passive motion and routine bracing; use passive, active-assisted and active ROM work, cryotherapy and limb elevation for early pain and swelling", // TKA-CPG
        "After knee arthroplasty, start progressive strength training early in the postacute period, add balance and gait retraining, and use NMES for quadriceps activation deficits, except with demand-type pacemakers, active cancer or deep vein thrombosis", // TKA-CPG
        "Differentiate insertional from noninsertional Achilles tendinopathy by pain location, examination and imaging, knowing the hypovascular zone sits about 2 to 6 cm above the calcaneal insertion", // SP-ACH
        "Recognize plantar fasciitis: degeneration at the plantar fascia origin on the medial calcaneal tuberosity, with sharp heel pain worst on the first steps out of bed", // SP-PLF
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Geriatrics. Outline gives knowledge areas (15%) and practice
// expectations (85%) with a long "not limited to" condition list. ~200
// items. No extra eligibility.
// ---------------------------------------------------------------------------
export const ABPTS_GCS_TRACK: SeedTrack = {
  ...COMMON,
  code: "ABPTSGCS",
  title: "Geriatric Clinical Specialist Coach",
  description:
    "ABPTS board certification in geriatric physical therapy: examination (25%) and intervention (25%) for the older adult, with the multisystem conditions -- falls, sarcopenia, dementia, fractures, heart failure -- the outline names.",
  sourceUrl:
    "https://specialization.apta.org/become-a-specialist/geriatrics/specialist-certification-examination-outline-geriatrics",
  credential: abptsCredential({
    slug: "geriatric-clinical-specialist",
    name: "Board-Certified Clinical Specialist in Geriatric Physical Therapy",
    url: "https://specialization.apta.org/become-a-specialist/geriatrics",
    dspEdition: "2020 Description of Specialty Practice (2017-2020 revalidation)",
    outlineUrl:
      "https://specialization.apta.org/become-a-specialist/geriatrics/specialist-certification-examination-outline-geriatrics",
  }),
  units: [
    {
      title: "Knowledge areas: foundation, clinical and behavioral sciences",
      weight: 15,
      gate: "Separate normal ageing from pathology in a presentation, and name the behavioral factor most likely to decide adherence.",
      objectives: [
        "Physiology of ageing across systems and how it changes normal values, exercise response and healing",
        "Clinical sciences of the common geriatric conditions: osteoporosis, osteoarthritis, heart failure, COPD, diabetes, dementia and Parkinson disease",
        "Behavioral sciences: cognition, depression, motivation and caregiver dynamics in older adults",
        "Pharmacology in older adults: polypharmacy, fall-risk medications and exercise interactions",
        // Added 2026-11-04: depth from ABPTS outlines, APTA guidelines and StatPearls (see source header above ABPTS_OCS_TRACK).
        "Explain sarcopenia using the EWGSOP2 find-assess-confirm-severity pathway, with handgrip strength as a key strength measure that also predicts length of stay, functional loss and death", // SP-SARC
        "Recognize delirium as an acute, fluctuating disturbance of attention, awareness and cognition, in hyperactive, hypoactive or mixed forms; the quiet hypoactive form is the one most often missed", // SP-DEL
        "Classify bone density with WHO T-scores (normal -1.0 or higher, osteopenia between -1.0 and -2.5, osteoporosis -2.5 or lower on DXA), knowing more fractures occur in the osteopenic range because more people are in it", // SP-OSTF
        "Treat polypharmacy (regular use of 5 or more medicines) as a risk factor in older adults, linked to falls, frailty, disability and death", // SP-POLY
        "Recognize the cardinal motor signs of Parkinson disease (bradykinesia, resting tremor, rigidity), with postural instability arriving later in the disease", // SP-PD
      ],
    },
    {
      title: "Professional roles and responsibilities",
      weight: 15,
      gate: "Describe the geriatric specialist's role in advocacy, interprofessional care and evidence appraisal with a concrete scenario.",
      objectives: [
        "Advocacy, ethics and consent with older adults, including capacity and surrogate decision-making",
        "Interprofessional and team-based care across acute, post-acute, home and community settings",
        "Evidence-based practice and outcome measurement in geriatric rehabilitation",
        "Education of patients, families, caregivers and staff",
        // Added 2026-11-04: depth from ABPTS outlines, APTA guidelines and StatPearls (see source header above ABPTS_OCS_TRACK).
        "Recognize the five forms of elder abuse (physical, emotional, sexual, financial, neglect) and who is most at risk: people reliant on carers, living in institutional settings or under financial strain", // SP-EA
        "Ask every older adult in contact with care, at least yearly, whether they have fallen in the past 12 months and about each fall's circumstances and consequences (opportunistic case-finding)", // WFG
        "Include the caregiver's view as well as the patient's when building a falls-prevention plan for someone with cognitive impairment, which improves adherence and outcomes", // WFG
        "Support structured, person-centered medication review and deprescribing of fall-risk-increasing drugs as a key falls intervention, and check fall history before such drugs are prescribed", // FRID; WFG
      ],
    },
    {
      title: "Examination",
      weight: 25,
      gate: "Select the standardized measures that answer a specific clinical question for an older adult, and interpret them against age-referenced norms.",
      objectives: [
        "Fall-risk and balance examination with standardized measures and their cut-off scores",
        "Strength, power and sarcopenia/dynapenia assessment",
        "Gait and mobility examination, including assistive-device and community-ambulation thresholds",
        "Cognitive, mental-health and delirium screening within the physical therapy examination",
        "Cardiopulmonary and vital-sign examination in frail and multimorbid older adults",
        "Examination of pain, integumentary status, continence and nutrition as they bear on function",
        // Added 2026-11-04: depth from ABPTS outlines, APTA guidelines and StatPearls (see source header above ABPTS_OCS_TRACK).
        "Stratify falls risk with gait speed (below 0.8 m/s flags risk), or the Timed Up and Go (over 15 seconds) as a less consistent alternative", // WFG
        "Class an older adult as high falls risk if a fall came with injury, 2 or more falls in 12 months, frailty, a lie of an hour or more without getting up, or suspected loss of consciousness", // WFG
        "Measure orthostatic hypotension correctly: blood pressure after at least 5 minutes supine, then on standing; a fall of 20 mm Hg systolic or 10 mm Hg diastolic within 3 minutes is diagnostic", // SP-OH; WFG
        "Screen for sarcopenia with the SARC-F (strength, walking help, rising from a chair, stairs, falls; 0 to 10), treating a score of 4 or more as the trigger for fuller assessment", // SP-SARC
        "Screen delirium at the bedside with the Confusion Assessment Method or the 4AT", // SP-DEL
        "Include fear of falling (Falls Efficacy Scale or short FES-I), vision, footwear and walking-aid fit in a multifactorial falls assessment", // WFG
      ],
    },
    {
      title: "Evaluation, diagnosis and prognosis",
      weight: 15,
      gate: "From examination findings in a multimorbid older adult, state the primary movement problem, the prognosis and the thing most likely to derail it.",
      objectives: [
        "Integrating multisystem findings into a movement-system diagnosis",
        "Prognosis in frailty, failure to thrive, post-hospitalization deconditioning and after hip or pelvic fracture",
        "Differentiating neurologic, musculoskeletal and cardiopulmonary contributors to mobility loss",
        "Recognizing conditions requiring medical referral: sepsis, dehydration, electrolyte imbalance and acute cardiac events",
        // Added 2026-11-04: depth from ABPTS outlines, APTA guidelines and StatPearls (see source header above ABPTS_OCS_TRACK).
        "Class one non-severe fall with no gait or balance problem as low risk (education and exercise), and one with gait or balance problems as intermediate risk (strength and balance exercise)", // WFG
        "Treat all older adults in care homes and hospitals as high falls risk and offer a standard comprehensive assessment and multidomain interventions", // WFG
      ],
    },
    {
      title: "Intervention",
      weight: 25,
      gate: "Prescribe an intervention with dose and progression for an older adult, and justify why it is safe given the comorbidities present.",
      objectives: [
        "Exercise prescription for strength, power and endurance in older adults, including dosing for frailty",
        "Fall-prevention and balance intervention programs with evidence-based components",
        "Rehabilitation after fracture, arthroplasty and amputation in older adults",
        "Neurologic rehabilitation in stroke, Parkinson disease, dementia and vestibular disorders",
        "Cardiopulmonary rehabilitation in heart failure, COPD and peripheral vascular disease",
        "Integumentary management: pressure injuries, skin tears and vascular and neuropathic wounds",
        // Added 2026-11-04: depth from ABPTS outlines, APTA guidelines and StatPearls (see source header above ABPTS_OCS_TRACK).
        "Dose falls-prevention exercise around balance and functional work (such as sit-to-stand and stepping), three or more times a week, individualized and progressed for at least 12 weeks, adding Tai Chi or progressive resistance training where feasible", // WFG
        "After hip fracture, prescribe individualized progressive exercise for standing up, balance, walking and stairs, begun as an inpatient and continued at home; after stroke, target balance, strength and walking", // WFG
        "Use the SIGN-based APTA guidance for osteoporosis: single-leg standing for hip density, walking, tai chi or closed-chain resistance work for the spine, and progressive resistance training for the femoral neck", // OSTEO-CPG
        "Know high-impact or odd-impact protocols alone did not raise bone density at any site, and low-load seated strength work showed no density effect", // OSTEO-CPG
        "Offer people with early to mid-stage Parkinson disease and little or no cognitive impairment an individualized program that includes balance and resistance training", // WFG
      ],
    },
    {
      title: "Outcomes",
      weight: 5,
      gate: "Choose an outcome measure that will detect meaningful change for this patient and state the minimal clinically important difference.",
      objectives: [
        "Selecting and interpreting outcome measures across impairment, activity and participation in older adults",
        "Using outcomes to justify continuation, discharge or a change in setting",
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Neurology. Learning-domain weights (15/5/5/5/5/5/60) plus a condition
// table by body system. No extra eligibility.
// ---------------------------------------------------------------------------
export const ABPTS_NCS_TRACK: SeedTrack = {
  ...COMMON,
  code: "ABPTSNCS",
  title: "Neurologic Clinical Specialist Coach",
  description:
    "ABPTS board certification in neurologic physical therapy: 60% patient management across stroke, spinal cord injury, brain injury, Parkinson disease, multiple sclerosis, vestibular and balance disorders, with the knowledge, reasoning and systems domains the outline weights around it.",
  sourceUrl:
    "https://specialization.apta.org/become-a-specialist/neurology/specialist-certification-examination-outline-neurology",
  credential: abptsCredential({
    slug: "neurologic-clinical-specialist",
    name: "Board-Certified Clinical Specialist in Neurologic Physical Therapy",
    url: "https://specialization.apta.org/become-a-specialist/neurology",
    dspEdition: "2026 Description of Specialty Practice (2023-2026 revalidation)",
    outlineUrl:
      "https://specialization.apta.org/become-a-specialist/neurology/specialist-certification-examination-outline-neurology",
  }),
  units: [
    {
      title: "Knowledge for specialty practice",
      weight: 15,
      gate: "Localize a lesion from the presentation and explain the neuroplasticity principle that governs the recovery you expect.",
      objectives: [
        "Neuroanatomy and lesion localization: cortical, subcortical, brainstem, cerebellar, spinal and peripheral patterns",
        "Neuroplasticity and motor learning principles that drive intervention design",
        "Pathophysiology and medical management of stroke, aneurysm and arteriovenous malformation",
        "Pathophysiology of degenerative and inflammatory conditions: Parkinson disease, multiple sclerosis, ALS, Guillain-Barre syndrome, dementias",
        "Neuropharmacology and its effects on movement, fatigue and cognition",
        // Added 2026-11-04: depth from ABPTS outlines, APTA guidelines and StatPearls (see source header above ABPTS_OCS_TRACK).
        "Know the incomplete spinal cord syndromes: central cord (the most common, arms weaker than legs), anterior cord from anterior spinal artery compromise, and Brown-Sequard hemisection with same-side weakness and opposite-side pain and temperature loss", // SP-SCI
        "Explain spasticity as a velocity-dependent rise in tone with exaggerated stretch reflexes from lost supraspinal inhibition, part of the upper motor neuron syndrome with a positive Babinski sign", // SP-SPAS
        "Recognize cerebellar dysfunction (ataxia, dysmetria, nystagmus, dysarthria, imbalance and gait disorder) and causes of bilateral involvement such as multiple sclerosis and posterior circulation stroke", // SP-CER
        "Know relapsing-remitting multiple sclerosis is the first course in about 70% to 80% of patients, and that fatigue, spasticity, pain, bladder problems and depression are common symptom targets", // SP-MS
      ],
    },
    {
      title: "Clinical reasoning, professionalism, communication, education and systems-based practice",
      weight: 25,
      gate: "Explain a prognosis and plan to a patient and family in plain language, and name the system constraint that shapes the setting of care.",
      objectives: [
        "Clinical reasoning across the continuum of neurologic care from ICU to community",
        "Professionalism and ethics in neurologic practice, including goals-of-care conversations",
        "Communication with patients with aphasia, cognitive impairment and their caregivers",
        "Education of patients, caregivers, students and interprofessional colleagues",
        "Systems-based practice: level-of-care decisions, payer rules and transitions between settings",
        // Added 2026-11-04: depth from ABPTS outlines, APTA guidelines and StatPearls (see source header above ABPTS_OCS_TRACK).
        "Communicate with people who have aphasia, an acquired language disorder that can affect expression, comprehension or both (such as Broca, Wernicke and conduction types)", // SP-APH
        "Choose the core outcome set with the patient: measures are used when the person has goals and capacity to change in that area, decided through collaborative decision-making", // CORE-CPG
        "Deliver Parkinson disease care within an integrated care approach, use behavior-change strategies to raise activity, and know telerehabilitation may be used to improve balance", // PD-CPG
      ],
    },
    {
      title: "Patient management: examination, evaluation, diagnosis and prognosis",
      weight: 30,
      gate: "Choose the standardized measures that answer a specific question for a neurologic patient, and turn the results into a prognosis with a timeline.",
      objectives: [
        "Standardized examination of balance, gait, coordination, tone, sensation and cognition with cut-off scores",
        "Vestibular examination: oculomotor, positional and functional testing and differentiating peripheral from central causes",
        "Examination of the patient with spinal cord injury, including neurological level and ASIA classification",
        "Evaluation and diagnosis in movement disorders, cerebellar disorders, functional movement disorders and polyneuropathy",
        "Prognosis after stroke, traumatic and non-traumatic brain injury and spinal cord injury",
        "Recognizing medical instability and emergencies: autonomic dysreflexia, raised intracranial pressure, new neurologic signs",
        // Added 2026-11-04: depth from ABPTS outlines, APTA guidelines and StatPearls (see source header above ABPTS_OCS_TRACK).
        "Use the core outcome set for adults with neurologic conditions: Berg Balance Scale, Functional Gait Assessment, ABC Scale, 10 meter Walk Test, 6-Minute Walk Test, and 5 Times Sit-to-Stand for transfers", // CORE-CPG
        "Repeat each core measure with an identical protocol on admission and at discharge, plus interim checks where practical", // CORE-CPG
        "Diagnose posterior canal BPPV with the Dix-Hallpike maneuver and lateral (horizontal) canal BPPV with the supine roll test, looking for geotropic or apogeotropic nystagmus", // SP-BPPV
        "Classify spinal cord injury with the ISNCSCI exam and the ASIA Impairment Scale, recording level and completeness", // SP-SCI
        "Recognize autonomic dysreflexia in injuries at or above T6: systolic pressure 20 mm Hg or more over baseline (15 in children) with severe headache, usually from bladder distension (about 85%)", // SP-AD
        "Know the Glasgow Coma Scale's eye, verbal and motor parts, and its limits: it can underestimate the need for surgery in mild to moderate head injury and predicts functional outcome poorly", // SP-GCS
        "Monitor Guillain-Barre syndrome for progressive symmetric weakness and the respiratory, cardiac and autonomic complications that drive its morbidity", // SP-GBS
      ],
    },
    {
      title: "Patient management: intervention and outcomes",
      weight: 30,
      gate: "Design a task-specific intervention with dose and progression for a stated neurologic diagnosis and stage, and state the outcome measure that will show it worked.",
      objectives: [
        "Task-specific training and neuroplasticity-based intervention for stroke and brain injury",
        "Gait training, orthotic and assistive-technology decisions in neurologic populations",
        "Vestibular rehabilitation and fall-prevention programs",
        "Intervention in progressive conditions: Parkinson disease, multiple sclerosis, ALS and dementia, including fatigue and exercise dosing",
        "Management after spinal cord injury: respiratory care, pressure-injury prevention, mobility and wheelchair seating",
        "Selecting outcome measures and using them to guide discharge and transition of care",
        // Added 2026-11-04: depth from ABPTS outlines, APTA guidelines and StatPearls (see source header above ABPTS_OCS_TRACK).
        "Offer supervised vestibular physical therapy for acute, subacute, chronic and bilateral peripheral vestibular hypofunction, and don't use saccadic or smooth-pursuit exercises as gaze-stability exercises", // VEST-CPG
        "Dose gaze stabilization: at least 3 times a day for 12 minutes total in acute unilateral loss; 3 to 5 times a day for at least 20 minutes for 4 to 6 weeks in chronic loss; 20 to 40 minutes for about 5 to 7 weeks in bilateral loss", // VEST-CPG
        "Add static and dynamic balance exercise for at least 20 minutes a day for 4 to 6 weeks in chronic unilateral hypofunction, and stop therapy when goals are met, symptoms resolve, function normalizes or progress plateaus", // VEST-CPG
        "Treat BPPV with repositioning maneuvers such as Epley or Semont as first-line care, knowing vestibular suppressant medicines are not effective treatment", // SP-BPPV
        "In Parkinson disease, prescribe moderate- to high-intensity aerobic exercise, progressive resistance training and balance training, all strong recommendations in the APTA guideline", // PD-CPG
        "Use external cueing for freezing of gait, plus gait training and task-specific training, in Parkinson disease; consider cycling over treadmill walking for people at high fall risk or with freezing", // PD-CPG
        "Manage autonomic dysreflexia as an emergency: find and remove the trigger, often by irrigating or changing a blocked Foley catheter, and check for bowel impaction, tight clothing or skin injury", // SP-AD
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Cardiovascular & Pulmonary. Outline is case-history based with a
// diagnosis frequency distribution (60% frequently-seen, 30% occasionally,
// 10% rarely) and rank-ordered diagnosis lists. The page's own content
// rows sum to 85% under a stated total of 100% -- carried as published
// rather than padded; the app normalises weights, so readiness is
// unaffected. The frequency-distribution unit is deliberately unweighted. First exam 1985; 632
// certified as of July 2026. Extra eligibility: current AHA ACLS plus a
// data analysis project or case report.
// ---------------------------------------------------------------------------
export const ABPTS_CCS_TRACK: SeedTrack = {
  ...COMMON,
  code: "ABPTSCCS",
  title: "Cardiovascular & Pulmonary Clinical Specialist Coach",
  description:
    "ABPTS board certification in cardiovascular and pulmonary physical therapy: case-history examination weighted toward evaluation (30%), with the outline's own frequently-, occasionally- and rarely-seen diagnoses.",
  sourceUrl: "https://specialization.apta.org/become-a-specialist/cardiovascular-pulmonary/exam-outline",
  credential: {
    ...abptsCredential({
      slug: "cardiovascular-pulmonary-clinical-specialist",
      name: "Board-Certified Clinical Specialist in Cardiovascular and Pulmonary Physical Therapy",
      url: "https://specialization.apta.org/become-a-specialist/cardiovascular-pulmonary",
      outlineUrl: "https://specialization.apta.org/become-a-specialist/cardiovascular-pulmonary/exam-outline",
      extraEligibility:
        "Also requires current Advanced Cardiac Life Support certification from the American Heart Association, plus one data analysis project (within 10 years) or one case report on a patient seen within the last 3 years.",
    }),
    // REQ-102: kept as published (see the block comment above).
    publishedWeightsNote:
      "ABPTS's outline content rows sum to 85% under a stated 100% total; the diagnosis-frequency unit is deliberately unweighted.",
  },
  units: [
    {
      title: "Professional behaviors, leadership, education, administration and consultation",
      weight: 5,
      gate: "Describe the specialist's consulting role on a cardiac or pulmonary unit with a concrete example.",
      objectives: [
        "Leadership, consultation and program administration in cardiopulmonary rehabilitation",
        "Education of patients, families and interprofessional staff about activity, risk and self-management",
        // Added 2026-11-04: depth from ABPTS outlines, APTA guidelines and StatPearls (see source header above ABPTS_OCS_TRACK).
        "Know the cardiac rehabilitation team (cardiology, nursing, physical and occupational therapy, pharmacy, dietitians, behavioral therapists, case managers) and the physical therapist's role on it", // SP-CR
        "Teach risk-factor work that runs through every rehab phase: managing medical conditions, nutrition, smoking cessation, stress reduction and psychosocial support", // SP-CR
      ],
    },
    {
      title: "Evidence-based clinical practice and critical inquiry",
      weight: 10,
      gate: "Appraise a cardiopulmonary rehabilitation study and state what it justifies in practice.",
      objectives: [
        "Critical inquiry principles and methods applied to cardiopulmonary rehabilitation evidence",
        "Clinical practice guidelines for cardiac and pulmonary rehabilitation and their limits",
        // Added 2026-11-04: depth from ABPTS outlines, APTA guidelines and StatPearls (see source header above ABPTS_OCS_TRACK).
        "Apply the ERS/ATS technical standard when interpreting 6-minute walk results: a 30 m change is the smallest difference that counts as clinically meaningful", // SP-6MWT
        "Use the ACC/AHA 2022 heart failure framework as summarized in StatPearls: classify by ejection fraction (HFrEF at 40% or less, mildly reduced 41% to 49%, HFpEF 50% or more) and stage, with NYHA class for symptoms", // SP-HF
      ],
    },
    {
      title: "Examination",
      weight: 15,
      gate: "From a case history, select the examination that establishes exercise safety and the physiologic limit to activity.",
      objectives: [
        "History and chart review: cardiac and pulmonary diagnoses, procedures, devices, labs and medications that change the plan",
        "Vital signs, ECG rhythm recognition and hemodynamic monitoring during examination",
        "Pulmonary examination: breath sounds, breathing pattern, cough and airway clearance assessment",
        "Exercise and functional testing: six-minute walk, submaximal and symptom-limited testing and when each is appropriate",
        "Examination of the patient with lines, drains, ventilators, pacemakers, defibrillators and ventricular assist devices",
        // Added 2026-11-04: depth from ABPTS outlines, APTA guidelines and StatPearls (see source header above ABPTS_OCS_TRACK).
        "Run a 6-minute walk test correctly: flat straight course of about 30 m, pulse oximeter and Borg scale, record distance, heart rate, SpO2 and symptoms, and watch for the lowest saturation during the test", // SP-6MWT
        "Screen before a 6-minute walk: acute coronary syndrome in the past 30 days is the one established absolute contraindication; uncontrolled hypertension and resting heart rate over 120 bpm are relative ones", // SP-6MWT
        "Screen for deep vein thrombosis risk with Virchow's triad (vessel wall damage, flow stasis, hypercoagulability) and know clinical probability is scored with the Wells system before D-dimer and ultrasound", // SP-DVT
      ],
    },
    {
      title: "Evaluation",
      weight: 30,
      gate: "Interpret the full data set -- rhythm, hemodynamics, gases, imaging, labs -- for a frequently-seen diagnosis and decide whether to proceed, modify or stop.",
      objectives: [
        "Interpreting ECG, arterial blood gases, pulmonary function tests, chest imaging and laboratory values",
        "Evaluating exercise responses in coronary disease, heart failure, dysrhythmia, hypertension and peripheral vascular disease",
        "Evaluating the post-procedure patient: angioplasty, bypass graft, valve replacement, pacemaker and defibrillator, transplant and assist devices",
        "Evaluating pulmonary presentations: COPD, asthma, pneumonia, atelectasis, effusion, respiratory failure, pulmonary embolism and post-operative complications",
        "Evaluating occasionally- and rarely-seen diagnoses: cystic fibrosis, lung transplant, congenital defects, ECMO, aortic repair and pericarditis",
        "Recognizing decompensation and emergencies that require stopping activity or escalating care",
        // Added 2026-11-04: depth from ABPTS outlines, APTA guidelines and StatPearls (see source header above ABPTS_OCS_TRACK).
        "Interpret arterial blood gases against normal pH (7.35-7.45) and PaCO2 (35-45 mm Hg), and decide whether the problem is respiratory or metabolic and whether it is compensated", // SP-ABG
        "Read spirometry: an FEV1/FVC ratio below 0.70 means obstruction (GOLD's spirometric COPD definition, post-bronchodilator), while restriction needs TLC below 80% predicted on lung volumes", // SP-PFT; SP-COPD
        "Recognize exercise-induced desaturation on a walk test (a fall in SpO2 of more than 4% is clinically significant; desaturation below 80% is the commonest reason to stop)", // SP-6MWT
        "Evaluate pulmonary hypertension: mean pulmonary artery pressure above 20 mm Hg, the five WHO groups, and exertional dyspnea with signs of right heart strain", // SP-PH
        "Evaluate the patient with a left ventricular assist device, a bridge to transplant or destination therapy, for its main complications: thrombosis, bleeding, driveline infection and right heart failure", // SP-LVAD
        "Evaluate a patient after coronary bypass: grafts usually from the left internal mammary artery and saphenous vein, a wired sternum, and beta-blockers continued to prevent atrial fibrillation", // SP-CABG
      ],
    },
    {
      title: "Diagnosis and prognosis",
      weight: 5,
      gate: "State the physical therapy diagnosis and a realistic prognosis for a cardiopulmonary case, with the factor most likely to limit it.",
      objectives: [
        "Movement-system diagnosis in cardiovascular and pulmonary disease",
        "Prognosis across acute, inpatient rehabilitation, outpatient and home settings",
        // Added 2026-11-04: depth from ABPTS outlines, APTA guidelines and StatPearls (see source header above ABPTS_OCS_TRACK).
        "Know who benefits from pulmonary rehabilitation: people with chronic respiratory disease, including COPD from mild to advanced, after a thorough assessment and with tailored therapy", // SP-PR
      ],
    },
    {
      title: "Plan of care and interventions",
      weight: 15,
      gate: "Write an exercise prescription with intensity, monitoring parameters and stop criteria for a specific cardiac or pulmonary diagnosis.",
      objectives: [
        "Exercise prescription and progression in cardiac rehabilitation phases",
        "Pulmonary rehabilitation: airway clearance, breathing retraining, inspiratory muscle training and oxygen titration",
        "Early mobilization in the ICU, including patients on mechanical ventilation and circulatory support",
        "Risk-factor modification and self-management education",
        // Added 2026-11-04: depth from ABPTS outlines, APTA guidelines and StatPearls (see source header above ABPTS_OCS_TRACK).
        "Screen for contraindications to exercise in cardiac rehab: unstable angina, acute decompensated heart failure, complex ventricular arrhythmias, severe pulmonary hypertension, intracavitary thrombus, severe or symptomatic aortic stenosis", // SP-CR
        "Structure cardiac rehab by phase: phase I inpatient bedside mobility and education, phase II supervised outpatient care after cardiology clearance (usually 3 to 6 weeks, up to 12), phase III independent maintenance", // SP-CR
        "Build pulmonary rehab exercise from endurance, interval (for those who can't sustain continuous work) and resistance training, combining all three for the most benefit, and set oxygen by rest and exercise needs", // SP-PR
        "Titrate supplemental oxygen to target saturations: about 92% to 98% for most patients, 88% to 92% for chronic hypercapnic conditions such as COPD", // SP-O2
        "Prevent and treat postoperative atelectasis (usually within 72 hours of general anesthesia) with deep breathing, early walking, incentive spirometry, an acapella device, chest physiotherapy and good pain control", // SP-ATEL
        "Protect the femoral insertion site for an intra-aortic balloon pump: don't flex the leg, and know walking isn't possible while a femoral device is in place", // SP-IABP
        "Include airway clearance in cystic fibrosis care, alongside nutrition and infection control, recognizing CFTR modulators now treat the underlying protein defect", // SP-CF
      ],
    },
    {
      title: "Outcomes",
      weight: 5,
      gate: "Select the outcome measure that will show change for a cardiopulmonary patient and state what change is meaningful.",
      objectives: [
        "Outcome measures for exercise capacity, dyspnea, quality of life and participation",
        "Using outcomes to guide discharge and transition between rehabilitation phases",
      ],
    },
    {
      title: "Diagnosis frequency distribution",
      gate: "Name which category -- frequently, occasionally or rarely seen -- a given diagnosis sits in, and why that changes how much exam attention it earns.",
      objectives: [
        "Frequently-seen diagnoses (60% of items): coronary and peripheral atherosclerosis, heart failure, hypertension, dysrhythmia, myocardial infarction, pulmonary edema, COPD, pneumonia, atelectasis and respiratory failure",
        "Occasionally-seen diagnoses (30%): aortic repair, ventricular assist devices, heart transplant, cystic fibrosis, lung resection and transplant, bronchiolitis and sarcoidosis",
        "Rarely-seen diagnoses (10%): congenital heart defects, ECMO, lymphedema, tuberculosis, bronchopulmonary dysplasia and heart-lung transplant",
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Pediatrics. Knowledge 16%, professional roles 16%, patient management
// 68%; ~200 items; long illustrative condition list including NICU/PICU and
// school settings. No extra eligibility.
// ---------------------------------------------------------------------------
export const ABPTS_PCS_TRACK: SeedTrack = {
  ...COMMON,
  code: "ABPTSPCS",
  title: "Pediatric Clinical Specialist Coach",
  description:
    "ABPTS board certification in pediatric physical therapy: examination, evaluation and intervention (20% each) across cerebral palsy, developmental disabilities, congenital and genetic conditions, from the NICU to the school setting.",
  sourceUrl:
    "https://specialization.apta.org/become-a-specialist/pediatrics/specialist-certification-examination-outline-pediatrics",
  credential: abptsCredential({
    slug: "pediatric-clinical-specialist",
    name: "Board-Certified Clinical Specialist in Pediatric Physical Therapy",
    url: "https://specialization.apta.org/become-a-specialist/pediatrics",
    outlineUrl:
      "https://specialization.apta.org/become-a-specialist/pediatrics/specialist-certification-examination-outline-pediatrics",
  }),
  units: [
    {
      title: "Knowledge areas: foundation, clinical, behavioral sciences and critical inquiry",
      weight: 16,
      gate: "Explain a developmental finding in terms of typical development, the pathology that alters it, and the family context that shapes intervention.",
      objectives: [
        "Typical motor, cognitive and social development from infancy through adolescence and the variability within it",
        "Clinical sciences of pediatric conditions: cerebral palsy, spina bifida, muscular dystrophy, Down syndrome, cystic fibrosis, congenital heart disease, juvenile arthritis",
        "Behavioral sciences: family-centered care, child and adolescent motivation, and the impact of disability on participation",
        "Critical inquiry: appraising pediatric evidence and using standardized developmental measures correctly",
        // Added 2026-11-04: depth from ABPTS outlines, APTA guidelines and StatPearls (see source header above ABPTS_OCS_TRACK).
        "Know cerebral palsy leads all causes of childhood disability (about 1.5 to 2.5 per 1000 live births) and its subtypes: spastic diplegic, hemiplegic and quadriplegic, dyskinetic, dystonic and ataxic", // SP-CP
        "Explain Duchenne muscular dystrophy: X-linked recessive (about 30% new mutations), calf pseudohypertrophy, progressive weakness to wheelchair use, and treatment centered on glucocorticoids and physiotherapy", // SP-DMD
        "Know Down syndrome brings near-universal infant hypotonia with joint laxity that reduces gait stability, and screening for congenital heart defects, hearing and vision problems", // SP-DS
        "Explain Erb palsy as the most common neonatal brachial plexus palsy: a traction injury to the C5-C6 roots (upper trunk), sometimes reaching C7, causing flaccid arm weakness", // SP-ERB
        "Know developmental coordination disorder (dyspraxia): poor motor coordination and motor-skill learning, handwriting problems in up to 95%, with prematurity and low birth weight the strongest risk factors", // SP-DCD
      ],
    },
    {
      title: "Professional roles and responsibilities",
      weight: 16,
      gate: "Describe the pediatric specialist's role under early-intervention and special-education law with a concrete scenario.",
      objectives: [
        "Professional behaviors and core values in pediatric practice",
        "Leadership, administration and consultation in early intervention, school-based and medical settings",
        "Education of families, teachers and interprofessional colleagues",
        "Evidence-based practice and the pediatric physical therapist's contribution to research",
        "Legal and policy frameworks: IDEA early intervention and school-based services",
        // Added 2026-11-04: depth from ABPTS outlines, APTA guidelines and StatPearls (see source header above ABPTS_OCS_TRACK).
        "Connect families to early intervention programs, which provide evaluations and link them to services such as service coordination, social work and home visits", // SP-DEVM
        "Work with physicians on the interprofessional team for developmental coordination disorder, providing standardized motor-competence testing as physical and occupational therapists", // SP-DCD
      ],
    },
    {
      title: "Examination",
      weight: 20,
      gate: "Select age-appropriate, standardized tests and measures for a stated child and setting, and justify the choice.",
      objectives: [
        "Standardized developmental and functional measures across ages, including norm-referenced versus criterion-referenced tools",
        "Examination of tone, reflexes, posture, gait and musculoskeletal alignment in children",
        "Examination of fitness, participation and activity in typically developing children and those with lifelong disability",
        "Examination in special settings: neonatal intensive care, pediatric intensive care, burn unit, early intervention and school",
        // Added 2026-11-04: depth from ABPTS outlines, APTA guidelines and StatPearls (see source header above ABPTS_OCS_TRACK).
        "Know developmental red flags that need immediate evaluation: no social smile by 2 months, no babbling or pointing by 12 months, no words by 16 months, no 2-word phrases by 24 months, and any loss of skills", // SP-DEVM
        "Support early detection of cerebral palsy with standardized tools such as the General Movements Assessment (under 5 months) and the Hammersmith Infant Neurological Exam (2 to 24 months), alongside MRI", // SP-CP
        "Screen infant hips with the Ortolani and Barlow tests and watch for limited abduction, uneven gluteal folds and leg-length difference; breech position is the biggest risk factor for hip dysplasia", // SP-DDH
        "Recognize scoliosis as a coronal curve of at least 10 degrees by Cobb angle, track skeletal maturity with Risser grading and menarche, and document standing and forward-bending posture", // SP-AIS
        "Identify positional plagiocephaly from sustained positioning, its link to supine sleep and congenital muscular torticollis with head preference, and examine neck rotation", // SP-PLAG
      ],
    },
    {
      title: "Evaluation, diagnosis and prognosis",
      weight: 20,
      gate: "Integrate findings into a diagnosis and prognosis for a child, stating the classification level and what the family can expect.",
      objectives: [
        "Classification systems in cerebral palsy and their prognostic meaning",
        "Differentiating musculoskeletal, neuromuscular, cardiopulmonary and genetic contributors to a child's presentation",
        "Prognosis in developmental coordination disorder, developmental disability, autism spectrum disorder and acquired brain injury",
        "Recognizing conditions requiring medical referral: hip displacement, scoliosis progression, shunt malfunction, cardiorespiratory decline",
        // Added 2026-11-04: depth from ABPTS outlines, APTA guidelines and StatPearls (see source header above ABPTS_OCS_TRACK).
        "Suspect slipped capital femoral epiphysis in a pre-teen or teen with hip, thigh or knee pain and a limp, since knee-only pain often delays diagnosis; obesity is the single biggest risk factor", // SP-SCFE
        "Recognize Legg-Calve-Perthes disease (avascular necrosis of the femoral head, boys 3 to 5 times more often) by limp, hip, groin or knee pain and lost abduction and internal rotation, staged through necrosis to healing", // SP-LCP
        "Know juvenile idiopathic arthritis means arthritis lasting 6 weeks or more with onset before age 16", // SP-JIA
        "Know scoliosis curves over 25 but under 40 to 45 degrees are brace candidates, supported by the NIH-funded BrAIST trial, while larger curves may need surgery", // SP-AIS
      ],
    },
    {
      title: "Intervention",
      weight: 20,
      gate: "Design a family-centered, participation-focused intervention with dose and progression for a stated pediatric condition and setting.",
      objectives: [
        "Motor learning and task-specific training in children with neuromuscular conditions",
        "Orthotic, assistive-technology, seating and mobility decisions across the lifespan of disability",
        "Intervention for musculoskeletal conditions: torticollis and plagiocephaly, scoliosis, fractures, sports injuries and limb deficiency",
        "Cardiopulmonary and fitness intervention in children with congenital heart disease, cystic fibrosis, asthma and obesity",
        "Intervention in the NICU and PICU and in early-intervention and school environments",
        // Added 2026-11-04: depth from ABPTS outlines, APTA guidelines and StatPearls (see source header above ABPTS_OCS_TRACK).
        "Guide families on positional plagiocephaly with repositioning and awake prone tummy time, with helmet therapy and referral when indicated", // SP-PLAG
        "Know the spasticity medicines children with cerebral palsy may be on (baclofen, benzodiazepines, dantrolene, tizanidine, botulinum toxin, phenol) and plan therapy around them", // SP-CP
        "Know infant hip dysplasia management may include an abduction splint such as the Pavlik harness, set by the orthopedic surgeon, and that screening aims to diagnose before 6 months", // SP-DDH
        "In myelomeningocele, watch for hydrocephalus and Chiari II problems (often shunted) and neurogenic bladder, and report signs of neurological decline", // SP-MMC
      ],
    },
    {
      title: "Outcomes",
      weight: 8,
      gate: "Choose an outcome measure that captures participation for a child and state what change would matter to the family.",
      objectives: [
        "Outcome measures at the body-function, activity and participation levels in pediatrics",
        "Using outcomes to set goals in IEPs and individualized family service plans",
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Sports. Five domains (20/5/30/35/10) with named sub-areas. Extra
// eligibility: in-person CPR, emergency-management training, and 100
// athletic venue coverage hours (50 in contact sports).
// ---------------------------------------------------------------------------
export const ABPTS_SCS_TRACK: SeedTrack = {
  ...COMMON,
  code: "ABPTSSCS",
  title: "Sports Clinical Specialist Coach",
  description:
    "ABPTS board certification in sports physical therapy: clinical intervention (35%) and assessment (30%) for athletes, plus emergency management, injury prevention, performance and the sports science behind it.",
  sourceUrl:
    "https://specialization.apta.org/become-a-specialist/sports/specialist-certification-examination-outline-sports",
  credential: abptsCredential({
    slug: "sports-clinical-specialist",
    name: "Board-Certified Clinical Specialist in Sports Physical Therapy",
    url: "https://specialization.apta.org/become-a-specialist/sports",
    outlineUrl:
      "https://specialization.apta.org/become-a-specialist/sports/specialist-certification-examination-outline-sports",
    extraEligibility:
      "Also requires current in-person CPR certification (AHA BLS Healthcare Provider or Red Cross CPR for the Professional Rescuer), evidence of acute injury and illness management training to First Responder or ECC standards, and 100 hours of athletic venue coverage within the last 10 years, at least 50 in contact sports.",
  }),
  units: [
    {
      title: "Knowledge areas",
      weight: 20,
      gate: "Explain the sports-science and medical-condition knowledge behind a return-to-play decision, not just the protocol.",
      objectives: [
        "Anatomy, physiology, normal movement science and clinical science applied to athletic populations",
        "Medical and surgical conditions in athletes, including concussion, cardiac screening findings and overtraining",
        "Sports science and wellness: periodization, energy systems, recovery and load monitoring",
        "Scope of practice and principles of teaching and learning in sports settings",
        // Added 2026-11-04: depth from ABPTS outlines, APTA guidelines and StatPearls (see source header above ABPTS_OCS_TRACK).
        "Explain the female athlete triad as low energy availability (intake that falls short of what training burns, with or without an eating disorder) combined with menstrual disorder and reduced bone mineral density", // SP-FAT
        "Know why cardiac disease, often congenital, is the leading cause of sudden death in young athletes, with hypertrophic cardiomyopathy the most common cause and coronary artery anomalies second", // SP-SDA
        "Explain commotio cordis: ventricular fibrillation set off by a blunt blow to the chest of a structurally normal heart, most often from a hard ball such as a baseball", // SP-CC
        "Explain growth-plate traction injuries in young athletes: Osgood-Schlatter at the tibial tubercle from jumping and sprinting, Sever disease at the calcaneal apophysis (ages 8 to 15) and little league elbow from repeated valgus stress", // SP-OSG; SP-SEV; SP-LLE
        "Explain how sickle cell trait can turn dangerous with exertion: dehydration and hypoxia favor sickling, which can bring exertional rhabdomyolysis or sudden death", // SP-SCT
      ],
    },
    {
      title: "Professional roles and responsibilities",
      weight: 5,
      gate: "Describe the sports specialist's consultation and evidence roles within a team's medical staff.",
      objectives: [
        "Consultation and education with athletes, coaches, parents and medical staff",
        "Critical inquiry for evidence-based sports practice",
        "Administration of sports medicine services and event coverage",
        // Added 2026-11-04: depth from ABPTS outlines, APTA guidelines and StatPearls (see source header above ABPTS_OCS_TRACK).
        "Use the preparticipation evaluation as the sports specialist's screening tool: personal and family history finds most conditions that limit play, and it ends in a full, limited or no-participation recommendation", // SP-PPE
        "Use AAOS guidance when advising teams on ACL prevention: injury-prevention training programs cut primary ACL injury in high-risk sports, while prophylactic knee bracing is not a preferred option", // AAOS-ACL
      ],
    },
    {
      title: "Patient and client assessment",
      weight: 30,
      gate: "For an athletic injury, perform the examination that establishes the diagnosis and the functional tests that decide readiness to return.",
      objectives: [
        "Clinical examination and evaluation of sport-specific injuries of the spine and extremities",
        "On-field and sideline assessment, including concussion evaluation",
        "Diagnosis and prognosis for ligament, tendon, muscle, bone-stress and cartilage injuries",
        "Functional and performance testing used in return-to-sport decisions",
        // Added 2026-11-04: depth from ABPTS outlines, APTA guidelines and StatPearls (see source header above ABPTS_OCS_TRACK).
        "Use the SCAT6 for sideline concussion assessment (Child SCAT6 for ages 5 to 12), remembering that over 90% of concussions occur without loss of consciousness", // SP-CONC
        "After a head injury, send to emergency care for severe headache, seizures, focal deficits, loss of consciousness or worsening mental status, and consider cervical spine injury, intracranial bleeding and skull fracture", // SP-CONC
        "Recognize stress fractures as overload injuries, about 20% of sports medicine injuries; flag high-risk sites (femoral neck, anterior tibia, tarsal navicular, talus, sesamoids, 5th metatarsal) where non-union risk is high", // SP-SF
        "Recognize medial tibial stress syndrome as repetitive-loading pain along the tibial border that sits at the early end of a continuum that can progress to tibial stress fracture", // SP-MTSS
        "Know that a fall in FEV1 of 10% or more after an exercise challenge confirms exercise-induced bronchoconstriction, graded mild, moderate or severe by the size of the fall", // SP-EIB
        "Recognize hamstring strain in sports with high-speed running such as sprinting, soccer and football, knowing every hamstring muscle crosses hip and knee except the short head of biceps femoris", // SP-HAM
      ],
    },
    {
      title: "Patient and client clinical intervention",
      weight: 35,
      gate: "Design a rehabilitation and return-to-activity progression with objective criteria for each phase, and state the emergency plan for the venue.",
      objectives: [
        "Rehabilitation and return-to-activity progression with criterion-based phases",
        "Injury prevention programs and the epidemiology that justifies them",
        "Emergency management and athlete safety: spine-injury management, sudden cardiac arrest, heat illness and the emergency action plan",
        "Sports performance and enhancement: strength, power, speed and agility training",
        "Nutrition, fluids, supplements, ergogenic aids and drugs: what affects performance and recovery and the rules around them",
        "Non-emergency medical conditions in athletes: skin, respiratory, gastrointestinal and the female athlete triad / relative energy deficiency in sport",
        // Added 2026-11-04: depth from ABPTS outlines, APTA guidelines and StatPearls (see source header above ABPTS_OCS_TRACK).
        "Recognize exertional heat stroke (core temperature usually above 40 C with CNS dysfunction such as confusion, ataxia or seizures), cool by ice-water immersion, and track rectal temperature, stopping at 38 to 39 C", // SP-HS
        "Recognize exercise-associated hyponatremia (serum sodium below 135 mmol/L during or up to 24 hours after exercise) and its usual cause, drinking too much hypotonic fluid during long exertion", // SP-EAH
        "Treat a collapse from commotio cordis as a ventricular fibrillation arrest: reported survival has risen in recent years with better recognition and early treatment", // SP-CC
        "Manage concussion with relative rest for the first 24 to 48 hours, then a stepwise return to activity with monitoring; no return to play until a medical provider clears the athlete", // SP-CONC
        "Counsel athletes on anabolic steroid misuse: higher cardiovascular risk and coronary disease, and left ventricular hypertrophy as a pathway to sudden death", // SP-AAS; SP-SDA
        "After infectious mononucleosis, counsel on splenic rupture risk (splenomegaly in about half) and hold contact sports until at least 4 weeks after symptom onset, once recovery is clinically complete", // SP-MONO
        "After ACL reconstruction, don't use functional knee braces routinely, and know AAOS prefers reconstruction over repair and early surgery when indicated, as cartilage and meniscal damage risk rises within 3 months", // AAOS-ACL
      ],
    },
    {
      title: "Patient outcomes",
      weight: 10,
      gate: "Select an outcome measure that captures sport-specific function and interpret the change it shows.",
      objectives: [
        "Patient-reported and performance-based outcome measures for athletes",
        "Using outcomes to inform return-to-play clearance and re-injury risk",
        // Added 2026-11-04: depth from ABPTS outlines, APTA guidelines and StatPearls (see source header above ABPTS_OCS_TRACK).
        "Use functional testing, such as hop tests, as one factor in return-to-sport decisions after ACL reconstruction; AAOS rates the evidence for this as limited", // AAOS-ACL
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Oncology. Approved 2016, first exam 2019, 281 certified as of July 2026.
// Knowledge 15%, professional roles 16%, patient management 69%. Extra
// eligibility: one case report (patient seen within 3 years).
// ---------------------------------------------------------------------------
export const ABPTS_ONC_TRACK: SeedTrack = {
  ...COMMON,
  code: "ABPTSONC",
  title: "Oncologic Clinical Specialist Coach",
  description:
    "ABPTS board certification in oncologic physical therapy: intervention and instruction (27%) and examination (23%) for people living with and beyond cancer, across treatment effects, lymphedema, fatigue and survivorship.",
  sourceUrl:
    "https://specialization.apta.org/become-a-specialist/oncology/specialist-certification-examination-outline-oncology",
  credential: abptsCredential({
    slug: "oncologic-clinical-specialist",
    name: "Board-Certified Clinical Specialist in Oncologic Physical Therapy",
    url: "https://specialization.apta.org/become-a-specialist/oncology",
    outlineUrl:
      "https://specialization.apta.org/become-a-specialist/oncology/specialist-certification-examination-outline-oncology",
    extraEligibility: "Also requires one case report on a patient seen within the last 3 years.",
  }),
  units: [
    {
      title: "Knowledge areas: foundation, behavioral and clinical sciences",
      weight: 15,
      gate: "Explain how a specific cancer treatment produces the impairment in front of you, and the precaution it creates for exercise.",
      objectives: [
        "Cancer biology, staging and the natural history of common cancers",
        "Effects of surgery, chemotherapy, radiation, hormonal and immunotherapy on the musculoskeletal, neurologic, cardiopulmonary and integumentary systems",
        "Behavioral sciences: distress, fear of recurrence, body image and family dynamics in cancer care",
        "Laboratory values, bone metastasis and other precautions that govern exercise safety in oncology",
        // Added 2026-11-04: depth from ABPTS outlines, APTA guidelines and StatPearls (see source header above ABPTS_OCS_TRACK).
        "Know that bone is the third most common site of metastasis after lung and liver, that most bone metastases come from breast, prostate or lung primaries, and that they bring severe pain and fracture risk", // SP-BM
        "Explain anthracycline cardiotoxicity as dose-dependent, cumulative and irreversible heart muscle loss that can present as reduced exercise tolerance and fatigue", // SP-ANTH
        "Separate primary lymphedema (congenital or genetic) from secondary lymphedema (surgery, radiation, infection, trauma, malignancy); cancer treatment is the main cause in developed countries", // SP-LYM
        "Explain cancer cachexia as ongoing loss of skeletal muscle (with or without fat) that standard nutrition can't fully reverse, as ASCO defines it, and why it limits function", // SP-CACH
      ],
    },
    {
      title: "Professional roles, responsibilities and values",
      weight: 16,
      gate: "Describe the oncology specialist's role in advocacy, consultation and evidence-based practice across the cancer continuum.",
      objectives: [
        "Professional behavior, development and communication in oncology settings, including palliative and end-of-life care",
        "Social responsibility, leadership, education and advocacy for rehabilitation access in cancer care",
        "Administration and consultation within cancer programs",
        "Evidence-based practice in oncology rehabilitation",
        // Added 2026-11-04: depth from ABPTS outlines, APTA guidelines and StatPearls (see source header above ABPTS_OCS_TRACK).
        "Coordinate post-operative exercise and return to activity with the interprofessional team after breast cancer surgery, building a tailored program and watching for adverse events", // BCRL-CPG
        "Support prospective surveillance for breast cancer lymphedema: a preoperative baseline, then bioimpedance or volume checks every 3 months in year one and twice a year for up to 5 years", // BCRL-CPG
        "Use the cancer-related fatigue guideline's A-rated tools, such as the EORTC QLQ-C30 screen and the Piper, FACIT-Fatigue and PROMIS Fatigue-SF assessments, and pick consistent tools across survivorship care", // CRF-CPG
      ],
    },
    {
      title: "Examination and reexamination",
      weight: 23,
      gate: "Select the examination that establishes safety to proceed and quantifies the impairment for a patient at a stated point in treatment.",
      objectives: [
        "Screening for red flags: metastatic disease, spinal cord compression, deep vein thrombosis, febrile neutropenia",
        "Examination of cancer-related fatigue, chemotherapy-induced peripheral neuropathy and cognitive change",
        "Lymphedema examination, limb volume measurement and staging",
        "Examination of shoulder, trunk and pelvic function after breast, head and neck, thoracic and pelvic cancer treatment",
        "Cardiopulmonary and functional examination for exercise prescription during and after treatment",
        // Added 2026-11-04: depth from ABPTS outlines, APTA guidelines and StatPearls (see source header above ABPTS_OCS_TRACK).
        "Treat new back pain in anyone with a cancer history as possible metastatic cord compression: back pain is the presenting symptom in 80 to 95%, often constant, worse at night and with coughing or sneezing", // SP-SCC
        "Escalate cord compression signs right away: bilateral leg symptoms, patchy weakness, multi-dermatome sensory loss, urinary retention or incontinence, fecal incontinence and gait change", // SP-SCC
        "Recognize febrile neutropenia (temperature of 38.3 C once or 38 C sustained for an hour, with ANC below 1500) as an emergency; ANC below 500 is severe and below 100 profound", // SP-FN
        "Know thrombocytopenia starts below 150,000/uL and the mild band (100,000-150,000) is usually symptom-free, while the link between count and bleeding risk is not settled", // SP-PLT
        "Investigate self-reported swelling, heaviness or numbness in anyone at risk of upper-quadrant lymphedema, and use the Norman Questionnaire or Morbidity Screening Tool if a questionnaire helps", // LYMDX-CPG
        "Use bioimpedance to catch early breast-cancer lymphedema (L-Dex over 10 above a preoperative baseline, or over 7.1 without one); use volume, not bioimpedance, once fibrosis sets in", // LYMDX-CPG
        "Calculate limb volume from circumferential measures: a difference of 200 mL or more, or a ratio over 1.04, helps rule lymphedema in but a smaller difference can't rule it out; use the same method every time", // LYMDX-CPG
        "Examine for lymphedema signs: distal-onset asymmetric swelling, a positive Stemmer sign (skin at the base of the second toe or finger can't be pinched) and pitting that turns non-pitting as fibrosis advances", // SP-LYM
        "Screen for trismus after head and neck cancer treatment (seen in 38% to 42% of patients), and flag atypical features such as opening under 15 mm, no clicking history or lymphadenopathy for referral", // SP-TRIS
      ],
    },
    {
      title: "Evaluation, diagnosis and prognosis",
      weight: 14,
      gate: "State the movement diagnosis and a prognosis for a patient at a given stage of treatment or survivorship, naming what limits it.",
      objectives: [
        "Integrating oncologic history, treatment phase and comorbidities into a movement-system diagnosis",
        "Prognosis during active treatment, in survivorship and in advanced disease",
        "Differentiating treatment-related impairment from disease progression and other causes",
        // Added 2026-11-04: depth from ABPTS outlines, APTA guidelines and StatPearls (see source header above ABPTS_OCS_TRACK).
        "Weigh pathologic fracture risk in bone metastasis (about 8% of patients sustain one) and know impending or actual fractures usually get fixed surgically with chemotherapy or radiotherapy", // SP-PATHFX; SP-BM
        "Stage breast-cancer lymphedema with the International Society of Lymphology model, from at risk and subclinical stage 0 (impaired transport, no visible swelling) through stages I to III", // BCRL-CPG
      ],
    },
    {
      title: "Intervention and instruction",
      weight: 27,
      gate: "Prescribe exercise with dose and precautions for a specific cancer, treatment and lab picture, and state the instruction the patient needs.",
      objectives: [
        "Exercise prescription during and after treatment, including dosing with low blood counts, bone metastasis and cardiotoxicity",
        "Complete decongestive therapy and long-term management of lymphedema",
        "Management of cancer-related fatigue, neuropathy, pain and radiation fibrosis",
        "Rehabilitation after breast, head and neck, thoracic, abdominal and pelvic cancer surgery",
        "Prehabilitation, palliative rehabilitation and patient and caregiver instruction",
        // Added 2026-11-04: depth from ABPTS outlines, APTA guidelines and StatPearls (see source header above ABPTS_OCS_TRACK).
        "Start supervised, individualized progressive resistance training at least 1 month after breast cancer surgery, add aerobic exercise, and monitor tolerance at least weekly at first", // BCRL-CPG
        "Treat breast-cancer lymphedema with complete decongestive therapy built on compression bandaging and exercise, tailored to stage; shortening or dropping manual lymphatic drainage may give similar long-term results", // BCRL-CPG
        "After axillary node dissection, add a fitted compression garment with arm exercise and diaphragmatic breathing for high-risk patients; therapist-provided MLD may not reduce lymphedema risk", // BCRL-CPG
        "Move stable lymphedema to home care (self-MLD, fitted garment, night compression when indicated, exercise); kinesiotape doesn't replace short-stretch bandaging, and acupuncture lacks evidence for volume", // BCRL-CPG
        "For subclinical lymphedema, start with education, self-massage and compression garments, moving to complete decongestive therapy if it persists or progresses", // BCRL-CPG
      ],
    },
    {
      title: "Outcomes",
      weight: 5,
      gate: "Choose an outcome measure appropriate to this patient's treatment stage and state what change is meaningful.",
      objectives: [
        "Outcome measures for fatigue, function, lymphedema and quality of life in oncology",
        "Using outcomes across the cancer continuum to guide the plan and communicate with the oncology team",
        // Added 2026-11-04: depth from ABPTS outlines, APTA guidelines and StatPearls (see source header above ABPTS_OCS_TRACK).
        "Track lymphedema outcomes by monitoring volume changes during follow-up, using the same measurement method at every time point", // BCRL-CPG; LYMDX-CPG
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Clinical Electrophysiology. The only outline that publishes item counts
// per area (200 total). Extra eligibility: documented learning experiences
// with a board-certified PT or physician, three patient reports, and a log
// of the 500 most recent electrodiagnostic examinations.
// ---------------------------------------------------------------------------
export const ABPTS_ECS_TRACK: SeedTrack = {
  ...COMMON,
  code: "ABPTSECS",
  title: "Clinical Electrophysiologic Specialist Coach",
  description:
    "ABPTS board certification in clinical electrophysiologic physical therapy: electrodiagnostic tests and measures (15%) and the evaluation of normal and abnormal electrophysiologic findings (25%), on the outline's own 200-item blueprint.",
  sourceUrl:
    "https://specialization.apta.org/become-a-specialist/clinical-electrophysiology/specialist-certification-examination-outline-clinical-electrophysiology",
  credential: abptsCredential({
    slug: "clinical-electrophysiologic-specialist",
    name: "Board-Certified Clinical Specialist in Clinical Electrophysiologic Physical Therapy",
    url: "https://specialization.apta.org/become-a-specialist/clinical-electrophysiology",
    outlineUrl:
      "https://specialization.apta.org/become-a-specialist/clinical-electrophysiology/specialist-certification-examination-outline-clinical-electrophysiology",
    extraEligibility:
      "Also requires one to three documented learning experiences with a board-certified PT or physician within 10 years with an oversight letter, three patient reports (radiculopathy, peripheral nerve entrapment, polyneuropathy), and a log of the 500 most recently completed electrodiagnostic examinations within the last 10 years.",
  }),
  units: [
    {
      title: "Anatomy, neuroscience and physiology",
      rangeLabel: "42 of 200 items",
      weight: 21,
      gate: "Trace a nerve from root to muscle and predict which studies change, and how, when a lesion sits at a named point.",
      objectives: [
        "Peripheral nerve anatomy: roots, plexus, named nerves and the muscles each supplies",
        "Neuroscience of axonal conduction, demyelination and the neuromuscular junction",
        "Physiology of the motor unit, membrane potentials and the basis of evoked responses",
        // Added 2026-11-04: depth from ABPTS outlines, APTA guidelines and StatPearls (see source header above ABPTS_OCS_TRACK).
        "Explain what each nerve conduction measure reflects: SNAP amplitude tracks the number of sensory axons, while CMAP amplitude reflects motor axons, muscle and the neuromuscular junction together", // SP-NCS
        "Know the presynaptic versus postsynaptic split at the neuromuscular junction: Lambert-Eaton syndrome and botulism affect the presynaptic membrane, and Lambert-Eaton is strongly linked to small cell carcinoma", // SP-EDX-NMJ
        "Explain Seddon's nerve injury grades and later systems (Sunderland's five grades, Mackinnon), and the Wallerian degeneration that follows any injury worse than a conduction block", // SP-PNI
        "Explain why fibrillation potentials mean lost innervation: single muscle fibers firing on their own after denervation, injury or regeneration, with a 'rain on the roof' sound", // SP-ASA
      ],
    },
    {
      title: "Clinical sciences, critical inquiry and professional roles",
      rangeLabel: "38 of 200 items",
      weight: 19,
      gate: "Explain the clinical science behind an electrodiagnostic referral and the standards governing how the study is performed and reported.",
      objectives: [
        "Clinical sciences of entrapment neuropathy, radiculopathy, polyneuropathy, motor neuron disease, myopathy and neuromuscular junction disorders",
        "Critical inquiry: reference values, sensitivity and specificity of electrodiagnostic tests",
        "Professional roles and responsibilities: scope, safety, infection control and reporting standards in electrodiagnosis",
        // Added 2026-11-04: depth from ABPTS outlines, APTA guidelines and StatPearls (see source header above ABPTS_OCS_TRACK).
        "Screen before testing: avoid studies over open skin infection, burns, recent grafts or casts; defer or limit needle EMG with platelets below 50,000; treat lymphedema as no contraindication to needle EMG, weighing the risk against what the study adds; and avoid testing with external temporary pacemakers", // SP-NCS; AANEM-EMG-2005 (REQ-173: Galloway et al., AANEM position statement, "Needle EMG in certain uncommon clinical contexts", Muscle Nerve 2005;31:398, doi 10.1002/mus.20238, read 2026-11-09 -- no contraindication in lymphedema, judge each case; AANEM 2021 bleeding-risk guidance -- caution below 50,000 platelets)
        "Lower bleeding risk in needle EMG for patients on anticoagulants or with bleeding tendencies: use the smallest-gauge needle, limit needle insertions, and skip deep muscles that can't be compressed or that lie near large vessels", // SP-NCS
      ],
    },
    {
      title: "Examination: history, systems review and tests and measures",
      rangeLabel: "40 of 200 items",
      weight: 20,
      gate: "Plan an electrodiagnostic study for a referral question: which nerves, which muscles, which techniques, and why.",
      objectives: [
        "History, systems review and reexamination that focus an electrodiagnostic study",
        "Nerve conduction studies: motor, sensory, late responses and repetitive stimulation technique",
        "Needle electromyography technique and muscle selection for a stated question",
        "Somatosensory and other evoked potentials and their indications",
        // Added 2026-11-04: depth from ABPTS outlines, APTA guidelines and StatPearls (see source header above ABPTS_OCS_TRACK).
        "Control limb temperature during nerve conduction studies (about 30 to 36 C for arm and leg); cold raises amplitude, lengthens latency, slows conduction and hides an RNS decrement", // SP-NCS; SP-EDX-NMJ
        "Perform repetitive nerve stimulation at a slow rate (about 3 Hz, 5 to 10 stimuli) and treat a CMAP decrement over 10% as significant; add brief exercise and repeat to show post-exercise facilitation or exhaustion", // SP-EDX-NMJ; SP-RNS
        "Time a study around nerve injury: fibrillation potentials usually show on EMG at 3 to 4 weeks, and no sign of reinnervation by 3 to 4 months raises concern for neurotmesis and surgical exploration", // SP-PNI
        "For suspected AIDP, delay NCS and EMG until at least 3 weeks after onset and include F-waves, which can pick up early proximal root involvement", // SP-EDX-AIDP
      ],
    },
    {
      title: "Evaluation: normal and abnormal electrophysiologic characteristics",
      rangeLabel: "50 of 200 items",
      weight: 25,
      gate: "Read a set of nerve conduction and EMG findings, say whether each is normal, and localize and characterize the lesion the abnormalities describe.",
      objectives: [
        "Normal electrophysiologic values and the technical and physiologic factors that alter them",
        "Interpreting abnormal findings: axonal versus demyelinating, focal versus diffuse, acute versus chronic",
        "Patterns in carpal tunnel and cubital tunnel syndrome, radiculopathy, polyneuropathy, motor neuron disease, myopathy and myasthenia gravis",
        // Added 2026-11-04: depth from ABPTS outlines, APTA guidelines and StatPearls (see source header above ABPTS_OCS_TRACK).
        "Know that in carpal tunnel syndrome sensory fibers are hit before motor ones, so SNAPs are often the first values to change", // SP-EDX-CTS
        "Localize ulnar neuropathy at the elbow by focal slowing of motor conduction across the elbow, with or without conduction block, and watch for a Martin-Gruber-type median-to-ulnar crossover that can mimic a block", // SP-EDX-UN
        "Separate fibular neuropathy from L5 radiculopathy: L5 also weakens ankle inversion, so sample tibialis posterior or gluteus medius, which have L5 supply but not fibular nerve supply", // SP-EDX-PER
        "Confirm cervical radiculopathy on EMG with changes in a paraspinal muscle plus two muscles from different nerves sharing the root; early radiculopathy may show only sensory or demyelinating change, so EMG can miss acute cases", // SP-EDX-CR
        "Recognize demyelinating patterns on NCS: prolonged distal latencies, slowed conduction velocity, temporal dispersion and conduction block, with prolonged F-wave and H-reflex latencies", // SP-NCS; SP-EDX-AIDP
        "Recognize myopathic needle EMG: early (rapid) recruitment and polyphasic units, with spontaneous fibrillations, positive sharp waves, complex repetitive discharges or 'dive bomber' myotonic discharges in some disorders", // SP-EDX-MYO
        "Recognize Lambert-Eaton on RNS: a decrement at low rates and a large incremental CMAP rise after high-rate stimulation or brief exercise", // SP-LEMS
      ],
    },
    {
      title: "Diagnosis, prognosis and interventions",
      rangeLabel: "30 of 200 items",
      weight: 15,
      gate: "Write the electrodiagnostic impression, state the prognosis it implies, and the communication and instruction the patient and referrer need.",
      objectives: [
        "Formulating the electrodiagnostic diagnosis and the differential it supports",
        "Prognosis from the severity and chronicity of electrophysiologic findings",
        "Coordination, communication and documentation of the study and its results",
        "Patient and client-related instruction following electrodiagnostic evaluation",
        // Added 2026-11-04: depth from ABPTS outlines, APTA guidelines and StatPearls (see source header above ABPTS_OCS_TRACK).
        "Prognose from axonal versus demyelinating injury: reduced CMAP amplitude means axons are lost, while slowing points to demyelination, and EDX can also show whether injury is focal, multifocal or generalized", // SP-NCS
        "Use EDX to tell preganglionic (root) from postganglionic (plexus) brachial plexus injury, and add somatosensory evoked potentials when the central sensory pathway needs testing", // SP-EDX-BP
        "Know that CIDP needs symptoms present for at least 8 weeks, typically with symmetric motor-predominant weakness, loss of vibration and position sense and areflexia", // SP-CIDP
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Pelvic and Women's Health. Formerly "Women's Health" -- formal title
// change September 2025, credential now "Board-Certified Pelvic & Women's
// Health Clinical Specialist (PWCS)". Approved 2006, first exam 2009, 1,005
// certified as of July 2026. ~200 items. Extra eligibility: one case
// reflection (patient seen within 3 years).
//
// The outline's section II sub-items sum to 96% against a stated 55%
// section total -- a discrepancy in ABPTS's own page, noted here rather
// than corrected. Units carry the three section totals (20/55/25) and the
// condition table is folded into the management objectives.
// ---------------------------------------------------------------------------
export const ABPTS_PWCS_TRACK: SeedTrack = {
  ...COMMON,
  code: "ABPTSPWCS",
  title: "Pelvic & Women's Health Clinical Specialist (PWCS) Coach",
  description:
    "ABPTS board certification in pelvic and women's health physical therapy (renamed from Women's Health in September 2025): patient and client management across pelvic floor dysfunction, urinary and bowel dysfunction, pregnancy and postpartum, lymphedema and sexual dysfunction.",
  sourceUrl:
    "https://specialization.apta.org/become-a-specialist/pelvic-womens-health/specialist-certification-examination-outline-womens-health",
  credential: abptsCredential({
    slug: "pelvic-womens-health-clinical-specialist",
    name: "Board-Certified Pelvic & Women's Health Clinical Specialist (PWCS)",
    url: "https://specialization.apta.org/become-a-specialist/pelvic-womens-health",
    outlineUrl:
      "https://specialization.apta.org/become-a-specialist/pelvic-womens-health/specialist-certification-examination-outline-womens-health",
    extraEligibility:
      "Also requires one case reflection demonstrating specialty practice, based on a patient seen within the last 3 years.",
  }),
  units: [
    {
      title: "Knowledge areas: foundation, clinical and behavioral sciences",
      weight: 20,
      gate: "Explain the pelvic anatomy, hormonal physiology or psychosocial factor behind a presentation, not just the symptom.",
      objectives: [
        "Pelvic floor, abdominal wall and lumbopelvic anatomy and neurophysiology",
        "Physiology of pregnancy, postpartum, menopause and hormonal change and their musculoskeletal effects",
        "Clinical sciences of pelvic organ prolapse, chronic pelvic pain, endometriosis, interstitial cystitis, osteoporosis and fibromyalgia",
        "Behavioral sciences: trauma-informed care, sexual health and the psychosocial dimensions of pelvic conditions",
        // Added 2026-11-04: depth from ABPTS outlines, APTA guidelines and StatPearls (see source header above ABPTS_OCS_TRACK).
        "Name the five main types of urinary incontinence (stress, urge, mixed, overflow, functional) and the leakage pattern of each, such as stress leakage with coughing, sneezing, laughing or straining", // SP-UI; SP-SUI
        "Know the anal sphincters' roles: the internal sphincter (enteric nerves) gives about 80% to 85% of resting tone, while the external sphincter (pudendal nerve) holds continence during coughing or lifting", // SP-FI
        "Know vaginal childbirth is the biggest risk factor for pelvic organ prolapse, especially with high parity, large babies, forceps delivery and prolonged labor", // SP-POP
        "Know dyspareunia is superficial (vulva or vaginal entrance) or deep (deeper vagina and lower pelvis), now grouped with vaginismus in DSM-5-TR, and can involve overactive pelvic floor muscles", // SP-DYSP
      ],
    },
    {
      title: "Patient and client management",
      weight: 55,
      gate: "Screen a pelvic health referral for conditions outside PT scope, then examine, diagnose and treat the pelvic floor or pregnancy-related problem with a specific, dosed intervention.",
      objectives: [
        "Screening for medical conditions requiring referral in pelvic and women's health, the outline's largest single area",
        "Internal and external pelvic floor examination, musculoskeletal examination and evaluation",
        "Diagnosis and prognosis in pelvic floor dysfunction and pain (26% of conditions): prolapse, chronic pelvic pain, endometriosis, cystitis",
        "Musculoskeletal dysfunction (26%): osteoporosis, fibromyalgia, pelvic girdle pain and post-surgical dysfunction",
        "Urinary dysfunction (15%): incontinence, retention and urgency, including bladder training and pelvic floor muscle training",
        "Pregnancy and postpartum (12%): musculoskeletal dysfunction, high-risk pregnancy precautions and return to activity",
        "Bowel dysfunction (5%), lymphedema (5%) and sexual dysfunction (5%): examination and intervention",
        "Other conditions (6%): cardiovascular, hormonal, oncologic, autoimmune and neurologic conditions in pelvic health practice",
        "Procedural interventions, coordination, communication, documentation and outcome measurement",
        // Added 2026-11-04: depth from ABPTS outlines, APTA guidelines and StatPearls (see source header above ABPTS_OCS_TRACK).
        "Define chronic pelvic pain as persistent or recurrent pelvic pain over 3 to 6 months, diagnosed largely from history and examination", // SP-CPP
        "Stage pelvic organ prolapse with the POP-Q system or Baden-Walker grading, and offer pelvic floor muscle training or a pessary as conservative options", // SP-POP
        "Teach pelvic floor muscle (Kegel) exercises well: find the muscles that slow urine flow, avoid substituting hip adductors, abdominals or glutes, mix fast and slow contractions, and use a perineometer or biofeedback to guide", // SP-KEG
        "For stress incontinence, combine pelvic floor muscle training with lifestyle advice (weight loss, stopping smoking, treating constipation, avoiding bladder irritants), and use a cough stress test to show leakage", // SP-SUI
        "Recognize urge incontinence (frequency, urgency, nocturia) from detrusor overactivity or from neurological disease, for example stroke, Parkinson disease or multiple sclerosis", // SP-UI
        "In interstitial cystitis/bladder pain syndrome, avoid standard pelvic floor strengthening such as Kegels, which can worsen symptoms; use bladder training with urge suppression and dietary-irritant avoidance", // SP-IC
        "Treat dyspareunia as a team, with pelvic floor physical therapy alongside education, lubricants, hormone therapy and psychosocial care, using graduated vaginal dilators to assess tolerance", // SP-DYSP
        "Recognize pudendal neuralgia from perineal pain made worse by sitting, a clinical diagnosis guided by the Nantes criteria", // SP-PN
        "Diagnose functional constipation with the Rome IV criteria and start with dietary and lifestyle change: more fiber, adequate fluid and less sedentary behavior", // SP-CON
        "Prescribe exercise in pregnancy (about 150 minutes a week of moderate activity, checked with the talk test), avoiding the supine position, contact sports, fall-risk sports and altitude changes such as scuba diving", // SP-PREG
        "Stop exercise in pregnancy for warning signs (painful contractions, vaginal bleeding, dyspnea, dizziness, headache, chest or calf pain) and respect absolute contraindications such as placenta previa, preterm labor and preeclampsia", // SP-PREG
        "Assess diastasis recti, treating an inter-rectus distance over 2 cm at the midline as abnormal, and discuss options from conservative exercise programs to surgery", // SP-DRA
      ],
    },
    {
      title: "Professional practice expectations",
      weight: 25,
      gate: "Apply evidence, cultural humility and advocacy to a pelvic health scenario, naming the specific professional expectation involved.",
      objectives: [
        "Critical inquiry, clinical decision-making and evidence-based practice in pelvic health (the largest professional area at 8%)",
        "Communication, individual and cultural differences and trauma-informed professional behavior",
        "Education, leadership, social responsibility and advocacy for pelvic health access",
        "Administration and consultation in pelvic and women's health services",
        // Added 2026-11-04: depth from ABPTS outlines, APTA guidelines and StatPearls (see source header above ABPTS_OCS_TRACK).
        "Address lack of motivation and inconsistent technique, the main barriers to sticking with pelvic floor muscle training, through education and follow-up", // SP-SUI
        "Work within the dyspareunia care team (sexual health counselors, clinical psychologists, pelvic floor physical therapists and pain specialists) and refer across it", // SP-DYSP
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Wound Management. The newest specialty: approved 2019, first exam 2022,
// 38 certified as of July 2026. Knowledge areas 32%, professional roles
// 5%, patient management 63%. Extra eligibility: one case report plus
// current CPR.
// ---------------------------------------------------------------------------
export const ABPTS_WMS_TRACK: SeedTrack = {
  ...COMMON,
  code: "ABPTSWMS",
  title: "Wound Management Clinical Specialist Coach",
  description:
    "ABPTS board certification in wound management physical therapy: wound clinical sciences, examination, evaluation and diagnosis (12-13% each) and interventions (14%) for pressure, vascular, neuropathic, surgical and burn wounds.",
  sourceUrl:
    "https://specialization.apta.org/become-a-specialist/wound-management/specialist-certification-examination-outline-wound-management",
  credential: abptsCredential({
    slug: "wound-management-clinical-specialist",
    name: "Board-Certified Wound Management Clinical Specialist",
    url: "https://specialization.apta.org/become-a-specialist/wound-management",
    outlineUrl:
      "https://specialization.apta.org/become-a-specialist/wound-management/specialist-certification-examination-outline-wound-management",
    extraEligibility:
      "Also requires one case report on a patient seen within the last 3 years and current CPR certification (AHA BLS or Red Cross Professional Rescuer).",
  }),
  units: [
    {
      title: "Foundation sciences: biological and physical",
      weight: 10,
      gate: "Explain the phase of healing a wound is in from its appearance, and the physical or biological factor stalling it.",
      objectives: [
        "Skin anatomy and the phases of wound healing",
        "Physiology of perfusion, oxygenation, edema and infection as they govern healing",
        "Physical agents in wound care: electrical stimulation, ultrasound, negative-pressure wound therapy and their mechanisms",
        // Added 2026-11-04: depth from ABPTS outlines, APTA guidelines and StatPearls (see source header above ABPTS_OCS_TRACK).
        "Name the four overlapping phases of healing (hemostasis, inflammation, proliferation, remodeling) and what marks each, from the fibrin plug to granulation tissue and epithelialization", // SP-WHP
        "Know that remodeling starts around week 3 and can run up to 12 months, and a healed scar regains only about 80% of the skin's original tensile strength", // SP-WHPH
        "Explain how smoking slows healing: carbon monoxide binds hemoglobin about 200 times more tightly than oxygen, cutting the oxygen delivered to the wound", // SP-IWH
        "Explain how negative pressure wound therapy works (porous foam under suction, set up to about 125 mm Hg) and what it does: better perfusion, less edema and changed wound fluid", // SP-NPWT
      ],
    },
    {
      title: "Behavioral sciences",
      weight: 5,
      gate: "Identify the behavioral or social factor most likely to decide whether this wound heals, and what to do about it.",
      objectives: [
        "Adherence, self-management and caregiver capacity in wound care",
        "Nutrition, smoking, mental health and social determinants affecting healing",
        // Added 2026-11-04: depth from ABPTS outlines, APTA guidelines and StatPearls (see source header above ABPTS_OCS_TRACK).
        "Explain how diabetes impairs immunity at several points in the healing cascade, so diabetic wounds are prone to chronic infection, and build glycemic control into the plan", // SP-IWH; SP-DFU
      ],
    },
    {
      title: "Wound management clinical sciences",
      weight: 12,
      gate: "Differentiate the etiology of a wound from its history, location and appearance, and name the comorbidity driving it.",
      objectives: [
        "Pressure injuries: etiology, staging and risk assessment",
        "Arterial, venous and mixed vascular wounds and lymphedema-related skin change",
        "Neuropathic and diabetic foot wounds, including offloading principles",
        "Surgical, traumatic and burn wounds and atypical wounds requiring referral",
        "Infection, biofilm, osteomyelitis and the laboratory and imaging findings that identify them",
        // Added 2026-11-04: depth from ABPTS outlines, APTA guidelines and StatPearls (see source header above ABPTS_OCS_TRACK).
        "Stage pressure injuries using the NPIAP system: stage 1 non-blanchable redness on intact skin, stage 2 partial-thickness loss or blister, stage 3 full-thickness with fat visible, stage 4 exposed muscle, tendon, ligament or bone", // SP-PI
        "Recognize deep tissue pressure injury (intact skin with dark purple or maroon discoloration), unstageable injury (full thickness hidden by slough or eschar) and injuries under medical devices", // SP-PI
        "Recognize a venous leg ulcer, the most common chronic lower-limb wound: gaiter-area location with edema, brown-orange hyperpigmentation, stasis dermatitis, atrophie blanche and lipodermatosclerosis", // SP-VLU
        "Recognize arterial disease: claudication relieved by rest, then ischemic forefoot rest pain when the legs are raised that eases with the foot dependent; arterial ulcers are deep, dry and sit on toes, dorsum or anterior leg", // SP-PAD; SP-VLU
        "Recognize atypical wounds: calciphylaxis (painful lesions from arteriolar calcification, most often in end-stage renal disease) and pyoderma gangrenosum, linked to inflammatory bowel disease and worsened by trauma (pathergy)", // SP-CALC; SP-PG
        "Classify burn depth from appearance, blanching, pain and sensation: superficial burns stay in the epidermis and heal in 5 to 10 days without scarring; full-thickness burns go through epidermis and dermis", // SP-BURN
      ],
    },
    {
      title: "Clinical inquiry for evidence-based practice and professional roles",
      weight: 10,
      gate: "Appraise wound-care evidence and describe the specialist's role in the interprofessional wound team.",
      objectives: [
        "Critical appraisal of wound-care evidence and guidelines",
        "Professional roles: consultation, documentation, regulatory requirements and interprofessional wound care",
        // Added 2026-11-04: depth from ABPTS outlines, APTA guidelines and StatPearls (see source header above ABPTS_OCS_TRACK).
        "Apply the APTA diabetic foot ulcer guideline: prescribe exercise that keeps cardiovascular and muscular fitness while minimizing weight bearing, adding an assistive device when it helps balance and unloading", // DFU-CPG
        "For adults with diabetes who can exercise safely, prescribe progressive moderate- to vigorous-intensity aerobic and resistance training (the guideline's one strong recommendation) and consider activity-monitor counseling", // DFU-CPG
      ],
    },
    {
      title: "Examination and evaluation",
      weight: 25,
      gate: "Measure and describe a wound completely, examine the perfusion and sensation around it, and interpret what the findings mean for healing potential.",
      objectives: [
        "Wound measurement, tissue type, exudate, periwound and photography standards",
        "Vascular examination: pulses, ankle-brachial index, toe pressures and capillary refill",
        "Sensory, pressure-mapping, nutritional and mobility examination relevant to wound risk",
        "Evaluating healing trajectory and the factors predicting non-healing",
        // Added 2026-11-04: depth from ABPTS outlines, APTA guidelines and StatPearls (see source header above ABPTS_OCS_TRACK).
        "Assess risk with the Braden scale's six areas (sensory perception, moisture, activity, mobility, nutrition, friction and shear), plus nutrition, hydration, cognition and mobility", // SP-PI
        "Measure the ankle-brachial index correctly: use the highest ankle systolic pressure over the higher brachial pressure, measuring both arms, and suspect falsely high values in calcified vessels (diabetes, CKD, old age)", // SP-PAD; SP-NIPAD
        "Use toe-brachial index and pedal Doppler waveforms with the ABI when vessels may be calcified, and treat ankle pressure below 50 mm Hg or ABI below 0.5 as a sign of poor healing and higher amputation risk", // SP-DFU
        "Examine the diabetic foot for Charcot neuroarthropathy (midfoot collapse, rocker-bottom deformity, redness, warmth) and use the probe-to-bone test when osteomyelitis is a concern", // SP-DFU
        "Remove barrier creams before assessing skin and check sites close to medical devices closely", // SP-PI
        "Measure physical fitness in adults with diabetes (flexibility, strength, cardiorespiratory fitness, balance and agility) and consider tracking activity such as step counts across the care continuum", // DFU-CPG
      ],
    },
    {
      title: "Diagnosis and prognosis",
      weight: 18,
      gate: "State the wound diagnosis and a realistic healing prognosis with timeline, and what would change it.",
      objectives: [
        "Diagnosis by etiology and the differential among vascular, pressure, neuropathic and atypical wounds",
        "Prognosis and expected healing timelines by wound type and comorbidity",
        "Recognizing wounds requiring surgical, vascular or oncologic referral",
        // Added 2026-11-04: depth from ABPTS outlines, APTA guidelines and StatPearls (see source header above ABPTS_OCS_TRACK).
        "Use the WIfI system (wound, ischemia, foot infection, each scored 0 to 3 and grouped into stages 1 to 4) to estimate one-year major amputation risk and whether revascularization will help", // SP-DFU
        "About 20% of people with venous leg ulcers also have arterial disease, so check pulses and ABI before compression and refer when calcification gives a falsely high reading", // SP-VLU
        "Suspect a non-venous cause (such as skin cancer or pyoderma gangrenosum, where biopsy is essential) when an ulcer shows excessive granulation, raised borders or no improvement with standard care", // SP-VLU
      ],
    },
    {
      title: "Interventions and outcomes",
      weight: 20,
      gate: "Select the debridement method, dressing, offloading and adjunct for a specific wound, and the outcome measure that will show it is healing.",
      objectives: [
        "Debridement methods: selective and non-selective, indications and contraindications",
        "Dressing selection matched to wound characteristics and moisture balance",
        "Compression therapy, offloading, positioning and support surfaces",
        "Adjunctive modalities and when the evidence supports them",
        "Outcome measurement: healing rate, wound area reduction and patient-reported outcomes",
        // Added 2026-11-04: depth from ABPTS outlines, APTA guidelines and StatPearls (see source header above ABPTS_OCS_TRACK).
        "Choose a debridement method (surgical/sharp, biological, enzymatic or autolytic), knowing autolytic is the most conservative and takes days, and larval therapy uses sterile Lucilia sericata larvae", // SP-DEB
        "Match dressing to wound: foam or alginate for moderate to heavy exudate (alginate also helps bleeding), hydrocolloid for minimal to moderate exudate but not necrotic or infected wounds, hydrogel for low-exudate ulcers; keep the bed moist, not macerated", // SP-DRESS
        "Before negative pressure wound therapy, debride necrotic tissue and treat infection; avoid it over malignancy, protect exposed vessels or bowel, and never apply it directly over a fistula", // SP-NPWT
        "Use high compression to knee height as the core venous ulcer treatment, drop to 20 mm Hg or less while waiting for vascular testing, and avoid it with arterial occlusion, ABPI under 0.5, heart failure or thrombosis", // SP-VLU
        "Offload forefoot and midfoot diabetic ulcers with nonremovable knee-high devices such as total contact casts; after closure, keep offloading for the first 3 months and reload gradually with a shoe-wear schedule", // SP-DFU; DFU-CPG
        "Use a silicone foam dressing for a moisture-balanced, non-infected pressure injury, and plan repositioning around the person's risk factors (malnutrition, anemia, age, cognition, sensation) instead of a fixed turning schedule", // SP-PI
      ],
    },
  ],
};

export const ABPTS_TRACKS: SeedTrack[] = [
  ABPTS_OCS_TRACK,
  ABPTS_GCS_TRACK,
  ABPTS_NCS_TRACK,
  ABPTS_CCS_TRACK,
  ABPTS_PCS_TRACK,
  ABPTS_SCS_TRACK,
  ABPTS_ONC_TRACK,
  ABPTS_ECS_TRACK,
  ABPTS_PWCS_TRACK,
  ABPTS_WMS_TRACK,
];
