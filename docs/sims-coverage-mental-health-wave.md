# ASWB and Washington jurisprudence sims: coverage map (REQ-288, REQ-289)

Written 2026-11-16 for Nick's instruction of 2026-11-14 (relayed by the lead):
"sims for your new courses follow coverage, not a count. Build a client-session
sim for every objective that fits the selection rule (time matters, cues to
read, choices with consequences, or competing priorities)". Courses: Prep for
the ASWB Clinical Exam (ASWBCLINICAL), Prep for the ASWB Masters Exam
(ASWBMASTERS), Prep for the Washington Psychology Jurisprudence Exam
(WAPSYCHJP).

## How the map was made

- **Fitting** is the generator's keyword screen (`lib/sim/generator/selection.ts`,
  docs/sims.md 12.2): a title that matches at least two of the four criteria.
  It reads titles only. Two objectives it does not pass were added by hand
  because they were written as sim objectives (REQ-286): the Masters
  involuntary-client and child-abuse-report titles.
- **Session fit** is a hand judgement: does the objective play out as a
  conversation with a fictional client on the existing client `session`
  screen (22.5)? No other screen suits these courses (no bedside, board,
  terminal or console task). Objectives that are desk work (evaluation
  designs, policies, CE planning, record deadlines) are labs, not sessions.
- **Built** means a sim names the objective as its `objective` (mastery
  evidence, 9.4). A **band** is the same session registered to the other
  course's objective of the same title (docs/sims.md 4.7).
- Counts: ASWBCLINICAL 73 active objectives, 18 pass the screen;
  ASWBMASTERS 71 and 16 (+2 by hand); WAPSYCHJP 33 and 7.

## Summary

| Course | Fitting | Session fit | Built (authored + band) | Candidates left | Not a session |
|---|---|---|---|---|---|
| ASWBCLINICAL | 18 | 11 | 4 (3 + 1 band) | 6 (+1 exercised inside a session) | 7 |
| ASWBMASTERS | 18 | 12 | 5 (3 + 2 bands) | 6 (+1 exercised inside a session) | 6 |
| WAPSYCHJP | 7 | 3 | 1 (band of the EPPP session) | 2 | 4 |

Sims before this work: none on any of the three courses.

## ASWB Clinical

