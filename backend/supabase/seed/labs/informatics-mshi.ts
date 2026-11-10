import { GENERAL_SAFETY, part, type SeedLabSet } from "./types";
import { source } from "../sources";

// REQ-161: MS Health Informatics Coach (MSHI), the ten AMIA foundational
// domains F1-F10 as CAHIIM requires them (seed/tracks/informatics.ts).
//
// Density (docs/labs.md, "hybrid"): one lab per domain plus the six
// unweighted extras on the first six domains that have a second performance
// objective with room -> 1/2/2/2/2/2/1/1/1/1 = 15 labs. Each lab is a
// data-modelling, interoperability, privacy or implementation task an
// applied informatics program assesses by doing: classify data uses, model
// tables and write the join, judge free text against coded data, work a
// breach and an information-blocking request, write a FHIR resource, read
// an HL7 v2 result and map it, run a heuristic evaluation, work an EHR
// safety case, judge an mHealth app and design a PGHD flow, compute a
// critical path, design minimum-necessary access, write an SBAR, and plan
// a change with Kotter's model.
//
// Sources: the CAHIIM master's curriculum requirements (AMIA 2017 domains)
// recorded in the track; 45 CFR Part 164 Subparts D and E (eCFR, read
// 2026-11-07: Safe Harbor's 18 identifiers and the ZIP/age rules in
// 164.514(b)(2); breach presumption and four risk factors in 164.402;
// individual notice within 60 calendar days in 164.404(b); Secretary notice
// -- at once for 500 or more, annual log within 60 days of year end for
// fewer -- in 164.408; media notice above 500 residents of a State in
// 164.406; business-associate notice within 60 days in 164.410); 45 CFR
// Part 171 for the information-blocking exceptions named in the track
// (recorded 2026-10-31 and confirmed by the track's HTI-5 note; the fees
// exception's excluded fees, 171.302(b)(1)-(4), re-read 2026-11-09 on
// Cornell LII's copy of the CFR because eCFR was not reachable); HL7 FHIR
// (R5 is the current published release; R4 is what US Core and US rules
// use, so the FHIR lab stays on R4-compatible resource content) and the HL7
// v2 product brief; HealthIT.gov SAFER Guides; AHRQ's workflow toolkit for
// critical-path and Gantt tools. The LOINC code in the HL7 v2 and FHIR labs
// is authored message content (fictional interface data) -- the lab grades
// the mapping, not the code's identity -- and a reviewer should confirm it
// against the LOINC table (loinc.org could not be fetched in the authoring
// session). The SQL in the data-modelling lab was run on SQLite 3.53 and the
// FHIR JSON was parsed, both 2026-11-07; the critical-path numbers were
// computed by script.
//
// SAFETY: this course sits in the healthcare-nursing category, so the
// server will frame its labs as clinical (acknowledgement and disclaimer).
// Every patient, organisation and dataset here is fictional and
// de-identified; no lab asks for or shows real patient details, and the
// privacy labs apply HIPAA's minimum-necessary standard rather than teaching
// workarounds.

const MSHI_SAFETY = `${GENERAL_SAFETY} Any patient data in these labs is fictional and de-identified; never enter real patient details.`;