| Objective (abridged) | Session fit | Status |
|---|---|---|
| Assess suicide and violence risk in a clinical social work session | yes | **built** `aswbc-suicide-violence-risk` |
| Respond to a client's threat against an identifiable person ... | yes | **built** `aswbc-threat-identifiable-person` |
| End services ethically: planned termination, transfer, nonpayment ... | yes | **built** `aswbc-termination-nonpayment` |
| Manage boundaries, dual relationships, conflicts of interest ... | yes | **band** `aswbc-boundaries-small-town` (of the Masters session) |
| Protect client self-determination ... when imminent risk limits it | yes | candidate: an adult refusing a placement; NASW 1.02 is read, needs authoring time |
| Assess a client's capacity for decisions about money, treatment and consent | yes | candidate: needs a capacity-assessment source read in full (WebSearch-only rule: "to verify") |
| Provide crisis intervention and stabilize a client in acute distress | yes | candidate: a crisis model source (Roberts' seven stages) found in search results only, not read |
| Conduct a biopsychosocial assessment ... | yes | candidate: an intake session |
| Apply ethical standards to electronic practice ... | yes (telehealth session) | candidate |
| Identify community resources and use triage, goal planning ... | partly | candidate |
| Explain confidentiality and privileged communication ... | partly | exercised inside the threat session; not a separate sim |
| Apply the NASW Code's core values ... | no | exercised by every session; recall otherwise |
| Recognize burnout, secondary traumatic stress ... | no (the worker, not a client) | lab |
| Recognize ethical duties in supervision and management | no (a supervisee, not a client) | lab |
| Apply research ethics ... | no | lab |
| Evaluate client progress ... single-system designs | no (data) | lab |
| Evaluate programs ... research design | no | lab |
| Create and evaluate policies that reduce risk | no | lab |

## ASWB Masters

| Objective (abridged) | Session fit | Status |
|---|---|---|
| Engage an involuntary client and contract for goals (hand-added) | yes | **built** `aswbm-involuntary-engagement` |
| Make a mandated child abuse report and keep the family engaged (hand-added) | yes | **built** `aswbm-child-abuse-report` |
| Manage boundaries, dual relationships, conflicts of interest ... | yes | **built** `aswbm-boundaries-small-town` |
| End services ethically ... | yes | **band** `aswbm-termination-nonpayment` |
| Assess risk of harm to self and others and act on what you find | yes | **band** `aswbm-suicide-violence-risk` (a licensed social worker, not clinical, in the brief) |
| Protect client self-determination ... | yes | candidate (as Clinical; one session plus a band would cover both) |
| Assess a client's capacity ... | yes | candidate (as Clinical) |
| Provide crisis intervention ... | yes | candidate (as Clinical) |
| Conduct a biopsychosocial assessment ... | yes | candidate |
| Apply ethical standards to electronic practice ... | yes | candidate |
| Identify community resources and use triage ... | partly | candidate |
| Explain confidentiality ... | partly | exercised inside the child abuse report and the involuntary-client sessions |
| Apply the NASW Code's core values ... | no | as Clinical |
| Recognize burnout ... | no | lab |
| Recognize ethical duties in supervision ... | no | lab |
| Evaluate client progress ... | no | lab |
| Evaluate programs ... | no | lab |
| Create and evaluate policies ... | no | lab |

## Washington psychology jurisprudence

| Objective (abridged) | Session fit | Status |
|---|---|---|
| Apply the duty to warn or protect when a client threatens an identifiable person | yes | **band** `wajp-duty-to-protect-threat` of the EPPP session (already a Washington psychologist under RCW 71.05.120(3) and Volk), with DOH's reference list and chapter 70.02 RCW added to its sources |
| Recognize multiple relationships that impair objectivity and end them properly | yes | candidate: a psychologist's version of the boundaries session under WAC 246-924 (the course's rule text, read 2026-11-14) |
| Conduct a parenting evaluation to Washington's minimum standards | partly (several parties, forensic) | candidate; proposed, not built |
| Respond to a client's request to see or copy their record within the statutory time | no (a deadline, not a conversation) | lab |
| Plan a three-year continuing education cycle ... | no | lab |
| Report and use assessment results with their limits, and protect test security | no | lab |
| Identify unprofessional conduct under the Uniform Disciplinary Act ... | no | lab |

## Why the candidates are not built yet

- Time: each authored session is a document of about 1,000 lines with five to
  eight golden paths; this wave built five authored sessions and four bands.
- Sources: from 2026-11-14 the lead allowed WebSearch only. Search results here
  show titles and addresses, not text, so a source first found that way is
  "to verify", and a session that rests on it would carry unverified clinical
  claims into a course marked verified. The crisis-intervention and capacity
  candidates wait for that verification pass.
- Every built session cites only sources read on 2026-11-14 (or, for the EPPP
  band, 2026-11-10) in full or through a summarizing fetch made before the
  WebFetch stop, and says which.

## Update, 2026-11-17: depth round (REQ-337, docs/sims.md 22.41)

Nick's round rule (2026-11-17): every unit with an objective that fits the selection rule gets a sim whose main objective is in that unit; at least 4 sims under 60 objectives and 8 at 60 or more. This round added six authored sessions and four bands on these three courses (and more on EPPP, NCE and NCMHCE; see 22.41).

| Course | Before | After | New main objectives |
|---|---|---|---|
| ASWBCLINICAL | 4 | 8 | III crisis intervention (authored); I self-determination (authored); I confidentiality and HIPAA (authored, a subpoena); II capacity and age of consent (band of the Masters case) |
| ASWBMASTERS | 5 | 9 | II capacity and age of consent (authored); III crisis, I self-determination, I confidentiality (bands of the Clinical cases) |
| WAPSYCHJP | 1 | 4 | III multiple relationships (authored); V mandated child abuse report (authored; the keyword screen misses it, kept as an override); VI unprofessional conduct under the UDA (authored) |

Units now covered: every unit of all three courses except WAPSYCHJP I (licensure, scope and the board) and II (continuing education and renewal), which have no objective that plays out as a client session (no fit: desk and licensing rules, labs instead).