export const MSHI_LABS: SeedLabSet = {
  trackCode: "MSHI",
  sources: [
    source("https://www.cahiim.org/wp-content/uploads/sites/2/2024/08/hi-ms-curriculum.pdf", "reference", "2026-11-07"),
    source("https://www.ecfr.gov/current/title-45/part-164", "reference", "2026-11-07"),
    source("https://www.ecfr.gov/current/title-45/part-171", "reference", "2026-11-07"),
    source("https://hl7.org/fhir/", "reference", "2026-11-07"),
    source("https://www.hl7.org/implement/standards/product_brief.cfm?product_id=185", "reference", "2026-11-07"),
    source("https://www.healthit.gov/topic/safety/safer-guides", "reference", "2026-11-07"),
    source("https://digital.ahrq.gov/health-it-tools-and-resources/evaluation-resources/workflow-assessment-health-it-toolkit", "reference", "2026-11-07"),
  ],
  labs: [
    // F1 Health -----------------------------------------------------------
    {
      slug: "primary-vs-secondary-use-requests",
      objective:
        "Primary and secondary use of health data: the same records serving direct care and also quality improvement, surveillance, planning and research",
      kind: "build",
      title: "Sort five requests for the same records",
      brief:
        "Cedar Basin Health (fictional, a 200-bed hospital) holds the EHR records of its diabetes clinic. In one week the informatics office receives five requests for those records: (1) the clinic's nurse wants today's patients' latest HbA1c values on her worklist; (2) the quality department wants the share of clinic patients with HbA1c above its target in each of the last four quarters; (3) the county health department asks for weekly counts of newly diagnosed diabetes by ZIP code; (4) a university team wants five years of visit, lab and medication data for a published study; (5) the finance office wants projected clinic volumes for next year's staffing plan. Classify each and say what each one should actually receive.",
      safetyNote: MSHI_SAFETY,
      steps: [
        {
          text: "",
          ask: "Classify the five requests, then specify what data each gets and why.",
          parts: [
            part(
              "Primary or secondary, and which secondary purpose",
              "Request 1 is primary use (direct care of the patient in front of the clinician). Requests 2-5 are secondary uses, named correctly: quality improvement/measurement (2), public-health surveillance (3), research (4), planning/operations (5).",
              "Only (1) is primary use: the record serves the care of the patient it is about. The other four reuse records collected for care: (2) quality improvement and measurement, (3) public-health surveillance, (4) research, (5) operational planning. Same rows, different purposes -- and the purpose decides the rules."
            ),
            part(
              "What each receives",
              "Matches the data to the purpose: (1) identified data for her own patients, limited to what the task needs; (2) aggregate rates, no names; (3) counts by ZIP, a reportable-condition flow, de-identified or as public-health law permits; (4) de-identified data (Safe Harbor's 18 identifiers removed, or expert determination) or a limited data set under a data use agreement, with IRB and governance approval; (5) aggregate volumes, no patient-level data.",
              "(1) Identified, patient-level values -- but only for the patients on her list and only the fields the worklist needs. (2) An aggregate: numerator and denominator per quarter; nobody in quality needs a name. (3) Weekly counts per ZIP code; identifiable case data moves to public health only through the lawful reporting channel. (4) A de-identified extract (remove all 18 Safe Harbor identifiers, or have an expert determine the re-identification risk is very small) or a limited data set with dates and ZIPs under a data use agreement, after IRB and data-governance approval. (5) Aggregate visit counts by month; finance gets no patient-level data at all."
            ),
            part(
              "Why the distinction matters",
              "Explains at least two consequences: data collected for care carries documentation habits and gaps that bias secondary analysis (what was not ordered is not recorded); primary use is permitted for treatment while secondary uses need their own authority (quality operations, public-health law, research approval and de-identification) and the minimum-necessary standard.",
              "Two things change with purpose. Governance: treatment use is permitted on its face, while each secondary use needs its own basis -- health care operations for quality, public-health authority for surveillance, IRB approval plus de-identification or a data use agreement for research -- and each gets only the minimum necessary. Meaning: records made for care reflect care, not the population -- a patient with no HbA1c on file is not 'controlled', they were not tested -- so every secondary analysis has to ask what the data were collected for and what they miss."
            ),
          ],
        },
      ],
    },
    // F2 Information Science and Technology -------------------------------
    {
      slug: "model-patients-encounters-labs",
      objective:
        "Relational databases, data modelling and SQL: tables linked by primary and foreign keys, and queries that join them to pull data on many patients",
      kind: "build",
      title: "Model patients, encounters and lab results, then write the join",
      brief:
        "Cedar Basin Health (fictional) exports a flat spreadsheet with one row per lab result: MRN, birth year, sex, admit date, discharge date, unit, test code (LOINC), value, unit of measure, result time. Patient details repeat on every row and a typo in one row has already given one patient two birth years. The quality team wants, for results since 1 October 2026, every patient whose highest HbA1c (the compendium maps it to LOINC 4548-4) is 8.0% or more by the team's own target, with their number of encounters in that period and the highest value, highest first. Design the tables and write the query. All data is fictional and de-identified.",
      safetyNote: MSHI_SAFETY,
      steps: [
        {
          text: "",
          ask: "Give the tables with keys, the query, and what the design fixes.",
          parts: [
            part(
              "Tables and keys",
              "Three tables -- patient (patient_id PK, mrn unique, birth_year, sex), encounter (encounter_id PK, patient_id FK -> patient, admit_date, discharge_date, unit), lab_result (result_id PK, encounter_id FK -> encounter, loinc_code, value_num, unit, resulted_at) -- with each fact stored once and foreign keys pointing from the many side to the one side.",
              "patient(patient_id PK, mrn UNIQUE NOT NULL, birth_year, sex)\nencounter(encounter_id PK, patient_id FK -> patient, admit_date, discharge_date, unit)\nlab_result(result_id PK, encounter_id FK -> encounter, loinc_code, value_num, unit, resulted_at)\n\nOne patient has many encounters; one encounter has many results. The foreign key sits on the many side. A surrogate integer key plus a unique MRN means a corrected MRN never has to rewrite child rows."
            ),
            part(
              "The query",
              "Joins the three tables on their keys, filters loinc_code = '4548-4' and resulted_at >= '2026-10-01', groups by patient, uses COUNT(DISTINCT encounter_id) and MAX(value_num), keeps groups with HAVING MAX(value_num) >= 8.0 and orders by the max descending. WHERE for row filters, HAVING for the aggregate filter.",
              "select p.mrn, count(distinct e.encounter_id) as encounters, max(l.value_num) as max_a1c\nfrom patient p\njoin encounter e on e.patient_id = p.patient_id\njoin lab_result l on l.encounter_id = e.encounter_id\nwhere l.loinc_code = '4548-4' and l.resulted_at >= '2026-10-01'\ngroup by p.mrn\nhaving max(l.value_num) >= 8.0\norder by max_a1c desc;\n\nOn a small fictional set this returned MRN-0003 (1 encounter, 9.4) and MRN-0001 (1 encounter, 8.1). The WHERE clause cuts rows before grouping; HAVING tests the group's maximum; COUNT(DISTINCT) stops a patient with three results in one stay counting as three encounters."
            ),
            part(
              "What the design fixes",
              "Explains normalisation benefits for this case: patient attributes stored once so the two-birth-years anomaly cannot happen (update anomaly); encounters without results and patients without encounters can exist (no insertion anomaly); deleting a result does not delete the patient; and that the join reassembles the flat view when needed. Notes an index on lab_result(loinc_code, resulted_at) or encounter(patient_id) for the query.",
              "The flat sheet repeats patient facts on every row, so one typo makes one patient look like two -- an update anomaly. With birth_year stored once in patient it can only have one value. A patient can exist before any encounter and an encounter before any result (no insertion anomaly), and deleting a result row deletes nothing else. The join rebuilds the spreadsheet shape whenever analysis wants it. For speed, index lab_result(loinc_code, resulted_at) and the two foreign keys."
            ),
          ],
        },
      ],
    },
    {
      slug: "free-text-vs-coded-smoking-status",
      objective: "Structured versus unstructured clinical data, and why free-text notes are harder to search, count and reuse",
      kind: "build",
      title: "Why the smoking-status report is wrong, and what to capture instead",
      brief:
        "Cedar Basin Health's (fictional) quality team must report the share of adult patients screened for tobacco use. Clinicians at the clinic record smoking in the free-text social history: 'smokes 1/2 ppd', 'quit 2019', 'denies tob', 'never smoker', 'pt's husband smokes', 'nicotine patch', and 'smoking status unchanged'. A keyword search for 'smok' counts 71% of patients as current smokers; the clinic believes the true figure is nearer 15%. The EHR has an unused structured smoking-status field with a short list of coded values.",
      safetyNote: MSHI_SAFETY,
      steps: [
        {
          text: "",
          ask: "Diagnose the report, design the structured capture, and say what free text is still for.",
          parts: [
            part(
              "Why the keyword count is wrong",
              "Gives concrete failure modes from the examples: negation ('denies tob', 'never smoker' contain the keyword), family members ('husband smokes'), former status ('quit 2019'), implied-but-not-stated ('nicotine patch'), references to earlier notes ('unchanged'), spelling and abbreviation variety; concludes a string match cannot tell who smokes.",
              "The search counts the word, not the fact. 'never smoker' and 'denies tob' are negations; 'pt's husband smokes' is about someone else; 'quit 2019' is a former smoker; 'nicotine patch' implies a smoker without the word; 'status unchanged' points at a note the search never read. Abbreviations ('tob', 'ppd') and typos escape the pattern in the other direction. A keyword hit is neither necessary nor sufficient, so 71% is noise, not a prevalence."
            ),
            part(
              "Structured capture design",
              "Uses the coded field with a small value set covering current (every day / some days), former, never, and unknown/not asked, with a date and a required-at-intake prompt; counts become a GROUP BY on the code; notes the denominator (patients asked) is now distinct from 'documented', which is what the measure needs.",
              "Turn on the coded field and make it part of intake: values such as current every-day smoker, current some-day smoker, former smoker, never smoker, unknown if ever smoked, with the date asked. The measure becomes a query: screened = patients with any coded value this year; current = the two current codes. Because 'unknown / not asked' is itself a code, 'never documented' stops being confused with 'never smoked', which is exactly the error the free text could not expose."
            ),
            part(
              "What free text is still for, and what bridges the gap",
              "Keeps narrative for nuance (how much, since when, readiness to quit, context) that a code cannot hold; names NLP/text mining as a way to extract from historical notes with negation handling, but as a second-best to capture at the point of care; proposes a transition (backfill by NLP flagged for clinician confirmation).",
              "The narrative stays: half a pack a day since 2010, cut down last month, wants to quit after the wedding -- that is care, not a count. For the five years of notes already written, a text-mining pass with negation and family-history handling can propose a status per patient, but it should populate the coded field as a suggestion a clinician confirms, not as the answer. From now on the code is captured at the visit and the note explains it."
            ),
          ],
        },
      ],
    },
    // F3 Social and Behavioral Science ------------------------------------
    {
      slug: "lost-laptop-breach-case",
      objective: "The HIPAA breach notification rule as strengthened by HITECH: what counts as a breach, how risk is assessed and who must be notified",
      kind: "case",
      title: "A laptop goes missing from a clinic",
      brief:
        "You are the privacy officer at Cedar Basin Health (fictional, a HIPAA covered entity). On Monday a care coordinator reports that her work laptop was stolen from her car on Friday evening. She had downloaded a spreadsheet of 2,300 patients from the diabetes registry -- names, dates of birth, MRNs, HbA1c values and phone numbers -- to work on a recall list. Nothing is known yet about the laptop's encryption. All people and data are fictional.",
      safetyNote: MSHI_SAFETY,
      steps: [
        {
          text: "IT confirms the laptop was enrolled in full-disk encryption and reports that the device had been encrypted since issue, with a strong login password and no evidence the password was written down or shared. IT cannot prove the device was powered off at the time of theft.",
          ask: "Is this presumptively a breach, and what does the risk assessment have to consider?",
          parts: [
            part(
              "Is it a breach",
              "States that an impermissible acquisition/disclosure of PHI is presumed a breach unless the entity demonstrates a low probability the PHI was compromised through a documented risk assessment; notes that properly encrypted PHI (meeting HHS guidance, keys not compromised) is generally considered unreadable, which can support a low-probability finding, but that the conclusion must be documented, not assumed.",
              "Start from the presumption: PHI left the organisation's control, so it is a breach unless our documented risk assessment shows a low probability the PHI was compromised. Encryption is what gives us a path to that finding -- data that is unreadable to the thief is not compromised -- but only if the encryption was actually in force and the key or password was not exposed. The powered-on question matters because a logged-in, unlocked machine is readable regardless of disk encryption; we write that uncertainty into the assessment rather than wave it away."
            ),
            part(
              "The four risk factors",
              "Names the four factors the rule requires at minimum: (1) nature and extent of the PHI, including identifiers and likelihood of re-identification; (2) the unauthorized person who used or received it; (3) whether the PHI was actually acquired or viewed; (4) the extent to which the risk has been mitigated -- and applies each to this case.",
              "(1) Nature and extent: names, DOBs, MRNs, phone numbers and a diagnosis-linked lab value -- highly identifiable and sensitive. (2) The unauthorized person: an unknown thief, so no assurance from a known recipient. (3) Actually acquired or viewed: the device was taken, but with full-disk encryption and a strong password there is no evidence the data could be viewed; we document the encryption attestation and the open question about power state. (4) Mitigation: remote wipe if the device checks in, password reset, confirmation that the file is also still on the server. The written assessment weighs all four and records who decided and why."
            ),
          ],
        },
        {
          text: "The assessment is reopened a week later: a second employee admits the laptop's login password was taped under the keyboard. The team now concludes the data must be treated as compromised. 2,300 patients are affected, about 540 of them residents of a neighbouring state. The registry tool is run by an outside vendor under a business associate agreement, and the vendor's logs show the download happened through their portal.",
          ask: "Who must be notified, by when, and what goes in the notice?",
          parts: [
            part(
              "Who and by when",
              "Individuals: without unreasonable delay and no later than 60 calendar days after discovery (discovery is when the breach was known or should reasonably have been known -- the Monday report), by written notice. Secretary of HHS: because 500 or more individuals are affected, at the same time as individual notice (via the HHS portal). Media: prominent outlets in any state where more than 500 residents are affected -- 540 in the neighbouring state triggers it. Notes that a breach of fewer than 500 would instead go on the annual log reported within 60 days after the calendar year ends.",
              "Individuals: written notice without unreasonable delay and in no case later than 60 calendar days after discovery -- and the clock started on the Monday the theft was reported, not when the password was found. The Secretary: 2,300 is 500 or more, so HHS is notified contemporaneously with the individual notices, through the HHS breach portal. Media: more than 500 residents of the neighbouring state are affected (540), so prominent media serving that state get a notice within the same 60-day limit; our own state's count also exceeds 500, so media notice applies there too. Had the total been under 500, the breach would go on the annual log reported to HHS within 60 days after the end of the calendar year instead."
            ),
            part(
              "The vendor's role",
              "Explains the business associate's duty: a BA that discovers a breach must notify the covered entity without unreasonable delay and within 60 days of discovery, identifying affected individuals where possible; here the download was an authorized user's action through the portal, so the breach is the covered entity's to notify, but the BAA should say who notifies whom and the vendor's logs are evidence for the assessment.",
              "The registry vendor is a business associate. If the breach had happened on their side, they would owe us notice without unreasonable delay and within 60 calendar days of discovering it, with the list of affected people as far as they can tell. Here the download was by our own authorized workforce member, so the notification duty is ours; the vendor's portal logs are what proves which 2,300 records were in the file. Check the BAA for its notice clause and whether the vendor's portal should have blocked a 2,300-row export to an unmanaged file at all."
            ),
            part(
              "Contents of the notice and the follow-through",
              "Notice includes, in plain language: what happened and the dates of breach and discovery; the types of PHI involved; steps individuals should take to protect themselves; what the entity is doing to investigate, mitigate and prevent recurrence; and contact procedures (toll-free number, email, website or postal address). Follow-through: sanctions/training, encryption and download controls, documentation retained.",
              "Plain-language letter: what happened (device stolen on the Friday; discovered Monday), what was in it (names, dates of birth, medical record numbers, phone numbers, HbA1c results), what they can do (watch for suspicious calls, how to request a copy of their record), what we are doing (remote wipe attempt, password and access review, investigation, new download controls), and how to reach us (toll-free number, email, postal address). Internally: retrain, apply the sanctions policy to the taped password, stop bulk exports to laptops by giving the recall list its own in-portal worklist, and keep the risk assessment and notices on file."
            ),
          ],
        },
      ],
    },
    {
      slug: "information-blocking-request-case",
      objective:
        "The 21st Century Cures Act's information-blocking rules: which actors they apply to, what counts as interference with access to electronic health information, and why exceptions exist",
      kind: "case",
      title: "A clinic wants to hold results back",
      brief:
        "Cedar Basin Health (fictional) releases laboratory and imaging results to its patient portal as soon as they are final. The oncology clinic's medical director asks the informatics team to add a 7-day delay on all pathology results for her patients 'so we can call them first', and to switch off the portal for one patient who 'reads everything and panics'. Separately, the practice's EHR vendor has quoted a four-week turnaround and a $900 fee to produce a standard FHIR export of a departing patient's record. All people are fictional.",
      safetyNote: MSHI_SAFETY,
      steps: [
        {
          text: "The medical director says the delay is for the patients' own good and that other clinics 'used to do this all the time'.",
          ask: "Who do the information-blocking rules apply to here, and does a blanket 7-day delay count as interference?",
          parts: [
            part(
              "Who is an actor",
              "Names the three regulated actor types -- health care providers, health IT developers of certified health IT, and health information networks/exchanges -- and places Cedar Basin (a provider) and the EHR vendor (a certified health IT developer) inside the rule.",
              "The rule binds three kinds of actor: health care providers, developers of certified health IT, and health information networks or exchanges. Cedar Basin is a provider and the EHR vendor is a certified health IT developer, so both are actors; the medical director is acting for the provider. The patient is not an actor -- the rule exists to protect their access."
            ),
            part(
              "Is a blanket delay interference",
              "Explains that a practice likely to interfere with access, exchange or use of electronic health information is information blocking unless required by law or covered by an exception; a blanket delay applied to every pathology result, for convenience or custom, is not tailored to any individual patient and does not fit the preventing-harm exception, which requires a reasonable belief of harm to a specific patient or a determination made case by case under an organisational policy that meets the exception's conditions. 'Other clinics used to' is not a defence.",
              "Delaying every pathology result for every oncology patient is a practice likely to interfere with access to electronic health information, so it is information blocking unless an exception fits. The preventing-harm exception is the one she is reaching for, and it does not stretch this far: it needs a reasonable belief that a particular patient would be harmed by access (or a policy that applies individualised criteria), not a department-wide habit. Wanting to phone first is a care-coordination goal; the lawful way to meet it is to call quickly, not to hide the result. Custom is not an exception."
            ),
          ],
        },
        {
          text: "The director narrows the request: a specific patient with a documented history of self-harm after bad news, whose psychiatrist has asked in writing that pathology results be released only after a clinician has spoken to him. She still wants the portal switched off entirely for the patient who 'panics'.",
          ask: "How do you handle each patient, and what about the vendor's quote?",
          parts: [
            part(
              "The two patients",
              "Patient 1: the preventing-harm exception can apply -- an individualised determination by a licensed clinician, documented, limited to the specific results and the time needed, with the patient able to request review; implement as a targeted release hold on pathology results, not a blanket rule. Patient 2: 'panics' is not a reasonable belief of harm; turning off the whole portal is interference; offer support (clinician outreach, result explanations) instead.",
              "Patient 1 fits the preventing-harm exception if we do it properly: a licensed clinician makes and documents an individualised determination that immediate access would endanger this patient, the hold covers only the pathology results it is about, lasts only until a clinician has called, and the patient can ask us to review it. That is a configured per-patient release hold on those results, written up in the chart. Patient 2 does not qualify: being upset by results is not a reasonable belief of harm, and disabling the portal would be interference with access. Offer him a results-explanation call or a note on how to read them; keep the portal on."
            ),
            part(
              "The vendor's export quote",
              "Weighs the fees and manner exceptions: fees must be based on objective criteria, uniformly applied and reasonably related to costs, and the fees exception (45 CFR 171.302(b)) does not cover a fee for an individual's electronic access, a fee to export EHI through certified export capability to provide patients their information or to switch health IT, or an export fee not agreed in writing when the technology was acquired; a four-week delay and a $900 charge for a standard export of one patient's record is likely interference; the content-and-manner (manner) exception lets an actor negotiate an alternative manner only when it cannot fulfil the request in the manner requested. Advises escalating to the vendor with the rule in hand and documenting.",
              "A standard export of one patient's record is exactly the access the rule protects. The fees exception (45 CFR 171.302) allows cost-based charges applied uniformly, but it expressly excludes fees for a patient's own electronic access, fees for an export through the certified export capability to give patients their information, and export fees that weren't agreed in writing when we bought the system. Unless our contract set this fee, $900 for a routine export looks neither covered nor reasonable. The manner exception lets a vendor offer an alternative only when it genuinely cannot deliver in the manner requested -- a four-week turnaround for a standard FHIR export is hard to defend as infeasible. Put the request in writing citing the rule, ask for the export in the standard manner at a documented cost, and keep the correspondence; the practice can report an actor it believes is blocking."
            ),
          ],
        },
      ],
    },
    // F4 Health Information Science and Technology ------------------------
    {
      slug: "fhir-observation-for-lab-result",
      objective: "FHIR resources: small, reusable building blocks that reference each other and can be written as JSON or XML",
      kind: "build",
      title: "Write a FHIR Observation for a lab result",
      brief:
        "Cedar Basin Health (fictional) is replacing a point-to-point lab feed with FHIR. A fictional, de-identified result from the interface spec: patient resource id mrn-0003; the test is HbA1c, which the interface spec codes as LOINC 4548-4 'Hemoglobin A1c/Hemoglobin.total in Blood'; value 9.4 %; specimen collected 2026-10-22 07:45 Pacific; result released 09:10; performing lab 'Northgate Clinical Laboratory' (an Organization resource with id northgate-lab); status final. Write the Observation as R4-compatible JSON, explain how it references the other resources, and say what you would NOT put in it.",
      safetyNote: MSHI_SAFETY,
      steps: [
        {
          text: "",
          ask: "Produce the JSON, explain the references and name what stays out.",
          parts: [
            part(
              "The Observation JSON",
              "Valid JSON with resourceType Observation; status final; a category coding of laboratory; code with a coding whose system is http://loinc.org and code/display from the spec; subject as a reference to Patient/mrn-0003; effectiveDateTime with a time zone offset; issued; performer referencing Organization/northgate-lab; valueQuantity with value 9.4, unit %, system http://unitsofmeasure.org and code %. Field names must be FHIR's (camelCase, valueQuantity not 'value').",
              "{\n  \"resourceType\": \"Observation\",\n  \"id\": \"a1c-2026-10-22\",\n  \"status\": \"final\",\n  \"category\": [{ \"coding\": [{ \"system\": \"http://terminology.hl7.org/CodeSystem/observation-category\", \"code\": \"laboratory\" }] }],\n  \"code\": { \"coding\": [{ \"system\": \"http://loinc.org\", \"code\": \"4548-4\", \"display\": \"Hemoglobin A1c/Hemoglobin.total in Blood\" }] },\n  \"subject\": { \"reference\": \"Patient/mrn-0003\" },\n  \"effectiveDateTime\": \"2026-10-22T07:45:00-07:00\",\n  \"issued\": \"2026-10-22T09:10:00-07:00\",\n  \"performer\": [{ \"reference\": \"Organization/northgate-lab\" }],\n  \"valueQuantity\": { \"value\": 9.4, \"unit\": \"%\", \"system\": \"http://unitsofmeasure.org\", \"code\": \"%\" }\n}\n\nstatus and code are the resource's required elements; effective[x] is the clinically relevant time (collection), issued is when the lab released it. The unit carries both a display string and a UCUM code so machines can compare it."
            ),
            part(
              "How references work",
              "Explains that subject and performer are Reference elements pointing at separate Patient and Organization resources by relative URL (type/id), so patient demographics are not copied into every result; the same Patient is referenced by every Observation, Encounter and Condition; a Bundle can carry them together; references can also be absolute URLs or logical identifiers.",
              "The Observation does not contain the patient -- it points at one. subject.reference 'Patient/mrn-0003' is a relative URL to the Patient resource on the same server, and performer points at the Organization the same way. Every other resource about this person (Encounter, Condition, MedicationRequest) uses the same reference, so demographics live in one place and a corrected name never has to touch a thousand results. When resources travel together they go in a Bundle, and a reference may also be an absolute URL or a logical identifier when the target is not on this server."
            ),
            part(
              "What stays out",
              "Names at least two: no patient name/DOB/MRN inside the Observation (they belong to Patient); no interpretation flag or reference range invented -- only what the source carried; no free-text value when a coded quantity exists; no version-specific elements that differ between R4 and R5 if the receiver is on R4 (US Core).",
              "No demographics -- name, birth date and MRN belong in Patient, and copying them here is both redundant and a de-identification headache later. No invented interpretation (H/L) or referenceRange: those elements exist, but they are filled only from what the source result carried. No valueString when the result is a number with a unit. And because US Core and the receiving systems are on R4, stay with the elements R4 defines rather than anything R5 changed, so the same JSON validates on both."
            ),
          ],
        },
      ],
    },
    {
      slug: "hl7v2-oru-to-fhir-case",
      objective:
        "HL7 Version 2 messaging: the long-established, widely implemented standard for passing clinical data between a central patient care system and departmental systems",
      kind: "case",
      title: "A lab result message that will not file",
      brief:
        "The interface engine at Cedar Basin Health (fictional) receives this fictional, de-identified ORU^R01 from a reference lab (field separator |, component separator ^):\n\nMSH|^~\\&|NGLAB|NORTHGATE|CEDAREHR|CEDARBASIN|20261022091000||ORU^R01|MSG00042|P|2.5.1\nPID|1||MRN-0003^^^CEDARBASIN^MR||TESTPATIENT^FICTIONAL||19880000|F\nOBR|1|ORD-7781|LAB-99120|4548-4^Hemoglobin A1c/Hemoglobin.total in Blood^LN|||20261022074500\nOBX|1|NM|4548-4^Hemoglobin A1c/Hemoglobin.total in Blood^LN||9.4|%|||||F|||20261022074500\n\nThe EHR rejects it. You are the integration analyst.",
      safetyNote: MSHI_SAFETY,
      steps: [
        {
          text: "The EHR's error is 'patient not found'. You check: the EHR knows this patient under MRN-0003 with assigning authority CEDARBASIN, and it has an active order ORD-7781.",
          ask: "Read the message: which segments and fields carry the patient, the order, the test and the result, and where would you look first for the filing failure?",
          parts: [
            part(
              "Reading the segments",
              "MSH = message header (MSH-9 ORU^R01 is an unsolicited observation result; MSH-12 version 2.5.1; MSH-3/4 sending app and facility, MSH-5/6 receiving). PID = patient identification (PID-3 identifier list MRN-0003 with assigning authority CEDARBASIN and type MR; PID-5 name; PID-7 birth date; PID-8 sex). OBR = order (OBR-2 placer order ORD-7781, OBR-3 filler, OBR-4 the test code). OBX = one observation (OBX-2 value type NM, OBX-3 the LOINC-coded identifier with coding system LN, OBX-5 the value 9.4, OBX-6 units %, OBX-11 result status F = final, OBX-14 observation time).",
              "MSH is the envelope: MSH-9 says ORU^R01 (a result message), MSH-12 says v2.5.1, MSH-3/4 are the sender (NGLAB at NORTHGATE) and MSH-5/6 the receiver. PID carries the patient: PID-3 is the identifier list -- MRN-0003, assigning authority CEDARBASIN, type MR -- PID-5 the name, PID-7 the date of birth, PID-8 sex. OBR is the order: OBR-2 placer number ORD-7781, OBR-3 the lab's filler number, OBR-4 the test as a coded element (code^text^coding system). OBX is the result itself: OBX-2 NM says the value is numeric, OBX-3 identifies the observation (LOINC, system LN), OBX-5 is 9.4, OBX-6 the units %, OBX-11 F means final, OBX-14 the observation time."
            ),
            part(
              "Where to look first",
              "Looks at PID-3 first (identifier, assigning authority, identifier type) and the EHR's matching rule, then PID-7: '19880000' is not a valid HL7 date (TS/DTM wants YYYY[MM[DD]]), and a strict parser may reject or fail the match on it; also checks whether the order match uses OBR-2 vs OBR-3. Does not blame OBX for a patient-not-found error.",
              "'Patient not found' is a PID problem, not an OBX problem. PID-3 looks right -- MRN-0003^^^CEDARBASIN^MR matches the EHR's identifier, authority and type -- so the next suspect is PID-7: 19880000 is not a legal date (a v2 timestamp is YYYY, YYYYMM or YYYYMMDD, never zero month and day), and an EHR that matches on MRN plus date of birth, or that validates PID before matching, will reject exactly like this. Confirm with the EHR's inbound log which fields its match uses, and whether it keys the order on OBR-2 (placer) or OBR-3 (filler)."
            ),
          ],
        },
        {
          text: "The lab confirms its system sends '0000' when month and day are unknown for de-identified test patients, and agrees to send year-only or omit PID-7. With a corrected PID-7 the message files. The EHR team now asks you to express the same result as a FHIR Observation for the new API, and the pharmacist asks why the EHR shows '9.4 %' while the lab's own portal shows the same test as a different number in mmol/mol.",
          ask: "Map the v2 fields to FHIR and explain the unit discrepancy.",
          parts: [
            part(
              "v2 to FHIR mapping",
              "PID-3 -> Patient.identifier (system from the assigning authority, value MRN-0003) and the Observation.subject reference; OBX-3 -> Observation.code.coding (system http://loinc.org, code 4548-4, display); OBX-5 + OBX-6 -> Observation.valueQuantity (value 9.4, unit %, UCUM system and code); OBX-11 F -> Observation.status final; OBX-14 -> effectiveDateTime; MSH-7 -> issued (or the time the result was released); OBR-2/3 -> a ServiceRequest the Observation's basedOn references; MSH-3/4 -> the performer Organization.",
              "PID-3 becomes Patient.identifier (system for CEDARBASIN's MRNs, value MRN-0003) and the Observation points at that Patient in subject. OBX-3 becomes Observation.code.coding with system http://loinc.org, code 4548-4 and the display text. OBX-5 and OBX-6 together become valueQuantity: value 9.4, unit '%', system http://unitsofmeasure.org, code '%'. OBX-11 F maps to status 'final' (P would be preliminary, C corrected). OBX-14 is effectiveDateTime; MSH-7 or the release time is issued. OBR-2/OBR-3 become a ServiceRequest the Observation references in basedOn, and the sending lab becomes the performer Organization."
            ),
            part(
              "The unit discrepancy",
              "Recognises that the two numbers are the same measurement in two unit systems (percent HbA1c vs mmol/mol) and that a value must never be shown without its unit or compared across units without a documented conversion; the interface must carry OBX-6 through to valueQuantity.unit/code every time and the receiving display must show the unit; flags that any conversion is a clinical/laboratory decision to be documented and validated, not something an interface analyst hard-codes.",
              "They are one result expressed in two unit systems: the lab's portal reports HbA1c in mmol/mol and the message carried percent. Neither is wrong, but a number without its unit is dangerous, so the rule is simple -- OBX-6 travels with OBX-5 into valueQuantity.unit and the UCUM code, and every screen shows the unit next to the value. Whether the EHR should also display the other unit is a laboratory and clinical decision: the conversion and its validation belong to the lab director and the compendium, documented and tested, not hard-coded in the interface by me."
            ),
          ],
        },
      ],
    },
    // F5 Human Factors ----------------------------------------------------
    {
      slug: "heuristic-evaluation-med-order-screen",
      objective:
        "Usability evaluation methods: expert inspection such as heuristic evaluation and cognitive walkthrough, and user testing with think-aloud protocols",
      kind: "build",
      title: "Run a heuristic evaluation of a medication order screen",
      brief:
        "Cedar Basin Health (fictional) is reviewing a vendor's new medication order screen before go-live. Observed: dose, unit and frequency are three free-text boxes with no defaults; the only confirmation after Sign is that the screen goes blank; the patient's weight is on a different tab; an allergy alert appears as a small grey line under the order with no colour or sound and the same style as the 'last modified' text; the Cancel and Sign buttons are the same size and colour, side by side; the screen uses the term 'Administration Vehicle' for route; there is no way to see the previous dose of the same drug without leaving the order. Pharmacy asks for an expert inspection first because recruiting nurses for testing will take a month.",
      safetyNote: MSHI_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write up the heuristic evaluation and say what user testing would add.",
          parts: [
            part(
              "Findings mapped to heuristics",
              "At least four findings, each tied to a named heuristic (Nielsen's set or equivalent) with severity: no feedback after Sign (visibility of system status); allergy alert indistinguishable from metadata (visibility / recognition rather than recall / error prevention); free-text dose/unit/frequency with no defaults or constraints (error prevention); Sign and Cancel identical and adjacent (error prevention / slips); 'Administration Vehicle' jargon (match between system and real world); weight on another tab and no previous dose visible (recognition rather than recall / flexibility).",
              "1. Blank screen after Sign -- visibility of system status, high severity: the clinician cannot tell whether the order was placed, so duplicates and omissions both follow. 2. Allergy alert styled like 'last modified' -- visibility and error prevention, critical: a safety-critical message must look and behave unlike metadata. 3. Dose, unit and frequency as unconstrained free text -- error prevention, high: unit errors (mg vs mcg) and typos are invited; use pick-lists, dose ranges and defaults from the formulary. 4. Sign and Cancel twins side by side -- error prevention (slips), medium-high. 5. 'Administration Vehicle' -- match between system and the real world, medium: clinicians say route. 6. Weight on another tab, no previous dose in view -- recognition rather than recall, high for weight-based dosing."
            ),
            part(
              "Severity and recommendations",
              "Prioritises by safety consequence (allergy alert and Sign feedback first), gives a concrete change for each (modal or visually distinct alert with acknowledgement; confirmation banner with order summary; structured fields with defaults and hard/soft limits; distinct primary button, separation; rename to Route; weight and last dose shown on the order form), and notes that one evaluator misses issues -- use 3-5 evaluators and aggregate.",
              "Fix the two that can hurt a patient tonight: make the allergy alert unmistakable (distinct colour and icon, interrupting for a true allergy, requiring an acknowledgement reason) and replace the blank screen with a confirmation that restates drug, dose, route and frequency. Then structure the fields -- units from a list, dose range checks from the formulary, frequency from a list with a default -- make Sign the single primary button and move Cancel away, rename the field to Route, and show weight and the last administered dose on the order form itself. Run this inspection with three to five evaluators and merge the lists: one person finds only part of the problems."
            ),
            part(
              "What user testing adds",
              "Explains that heuristic evaluation finds violations of principles without users, cheaply and early, but cannot show frequency, real workflow effects or problems experts don't anticipate; think-aloud testing with real nurses on realistic order tasks measures task success, time and errors and reveals workarounds; recommends both, inspection now and a small think-aloud study before go-live.",
              "An inspection is fast, cheap and needs no participants, which is why it goes first -- but it reports what violates principles, not what happens on a ward at 03:00. Think-aloud testing with five or six nurses placing realistic orders would show how often the Sign/Cancel slip actually occurs, whether people notice the alert at all, how long weight-based dosing takes with the tab switch, and the workarounds nobody predicted. Do the inspection now, fix the obvious, then test with users before go-live; both are cheaper than the incident report."
            ),
          ],
        },
      ],
    },
    {
      slug: "patient-identification-downtime-case",
      objective: "EHR safety practices: reliable patient identification, planning for downtime and closing the loop on test results",
      kind: "case",
      title: "Two patients, one name, and then the network fails",
      brief:
        "You are the clinical informaticist on call at Cedar Basin Health (fictional). The emergency department has two fictional patients registered within an hour of each other: Maria Delgado-Ruiz, born 1961, and Maria Delgado, born 1962. A nurse reports that a troponin result 'looks wrong for the patient' and suspects the specimen was labelled for the wrong Maria.",
      safetyNote: MSHI_SAFETY,
      steps: [
        {
          text: "The lab system shows the specimen was received with a label printed from the ED tracking board, where both patients appear on adjacent rows. The EHR has a name-alert feature that is switched off in the ED.",
          ask: "What do you do about this result now, and what system changes do you recommend for patient identification?",
          parts: [
            part(
              "Immediate handling",
              "Treats the result as unreliable for either patient until verified: escalates to the ED physician and the laboratory, requests redraw with two-identifier bedside verification (name plus date of birth or MRN, never room number), asks the lab to hold/annotate the suspect result rather than delete it, and files a safety event report. Does not suggest the nurse decide clinically on the suspect value.",
              "Tell the ED physician and the lab at once: the troponin cannot be trusted for either patient. Ask the lab to flag the result as suspect in both charts (an annotation and a corrected status, not a deletion, so the trail stays), redraw both patients with bedside two-identifier checks against the wristband -- full name and date of birth or MRN, never the room or the tracking-board row -- and label at the bedside. Open a safety event report so the near-miss is counted."
            ),
            part(
              "System changes",
              "Names reliable-identification practices: turn on and configure the duplicate/similar-name alert; display a 'name alert' banner and visually separate similar names on boards and worklists; require two identifiers and positive patient identification (barcode wristband scanning) at specimen collection with labels printed at the bedside after the scan; include photo or distinguishing data where available; audit duplicate registrations; align with the SAFER Guide for patient identification.",
              "Switch the similar-name alert on in the ED and make it visible: a banner on both charts, a visual marker and non-adjacent placement on the tracking board. Move label printing to the bedside, triggered by scanning the wristband barcode and confirming two identifiers, so the label cannot come from the wrong row. Put the photo and date of birth on the board rows. Run a duplicate-registration audit (the two Marias may also be one person twice) and check the setup against the SAFER Guide for patient identification, which lists exactly these practices."
            ),
          ],
        },
        {
          text: "While the redraws are pending, the hospital network fails. The EHR, the lab interface and the tracking board are all unavailable; the estimate is three hours. The ED has four patients with results that were final but unseen when the system dropped.",
          ask: "What does the downtime plan have to deliver now, and how do you close the loop on the unseen results afterwards?",
          parts: [
            part(
              "Downtime plan",
              "Declares downtime and uses the downtime procedure: a read-only downtime viewer or printed snapshots (patient lists, active orders, allergies, medication lists) refreshed before the failure; paper order and result forms with pre-printed patient labels; a lab phone process for critical values; a communication tree; a log of what happened during downtime for back-entry; and the recovery step of reconciling paper to the EHR with a defined owner. Tests of the plan should have happened before.",
              "Declare downtime through the communication tree so everyone switches to the same rules. Pull the downtime viewer or the last printed snapshots -- patient list, allergies, active orders, medication lists -- and issue downtime paper forms with the most recent patient labels. Lab phones critical results to a named person who writes them on the downtime result form. Keep a running log of every order, result and medication given on paper, because all of it has to be back-entered when the system returns, by a named owner against a checklist. If the first time this was rehearsed is tonight, that is the next finding."
            ),
            part(
              "Closing the loop on results",
              "Identifies the risk that results final-but-unseen at the moment of failure fall through: builds a list (from the lab's own system, which still has them) of all finals and criticals released in the window, phones criticals now, and after recovery reconciles that list against acknowledgement in the EHR; longer term, configures results-acknowledgement tracking and a report of unacknowledged results per clinician, per the SAFER guidance on test-result follow-up.",
              "The lab's own system still has every result it released in the window. Ask the lab for the list of all finals and criticals since the failure and have critical values phoned to the ED physician now, documented on paper. When the network returns, that list becomes the reconciliation: every result on it must show an acknowledgement in the EHR by a responsible clinician, and the unseen troponin redraws are on it too. Then fix the standing gap -- turn on results-acknowledgement tracking and a daily report of unacknowledged results per ordering clinician, so a result released during any outage, or any busy night, cannot stay unseen."
            ),
          ],
        },
      ],
    },
    // F6 Social and Behavioral Aspects of Health --------------------------
    {
      slug: "evaluate-a-blood-pressure-app",
      objective:
        "Mobile health, wearables and remote patient monitoring for self-management, and how to judge an app's quality, privacy and safety",
      kind: "build",
      title: "Judge a blood-pressure app before recommending it",
      brief:
        "Cedar Basin Health's (fictional) hypertension clinic wants to recommend a consumer app, 'PressureTrack' (fictional), for patients to log home readings. What you can find: the app pairs with several arm cuffs via Bluetooth; it shows a 'risk score' it calls 'clinically validated' with no citation; its privacy policy says data 'may be shared with partners for analytics and marketing' and is hosted outside the country; export is a PDF only; it colours readings red/green with no way to change thresholds; the developer is a two-person company with no listed clinical advisor; store rating 4.6 from 3,000 reviews; the app has no stated accessibility features. Write the evaluation.",
      safetyNote: MSHI_SAFETY,
      steps: [
        {
          text: "",
          ask: "Evaluate the app on quality, privacy and safety, and make a recommendation.",
          parts: [
            part(
              "Quality and evidence",
              "Separates store popularity from evidence: a 4.6 rating is satisfaction, not validity; 'clinically validated' without a citation is a claim; asks whether the paired cuffs are independently validated devices; checks the developer's credibility (clinical input, update history, support); notes export as PDF only blocks integration and reuse.",
              "A 4.6-star rating says people like using it; it says nothing about whether its numbers are right. 'Clinically validated' with no study, no population and no citation is marketing. The readings come from the cuff, so the first question is whether each supported cuff is an independently validated device -- the app is only as good as that. A two-person developer with no clinical advisor, and an export limited to a PDF nobody can parse, both count against it for clinic use."
            ),
            part(
              "Privacy and data handling",
              "Flags sharing with 'partners for analytics and marketing' and offshore hosting as unacceptable for a clinic recommendation; notes a consumer app outside the covered entity is generally not bound by HIPAA, so the policy is the protection; asks about deletion, account closure and what is collected beyond readings; recommends apps with clear, limited sharing and local control.",
              "The policy allows marketing use of blood-pressure data, and the data sit in another country's jurisdiction. A consumer app the patient downloads themselves is usually not a HIPAA covered entity or business associate, so that privacy policy is the only protection the patient has -- and it permits exactly what we would not. Ask what else it collects (location, contacts), whether a patient can delete everything, and who the 'partners' are. For a clinic recommendation the answer must be: readings only, no marketing use, deletion on request, and a named data controller."
            ),
            part(
              "Safety and the recommendation",
              "Identifies safety issues: an unexplained risk score and fixed red/green thresholds can alarm or falsely reassure and cannot follow the clinician's individual targets; no accessibility features excludes some patients; recommends against this app and states what an acceptable alternative needs (validated device pairing, clinician-set thresholds, clear escalation advice, structured export or FHIR/portal integration, transparent privacy, accessibility), plus that any home readings enter care through a reviewed workflow.",
              "A score the clinic cannot explain and traffic-light colours the clinician cannot set are a safety problem: a patient may be frightened by a 'red' their own target would call fine, or reassured by a 'green' above it, and the app gives no advice on what to do with a very high reading. No accessibility features means patients with low vision or motor difficulties are excluded. Recommendation: do not recommend PressureTrack. What would pass: validated cuffs, thresholds the care team sets, plain escalation guidance ('if above X, call us'), structured export or portal/FHIR integration so readings reach the chart through a workflow someone reviews, a privacy policy limited to care, and accessibility built in."
            ),
          ],
        },
      ],
    },
    {
      slug: "home-glucose-pghd-flow",
      objective: "Patient-generated data: what it is and how it informs analysis of health problems",
      kind: "build",
      title: "Design how home glucose readings reach the care team",
      brief:
        "Cedar Basin Health's (fictional) diabetes clinic wants patients to share home glucose readings between visits. Today patients bring paper logs or photos of meter screens; some email readings to the nurse, who types them into a note. The clinic has 1,800 patients with diabetes, two nurses and one portal that can accept patient-entered flowsheet values and device uploads. Design the patient-generated health data (PGHD) flow: what is collected, how it gets in, how it is told apart from clinic data, who looks at it and when, and how it is used in analysis. Everything here is fictional.",
      safetyNote: MSHI_SAFETY,
      steps: [
        {
          text: "",
          ask: "Specify the data, the intake, the review workflow and the analytic use.",
          parts: [
            part(
              "Data and intake",
              "Defines the elements (value, unit, timestamp, meal context such as fasting/after meal, device or manual, optional note) and the channels (meter/app upload to the portal and manual portal entry), retiring email and photos for safety and consistency; captures provenance (patient-entered vs device-transmitted vs clinic-measured) on every value.",
              "Collect: glucose value with unit, time of the reading, context (fasting, before or after a meal, bedtime), whether it came from a connected meter or was typed in, and an optional note. Intake: the portal's device upload for connected meters, and the portal flowsheet for manual entry; retire email and screen photos, which have no structure and no audit trail. Every stored value carries its provenance -- patient-reported, device-transmitted or clinic-measured -- as a field, not a guess from where it appeared."
            ),
            part(
              "Keeping it distinct and reviewing it",
              "Stores PGHD in its own flowsheet rows or a flagged section so it never mingles with clinic-collected results; defines expectations in writing (not monitored in real time, how urgent values are handled -- call the clinic / emergency services); builds a nurse worklist that surfaces out-of-range or missing uploads on a schedule (e.g. weekly) rather than reading every value; sets thresholds with the clinicians; documents review in the chart.",
              "The readings go into their own flowsheet group labelled as patient-reported, so a home value is never mistaken for a lab result in a trend or a quality measure. Set the expectation in the portal and the welcome letter: the clinic reviews uploads on a schedule, not live; a very high or very low reading means call the clinic now, or emergency services if unwell. Then stop reading values and start reading exceptions: a weekly nurse worklist of patients with readings outside the thresholds the clinicians set, with too few uploads, or with none, and a chart note when it has been reviewed. Two nurses can run that for 1,800 patients; they cannot read 1,800 logs."
            ),
            part(
              "Analytic use and limits",
              "Shows how PGHD informs the problem: between-visit patterns (fasting trend, post-meal spikes, time-in-range), tailoring and timing of changes, and clinic-level views (who is uploading, who is deteriorating); states the limits -- selection bias (who uploads), device and technique variation, missing context -- and that PGHD complements rather than replaces HbA1c and clinic measurements.",
              "With readings tagged by context, the clinician sees what a quarterly HbA1c hides: fasting values drifting up over three weeks, spikes after a particular meal, overnight lows -- and can change a dose between visits with evidence. At clinic level, the same data shows who is engaged and who has gone quiet, and which thresholds generate the most work. The limits go in the report: the people who upload are not all the people with diabetes, meters and technique vary, a reading with no context is hard to read, and none of it replaces the HbA1c -- it explains it."
            ),
          ],
        },
      ],
    },
    // F7 Applied ----------------------------------------------------------
    {
      slug: "critical-path-ehr-interface-project",
      objective:
        "Health IT project management: the project team, scope document, schedule tools such as Gantt charts and the critical path, issue tracking, testing and contingency planning",
      kind: "build",
      title: "Find the critical path for a results-interface go-live",
      brief:
        "Cedar Basin Health (fictional) is adding a reference-lab results interface and new order sets. The project plan, in working days:\n\nA Requirements sign-off: 5 days, no predecessor\nB Interface build: 15 days, after A\nC Order-set build: 10 days, after A\nD Device integration: 8 days, after B\nE Integrated testing: 6 days, after C and D\nF Super-user training: 4 days, after C\nG Go-live: 1 day, after E and F\n\nThe sponsor wants to know the earliest go-live, which tasks cannot slip, and whether a two-week delay in the order-set build would move the date.",
      safetyNote: MSHI_SAFETY,
      steps: [
        {
          text: "",
          ask: "Compute the schedule, name the critical path, and answer the sponsor.",
          parts: [
            part(
              "Forward pass: early start and finish",
              "A 0-5; B 5-20; C 5-15; D 20-28; E 28-34 (starts when both C and D are done, i.e. day 28); F 15-19; G 34-35. Project duration 35 working days.",
              "A: ES 0, EF 5. B: 5-20. C: 5-15. D (after B): 20-28. E needs C (done day 15) and D (done day 28), so E: 28-34. F (after C): 15-19. G needs E (34) and F (19): 34-35. Earliest go-live is the end of working day 35."
            ),
            part(
              "Backward pass, float and the critical path",
              "Late finishes from G's LF 35: G 34-35; E 28-34; F LF 34, LS 30; D 20-28; C LF 28 (E's LS), LS 18 -- or LF 30 via F, so the binding one is 28 -> float 13; B 5-20; A 0-5. Critical path A-B-D-E-G (zero float). C has 13 days of float, F has 15.",
              "Working back from day 35: G LS 34; E LS 28; F LF 34, LS 30; D LF 28, LS 20; C must finish by the earlier of E's start (28) and F's start (30), so LF 28, LS 18; B LF 20, LS 5; A LF 5, LS 0. Float = LS - ES: A, B, D, E, G are all zero -- that is the critical path A-B-D-E-G. C has 13 days of float (18-5), F has 15 (30-15)."
            ),
            part(
              "The sponsor's question and what to watch",
              "A two-week (10 working-day) delay in C is within its 13 days of float, so go-live does not move -- but C's float drops to 3 and F's to 5, so a further slip would; recommends tracking B and D closely (critical), building contingency into testing, logging risks/issues, and showing it on a Gantt chart with the critical path highlighted.",
              "No: a 10-working-day slip in the order-set build uses 10 of its 13 days of float, so go-live stays at day 35 -- but C would then have only 3 days of float left and training 5, so a second slip would move the date. The tasks that cannot slip at all are A, B, D, E and G; the interface build and device integration deserve the weekly check-in, and testing should carry contingency time because every path runs through it. Put this on the Gantt chart with the critical path highlighted, keep an issue log, and re-run the pass whenever a duration changes."
            ),
          ],
        },
      ],
    },
    // F8 Professionalism --------------------------------------------------
    {
      slug: "minimum-necessary-access-design",
      objective: "Balancing data protection against appropriate stakeholder access",
      kind: "build",
      title: "Design who sees what in a readmissions dashboard",
      brief:
        "Cedar Basin Health (fictional) is building a readmissions dashboard on its data warehouse. Four groups want access: (1) unit nurse managers, who need to see which of their own current inpatients were readmitted within 30 days and why; (2) the quality analyst, who builds the measures and needs patient-level data across the hospital; (3) the executive team, who want monthly rates by unit; (4) a university research partner with IRB approval for a study of readmission predictors. The warehouse holds names, MRNs, dates, diagnoses, notes and ZIP codes. The CIO asks for an access design that protects patients and still lets everyone do their job -- 'minimum necessary' is the phrase she used.",
      safetyNote: MSHI_SAFETY,
      steps: [
        {
          text: "",
          ask: "Specify each group's access, how it is enforced, and how you would know it is working.",
          parts: [
            part(
              "Access per group",
              "Applies minimum necessary role by role: nurse managers see identified data only for patients on their own units (row-level filter) and only the fields the task needs (no full notes by default); the quality analyst gets patient-level data across units with a documented business need, identifiers limited to what measure construction needs; executives see aggregates only (rates, counts), with small-cell suppression; the research partner gets a de-identified data set (Safe Harbor: all 18 identifiers removed, dates to year, ZIP to 3 digits or 000 where the area is 20,000 or fewer people) or a limited data set under a data use agreement if dates/ZIPs are needed.",
              "Nurse managers: identified rows, but only for patients currently on their unit (a row-level filter on unit), and only the columns the recall needs -- name, MRN, index and readmission dates, principal diagnosis -- not the notes. Quality analyst: patient-level data hospital-wide because measure construction requires it, with the need documented and identifiers limited to MRN and dates. Executives: aggregates only -- rates and counts by unit and month, with cells under a small threshold suppressed; no patient-level view exists for them. Research partner: a de-identified extract -- names, MRNs, exact dates, phone numbers and the rest of the 18 identifiers removed, dates reduced to year, ZIP codes to the first three digits (or 000 where that area holds 20,000 or fewer people) -- or, if the study needs exact dates, a limited data set under a signed data use agreement."
            ),
            part(
              "Enforcement",
              "Role-based access control with roles mapped to the groups; row-level security for the unit filter; separate views/tables for aggregate vs patient-level; de-identification done once by a controlled pipeline, not by hand; audit logging of patient-level queries with periodic review; access approval and periodic recertification; training and a sanctions policy.",
              "Make the design mechanical: four roles in the warehouse, each bound to its own views -- an aggregate view with suppression for executives, a patient-level view for the analyst, a unit-filtered view with row-level security for managers, and a de-identified table produced by a controlled pipeline for research. Nobody de-identifies by hand in a spreadsheet. Log every patient-level query and have the privacy officer sample the log monthly; approve access through a named owner and recertify it every quarter; train, and apply the sanctions policy when someone looks at a patient who is not theirs."
            ),
            part(
              "Knowing it works",
              "Defines measures: audit-log review findings (queries outside role scope), access recertification completion, number of ad-hoc data requests bypassing the dashboard (should fall), user feedback that the nurse-manager view is sufficient (otherwise people find workarounds), and a re-identification check on the research extract.",
              "Watch four things. The audit log: patient-level queries outside a user's unit or role should be zero, and each one found is investigated. Recertification: every account reviewed on schedule, stale ones removed. Workarounds: if nurse managers keep asking the analyst for exports, their view is too thin and they will find a less safe path -- fix the view. The research extract: a re-identification check before release and a signed receipt of what was sent. Protection that stops people working is not protection; it is a workaround generator."
            ),
          ],
        },
      ],
    },
    // F9 Interprofessional Collaborative Practice -------------------------
    {
      slug: "sbar-for-a-go-live-problem",
      objective: "Structured communication and handoff tools such as SBAR, and why a handoff needs acknowledgement and a chance to ask questions",
      kind: "build",
      title: "Write an SBAR to the nursing director about a go-live defect",
      brief:
        "You are the informatics nurse at Cedar Basin Health (fictional) on day two of a new barcode medication administration go-live. Since 06:00, night-shift nurses on two units report that scanning a patient wristband sometimes opens the medication list of the previously scanned patient; it has happened at least four times, each caught by the nurse before giving a medication. The vendor has acknowledged a caching defect and promises a patch in 48 hours. The day shift is about to start on six units. The nursing director is in a meeting and you have two minutes with her by phone. Write the SBAR you will say, and explain how you will make sure it landed.",
      safetyNote: MSHI_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the four SBAR parts as you would say them, then describe the close of the conversation.",
          parts: [
            part(
              "Situation and Background",
              "Situation: one or two sentences naming who you are, the problem (wrong patient's medication list after a scan), scale (two units, at least four events, none reached a patient) and urgency (day shift starting on six units). Background: go-live day two, the vendor's confirmed caching defect, patch in 48 hours, the affected workflow.",
              "Situation: 'This is the informatics nurse. Since 06:00 the new barcode scanning has shown the wrong patient's medication list after a wristband scan at least four times on two units. No medication was given -- the nurses caught each one -- but day shift starts on six units in twenty minutes.' Background: 'We are on day two of the BCMA go-live. The vendor has confirmed it is a caching defect when a second patient is scanned soon after the first, and they say a patch comes in 48 hours. It affects the scan-to-medication-list step only; documentation after the scan is fine.'"
            ),
            part(
              "Assessment and Recommendation",
              "Assessment: your professional judgement that this is a wrong-patient medication risk across all six units until the patch is in, not a training issue. Recommendation: a specific ask -- e.g. an immediate safety alert to all units with a mandatory workaround (verify name and DOB on the opened list against the wristband before any administration, re-scan if it does not match, or revert to the previous process), a huddle at shift start, and a decision from her on whether to keep BCMA live or roll back until the patch -- with what you need from her now.",
              "Assessment: 'I think this is a real wrong-patient medication risk on every unit, not a training problem, and it stays until the patch is live.' Recommendation: 'I recommend we send a safety alert to all six units before shift start requiring nurses to verify the patient's name and date of birth on the opened medication list against the wristband before any administration and to re-scan if it does not match; that charge nurses say it at every huddle; and that we log every occurrence to me. I need your decision on whether BCMA stays live with that workaround or we revert to the paper MAR until the patch. If I don't hear otherwise in ten minutes, I will send the alert with the workaround.'"
            ),
            part(
              "Closing the loop",
              "Explains why the handoff is not done at the end of the speech: asks her to read back or confirm the decision and the workaround, invites questions, agrees who does what by when (alert owner, huddle message, vendor contact, re-check time), and documents the call; relates it to the general principle that a handoff needs acknowledgement and a chance to ask questions.",
              "Then stop talking. 'Can you tell me what you've decided and what the workaround is, so I know we have it the same?' -- a read-back catches the gap between what I said and what she heard. 'What questions do you have?' gives her the chance to ask whether a patient was harmed or whether pharmacy knows. Agree the next steps aloud: I send the alert by 06:50, she names the huddle message owner, I call the vendor for the patch timeline, we speak again at 10:00. I write the time, the decision and the owners in the incident log. A handoff that ends without acknowledgement is a message sent, not a message received."
            ),
          ],
        },
      ],
    },
    // F10 Leadership ------------------------------------------------------
    {
      slug: "kotter-plan-for-cpoe-rollout",
      objective:
        "Kotter's change model applied to health IT: creating a climate for change, engaging the organisation, and implementing and sustaining the change",
      kind: "build",
      title: "Plan a sepsis-alert rollout with Kotter's model",
      brief:
        "Cedar Basin Health (fictional) will replace a widely ignored paper sepsis screening form with an EHR-based sepsis alert and order set across its medical units. Context: two prior IT projects were seen as 'done to' clinicians; the emergency physicians are enthusiastic; hospitalists are sceptical because the last alert fired constantly; the chief nursing officer is new; the board wants mortality improvement within a year. The CMIO asks you to lay out the change plan using Kotter's eight steps, grouped into creating a climate for change, engaging and enabling the organisation, and implementing and sustaining it.",
      safetyNote: MSHI_SAFETY,
      steps: [
        {
          text: "",
          ask: "Lay out the plan, naming each step and the concrete action for this rollout.",
          parts: [
            part(
              "Creating a climate for change (steps 1-3)",
              "Step 1 create urgency: share local data (missed screenings, sepsis outcomes, the board's goal) with clinicians rather than a mandate. Step 2 build a guiding coalition: ED physician champion, a hospitalist sceptic, nursing leaders including the new CNO, pharmacy, informatics, quality. Step 3 form a vision and strategy: a clear statement (e.g. 'every patient screened, every alert worth acting on') with the strategy to tune the alert before go-live.",
              "1 Urgency: show the units their own numbers -- how many patients had no completed screen, time to antibiotics, outcomes -- and the board's one-year goal, in grand rounds and unit huddles, before anyone mentions software. 2 Guiding coalition: an ED physician champion, the most vocal hospitalist sceptic (inside the tent, owning the alert-fatigue problem), nurse managers and the new CNO, a pharmacist, quality, and informatics. 3 Vision and strategy: 'Every patient screened once a shift; every alert worth a clinician's attention' -- and the strategy that follows from it: tune the alert on retrospective data and pilot on one unit before it fires anywhere else."
            ),
            part(
              "Engaging and enabling the organisation (steps 4-6)",
              "Step 4 communicate the vision: repeated, two-way, by the coalition members in their own forums, addressing the 'done to us' history directly. Step 5 empower action by removing barriers: fix the alert's specificity, give nurses authority to initiate the screening bundle per protocol, adjust workload, address training and device access. Step 6 generate short-term wins: pilot unit results (screening rate, alert acceptance, time to antibiotics) published within weeks.",
              "4 Communicate: the hospitalist and the nurse managers carry the message in their own meetings, not an IT email; say out loud that the last two projects were done to people and that this one has a sceptic on the steering group; take questions and change the plan when they are right. 5 Remove barriers: the biggest is the alert that cried wolf -- tune it on past data with the hospitalists until they accept its hit rate; give nurses a protocol so a positive screen starts the bundle without waiting; make sure workstations and time exist on the unit. 6 Short-term wins: pilot on one unit for six weeks and publish screening completion, alert acceptance and time to antibiotics on the unit board and to the coalition."
            ),
            part(
              "Implementing and sustaining the change (steps 7-8) and how you will know",
              "Step 7 consolidate gains and produce more change: spread unit by unit using pilot lessons, keep tuning, add related improvements (lactate ordering, reassessment). Step 8 anchor in culture: make screening part of orientation, competencies and the unit dashboard; recognise units; tie to mortality reporting; leadership keeps asking about it. Measures: process (screening rate, alert override rate) and outcome (bundle compliance, mortality) with a review cadence, and a plan for when the data disappoints.",
              "7 Consolidate: roll to the next units with what the pilot taught, keep a monthly alert-tuning review with the hospitalists, and use the momentum for the next pieces -- lactate ordering, reassessment prompts. 8 Anchor it: sepsis screening in nursing orientation and annual competencies, the screening and override rates on every unit's dashboard beside falls and infections, recognition for units that hold the gains, and the CMO asking about it in every quality meeting so it does not fade when the project team leaves. You know it is working when the override rate falls and stays down, screening completion holds above target without reminders, and mortality moves; and you decide now what you will do if, at six months, it hasn't."
            ),
          ],
        },
      ],
    },
  ],
};
